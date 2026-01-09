import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Edit, Save, X, Search, Filter, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
        .order('nome_curso', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true, nullsFirst: false });
      
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
      const searchLower = searchTerm.toLowerCase();
      const filtered = documents.filter(doc => {
        const name = (doc.name || doc.nome_curso || "").toLowerCase();
        const categoria = (doc.categoria || "").toLowerCase();
        const siglaDoc = (doc.sigla_documento || doc.sigla || "").toLowerCase();
        const codigo = (doc.codigo || "").toLowerCase();
        const nomeCurso = (doc.nome_curso || "").toLowerCase();
        const grupo = (doc.group_name || "").toLowerCase();
        
        return name.includes(searchLower) ||
          categoria.includes(searchLower) ||
          siglaDoc.includes(searchLower) ||
          codigo.includes(searchLower) ||
          nomeCurso.includes(searchLower) ||
          grupo.includes(searchLower);
      });
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
        // Não incluir 'document' pois é apenas uma relação virtual, não uma coluna da tabela
        await createMatrixItem.mutateAsync({
          matrix_id: matrixId,
          document_id: data.document_id,
          obrigatoriedade: data.obrigatoriedade,
          carga_horaria: data.carga_horaria,
          modalidade: data.modalidade,
          regra_validade: data.regra_validade,
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

  // Função para converter validade do catálogo para formato do matrix_item
  const convertValidadeToRegraValidade = (validade: string | null | undefined): string => {
    if (!validade) return "Sem validade";
    
    const validadeLower = validade.toLowerCase().trim();
    
    // Se já está no formato "Válido por X anos", retornar como está
    if (validadeLower.includes("válido por")) {
      return validade;
    }
    
    // Extrair número de anos
    const anosMatch = validadeLower.match(/(\d+)\s*ano/i);
    if (anosMatch) {
      const anos = anosMatch[1];
      return `Válido por ${anos} ano${parseInt(anos) > 1 ? 's' : ''}`;
    }
    
    // Extrair número de meses
    const mesesMatch = validadeLower.match(/(\d+)\s*m[eê]s/i);
    if (mesesMatch) {
      const meses = mesesMatch[1];
      return `Válido por ${meses} mês${parseInt(meses) > 1 ? 'es' : ''}`;
    }
    
    // Se não conseguir converter, retornar como está ou "Sem validade"
    return validade || "Sem validade";
  };

  // Função para converter carga_horaria de texto para número
  const convertCargaHorariaToNumber = (cargaHoraria: string | null | undefined): number | undefined => {
    if (!cargaHoraria) return undefined;
    
    // Remover "h" ou "horas" e espaços, depois converter para número
    const cleaned = cargaHoraria.toString().replace(/[hhoras\s]/gi, '').trim();
    const parsed = parseInt(cleaned);
    
    return isNaN(parsed) ? undefined : parsed;
  };

  const handleAddDocument = async (documentId: string) => {
    // Buscar dados completos do documento do catálogo
    setIsSubmitting(true);
    try {
      // Buscar documento com campos básicos que sabemos que existem
      const { data: documentData, error: docError } = await supabase
        .from('documents_catalog')
        .select('modality')
        .eq('id', documentId)
        .single();

      if (docError && docError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Erro ao buscar dados do catálogo:', docError);
      }

      // Tentar buscar campos opcionais usando uma query raw SQL ou verificar se existem
      // Por enquanto, vamos usar valores padrão e permitir edição posterior
      let cargaHorariaCatalog: string | null = null;
      let validadeCatalog: string | null = null;
      
      // Tentar buscar campos opcionais - se não existirem, usar null
      try {
        // Usar uma query que não falha se os campos não existirem
        const { data: fullDoc } = await supabase
          .from('documents_catalog')
          .select('*')
          .eq('id', documentId)
          .single();
        
        // Verificar se os campos existem no objeto retornado
        if (fullDoc) {
          cargaHorariaCatalog = (fullDoc as any).carga_horaria || null;
          validadeCatalog = (fullDoc as any).validade || null;
        }
      } catch (e) {
        // Campos opcionais podem não existir, usar valores padrão
        console.log('Campos opcionais não encontrados, usando valores padrão');
      }

      // Extrair e converter os dados do catálogo
      const modalidadeCatalog = documentData?.modality || null;

      // Converter carga_horaria de texto para número
      const cargaHorariaNumber = convertCargaHorariaToNumber(cargaHorariaCatalog);
      
      // Converter validade para formato esperado
      const regraValidade = convertValidadeToRegraValidade(validadeCatalog);
      
      // Usar modalidade do catálogo ou padrão
      const modalidade = modalidadeCatalog || "Presencial";

      // Criar o item com os dados do catálogo
      // Não incluir 'document' pois é apenas uma relação virtual, não uma coluna da tabela
      await createMatrixItem.mutateAsync({
        matrix_id: matrixId,
        document_id: documentId,
        obrigatoriedade: "Obrigatório",
        carga_horaria: cargaHorariaNumber,
        modalidade: modalidade,
        regra_validade: regraValidade,
      });
      
      toast({
        title: "Documento adicionado",
        description: "O documento foi adicionado à matriz com sucesso. Dados do catálogo foram preenchidos automaticamente.",
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
    return doc?.nome_curso || doc?.name || "Documento não encontrado";
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
                          <TableHead>Categoria</TableHead>
                          <TableHead className="w-32">Código</TableHead>
                          <TableHead className="w-32">Sigla</TableHead>
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
                            <TableCell className="align-middle">
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
                            <TableCell className="align-middle">
                              <Badge variant="outline" className="text-xs">
                                {doc.categoria || doc.group_name || "N/A"}
                              </Badge>
                            </TableCell>
                            <TableCell className="align-middle">
                              {doc.codigo ? (
                                <Badge variant="secondary" className="text-xs whitespace-nowrap">
                                  {doc.codigo}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </TableCell>
                            <TableCell className="align-middle">
                              {(doc.sigla_documento || doc.sigla) ? (
                                <Badge variant="outline" className="text-xs whitespace-nowrap">
                                  {doc.sigla_documento || doc.sigla}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </TableCell>
                            <TableCell className="align-middle">
                              <div className="font-medium">{doc.nome_curso || doc.name || "Sem nome"}</div>
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
          {editingItem && (() => {
            const doc = documents.find(d => d.id === editingItem.document_id);
            // Buscar campos opcionais do documento (podem não existir)
            const catalogCargaHoraria = doc ? (doc as any)?.carga_horaria : null;
            const catalogValidade = doc ? (doc as any)?.validade : null;
            const catalogModalidade = doc ? ((doc as any)?.modalidade || (doc as any)?.modality) : null;
            
            return (
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
                {/* Mostrar dados originais do catálogo como referência */}
                {(catalogCargaHoraria || catalogValidade || catalogModalidade) && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs font-semibold text-blue-900 mb-2">📚 Dados originais do catálogo (referência):</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                      {catalogCargaHoraria && (
                        <div>
                          <span className="font-medium text-blue-700">Carga Horária: </span>
                          <span className="text-blue-900">{catalogCargaHoraria}</span>
                        </div>
                      )}
                      {catalogValidade && (
                        <div>
                          <span className="font-medium text-blue-700">Validade: </span>
                          <span className="text-blue-900">{catalogValidade}</span>
                        </div>
                      )}
                      {catalogModalidade && (
                        <div>
                          <span className="font-medium text-blue-700">Modalidade: </span>
                          <span className="text-blue-900">{catalogModalidade}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label>Obrigatoriedade</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-md p-4">
                              <div className="space-y-3 text-xs">
                                <p className="font-semibold text-sm mb-2">Legendas de Obrigatoriedade:</p>
                                <div className="space-y-2">
                                  <div>
                                    <p className="font-semibold text-red-600">1. Eliminatório</p>
                                    <p className="text-muted-foreground">Critério que desclassifica o candidato caso não seja atendido (CANDIDATO NÃO PODE SER ENVIADO AO CLIENTE).</p>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-orange-600">2. Obrigatório</p>
                                    <p className="text-muted-foreground">Requisito que deve ser cumprido (treinado após a contratação), porém não implica eliminação automática (CANDIDATO PODE SER ENVIADO AO CLIENTE).</p>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-yellow-600">3. Recomendado</p>
                                    <p className="text-muted-foreground">Item desejável, que agrega valor ao perfil, mas não é mandatório (CANDIDATO PODE SER ENVIADO AO CLIENTE).</p>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-blue-600">4. Requerido pelo cliente</p>
                                    <p className="text-muted-foreground">Exigência específica solicitada pelo cliente do nosso cliente para a posição (CANDIDATO PODE SER ENVIADO AO CLIENTE).</p>
                                  </div>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Controller
                        name="obrigatoriedade"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar obrigatoriedade" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Eliminatório">Eliminatório</SelectItem>
                              <SelectItem value="Obrigatório">Obrigatório</SelectItem>
                              <SelectItem value="Recomendado">Recomendado</SelectItem>
                              <SelectItem value="Requerido pelo cliente">Requerido pelo cliente</SelectItem>
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
            );
          })()}

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
                {matrixItems.map((item) => {
                  const doc = item.document as any;
                  const categoria = doc?.categoria || doc?.group_name || "-";
                  const codigo = doc?.codigo || "-";
                  const sigla = doc?.sigla_documento || doc?.sigla || "-";
                  const nomeCurso = doc?.nome_curso || doc?.name || "Sem nome";
                  
                  return (
                    <TableRow 
                      key={item.id}
                      className={cn(
                        "hover:bg-gray-50",
                        editingItem?.id === item.id && "bg-green-50"
                      )}
                    >
                      <TableCell>
                        <div className="space-y-1.5">
                          <div className="font-medium">{nomeCurso}</div>
                          <div className="flex flex-wrap gap-2 items-center">
                            <Badge variant="secondary" className="text-xs">
                              {categoria}
                            </Badge>
                            {codigo !== "-" && (
                              <span className="text-xs text-gray-600 font-medium">
                                Código: <span className="text-gray-800">{codigo}</span>
                              </span>
                            )}
                            {sigla !== "-" && (
                              <Badge variant="outline" className="text-xs">
                                {sigla}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    <TableCell>
                      <Badge 
                        variant={item.obrigatoriedade === 'Obrigatório' || item.obrigatoriedade === 'Eliminatório' ? 'default' : 'secondary'}
                        className={cn(
                          "text-xs",
                          item.obrigatoriedade === 'Eliminatório' && "bg-red-600 text-white",
                          item.obrigatoriedade === 'Obrigatório' && "bg-red-100 text-red-800",
                          item.obrigatoriedade === 'Recomendado' && "bg-yellow-100 text-yellow-800",
                          item.obrigatoriedade === 'Requerido pelo cliente' && "bg-blue-100 text-blue-800"
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
                  );
                })}
                
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
