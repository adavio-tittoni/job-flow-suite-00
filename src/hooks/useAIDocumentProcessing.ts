import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

interface AIDocumentProcessingResult {
  document_name: string;
  document_type: string;
  registration_number?: string;
  issue_date?: string;
  expiry_date?: string;
  issuing_authority?: string;
  carga_horaria_total?: number;
  carga_horaria_teorica?: number;
  carga_horaria_pratica?: number;
  detail?: string;
  arquivo_original: string;
  file_url: string;
  confidence_score?: number;
  extracted_fields?: Record<string, any>;
}

interface DocumentProcessingOptions {
  enableOCR?: boolean;
  extractDates?: boolean;
  extractNumbers?: boolean;
  extractText?: boolean;
  language?: 'pt' | 'en' | 'auto';
}

// SECURITY: Get webhook headers with optional authentication
const getWebhookHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  // Add authentication header if configured
  const webhookAuthToken = import.meta.env.VITE_N8N_WEBHOOK_AUTH_TOKEN;
  if (webhookAuthToken) {
    headers['Authorization'] = `Bearer ${webhookAuthToken}`;
  }
  
  return headers;
};

// Get webhook URL from environment
const getWebhookUrl = (): string => {
  return import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://n8nwebhook.aulan8ntech.shop/webhook/8da335c4-08d9-4ffb-8ce6-7d4ce4e02bdf';
};

