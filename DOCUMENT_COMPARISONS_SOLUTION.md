# 🎯 Solução: `document_comparisons` como Fonte Única

## 📋 Visão Geral

A tabela `document_comparisons` agora é a **fonte única da verdade** para todas as comparações de documentos. O campo `status` determina se um documento do candidato confere, está parcial ou está pendente em relação aos requisitos da matriz.

## ✅ Implementação

### 1. **Novo Hook: `useDocumentComparisons`**
- **Arquivo:** `src/hooks/useDocumentComparisons.ts`
- Lê diretamente da tabela `document_comparisons`
- Retorna comparações e estatísticas
- Campo `status` é a fonte única de verdade:
  - `'CONFERE'` = Documento confere totalmente
  - `'PARCIAL'` = Documento está parcial
  - `'PENDENTE'` = Documento está pendente

### 2. **Atualização: `useCandidateRequirementStatus`**
- **Arquivo:** `src/hooks/useCandidateRequirementStatus.ts`
- Agora usa `document_comparisons` como fonte primária
- Mantém lógica legada como fallback
- Converte status da tabela para formato do hook:
  - `CONFERE` → `fulfilled`
  - `PARCIAL` → `partial`
  - `PENDENTE` → `pending`

### 3. **Atualização: `EnhancedDocumentsView`**
- **Arquivo:** `src/components/EnhancedDocumentsView.tsx`
- Migrado de `useAdvancedMatrixComparison` para `useDocumentComparisons`
- Usa diretamente os dados da tabela `document_comparisons`

## 🔄 Fluxo de Dados

```
1. n8n recebe documentos via webhook
   ↓
2. n8n compara documentos com matriz
   ↓
3. n8n salva resultado em document_comparisons
   - status: 'CONFERE' | 'PARCIAL' | 'PENDENTE'
   - validation_status: 'valid' | 'expired' | 'N/A'
   - similarity_score: número
   - observations: texto explicativo
   ↓
4. Frontend lê document_comparisons
   ↓
5. Exibe status baseado no campo status
```

## 📊 Campos Utilizados da Tabela

### Campos Principais
- **status**: `CONFERE` | `PARCIAL` | `PENDENTE` (fonte única de verdade)
- **validity_status**: Status de validade do documento
- **similarity_score**: Score de similaridade (0-1)
- **observations**: Observações detalhadas

### Campos de Contexto
- **modalidade_candidato**: Modalidade do documento do candidato
- **modalidade_exigida**: Modalidade exigida pela matriz
- **horas_candidato**: Carga horária do candidato
- **horas_exigidas**: Carga horária exigida
- **codigo_documento**: Código do documento (ex: NR-33)
- **sigla_documento**: Sigla do documento
- **nome_documento**: Nome do documento
- **categoria**: Categoria do documento

## 🎯 Benefícios

### ✅ Simplicidade
- Uma única tabela para todas as comparações
- Menos lógica duplicada no frontend
- Fonte única de verdade clara

### ✅ Consistência
- N8N faz toda a comparação uma vez
- Frontend apenas lê e exibe
- Status sempre sincronizado

### ✅ Performance
- Menos cálculos no frontend
- Dados já processados e indexados
- Consultas mais rápidas

## 🔍 Consultas

### Buscar todas as comparações de um candidato
```sql
SELECT * FROM document_comparisons 
WHERE candidate_id = 'uuid'
ORDER BY created_at DESC;
```

### Buscar comparações por status
```sql
SELECT * FROM document_comparisons 
WHERE candidate_id = 'uuid' 
  AND status = 'CONFERE';
```

### Estatísticas de um candidato
```typescript
const { stats } = useDocumentComparisons(candidateId);
// stats.confere
// stats.parcial
// stats.pendente
// stats.conferePercentage
```

## 📝 Exemplo de Uso

```typescript
// Hook para buscar comparações
const { data, isLoading, error } = useDocumentComparisons(candidateId);

// data.comparisons - Array de comparações
// data.stats - Estatísticas agregadas

// Filtros por status
const confere = data.comparisons.filter(c => c.status === 'CONFERE');
const parcial = data.comparisons.filter(c => c.status === 'PARCIAL');
const pendente = data.comparisons.filter(c => c.status === 'PENDENTE');

// Estatísticas
console.log('Total:', data.stats.total);
console.log('Confere:', data.stats.confere);
console.log('Taxa de aprovação:', data.stats.conferePercentage + '%');
```

## 🚀 Próximos Passos

1. ✅ Criar tabela `document_comparisons`
2. ✅ Configurar n8n para salvar comparações
3. ✅ Criar hook `useDocumentComparisons`
4. ✅ Atualizar `useCandidateRequirementStatus`
5. ✅ Atualizar `EnhancedDocumentsView`
6. ⏳ Remover lógica legada de comparação
7. ⏳ Testar fluxo completo

## 🎉 Resultado

Agora todo o sistema usa `document_comparisons` como fonte única da verdade. O campo `status` é a regra principal para determinar se um documento confere ou não.

