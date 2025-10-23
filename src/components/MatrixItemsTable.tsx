import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Edit, Save, X, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useMatrixItems, useCreateMatrixItem, useUpdateMatrixItem, useDeleteMatrixItem, type MatrixItem } from "@/hooks/useMatrix";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const matrixItemSchema = z.object({
  document_id: z.string().min(1, "Documento é obrigatório"),
  obrigatoriedade: z.string().min(1, "Obrigatoriedade é obrigatória"),
  carga_horaria: z.number().min(0).optional(),
  modalidade: z.string().min(1, "Modalidade é obrigatória"),
  regra_validade: z.string().min(1, "Regra de validade é obrigatória"),
});

type MatrixItemFormData = z.infer<typeof matrixItemSchema>;

interface Document {
  id: string;
  name: string;
  categoria: string;
  document_type?: string;
  sigla_documento?: string;
  codigo?: string;
  sigla?: string;
  nome_curso?: string;
  group_name?: string;
}

interface MatrixItemsTableProps {
  matrixId: string;
  onClose?: () => void;
}

export const MatrixItemsTable = ({ matrixId, onClose }: MatrixItemsTableProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<MatrixItem | null>(null);
  const [showDocumentSelector, setShowDocumentSelector] = useState(false);

  const { data: matrixItems = [], isLoading, refetch } = useMatrixItems(matrixId);
  const createMatrixItem = useCreateMatrixItem();
  const updateMatrixItem = useUpdateMatrixItem();
  const deleteMatrixItem = useDeleteMatrixItem();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    setValue,
    reset,
    watch,
  } = useForm<MatrixItemFormData>({
    resolver: zodResolver(matrixItemSchema),
    defaultValues: {
      document_id: "",
      obrigatoriedade: "Obrigatório",
      carga_horaria: undefined,
      modalidade: "Presencial",
      regra_validade: "Sem validade",
    },
  });

  // Load documents from catalog
  useEffect(() => {
    const loadDocuments = async () => {
      const { data, error } = await supabase
        .from('documents_catalog')
        .select('*')
        .order('name');
      
      if (!error && data) {
        setDocuments(data);
        setFilteredDocuments(data);
      }
    };
    
    loadDocuments();
  }, []);

  // Filter documents based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredDocuments(documents);
    } else {
      const filtered = documents.filter(doc => 
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.sigla_documento && doc.sigla_documento.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (doc.codigo && doc.codigo.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredDocuments(filtered);
    }
  }, [searchTerm, documents]);

  // Get already selected document IDs
  useEffect(() => {
    if (matrixItems && matrixItems.length > 0) {
      const selectedIds = matrixItems.map(item => item.document_id);
      setSelectedDocuments(selectedIds);
    }
  }, [matrixItems?.length]); // Only depend on length to avoid infinite loops

  const onSubmit = async (data: MatrixItemFormData) => {
    setIsSubmitting(true);
    try {
      if (editingItem) {
        // Update existing item
        await updateMatrixItem.mutateAsync({
          id: editingItem.id,
          matrix_id: matrixId,
          ...data,
        });
        
        toast({
          title: "Item atualizado",
          description: "O item foi atualizado na matriz com sucesso.",
        });
      } else {
        // Create new item
        await createMatrixItem.mutateAsync({
          matrix_id: matrixId,
          document_id: data.document_id,
          obrigatoriedade: data.obrigatoriedade,
          carga_horaria: data.carga_horaria,
          modalidade: data.modalidade,
          regra_validade: data.regra_validade,
          document: {
            id: data.document_id,
            name: documents.find(d => d.id === data.document_id)?.name || "",
            categoria: documents.find(d => d.id === data.document_id)?.categoria || "",
          }
        });
        
        toast({
          title: "Item adicionado",
          description: "O item foi adicionado à matriz com sucesso.",
        });
      }
      
      // Reset form and clear all states
      clearForm();
      await refetch();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || `Ocorreu um erro ao ${editingItem ? 'atualizar' : 'adicionar'} o item.`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (itemId: string) => {
    setItemToDelete(itemId);
    setDeleteDialogOpen(true);
  };

  const handleEdit = (item: MatrixItem) => {
    setEditingItem(item);
    
    // Set form values
    setValue("document_id", item.document_id);
    setValue("obrigatoriedade", item.obrigatoriedade);
    setValue("carga_horaria", item.carga_horaria || undefined);
    setValue("modalidade", item.modalidade);
    setValue("regra_validade", item.regra_validade);
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      try {
        await deleteMatrixItem.mutateAsync({ 
          id: itemToDelete, 
          matrixId 
        });
        
        toast({
          title: "Item removido",
          description: "O item foi removido da matriz com sucesso.",
        });
        await refetch();
      } catch (error: any) {
        toast({
          title: "Erro",
          description: error.message || "Ocorreu um erro ao remover o item.",
          variant: "destructive",
        });
      } finally {
        setDeleteDialogOpen(false);
        setItemToDelete(null);
      }
    }
  };

  const clearForm = () => {
    reset({
      document_id: "",
      obrigatoriedade: "Obrigatório",
      carga_horaria: undefined,
      modalidade: "Presencial",
      regra_validade: "Sem validade",
    });
    setEditingItem(null);
  };

  const handleAddDocument = async (documentId: string) => {
    // Definir o documento selecionado
    setValue("document_id", documentId);
    
    // Criar o item automaticamente com valores padrão
    setIsSubmitting(true);
    try {
      await createMatrixItem.mutateAsync({
        matrix_id: matrixId,
        document_id: documentId,
        obrigatoriedade: "Obrigatório",
        carga_horaria: undefined,
        modalidade: "Presencial",
        regra_validade: "Sem validade",
      });
      
      toast({
        title: "Documento adicionado",
        description: "O documento foi adicionado à matriz com sucesso.",
      });
      
      // Fechar o seletor e atualizar a lista
      setShowDocumentSelector(false);
      await refetch();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao adicionar o documento.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDocumentName = (documentId: string) => {
    const doc = documents.find(d => d.id === documentId);
    return doc?.name || "Documento não encontrado";
  };

  const getDocumentCategory = (documentId: string) => {
    const doc = documents.find(d => d.id === documentId);
    return doc?.categoria || "";
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-32">
            <p>Carregando itens da matriz...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold">
              📋 Itens da Matriz ({matrixItems.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDocumentSelector(true)}
                disabled={editingItem !== null}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Documento
              </Button>
              {onClose && (
                <Button variant="outline" onClick={onClose}>
                  <X className="h-4 w-4 mr-2" />
                  Fechar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Document Selector */}
          {showDocumentSelector && (
            <Card className="mb-6 border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-blue-900">
                    📄 Selecionar Documento
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDocumentSelector(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Buscar por documento, departamento ou tipo..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Ação</TableHead>
                          <TableHead>Departamento</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Documento</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDocuments.map((doc) => (
                          <TableRow 
                            key={doc.id}
                            className={cn(
                              "hover:bg-gray-50",
                              selectedDocuments.includes(doc.id) && "bg-gray-100"
                            )}
                          >
                            <TableCell>
                              {selectedDocuments.includes(doc.id) ? (
                                <Badge variant="secondary" className="text-xs">
                                  Selecionado
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAddDocument(doc.id)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {doc.categoria || "N/A"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {doc.codigo && (
                                  <Badge variant="secondary" className="text-xs">
                                    {doc.codigo}
                                  </Badge>
                                )}
                                {doc.sigla_documento && (
                                  <Badge variant="outline" className="text-xs">
                                    {doc.sigla_documento}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{doc.name}</div>
                              {doc.group_name && (
                                <div className="text-sm text-gray-500">
                                  {doc.group_name}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Form for editing item */}
          {editingItem && (
            <Card className="mb-6 border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-green-900">
                    ✏️ Editando: {getDocumentName(editingItem.document_id)}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearForm}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Obrigatoriedade</Label>
                      <Controller
                        name="obrigatoriedade"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar obrigatoriedade" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Obrigatório">Obrigatório</SelectItem>
                              <SelectItem value="Recomendado">Recomendado</SelectItem>
                              <SelectItem value="Opcional">Opcional</SelectItem>
                              <SelectItem value="Requerido pelo Cliente">Requerido pelo Cliente</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Carga Horária</Label>
                      <Input
                        type="number"
                        min="0"
                        {...register("carga_horaria", { valueAsNumber: true })}
                        placeholder="Ex: 40"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Modalidade</Label>
                      <Controller
                        name="modalidade"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar modalidade" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Presencial">Presencial</SelectItem>
                              <SelectItem value="Online">Online</SelectItem>
                              <SelectItem value="Híbrido">Híbrido</SelectItem>
                              <SelectItem value="EAD">EAD</SelectItem>
                              <SelectItem value="N/A">N/A</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Regra de Validade</Label>
                      <Controller
                        name="regra_validade"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar regra" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Sem validade">Sem validade</SelectItem>
                              <SelectItem value="Válido por 1 ano">Válido por 1 ano</SelectItem>
                              <SelectItem value="Válido por 2 anos">Válido por 2 anos</SelectItem>
                              <SelectItem value="Válido por 3 anos">Válido por 3 anos</SelectItem>
                              <SelectItem value="Válido por 4 anos">Válido por 4 anos</SelectItem>
                              <SelectItem value="Válido por 5 anos">Válido por 5 anos</SelectItem>
                              <SelectItem value="Válido por 6 anos">Válido por 6 anos</SelectItem>
                              <SelectItem value="Válido por 7 anos">Válido por 7 anos</SelectItem>
                              <SelectItem value="Válido por 8 anos">Válido por 8 anos</SelectItem>
                              <SelectItem value="Válido por 9 anos">Válido por 9 anos</SelectItem>
                              <SelectItem value="Válido por 10 anos">Válido por 10 anos</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={clearForm}
                      disabled={isSubmitting}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      <Save className="h-4 w-4 mr-2" />
                      {isSubmitting ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Table of matrix items */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Documento</TableHead>
                  <TableHead className="font-semibold">Obrigatoriedade</TableHead>
                  <TableHead className="font-semibold">Carga Horária</TableHead>
                  <TableHead className="font-semibold">Modalidade</TableHead>
                  <TableHead className="font-semibold">Validade</TableHead>
                  <TableHead className="font-semibold w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrixItems.map((item) => (
                  <TableRow 
                    key={item.id}
                    className={cn(
                      "hover:bg-gray-50",
                      editingItem?.id === item.id && "bg-green-50"
                    )}
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.document.name}</div>
                        <div className="text-sm text-gray-500">
                          {item.document.categoria}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={item.obrigatoriedade === 'Obrigatório' ? 'default' : 'secondary'}
                        className={cn(
                          "text-xs",
                          item.obrigatoriedade === 'Obrigatório' && "bg-red-100 text-red-800",
                          item.obrigatoriedade === 'Recomendado' && "bg-yellow-100 text-yellow-800",
                          item.obrigatoriedade === 'Opcional' && "bg-green-100 text-green-800"
                        )}
                      >
                        {item.obrigatoriedade}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.carga_horaria ? (
                        <span className="font-medium">{item.carga_horaria}h</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {item.modalidade}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {item.regra_validade}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(item)}
                          disabled={editingItem !== null && editingItem.id !== item.id}
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          disabled={editingItem !== null}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                
                {matrixItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Nenhum documento adicionado à matriz
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este item da matriz? Esta ação não pode ser desfeita.
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
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
