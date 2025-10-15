# 🤖 Configuração do Webhook n8n para Processamento de Documentos

## 📋 Visão Geral
Este documento explica como configurar o webhook no n8n para receber arquivos em base64 e dados de candidatos do sistema Job Flow Suite.

---

## 🔗 **WEBHOOK CONFIGURADO:**

**URL do Webhook:** `https://n8nwebhook.aulan8ntech.shop/webhook/8da335c4-08d9-4ffb-8ce6-7d4ce4e02bdf`

---

## 📊 **ESTRUTURA DE DADOS ENVIADOS:**

### **Payload Completo:**
```json
{
  "candidate_id": "uuid-do-candidato",
  "files": [
    {
      "name": "certificado_curso.pdf",
      "type": "application/pdf",
      "size": 1024000,
      "base64": "JVBERi0xLjQKJcfsj6IKNSAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDMgMCBSCi9SZXNvdXJjZXMgPDwKL0ZvbnQgPDwKL0YxIDIgMCBSCj4+Cj4+Ci9NZWRpYUJveCBbMCAwIDU5NSA4NDJdCi9Db250ZW50cyA0IDAgUgo+PgplbmRvYmoK...",
      "lastModified": 1703123456789
    }
  ],
  "processed_results": [
    {
      "document_name": "Certificado de Curso de Programação",
      "document_type": "Certificado",
      "registration_number": "REG-123456789",
      "issue_date": "2024-01-15",
      "expiry_date": "2025-01-15",
      "issuing_authority": "Instituto de Tecnologia",
      "carga_horaria_total": 120,
      "carga_horaria_teorica": 80,
      "carga_horaria_pratica": 40,
      "detail": "Curso completo de programação web",
      "arquivo_original": "certificado_curso.pdf",
      "file_url": "candidate-id/timestamp_filename.pdf",
      "confidence_score": 0.95,
      "extracted_fields": {
        "file_size": 1024000,
        "file_type": "application/pdf",
        "processing_timestamp": "2024-12-20T10:30:00Z",
        "ai_version": "1.0.0"
      }
    }
  ],
  "timestamp": "2024-12-20T10:30:00Z",
  "total_files": 1,
  "webhook_source": "job-flow-suite"
}
```

---

## 🔧 **CONFIGURAÇÃO NO N8N:**

### **1. Criar Novo Workflow**

1. **Acesse seu n8n**: `https://n8nwebhook.aulan8ntech.shop`
2. **Crie um novo workflow**
3. **Nome**: "Job Flow Suite - Document Processing"

### **2. Configurar Webhook Node**

```json
{
  "name": "Webhook Trigger",
  "type": "n8n-nodes-base.webhook",
  "parameters": {
    "httpMethod": "POST",
    "path": "8da335c4-08d9-4ffb-8ce6-7d4ce4e02bdf",
    "responseMode": "responseNode",
    "options": {
      "rawBody": true
    }
  }
}
```

### **3. Processar Dados Recebidos**

```json
{
  "name": "Process Received Data",
  "type": "n8n-nodes-base.function",
  "parameters": {
    "functionCode": "// Extrair dados do webhook\nconst webhookData = $input.first().json;\n\n// Log dos dados recebidos\nconsole.log('Dados recebidos:', {\n  candidate_id: webhookData.candidate_id,\n  total_files: webhookData.total_files,\n  timestamp: webhookData.timestamp\n});\n\n// Processar cada arquivo\nconst processedFiles = webhookData.files.map((file, index) => {\n  const processedResult = webhookData.processed_results[index];\n  \n  return {\n    candidate_id: webhookData.candidate_id,\n    file_name: file.name,\n    file_type: file.type,\n    file_size: file.size,\n    base64_content: file.base64,\n    processed_data: processedResult,\n    confidence_score: processedResult?.confidence_score || 0,\n    processing_timestamp: webhookData.timestamp\n  };\n});\n\nreturn processedFiles.map(file => ({ json: file }));"
  }
}
```

### **4. Salvar Arquivos (Opcional)**

