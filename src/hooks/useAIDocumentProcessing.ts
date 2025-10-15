import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

export const useAIDocumentProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const uploadFileToStorage = async (file: File, candidateId: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${candidateId}/${Date.now()}_${file.name}`;
    
    const { error: uploadError } = await supabase.storage
      .from('candidate-documents')
      .upload(fileName, file);

    if (uploadError) throw uploadError;
    return fileName;
  };

  const processDocumentWithAI = async (
    file: File, 
    candidateId: string,
    options: DocumentProcessingOptions = {}
  ): Promise<AIDocumentProcessingResult> => {
    setIsProcessing(true);
    setProgress(0);

    try {
      // Step 1: Upload file to storage
      setProgress(10);
      const fileUrl = await uploadFileToStorage(file, candidateId);

      // Step 2: Send to n8n webhook immediately
      setProgress(20);
      const webhookData = await sendToN8nWebhook([file], candidateId, []);
      
      // Step 3: Return processing status (not final result)
      setProgress(100);
      setIsProcessing(false);

      // Return a processing status result
      return {
        document_name: file.name.split('.')[0],
        document_type: 'Processando...',
        arquivo_original: file.name,
        file_url: fileUrl,
        confidence_score: 0,
        extracted_fields: {
          status: 'processing',
          webhook_sent: true,
          processing_timestamp: new Date().toISOString()
        }
      };

    } catch (error: any) {
      setIsProcessing(false);
      setProgress(0);
      throw error;
    }
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
    
    for (let i = 0; i < files.length; i++) {
      try {
        const result = await processDocumentWithAI(files[i], candidateId, options);
        results.push(result);
        
        // Atualizar progresso geral
        setProgress(Math.round(((i + 1) / files.length) * 100));
        
      } catch (error: any) {
        console.error(`Error processing file ${files[i].name}:`, error);
        toast({
          title: "Erro no processamento",
          description: `Erro ao processar ${files[i].name}: ${error.message}`,
          variant: "destructive",
        });
      }
    }
    
    return results;
  };

  const sendToN8nWebhook = async (
    files: File[],
    candidateId: string,
    processedResults: AIDocumentProcessingResult[] = []
  ): Promise<void> => {
    try {
      // Converter arquivos para base64
      const filesWithBase64 = await Promise.all(
        files.map(async (file) => {
          const base64 = await fileToBase64(file);
          return {
            name: file.name,
            type: file.type,
            size: file.size,
            base64: base64,
            lastModified: file.lastModified
          };
        })
      );

      // Preparar dados para envio
      const webhookData = {
        candidate_id: candidateId,
        files: filesWithBase64,
        processed_results: processedResults,
        timestamp: new Date().toISOString(),
        total_files: files.length,
        webhook_source: 'job-flow-suite',
        status: 'processing' // Indica que está sendo processado
      };

      // Enviar para o webhook do n8n (sem aguardar resposta)
      const webhookUrl = 'https://n8nwebhook.aulan8ntech.shop/webhook/8da335c4-08d9-4ffb-8ce6-7d4ce4e02bdf';
      
      // Usar fetch sem await para envio assíncrono
      fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData)
      }).then(response => {
        if (!response.ok) {
          console.error(`Webhook failed: ${response.status} ${response.statusText}`);
        } else {
          console.log('Webhook sent successfully');
        }
      }).catch(error => {
        console.error('Error sending to webhook:', error);
      });

      // Não aguardar resposta - apenas confirmar envio
      console.log('Webhook data sent:', webhookData);

    } catch (error: any) {
      console.error('Error preparing webhook data:', error);
      throw new Error(`Erro ao preparar dados para webhook: ${error.message}`);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remover o prefixo "data:image/jpeg;base64," ou similar
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const createProcessingDocument = async (
    candidateId: string,
    file: File,
    fileUrl: string
  ): Promise<string> => {
    try {
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

      if (error) throw error;
      return data.id;
    } catch (error: any) {
      console.error('Error creating processing document:', error);
      throw new Error(`Erro ao criar documento: ${error.message}`);
    }
  };

  const updateDocumentWithAIResults = async (
    documentId: string,
    aiResults: AIDocumentProcessingResult
  ): Promise<void> => {
    try {
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

      if (error) throw error;
    } catch (error: any) {
      console.error('Error updating document with AI results:', error);
      throw new Error(`Erro ao atualizar documento: ${error.message}`);
    }
  };

  return {
    processDocumentWithAI,
    batchProcessDocuments,
    sendToN8nWebhook,
    createProcessingDocument,
    updateDocumentWithAIResults,
    isProcessing,
    progress
  };
};
