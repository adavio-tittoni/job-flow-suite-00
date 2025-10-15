import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Vacancy {
  id: string;
  title: string;
  description?: string;
  department?: string;
  location?: string;
  employment_type?: string;
  salary_range?: string;
  requirements?: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  // Campos calculados
  candidates_count: number;
  matrices?: {
    cargo: string;
    empresa: string;
    versao_matriz: string | null;
  } | null;
}

export interface Stage {
  id: string;
  name: string;
  position: number;
}

export const useVacancies = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: vacancies = [], isLoading } = useQuery({
    queryKey: ["vacancies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vacancies")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Mapear os dados com valores padrão
      const vacanciesWithDefaults = (data || []).map(vacancy => ({
        ...vacancy,
        candidates_count: 0, // Valor padrão por enquanto
        matrices: null // Valor padrão por enquanto
      }));
      
      return vacanciesWithDefaults as Vacancy[];
    },
  });

  const createVacancy = useMutation({
    mutationFn: async (vacancy: Omit<Vacancy, "id" | "created_at" | "updated_at" | "candidates_count">) => {
      const { data, error } = await supabase
        .from("vacancies")
        .insert(vacancy)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vacancies"] });
      toast({
        title: "Vaga criada com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar vaga",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateVacancy = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Vacancy> & { id: string }) => {
      const { data, error } = await supabase
        .from("vacancies")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vacancies"] });
      toast({
        title: "Vaga atualizada com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar vaga",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteVacancy = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("vacancies")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vacancies"] });
      toast({
        title: "Vaga excluída com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir vaga",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    vacancies,
    isLoading,
    createVacancy,
    updateVacancy,
    deleteVacancy,
  };
};

export const useVacancyStages = () => {
  return useQuery({
    queryKey: ["vacancy-stages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipeline_stages")
        .select("*")
        .order("order_index");

      if (error) throw error;
      return data as Stage[];
    },
  });
};
