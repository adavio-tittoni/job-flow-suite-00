-- Cron: invocar o worker process-document-queue a cada 10 segundos (backup; disparo principal é ao enfileirar).
-- Requer: extensões pg_cron e pg_net; secrets no Vault: project_url e anon_key (ver README_QUEUE.md).

-- Habilitar pg_cron (no Supabase hospedado pode já estar ativo; se falhar, ative em Database > Extensions).
create extension if not exists pg_cron;

-- Agendar chamada à Edge Function process-document-queue a cada 10 segundos.
-- URL e chave vêm do Vault (configure em SQL Editor ou Dashboard > Vault):
--   select vault.create_secret('https://SEU_PROJECT_REF.supabase.co', 'project_url');
--   select vault.create_secret('SEU_ANON_KEY', 'anon_key');
select cron.schedule(
  'invoke-process-document-queue',
  '10 seconds',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/process-document-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'anon_key'), '')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) as request_id;
  $$
);
