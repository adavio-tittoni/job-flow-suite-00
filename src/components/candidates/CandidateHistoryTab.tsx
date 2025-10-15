import { useState } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useCandidateHistory, type CandidateHistory } from "@/hooks/useCandidates";
import { CandidateHistoryForm } from "./CandidateHistoryForm";
import { useToast } from "@/hooks/use-toast";

interface CandidateHistoryTabProps {
  candidateId: string;
}

export const CandidateHistoryTab = ({ candidateId }: CandidateHistoryTabProps) => {
  const { history, isLoading, deleteHistoryEntry } = useCandidateHistory(candidateId);
  const [selectedHistory, setSelectedHistory] = useState<CandidateHistory | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [historyToDelete, setHistoryToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const handleEdit = (historyEntry: CandidateHistory) => {
    setSelectedHistory(historyEntry);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    setHistoryToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (historyToDelete) {
      await deleteHistoryEntry.mutateAsync(historyToDelete);
      setDeleteDialogOpen(false);
      setHistoryToDelete(null);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedHistory(null);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
  };

  const getStatusBadge = (approved?: boolean) => {
    if (approved === true) {
      return <Badge variant="default">Aprovado</Badge>;
    } else if (approved === false) {
      return <Badge variant="destructive">Reprovado</Badge>;
    } else {
      return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-32">Carregando histórico...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Histórico do Candidato</CardTitle>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setSelectedHistory(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Evento
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {selectedHistory ? "Editar Evento" : "Novo Evento"}
                  </DialogTitle>
                </DialogHeader>
                <CandidateHistoryForm
                  candidateId={candidateId}
                  historyEntry={selectedHistory}
                  onSuccess={handleFormClose}
                  onCancel={handleFormClose}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum evento registrado</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Vaga</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {formatDate(entry.event_date)}
                      </TableCell>
                      <TableCell>{entry.description || "-"}</TableCell>
                      <TableCell>
                        {entry.vacancy_id ? (
                          <Badge variant="outline">Vaga #{entry.vacancy_id.slice(0, 8)}</Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(entry.approved)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(entry)}
                            title="Editar evento"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(entry.id)}
                            title="Excluir evento"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este evento do histórico? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
