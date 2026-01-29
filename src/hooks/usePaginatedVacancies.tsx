import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Vacancy } from "./useVacancies";

export interface PaginationState {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface UsePaginatedVacanciesOptions {
  pageSize?: number;
  searchTerm?: string;
  status?: "open" | "closed" | "all";
}

export const usePaginatedVacancies = (options: UsePaginatedVacanciesOptions = {}) => {
  const { pageSize = 20, searchTerm = "", status = "all" } = options;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [page, setPage] = useState(1);

  // Fetch paginated vacancies with server-side filtering
  const { data, isLoading, isFetching, isPreviousData } = useQuery({
    queryKey: ["vacancies-paginated", page, pageSize, searchTerm, status],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Build query with filters
      let query = supabase
        .from("vacancies")
        .select(`
          *,
          vacancy_candidates(count)
        `, { count: "exact" });

      // Apply status filter
      if (status !== "all") {
        query = query.eq("status", status);
      }

      // Apply search filter if provided
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase().trim();
        query = query.or(
          `title.ilike.%${searchLower}%,company.ilike.%${searchLower}%,department.ilike.%${searchLower}%,description.ilike.%${searchLower}%`
        );
      }

      // Get total count and paginated data
      const { data: vacanciesData, error: vacanciesError, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (vacanciesError) throw vacanciesError;

      // Fetch recruiter profiles for this page only (batch query instead of N+1)
      const recruiterIds = [...new Set((vacanciesData || []).map(v => v.recruiter_id).filter(Boolean))];
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

      // Map vacancies with recruiter info and candidate count
      const vacanciesWithData = (vacanciesData || []).map(vacancy => ({
        ...vacancy,
        candidates_count: vacancy.vacancy_candidates?.[0]?.count || 0,
        matrices: null,
        recruiter: vacancy.recruiter_id ? recruitersMap[vacancy.recruiter_id] || null : null
      })) as Vacancy[];

      return {
        vacancies: vacanciesWithData,
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
    // Keep previous data while fetching new page
    placeholderData: keepPreviousData,
    // Cache each page for 2 minutes
    staleTime: 1000 * 60 * 2,
  });

  // Prefetch next page for instant navigation
  const prefetchNextPage = useCallback(() => {
    if (data && page < data.totalPages) {
      queryClient.prefetchQuery({
        queryKey: ["vacancies-paginated", page + 1, pageSize, searchTerm, status],
        queryFn: async () => {
          const from = page * pageSize;
          const to = from + pageSize - 1;

          let query = supabase
            .from("vacancies")
            .select(`*, vacancy_candidates(count)`, { count: "exact" });

          if (status !== "all") {
            query = query.eq("status", status);
          }

          if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase().trim();
            query = query.or(
              `title.ilike.%${searchLower}%,company.ilike.%${searchLower}%,department.ilike.%${searchLower}%`
            );
          }

          const { data: vacanciesData, error, count } = await query
            .order("created_at", { ascending: false })
            .range(from, to);

          if (error) throw error;

          return {
            vacancies: (vacanciesData || []).map(v => ({
              ...v,
              candidates_count: v.vacancy_candidates?.[0]?.count || 0,
              matrices: null,
              recruiter: null
            })) as Vacancy[],
            totalCount: count || 0,
            totalPages: Math.ceil((count || 0) / pageSize),
          };
        },
      });
    }
  }, [data, page, pageSize, searchTerm, status, queryClient]);

  // Mutations
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
      queryClient.invalidateQueries({ queryKey: ["vacancies-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["vacancies"] });
      toast({ title: "Vaga criada com sucesso" });
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
      queryClient.invalidateQueries({ queryKey: ["vacancies-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["vacancies"] });
      toast({ title: "Vaga atualizada com sucesso" });
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
      queryClient.invalidateQueries({ queryKey: ["vacancies-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["vacancies"] });
      toast({ title: "Vaga excluída com sucesso" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir vaga",
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
    vacancies: data?.vacancies || [],
    isLoading,
    isFetching,
    isPreviousData,
    pagination,
    goToPage,
    nextPage,
    previousPage,
    resetPage,
    prefetchNextPage,
    createVacancy,
    updateVacancy,
    deleteVacancy,
  };
};
