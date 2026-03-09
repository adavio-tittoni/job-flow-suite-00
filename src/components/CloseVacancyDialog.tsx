import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface VacancyCandidate {
  id: string;
  candidate_id: string;
  candidate: {
    id: string;
    name: string;
    role_title: string;
    photo_url: string;
  };
}

interface CloseVacancyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vacancyId: string;
  vacancyTitle: string;
  onSuccess: () => void;
}

interface CandidateApprovalState {
  candidateId: string;
  candidateName: string;
  approved: boolean;
}

const CloseVacancyDialog = ({
  open,
  onOpenChange,
  vacancyId,
  vacancyTitle,
  onSuccess,
}: CloseVacancyDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [candidates, setCandidates] = useState<VacancyCandidate[]>([]);
  const [approvalStates, setApprovalStates] = useState<CandidateApprovalState[]>([]);

  // Fetch candidates when dialog opens
  useEffect(() => {
    if (open && vacancyId) {
      fetchCandidates();
    }
  }, [open, vacancyId]);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vacancy_candidates' as any)
        .select(`
          id,
          candidate_id,
          candidates!inner (
            id,
            name,
            role_title,
            photo_url
          )
        `)
        .eq('vacancy_id', vacancyId);

      if (error) throw error;

      const formattedData: VacancyCandidate[] = (data as any)?.map((item: any) => ({
        id: item.id,
        candidate_id: item.candidate_id,
        candidate: {
          id: item.candidates.id,
          name: item.candidates.name,
          role_title: item.candidates.role_title || "",
          photo_url: item.candidates.photo_url || "",
        }
      })) || [];

      setCandidates(formattedData);
      
      // Initialize approval states - all candidates start as not approved
      setApprovalStates(
        formattedData.map(vc => ({
          candidateId: vc.candidate_id,
          candidateName: vc.candidate.name,
          approved: false,
        }))
      );
    } catch (error) {
      console.error('Erro ao carregar candidatos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os candidatos da vaga.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const toggleApproval = (candidateId: string) => {
    setApprovalStates(prev =>
      prev.map(state =>
        state.candidateId === candidateId
          ? { ...state, approved: !state.approved }
          : state
      )
    );
  };

  const handleCloseVacancy = async () => {
    try {
      setSaving(true);

      const closedAt = new Date().toISOString();

      // 1. Update vacancy status to closed
      const { error: vacancyError } = await supabase
        .from('vacancies')
        .update({
          status: 'closed',
          closed_at: closedAt,
        })
        .eq('id', vacancyId);

      if (vacancyError) throw vacancyError;

      // 2. Create history entry for each candidate
      const historyEntries = approvalStates.map(state => ({
        candidate_id: state.candidateId,
        vacancy_id: vacancyId,
        event_date: closedAt,
        approved: state.approved,
        description: `Vaga "${vacancyTitle}" finalizada. Candidato ${state.approved ? 'aprovado' : 'não aprovado'}.`,
      }));

      if (historyEntries.length > 0) {
        const { error: historyError } = await supabase
          .from('candidate_history')
          .insert(historyEntries);

        if (historyError) throw historyError;
      }

      toast({
        title: "Vaga finalizada",
        description: `A vaga foi fechada e o histórico dos ${approvalStates.length} candidato(s) foi atualizado.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao finalizar vaga:', error);
      toast({
        title: "Erro",
        description: "Não foi possível finalizar a vaga.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const approvedCount = approvalStates.filter(s => s.approved).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Finalizar Vaga</DialogTitle>
          <DialogDescription>
            Selecione quais candidatos foram aprovados/enviados para a vaga "{vacancyTitle}".
            Esta ação irá fechar a vaga e registrar o resultado no histórico de cada candidato.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span className="text-muted-foreground">Carregando candidatos...</span>
          </div>
        ) : candidates.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Nenhum candidato vinculado a esta vaga.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              A vaga será fechada sem registros de histórico.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {candidates.length} candidato(s) na vaga
              </p>
              <Badge variant={approvedCount > 0 ? "default" : "secondary"}>
                {approvedCount} aprovado(s)
              </Badge>
            </div>

            <ScrollArea className="max-h-[400px] pr-4">
              <div className="space-y-3">
                {candidates.map((vc) => {
                  const approvalState = approvalStates.find(
                    s => s.candidateId === vc.candidate_id
                  );
                  const isApproved = approvalState?.approved || false;

                  return (
                    <div
                      key={vc.id}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                        isApproved 
                          ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' 
                          : 'bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={vc.candidate.photo_url} />
                          <AvatarFallback>
                            {getInitials(vc.candidate.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{vc.candidate.name}</p>
                          {vc.candidate.role_title && (
                            <p className="text-sm text-muted-foreground">
                              {vc.candidate.role_title}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {isApproved ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`approved-${vc.candidate_id}`}
                            checked={isApproved}
                            onCheckedChange={() => toggleApproval(vc.candidate_id)}
                          />
                          <Label 
                            htmlFor={`approved-${vc.candidate_id}`}
                            className={`text-sm ${isApproved ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}
                          >
                            {isApproved ? 'Aprovado' : 'Não aprovado'}
                          </Label>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleCloseVacancy} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Finalizando...
              </>
            ) : (
              'Finalizar Vaga'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CloseVacancyDialog;
