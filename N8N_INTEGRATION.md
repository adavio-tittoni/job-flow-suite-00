# 🤖 Configuração de Integração com n8n para Processamento de Documentos

## Visão Geral
Este documento descreve como configurar a integração com n8n para processamento automático de documentos usando IA.

## 🔧 Configuração do n8n

### 1. Criar Webhook no n8n

1. **Acesse seu n8n**: `https://seu-n8n-instance.com`
2. **Crie um novo workflow**
3. **Adicione um nó Webhook**:
   - **HTTP Method**: POST
   - **Path**: `/webhook/document-processing`
   - **Authentication**: Bearer Token (opcional)

### 2. Configurar Processamento de Documentos

```json
{
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "httpMethod": "POST",
        "path": "document-processing",
        "responseMode": "responseNode"
      }
    },
    {
      "name": "Process Document",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "// Código de processamento de documentos\nconst documentData = $input.first().json;\n\n// Aqui você pode integrar com:\n// - OpenAI GPT-4 Vision\n// - Google Cloud Vision API\n// - AWS Textract\n// - Azure Form Recognizer\n\n// Exemplo de integração com OpenAI\nconst openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {\n  method: 'POST',\n  headers: {\n    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,\n    'Content-Type': 'application/json'\n  },\n  body: JSON.stringify({\n    model: 'gpt-4-vision-preview',\n    messages: [\n      {\n        role: 'user',\n        content: [\n          {\n            type: 'text',\n            text: 'Extraia os seguintes dados deste documento: nome do documento, tipo, número de registro, data de emissão, data de validade, órgão emissor, carga horária total. Retorne em formato JSON.'\n          },\n          {\n            type: 'image_url',\n            image_url: {\n              url: documentData.file_url\n            }\n          }\n        ]\n      }\n    ]\n  })\n});\n\nconst aiResult = await openaiResponse.json();\n\n// Processar resposta da IA\nconst extractedData = JSON.parse(aiResult.choices[0].message.content);\n\nreturn {\n  json: {\n    ...extractedData,\n    file_url: documentData.file_url,\n    arquivo_original: documentData.file_name,\n    confidence_score: 0.95,\n    processing_timestamp: new Date().toISOString()\n  }\n};"
      }
    },
    {
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ $json }}"
      }
    }
  ]
}
```

### 3. Variáveis de Ambiente no n8n

Configure as seguintes variáveis de ambiente no n8n:

```env
# OpenAI (recomendado)
OPENAI_API_KEY=sk-your-openai-api-key

# Google Cloud Vision (alternativa)
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_CREDENTIALS=path/to/credentials.json

# AWS Textract (alternativa)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1

# Azure Form Recognizer (alternativa)
AZURE_FORM_RECOGNIZER_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_FORM_RECOGNIZER_KEY=your-api-key
```

## 🔗 Integração com o Sistema

### 1. Configurar Variáveis de Ambiente

No arquivo `.env.local` do projeto:

```env
# n8n Configuration
VITE_N8N_WEBHOOK_URL=https://seu-n8n-instance.com/webhook/document-processing
VITE_N8N_API_KEY=seu-api-key-opcional

# OpenAI (se usar diretamente)
VITE_OPENAI_API_KEY=sk-your-openai-api-key

# Outras APIs de IA
VITE_GOOGLE_CLOUD_PROJECT_ID=your-project-id
VITE_AWS_REGION=us-east-1
```

### 2. Estrutura de Dados

#### Entrada (do sistema para n8n):
```json
{
  "file_url": "candidate-id/timestamp_filename.pdf",
  "file_name": "certificado_curso.pdf",
  "file_size": 1024000,
  "file_type": "application/pdf",
  "candidate_id": "uuid-do-candidato",
  "options": {
    "enableOCR": true,
    "extractDates": true,
    "extractNumbers": true,
    "extractText": true,
    "language": "pt"
  }
}
```

#### Saída (do n8n para o sistema):
```json
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
```

## 🚀 Implementação Avançada

### 1. Workflow Completo no n8n

