import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DocumentCatalog {
  id: string;
  categoria: string;
  document_category?: string;
  document_type?: string;
  name: string;
  detail?: string;
  created_at: string;
  sigla_documento?: string;
}

export function useDocumentsCatalog() {
  return useQuery({
    queryKey: ["documents-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents_catalog")
        .select("*")
        .order("categoria", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      return data as DocumentCatalog[];
    },
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (document: Omit<DocumentCatalog, "id" | "created_at">) => {
      const { error } = await supabase
        .from("documents_catalog")
        .insert(document);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents-catalog"] });
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...document }: Partial<DocumentCatalog> & { id: string }) => {
      const { error } = await supabase
        .from("documents_catalog")
        .update(document)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents-catalog"] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("documents_catalog")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents-catalog"] });
    },
  });
}

export function useCheckDuplicateDocument() {
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("documents_catalog")
        .select("id, name")
        .ilike("name", name)
        .limit(1);

      if (error) throw error;
      return data && data.length > 0;
    },
  });
}
