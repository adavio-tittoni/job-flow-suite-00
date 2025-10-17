import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useDocumentsCatalog, useDeleteDocument, DocumentCatalog } from "@/hooks/useDocuments";
import { DocumentForm } from "@/components/DocumentForm";
import { ImportResultsDialog } from "@/components/ImportResultsDialog";
import { CSVInstructionsDialog } from "@/components/CSVInstructionsDialog";
import { useDocumentImportExport, ImportResult } from "@/hooks/useDocumentImportExport";
import { Plus, Search, Edit, Trash2, Download, Upload, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Documents() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selectedDocument, setSelectedDocument] = useState<DocumentCatalog | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showImportResults, setShowImportResults] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: documents = [], isLoading } = useDocumentsCatalog();
  const deleteDocument = useDeleteDocument();
  const { toast } = useToast();
  const { exportTemplate, exportDocuments, importDocuments, isImporting, isExporting } = useDocumentImportExport();

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
        title: "Documento excluído com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro ao excluir documento",
        description: "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedDocument(undefined);
  };

  const handleExportCSV = () => {
    exportDocuments(filteredDocuments);
  };

  const handleExportTemplate = () => {
    exportTemplate();
  };

  const handleImportCSV = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo CSV.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await importDocuments(file);
      setImportResult(result);
      setShowImportResults(true);
    } catch (error) {
      console.error('Erro ao importar:', error);
    }

    // Limpar o input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Documentos</h1>
          <p className="text-muted-foreground">Catálogo de documentos do sistema</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
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
          <Button variant="outline" onClick={handleImportCSV} disabled={isImporting}>
            <Upload className="h-4 w-4 mr-2" />
            {isImporting ? 'Importando...' : 'Importar CSV'}
          </Button>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setSelectedDocument(undefined)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Documento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
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

      {/* Tabela */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
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
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {searchTerm || categoryFilter ? "Nenhum documento encontrado" : "Nenhum documento cadastrado"}
                </TableCell>
              </TableRow>
            ) : (
              filteredDocuments.map((document) => (
                <TableRow key={document.id}>
                  <TableCell>
                    <Badge variant="secondary">{document.categoria || document.group_name || "-"}</Badge>
                  </TableCell>
                  <TableCell>{document.codigo || "-"}</TableCell>
                  <TableCell>{document.sigla || document.sigla_documento || "-"}</TableCell>
                  <TableCell className="font-medium">{document.nome_curso || document.name || "-"}</TableCell>
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

      {/* Contador de resultados */}
      <div className="text-sm text-muted-foreground">
        {filteredDocuments.length} documento(s) encontrado(s)
        {searchTerm && ` para "${searchTerm}"`}
        {categoryFilter && ` na categoria "${categoryFilter}"`}
      </div>

      {/* Input de arquivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Dialog de resultados da importação */}
      <ImportResultsDialog
        isOpen={showImportResults}
        onClose={() => setShowImportResults(false)}
        result={importResult}
      />
    </div>
  );
}
