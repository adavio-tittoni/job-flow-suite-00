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
  sigla_documento?: string;
  codigo?: string; // Custom document code for matrix comparison
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

export const useCandidates = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ["candidates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Candidate[];
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
      
      // Transform the data to flatten the categoria from catalog, but keep original sigla_documento and codigo
      const transformedData = data?.map(doc => {
        console.log('Processing document:', doc.document_name, 'catalog:', doc.documents_catalog);
        return {
          ...doc,
          document_category: doc.documents_catalog?.categoria || doc.document_category || null,
          // Manter sigla_documento e codigo originais do documento do candidato
          sigla_documento: doc.sigla_documento || doc.documents_catalog?.sigla_documento || null,
          codigo: doc.codigo || null,
          documents_catalog: undefined // Remove the nested object
        };
      }) || [];
      
      console.log('Documents fetched:', transformedData.length);
      return transformedData as CandidateDocument[];
    },
    enabled: !!candidateId,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0, // Sempre considerar os dados como stale
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
      // Primeiro, buscar o documento para obter o file_url
      const { data: document, error: fetchError } = await supabase
        .from("candidate_documents")
        .select("file_url")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      // Deletar o arquivo do storage se existir
      if (document?.file_url) {
        const { error: storageError } = await supabase.storage
          .from('candidate-documents')
          .remove([document.file_url]);

        if (storageError) {
          console.warn('Erro ao deletar arquivo do storage:', storageError);
          // Não falhar a operação se o arquivo não existir no storage
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