```json
{
  "name": "Document Processing Pipeline",
  "nodes": [
    {
      "name": "Webhook Trigger",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "httpMethod": "POST",
        "path": "document-processing"
      }
    },
    {
      "name": "Download File",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "={{ $json.file_url }}",
        "method": "GET",
        "responseFormat": "file"
      }
    },
    {
      "name": "OCR Processing",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "// Processar OCR com Google Cloud Vision\nconst fileBuffer = $input.first().binary.data;\n\nconst vision = require('@google-cloud/vision');\nconst client = new vision.ImageAnnotatorClient();\n\nconst [result] = await client.textDetection({\n  image: { content: fileBuffer }\n});\n\nconst text = result.textAnnotations[0]?.description || '';\n\nreturn { json: { extracted_text: text } };"
      }
    },
    {
      "name": "AI Data Extraction",
      "type": "n8n-nodes-base.openAi",
      "parameters": {
        "resource": "chat",
        "model": "gpt-4",
        "messages": {
          "values": [
            {
              "role": "system",
              "content": "Você é um especialista em extrair dados de documentos brasileiros. Extraia as seguintes informações em formato JSON: nome do documento, tipo, número de registro, data de emissão, data de validade, órgão emissor, carga horária total."
            },
            {
              "role": "user",
              "content": "Extraia os dados do seguinte texto de documento:\n\n{{ $('OCR Processing').item.json.extracted_text }}"
            }
          ]
        }
      }
    },
    {
      "name": "Format Response",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "const aiResponse = $input.first().json;\nconst originalData = $('Webhook Trigger').first().json;\n\n// Parse AI response\nconst extractedData = JSON.parse(aiResponse.choices[0].message.content);\n\nreturn {\n  json: {\n    ...extractedData,\n    file_url: originalData.file_url,\n    arquivo_original: originalData.file_name,\n    confidence_score: 0.95,\n    processing_timestamp: new Date().toISOString(),\n    extracted_fields: {\n      file_size: originalData.file_size,\n      file_type: originalData.file_type,\n      ai_version: '1.0.0'\n    }\n  }\n};"
      }
    },
    {
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ $json }}"
      }
    }
  ]
}
```

### 2. Tratamento de Erros

```json
{
  "name": "Error Handler",
  "type": "n8n-nodes-base.function",
  "parameters": {
    "functionCode": "// Tratar erros de processamento\nconst error = $input.first().json;\n\nreturn {\n  json: {\n    error: true,\n    message: error.message || 'Erro desconhecido no processamento',\n    document_name: 'Documento não identificado',\n    document_type: 'Desconhecido',\n    detail: 'Erro no processamento com IA',\n    arquivo_original: 'arquivo_original',\n    file_url: 'file_url',\n    confidence_score: 0.0\n  }\n};"
  }
}
```

## 📊 Monitoramento e Logs

### 1. Logs no n8n

Configure logs para monitorar o processamento:

```javascript
// Adicionar no início de cada nó
console.log('Processing document:', {
  file_name: $json.file_name,
  candidate_id: $json.candidate_id,
  timestamp: new Date().toISOString()
});
```

### 2. Métricas de Performance

- **Tempo de processamento**: Monitorar tempo total
- **Taxa de sucesso**: Documentos processados com sucesso
- **Confiança da IA**: Score de confiança dos resultados
- **Erros**: Tipos de erro mais comuns

## 🔒 Segurança

### 1. Autenticação

```javascript
// Verificar token de autenticação
const authHeader = $request.headers.authorization;
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  throw new Error('Token de autenticação inválido');
}
```

### 2. Validação de Dados

```javascript
// Validar dados de entrada
const requiredFields = ['file_url', 'file_name', 'candidate_id'];
for (const field of requiredFields) {
  if (!$json[field]) {
    throw new Error(`Campo obrigatório ausente: ${field}`);
  }
}
```

## 🧪 Testes

### 1. Teste Manual

```bash
curl -X POST https://seu-n8n-instance.com/webhook/document-processing \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer seu-token" \
  -d '{
    "file_url": "test/certificado.pdf",
    "file_name": "certificado.pdf",
    "file_size": 1024000,
    "file_type": "application/pdf",
    "candidate_id": "test-candidate-id",
    "options": {
      "enableOCR": true,
      "extractDates": true,
      "extractNumbers": true,
      "extractText": true,
      "language": "pt"
    }
  }'
```

### 2. Teste Automatizado

```javascript
// Teste automatizado no n8n
const testData = {
  file_url: 'test/sample.pdf',
  file_name: 'sample.pdf',
  candidate_id: 'test-123'
};

// Executar workflow de teste
const result = await executeWorkflow('document-processing', testData);
console.assert(result.document_name, 'Document name should be extracted');
```

---

**🎯 Com esta configuração, o sistema estará pronto para processar documentos automaticamente com IA!**
