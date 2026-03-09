import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { normalizeString } from "@/utils/documentComparison";

interface MatrixRequirement {
  id: string;
  document_id: string;
  obrigatoriedade: string;
  modalidade: string;
  carga_horaria: number | null;
  document: {
    id: string;
    name: string;
    group_name: string;
  };
}

interface CandidateDocument {
  id: string;
  document_name: string;
  group_name: string | null;
  catalog_document_id: string | null;
  expiry_date: string | null;
  carga_horaria_total: number | null;
  detail: string | null;
}

export interface RequirementStatus {
  requirementId: string;
  documentId: string;
  documentName: string;
  groupName: string;
  requiredHours: number | null;
  actualHours: number | null;
  status: 'fulfilled' | 'partial' | 'pending';
  observation: string;
  validityStatus: 'valid' | 'expired' | 'not_applicable' | 'missing';
  existingCandidateDocument?: CandidateDocument;
  documentCategory?: string;
  modality?: string;
  obrigatoriedade?: string;
}

export interface DepartmentStatus {
  name: string;
  total: number;
  fulfilled: number;
  partial: number;
  pending: number;
  adherencePercentage: number;
}

export interface ObligationStatus {
  type: 'mandatory' | 'recommended' | 'optional' | 'client_required';
  label: string;
  total: number;
  fulfilled: number;
  partial: number;
  pending: number;
  adherencePercentage: number;
}

export interface OverallStatus {
  total: number;
  fulfilled: number;
  partial: number;
  pending: number;
  adherencePercentage: number;
}

export interface NonRequiredDocument {
  id: string;
  document_name: string;
  group_name: string | null;
}

export interface RequirementStatusResult {
  overall: OverallStatus;
  departments: DepartmentStatus[];
  obligations: ObligationStatus[];
  pendingItems: RequirementStatus[];
  nonRequiredDocuments: NonRequiredDocument[];
}


// Utility function to safely parse dates
const parseDate = (dateString: string | null | undefined): Date | null => {
  if (!dateString || dateString.trim() === '' || dateString === 'null' || dateString === 'undefined') {
    return null;
  }
  
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
};

