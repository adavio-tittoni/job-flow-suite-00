import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMatrixImportExport } from "@/hooks/useMatrixImportExport";
import { useMatrix } from "@/hooks/useMatrix";
import { Plus, Search, Edit, Trash2, Download, Upload, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useRef } from "react";

const Matrix = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { matrices, isLoading, deleteMatrix } = useMatrix();
  const { exportMatrix, importMatrix, isExporting, isImporting } = useMatrixImportExport();
  
  const [filteredMatrices, setFilteredMatrices] = useState(matrices);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCargo, setSelectedCargo] = useState("");
  const [selectedEmpresa, setSelectedEmpresa] = useState("");
  const [selectedSolicitado, setSelectedSolicitado] = useState("");
  const [selectedUsuario, setSelectedUsuario] = useState("");
  const [matrixToDelete, setMatrixToDelete] = useState<any>(null);

  // Obter valores únicos para filtros
  const uniqueCargos = [...new Set(matrices.map(m => m.cargo))];
  const uniqueEmpresas = [...new Set(matrices.map(m => m.empresa))];
  const uniqueSolicitados = [...new Set(matrices.map(m => m.solicitado_por))];
  const uniqueUsuarios = [...new Set(matrices.map(m => m.user_email))];

  const handleDeleteMatrix = async () => {
    if (!matrixToDelete) return;

    try {
      await deleteMatrix.mutateAsync(matrixToDelete.id);
      toast({
        title: "Matriz excluída",
        description: "A matriz foi excluída com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao excluir a matriz.",
        variant: "destructive",
      });
    } finally {
      setMatrixToDelete(null);
    }
  };

  const handleExportMatrix = async (matrixId: string) => {
    try {
      await exportMatrix.mutateAsync(matrixId);
    } catch (error) {
      console.error('Erro ao exportar matriz:', error);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo Excel (.xlsx ou .xls)",
        variant: "destructive",
      });
      return;
    }

    try {
      await importMatrix.mutateAsync(file);
    } catch (error) {
      // Erro já tratado no hook
    }

    // Limpar o input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEdit = (matrix: any) => {
    navigate(`/matrix/${matrix.id}`);
  };

  const handleManageItems = (matrix: any) => {
    navigate(`/matrix/${matrix.id}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Aplicar filtros
  useEffect(() => {
    let filtered = matrices;

    // Filtro de busca global
    if (searchTerm) {
      filtered = filtered.filter(matrix =>
        matrix.versao_matriz?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        matrix.cargo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        matrix.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        matrix.solicitado_por?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        matrix.user_email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtros específicos
    if (selectedCargo && selectedCargo !== "all") {
      filtered = filtered.filter(matrix => matrix.cargo === selectedCargo);
    }
    if (selectedEmpresa && selectedEmpresa !== "all") {
      filtered = filtered.filter(matrix => matrix.empresa === selectedEmpresa);
    }
    if (selectedSolicitado && selectedSolicitado !== "all") {
      filtered = filtered.filter(matrix => matrix.solicitado_por === selectedSolicitado);
    }
    if (selectedUsuario && selectedUsuario !== "all") {
      filtered = filtered.filter(matrix => matrix.user_email === selectedUsuario);
    }

    setFilteredMatrices(filtered);
  }, [matrices, searchTerm, selectedCargo, selectedEmpresa, selectedSolicitado, selectedUsuario]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando matrizes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Matriz
          </h1>
          <p className="text-muted-foreground">
            Gerencie e visualize as matrizes de documentos do sistema.
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleImportClick}
            disabled={isImporting}
          >
            <Upload className="h-4 w-4 mr-2" />
            {isImporting ? "Importando..." : "Importar Excel"}
          </Button>
          <Button onClick={() => navigate('/matrix/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Matriz
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros e Busca</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Busca global..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedCargo} onValueChange={setSelectedCargo}>
              <SelectTrigger>
                <SelectValue placeholder="Cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os cargos</SelectItem>
                {uniqueCargos.map(cargo => (
                  <SelectItem key={cargo} value={cargo}>{cargo}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedEmpresa} onValueChange={setSelectedEmpresa}>
              <SelectTrigger>
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as empresas</SelectItem>
                {uniqueEmpresas.map(empresa => (
                  <SelectItem key={empresa} value={empresa}>{empresa}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSolicitado} onValueChange={setSelectedSolicitado}>
              <SelectTrigger>
                <SelectValue placeholder="Solicitado por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {uniqueSolicitados.map(solicitado => (
                  <SelectItem key={solicitado} value={solicitado}>{solicitado}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedUsuario} onValueChange={setSelectedUsuario}>
              <SelectTrigger>
                <SelectValue placeholder="Usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os usuários</SelectItem>
                {uniqueUsuarios.map(usuario => (
                  <SelectItem key={usuario} value={usuario}>{usuario}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Matrizes
            <Badge variant="secondary" className="ml-2">
              {filteredMatrices.length} {filteredMatrices.length === 1 ? 'matriz' : 'matrizes'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredMatrices.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm || (selectedCargo && selectedCargo !== "all") || (selectedEmpresa && selectedEmpresa !== "all") || (selectedSolicitado && selectedSolicitado !== "all") || (selectedUsuario && selectedUsuario !== "all")
                  ? 'Nenhuma matriz encontrada com os filtros aplicados.'
                  : 'Nenhuma matriz cadastrada.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Versão Matriz</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Solicitado por</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Qtd. Documentos</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMatrices.map((matrix) => (
                  <TableRow key={matrix.id}>
                    <TableCell className="font-medium">{matrix.versao_matriz || "-"}</TableCell>
                    <TableCell>{matrix.cargo}</TableCell>
                    <TableCell>{matrix.empresa}</TableCell>
                    <TableCell>{matrix.solicitado_por || "-"}</TableCell>
                    <TableCell>{matrix.user_email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {matrix.documents_count || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(matrix.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleManageItems(matrix)}
                          title="Gerenciar itens"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(matrix)}
                          title="Editar matriz"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExportMatrix(matrix.id)}
                          disabled={isExporting}
                          title="Exportar matriz"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setMatrixToDelete(matrix)}
                          title="Excluir matriz"
                          className="text-destructive hover:text-destructive"
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

      <AlertDialog open={!!matrixToDelete} onOpenChange={() => setMatrixToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a matriz {matrixToDelete?.cargo} - {matrixToDelete?.empresa}? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMatrix}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default Matrix;