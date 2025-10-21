import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CandidateIndicatorsProps {
  candidateId: string;
}

export const CandidateIndicators = ({ candidateId }: CandidateIndicatorsProps) => {
  // Fetch candidate data
  const { data: candidate } = useQuery({
    queryKey: ["candidate", candidateId],
    queryFn: async () => {
      let data: any = null;
      let error: any = null;
      const res = await supabase
        .from("candidates")
        .select("id, name, matrix_id")
        .eq("id", candidateId)
        .single();

      data = res.data;
      error = res.error;

      if (!data) throw new Error('Candidato não encontrado');
      return data;
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* No Matrix Warning */}
      {!candidate?.matrix_id && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-yellow-600">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">
                Vincule uma matriz para visualizar indicadores de aderência e identificar documentos pendentes.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
