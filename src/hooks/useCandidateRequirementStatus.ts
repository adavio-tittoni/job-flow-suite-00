import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
  type: 'mandatory' | 'recommended' | 'client_required';
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

// Utility function to normalize strings for comparison
const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove accents
};

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
        return {
          overall: { total: 0, fulfilled: 0, partial: 0, pending: 0, adherencePercentage: 0 },
          departments: [],
          obligations: [],
          pendingItems: [],
          nonRequiredDocuments: []
        };
      }

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
            document_category
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
      const requirementStatuses: RequirementStatus[] = matrixRequirements
        .filter(req => {
          if (!req.obrigatoriedade) return true;
          
          const normalized = normalizeString(req.obrigatoriedade);
          
          // Include all obligation types except optional/desirable
          const requiredTypes = ['obrigatorio', 'mandatorio', 'requerido', 'requerido cliente', 'recomendado'];
          const isRequired = requiredTypes.some(type => normalized.includes(type));
          
          // Exclude optional/desirable items
          const excludedTypes = ['opcional', 'desejavel'];
          const isExcluded = excludedTypes.some(type => normalized.includes(type));
          
          return isRequired && !isExcluded;
        })
        .map(req => {
          // Try to find matching candidate document
          let matchedDoc = candidateDocuments?.find(doc => 
            doc.catalog_document_id === req.document_id
          );

          // Fallback: match by normalized name
          if (!matchedDoc) {
            const reqDocName = normalizeString(req.document.name);
            matchedDoc = candidateDocuments?.find(doc => {
              const docName = normalizeString(doc.document_name);
              return docName === reqDocName;
            });
          }

          if (!matchedDoc) {
            return {
              requirementId: req.id,
              documentId: req.document_id,
              documentName: req.document.name,
              groupName: req.document.group_name,
              requiredHours: req.carga_horaria,
              actualHours: null,
              status: 'pending' as const,
              observation: 'Documento ausente',
              validityStatus: 'missing' as const,
              existingCandidateDocument: undefined,
              documentCategory: req.document.document_category || undefined,
              modality: req.modalidade || undefined,
              obrigatoriedade: req.obrigatoriedade
            };
          }

          // Check validity - if no expiry_date, consider it N/A (not applicable)
          const expiryDate = parseDate(matchedDoc.expiry_date);
          let validityStatus: 'valid' | 'expired' | 'not_applicable' = 'not_applicable';
          let isValidityOk = true;
          
          if (expiryDate) {
            if (expiryDate < today) {
              validityStatus = 'expired';
              isValidityOk = false;
            } else {
              validityStatus = 'valid';
            }
          }
          
          // If document is expired, mark as pending
          if (!isValidityOk) {
            return {
              requirementId: req.id,
              documentId: req.document_id,
              documentName: req.document.name,
              groupName: req.document.group_name,
              requiredHours: req.carga_horaria,
              actualHours: matchedDoc.carga_horaria_total,
              status: 'pending' as const,
              observation: 'Documento vencido',
              validityStatus,
              existingCandidateDocument: matchedDoc,
              documentCategory: req.document.document_category || undefined,
              modality: req.modalidade || undefined,
              obrigatoriedade: req.obrigatoriedade
            };
          }

          // Check hours if required
          if (req.carga_horaria && req.carga_horaria > 0) {
            const actualHours = matchedDoc.carga_horaria_total || 0;
            if (actualHours < req.carga_horaria) {
              return {
                requirementId: req.id,
                documentId: req.document_id,
                documentName: req.document.name,
                groupName: req.document.group_name,
                requiredHours: req.carga_horaria,
                actualHours: actualHours,
                status: 'partial' as const,
                observation: actualHours <= 0 
                  ? `Sem horas registradas, precisa ${req.carga_horaria}h` 
                  : `Horas insuficientes: tem ${actualHours}h, precisa ${req.carga_horaria}h`,
                validityStatus,
                existingCandidateDocument: matchedDoc,
                documentCategory: req.document.document_category || undefined,
                modality: req.modalidade || undefined,
                obrigatoriedade: req.obrigatoriedade
              };
            }
          }

          // Document is valid and meets requirements
          let observation = 'Requisito atendido';
          if (validityStatus === 'not_applicable') {
            observation += ' (validade N/A)';
          }
          
          return {
            requirementId: req.id,
            documentId: req.document_id,
            documentName: req.document.name,
            groupName: req.document.group_name,
            requiredHours: req.carga_horaria,
            actualHours: matchedDoc.carga_horaria_total,
            status: 'fulfilled' as const,
            observation,
            validityStatus,
            existingCandidateDocument: matchedDoc,
            documentCategory: req.document.document_category || undefined,
            modality: req.modalidade || undefined,
            obrigatoriedade: req.obrigatoriedade
          };
        });

      // Map obligation types
      const mapObligationType = (obrigatoriedade: string): 'mandatory' | 'recommended' | 'client_required' => {
        const normalized = normalizeString(obrigatoriedade);
        
        if (normalized.includes('recomendado') || normalized.includes('desejavel') || normalized.includes('opcional')) {
          return 'recommended';
        }
        if (normalized.includes('cliente') || normalized.includes('client')) {
          return 'client_required';
        }
        return 'mandatory'; // Default for 'mandatorio', 'obrigatorio', etc.
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
        adherencePercentage: stats.total > 0 ? Math.round((stats.fulfilled / stats.total) * 100) : 0
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

      const obligations: ObligationStatus[] = [
        {
          type: 'mandatory',
          label: 'Mandatório',
          total: obligationStats.mandatory?.total || 0,
          fulfilled: obligationStats.mandatory?.fulfilled || 0,
          partial: obligationStats.mandatory?.partial || 0,
          pending: obligationStats.mandatory?.pending || 0,
          adherencePercentage: obligationStats.mandatory?.total > 0 
            ? Math.round((obligationStats.mandatory.fulfilled / obligationStats.mandatory.total) * 100) 
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
            ? Math.round((obligationStats.recommended.fulfilled / obligationStats.recommended.total) * 100) 
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
            ? Math.round((obligationStats.client_required.fulfilled / obligationStats.client_required.total) * 100) 
            : 0
        }
      ];

      // Calculate overall statistics
      const overall: OverallStatus = {
        total: requirementStatuses.length,
        fulfilled: requirementStatuses.filter(r => r.status === 'fulfilled').length,
        partial: requirementStatuses.filter(r => r.status === 'partial').length,
        pending: requirementStatuses.filter(r => r.status === 'pending').length,
        adherencePercentage: 0
      };
      overall.adherencePercentage = overall.total > 0 ? Math.round((overall.fulfilled / overall.total) * 100) : 0;

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
  });
};
