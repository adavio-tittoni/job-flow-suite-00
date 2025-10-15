import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface N8nWebhookResponse {
  candidate_id: string;
  document_id: string;
  processed_data: {
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
    confidence_score?: number;
  };
  status: 'completed' | 'error';
  error_message?: string;
}

export const useN8nWebhookListener = () => {
  const [isListening, setIsListening] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Configurar listener para mudanças na tabela candidate_documents
    const channel = supabase
      .channel('candidate_documents_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'candidate_documents',
          filter: 'document_type=eq.Processando...'
        },
        (payload) => {
          console.log('Document updated:', payload);
          handleDocumentUpdate(payload.new);
        }
      )
      .subscribe();

    setIsListening(true);

    return () => {
      supabase.removeChannel(channel);
      setIsListening(false);
    };
  }, []);

  const handleDocumentUpdate = async (document: any) => {
    try {
      // Verificar se o documento foi atualizado com dados reais
      if (document.document_type !== 'Processando...' && document.document_name) {
        toast({
          title: "Documento processado",
          description: `O documento "${document.document_name}" foi processado com sucesso!`,
        });
      }
    } catch (error: any) {
      console.error('Error handling document update:', error);
    }
  };

  const updateDocumentFromN8n = async (response: N8nWebhookResponse) => {
    try {
      const { error } = await supabase
        .from('candidate_documents')
        .update({
          document_name: response.processed_data.document_name,
          document_type: response.processed_data.document_type,
          registration_number: response.processed_data.registration_number,
          issue_date: response.processed_data.issue_date,
          expiry_date: response.processed_data.expiry_date,
          issuing_authority: response.processed_data.issuing_authority,
          carga_horaria_total: response.processed_data.carga_horaria_total,
          carga_horaria_teorica: response.processed_data.carga_horaria_teorica,
          carga_horaria_pratica: response.processed_data.carga_horaria_pratica,
          detail: response.processed_data.detail,
          updated_at: new Date().toISOString()
        })
        .eq('id', response.document_id);

      if (error) throw error;

      toast({
        title: "Documento atualizado",
        description: `O documento foi atualizado com dados processados pela IA.`,
      });

    } catch (error: any) {
      console.error('Error updating document from n8n:', error);
      toast({
        title: "Erro ao atualizar documento",
        description: error.message || "Erro ao atualizar documento com dados da IA.",
        variant: "destructive",
      });
    }
  };

  return {
    isListening,
    updateDocumentFromN8n
  };
};
