import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export interface Candidate {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  name: string;
  email?: string;
  phones?: string;
  cpf?: string;
  role_title?: string;
  linkedin_url?: string;
  working_status?: string;
  blacklisted: boolean;
  photo_url?: string;
  address_type?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_district?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  cs_responsible_id?: string;
  notes?: string;
  matrix_id?: string;
  vacancy_title?: string; // Nome da vaga vinculada ao candidato
}

export interface CandidateDocument {
  id: string;
  candidate_id: string;
  created_at: string;
  updated_at: string;
  group_name?: string;
  document_name: string;
  document_type?: string;
  document_category?: string; // From documents_catalog
  sigla_documento?: string; // From documents_catalog
  modality?: string;
  registration_number?: string;
  issue_date?: string;
  expiry_date?: string;
  issuing_authority?: string;
  carga_horaria_total?: number;
  carga_horaria_teorica?: number;
  carga_horaria_pratica?: number;
  link_validacao?: string;
  file_url?: string;
  catalog_document_id?: string;
  detail?: string;
  arquivo_original?: string;
  codigo?: string; // Custom document code for matrix comparison
  tipo_de_codigo?: string; // Type of code (e.g., A-VI/3, NR-33)
  declaracao?: boolean; // Flag indicating if document is a declaration
}

export interface CandidateHistory {
  id: string;
  candidate_id: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  event_date: string;
  description?: string;
  vacancy_id?: string;
  approved?: boolean;
}

/** Converte file_url (URL completa ou caminho) no path relativo ao bucket para Storage.remove() */
function getStoragePathFromFileUrl(fileUrl: string | null | undefined): string | null {
  if (!fileUrl) return null;
  if (!fileUrl.includes("http://") && !fileUrl.includes("https://") && !fileUrl.includes("supabase.co")) {
    return fileUrl;
  }
  const urlWithoutQuery = fileUrl.split("?")[0];
  try {
    const url = new URL(urlWithoutQuery);
    const pathParts = url.pathname.split("/").filter((part) => part !== "");
    const bucketIndex = pathParts.findIndex((part) => part === "candidate-documents");
    if (bucketIndex !== -1 && bucketIndex + 1 < pathParts.length) {
      return pathParts.slice(bucketIndex + 1).join("/");
    }
    const objectIndex = pathParts.findIndex((part) => part === "object");
    if (objectIndex !== -1) {
      const publicOrSignIndex = pathParts.findIndex((part, idx) => idx > objectIndex && (part === "public" || part === "sign"));
      if (publicOrSignIndex !== -1) {
        const bucketIndexAfter = pathParts.findIndex((part, idx) => idx > publicOrSignIndex && part === "candidate-documents");
        if (bucketIndexAfter !== -1 && bucketIndexAfter + 1 < pathParts.length) {
          return pathParts.slice(bucketIndexAfter + 1).join("/");
        }
      }
    }
  } catch {
    // ignore
  }
  const match = urlWithoutQuery.match(/candidate-documents\/(.+)$/);
  return match?.[1] ?? fileUrl;
}

