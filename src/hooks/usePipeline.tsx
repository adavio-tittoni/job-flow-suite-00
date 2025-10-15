import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PipelineStage {
  id: string;
  name: string;
  description?: string;
  order_index: number;
  created_at: string;
}

export interface Application {
  id: string;
  vacancy_id: string;
  candidate_id: string;
  stage_id?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  vacancy: {
    id: string;
    title: string;
    department?: string;
    location?: string;
  };
  candidate: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

export function usePipelineStages() {
  return useQuery({
    queryKey: ["pipeline-stages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipeline_stages")
        .select("*")
        .order("order_index");

      if (error) throw error;
      return data as PipelineStage[];
    },
  });
}

export function useApplications() {
  return useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select(`
          *,
          vacancy:vacancies(id, title, department, location),
          candidate:candidates(id, name, email, phone)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Application[];
    },
  });
}

export function useUpdateApplicationStage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ applicationId, stageId }: { applicationId: string; stageId: string }) => {
      const { error } = await supabase
        .from("applications")
        .update({ 
          stage_id: stageId || null, 
          updated_at: new Date().toISOString() 
        })
        .eq("id", applicationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao mover candidato",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
