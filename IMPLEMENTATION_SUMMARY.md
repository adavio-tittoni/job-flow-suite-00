# Implementação: Campo de Código para Comparação de Matriz

## Resumo da Implementação

Foi implementada a funcionalidade solicitada para adicionar um campo "Tipo de Código" no formulário de edição de documentos de candidatos, permitindo comparação mais precisa com a matriz de candidatos.

## Mudanças Realizadas

### 1. Banco de Dados
- **Migração criada**: `supabase/migrations/20250115000000_add_codigo_to_candidate_documents.sql`
- **Campo adicionado**: `codigo TEXT` na tabela `candidate_documents`
- **Índice criado**: `idx_candidate_documents_codigo` para melhor performance

### 2. Interface TypeScript
- **Arquivo**: `src/hooks/useCandidates.tsx`
- **Mudança**: Adicionado campo `codigo?: string` na interface `CandidateDocument`
- **Comentário**: "Custom document code for matrix comparison"

### 3. Formulário de Documentos
- **Arquivo**: `src/components/candidates/CandidateDocumentForm.tsx`
- **Mudanças**:
  - Adicionado campo "Tipo de Código *" no formulário
  - Campo posicionado entre "Tipo (do catálogo)" e "Modalidade"
  - Placeholder: "Ex: NR-35, NR-37, STWC, etc."
  - Estilo: `font-mono` para melhor visualização de códigos
  - Texto explicativo: "Código usado para comparação com a matriz"
  - Valores padrão atualizados para incluir o campo `codigo`

### 4. Lógica de Comparação
- **Arquivo**: `src/hooks/useCandidateRequirementStatus.ts`
- **Mudanças**:
  - Query atualizada para incluir campo `codigo` da tabela `documents_catalog`
  - Lógica de comparação atualizada com 3 níveis de fallback:
    1. **Primeiro**: Comparação por `catalog_document_id` (relacionamento direto)
    2. **Segundo**: Comparação por `codigo` (novo campo implementado)
    3. **Terceiro**: Comparação por nome normalizado (fallback existente)

## Como Funciona

### Fluxo de Comparação
1. **Documento do Candidato**: Usuário preenche o campo "Tipo de Código" (ex: "NR-35")
2. **Matriz**: Documentos no catálogo já possuem campo `codigo` (ex: "NR-35")
3. **Comparação**: Sistema compara primeiro por código, depois por nome
4. **Resultado**: Comparação mais precisa e confiável

### Exemplo de Uso
```
Documento do Candidato:
- Nome: "NR-37 Treinamento Básico (Módulo Valaris)"
- Código: "NR-37"

Matriz:
- Nome: "NR-37 Segurança em Trabalho em Altura"
- Código: "NR-37"

Resultado: ✅ Match por código "NR-37"
```

## Benefícios

1. **Precisão**: Comparação por código é mais confiável que por nome
2. **Flexibilidade**: Permite códigos customizados para documentos específicos
3. **Fallback**: Mantém compatibilidade com comparação por nome
4. **Performance**: Índice criado para consultas rápidas
5. **UX**: Campo intuitivo com placeholder e explicação

## Status da Implementação

✅ **Concluído**:
- Interface TypeScript atualizada
- Formulário de documentos modificado
- Lógica de comparação implementada
- Migração de banco criada e executada com sucesso
- Campo `codigo` adicionado à tabela `candidate_documents`
- Índice `idx_candidate_documents_codigo` criado
- Funcionalidade testada e validada no banco de dados

✅ **Testado**:
- Inserção de documentos com código
- Consulta por código funcionando corretamente
- Comparação por código operacional

## Próximos Passos

1. ✅ Migração executada com sucesso via MCP Supabase
2. ✅ Funcionalidade testada e validada
3. **Pronto para uso**: A funcionalidade está completamente operacional
4. **Uso**: Preencher o campo "Tipo de Código" nos documentos dos candidatos para comparação precisa com a matriz
