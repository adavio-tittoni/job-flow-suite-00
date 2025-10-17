import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('Setting up N8N webhook listener');
    
    // Configurar listener para mudanças na tabela candidate_documents
    const channel = supabase
      .channel('candidate_documents_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'candidate_documents'
        },
        (payload) => {
          console.log('Document change detected in webhook listener:', payload);
          console.log('Event type:', payload.eventType);
          console.log('Document data:', payload.new);
          
          if (payload.eventType === 'UPDATE' && payload.new) {
            handleDocumentUpdate(payload.new);
          } else if (payload.eventType === 'INSERT' && payload.new) {
            console.log('New document inserted:', payload.new);
            // Invalidar queries para mostrar o novo documento
            queryClient.invalidateQueries({ queryKey: ["candidate-documents"] });
            queryClient.invalidateQueries({ queryKey: ["candidate-requirement-status"] });
          }
        }
      )
      .subscribe((status) => {
        console.log('Webhook listener subscription status:', status);
        setIsListening(status === 'SUBSCRIBED');
      });

    return () => {
      console.log('Cleaning up N8N webhook listener');
      supabase.removeChannel(channel);
      setIsListening(false);
    };
  }, [queryClient]); // Adicionar queryClient de volta para evitar warnings

  const handleDocumentUpdate = async (document: any) => {
    try {
      // Verificar se o documento foi atualizado com dados reais
      if (document.document_type !== 'Processando...' && document.document_name) {
        // Invalidar queries para forçar atualização da UI
        await queryClient.invalidateQueries({ queryKey: ["candidate-documents"] });
        await queryClient.invalidateQueries({ queryKey: ["candidate-requirement-status"] });
        
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

      // Invalidar queries para forçar atualização da UI
      await queryClient.invalidateQueries({ queryKey: ["candidate-documents"] });
      await queryClient.invalidateQueries({ queryKey: ["candidate-requirement-status"] });

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
