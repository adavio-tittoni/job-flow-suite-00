import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook for prefetching data on hover/focus to improve perceived navigation speed.
 * Use this on navigation links to pre-load data before user clicks.
 */
export const usePrefetch = () => {
  const queryClient = useQueryClient();

  /**
   * Prefetch candidates list data (first page)
   */
  const prefetchCandidates = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ["candidates-paginated", 1, 20, ""],
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from("candidates")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(0, 19);

        if (error) throw error;
        return {
          candidates: data || [],
          totalCount: count || 0,
          totalPages: Math.ceil((count || 0) / 20),
        };
      },
      staleTime: 1000 * 60 * 2,
    });
  }, [queryClient]);

  /**
   * Prefetch a specific candidate's data
   */
  const prefetchCandidate = useCallback((candidateId: string) => {
    if (!candidateId) return;

    // Prefetch candidate details
    queryClient.prefetchQuery({
      queryKey: ["candidate", candidateId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("candidates")
          .select("*")
          .eq("id", candidateId)
          .single();

        if (error) throw error;
        return data;
      },
      staleTime: 1000 * 60 * 2,
    });

    // Prefetch candidate documents
    queryClient.prefetchQuery({
      queryKey: ["candidate-documents", candidateId],
      queryFn: async () => {
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
        return data || [];
      },
      staleTime: 1000 * 60 * 1,
    });
  }, [queryClient]);

  /**
   * Prefetch vacancies list data (first page)
   */
  const prefetchVacancies = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ["vacancies-paginated", 1, 20, "", "all"],
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from("vacancies")
          .select(`*, vacancy_candidates(count)`, { count: "exact" })
          .order("created_at", { ascending: false })
          .range(0, 19);

        if (error) throw error;
        return {
          vacancies: (data || []).map(v => ({
            ...v,
            candidates_count: v.vacancy_candidates?.[0]?.count || 0,
          })),
          totalCount: count || 0,
          totalPages: Math.ceil((count || 0) / 20),
        };
      },
      staleTime: 1000 * 60 * 2,
    });
  }, [queryClient]);

  /**
   * Prefetch a specific vacancy's data
   */
  const prefetchVacancy = useCallback((vacancyId: string) => {
    if (!vacancyId) return;

    queryClient.prefetchQuery({
      queryKey: ["vacancy", vacancyId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("vacancies")
          .select(`*, vacancy_candidates(count)`)
          .eq("id", vacancyId)
          .single();

        if (error) throw error;
        return data;
      },
      staleTime: 1000 * 60 * 2,
    });
  }, [queryClient]);

  /**
   * Prefetch documents catalog (used in forms)
   */
  const prefetchDocumentsCatalog = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ["documents-catalog"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("documents_catalog")
          .select("*")
          .order("categoria", { ascending: true })
          .order("name", { ascending: true });

        if (error) throw error;
        return data || [];
      },
      staleTime: 1000 * 60 * 5, // Catalog data changes less frequently
    });
  }, [queryClient]);

  /**
   * Prefetch matrix list data
   */
  const prefetchMatrices = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ["matrices"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("matrices")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        return data || [];
      },
      staleTime: 1000 * 60 * 2,
    });
  }, [queryClient]);

  /**
   * Prefetch pipeline data
   */
  const prefetchPipeline = useCallback(() => {
    // Prefetch pipeline stages
    queryClient.prefetchQuery({
      queryKey: ["pipeline-stages"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("pipeline_stages")
          .select("*")
          .order("order_index");

        if (error) throw error;
        return data || [];
      },
      staleTime: 1000 * 60 * 5,
    });

    // Prefetch open vacancies for pipeline
    queryClient.prefetchQuery({
      queryKey: ["vacancies"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("vacancies")
          .select(`*, vacancy_candidates(count)`)
          .order("created_at", { ascending: false });

        if (error) throw error;
        return data || [];
      },
      staleTime: 1000 * 60 * 2,
    });
  }, [queryClient]);

  return {
    prefetchCandidates,
    prefetchCandidate,
    prefetchVacancies,
    prefetchVacancy,
    prefetchDocumentsCatalog,
    prefetchMatrices,
    prefetchPipeline,
  };
};
