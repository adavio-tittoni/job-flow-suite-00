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
  company?: string;
  role_title?: string;
  matrix_id?: string;
  salary?: number;
  due_date?: string;
  notes?: string;
  candidates_count?: number;
  recruiter_id?: string;
  // Campos calculados
  matrices?: {
    cargo: string;
    empresa: string;
    versao_matriz: string | null;
  } | null;
  recruiter?: {
    id: string;
    name: string;
    email: string;
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

  const { data: vacancies = [], isLoading, refetch } = useQuery({
    queryKey: ["vacancies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vacancies")
        .select(`
          *,
          vacancy_candidates(count)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Buscar perfis dos recrutadores
      const recruiterIds = [...new Set((data || []).map(v => v.recruiter_id).filter(Boolean))];
      let recruitersMap: Record<string, { id: string; name: string; email: string }> = {};
      
      if (recruiterIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", recruiterIds);
        
        if (!profilesError && profiles) {
          recruitersMap = profiles.reduce((acc, profile) => {
            acc[profile.id] = {
              id: profile.id,
              name: profile.name,
              email: profile.email
            };
            return acc;
          }, {} as Record<string, { id: string; name: string; email: string }>);
        }
      }
      
      // Mapear os dados com valores padrão e contagem correta
      const vacanciesWithDefaults = (data || []).map(vacancy => ({
        ...vacancy,
        candidates_count: vacancy.vacancy_candidates?.[0]?.count || 0,
        matrices: null, // Valor padrão por enquanto
        recruiter: vacancy.recruiter_id ? recruitersMap[vacancy.recruiter_id] || null : null
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
    refetch,
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