export const useCandidateRequirementStatus = (candidateId: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Set up real-time updates for candidate documents
  useEffect(() => {
    if (!candidateId) return;

    const channel = supabase
      .channel('candidate-documents-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'candidate_documents',
          filter: `candidate_id=eq.${candidateId}`
        },
        () => {
          // Invalidate and refetch when candidate documents change
          queryClient.invalidateQueries({ 
            queryKey: ['candidate-requirement-status', candidateId] 
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [candidateId, queryClient]);

  return useQuery({
    queryKey: ['candidate-requirement-status', candidateId],
    queryFn: async () => {
      console.log('🔄 useCandidateRequirementStatus: Starting fresh calculation for candidate:', candidateId);
      console.log('🔄 Refreshing requirement status for candidate:', candidateId);
      // Fetch candidate to get matrix_id
      let candidate: { id: string; matrix_id: string | null } | null = null;
      let candidateError: any = null;
      const candidateRes = await supabase
        .from('candidates')
        .select('id, matrix_id')
        .eq('id', candidateId)
        .single();

      candidate = candidateRes.data as any;
      candidateError = candidateRes.error;

      if (!candidate?.matrix_id) {
        console.log('❌ No matrix_id found for candidate:', candidateId);
        return {
          overall: { total: 0, fulfilled: 0, partial: 0, pending: 0, adherencePercentage: 0 },
          departments: [],
          obligations: [],
          pendingItems: [],
          nonRequiredDocuments: []
        };
      }

      console.log('✅ Matrix ID found:', candidate.matrix_id);

      // Fetch matrix requirements
      const { data: matrixItems, error: matrixError } = await supabase
        .from('matrix_items')
        .select(`
          id,
          document_id,
          obrigatoriedade,
          modalidade,
          carga_horaria,
          documents_catalog!matrix_items_document_id_fkey (
            id,
            name,
            group_name,
            document_category,
            codigo,
            sigla_documento
          )
        `)
        .eq('matrix_id', candidate.matrix_id);

      if (matrixError) throw matrixError;

      const matrixRequirements = matrixItems?.map(item => ({
        id: item.id,
        document_id: item.document_id,
        obrigatoriedade: item.obrigatoriedade,
        modalidade: item.modalidade,
        carga_horaria: item.carga_horaria,
        document: item.documents_catalog
      })) || [];

      // Fetch candidate documents
      let candidateDocuments: any[] = [];
      const docsRes = await supabase
        .from('candidate_documents')
        .select('*')
        .eq('candidate_id', candidateId);

      candidateDocuments = docsRes.data || [];

      const today = new Date();

      // Process each matrix requirement
      console.log('📋 Matrix requirements:', matrixRequirements.map(r => ({ 
        document: r.document.name, 
        obrigatoriedade: r.obrigatoriedade 
      })));
      
      const filteredRequirements = matrixRequirements.filter(req => {
        if (!req.obrigatoriedade) return true;
        
        const normalized = normalizeString(req.obrigatoriedade);
        console.log(`🔍 Processing requirement: "${req.document.name}" with obrigatoriedade: "${req.obrigatoriedade}" (normalized: "${normalized}")`);
        
        // Include all obligation types - now we want to show all types
        return true; // Show all obligation types in dashboard
      });

      // Fetch document_comparisons to use as single source of truth
      const { data: documentComparisonsData } = await supabase
        .from('document_comparisons')
        .select('*')
        .eq('candidate_id', candidateId);

      const documentComparisons = documentComparisonsData || [];

      // USAR APENAS a tabela document_comparisons - SEM cálculos adicionais
      const requirementStatuses: RequirementStatus[] = filteredRequirements.map(req => {
        // Procurar comparação na tabela document_comparisons
        const comparison = documentComparisons.find(
          comp => comp.matrix_item_id === req.id
        );

        // Se existe comparação na tabela, usar SEUS dados
        if (comparison) {
          // Converter status da tabela para o formato do hook
          let status: 'fulfilled' | 'partial' | 'pending';
          if (comparison.status === 'CONFERE') {
            status = 'fulfilled';
          } else if (comparison.status === 'PARCIAL') {
            status = 'partial';
          } else {
            status = 'pending';
          }

          // Buscar documento do candidato se houver ID vinculado
          const matchedDoc = candidateDocuments?.find(
            doc => doc.id === comparison.candidate_document_id
          );

          return {
            requirementId: req.id,
            documentId: req.document_id,
            documentName: comparison.nome_documento || req.document.name,
            groupName: comparison.categoria || req.document.group_name,
            requiredHours: comparison.horas_exigidas || req.carga_horaria,
            actualHours: comparison.horas_candidato || matchedDoc?.carga_horaria_total || null,
            status,
            observation: comparison.observations || '-',
            validityStatus: comparison.validity_status === 'valid' ? 'valid' : 
                           comparison.validity_status === 'expired' ? 'expired' : 
                           comparison.validity_status === 'missing' ? 'missing' : 'not_applicable',
            existingCandidateDocument: matchedDoc,
            documentCategory: comparison.categoria || req.document.document_category || undefined,
            modality: comparison.modalidade_candidato || req.modalidade || undefined,
            obrigatoriedade: req.obrigatoriedade
          };
        }

        // Se NÃO existe comparação na tabela, marcar como pendente
        return {
          requirementId: req.id,
          documentId: req.document_id,
          documentName: req.document.name,
          groupName: req.document.group_name,
          requiredHours: req.carga_horaria,
          actualHours: null,
          status: 'pending' as const,
          observation: 'Documento ainda não comparado',
          validityStatus: 'not_applicable',
          existingCandidateDocument: undefined,
          documentCategory: req.document.document_category || undefined,
          modality: req.modalidade || undefined,
          obrigatoriedade: req.obrigatoriedade
        };
      });

      // Map obligation types based on exact dropdown values
      const mapObligationType = (obrigatoriedade: string): 'mandatory' | 'recommended' | 'optional' | 'client_required' => {
        const normalized = normalizeString(obrigatoriedade);
        
        // Map exact dropdown values
        if (normalized === 'obrigatorio') {
          return 'mandatory';
        }
        if (normalized === 'recomendado') {
          return 'recommended';
        }
        if (normalized === 'opcional') {
          return 'optional';
        }
        if (normalized === 'requerido pelo cliente') {
          return 'client_required';
        }
        
        // Fallback for legacy values
        if (normalized.includes('recomendado') || normalized.includes('desejavel')) {
          return 'recommended';
        }
        if (normalized.includes('opcional')) {
          return 'optional';
        }
        if (normalized.includes('cliente') || normalized.includes('client')) {
          return 'client_required';
        }
        
        return 'mandatory'; // Default for 'obrigatorio', etc.
      };

      // Calculate department statistics
      const departmentStats = requirementStatuses.reduce((acc, req) => {
        const deptName = req.groupName || 'Outros';
        if (!acc[deptName]) {
          acc[deptName] = { total: 0, fulfilled: 0, partial: 0, pending: 0 };
        }
        
        acc[deptName].total++;
        acc[deptName][req.status]++;
        
        return acc;
      }, {} as Record<string, { total: number; fulfilled: number; partial: number; pending: 0 }>);

      const departments: DepartmentStatus[] = Object.entries(departmentStats).map(([name, stats]) => ({
        name,
        total: stats.total,
        fulfilled: stats.fulfilled,
        partial: stats.partial,
        pending: stats.pending,
        adherencePercentage: stats.total > 0 ? Math.round(((stats.fulfilled) + (stats.partial * 0.5)) / stats.total * 100) : 0
      }));

      // Calculate obligation statistics
      const obligationRequirements = matrixRequirements.map(req => ({
        ...req,
        obligationType: mapObligationType(req.obrigatoriedade)
      }));

      const obligationStats = requirementStatuses.reduce((acc, req) => {
        const matrixReq = obligationRequirements.find(mr => mr.id === req.requirementId);
        const obligationType = matrixReq ? matrixReq.obligationType : 'mandatory';
        
        if (!acc[obligationType]) {
          acc[obligationType] = { total: 0, fulfilled: 0, partial: 0, pending: 0 };
        }
        
        acc[obligationType].total++;
        acc[obligationType][req.status]++;
        
        return acc;
      }, {} as Record<string, { total: number; fulfilled: number; partial: number; pending: number }>);

      console.log('📊 Obligation stats:', obligationStats);

      const obligations: ObligationStatus[] = [
        {
          type: 'mandatory',
          label: 'Mandatório',
          total: obligationStats.mandatory?.total || 0,
          fulfilled: obligationStats.mandatory?.fulfilled || 0,
          partial: obligationStats.mandatory?.partial || 0,
          pending: obligationStats.mandatory?.pending || 0,
          adherencePercentage: obligationStats.mandatory?.total > 0 
            ? Math.round(((obligationStats.mandatory.fulfilled) + (obligationStats.mandatory.partial * 0.5)) / obligationStats.mandatory.total * 100) 
            : 0
        },
        {
          type: 'recommended',
          label: 'Recomendado',
          total: obligationStats.recommended?.total || 0,
          fulfilled: obligationStats.recommended?.fulfilled || 0,
          partial: obligationStats.recommended?.partial || 0,
          pending: obligationStats.recommended?.pending || 0,
          adherencePercentage: obligationStats.recommended?.total > 0 
            ? Math.round(((obligationStats.recommended.fulfilled) + (obligationStats.recommended.partial * 0.5)) / obligationStats.recommended.total * 100) 
            : 0
        },
        {
          type: 'optional',
          label: 'Opcional',
          total: obligationStats.optional?.total || 0,
          fulfilled: obligationStats.optional?.fulfilled || 0,
          partial: obligationStats.optional?.partial || 0,
          pending: obligationStats.optional?.pending || 0,
          adherencePercentage: obligationStats.optional?.total > 0 
            ? Math.round(((obligationStats.optional.fulfilled) + (obligationStats.optional.partial * 0.5)) / obligationStats.optional.total * 100) 
            : 0
        },
        {
          type: 'client_required',
          label: 'Requerido pelo Cliente',
          total: obligationStats.client_required?.total || 0,
          fulfilled: obligationStats.client_required?.fulfilled || 0,
          partial: obligationStats.client_required?.partial || 0,
          pending: obligationStats.client_required?.pending || 0,
          adherencePercentage: obligationStats.client_required?.total > 0 
            ? Math.round(((obligationStats.client_required.fulfilled) + (obligationStats.client_required.partial * 0.5)) / obligationStats.client_required.total * 100) 
            : 0
        }
      ];

      console.log('📈 Final obligations:', obligations);

      // Calculate overall statistics (parcial conta 50% para aderência)
      const overall: OverallStatus = {
        total: requirementStatuses.length,
        fulfilled: requirementStatuses.filter(r => r.status === 'fulfilled').length,
        partial: requirementStatuses.filter(r => r.status === 'partial').length,
        pending: requirementStatuses.filter(r => r.status === 'pending').length,
        adherencePercentage: 0
      };
      // Parcial conta 50% para aderência, fulfilled conta 100%
      overall.adherencePercentage = overall.total > 0 
        ? Math.round(((overall.fulfilled) + (overall.partial * 0.5)) / overall.total * 100)
        : 0;

      console.log('📊 useCandidateRequirementStatus - Overall calculation:', {
        candidateId,
        total: overall.total,
        fulfilled: overall.fulfilled,
        partial: overall.partial,
        pending: overall.pending,
        adherencePercentage: overall.adherencePercentage,
        requirementStatuses: requirementStatuses.map(r => ({
          documentName: r.documentName,
          status: r.status,
          observation: r.observation
        }))
      });

      // Get pending items (pending + partial)
      const pendingItems = requirementStatuses.filter(r => r.status === 'pending' || r.status === 'partial');

      // Find documents not required by matrix (N/A docs)
      const usedCandidateDocIds = new Set(
        requirementStatuses
          .map(req => req.existingCandidateDocument?.id)
          .filter(Boolean)
      );

      const nonRequiredDocuments: NonRequiredDocument[] = candidateDocuments
        ?.filter(doc => !usedCandidateDocIds.has(doc.id))
        ?.map(doc => ({
          id: doc.id,
          document_name: doc.document_name,
          group_name: doc.group_name
        })) || [];

      return {
        overall,
        departments,
        obligations,
        pendingItems,
        nonRequiredDocuments
      };
    },
    enabled: !!candidateId,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: true,
    cacheTime: 0
  });
};
