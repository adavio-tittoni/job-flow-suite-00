import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, X, User, CheckIcon, Loader2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useVacancyCandidateComparison } from "@/hooks/useVacancyCandidateComparison";
import { useAuth } from "@/hooks/useAuth";
import CandidateMatrixComparison from "./CandidateMatrixComparison";
import * as XLSX from "xlsx";

interface VacancyCandidate {
  id: string;
  candidate_id: string;
  candidate: {
    id: string;
    name: string;
    role_title: string;
    photo_url: string;
    notes: string;
  };
}

interface Candidate {
  id: string;
  name: string;
  role_title: string;
  photo_url: string;
}

interface VacancyCandidatesSectionProps {
  vacancyId: string;
  matrixId: string | null;
}

const VacancyCandidatesSection = ({ vacancyId, matrixId }: VacancyCandidatesSectionProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [vacancyCandidates, setVacancyCandidates] = useState<VacancyCandidate[]>([]);
  const [allCandidates, setAllCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [candidateToRemove, setCandidateToRemove] = useState<VacancyCandidate | null>(null);
  const [vacancyTitle, setVacancyTitle] = useState<string>("");
  
  // Buscar comparações para ordenar os cards
  const { comparisons, loading: comparisonsLoading } = useVacancyCandidateComparison(vacancyId);

  const fetchVacancyCandidates = async () => {
    try {
      // Buscar título da vaga
      const { data: vacancyData, error: vacancyError } = await supabase
        .from('vacancies')
        .select('title')
        .eq('id', vacancyId)
        .single();

      if (vacancyError) throw vacancyError;
      if (vacancyData) {
        setVacancyTitle(vacancyData.title || "");
      }

      const { data, error } = await supabase
        .from('vacancy_candidates')
        .select(`
          id,
          candidate_id,
          candidates!inner (
            id,
            name,
            role_title,
            photo_url,
            notes
          )
        `)
        .eq('vacancy_id', vacancyId);

      if (error) throw error;

      const formattedData: VacancyCandidate[] = data?.map(item => ({
        id: item.id,
        candidate_id: item.candidate_id,
        candidate: {
          id: item.candidates.id,
          name: item.candidates.name,
          role_title: item.candidates.role_title || "",
          photo_url: item.candidates.photo_url || "",
          notes: item.candidates.notes || "",
        }
      })) || [];

      setVacancyCandidates(formattedData);
    } catch (error) {
      console.error('Erro ao carregar candidatos da vaga:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os candidatos da vaga.",
        variant: "destructive",
      });
    }
  };

  const fetchAllCandidates = async () => {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('id, name, role_title, photo_url')
        .order('name');

      if (error) throw error;
      setAllCandidates(data || []);
    } catch (error) {
      console.error('Erro ao carregar candidatos:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchVacancyCandidates(),
        fetchAllCandidates()
      ]);
      setLoading(false);
    };

    loadData();
  }, [vacancyId]);

  const addCandidateToVacancy = async (candidateId: string) => {
    try {
      // Adicionar candidato à vaga
      const { error: insertError } = await supabase
        .from('vacancy_candidates')
        .insert({
          vacancy_id: vacancyId,
          candidate_id: candidateId,
        });

      if (insertError) throw insertError;

      // Buscar matrix_id da vaga para vincular automaticamente ao candidato
      const { data: vacancyData, error: vacancyError } = await supabase
        .from('vacancies')
        .select('matrix_id')
        .eq('id', vacancyId)
        .single();

      if (vacancyError) throw vacancyError;

      // Se a vaga tem uma matriz, atualizar o candidato para usar essa matriz
      if (vacancyData?.matrix_id) {
        const { error: updateError } = await supabase
          .from('candidates')
          .update({ matrix_id: vacancyData.matrix_id })
          .eq('id', candidateId);

        if (updateError) {
          console.error('Erro ao vincular matriz ao candidato:', updateError);
          // Não falhar toda a operação se não conseguir atualizar a matriz
        }
      }

      toast({
        title: "Sucesso",
        description: "Candidato adicionado à vaga e vinculado à matriz.",
      });

      await fetchVacancyCandidates();
      setShowAddCandidate(false);
    } catch (error) {
      console.error('Erro ao adicionar candidato:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o candidato à vaga.",
        variant: "destructive",
      });
    }
  };

  const removeCandidateFromVacancy = async () => {
    if (!candidateToRemove) return;

    try {
      const { error } = await supabase
        .from('vacancy_candidates')
        .delete()
        .eq('id', candidateToRemove.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Candidato removido da vaga.",
      });

      await fetchVacancyCandidates();
    } catch (error) {
      console.error('Erro ao remover candidato:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o candidato da vaga.",
        variant: "destructive",
      });
    } finally {
      setCandidateToRemove(null);
    }
  };

  const getAvailableCandidates = () => {
    const vacancyCandidateIds = vacancyCandidates.map(vc => vc.candidate_id);
    return allCandidates.filter(candidate => !vacancyCandidateIds.includes(candidate.id));
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getSummary = (notes: string) => {
    if (!notes) return "Sem observações";
    return notes.length > 100 ? notes.substring(0, 100) + "..." : notes;
  };

  const exportToExcel = () => {
    try {
      if (vacancyCandidates.length === 0) {
        toast({
          title: "Aviso",
          description: "Não há candidatos para exportar.",
          variant: "destructive",
        });
        return;
      }

      // Criar workbook
      const workbook = XLSX.utils.book_new();

      // Preparar dados para exportação - Resumo simples: uma linha por candidato
      const exportData: any[] = [];

      // Se houver comparações, usar os dados das comparações
      if (comparisons.length > 0) {
        comparisons.forEach((comparison) => {
          exportData.push({
            "Nome da Vaga": vacancyTitle,
            "Nome do Candidato": comparison.candidateName,
            "Aderência (%)": comparison.adherencePercentage,
            "Confere": comparison.metRequirements,
            "Parcial": comparison.partialRequirements,
            "Pendente": comparison.pendingRequirements,
          });
        });
      } else {
        // Se não houver comparações, exportar apenas dados básicos dos candidatos
        vacancyCandidates.forEach((vacancyCandidate) => {
          exportData.push({
            "Nome da Vaga": vacancyTitle,
            "Nome do Candidato": vacancyCandidate.candidate.name,
            "Aderência (%)": "-",
            "Confere": "-",
            "Parcial": "-",
            "Pendente": "-",
          });
        });
      }

      // Criar worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Ajustar largura das colunas
      const columnWidths = [
        { wch: 30 }, // Nome da Vaga
        { wch: 35 }, // Nome do Candidato
        { wch: 15 }, // Aderência
        { wch: 12 }, // Confere
        { wch: 12 }, // Parcial
        { wch: 12 }, // Pendente
      ];
      worksheet['!cols'] = columnWidths;

      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "Candidatos");

      // Gerar nome do arquivo com data
      const date = new Date().toISOString().split('T')[0];
      const fileName = `Candidatos_${vacancyTitle.replace(/[^a-z0-9]/gi, '_')}_${date}.xlsx`;

      // Salvar arquivo
      XLSX.writeFile(workbook, fileName);

      toast({
        title: "Sucesso",
        description: "Dados exportados para Excel com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao exportar para Excel:', error);
      toast({
        title: "Erro",
        description: "Não foi possível exportar os dados para Excel.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Carregando candidatos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {vacancyCandidates.length} {vacancyCandidates.length === 1 ? 'candidato' : 'candidatos'}
          </p>
          {!matrixId && (
            <Badge variant="outline" className="text-xs">
              Vincule uma matriz para ver aderência
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {vacancyCandidates.length > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={exportToExcel}
              disabled={comparisonsLoading}
            >
              {comparisonsLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Carregando...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar Excel
                </>
              )}
            </Button>
          )}
          <Popover open={showAddCandidate} onOpenChange={setShowAddCandidate}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar candidato
              </Button>
            </PopoverTrigger>
          <PopoverContent className="w-80 p-0">
            <Command>
              <CommandInput placeholder="Buscar candidatos..." />
              <CommandList>
                <CommandEmpty>Nenhum candidato encontrado.</CommandEmpty>
                <CommandGroup>
                  {getAvailableCandidates().map((candidate) => (
                    <CommandItem
                      key={candidate.id}
                      onSelect={() => addCandidateToVacancy(candidate.id)}
                      className="flex items-center gap-2"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={candidate.photo_url} />
                        <AvatarFallback className="text-xs">
                          {getInitials(candidate.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{candidate.name}</p>
                        {candidate.role_title && (
                          <p className="text-xs text-muted-foreground">{candidate.role_title}</p>
                        )}
                      </div>
                      <CheckIcon className="h-4 w-4" />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        </div>
      </div>

      {vacancyCandidates.length === 0 ? (
        <div className="text-center py-8">
          <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhum candidato adicionado ainda.</p>
          <p className="text-sm text-muted-foreground">
            Use o botão "Adicionar candidato" para começar.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(() => {
              // Ordenar candidatos por aderência (maior para menor)
              const sortedCandidates = [...vacancyCandidates].sort((a, b) => {
                const comparisonA = comparisons.find(comp => comp.candidateId === a.candidate_id);
                const comparisonB = comparisons.find(comp => comp.candidateId === b.candidate_id);
                
                const adherenceA = comparisonA?.adherencePercentage || 0;
                const adherenceB = comparisonB?.adherencePercentage || 0;
                
                return adherenceB - adherenceA; // Maior para menor
              });
              
              return sortedCandidates.map((vacancyCandidate) => (
                <CandidateCard
                  key={vacancyCandidate.id}
                  vacancyCandidate={vacancyCandidate}
                  matrixId={matrixId}
                  vacancyId={vacancyId}
                  onRemove={() => setCandidateToRemove(vacancyCandidate)}
                  onViewCandidate={() => navigate(`/candidates/${vacancyCandidate.candidate_id}?from=vacancy&vacancyId=${vacancyId}`)}
                />
              ));
            })()}
          </div>

          {/* Comparação com Matriz */}
          <CandidateMatrixComparison 
            vacancyId={vacancyId} 
            matrixId={matrixId} 
          />
        </>
      )}

      {/* Remove confirmation dialog */}
      <AlertDialog open={!!candidateToRemove} onOpenChange={() => setCandidateToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover candidato</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover "{candidateToRemove?.candidate.name}" desta vaga?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={removeCandidateFromVacancy}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

interface CandidateCardProps {
  vacancyCandidate: VacancyCandidate;
  matrixId: string | null;
  vacancyId: string;
  onRemove: () => void;
  onViewCandidate: () => void;
}

const CandidateCard = ({ vacancyCandidate, matrixId, vacancyId, onRemove, onViewCandidate }: CandidateCardProps) => {
  const { candidate } = vacancyCandidate;
  
  // Usar useVacancyCandidateComparison para ter os mesmos dados da visão geral e detalhada
  const { comparisons, loading: isAdherenceLoading } = useVacancyCandidateComparison(vacancyId);
  
  // Buscar os dados deste candidato específico nas comparações
  const candidateComparison = comparisons.find(comp => comp.candidateId === candidate.id);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getSummary = (notes: string) => {
    if (!notes) return "Sem observações";
    return notes.length > 100 ? notes.substring(0, 100) + "..." : notes;
  };

  const getProgressVariant = (percentage: number) => {
    if (percentage >= 80) return "success";
    if (percentage >= 50) return "warning";
    return "danger";
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onViewCandidate}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
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
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Resumo:</p>
            <p className="text-xs">{getSummary(candidate.notes)}</p>
          </div>

          {isAdherenceLoading ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs text-muted-foreground">Calculando aderência...</span>
            </div>
          ) : candidateComparison ? (
            <div>
              {/* Seção destacada com fundo azul escuro - aderência geral */}
              <div className="bg-primary text-primary-foreground p-3 rounded-lg mb-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Aderência:</p>
                  <span className="text-sm font-bold">
                    {candidateComparison.adherencePercentage}%
                  </span>
                </div>
                <Progress 
                  value={candidateComparison.adherencePercentage} 
                  variant={getProgressVariant(candidateComparison.adherencePercentage)}
                  className="h-2 bg-primary-hover"
                />
                <div className="text-xs mt-1 opacity-90">
                  <span className="font-medium">{candidateComparison.metRequirements} atendidos</span>
                </div>
              </div>
              <div className="space-y-2">
                
                {(() => {
                  const mandatoryDocs = candidateComparison.documents.filter(doc => doc.obligation === 'Obrigatório');
                  const mandatoryMet = mandatoryDocs.filter(doc => doc.status === 'Confere').length;
                  const mandatoryPartial = mandatoryDocs.filter(doc => doc.status === 'Parcial').length;
                  const mandatoryTotal = mandatoryDocs.length;
                  const mandatoryPercentage = mandatoryTotal > 0 
                    ? Math.round(((mandatoryMet) + (mandatoryPartial * 0.5)) / mandatoryTotal * 100)
                    : 0;
                  
                  if (mandatoryTotal === 0) return null;
                  
                  return (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-foreground truncate">Mandatório</span>
                        <span className="text-muted-foreground ml-2">{mandatoryPercentage}%</span>
                      </div>
                      <div className="space-y-1">
                        <Progress 
                          value={mandatoryPercentage} 
                          variant={getProgressVariant(mandatoryPercentage)}
                          className="h-1.5"
                        />
                        <div className="text-xs text-muted-foreground">
                          {mandatoryMet} de {mandatoryTotal} requisitos
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-xs text-muted-foreground">
                {!matrixId ? 'Vincule uma matriz à vaga para ver aderência' : 'Dados não disponíveis'}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default VacancyCandidatesSection;


