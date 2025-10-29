import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Matrix {
  id: string;
  cargo: string;
  empresa: string;
  solicitado_por: string;
  versao_matriz: string;
  user_email: string;
  created_by?: string;
  created_at: string;
}

export interface MatrixItem {
  id: string;
  matrix_id: string;
  document_id: string;
  obrigatoriedade: string;
  carga_horaria?: number;
  modalidade: string;
  regra_validade: string;
  created_at: string;
  document: {
    id: string;
    name: string;
    categoria: string;
    document_type?: string;
  };
}

export interface MatrixWithItems extends Matrix {
  matrix_items: MatrixItem[];
  documents_count: number;
}

export function useMatrices() {
  return useQuery({
    queryKey: ["matrices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matrices")
        .select(`
          *,
          matrix_items(
            id,
            document_id,
            obrigatoriedade,
            carga_horaria,
            modalidade,
            regra_validade,
            document:documents_catalog(id, name, categoria, document_type)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Transformar os dados para incluir contagem de documentos
      const matricesWithCount = data.map(matrix => ({
        ...matrix,
        documents_count: matrix.matrix_items?.length || 0
      }));

      return matricesWithCount as MatrixWithItems[];
    },
  });
}

export function useCreateMatrix() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (matrix: Omit<Matrix, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("matrices")
        .insert(matrix)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matrices"] });
    },
  });
}

export function useUpdateMatrix() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...matrix }: Partial<Matrix> & { id: string }) => {
      const { error } = await supabase
        .from("matrices")
        .update(matrix)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matrices"] });
    },
  });
}

export function useDeleteMatrix() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("matrices")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matrices"] });
    },
  });
}

export function useMatrixItems(matrixId: string) {
  return useQuery({
    queryKey: ["matrix-items", matrixId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matrix_items")
        .select(`
          *,
          documents_catalog(id, name, categoria, document_type, sigla_documento, codigo, nome_curso, sigla, group_name)
        `)
        .eq("matrix_id", matrixId)
        .order("created_at");

      if (error) throw error;
      
      // Transformar os dados para manter compatibilidade
      const transformedData = data?.map(item => ({
        ...item,
        document: item.documents_catalog
      })) || [];
      
      return transformedData as MatrixItem[];
    },
    enabled: !!matrixId,
  });
}

export function useCreateMatrixItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: Omit<MatrixItem, "id" | "created_at">) => {
      const { error } = await supabase
        .from("matrix_items")
        .insert(item);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["matrix-items", variables.matrix_id] });
      queryClient.invalidateQueries({ queryKey: ["matrices"] });
    },
  });
}

export function useUpdateMatrixItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...item }: Partial<MatrixItem> & { id: string }) => {
      const { error } = await supabase
        .from("matrix_items")
        .update(item)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["matrix-items", variables.matrix_id] });
      queryClient.invalidateQueries({ queryKey: ["matrices"] });
    },
  });
}

export function useDeleteMatrixItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, matrixId }: { id: string; matrixId: string }) => {
      const { error } = await supabase
        .from("matrix_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["matrix-items", variables.matrixId] });
      queryClient.invalidateQueries({ queryKey: ["matrices"] });
    },
  });
}

// Hook principal que combina todas as funcionalidades de matriz
export const useMatrix = () => {
  const matricesQuery = useMatrices();
  const deleteMatrix = useDeleteMatrix();

  return {
    matrices: matricesQuery.data || [],
    isLoading: matricesQuery.isLoading,
    deleteMatrix,
  };
};
