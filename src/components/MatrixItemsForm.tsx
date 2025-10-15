import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
        .select('id, name, categoria, document_type')
        .order('name');
      
      if (!error && data) {
        setDocuments(data);
      }
    };
    
    loadDocuments();
  }, []);

  // Filter documents based on search
  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    doc.categoria.toLowerCase().includes(searchValue.toLowerCase())
  );

  const handleDocumentSelect = (doc: Document) => {
    setSelectedDocument(doc);
    setValue("document_id", doc.id);
    setIsComboOpen(false);
    setSearchValue(doc.name);
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
      
      reset();
      setSelectedDocument(null);
      setSearchValue("");
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

  const handleClose = () => {
    reset();
    setSelectedDocument(null);
    setSearchValue("");
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
                    <Popover open={isComboOpen} onOpenChange={setIsComboOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={isComboOpen}
                          className="w-full justify-between"
                        >
                          {selectedDocument ? selectedDocument.name : "Selecionar documento..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput
                            placeholder="Buscar documento..."
                            value={searchValue}
                            onValueChange={setSearchValue}
                          />
                          <CommandList>
                            <CommandEmpty>Nenhum documento encontrado.</CommandEmpty>
                            <CommandGroup>
                              <ScrollArea className="h-48">
                                {filteredDocuments.map((doc) => (
                                  <CommandItem
                                    key={doc.id}
                                    value={doc.name}
                                    onSelect={() => handleDocumentSelect(doc)}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedDocument?.id === doc.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span>{doc.name}</span>
                                      <span className="text-sm text-muted-foreground">
                                        {doc.categoria}
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </ScrollArea>
                            </CommandGroup>
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
