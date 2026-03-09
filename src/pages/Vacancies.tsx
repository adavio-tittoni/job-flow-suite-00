import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Edit, Trash2, Building2, MapPin, Users, DollarSign, Calendar, Trash, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useVacancies, type Vacancy } from "@/hooks/useVacancies";

const Vacancies = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const { vacancies, isLoading, deleteVacancy, refetch } = useVacancies();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [vacancyToDelete, setVacancyToDelete] = useState<Vacancy | null>(null);
  const [selectedVacancies, setSelectedVacancies] = useState<string[]>([]);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

  // Filter vacancies based on search term using useMemo to prevent infinite loops
  const filteredVacancies = useMemo(() => {
    return vacancies.filter(vacancy =>
      vacancy.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vacancy.department && vacancy.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (vacancy.description && vacancy.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (vacancy.company && vacancy.company.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [vacancies, searchTerm]);

  // Separate vacancies into open and closed
  const openVacancies = useMemo(() => {
    return filteredVacancies.filter(vacancy => vacancy.status === 'open');
  }, [filteredVacancies]);

  const closedVacancies = useMemo(() => {
    return filteredVacancies.filter(vacancy => vacancy.status === 'closed');
  }, [filteredVacancies]);

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

  const handleDeleteAll = async () => {
    try {
      const deletePromises = selectedVacancies.map(id => deleteVacancy.mutateAsync(id));
      await Promise.all(deletePromises);
      
      toast({
        title: "Vagas excluídas",
        description: `${selectedVacancies.length} vagas foram excluídas com sucesso.`,
      });
      
      setSelectedVacancies([]);
      setShowDeleteAllDialog(false);
      
      // Forçar refetch dos dados para garantir atualização da UI
      await refetch();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao excluir as vagas.",
        variant: "destructive",
      });
    }
  };

  const handleSelectAll = () => {
    if (selectedVacancies.length === filteredVacancies.length) {
      setSelectedVacancies([]);
    } else {
      setSelectedVacancies(filteredVacancies.map(vacancy => vacancy.id));
    }
  };

  const handleSelectVacancy = (vacancyId: string) => {
    setSelectedVacancies(prev => 
      prev.includes(vacancyId) 
        ? prev.filter(id => id !== vacancyId)
        : [...prev, vacancyId]
    );
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
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Building2 className="h-8 w-8 text-blue-600" />
            Vagas
            <Badge variant="secondary" className="ml-2 text-sm bg-blue-100 text-blue-800">
              {filteredVacancies.length} {filteredVacancies.length === 1 ? 'vaga' : 'vagas'}
            </Badge>
          </h1>
          <p className="text-muted-foreground">
            Gerencie suas vagas: crie, edite e visualize todas as oportunidades
          </p>
        </div>
        
        <Button 
          onClick={() => navigate('/vacancies/new')}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova vaga
        </Button>
      </div>

      <Card className="mb-6 shadow-sm border-gray-200">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b">
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Search className="h-5 w-5 text-blue-600" />
            Buscar vagas
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por título, empresa, departamento ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Barra de ações para vagas selecionadas */}
      {selectedVacancies.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-blue-800 font-medium">
              {selectedVacancies.length} vaga{selectedVacancies.length > 1 ? 's' : ''} selecionada{selectedVacancies.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedVacancies([])}
            >
              Cancelar seleção
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteAllDialog(true)}
            >
              <Trash className="h-4 w-4 mr-2" />
              Excluir selecionadas
            </Button>
          </div>
        </div>
      )}

      {/* Container de Vagas Abertas */}
      <Card className="shadow-lg border-gray-200 mb-6">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Building2 className="h-5 w-5 text-blue-600" />
            Vagas Abertas
            <Badge variant="secondary" className="ml-2 text-sm bg-green-100 text-green-800">
              {openVacancies.length} {openVacancies.length === 1 ? 'vaga' : 'vagas'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {openVacancies.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? 'Nenhuma vaga aberta encontrada com os filtros aplicados.' : 'Nenhuma vaga aberta cadastrada.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedVacancies.length === openVacancies.length && openVacancies.length > 0 && openVacancies.every(v => selectedVacancies.includes(v.id))}
                      onCheckedChange={() => {
                        const allSelected = openVacancies.every(v => selectedVacancies.includes(v.id));
                        if (allSelected) {
                          setSelectedVacancies(prev => prev.filter(id => !openVacancies.some(v => v.id === id)));
                        } else {
                          setSelectedVacancies(prev => [...prev, ...openVacancies.filter(v => !prev.includes(v.id)).map(v => v.id)]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">Título</TableHead>
                  <TableHead className="font-semibold text-gray-700">Empresa</TableHead>
                  <TableHead className="font-semibold text-gray-700">Recrutador</TableHead>
                  <TableHead className="font-semibold text-gray-700">Status</TableHead>
                  <TableHead className="font-semibold text-gray-700">Candidatos</TableHead>
                  <TableHead className="font-semibold text-gray-700">Salário</TableHead>
                  <TableHead className="font-semibold text-gray-700">Criado em</TableHead>
                  <TableHead className="text-right font-semibold text-gray-700">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openVacancies.map((vacancy) => (
                  <TableRow key={vacancy.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedVacancies.includes(vacancy.id)}
                        onCheckedChange={() => handleSelectVacancy(vacancy.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{vacancy.title}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <span className="text-slate-700">
                          {vacancy.company || "-"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-slate-600">
                          {vacancy.recruiter?.name || "-"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="default"
                        className="bg-green-100 text-green-800 border-green-200"
                      >
                        {vacancy.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          {vacancy.candidates_count || 0}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span className="text-slate-600">
                          {vacancy.salary_range || vacancy.salary ? `R$ ${vacancy.salary?.toLocaleString()}` : "-"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-slate-600">
                          {formatDate(vacancy.created_at)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                         <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/vacancies/${vacancy.id}`)}
                          className="hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setVacancyToDelete(vacancy)}
                          className="hover:bg-red-50 hover:text-red-600"
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

      {/* Container de Vagas Fechadas */}
      <Card className="shadow-lg border-gray-200">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 border-b">
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Building2 className="h-5 w-5 text-gray-600" />
            Vagas Fechadas
            <Badge variant="secondary" className="ml-2 text-sm bg-gray-100 text-gray-800">
              {closedVacancies.length} {closedVacancies.length === 1 ? 'vaga' : 'vagas'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {closedVacancies.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? 'Nenhuma vaga fechada encontrada com os filtros aplicados.' : 'Nenhuma vaga fechada cadastrada.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedVacancies.length === closedVacancies.length && closedVacancies.length > 0 && closedVacancies.every(v => selectedVacancies.includes(v.id))}
                      onCheckedChange={() => {
                        const allSelected = closedVacancies.every(v => selectedVacancies.includes(v.id));
                        if (allSelected) {
                          setSelectedVacancies(prev => prev.filter(id => !closedVacancies.some(v => v.id === id)));
                        } else {
                          setSelectedVacancies(prev => [...prev, ...closedVacancies.filter(v => !prev.includes(v.id)).map(v => v.id)]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">Título</TableHead>
                  <TableHead className="font-semibold text-gray-700">Empresa</TableHead>
                  <TableHead className="font-semibold text-gray-700">Recrutador</TableHead>
                  <TableHead className="font-semibold text-gray-700">Status</TableHead>
                  <TableHead className="font-semibold text-gray-700">Candidatos</TableHead>
                  <TableHead className="font-semibold text-gray-700">Salário</TableHead>
                  <TableHead className="font-semibold text-gray-700">Criado em</TableHead>
                  <TableHead className="text-right font-semibold text-gray-700">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closedVacancies.map((vacancy) => (
                  <TableRow key={vacancy.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedVacancies.includes(vacancy.id)}
                        onCheckedChange={() => handleSelectVacancy(vacancy.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{vacancy.title}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <span className="text-slate-700">
                          {vacancy.company || "-"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-slate-600">
                          {vacancy.recruiter?.name || "-"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary"
                        className="bg-gray-100 text-gray-800 border-gray-200"
                      >
                        {vacancy.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          {vacancy.candidates_count || 0}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span className="text-slate-600">
                          {vacancy.salary_range || vacancy.salary ? `R$ ${vacancy.salary?.toLocaleString()}` : "-"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-slate-600">
                          {formatDate(vacancy.created_at)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                         <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/vacancies/${vacancy.id}`)}
                          className="hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setVacancyToDelete(vacancy)}
                          className="hover:bg-red-50 hover:text-red-600"
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

      {/* Dialog de confirmação para exclusão em lote */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão em lote</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedVacancies.length} vaga{selectedVacancies.length > 1 ? 's' : ''} selecionada{selectedVacancies.length > 1 ? 's' : ''}? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir todas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Vacancies;