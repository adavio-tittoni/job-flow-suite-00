# 🔄 Configuração do n8n para Comparação de Documentos

## 📋 Visão Geral

Este documento descreve como configurar o workflow no n8n para processar documentos de candidatos e realizar comparações automáticas com os documentos da matriz.

## 🎯 O que foi Implementado

### 1. **Tabela `document_comparisons`**
Armazena os resultados das comparações entre documentos dos candidatos e documentos da matriz.

### 2. **Função `sendToN8nWebhookWithMatrix`**
Envia para o n8n:
- Documentos do candidato (base64)
- Documentos da matriz (completo)
- Metadados do candidato e matriz

### 3. **Auto-linking de Candidatos**
Quando um candidato tem `matrix_id` e importa documentos, ele é automaticamente vinculado a todas as vagas que usam essa matriz.

---

## 📊 Estrutura de Dados Recebidos

### Payload Completo:
```json
{
  "candidate_id": "uuid-do-candidato",
  "matrix_id": "uuid-da-matriz",
  "files": [
    {
      "name": "certificado.pdf",
      "type": "application/pdf",
      "size": 1024000,
      "base64": "...",
      "lastModified": 1703123456789
    }
  ],
  "matrix_documents": [
    {
      "matrix_item_id": "uuid",
      "document_id": "uuid",
      "obrigatoriedade": "Obrigatório",
      "modalidade": "Presencial",
      "carga_horaria": 40,
      "regra_validade": "2 anos",
      "document": {
        "id": "uuid",
        "name": "Curso Básico de Segurança",
        "codigo": "NR-33",
        "sigla_documento": "NR-33",
        "document_category": "Legislação",
        "document_type": "Certificado",
        "group_name": "Segurança do Trabalho",
        "categoria": "Norma"
      }
    }
  ],
  "processed_results": [],
  "timestamp": "2024-12-20T10:30:00Z",
  "total_files": 1,
  "total_matrix_documents": 5,
  "webhook_source": "job-flow-suite",
  "status": "processing_comparison"
}
```

---

## 🔧 Configuração do n8n

### 1. **Receber Dados do Webhook**

**Nó:** Webhook Trigger
```json
{
  "name": "Webhook Trigger",
  "type": "n8n-nodes-base.webhook",
  "parameters": {
    "httpMethod": "POST",
    "path": "8da335c4-08d9-4ffb-8ce6-7d4ce4e02bdf",
    "responseMode": "responseNode"
  }
}
```

### 2. **Processar Documentos do Candidato**

**Nó:** Function - Process Candidate Documents
```javascript
const webhookData = $input.first().json;

// Extrair dados
const candidateId = webhookData.candidate_id;
const matrixId = webhookData.matrix_id;
const candidateFiles = webhookData.files || [];
const matrixDocuments = webhookData.matrix_documents || [];

console.log('📥 Dados recebidos:', {
  candidate_id: candidateId,
  matrix_id: matrixId,
  total_files: candidateFiles.length,
  total_matrix_docs: matrixDocuments.length
});

// Retornar dados para próximo nó
return [{
  json: {
    candidate_id: candidateId,
    matrix_id: matrixId,
    candidate_files: candidateFiles,
    matrix_documents: matrixDocuments
  }
}];
```

### 3. **Realizar Comparações**