```json
{
  "name": "Save Files to Storage",
  "type": "n8n-nodes-base.function",
  "parameters": {
    "functionCode": "// Converter base64 de volta para arquivo e salvar\nconst fileData = $input.first().json;\n\n// Aqui você pode:\n// 1. Salvar no Google Drive\n// 2. Salvar no Dropbox\n// 3. Salvar no AWS S3\n// 4. Salvar localmente\n\n// Exemplo: Salvar no Google Drive\nconst drive = require('googleapis').drive('v3');\n\n// Converter base64 para buffer\nconst fileBuffer = Buffer.from(fileData.base64_content, 'base64');\n\n// Upload para Google Drive\nconst response = await drive.files.create({\n  requestBody: {\n    name: fileData.file_name,\n    parents: ['PASTA_ID_AQUI']\n  },\n  media: {\n    mimeType: fileData.file_type,\n    body: fileBuffer\n  }\n});\n\nreturn {\n  json: {\n    ...fileData,\n    saved_file_id: response.data.id,\n    saved_file_url: `https://drive.google.com/file/d/${response.data.id}/view`\n  }\n};"
  }
}
```

### **5. Salvar Dados no Banco**

```json
{
  "name": "Save to Database",
  "type": "n8n-nodes-base.postgres",
  "parameters": {
    "operation": "insert",
    "table": "candidate_documents_external",
    "columns": "candidate_id,file_name,file_type,file_size,processed_data,confidence_score,processing_timestamp,external_file_id",
    "values": "={{ $json.candidate_id }},={{ $json.file_name }},={{ $json.file_type }},={{ $json.file_size }},={{ JSON.stringify($json.processed_data) }},={{ $json.confidence_score }},={{ $json.processing_timestamp }},={{ $json.saved_file_id }}"
  }
}
```

### **6. Enviar Notificação (Opcional)**

```json
{
  "name": "Send Notification",
  "type": "n8n-nodes-base.emailSend",
  "parameters": {
    "fromEmail": "sistema@empresa.com",
    "toEmail": "rh@empresa.com",
    "subject": "Documentos Processados - Candidato {{ $json.candidate_id }}",
    "message": "Os documentos do candidato {{ $json.candidate_id }} foram processados com sucesso.\\n\\nArquivos processados:\\n{{ $json.file_name }}\\n\\nConfiança da IA: {{ $json.confidence_score }}%"
  }
}
```

### **7. Responder ao Webhook**

```json
{
  "name": "Respond to Webhook",
  "type": "n8n-nodes-base.respondToWebhook",
  "parameters": {
    "respondWith": "json",
    "responseBody": "{\n  \"success\": true,\n  \"message\": \"Documentos processados com sucesso\",\n  \"candidate_id\": \"{{ $json.candidate_id }}\",\n  \"files_processed\": {{ $json.total_files }},\n  \"timestamp\": \"{{ $json.processing_timestamp }}\"\n}"
  }
}
```

---

## 🔄 **WORKFLOW COMPLETO:**

```json
{
  "name": "Job Flow Suite Document Processing",
  "nodes": [
    {
      "name": "Webhook Trigger",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "httpMethod": "POST",
        "path": "8da335c4-08d9-4ffb-8ce6-7d4ce4e02bdf",
        "responseMode": "responseNode"
      }
    },
    {
      "name": "Process Received Data",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "const webhookData = $input.first().json;\nconst processedFiles = webhookData.files.map((file, index) => {\n  const processedResult = webhookData.processed_results[index];\n  return {\n    candidate_id: webhookData.candidate_id,\n    file_name: file.name,\n    file_type: file.type,\n    file_size: file.size,\n    base64_content: file.base64,\n    processed_data: processedResult,\n    confidence_score: processedResult?.confidence_score || 0,\n    processing_timestamp: webhookData.timestamp\n  };\n});\nreturn processedFiles.map(file => ({ json: file }));"
      }
    },
    {
      "name": "Save Files to Storage",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "const fileData = $input.first().json;\n// Implementar lógica de salvamento aqui\nreturn { json: { ...fileData, saved: true } };"
      }
    },
    {
      "name": "Save to Database",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "operation": "insert",
        "table": "candidate_documents_external",
        "columns": "candidate_id,file_name,file_type,file_size,processed_data,confidence_score,processing_timestamp",
        "values": "={{ $json.candidate_id }},={{ $json.file_name }},={{ $json.file_type }},={{ $json.file_size }},={{ JSON.stringify($json.processed_data) }},={{ $json.confidence_score }},={{ $json.processing_timestamp }}"
      }
    },
    {
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "parameters": {
        "respondWith": "json",
        "responseBody": "{\n  \"success\": true,\n  \"message\": \"Documentos processados com sucesso\",\n  \"candidate_id\": \"{{ $json.candidate_id }}\",\n  \"timestamp\": \"{{ $json.processing_timestamp }}\"\n}"
      }
    }
  ],
  "connections": {
    "Webhook Trigger": {
      "main": [
        [
          {
            "node": "Process Received Data",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Process Received Data": {
      "main": [
        [
          {
            "node": "Save Files to Storage",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Save Files to Storage": {
      "main": [
        [
          {
            "node": "Save to Database",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Save to Database": {
      "main": [
        [
          {
            "node": "Respond to Webhook",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

---

## 📊 **ESTRUTURA DO BANCO DE DADOS:**

### **Tabela para Armazenar Dados Externos:**

```sql
CREATE TABLE candidate_documents_external (
    id SERIAL PRIMARY KEY,
    candidate_id VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    processed_data JSONB,
    confidence_score DECIMAL(3,2),
    processing_timestamp TIMESTAMP DEFAULT NOW(),
    external_file_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_candidate_documents_external_candidate_id ON candidate_documents_external(candidate_id);
CREATE INDEX idx_candidate_documents_external_timestamp ON candidate_documents_external(processing_timestamp);
```

---

## 🔍 **MONITORAMENTO E LOGS:**

### **1. Logs no n8n:**

```javascript
// Adicionar no início de cada nó
console.log('Processing candidate documents:', {
  candidate_id: $json.candidate_id,
  file_name: $json.file_name,
  timestamp: new Date().toISOString()
});
```

### **2. Métricas de Performance:**

- **Tempo de processamento**: Monitorar tempo total
- **Taxa de sucesso**: Documentos processados com sucesso
- **Tamanho dos arquivos**: Monitorar tamanho médio
- **Confiança da IA**: Score médio de confiança

---

## 🧪 **TESTE DO WEBHOOK:**

### **Teste Manual:**

```bash
curl -X POST https://n8nwebhook.aulan8ntech.shop/webhook/8da335c4-08d9-4ffb-8ce6-7d4ce4e02bdf \
  -H "Content-Type: application/json" \
  -d '{
    "candidate_id": "test-candidate-123",
    "files": [
      {
        "name": "test.pdf",
        "type": "application/pdf",
        "size": 1024,
        "base64": "JVBERi0xLjQKJcfsj6IKNSAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDMgMCBSCi9SZXNvdXJjZXMgPDwKL0ZvbnQgPDwKL0YxIDIgMCBSCj4+Cj4+Ci9NZWRpYUJveCBbMCAwIDU5NSA4NDJdCi9Db250ZW50cyA0IDAgUgo+PgplbmRvYmoK",
        "lastModified": 1703123456789
      }
    ],
    "processed_results": [
      {
        "document_name": "Test Document",
        "document_type": "Test",
        "confidence_score": 0.95
      }
    ],
    "timestamp": "2024-12-20T10:30:00Z",
    "total_files": 1,
    "webhook_source": "job-flow-suite"
  }'
```

---

## 🚀 **FLUXO COMPLETO:**

### **1. Sistema Job Flow Suite:**
```
Upload Arquivos → Processamento IA → Conversão Base64 → Envio Webhook
```

### **2. n8n Webhook:**
```
Receber Dados → Processar Arquivos → Salvar Storage → Salvar Banco → Responder
```

### **3. Resultado:**
```
Arquivos Seguros + Dados Estruturados + Vinculação Candidato
```

---

## 🎯 **BENEFÍCIOS:**

### **Para o Sistema:**
- ✅ **Backup Automático**: Arquivos salvos externamente
- ✅ **Processamento Duplo**: IA local + processamento externo
- ✅ **Auditoria**: Rastreamento completo de documentos
- ✅ **Escalabilidade**: Processamento distribuído

### **Para o RH:**
- ✅ **Segurança**: Múltiplas cópias dos documentos
- ✅ **Integração**: Dados disponíveis em outros sistemas
- ✅ **Relatórios**: Análise de documentos processados
- ✅ **Compliance**: Rastreabilidade completa

---

**🎉 Sistema configurado e pronto para processar documentos automaticamente!**
