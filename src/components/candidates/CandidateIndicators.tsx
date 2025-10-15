import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { AlertCircle, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCandidateRequirementStatus } from "@/hooks/useCandidateRequirementStatus";
import { useAuth } from "@/hooks/useAuth";

interface CandidateIndicatorsProps {
  candidateId: string;
}

interface Matrix {
  id: string;
  empresa: string;
  cargo: string;
  versao_matriz?: string;
}

interface MatrixRequirement {
  id: string;
  document_id: string;
  obrigatoriedade: string;
  modalidade: string;
  document: {
    id: string;
    name: string;
    group_name: string;
  };
}

interface DepartmentStats {
  name: string;
  totalDocs: number;
  expiredDocs: number;
  requiredDocs: number;
  fulfilledDocs: number;
  adherencePercentage: number;
  missingItems: Array<{
    documentName: string;
    reason: string;
  }>;
}

// Utility function to normalize strings for comparison
const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove accents
};

// Utility function to safely parse dates
const parseDate = (dateString: string | null | undefined): Date | null => {
  if (!dateString || dateString.trim() === '' || dateString === 'null' || dateString === 'undefined') {
    return null;
  }
  
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
};

// Utility function to get adherence variant
const getAdherenceVariant = (percentage: number) => {
  if (percentage >= 80) return "default";
  if (percentage >= 60) return "secondary";
  return "destructive";
};

export const CandidateIndicators = ({ candidateId }: CandidateIndicatorsProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

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

  // Fetch matrices for selector
  const { data: matrices = [] } = useQuery({
    queryKey: ["matrices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matrices")
        .select("id, empresa, cargo, versao_matriz")
        .order("empresa", { ascending: true });

      if (error) throw error;
      return data as Matrix[];
    },
  });

  // Use the new requirement status hook
  const { data: requirementStatus } = useCandidateRequirementStatus(candidateId);

  // Legacy data for existing functionality
  const { data: candidateDocuments = [] } = useQuery<any[]>({
    queryKey: ["candidate-documents", candidateId],
    queryFn: async () => {
      let docs: any[] = [];
      const res = await supabase
        .from("candidate_documents")
        .select("*")
        .eq("candidate_id", candidateId);

      docs = res.data || [];
      return docs;
    },
  });

  const updateMatrix = useMutation({
    mutationFn: async (matrixId: string | null) => {
      const { error } = await supabase
        .from("candidates")
        .update({ matrix_id: matrixId })
        .eq("id", candidateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidate", candidateId] });
      queryClient.invalidateQueries({ queryKey: ["candidate-requirement-status", candidateId] });
      queryClient.invalidateQueries({ queryKey: ["candidate-documents", candidateId] });
      toast({
        title: "Matriz atualizada",
        description: "A matriz do candidato foi atualizada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar matriz: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Legacy calculation for document counts (not requirement based)
  const calculateLegacyDepartmentStats = () => {
    const docsByDepartment = candidateDocuments.reduce((acc, doc) => {
      const dept = doc.group_name || "Outros";
      if (!acc[dept]) acc[dept] = [];
      acc[dept].push(doc);
      return acc;
    }, {} as Record<string, any[]>);

    const today = new Date();

    return Object.entries(docsByDepartment).map(([deptName, deptDocs]) => {
      const expiredDocs = (deptDocs as any[]).filter(doc => {
        const expiryDate = parseDate(doc.expiry_date);
        if (!expiryDate) return false;
        return expiryDate < today;
      }).length;

      return {
        name: deptName,
        totalDocs: (deptDocs as any[]).length,
        expiredDocs,
      };
    });
  };

  const legacyDepartmentStats = calculateLegacyDepartmentStats();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Matrix Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Configuração da Matriz
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="matrix-select">Matriz de Documentos</Label>
            <Select
              value={candidate?.matrix_id || ""}
              onValueChange={(value) => updateMatrix.mutate(value === "none" ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma matriz..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma matriz</SelectItem>
                {matrices.map((matrix) => (
                  <SelectItem key={matrix.id} value={matrix.id}>
                    {matrix.empresa} - {matrix.cargo}
                    {matrix.versao_matriz && ` (v${matrix.versao_matriz})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {candidate?.matrix_id && requirementStatus && (
              <div className="mt-4 p-3 bg-primary rounded-lg">
                <div className="text-sm font-medium text-center text-primary-foreground">
                  {requirementStatus.overall.fulfilled} de {requirementStatus.overall.total} requisitos atendidos
                </div>
                <div className="text-xs text-center mt-1 text-primary-foreground/80">
                  {requirementStatus.overall.adherencePercentage}% de aderência
                </div>
                <div className="mt-2">
                  <Progress 
                    value={requirementStatus.overall.adherencePercentage} 
                    variant={getAdherenceVariant(requirementStatus.overall.adherencePercentage)}
                    className="h-2" 
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Obligation Indicators */}
      {candidate?.matrix_id && requirementStatus ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {requirementStatus.obligations.map((obligation) => (
            <Card key={obligation.type} className="hover-scale">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  {obligation.type === 'mandatory' && <div className="w-3 h-3 rounded-full bg-red-500" />}
                  {obligation.type === 'recommended' && <div className="w-3 h-3 rounded-full bg-yellow-500" />}
                  {obligation.type === 'client_required' && <div className="w-3 h-3 rounded-full bg-blue-500" />}
                  {obligation.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>ADERÊNCIA:</span>
                    <span className="font-medium">{obligation.adherencePercentage}%</span>
                  </div>
                  <Progress 
                    value={obligation.adherencePercentage} 
                    variant={getAdherenceVariant(obligation.adherencePercentage)}
                    className="h-2" 
                  />
                  <div className="text-xs text-muted-foreground">
                    {obligation.fulfilled} de {obligation.total} requisitos atendidos
                  </div>
                </div>

                {obligation.total > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>ATENDIDOS:</span>
                      <span className="font-medium text-green-600">{obligation.fulfilled}</span>
                    </div>
                    
                    {obligation.partial > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>PARCIAIS:</span>
                        <span className="font-medium text-yellow-600">{obligation.partial}</span>
                      </div>
                    )}
                    
                    {obligation.pending > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>PENDENTES:</span>
                        <span className="font-medium text-red-600">{obligation.pending}</span>
                      </div>
                    )}
                  </>
                )}
                
                {obligation.total === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-2">
                    Nenhum requisito desta categoria
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : legacyDepartmentStats.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {legacyDepartmentStats.map((dept) => (
            <Card key={dept.name} className="hover-scale">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{dept.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>QNT. DOCS:</span>
                  <span className="font-medium">{dept.totalDocs}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span>VENCIDOS:</span>
                  <span className={`font-medium ${dept.expiredDocs > 0 ? 'text-destructive' : ''}`}>
                    {dept.expiredDocs}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Nenhum documento cadastrado</p>
          </CardContent>
        </Card>
      )}


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
