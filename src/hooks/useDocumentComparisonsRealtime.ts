import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Subscribes to document_comparisons INSERT for a candidate.
 * When the backend inserts a row (e.g. after Rabbit/consumer processing),
 * invalidates document-comparisons and candidate-documents so the UI
 * updates to "Documento pronto" and shows Confere/Parcial/Pendente.
 */
export function useDocumentComparisonsRealtime(candidateId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!candidateId) return;

    const channel = supabase
      .channel(`document_comparisons:${candidateId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "document_comparisons",
          filter: `candidate_id=eq.${candidateId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["document-comparisons", candidateId] });
          queryClient.invalidateQueries({ queryKey: ["candidate-documents", candidateId] });
          queryClient.invalidateQueries({ queryKey: ["candidate-requirement-status"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [candidateId, queryClient]);
}
