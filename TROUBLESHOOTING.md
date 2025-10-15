# 🔧 Resolução do Erro 403 - Supabase

## Problema Identificado
O erro 403 indica problemas de autenticação/configuração do Supabase. Aqui estão as soluções:

## ✅ Soluções Implementadas

### 1. **Arquivo CandidateIntegrationsTab.tsx Criado**
- ✅ Componente de integrações implementado
- ✅ Export default corrigido
- ✅ Interface completa com LinkedIn, GitHub, Indeed, etc.

### 2. **Configuração do Supabase Atualizada**
- ✅ Suporte a variáveis de ambiente
- ✅ Fallback para configuração padrão
- ✅ Configuração de autenticação otimizada

## 🚀 Próximos Passos para Resolver o 403

### 1. **Configurar Variáveis de Ambiente**

Crie um arquivo `.env.local` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://uuorwhhvjxafrqdyrrzt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1b3J3aGh2anhhZnJxZHlycnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNjA4OTgsImV4cCI6MjA3NTYzNjg5OH0.UxNm138Qzyu6kC7fKj6e3_FSzQO4X4CsipdPGsLfupA
```

### 2. **Verificar Configuração do Supabase**

1. **Acesse o painel do Supabase**: https://supabase.com/dashboard
2. **Vá para Settings > API**
3. **Verifique se a URL e chave estão corretas**
4. **Confirme se o projeto está ativo**

### 3. **Executar as Migrações**

Execute os arquivos SQL no Supabase SQL Editor:

1. **Primeiro**: `supabase/migrations/20241220000000_update_candidate_system.sql`
2. **Segundo**: `supabase/migrations/20241220000001_storage_configuration.sql`

### 4. **Configurar RLS Policies**

Verifique se as políticas RLS estão ativas:
- Vá para **Authentication > Policies**
- Confirme se todas as tabelas têm políticas configuradas

### 5. **Configurar Storage**

1. Vá para **Storage** no painel do Supabase
2. Verifique se os buckets existem:
   - `candidate-photos`
   - `candidate-documents`
3. Confirme se as políticas de storage estão ativas

## 🔄 Reiniciar o Servidor

Após fazer as configurações:

```bash
# Pare o servidor (Ctrl+C)
# Reinicie o servidor
npm run dev
```

## 🧪 Testar a Aplicação

1. **Acesse**: http://localhost:8083
2. **Teste o login**: Registre-se com um email
3. **Verifique o console**: Não deve haver mais erros 403

## 🆘 Se o Erro Persistir

### Verificações Adicionais:

1. **CORS**: Verifique se o domínio está autorizado no Supabase
2. **Rate Limiting**: Verifique se não há limite de requisições
3. **API Key**: Confirme se a chave está correta e ativa
4. **Projeto Status**: Verifique se o projeto Supabase está ativo

### Logs Úteis:

```bash
# Verificar logs do Supabase
# No painel do Supabase > Logs

# Verificar console do navegador
# F12 > Console > Network
```

## ✅ Checklist de Resolução

- [ ] Arquivo `.env.local` criado
- [ ] Variáveis de ambiente configuradas
- [ ] Migrações SQL executadas
- [ ] RLS Policies ativas
- [ ] Storage buckets configurados
- [ ] Servidor reiniciado
- [ ] Aplicação testada
- [ ] Erro 403 resolvido

---

**🎯 Com essas correções, o erro 403 deve ser resolvido!**
