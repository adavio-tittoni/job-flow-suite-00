import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Candidate } from "./useCandidates";

export interface PaginationState {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface UsePaginatedCandidatesOptions {
  pageSize?: number;
  searchTerm?: string;
}

export const usePaginatedCandidates = (options: UsePaginatedCandidatesOptions = {}) => {
  const { pageSize = 20, searchTerm = "" } = options;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [page, setPage] = useState(1);

  // Fetch paginated candidates with server-side filtering
  const { data, isLoading, isFetching, isPreviousData } = useQuery({
    queryKey: ["candidates-paginated", page, pageSize, searchTerm],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Build query with optional search filter
      let query = supabase
        .from("candidates")
        .select("*", { count: "exact" });

      // Apply search filter if provided
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase().trim();
        query = query.or(
          `name.ilike.%${searchLower}%,email.ilike.%${searchLower}%,phones.ilike.%${searchLower}%`
        );
      }

      // Get total count and paginated data
      const { data: candidatesData, error: candidatesError, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (candidatesError) throw candidatesError;

      // Fetch vacancy titles for this page of candidates only (reduces N+1)
      const candidateIds = candidatesData?.map(c => c.id) || [];
      let vacancyMap = new Map<string, string>();

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

        if (!vcError && vacancyCandidates) {
          vacancyCandidates.forEach((vc: any) => {
            const vacancies = Array.isArray(vc.vacancies) 
              ? vc.vacancies 
              : (vc.vacancies ? [vc.vacancies] : []);
            
            vacancies.forEach((vacancy: any) => {
              if (vacancy?.title) {
                const existing = vacancyMap.get(vc.candidate_id);
                if (existing) {
                  vacancyMap.set(vc.candidate_id, `${existing}, ${vacancy.title}`);
                } else {
                  vacancyMap.set(vc.candidate_id, vacancy.title);
                }
              }
            });
          });
        }
      }

      // Merge vacancy titles with candidates
      const candidatesWithVacancies = candidatesData?.map(candidate => ({
        ...candidate,
        vacancy_title: vacancyMap.get(candidate.id) || undefined
      })) as Candidate[];

      return {
        candidates: candidatesWithVacancies || [],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
    // Keep previous data while fetching new page (smooth pagination UX)
    placeholderData: keepPreviousData,
    // Cache each page for 2 minutes
    staleTime: 1000 * 60 * 2,
  });

  // Prefetch next page for instant navigation
  const prefetchNextPage = useCallback(() => {
    if (data && page < data.totalPages) {
      queryClient.prefetchQuery({
        queryKey: ["candidates-paginated", page + 1, pageSize, searchTerm],
        queryFn: async () => {
          const from = page * pageSize;
          const to = from + pageSize - 1;

          let query = supabase
            .from("candidates")
            .select("*", { count: "exact" });

          if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase().trim();
            query = query.or(
              `name.ilike.%${searchLower}%,email.ilike.%${searchLower}%,phones.ilike.%${searchLower}%`
            );
          }

          const { data: candidatesData, error, count } = await query
            .order("created_at", { ascending: false })
            .range(from, to);

          if (error) throw error;

          return {
            candidates: candidatesData as Candidate[],
            totalCount: count || 0,
            totalPages: Math.ceil((count || 0) / pageSize),
          };
        },
      });
    }
  }, [data, page, pageSize, searchTerm, queryClient]);

  // Mutations
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
      // Invalidate all paginated queries to refresh counts
      queryClient.invalidateQueries({ queryKey: ["candidates-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      toast({ title: "Candidato criado com sucesso" });
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
      queryClient.invalidateQueries({ queryKey: ["candidates-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["candidate", data.id] });
      toast({ title: "Candidato atualizado com sucesso" });
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
      queryClient.invalidateQueries({ queryKey: ["candidates-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      toast({ title: "Candidato excluído com sucesso" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir candidato",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Pagination controls
  const goToPage = useCallback((newPage: number) => {
    setPage(Math.max(1, Math.min(newPage, data?.totalPages || 1)));
  }, [data?.totalPages]);

  const nextPage = useCallback(() => {
    if (data && page < data.totalPages) {
      setPage(p => p + 1);
    }
  }, [data, page]);

  const previousPage = useCallback(() => {
    if (page > 1) {
      setPage(p => p - 1);
    }
  }, [page]);

  // Reset page when search changes
  const resetPage = useCallback(() => {
    setPage(1);
  }, []);

  // Pagination info
  const pagination: PaginationState = useMemo(() => ({
    page,
    pageSize,
    totalCount: data?.totalCount || 0,
    totalPages: data?.totalPages || 0,
  }), [page, pageSize, data]);

  return {
    candidates: data?.candidates || [],
    isLoading,
    isFetching,
    isPreviousData,
    pagination,
    goToPage,
    nextPage,
    previousPage,
    resetPage,
    prefetchNextPage,
    createCandidate,
    updateCandidate,
    deleteCandidate,
  };
};