export const useCandidates = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ["candidates"],
    queryFn: async () => {
      // Buscar candidatos
      const { data: candidatesData, error: candidatesError } = await supabase
        .from("candidates")
        .select("*")
        .order("created_at", { ascending: false });

      if (candidatesError) throw candidatesError;

      // Buscar vagas vinculadas aos candidatos
      const candidateIds = candidatesData?.map(c => c.id) || [];
      
      if (candidateIds.length > 0) {
        const { data: vacancyCandidates, error: vcError } = await supabase
          .from("vacancy_candidates")
          .select(`
            candidate_id,
            vacancies (
              id,
              title
            )
          `)
          .in("candidate_id", candidateIds);

        if (vcError) {
          console.warn("Erro ao buscar vagas vinculadas:", vcError);
        } else {
          // Criar um mapa de candidate_id -> vacancy_title
          const vacancyMap = new Map<string, string>();
          vacancyCandidates?.forEach((vc: any) => {
            // O Supabase pode retornar como array ou objeto único
            const vacancies = Array.isArray(vc.vacancies) ? vc.vacancies : (vc.vacancies ? [vc.vacancies] : []);
            
            vacancies.forEach((vacancy: any) => {
              if (vacancy && vacancy.title) {
                // Se o candidato já tem uma vaga, concatenar com vírgula
                const existing = vacancyMap.get(vc.candidate_id);
                if (existing) {
                  vacancyMap.set(vc.candidate_id, `${existing}, ${vacancy.title}`);
                } else {
                  vacancyMap.set(vc.candidate_id, vacancy.title);
                }
              }
            });
          });

          // Adicionar vacancy_title aos candidatos
          return candidatesData?.map(candidate => ({
            ...candidate,
            vacancy_title: vacancyMap.get(candidate.id) || undefined
          })) as Candidate[];
        }
      }

      return candidatesData as Candidate[];
    },
  });

  const createCandidate = useMutation({
    mutationFn: async (candidate: Omit<Candidate, "id" | "created_at" | "updated_at" | "created_by">) => {
      const { data, error } = await supabase
        .from("candidates")
        .insert(candidate)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      toast({
        title: "Candidato criado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar candidato",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCandidate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Candidate> & { id: string }) => {
      const { data, error } = await supabase
        .from("candidates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["candidate", data.id] });
      toast({
        title: "Candidato atualizado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar candidato",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCandidate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("candidates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      toast({
        title: "Candidato excluído com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir candidato",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    candidates,
    isLoading,
    createCandidate,
    updateCandidate,
    deleteCandidate,
  };
};

export const useCandidateDocuments = (candidateId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: documents = [], isLoading, refetch } = useQuery({
    queryKey: ["candidate-documents", candidateId],
    queryFn: async () => {
      console.log('Fetching documents for candidate:', candidateId);
      const { data, error } = await supabase
        .from("candidate_documents")
        .select(`
          *,
          documents_catalog!left(
            document_category,
            categoria,
            group_name,
            sigla_documento,
            name
          )
        `)
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Helper function to normalize file_url to relative path
      const normalizeFileUrl = (fileUrl: string | null | undefined): string | null => {
        if (!fileUrl) return null;
        
        // If it's already a relative path, return as is
        if (!fileUrl.includes('http://') && !fileUrl.includes('https://') && !fileUrl.includes('supabase.co')) {
          return fileUrl;
        }
        
        // Remove query parameters before parsing
        const urlWithoutQuery = fileUrl.split('?')[0];
        
        try {
          const url = new URL(urlWithoutQuery);
          const pathParts = url.pathname.split('/').filter(part => part !== '');
          
          // Find 'candidate-documents' in the path
          const bucketIndex = pathParts.findIndex(part => part === 'candidate-documents');
          if (bucketIndex !== -1 && bucketIndex + 1 < pathParts.length) {
            return pathParts.slice(bucketIndex + 1).join('/');
          }
          
          // Alternative: /object/public/candidate-documents/... or /object/sign/candidate-documents/...
          const objectIndex = pathParts.findIndex(part => part === 'object');
          if (objectIndex !== -1) {
            const publicOrSignIndex = pathParts.findIndex((part, idx) => 
              idx > objectIndex && (part === 'public' || part === 'sign')
            );
            if (publicOrSignIndex !== -1) {
              const bucketIndexAfter = pathParts.findIndex((part, idx) => 
                idx > publicOrSignIndex && part === 'candidate-documents'
              );
              if (bucketIndexAfter !== -1 && bucketIndexAfter + 1 < pathParts.length) {
                return pathParts.slice(bucketIndexAfter + 1).join('/');
              }
            }
          }
        } catch (e) {
          console.warn('Failed to normalize file_url:', fileUrl, e);
        }
        
        // Fallback: try regex
        const match = urlWithoutQuery.match(/candidate-documents\/(.+)$/);
        if (match && match[1]) {
          return match[1];
        }
        
        return fileUrl; // Return original if can't normalize
      };
      
      // Transform the data to flatten the categoria from catalog, but keep original sigla_documento, codigo and tipo_de_codigo
      const transformedData = data?.map(doc => {
        console.log('Processing document:', doc.document_name, 'catalog:', doc.documents_catalog);
        
        // Normalize file_url to ensure it's always a relative path
        const normalizedFileUrl = normalizeFileUrl(doc.file_url);
        if (normalizedFileUrl !== doc.file_url) {
          console.log('📝 Normalizando file_url do documento:', {
            id: doc.id,
            original: doc.file_url,
            normalized: normalizedFileUrl
          });
        }
        
        return {
          ...doc,
          file_url: normalizedFileUrl, // Use normalized path
          document_category: doc.documents_catalog?.categoria || doc.document_category || null,
          // Manter sigla_documento, codigo e tipo_de_codigo originais do documento do candidato
          sigla_documento: doc.sigla_documento || doc.documents_catalog?.sigla_documento || null,
          codigo: doc.codigo || null,
          tipo_de_codigo: doc.tipo_de_codigo || null,
          documents_catalog: undefined // Remove the nested object
        };
      }) || [];
      
      console.log('Documents fetched:', transformedData.length);
      return transformedData as CandidateDocument[];
    },
    enabled: !!candidateId,
    // Optimized cache settings - data stays fresh for 1 minute
    staleTime: 1000 * 60 * 1,
    // Refetch on mount only if data is stale
    refetchOnMount: "always",
    // Don't refetch on window focus for better UX
    refetchOnWindowFocus: false,
  });

  const createDocument = useMutation({
    mutationFn: async (document: Omit<CandidateDocument, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("candidate_documents")
        .insert([document])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      // Invalidate and refetch queries immediately
      await queryClient.invalidateQueries({ queryKey: ["candidate-documents", candidateId] });
      await queryClient.invalidateQueries({ queryKey: ["candidate-requirement-status", candidateId] });
      // Force refetch to ensure UI updates
      await queryClient.refetchQueries({ queryKey: ["candidate-documents", candidateId] });
      toast({
        title: "Documento adicionado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar documento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateDocument = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CandidateDocument> & { id: string }) => {
      const { data, error } = await supabase
        .from("candidate_documents")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      // Invalidate and refetch queries immediately
      await queryClient.invalidateQueries({ queryKey: ["candidate-documents", candidateId] });
      await queryClient.invalidateQueries({ queryKey: ["candidate-requirement-status", candidateId] });
      // Force refetch to ensure UI updates
      await queryClient.refetchQueries({ queryKey: ["candidate-documents", candidateId] });
      toast({
        title: "Documento atualizado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar documento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (id: string) => {
      // Remover vínculos em document_comparisons antes de deletar o documento
      await supabase
        .from("document_comparisons")
        .delete()
        .eq("candidate_document_id", id);

      // Primeiro, buscar o documento para obter o file_url
      const { data: document, error: fetchError } = await supabase
        .from("candidate_documents")
        .select("file_url")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      // Deletar o arquivo do bucket candidate-documents no Supabase Storage
      if (document?.file_url) {
        const storagePath = getStoragePathFromFileUrl(document.file_url);
        if (storagePath) {
          const { error: storageError } = await supabase.storage
            .from("candidate-documents")
            .remove([storagePath]);
          if (storageError) {
            console.warn("[useCandidateDocuments] Erro ao deletar arquivo do Storage:", storageError);
          }
        }
      }

      // Deletar o registro do banco de dados
      const { error } = await supabase
        .from("candidate_documents")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidate-documents", candidateId] });
      queryClient.invalidateQueries({ queryKey: ["candidate-requirement-status", candidateId] });
      toast({
        title: "Documento excluído com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir documento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    documents,
    isLoading,
    refetch,
    createDocument,
    updateDocument,
    deleteDocument,
  };
};

export type DeleteCandidateDocumentVariables = {
  candidateId: string;
  documentId: string;
  vacancyId?: string;
};

export const useDeleteCandidateDocument = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ candidateId, documentId }: DeleteCandidateDocumentVariables) => {
      console.log("[useDeleteCandidateDocument] Iniciando exclusão:", { candidateId, documentId });

      // 1. Buscar file_url antes de deletar (para remover do storage depois)
      const { data: document, error: fetchErr } = await supabase
        .from("candidate_documents")
        .select("file_url")
        .eq("id", documentId)
        .maybeSingle();

      if (fetchErr) {
        console.error("[useDeleteCandidateDocument] Erro ao buscar documento:", fetchErr);
        throw fetchErr;
      }
      if (!document) {
        console.warn("[useDeleteCandidateDocument] Documento não encontrado (id:", documentId, "). Removendo apenas document_comparisons.");
      }

      // 2. Remover vínculos em document_comparisons (permite deletar o documento depois)
      const { error: comparisonsError } = await supabase
        .from("document_comparisons")
        .delete()
        .eq("candidate_document_id", documentId);

      if (comparisonsError) {
        console.error("[useDeleteCandidateDocument] Erro ao deletar document_comparisons:", comparisonsError);
        throw comparisonsError;
      }
      console.log("[useDeleteCandidateDocument] document_comparisons removidos para candidate_document_id:", documentId);

      // 3. Deletar o registro na tabela candidate_documents (obrigatório)
      const { error: deleteError } = await supabase
        .from("candidate_documents")
        .delete()
        .eq("id", documentId);

      if (deleteError) {
        console.error("[useDeleteCandidateDocument] Erro ao deletar candidate_documents:", deleteError);
        throw new Error(`Falha ao excluir documento no banco: ${deleteError.message}`);
      }
      console.log("[useDeleteCandidateDocument] Registro candidate_documents excluído:", documentId);

      // 4. Remover arquivo do bucket candidate-documents no Supabase Storage (S3)
      if (document?.file_url) {
        const storagePath = getStoragePathFromFileUrl(document.file_url);
        if (storagePath) {
          const { error: storageError } = await supabase.storage
            .from("candidate-documents")
            .remove([storagePath]);
          if (storageError) {
            console.error("[useDeleteCandidateDocument] Erro ao deletar arquivo do Storage:", storageError);
          } else {
            console.log("[useDeleteCandidateDocument] Arquivo removido do Storage:", storagePath);
          }
        } else {
          console.warn("[useDeleteCandidateDocument] file_url não pôde ser convertido em path do Storage:", document.file_url);
        }
      }

      return { candidateId, documentId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["candidate-documents", variables.candidateId] });
      queryClient.invalidateQueries({ queryKey: ["candidate-requirement-status", variables.candidateId] });
      queryClient.invalidateQueries({ queryKey: ["document-comparisons", variables.candidateId] });
      if (variables.vacancyId) {
        queryClient.invalidateQueries({ queryKey: ["vacancy-candidate-comparison", variables.vacancyId] });
      }
      toast({
        title: "Documento excluído com sucesso",
      });
    },
    onError: (error) => {
      console.error("[useDeleteCandidateDocument] Mutation falhou:", error);
      toast({
        title: "Erro ao excluir documento",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useCandidateHistory = (candidateId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: history = [], isLoading } = useQuery({
    queryKey: ["candidate-history", candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidate_history")
        .select("*")
        .eq("candidate_id", candidateId)
        .order("event_date", { ascending: false });

      if (error) throw error;
      return data as CandidateHistory[];
    },
    enabled: !!candidateId,
  });

  const createHistoryEntry = useMutation({
    mutationFn: async (entry: Omit<CandidateHistory, "id" | "created_at" | "updated_at" | "created_by">) => {
      const { data, error } = await supabase
        .from("candidate_history")
        .insert(entry)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidate-history", candidateId] });
      toast({
        title: "Histórico adicionado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar histórico",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateHistoryEntry = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CandidateHistory> & { id: string }) => {
      const { data, error } = await supabase
        .from("candidate_history")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidate-history", candidateId] });
      toast({
        title: "Histórico atualizado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar histórico",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteHistoryEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("candidate_history")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidate-history", candidateId] });
      toast({
        title: "Histórico excluído com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir histórico",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    history,
    isLoading,
    createHistoryEntry,
    updateHistoryEntry,
    deleteHistoryEntry,
  };
};