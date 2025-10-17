import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
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
}

interface MatrixItemsFormProps {
  matrixId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const MatrixItemsForm = ({ matrixId, isOpen, onClose }: MatrixItemsFormProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [isComboOpen, setIsComboOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: matrixItems = [], isLoading } = useMatrixItems(matrixId);
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
      obrigatoriedade: "",
      carga_horaria: undefined,
      modalidade: "",
      regra_validade: "",
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
        console.log('Documents loaded:', data.length, 'documents');
        console.log('Sample document:', data[0]);
        
        // Check if NR-35 document is loaded
        const nr35Doc = data.find(doc => (doc as any).codigo === 'NR-35');
        if (nr35Doc) {
          console.log('NR-35 document found:', nr35Doc);
        } else {
          console.log('NR-35 document NOT found in loaded data');
          console.log('Available codigos:', data.map(doc => (doc as any).codigo).filter(Boolean));
        }
        
        setDocuments(data);
      } else if (error) {
        console.error('Error loading documents:', error);
      }
    };
    
    loadDocuments();
  }, []);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      clearForm();
    }
  }, [isOpen]);

  // Filter documents based on search
  const filteredDocuments = documents.filter(doc => {
    if (!searchValue.trim()) return true;
    
    const searchTerm = searchValue.toLowerCase().trim();
    
    // Check each field individually for better debugging
    const nameMatch = doc.name && doc.name.toLowerCase().includes(searchTerm);
    const categoriaMatch = doc.categoria && doc.categoria.toLowerCase().includes(searchTerm);
    const siglaMatch = (doc as any).sigla && (doc as any).sigla.toLowerCase().includes(searchTerm);
    const siglaDocMatch = doc.sigla_documento && doc.sigla_documento.toLowerCase().includes(searchTerm);
    const codigoMatch = (doc as any).codigo && (doc as any).codigo.toLowerCase().includes(searchTerm);
    const nomeCursoMatch = (doc as any).nome_curso && (doc as any).nome_curso.toLowerCase().includes(searchTerm);
    const docTypeMatch = doc.document_type && doc.document_type.toLowerCase().includes(searchTerm);
    
    const matches = nameMatch || categoriaMatch || siglaMatch || siglaDocMatch || codigoMatch || nomeCursoMatch || docTypeMatch;
    
    // Debug log for "35" search
    if (searchTerm === '35') {
      console.log('Searching for "35":', {
        docName: doc.name,
        codigo: (doc as any).codigo,
        sigla: (doc as any).sigla,
        sigla_documento: doc.sigla_documento,
        categoria: doc.categoria,
        nome_curso: (doc as any).nome_curso,
        document_type: doc.document_type,
        nameMatch,
        categoriaMatch,
        siglaMatch,
        siglaDocMatch,
        codigoMatch,
        nomeCursoMatch,
        docTypeMatch,
        matches,
        searchTerm
      });
      
      // Special log for NR-35 document
      if ((doc as any).codigo === 'NR-35') {
        console.log('*** FOUND NR-35 DOCUMENT ***', {
          doc,
          codigoMatch,
          matches,
          searchTerm
        });
      }
    }
    
    return matches;
  });

  // Debug log for filtered results
  if (searchValue === '35') {
    console.log('Filtered documents count:', filteredDocuments.length);
    console.log('Filtered documents:', filteredDocuments.map(doc => ({
      name: doc.name,
      codigo: (doc as any).codigo,
      sigla: (doc as any).sigla
    })));
  }

  const handleDocumentSelect = (doc: Document) => {
    console.log('handleDocumentSelect called with:', doc);
    setSelectedDocument(doc);
    setValue("document_id", doc.id);
    setIsComboOpen(false);
    // Show name with sigla and codigo if available
    const parts = [doc.name || (doc as any).nome_curso];
    if ((doc as any).sigla) {
      parts.push(`(${(doc as any).sigla})`);
    }
    if (doc.sigla_documento) {
      parts.push(`(${doc.sigla_documento})`);
    }
    if ((doc as any).codigo) {
      parts.push(`[${(doc as any).codigo}]`);
    }
    setSearchValue(parts.join(' '));
    console.log('Document selected successfully:', parts.join(' '));
  };

  const onSubmit = async (data: MatrixItemFormData) => {
    setIsSubmitting(true);
    try {
      await createMatrixItem.mutateAsync({
        matrix_id: matrixId,
        ...data,
      });
      
      toast({
        title: "Item adicionado",
        description: "O item foi adicionado à matriz com sucesso.",
      });
      
      // Reset form and clear all states
      clearForm();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao adicionar o item.",
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
      obrigatoriedade: "",
      carga_horaria: undefined,
      modalidade: "",
      regra_validade: "",
    });
    setSelectedDocument(null);
    setSearchValue("");
    setIsComboOpen(false);
  };

  const handleClose = () => {
    clearForm();
    onClose();
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <div className="flex items-center justify-center h-32">
            <p>Carregando itens da matriz...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Gerenciar Itens da Matriz</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col h-full">
            {/* Form to add new item */}
            <div className="border-b pb-4 mb-4">
              <h3 className="text-lg font-medium mb-4">Adicionar Novo Item</h3>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="document">Documento</Label>
                    <Popover open={isComboOpen} onOpenChange={(open) => {
                      console.log('Popover open changed:', open);
                      setIsComboOpen(open);
                    }}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={isComboOpen}
                          className="w-full justify-between"
                        >
                          {selectedDocument ? (
                            <div className="flex items-center gap-2">
                              <span>{selectedDocument.name || selectedDocument.nome_curso}</span>
                              {selectedDocument.sigla && (
                                <Badge variant="outline" className="text-xs">
                                  {selectedDocument.sigla}
                                </Badge>
                              )}
                              {selectedDocument.sigla_documento && (
                                <Badge variant="outline" className="text-xs">
                                  {selectedDocument.sigla_documento}
                                </Badge>
                              )}
                              {selectedDocument.codigo && (
                                <Badge variant="secondary" className="text-xs">
                                  {selectedDocument.codigo}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            "Selecionar documento..."
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput
                            placeholder="Buscar por nome, categoria, sigla ou código..."
                            value={searchValue}
                            onValueChange={setSearchValue}
                          />
                          <CommandList>
                            {filteredDocuments.length === 0 ? (
                              <CommandEmpty>Nenhum documento encontrado.</CommandEmpty>
                            ) : (
                              <CommandGroup>
                                <ScrollArea className="h-48">
                                  {(() => {
                                    if (searchValue === '35') {
                                      console.log('Rendering documents:', filteredDocuments.length, 'documents');
                                    }
                                    return null;
                                  })()}
                                  {filteredDocuments.map((doc) => (
                                  <CommandItem
                                    key={doc.id}
                                    value={`${doc.name} ${(doc as any).codigo || ''} ${(doc as any).sigla || ''}`.trim()}
                                    onSelect={() => {
                                      console.log('Selecting document:', doc);
                                      handleDocumentSelect(doc);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedDocument?.id === doc.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-2">
                                        <span>{doc.name || doc.nome_curso}</span>
                                        {doc.sigla && (
                                          <Badge variant="outline" className="text-xs">
                                            {doc.sigla}
                                          </Badge>
                                        )}
                                        {doc.sigla_documento && (
                                          <Badge variant="outline" className="text-xs">
                                            {doc.sigla_documento}
                                          </Badge>
                                        )}
                                        {doc.codigo && (
                                          <Badge variant="secondary" className="text-xs">
                                            {doc.codigo}
                                          </Badge>
                                        )}
                                      </div>
                                      <span className="text-sm text-muted-foreground">
                                        {doc.categoria}
                                      </span>
                                    </div>
                                  </CommandItem>
                                  ))}
                                </ScrollArea>
                              </CommandGroup>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {errors.document_id && (
                      <p className="text-sm text-destructive">{errors.document_id.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="obrigatoriedade">Obrigatoriedade</Label>
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
                    {errors.obrigatoriedade && (
                      <p className="text-sm text-destructive">{errors.obrigatoriedade.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="carga_horaria">Carga Horária (opcional)</Label>
                    <Input
                      id="carga_horaria"
                      type="number"
                      min="0"
                      {...register("carga_horaria", { valueAsNumber: true })}
                      placeholder="Ex: 40"
                    />
                    {errors.carga_horaria && (
                      <p className="text-sm text-destructive">{errors.carga_horaria.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="modalidade">Modalidade</Label>
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
                    {errors.modalidade && (
                      <p className="text-sm text-destructive">{errors.modalidade.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="regra_validade">Regra de Validade</Label>
                    <Controller
                      name="regra_validade"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar regra" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Válido por 2 anos">Válido por 2 anos</SelectItem>
                            <SelectItem value="Válido por 3 anos">Válido por 3 anos</SelectItem>
                            <SelectItem value="Válido por 5 anos">Válido por 5 anos</SelectItem>
                            <SelectItem value="Sem validade">Sem validade</SelectItem>
                            <SelectItem value="Conforme especificação">Conforme especificação</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.regra_validade && (
                      <p className="text-sm text-destructive">{errors.regra_validade.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmitting}>
                    <Plus className="h-4 w-4 mr-2" />
                    {isSubmitting ? "Adicionando..." : "Adicionar Item"}
                  </Button>
                </div>
              </form>
            </div>

            {/* List of existing items */}
            <div className="flex-1 overflow-hidden">
              <h3 className="text-lg font-medium mb-4">Itens da Matriz ({matrixItems.length})</h3>
              
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {matrixItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{item.document.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.document.categoria} • {item.obrigatoriedade}
                          {item.carga_horaria && ` • ${item.carga_horaria}h`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Modalidade: {item.modalidade} • Validade: {item.regra_validade}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  {matrixItems.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum item adicionado à matriz
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={handleClose}>
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