**Nó:** Function - Compare Documents
```javascript
const data = $input.first().json;
const candidateFiles = data.candidate_files;
const matrixDocuments = data.matrix_documents;

const comparisons = [];

// Para cada documento da matriz, encontrar o melhor match
for (const matrixDoc of matrixDocuments) {
  let bestMatch = null;
  let bestScore = 0;
  let matchType = 'none';
  let similarityScore = 0;
  let status = 'Pendente';
  
  // Buscar correspondência nos arquivos do candidato
  for (const candidateFile of candidateFiles) {
    // Comparação por código (máxima prioridade)
    if (candidateFile.metadata?.codigo && 
        candidateFile.metadata.codigo === matrixDoc.document.codigo) {
      matchType = 'exact_code';
      similarityScore = 1.0;
      bestScore = 1.0;
      bestMatch = candidateFile;
      status = 'Confere';
      break;
    }
    
    // Comparação por sigla (segunda prioridade)
    if (candidateFile.metadata?.sigla_documento && 
        candidateFile.metadata.sigla_documento === matrixDoc.document.sigla_documento) {
      if (similarityScore < 0.9) {
        matchType = 'exact_sigla';
        similarityScore = 0.9;
        bestScore = 0.9;
        bestMatch = candidateFile;
        status = 'Parcial';
      }
    }
    
    // Comparação por nome (terceira prioridade)
    if (candidateFile.metadata?.document_name && 
        matrixDoc.document.name) {
      const similarity = calculateStringSimilarity(
        candidateFile.metadata.document_name.toLowerCase(),
        matrixDoc.document.name.toLowerCase()
      );
      
      if (similarity > 0.8 && similarity > similarityScore) {
        matchType = 'semantic_name';
        similarityScore = similarity;
        bestScore = similarity;
        bestMatch = candidateFile;
        status = similarity > 0.9 ? 'Confere' : 'Parcial';
      }
    }
  }
  
  // Determinar status de validade
  let validityStatus = 'N/A';
  let validityDate = null;
  let observations = [];
  
  if (bestMatch) {
    // Verificar validade se houver data
    if (bestMatch.metadata?.expiry_date) {
      const expiryDate = new Date(bestMatch.metadata.expiry_date);
      const today = new Date();
      
      if (expiryDate > today) {
        validityStatus = 'Valido';
      } else {
        validityStatus = 'Vencido';
      }
      
      validityDate = expiryDate.toISOString().split('T')[0];
    }
    
    // Adicionar observações
    if (bestMatch.metadata?.modality !== matrixDoc.modalidade) {
      observations.push(`Modalidade: ${bestMatch.metadata?.modality || 'N/A'} vs ${matrixDoc.modalidade}`);
    }
    
    if (bestMatch.metadata?.carga_horaria_total !== matrixDoc.carga_horaria) {
      observations.push(`Horas: ${bestMatch.metadata?.carga_horaria_total || 'N/A'}h vs ${matrixDoc.carga_horaria}h`);
    }
  }
  
  comparisons.push({
    candidate_id: data.candidate_id,
    matrix_item_id: matrixDoc.matrix_item_id,
    candidate_document_id: bestMatch?.id || null,
    
    // Status da comparação
    status: status,
    validity_status: validityStatus,
    similarity_score: Math.round(similarityScore * 100) / 100,
    match_type: matchType,
    validity_date: validityDate,
    observations: observations.join(' / '),
    
    // Modalidade
    modalidade_candidato: bestMatch?.metadata?.modality || null,
    modalidade_exigida: matrixDoc.modalidade,
    
    // Horas
    horas_candidato: bestMatch?.metadata?.carga_horaria_total || null,
    horas_exigidas: matrixDoc.carga_horaria,
    
    // Código e Sigla
    codigo_documento: bestMatch?.metadata?.codigo || null,
    sigla_documento: bestMatch?.metadata?.sigla_documento || null,
    nome_documento: bestMatch?.metadata?.document_name || null,
    categoria: matrixDoc.document.categoria || null
  });
}

// Função auxiliar para calcular similaridade de strings
function calculateStringSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1, str2) {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2[i-1] === str1[j-1]) {
        matrix[i][j] = matrix[i-1][j-1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i-1][j-1] + 1,
          matrix[i][j-1] + 1,
          matrix[i-1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

return comparisons.map(c => ({ json: c }));
```

### 4. **Salvar Comparações no Banco de Dados**

**Nó:** Supabase - Insert
```json
{
  "name": "Save Comparisons to Database",
  "type": "n8n-nodes-base.postgres",
  "parameters": {
    "operation": "insert",
    "table": "document_comparisons",
    "columns": [
      "candidate_id",
      "candidate_document_id",
      "matrix_item_id",
      "status",
      "validity_status",
      "similarity_score",
      "match_type",
      "validity_date",
      "observations",
      "candidate_document_data",
      "matrix_item_data"
    ],
    "values": "={{ $json.candidate_id }},={{ $json.candidate_document_id }},={{ $json.matrix_item_id }},={{ $json.status }},={{ $json.validity_status }},={{ $json.similarity_score }},={{ $json.match_type }},={{ $json.validity_date }},={{ $json.observations }},={{ JSON.stringify($json.candidate_document_data) }},={{ JSON.stringify($json.matrix_item_data) }}"
  }
}
```

### 5. **Responder ao Webhook**

**Nó:** Respond to Webhook
```json
{
  "name": "Respond to Webhook",
  "type": "n8n-nodes-base.respondToWebhook",
  "parameters": {
    "respondWith": "json",
    "responseBody": "{\n  \"success\": true,\n  \"message\": \"Comparações processadas e salvas com sucesso\",\n  \"candidate_id\": \"{{ $('Process Candidate Documents').item.json.candidate_id }}\",\n  \"total_comparisons\": {{ $json.length }},\n  \"timestamp\": \"{{ $now }}\"\n}"
  }
}
```

---

## 🔄 Fluxo Completo

```
1. Webhook Trigger
   ↓
2. Process Candidate Documents
   ↓
3. Compare Documents
   ↓
4. Save Comparisons to Database
   ↓
5. Respond to Webhook
```

---

## 📊 Exemplo de Resultado

A tabela `document_comparisons` terá registros como:

| candidate_id | matrix_item_id | status | similarity_score | match_type |
|-------------|----------------|--------|------------------|------------|
| uuid-123 | uuid-456 | Confere | 1.0 | exact_code |
| uuid-123 | uuid-789 | Parcial | 0.9 | exact_sigla |
| uuid-123 | uuid-abc | Pendente | 0.0 | none |

---

## 🎯 Benefícios

### ✅ **Comparações Centralizadas**
- Todas as comparações ficam no banco de dados
- Base para todas as visualizações de compliance
- Histórico completo de comparações

### ✅ **Comparações Automáticas**
- Quando o n8n recebe os documentos, ele compara automaticamente
- Não precisa fazer no front-end
- Mais rápido e eficiente

### ✅ **Auto-linking**
- Candidato vinculado automaticamente a vagas relacionadas
- Vinculado quando cria candidato + vaga
- Vinculado quando importa documentos

---

## 🚀 Como Testar

1. **Importar documento de um candidato**
2. **Verificar logs do n8n** (deve processar comparações)
3. **Verificar banco de dados** (tabela `document_comparisons`)
4. **Verificar vaga** (candidato deve estar vinculado)

---

**🎉 Sistema configurado e pronto para comparações automáticas!**

