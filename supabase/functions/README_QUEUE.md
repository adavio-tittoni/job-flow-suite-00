# Fila de documentos (RabbitMQ) – Edge Functions

## Funções

- **enqueue-document**: recebe um job (candidateId, documentId, fileStoragePath, fileName, fileType) e publica na fila RabbitMQ `document-processing`. **Logo após publicar, dispara o worker** `process-document-queue` uma vez (processamento imediato). A fila é criada automaticamente no primeiro publish.
- **process-document-queue**: worker que consome **uma mensagem** da fila, baixa o arquivo do Storage, chama o webhook n8n e atualiza `candidate_documents`. Processa um job por vez.

## Onde configurar o RabbitMQ e criar a fila

- **Conexão:** use a **HTTP Management API** do RabbitMQ (sem cliente AMQP), para evitar 503 por cold start no Supabase.
  - **Recomendado:** defina **`RABBITMQ_MANAGEMENT_URL`** no Supabase (Edge Functions → Secrets) com a URL do Management incluindo usuário e senha, ex.: `https://adabtech:SUA_SENHA@rabbit.aulan8ntech.shop:15672` (porta 15672 é a padrão do Management; se acessar pelo 443, use sem `:15672`).
  - **Alternativa:** defina só **`RABBITMQ_URL`** (ex.: `amqp://user:senha@host:5672/`); as funções derivam a URL do Management em `http(s)://user:senha@host:15672`.
- **Fila:** nome **`document-processing`**. Crie no painel do RabbitMQ (Queues → Add queue, durable) ou deixe a primeira publicação criar.
- **HTTP vs HTTPS:** Se o Management do RabbitMQ estiver em **HTTP (non-TLS)** na porta 15672, use **`http://`** na URL (ex.: `http://user:senha@rabbit.aulan8ntech.shop:15672`). Usar `https://` contra um servidor só HTTP gera erro "corrupt message / InvalidContentType". O código troca automaticamente para `http` quando a URL é `https` e a porta é 15672.

Se quiser criar a fila antes no painel do RabbitMQ (opcional):

1. Acesse o Management do RabbitMQ (ex.: `http://seu-host:15672`).
2. Aba **Queues** → **Add a new queue**.
3. Nome: **`document-processing`**, **Durable**: sim.
4. Salve. As Edge Functions usarão essa fila.

## Secrets (Supabase Dashboard → Edge Functions → Secrets)

| Nome | Obrigatório | Descrição |
|------|-------------|-----------|
| `RABBITMQ_MANAGEMENT_URL` | Recomendado | URL do Management com auth. Ex.: `https://user:senha@rabbit.aulan8ntech.shop:15672`. Evita 503 (funções usam só `fetch`). |
| `RABBITMQ_URL` | Alternativo | URL AMQP. Se só esta estiver definida, a URL do Management é derivada (host:15672). Ex.: `amqp://user:senha@host:5672/`. |
| `N8N_WEBHOOK_URL` ou `VITE_N8N_WEBHOOK_URL` | Worker | URL do webhook n8n. |
| `N8N_WEBHOOK_AUTH_TOKEN` ou `VITE_N8N_WEBHOOK_AUTH_TOKEN` | Opcional | Token de autorização do webhook. |
| `SUPABASE_ANON_KEY` | Opcional (enqueue-document) | Se o frontend não enviar `Authorization`, usado para disparar o worker após enfileirar. Senão, o header da requisição é repassado. |

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já são injetados pelo Supabase.

## Frontend – usar fila em nuvem

No `.env` do frontend:

```env
VITE_USE_REDIS_QUEUE=true
```

Com isso, após upload e criação do registro em `candidate_documents`, o app chama a Edge Function `enqueue-document` (que enfileira no RabbitMQ). **Assim que o job é publicado no RabbitMQ, a própria `enqueue-document` invoca o worker** `process-document-queue` uma vez, então o processamento (e o webhook n8n) tende a acontecer em segundos, sem depender só do cron.

## Cron – backup (recomendado)

Um cron a cada **10 segundos** chama o worker como backup (caso o disparo imediato falhe ou haja mensagens antigas na fila). A migration `20260205000000_schedule_process_document_queue_cron.sql` agenda isso. É necessário:

1. Habilitar extensões: Dashboard → Database → Extensions, ative `pg_cron` e `pg_net`.
2. Criar secrets no Vault (para o cron): no SQL Editor:

   ```sql
   select vault.create_secret('https://SEU_PROJECT_REF.supabase.co', 'project_url');
   select vault.create_secret('SEU_ANON_KEY', 'anon_key');
   ```

3. Aplicar a migration: `supabase db push` ou executar o SQL em Database → SQL Editor.

Para desativar: `select cron.unschedule('invoke-process-document-queue');`.

### Opção 2: Serviço externo

Exemplo (a cada 5 min):

```bash
*/5 * * * * curl -s -X POST "https://uuorwhhvjxafrqdyrrzt.supabase.co/functions/v1/process-document-queue" -H "Authorization: Bearer SEU_ANON_KEY"
```

### Testar manualmente

No Dashboard do Supabase: Edge Functions → `process-document-queue` → “Invoke”.

## Deploy das funções

```bash
supabase functions deploy enqueue-document
supabase functions deploy process-document-queue
supabase secrets set RABBITMQ_URL="amqp://user:senha@host:5672/"
```

Definir também os secrets do webhook n8n se o worker for usar.

## Troubleshooting

- **Enqueue falha (500 / timeout):** confira `RABBITMQ_URL` (host, porta, user, senha, vhost). Para TLS use `amqps://`. Veja os logs da Edge Function `enqueue-document`.
- **Worker não processa:** confira os logs de `process-document-queue`. O worker espera até 5s por uma mensagem; se a fila estiver vazia, retorna 200 com `processed: 0`. Verifique se o cron está ativo e se há itens na fila no RabbitMQ Management.
- **Webhook n8n não é chamado:** (1) O worker só chama o webhook quando é **invocado** (cron ou "Invoke" no dashboard). Confirme que o cron está agendado ou invoque manualmente. (2) Defina **`N8N_WEBHOOK_URL`** nos secrets da Edge Function (igual à URL que o frontend usaria; não use variáveis `VITE_*` no Supabase, use `N8N_WEBHOOK_URL`).
- **Frontend:** `VITE_USE_REDIS_QUEUE=true` no `.env` e reinicie o app. No console (F12) aparecem `[enqueue-document] falhou:` ou `[enqueue-document] erro de rede:` em caso de falha.
