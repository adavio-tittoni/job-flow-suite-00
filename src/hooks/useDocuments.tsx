import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DocumentCatalog {
  id: string;
  name: string;
  group_name?: string;
  document_category?: string;
  document_type?: string;
  issuing_authority?: string;
  modality?: string;
  sigla_documento?: string;
  detail?: string;
  created_at: string;
  
  // New unified fields (may not exist in all records)
  categoria?: string;
  codigo?: string;
  sigla?: string;
  sigla_ingles?: string;
  nome_curso?: string;
  descricao_curso?: string;
  carga_horaria?: string;
  validade?: string;
  detalhes?: string;
  nome_ingles?: string;
  reciclagem?: string;
  equivalente?: string;
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
      // Remover campos undefined para evitar problemas no banco
      const cleanDocument = Object.fromEntries(
        Object.entries(document).filter(([_, value]) => value !== undefined)
      ) as Omit<DocumentCatalog, "id" | "created_at">;

      const { error } = await supabase
        .from("documents_catalog")
        .insert(cleanDocument);

      if (error) {
        console.error("Erro ao criar documento:", error);
        throw error;
      }
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
      console.log("Atualizando documento ID:", id);
      console.log("Dados recebidos para atualização:", document);
      
      // Remover campos undefined para evitar problemas no banco
      // Mas manter campos que são strings vazias para permitir limpar campos
      const cleanDocument = Object.fromEntries(
        Object.entries(document).filter(([_, value]) => value !== undefined)
      ) as Partial<DocumentCatalog>;

      console.log("Dados limpos para atualização:", cleanDocument);

      const { data, error } = await supabase
        .from("documents_catalog")
        .update(cleanDocument)
        .eq("id", id)
        .select();

      if (error) {
        console.error("Erro ao atualizar documento:", error);
        console.error("Detalhes do erro:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      console.log("Documento atualizado com sucesso:", data);
      return data;
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
      console.log("Deletando documento ID:", id);
      
      const { error } = await supabase
        .from("documents_catalog")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Erro ao deletar documento:", error);
        console.error("Detalhes do erro:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      console.log("Documento deletado com sucesso");
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
