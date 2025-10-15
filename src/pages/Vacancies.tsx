import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useVacancies, type Vacancy } from "@/hooks/useVacancies";

const Vacancies = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const { vacancies, isLoading, deleteVacancy } = useVacancies();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [vacancyToDelete, setVacancyToDelete] = useState<Vacancy | null>(null);

  // Filter vacancies based on search term using useMemo to prevent infinite loops
  const filteredVacancies = useMemo(() => {
    return vacancies.filter(vacancy =>
      vacancy.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vacancy.department && vacancy.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (vacancy.description && vacancy.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [vacancies, searchTerm]);

  const handleDeleteVacancy = async () => {
    if (!vacancyToDelete) return;

    try {
      await deleteVacancy.mutateAsync(vacancyToDelete.id);
    } catch (error) {
      console.error('Erro ao excluir vaga:', error);
    } finally {
      setVacancyToDelete(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando vagas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Vagas
          </h1>
          <p className="text-muted-foreground">
            Gerencie suas vagas: crie, edite e visualize todas as oportunidades
          </p>
        </div>
        
        <Button onClick={() => navigate('/vacancies/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Nova vaga
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Buscar vagas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por título, departamento ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Vagas
            <Badge variant="secondary" className="ml-2">
              {filteredVacancies.length} {filteredVacancies.length === 1 ? 'vaga' : 'vagas'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredVacancies.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? 'Nenhuma vaga encontrada com os filtros aplicados.' : 'Nenhuma vaga cadastrada.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Candidatos</TableHead>
                  <TableHead>Salário</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVacancies.map((vacancy) => (
                  <TableRow key={vacancy.id}>
                    <TableCell className="font-medium">{vacancy.title}</TableCell>
                    <TableCell>{vacancy.department || "-"}</TableCell>
                    <TableCell>{vacancy.location || "-"}</TableCell>
                    <TableCell>{vacancy.employment_type || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={vacancy.status === 'open' ? 'default' : 'secondary'}>
                        {vacancy.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {vacancy.candidates_count}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {vacancy.salary_range || "-"}
                    </TableCell>
                    <TableCell>
                      {formatDate(vacancy.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                         <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/vacancies/${vacancy.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setVacancyToDelete(vacancy)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!vacancyToDelete} onOpenChange={() => setVacancyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a vaga "{vacancyToDelete?.title}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteVacancy}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Vacancies;