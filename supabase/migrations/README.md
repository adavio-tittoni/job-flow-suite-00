# Migrações do Sistema de Vagas

Este diretório contém as migrações SQL necessárias para implementar o sistema completo de vagas no Supabase.

## Arquivos de Migração

1. **20241220000002_create_vacancy_candidates.sql**
   - Cria a tabela `vacancy_candidates` para vincular candidatos a vagas específicas
   - Inclui políticas RLS e índices para performance

2. **20241220000003_create_vacancy_integrations.sql**
   - Cria a tabela `vacancy_integrations` para configurações de integração (Google Drive, Microsoft 365)
   - Suporte para múltiplos provedores de armazenamento

3. **20241220000004_create_funnels_and_stages.sql**
   - Cria as tabelas `funnels` e `funnel_stages` para gerenciar pipelines de recrutamento
   - Inclui dados padrão com pipeline de recrutamento básico

4. **20241220000005_update_vacancies_table.sql**
   - Atualiza a tabela `vacancies` existente com campos necessários
   - Adiciona relacionamentos com funnels, stages e matrices

## Como Aplicar as Migrações

### Opção 1: Via Supabase CLI
```bash
# Navegue até o diretório do projeto
cd supabase

# Aplique as migrações
supabase db push

# Ou aplique migrações específicas
supabase db push --include-all
```

### Opção 2: Via Dashboard do Supabase
1. Acesse o dashboard do Supabase
2. Vá para "SQL Editor"
3. Execute cada arquivo de migração em ordem
4. Verifique se as tabelas foram criadas corretamente

### Opção 3: Via SQL Editor
Execute os comandos SQL de cada arquivo diretamente no SQL Editor do Supabase.

## Verificação

Após aplicar as migrações, verifique se as seguintes tabelas foram criadas:

- `vacancy_candidates`
- `vacancy_integrations` 
- `funnels`
- `funnel_stages`

E se a tabela `vacancies` foi atualizada com os novos campos.

## Funcionalidades Implementadas

Com essas migrações, o sistema de vagas terá:

✅ Criação e edição de vagas
✅ Vinculação de candidatos a vagas
✅ Sistema de pipeline com estágios
✅ Integrações com Google Drive e Microsoft 365
✅ Relacionamento com matrizes de avaliação
✅ Políticas de segurança (RLS) configuradas

## Próximos Passos

1. Aplique as migrações no Supabase
2. Teste a criação de vagas através da interface
3. Configure integrações conforme necessário
4. Personalize os estágios do pipeline conforme sua organização
