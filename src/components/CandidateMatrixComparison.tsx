import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle, XCircle, TrendingUp, Users, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCandidateRequirementStatus } from "@/hooks/useCandidateRequirementStatus";

interface Candidate {
  id: string;
  name: string;
  role_title: string;
  photo_url: string;
  notes: string;
}

interface MatrixItem {
  id: string;
  document_id: string;
  obrigatoriedade: string;
  modalidade: string;
  regra_validade: string;
  documents_catalog: {
    name: string;
    document_category: string;
    document_type: string;
  };
}

interface CandidateMatrixComparisonProps {
  vacancyId: string;
  matrixId: string | null;
}

const CandidateMatrixComparison = ({ vacancyId, matrixId }: CandidateMatrixComparisonProps) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [matrixItems, setMatrixItems] = useState<MatrixItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!matrixId) return;
      
      try {
        setLoading(true);

        // Buscar candidatos vinculados à vaga
        const { data: vacancyCandidates, error: vacancyError } = await supabase
          .from('vacancy_candidates')
          .select(`
            candidates!inner (
              id,
              name,
              role_title,
              photo_url,
              notes
            )
          `)
          .eq('vacancy_id', vacancyId);

        if (vacancyError) throw vacancyError;

        const candidatesData = vacancyCandidates?.map(item => item.candidates) || [];
        setCandidates(candidatesData);

        // Buscar itens da matriz
        const { data: matrixData, error: matrixError } = await supabase
          .from('matrix_items')
          .select(`
            id,
            document_id,
            obrigatoriedade,
            modalidade,
            regra_validade,
            documents_catalog!inner (
              name,
              document_category,
              document_type
            )
          `)
          .eq('matrix_id', matrixId);

        if (matrixError) throw matrixError;
        setMatrixItems(matrixData || []);

      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [vacancyId, matrixId]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getProgressVariant = (percentage: number) => {
    if (percentage >= 80) return "success";
    if (percentage >= 50) return "warning";
    return "danger";
  };

  const getCompatibilityLevel = (percentage: number) => {
    if (percentage >= 90) return { level: "Excelente", color: "bg-green-100 text-green-800", icon: CheckCircle };
    if (percentage >= 70) return { level: "Boa", color: "bg-blue-100 text-blue-800", icon: TrendingUp };
    if (percentage >= 50) return { level: "Regular", color: "bg-yellow-100 text-yellow-800", icon: AlertCircle };
    return { level: "Baixa", color: "bg-red-100 text-red-800", icon: XCircle };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Carregando comparação...</p>
      </div>
    );
  }

  if (!matrixId) {
    return (
      <div className="text-center py-8">
        <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Vincule uma matriz à vaga para ver a comparação.</p>
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Adicione candidatos à vaga para ver a comparação.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Comparação com Matriz</h3>
        <Badge variant="outline">
          {matrixItems.length} requisitos
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="detailed">Detalhado</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {candidates.map((candidate) => (
              <CandidateOverviewCard 
                key={candidate.id} 
                candidate={candidate} 
                matrixItems={matrixItems}
                getInitials={getInitials}
                getProgressVariant={getProgressVariant}
                getCompatibilityLevel={getCompatibilityLevel}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-4">
          {candidates.map((candidate) => (
            <CandidateDetailedCard 
              key={candidate.id} 
              candidate={candidate} 
              matrixItems={matrixItems}
              getInitials={getInitials}
              getProgressVariant={getProgressVariant}
              getCompatibilityLevel={getCompatibilityLevel}
            />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface CandidateOverviewCardProps {
  candidate: Candidate;
  matrixItems: MatrixItem[];
  getInitials: (name: string) => string;
  getProgressVariant: (percentage: number) => string;
  getCompatibilityLevel: (percentage: number) => { level: string; color: string; icon: any };
}

const CandidateOverviewCard = ({ candidate, matrixItems, getInitials, getProgressVariant, getCompatibilityLevel }: CandidateOverviewCardProps) => {
  const { data: adherenceData, isLoading } = useCandidateRequirementStatus(candidate.id);
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm text-muted-foreground">Calculando...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const compatibility = getCompatibilityLevel(adherenceData?.overall.adherencePercentage || 0);
  const IconComponent = compatibility.icon;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={candidate.photo_url} />
            <AvatarFallback>
              {getInitials(candidate.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium truncate">{candidate.name}</h4>
            {candidate.role_title && (
              <p className="text-sm text-muted-foreground truncate">{candidate.role_title}</p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Compatibilidade:</span>
            <Badge className={compatibility.color}>
              <IconComponent className="h-3 w-3 mr-1" />
              {compatibility.level}
            </Badge>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Aderência</span>
              <span className="font-medium">{adherenceData?.overall.adherencePercentage || 0}%</span>
            </div>
            <Progress 
              value={adherenceData?.overall.adherencePercentage || 0} 
              variant={getProgressVariant(adherenceData?.overall.adherencePercentage || 0)}
              className="h-2"
            />
          </div>

          <div className="text-xs text-muted-foreground">
            {adherenceData?.overall.fulfilled || 0} de {adherenceData?.overall.total || 0} requisitos atendidos
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface CandidateDetailedCardProps {
  candidate: Candidate;
  matrixItems: MatrixItem[];
  getInitials: (name: string) => string;
  getProgressVariant: (percentage: number) => string;
  getCompatibilityLevel: (percentage: number) => { level: string; color: string; icon: any };
}

const CandidateDetailedCard = ({ candidate, matrixItems, getInitials, getProgressVariant, getCompatibilityLevel }: CandidateDetailedCardProps) => {
  const { data: adherenceData, isLoading } = useCandidateRequirementStatus(candidate.id);
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm text-muted-foreground">Calculando...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const compatibility = getCompatibilityLevel(adherenceData?.overall.adherencePercentage || 0);
  const IconComponent = compatibility.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={candidate.photo_url} />
            <AvatarFallback>
              {getInitials(candidate.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-lg">{candidate.name}</CardTitle>
            {candidate.role_title && (
              <p className="text-sm text-muted-foreground">{candidate.role_title}</p>
            )}
          </div>
          <Badge className={compatibility.color}>
            <IconComponent className="h-3 w-3 mr-1" />
            {compatibility.level}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">Aderência Geral</span>
              <span className="font-bold">{adherenceData?.overall.adherencePercentage || 0}%</span>
            </div>
            <Progress 
              value={adherenceData?.overall.adherencePercentage || 0} 
              variant={getProgressVariant(adherenceData?.overall.adherencePercentage || 0)}
              className="h-3"
            />
            <div className="text-xs text-muted-foreground mt-1">
              {adherenceData?.overall.fulfilled || 0} de {adherenceData?.overall.total || 0} requisitos atendidos
            </div>
          </div>

          {adherenceData?.obligations && adherenceData.obligations.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Detalhamento por Categoria</h4>
              {adherenceData.obligations
                .filter(obligation => obligation.total > 0)
                .map((obligation) => (
                  <div key={`${obligation.type}-${obligation.label}`} className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium">{obligation.label}</span>
                      <span className="text-muted-foreground">{obligation.adherencePercentage}%</span>
                    </div>
                    <Progress 
                      value={obligation.adherencePercentage} 
                      variant={getProgressVariant(obligation.adherencePercentage)}
                      className="h-2"
                    />
                    <div className="text-xs text-muted-foreground">
                      {obligation.fulfilled} de {obligation.total} requisitos
                    </div>
                  </div>
                ))
              }
            </div>
          )}

          {candidate.notes && (
            <div>
              <h4 className="font-medium text-sm mb-2">Observações</h4>
              <p className="text-sm text-muted-foreground">{candidate.notes}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CandidateMatrixComparison;
