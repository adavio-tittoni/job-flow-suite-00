import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useDocumentsCatalog, useDeleteDocument, DocumentCatalog } from "@/hooks/useDocuments";
import { DocumentForm } from "@/components/DocumentForm";
import { ImportResultsDialog } from "@/components/ImportResultsDialog";
import { CSVInstructionsDialog } from "@/components/CSVInstructionsDialog";
import { useDocumentImportExport, ImportResult } from "@/hooks/useDocumentImportExport";
import { Plus, Search, Edit, Trash2, Download, Upload, FileText, Trash, Sheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Documents() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selectedDocument, setSelectedDocument] = useState<DocumentCatalog | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showImportResults, setShowImportResults] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: documents = [], isLoading, refetch } = useDocumentsCatalog();
  const deleteDocument = useDeleteDocument();
  const { toast } = useToast();
  const { exportTemplate, exportDocuments, exportDocumentsExcel, importDocuments, isImporting, isExporting } = useDocumentImportExport();

  // Filtrar documentos
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = 
      (doc.nome_curso && doc.nome_curso.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (doc.name && doc.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (doc.categoria && doc.categoria.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (doc.codigo && doc.codigo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (doc.sigla && doc.sigla.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (doc.sigla_documento && doc.sigla_documento.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (doc.descricao_curso && doc.descricao_curso.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = !categoryFilter || (doc.categoria || doc.group_name) === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  // Obter categorias únicas para o filtro
  const categories = Array.from(new Set(documents.map(doc => doc.categoria || doc.group_name).filter(Boolean)));

  const handleEdit = (document: DocumentCatalog) => {
    setSelectedDocument(document);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDocument.mutateAsync(id);
      toast({
        title: "Documento excluído",
        description: "O documento foi excluído com sucesso.",
      });
    } catch (error: any) {
      console.error("Erro ao excluir documento:", error);
      const errorMessage = error?.message || error?.error?.message || "Ocorreu um erro ao excluir o documento.";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDeleteAll = async () => {
    try {
      const deletePromises = selectedDocuments.map(id => deleteDocument.mutateAsync(id));
      await Promise.all(deletePromises);
      
      toast({
        title: "Documentos excluídos",
        description: `${selectedDocuments.length} documentos foram excluídos com sucesso.`,
      });
      
      setSelectedDocuments([]);
      setShowDeleteAllDialog(false);
      
      // Forçar refetch dos dados para garantir atualização da UI
      await refetch();
    } catch (error: any) {
      console.error("Erro ao excluir documentos:", error);
      const errorMessage = error?.message || error?.error?.message || "Ocorreu um erro ao excluir os documentos.";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleSelectAll = () => {
    if (selectedDocuments.length === filteredDocuments.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(filteredDocuments.map(doc => doc.id));
    }
  };

  const handleSelectDocument = (documentId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId) 
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedDocument(undefined);
  };

  const handleExportCSV = async () => {
    try {
      await exportDocuments(filteredDocuments);
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Ocorreu um erro ao exportar os documentos.",
        variant: "destructive",
      });
    }
  };

  const handleExportExcel = async () => {
    try {
      await exportDocumentsExcel(filteredDocuments);
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Ocorreu um erro ao exportar os documentos.",
        variant: "destructive",
      });
    }
  };

  const handleImportCSV = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await importDocuments(file);
      setImportResult(result);
      setShowImportResults(true);
    } catch (error) {
      toast({
        title: "Erro na importação",
        description: "Ocorreu um erro ao importar os documentos.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando documentos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documentos</h1>
          <p className="text-muted-foreground">Catálogo de documentos do sistema</p>
        </div>
        <div className="flex gap-2">
          <CSVInstructionsDialog>
            <Button variant="outline" disabled={isExporting}>
              <FileText className="h-4 w-4 mr-2" />
              {isExporting ? 'Exportando...' : 'Baixar Modelo'}
            </Button>
          </CSVInstructionsDialog>
          <Button variant="outline" onClick={handleExportCSV} disabled={isExporting}>
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exportando...' : 'Exportar CSV'}
          </Button>
          <Button variant="outline" onClick={handleExportExcel} disabled={isExporting}>
            <Sheet className="h-4 w-4 mr-2" />
            {isExporting ? 'Exportando...' : 'Exportar Excel'}
          </Button>
          <Button variant="outline" onClick={handleImportCSV} disabled={isImporting}>
            <Upload className="h-4 w-4 mr-2" />
            {isImporting ? 'Importando...' : 'Importar Excel/CSV'}
          </Button>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setSelectedDocument(undefined)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Documento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedDocument ? "Editar Documento" : "Novo Documento"}
                </DialogTitle>
              </DialogHeader>
              <DocumentForm document={selectedDocument} onClose={handleCloseForm} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por nome, categoria, tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-input bg-background rounded-md text-sm"
        >
          <option value="">Todas as categorias</option>
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      {/* Barra de ações para documentos selecionados */}
      {selectedDocuments.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-blue-800 font-medium">
              {selectedDocuments.length} documento{selectedDocuments.length > 1 ? 's' : ''} selecionado{selectedDocuments.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDocuments([])}
            >
              Cancelar seleção
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteAllDialog(true)}
            >
              <Trash className="h-4 w-4 mr-2" />
              Excluir selecionados
            </Button>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedDocuments.length === filteredDocuments.length && filteredDocuments.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Sigla</TableHead>
              <TableHead>Nome do Curso</TableHead>
              <TableHead>Carga Horária</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead>Modalidade</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDocuments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  {searchTerm || categoryFilter ? "Nenhum documento encontrado" : "Nenhum documento cadastrado"}
                </TableCell>
              </TableRow>
            ) : (
              filteredDocuments.map((document) => (
                <TableRow key={document.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedDocuments.includes(document.id)}
                      onCheckedChange={() => handleSelectDocument(document.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{document.categoria || document.group_name || "-"}</Badge>
                  </TableCell>
                  <TableCell>{document.codigo || "-"}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span>{document.sigla || document.sigla_documento || "-"}</span>
                      {document.sigla_ingles && (
                        <Badge variant="outline" className="w-fit text-xs bg-blue-50 text-blue-700 border-blue-200">
                          {document.sigla_ingles}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex flex-col gap-1">
                      <span>{document.nome_curso || document.name || "-"}</span>
                      {document.nome_ingles && (
                        <Badge variant="outline" className="w-fit text-xs bg-blue-50 text-blue-700 border-blue-200">
                          {document.nome_ingles}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{document.carga_horaria || "-"}</TableCell>
                  <TableCell>{document.validade || "-"}</TableCell>
                  <TableCell>{document.modalidade || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(document)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir o documento "{document.name}"? 
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(document.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de confirmação para exclusão em lote */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão em lote</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedDocuments.length} documento{selectedDocuments.length > 1 ? 's' : ''} selecionado{selectedDocuments.length > 1 ? 's' : ''}? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Input oculto para upload de arquivo */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      {/* Dialog de resultados da importação */}
      <ImportResultsDialog
        result={importResult}
        open={showImportResults}
        onOpenChange={setShowImportResults}
      />
    </div>
  );
}