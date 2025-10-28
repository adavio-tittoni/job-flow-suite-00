import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DocumentComparison {
  id: string;
  candidate_id: string;
  candidate_document_id: string | null;
  matrix_item_id: string | null;
  status: string; // 'CONFERE' | 'PARCIAL' | 'PENDENTE'
  validity_status: string;
  similarity_score: number | null;
  match_type: string | null;
  validity_date: string | null;
  observations: string | null;
  candidate_document_data: any;
  matrix_item_data: any;
  modalidade_candidato: string | null;
  modalidade_exigida: string | null;
  horas_candidato: number | null;
  horas_exigidas: number | null;
  codigo_documento: string | null;
  sigla_documento: string | null;
  nome_documento: string | null;
  categoria: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentComparisonStats {
  total: number;
  confere: number;
  parcial: number;
  pendente: number;
  conferePercentage: number;
}

export const useDocumentComparisons = (candidateId: string) => {
  return useQuery({
    queryKey: ['document-comparisons', candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_comparisons')
        .select('*')
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate statistics
      const stats: DocumentComparisonStats = {
        total: data?.length || 0,
        confere: data?.filter(d => d.status === 'CONFERE').length || 0,
        parcial: data?.filter(d => d.status === 'PARCIAL').length || 0,
        pendente: data?.filter(d => d.status === 'PENDENTE').length || 0,
        conferePercentage: 0
      };

      if (stats.total > 0) {
        stats.conferePercentage = Math.round((stats.confere / stats.total) * 100);
      }

      return {
        comparisons: data as DocumentComparison[],
        stats
      };
    },
    enabled: !!candidateId,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: true,
  });
};

export const useDocumentComparisonByMatrixItem = (candidateId: string, matrixItemId: string) => {
  return useQuery({
    queryKey: ['document-comparison', candidateId, matrixItemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_comparisons')
        .select('*')
        .eq('candidate_id', candidateId)
        .eq('matrix_item_id', matrixItemId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

      return data as DocumentComparison | null;
    },
    enabled: !!candidateId && !!matrixItemId,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: true,
  });
};