export const useAIDocumentProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const sanitizeFileName = (fileName: string): string => {
    logger.debug('Sanitizing file name:', fileName);
    
    // Extrair extensão primeiro
    const parts = fileName.split('.');
    const extension = parts.length > 1 ? parts.pop() : '';
    const nameWithoutExt = parts.join('.');
    
    // Sanitizar nome (sem extensão) - MUITO mais agressivo
    let sanitized = nameWithoutExt
      .toLowerCase() // Converter para lowercase primeiro
      .replace(/[^a-z0-9._-]/g, '_') // Remove TODOS os caracteres especiais exceto letras minúsculas, números, pontos, underscores e hífens
      .replace(/_{2,}/g, '_') // Remove underscores duplos
      .replace(/^_|_$/g, '') // Remove underscores do início e fim
      .replace(/^\.|\.$/g, '') // Remove pontos do início e fim
      .replace(/^-|-$/g, '') // Remove hífens do início e fim
      .substring(0, 80); // Limita o tamanho
    
    // Garantir que não está vazio
    if (!sanitized || sanitized.length === 0) {
      sanitized = `file_${Date.now()}`;
      logger.debug('Name was empty, using fallback:', sanitized);
    }
    
    // Adicionar extensão se existir (também em lowercase)
    if (extension) {
      sanitized += `.${extension.toLowerCase()}`;
    }
    
    logger.debug('File name sanitized:', { original: fileName, sanitized });
    return sanitized;
  };

  const uploadFileToStorage = async (file: File, candidateId: string): Promise<string> => {
    logger.debug('Upload function called');
    const sanitizedFileName = sanitizeFileName(file.name);
    // Usar apenas o nome sanitizado, sem timestamp
    const fileName = `${candidateId}/${sanitizedFileName}`;
    
    // Verificar se o arquivo é válido
    if (!file || file.size === 0) {
      throw new Error('Arquivo inválido ou vazio');
    }
    
    // Verificar tipo de arquivo
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      logger.warn('File type not in allowed list:', file.type);
    }
    
    logger.debug('File validation passed:', { name: file.name, size: file.size, type: file.type });
    
    // Verificar se o fileName é válido
    if (!fileName || fileName.length === 0) {
      throw new Error('Invalid file name generated');
    }
    
    // Verificar se não excede o limite de caracteres
    if (fileName.length > 255) {
      throw new Error('Nome de arquivo muito longo');
    }
    
    logger.debug('Attempting storage upload:', { bucket: 'candidate-documents', fileName });

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('candidate-documents')
      .upload(fileName, file);

    if (uploadError) {
      logger.error('Upload error:', { errorMessage: uploadError.message, fileName });
      
      // Tratar erros específicos
      if (uploadError.message.includes('Invalid key')) {
        throw new Error(`Nome de arquivo inválido: ${fileName}. Tente renomear o arquivo.`);
      } else if (uploadError.message.includes('already exists')) {
        throw new Error(`Arquivo já existe: ${file.name}`);
      } else {
        throw new Error(`Erro ao fazer upload: ${uploadError.message}`);
      }
    }
    
    logger.debug('File uploaded successfully:', { fileName });
    return fileName;
  };

  const processDocumentWithAI = async (
    file: File, 
    candidateId: string,
    options: DocumentProcessingOptions = {}
  ): Promise<AIDocumentProcessingResult> => {
    // Para processamento individual, usar o batch com um arquivo
    const results = await batchProcessDocuments([file], candidateId, options);
    return results[0];
  };

  const mockAIProcessing = async (file: File, fileUrl: string): Promise<AIDocumentProcessingResult> => {
    // Simular delay de processamento
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Gerar dados mock baseados no nome do arquivo
    const fileName = file.name.toLowerCase();
    const isCertificate = fileName.includes('certificado') || fileName.includes('certificate');
    const isDiploma = fileName.includes('diploma');
    const isRG = fileName.includes('rg') || fileName.includes('identidade');
    const isCPF = fileName.includes('cpf');
    const isCNH = fileName.includes('cnh') || fileName.includes('habilitacao');

    const baseResult: AIDocumentProcessingResult = {
      document_name: file.name.split('.')[0].replace(/[-_]/g, ' '),
      document_type: getDocumentType(fileName),
      arquivo_original: file.name,
      file_url: fileUrl,
      confidence_score: 0.85,
      extracted_fields: {}
    };

    if (isCertificate || isDiploma) {
      baseResult.registration_number = `REG-${Date.now()}`;
      baseResult.issue_date = new Date().toISOString().split('T')[0];
      baseResult.expiry_date = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      baseResult.issuing_authority = 'Instituição de Ensino';
      baseResult.carga_horaria_total = Math.floor(Math.random() * 200) + 40;
      baseResult.detail = 'Certificado processado automaticamente por IA';
    } else if (isRG) {
      baseResult.registration_number = `${Math.floor(Math.random() * 900000000) + 100000000}`;
      baseResult.issue_date = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      baseResult.expiry_date = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      baseResult.issuing_authority = 'SSP';
      baseResult.detail = 'RG processado automaticamente por IA';
    } else if (isCPF) {
      baseResult.registration_number = `${Math.floor(Math.random() * 90000000000) + 10000000000}`;
      baseResult.detail = 'CPF processado automaticamente por IA';
    } else if (isCNH) {
      baseResult.registration_number = `${Math.floor(Math.random() * 90000000000) + 10000000000}`;
      baseResult.issue_date = new Date().toISOString().split('T')[0];
      baseResult.expiry_date = new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      baseResult.issuing_authority = 'DETRAN';
      baseResult.detail = 'CNH processada automaticamente por IA';
    } else {
      baseResult.detail = 'Documento processado automaticamente por IA';
    }

    return baseResult;
  };

  const getDocumentType = (fileName: string): string => {
    if (fileName.includes('certificado')) return 'Certificado';
    if (fileName.includes('diploma')) return 'Diploma';
    if (fileName.includes('rg')) return 'RG';
    if (fileName.includes('cpf')) return 'CPF';
    if (fileName.includes('cnh')) return 'CNH';
    if (fileName.includes('comprovante')) return 'Comprovante';
    if (fileName.includes('contrato')) return 'Contrato';
    return 'Documento';
  };

  const enhanceAIResults = (result: AIDocumentProcessingResult, file: File): AIDocumentProcessingResult => {
    // Melhorar os resultados com validações e formatações
    const enhanced = { ...result };

    // Validar e formatar datas
    if (enhanced.issue_date) {
      const issueDate = new Date(enhanced.issue_date);
      if (isNaN(issueDate.getTime())) {
        enhanced.issue_date = undefined;
      }
    }

    if (enhanced.expiry_date) {
      const expiryDate = new Date(enhanced.expiry_date);
      if (isNaN(expiryDate.getTime())) {
        enhanced.expiry_date = undefined;
      }
    }

    // Validar números
    if (enhanced.carga_horaria_total && enhanced.carga_horaria_total < 0) {
      enhanced.carga_horaria_total = undefined;
    }

    // Adicionar campos extras baseados no tipo de documento
    enhanced.extracted_fields = {
      ...enhanced.extracted_fields,
      file_size: file.size,
      file_type: file.type,
      processing_timestamp: new Date().toISOString(),
      ai_version: '1.0.0'
    };

    return enhanced;
  };

  const batchProcessDocuments = async (
    files: File[],
    candidateId: string,
    options: DocumentProcessingOptions = {}
  ): Promise<AIDocumentProcessingResult[]> => {
    const results: AIDocumentProcessingResult[] = [];
    
    logger.debug(`Starting batch processing of ${files.length} files`);
    
    try {
      // Step 1: Test base64 conversion first
      logger.debug('Step 1: Converting files to base64...');
      const filesWithBase64 = [];
      
      for (let i = 0; i < files.length; i++) {
        try {
          logger.debug(`Converting file ${i + 1}/${files.length}: ${files[i].name}`);
          const base64 = await fileToBase64(files[i]);
          
          if (!base64 || base64.length === 0) {
            throw new Error('Base64 conversion failed - empty result');
          }
          
          filesWithBase64.push({
            name: files[i].name,
            type: files[i].type,
            size: files[i].size,
            base64: base64,
            lastModified: files[i].lastModified
          });
          
          logger.debug(`File ${i + 1} converted successfully`);
          
        } catch (error: any) {
          logger.error(`Error converting file ${i + 1} to base64:`, { fileName: files[i].name, error: error.message });
          
          // Create error result
          const errorResult: AIDocumentProcessingResult = {
            document_name: files[i].name.split('.')[0],
            document_type: 'Erro',
            arquivo_original: files[i].name,
            file_url: '',
            confidence_score: 0,
            extracted_fields: {
              error: `Erro na conversão base64: ${error.message}`,
              status: 'error'
            }
          };
          results.push(errorResult);
          
          toast({
            title: "Erro na conversão",
            description: `Erro ao converter ${files[i].name} para base64: ${error.message}`,
            variant: "destructive",
          });
        }
      }
      
      // Step 2: Upload successful files to storage
      logger.debug('Step 2: Uploading files to storage...');
      for (let i = 0; i < filesWithBase64.length; i++) {
        try {
          const file = files.find(f => f.name === filesWithBase64[i].name);
          if (!file) continue;
          
          logger.debug(`Uploading file ${i + 1}/${filesWithBase64.length}: ${file.name}`);
          const fileUrl = await uploadFileToStorage(file, candidateId);
          
          // Create processing document in database
          const documentId = await createProcessingDocument(candidateId, file, fileUrl);
          
          // Create result for this file
          const result: AIDocumentProcessingResult = {
            document_name: file.name.split('.')[0],
            document_type: 'Processando...',
            arquivo_original: file.name,
            file_url: fileUrl,
            confidence_score: 0,
            extracted_fields: {
              status: 'processing',
              webhook_sent: false,
              processing_timestamp: new Date().toISOString(),
              document_id: documentId
            }
          };
          results.push(result);
          
          logger.debug(`File ${i + 1} uploaded successfully`);
          
        } catch (error: any) {
          logger.error(`Error uploading file:`, { fileName: filesWithBase64[i].name, error: error.message });
          
          // Create error result
          const errorResult: AIDocumentProcessingResult = {
            document_name: filesWithBase64[i].name.split('.')[0],
            document_type: 'Erro',
            arquivo_original: filesWithBase64[i].name,
            file_url: '',
            confidence_score: 0,
            extracted_fields: {
              error: `Erro no upload: ${error.message}`,
              status: 'error'
            }
          };
          results.push(errorResult);
          
          toast({
            title: "Erro no upload",
            description: `Erro ao fazer upload de ${filesWithBase64[i].name}: ${error.message}`,
            variant: "destructive",
          });
        }
      }
      
      // Step 3: Send all files to n8n webhook in one request
      logger.debug('Step 3: Sending files to n8n webhook...');
      try {
        if (filesWithBase64.length > 0) {
          await sendToN8nWebhookWithData(filesWithBase64, candidateId, []);
          logger.debug('All files sent to n8n webhook successfully');
          
          // Update all results to indicate webhook was sent
          results.forEach(result => {
            if (result.extracted_fields?.status === 'processing') {
              result.extracted_fields.webhook_sent = true;
            }
          });
        } else {
          logger.debug('No files to send to webhook');
        }
        
        setProgress(100);
        logger.debug('Batch processing completed successfully');
        
      } catch (error: any) {
        logger.error('Error sending files to n8n webhook:', { error: error.message });
        toast({
          title: "Erro no webhook",
          description: `Erro ao enviar arquivos para n8n: ${error.message}`,
          variant: "destructive",
        });
      }
      
    } catch (error: any) {
      logger.error('Error in batch processing:', { error: error.message });
      toast({
        title: "Erro no processamento em lote",
        description: `Erro geral: ${error.message}`,
        variant: "destructive",
      });
    }
    
    logger.debug(`Batch processing completed. ${results.length} results generated.`);
    return results;
  };

  const sendToN8nWebhook = async (
    files: File[],
    candidateId: string,
    processedResults: AIDocumentProcessingResult[] = []
  ): Promise<{ success: boolean; message?: string; documentId?: string; isDocumentNotBelonging?: boolean }> => {
    try {
      // Converter arquivos para base64
      const filesWithBase64 = await Promise.all(
        files.map(async (file) => {
          const base64 = await fileToBase64(file);
          
          // Verificar se o arquivo é muito grande para o webhook
          if (base64.length > 10 * 1024 * 1024) { // 10MB em base64
            logger.warn(`File ${file.name} is too large for webhook`);
            throw new Error(`Arquivo ${file.name} é muito grande para processamento (máximo 10MB)`);
          }
          
          return {
            name: file.name,
            type: file.type,
            size: file.size,
            base64: base64,
            lastModified: file.lastModified
          };
        })
      );

      // Usar a função com dados preparados
      return await sendToN8nWebhookWithData(filesWithBase64, candidateId, processedResults);

    } catch (error: any) {
      logger.error('Error preparing webhook data:', { error: error.message, totalFiles: files.length });
      return { success: false, message: error.message };
    }
  };

  const sendToN8nWebhookWithData = async (
    filesWithBase64: any[],
    candidateId: string,
    processedResults: AIDocumentProcessingResult[] = []
  ): Promise<{ success: boolean; message?: string; documentId?: string; isDocumentNotBelonging?: boolean }> => {
    try {
      // Buscar nome do candidato
      const { data: candidate, error: candidateError } = await supabase
        .from('candidates')
        .select('id, name')
        .eq('id', candidateId)
        .single();

      if (candidateError) {
        logger.error('Erro ao buscar candidato:', { error: candidateError.message });
        // Continuar mesmo sem o nome, mas logar o erro
      }

      // Preparar dados para envio - SECURITY: não logar dados sensíveis como base64
      logger.debug('Preparing webhook data...', { totalFiles: filesWithBase64.length });
      const webhookData = {
        candidate_id: candidateId,
        candidate_name: candidate?.name || null,
        files: filesWithBase64,
        processed_results: processedResults,
        timestamp: new Date().toISOString(),
        total_files: filesWithBase64.length,
        webhook_source: 'job-flow-suite',
        status: 'processing' // Indica que está sendo processado
      };

      // Verificar tamanho total dos dados
      const totalDataSize = JSON.stringify(webhookData).length;
      logger.debug('Webhook data prepared:', { totalFiles: webhookData.total_files, totalDataSize });

      // Verificar se os dados são muito grandes
      if (totalDataSize > 50 * 1024 * 1024) { // 50MB
        logger.warn(`Webhook data is too large (${totalDataSize} bytes)`);
        throw new Error('Dados do webhook são muito grandes para envio');
      }

      // Enviar para o webhook do n8n - SECURITY: Use centralized URL and headers
      const webhookUrl = getWebhookUrl();
      
      // Usar fetch com retry mechanism
      const sendWithRetry = async (retryCount = 0) => {
        try {
          logger.debug(`Sending webhook request (attempt ${retryCount + 1})`);
          
          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: getWebhookHeaders(),
            body: JSON.stringify(webhookData)
          });

          logger.debug('Webhook response received:', { status: response.status, ok: response.ok });
          
          // Ler resposta uma única vez
          const responseText = await response.text();

          if (!response.ok) {
            logger.error(`Webhook failed: ${response.status} ${response.statusText}`);
            
            if (retryCount < 2) {
              logger.debug(`Retrying webhook request (attempt ${retryCount + 1})`);
              await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
              return sendWithRetry(retryCount + 1);
            }
            
            throw new Error(`Webhook failed: ${response.status}`);
          } else {
            logger.debug('Webhook sent successfully');
            
            // Processar resposta do webhook
            let responseData: any = null;
            try {
              responseData = JSON.parse(responseText);
            } catch {
              // Se não for JSON, tratar como texto
              responseData = { message: responseText };
            }
            
            // Verificar se a resposta indica que o documento não pertence ao candidato
            const responseMessage = responseData?.message || responseText || '';
            const responseLower = responseMessage.toLowerCase();
            const isDocumentNotBelonging = 
              responseLower.includes('documento não pertence ao candidato') ||
              responseLower.includes('documento nao pertence ao candidato') ||
              responseLower.includes('documento não pertence') ||
              responseLower.includes('documento nao pertence') ||
              responseLower.includes('não pertence ao candidato') ||
              responseLower.includes('nao pertence ao candidato');
            
            if (isDocumentNotBelonging) {
              logger.warn('Documento não pertence ao candidato detectado na resposta');
            }
            
            return {
              success: true,
              message: responseMessage,
              documentId: responseData?.document_id,
              isDocumentNotBelonging
            };
          }
        } catch (error: any) {
          logger.error(`Webhook error on attempt ${retryCount + 1}:`, { error: error.message });
          if (retryCount < 2) {
            logger.debug(`Retrying webhook request due to error`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
            return sendWithRetry(retryCount + 1);
          }
          throw error;
        }
      };

      // Executar envio com retry e aguardar resposta
      return sendWithRetry().catch(error => {
        logger.error('Error sending to webhook after retries:', { error: error.message, totalFiles: filesWithBase64.length });
        toast({
          title: "Erro no webhook",
          description: `Erro ao enviar para n8n: ${error.message}`,
          variant: "destructive",
        });
        return { success: false, message: error.message };
      });

    } catch (error: any) {
      logger.error('Error sending webhook with data:', { error: error.message, totalFiles: filesWithBase64.length });
      throw new Error(`Erro ao enviar webhook: ${error.message}`);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      logger.debug('Converting file to base64:', { name: file.name, size: file.size, type: file.type });
      
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        try {
          const result = reader.result as string;
          
          // Remover o prefixo "data:image/jpeg;base64," ou similar
          const base64 = result.split(',')[1];
          logger.debug('File converted to base64 successfully:', { fileName: file.name });
          
          if (!base64 || base64.length === 0) {
            throw new Error('Base64 result is empty');
          }
          
          resolve(base64);
        } catch (error: any) {
          logger.error('Error processing base64 result:', { fileName: file.name, error: error.message });
          reject(error);
        }
      };
      reader.onerror = error => {
        logger.error('FileReader error:', { fileName: file.name });
        reject(error);
      };
    });
  };

  const createProcessingDocument = async (
    candidateId: string,
    file: File,
    fileUrl: string
  ): Promise<string> => {
    try {
      logger.debug('Creating processing document:', { candidateId, fileName: file.name });

      const { data, error } = await supabase
        .from('candidate_documents')
        .insert({
          candidate_id: candidateId,
          document_name: file.name.split('.')[0],
          document_type: 'Processando...',
          file_url: fileUrl,
          arquivo_original: file.name,
          detail: 'Documento enviado para processamento com IA via n8n',
          group_name: 'Importado',
          modality: 'Presencial'
        })
        .select('id')
        .single();

      if (error) {
        logger.error('Database error creating processing document:', { error: error.message, fileName: file.name });
        throw error;
      }
      
      logger.debug('Processing document created successfully:', { documentId: data.id });
      return data.id;
    } catch (error: any) {
      logger.error('Error creating processing document:', { error: error.message, fileName: file.name });
      throw new Error(`Erro ao criar documento: ${error.message}`);
    }
  };

  const updateDocumentWithAIResults = async (
    documentId: string,
    aiResults: AIDocumentProcessingResult
  ): Promise<void> => {
    try {
      logger.debug('Updating document with AI results:', { documentId, documentName: aiResults.document_name });

      const { error } = await supabase
        .from('candidate_documents')
        .update({
          document_name: aiResults.document_name,
          document_type: aiResults.document_type,
          registration_number: aiResults.registration_number,
          issue_date: aiResults.issue_date,
          expiry_date: aiResults.expiry_date,
          issuing_authority: aiResults.issuing_authority,
          carga_horaria_total: aiResults.carga_horaria_total,
          carga_horaria_teorica: aiResults.carga_horaria_teorica,
          carga_horaria_pratica: aiResults.carga_horaria_pratica,
          detail: aiResults.detail,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);

      if (error) {
        logger.error('Database error updating document with AI results:', { error: error.message, documentId });
        throw error;
      }
      
      logger.debug('Document updated with AI results successfully:', { documentId, documentName: aiResults.document_name });
    } catch (error: any) {
      logger.error('Error updating document with AI results:', { error: error.message, documentId });
      throw new Error(`Erro ao atualizar documento: ${error.message}`);
    }
  };

  const sendToN8nWebhookWithMatrix = async (
    files: File[],
    candidateId: string,
    processedResults: AIDocumentProcessingResult[] = []
  ): Promise<{ success: boolean; message?: string; documentId?: string; isDocumentNotBelonging?: boolean }> => {
    try {
      logger.debug('Iniciando envio de webhook com documentos da matriz...');
      
      // 1. Converter arquivos para base64
      logger.debug(`Convertendo ${files.length} arquivo(s) para base64...`);
      const filesWithBase64 = [];
      
      for (const file of files) {
        try {
          logger.debug(`Convertendo arquivo: ${file.name}`);
          const base64 = await fileToBase64(file);
          filesWithBase64.push({
            name: file.name,
            type: file.type,
            size: file.size,
            base64: base64,
            lastModified: file.lastModified
          });
          logger.debug(`Arquivo ${file.name} convertido com sucesso`);
        } catch (error: any) {
          logger.error(`Erro ao converter ${file.name} para base64:`, { error: error.message });
          toast({
            title: "Erro na conversão",
            description: `Erro ao converter ${file.name}: ${error.message}`,
            variant: "destructive",
          });
        }
      }

      logger.debug(`${filesWithBase64.length} arquivo(s) convertido(s) para base64`);
      
      // 2. Obter candidato e seu matrix_id
      const { data: candidate, error: candidateError } = await supabase
        .from('candidates')
        .select('id, matrix_id, name')
        .eq('id', candidateId)
        .single();

      if (candidateError) {
        logger.error('Erro ao buscar candidato:', { error: candidateError.message });
        throw candidateError;
      }

      if (!candidate.matrix_id) {
        logger.warn('Nenhum matrix_id encontrado para o candidato, enviando sem documentos da matriz');
        const result = await sendToN8nWebhookWithData(filesWithBase64, candidateId, processedResults);
        return { success: result.success, message: result.message, documentId: result.documentId, isDocumentNotBelonging: result.isDocumentNotBelonging };
      }

      logger.debug('Matrix ID encontrado:', candidate.matrix_id);

      // 3. Buscar todos os itens da matriz com dados do catálogo de documentos
      const { data: matrixItems, error: matrixError } = await supabase
        .from('matrix_items')
        .select(`
          id,
          document_id,
          obrigatoriedade,
          modalidade,
          carga_horaria,
          regra_validade,
          documents_catalog!inner (
            id,
            name,
            codigo,
            sigla_documento,
            document_category,
            document_type,
            group_name,
            categoria,
            sigla_ingles,
            nome_ingles,
            equivalente
          )
        `)
        .eq('matrix_id', candidate.matrix_id);

      if (matrixError) {
        logger.error('Erro ao buscar itens da matriz:', { error: matrixError.message });
        throw matrixError;
      }

      // 4. Preparar dados dos documentos da matriz
      const matrixDocuments = matrixItems?.map(item => ({
        matrix_item_id: item.id,
        document_id: item.document_id,
        obrigatoriedade: item.obrigatoriedade,
        modalidade: item.modalidade,
        carga_horaria: item.carga_horaria,
        regra_validade: item.regra_validade,
        document: item.documents_catalog
      })) || [];

      logger.debug('Documentos da matriz preparados:', matrixDocuments.length);

      // 5. Preparar dados do webhook com documentos da matriz
      const webhookData = {
        candidate_id: candidateId,
        candidate_name: candidate.name,
        matrix_id: candidate.matrix_id,
        files: filesWithBase64,
        matrix_documents: matrixDocuments,
        processed_results: processedResults,
        timestamp: new Date().toISOString(),
        total_files: filesWithBase64.length,
        total_matrix_documents: matrixDocuments.length,
        webhook_source: 'job-flow-suite',
        status: 'processing_comparison'
      };

      logger.debug('Estrutura de dados do webhook preparada:', {
        total_files: webhookData.total_files,
        total_matrix_documents: webhookData.total_matrix_documents
      });

      // 5. Enviar para webhook do n8n - SECURITY: Use centralized URL and headers
      const webhookUrl = getWebhookUrl();
      
      const sendWithRetry = async (retryCount = 0): Promise<{ success: boolean; message?: string; documentId?: string; isDocumentNotBelonging?: boolean }> => {
        try {
          logger.debug(`Enviando webhook com documentos da matriz (tentativa ${retryCount + 1})`);
          
          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: getWebhookHeaders(),
            body: JSON.stringify(webhookData)
          });

          if (!response.ok) {
            const errorText = await response.text();
            logger.error(`Erro no webhook: ${response.status}`);
            
            if (retryCount < 2) {
              logger.debug(`Tentando novamente (${retryCount + 1})...`);
              await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
              return sendWithRetry(retryCount + 1);
            }
            throw new Error(`Webhook falhou: ${response.status}`);
          }
          
          logger.debug('Webhook enviado com sucesso com documentos da matriz');
          const responseText = await response.text();
          
          // Processar resposta do webhook
          let responseData: any = null;
          try {
            responseData = JSON.parse(responseText);
          } catch {
            // Se não for JSON, tratar como texto
            responseData = { message: responseText };
          }
          
          // Verificar se a resposta indica que o documento não pertence ao candidato
          const responseMessage = responseData?.message || responseText || '';
          const responseLower = responseMessage.toLowerCase();
          const isDocumentNotBelonging = 
            responseLower.includes('documento não pertence ao candidato') ||
            responseLower.includes('documento nao pertence ao candidato') ||
            responseLower.includes('documento não pertence') ||
            responseLower.includes('documento nao pertence') ||
            responseLower.includes('não pertence ao candidato') ||
            responseLower.includes('nao pertence ao candidato');
          
          if (isDocumentNotBelonging) {
            logger.warn('Documento não pertence ao candidato detectado na resposta');
          }
          
          return {
            success: true,
            message: responseMessage,
            documentId: responseData?.document_id,
            isDocumentNotBelonging
          };
        } catch (error: any) {
          logger.error(`Erro na tentativa ${retryCount + 1}:`, { error: error.message });
          if (retryCount < 2) {
            logger.debug('Tentando novamente devido a erro...');
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
            return sendWithRetry(retryCount + 1);
          }
          throw error;
        }
      };

      return sendWithRetry();
    } catch (error: any) {
      logger.error('Erro ao enviar webhook com documentos da matriz:', { error: error.message });
      toast({
        title: "Erro no webhook",
        description: `Erro ao enviar para n8n: ${error.message}`,
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    processDocumentWithAI,
    batchProcessDocuments,
    uploadFileToStorage,
    sendToN8nWebhook,
    sendToN8nWebhookWithMatrix,  // Nova função
    createProcessingDocument,
    updateDocumentWithAIResults,
    isProcessing,
    progress
  };
};
