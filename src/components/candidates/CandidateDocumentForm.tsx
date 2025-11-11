import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useCandidateDocuments, type CandidateDocument } from "@/hooks/useCandidates";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CandidateDocumentFormProps {
  candidateId: string;
  document?: CandidateDocument | null;
  prefilledData?: Partial<CandidateDocument> | null;
  onSuccess: () => void;
  onCancel: () => void;
}

type DocumentFormData = Omit<CandidateDocument, "id" | "created_at" | "updated_at" | "candidate_id"> & {
  arquivo_original?: string;
};

interface CatalogDocument {
  id: string;
  name: string;
  group_name: string;
  document_type: string | null;
  document_category: string | null;
  categoria: string | null;
  sigla_documento: string | null;
  modality: string | null;
  issuing_authority: string | null;
}

export const CandidateDocumentForm = ({ candidateId, document, prefilledData, onSuccess, onCancel }: CandidateDocumentFormProps) => {
  const { createDocument, updateDocument } = useCandidateDocuments(candidateId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [catalogDocuments, setCatalogDocuments] = useState<CatalogDocument[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [isComboOpen, setIsComboOpen] = useState(false);
  const [showNewDocDialog, setShowNewDocDialog] = useState(false);
  const [newDocumentData, setNewDocumentData] = useState<{ name: string; group_name: string } | null>(null);
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(
    document?.catalog_document_id || prefilledData?.catalog_document_id || null
  );
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogDocument | null>(null);
  const { toast } = useToast();
  
  // Get the selected catalog document for display
  const selectedCatalogDoc = selectedCatalogItem || catalogDocuments.find(doc => doc.id === selectedCatalogId);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    control,
  } = useForm<DocumentFormData>({
    defaultValues: document ? {
      group_name: document.group_name || "",
      document_name: document.document_name,
      document_type: document.document_type || "",
      modality: document.modality || "",
      registration_number: document.registration_number || "",
      issue_date: document.issue_date ? document.issue_date.split('T')[0] : "",
      expiry_date: document.expiry_date ? document.expiry_date.split('T')[0] : "",
      issuing_authority: document.issuing_authority || "",
      carga_horaria_total: document.carga_horaria_total || undefined,
      carga_horaria_teorica: document.carga_horaria_teorica || undefined,
      carga_horaria_pratica: document.carga_horaria_pratica || undefined,
      file_url: document.file_url || "",
      arquivo_original: document.arquivo_original || "",
      codigo: document.codigo || "",
    } : prefilledData ? {
      group_name: prefilledData.group_name || "",
      document_name: prefilledData.document_name || "",
      document_type: prefilledData.document_type || "",
      modality: prefilledData.modality || "",
      registration_number: prefilledData.registration_number || "",
      issue_date: prefilledData.issue_date ? prefilledData.issue_date.split('T')[0] : "",
      expiry_date: prefilledData.expiry_date ? prefilledData.expiry_date.split('T')[0] : "",
      issuing_authority: prefilledData.issuing_authority || "",
      carga_horaria_total: prefilledData.carga_horaria_total || undefined,
      carga_horaria_teorica: prefilledData.carga_horaria_teorica || undefined,
      carga_horaria_pratica: prefilledData.carga_horaria_pratica || undefined,
      file_url: prefilledData.file_url || "",
      arquivo_original: prefilledData.arquivo_original || "",
      codigo: prefilledData.codigo || "",
    } : {
      group_name: "",
      document_name: "",
      document_type: "",
      modality: "",
      registration_number: "",
      issue_date: "",
      expiry_date: "",
      issuing_authority: "",
      carga_horaria_total: undefined,
      carga_horaria_teorica: undefined,
      carga_horaria_pratica: undefined,
      file_url: "",
      arquivo_original: "",
      codigo: "",
    },
  });

  // Sync form when document prop changes (important for editing)
  useEffect(() => {
    if (document) {
      setValue("group_name", document.group_name || "");
      setValue("document_name", document.document_name);
      setValue("document_type", document.document_type || "");
      setValue("modality", document.modality || "");
      setValue("registration_number", document.registration_number || "");
      setValue("issue_date", document.issue_date ? document.issue_date.split('T')[0] : "");
      setValue("expiry_date", document.expiry_date ? document.expiry_date.split('T')[0] : "");
      setValue("issuing_authority", document.issuing_authority || "");
      setValue("carga_horaria_total", document.carga_horaria_total || undefined);
      setValue("carga_horaria_teorica", document.carga_horaria_teorica || undefined);
      setValue("carga_horaria_pratica", document.carga_horaria_pratica || undefined);
      setValue("file_url", document.file_url || "");
      setValue("arquivo_original", document.arquivo_original || "");
      setValue("codigo", document.codigo || "");
      setSelectedCatalogId(document.catalog_document_id || null);
    }
  }, [document, setValue]);

  // Load catalog documents
  useEffect(() => {
    const loadCatalogDocuments = async () => {
      const { data, error } = await supabase
        .from('documents_catalog')
        .select('id, name, group_name, document_type, document_category, categoria, sigla_documento, modality, issuing_authority')
        .order('name');
      
      if (!error && data) {
        setCatalogDocuments(data);
        
        // Set the selected catalog item if we have a catalog_document_id
        if (selectedCatalogId) {
          const selected = data.find(doc => doc.id === selectedCatalogId);
          if (selected) {
            setSelectedCatalogItem(selected);
          }
        }
      }
    };
    
    loadCatalogDocuments();
  }, [selectedCatalogId]);

  // Filter documents based on search
  const filteredDocuments = catalogDocuments.filter(doc =>
    doc.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    doc.group_name.toLowerCase().includes(searchValue.toLowerCase())
  );

  const handleDocumentSelect = (selectedDoc: CatalogDocument) => {
    setValue("document_name", selectedDoc.name);
    setValue("group_name", selectedDoc.group_name);
    setValue("modality", selectedDoc.modality || "");
    setValue("issuing_authority", selectedDoc.issuing_authority || "");
    setIsComboOpen(false);
    setSearchValue(selectedDoc.name);
    setSelectedCatalogId(selectedDoc.id);
    setSelectedCatalogItem(selectedDoc);
  };

  const handleCreateNewDocument = () => {
    if (!searchValue.trim()) return;
    
    // Check if document already exists
    const exists = catalogDocuments.some(doc => 
      doc.name.toLowerCase() === searchValue.toLowerCase()
    );
    
    if (exists) {
      toast({
        title: "Documento já existe",
        description: "Este documento já está cadastrado no catálogo.",
        variant: "destructive",
      });
      return;
    }

    setNewDocumentData({ name: searchValue, group_name: watch("group_name") || "" });
    setShowNewDocDialog(true);
  };

  const confirmCreateNewDocument = async () => {
    if (!newDocumentData) return;

    try {
      const { data, error } = await supabase
        .from('documents_catalog')
        .insert({
          name: newDocumentData.name,
          group_name: newDocumentData.group_name,
          document_category: null,
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setCatalogDocuments(prev => [...prev, data]);
      
      // Set form values
      setValue("document_name", data.name);
      setValue("group_name", data.group_name);
      setSelectedCatalogId(data.id);
      
      setShowNewDocDialog(false);
      setNewDocumentData(null);
      setIsComboOpen(false);
      
      toast({
        title: "Documento criado",
        description: "Novo documento foi adicionado ao catálogo.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao criar documento no catálogo: " + error.message,
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: DocumentFormData) => {
    setIsSubmitting(true);
    try {
      // Check for duplicate documents (same name and registration number for this candidate)
      if (!document) { // Only check for duplicates when creating new documents
        const { data: existingDocs, error: checkError } = await supabase
          .from('candidate_documents')
          .select('id, document_name, registration_number')
          .eq('candidate_id', candidateId)
          .eq('document_name', data.document_name);

        if (checkError) {
          console.error('Error checking duplicates:', checkError);
        } else if (existingDocs && existingDocs.length > 0) {
          // Check if there's a document with the same registration number (if provided)
          const duplicateByRegNumber = data.registration_number && 
            existingDocs.some(doc => doc.registration_number === data.registration_number);
          
          if (duplicateByRegNumber) {
            toast({
              title: "Documento duplicado",
              description: `Já existe um documento "${data.document_name}" com o mesmo número de registro para este candidato.`,
              variant: "destructive",
            });
            return;
          }
          
          // If no registration number provided, check for exact name match
          if (!data.registration_number) {
            toast({
              title: "Documento duplicado",
              description: `Já existe um documento "${data.document_name}" para este candidato. Para evitar duplicatas, adicione um número de registro ou altere o nome.`,
              variant: "destructive",
            });
            return;
          }
        }
      }

      let fileUrl = data.file_url;

      // Fix date timezone issues by setting dates at noon UTC
      const formatDateForSave = (dateStr: string) => {
        if (!dateStr) return undefined;
        const date = new Date(dateStr + 'T12:00:00.000Z'); // Set to noon UTC
        return date.toISOString();
      };

      const formattedData = {
        ...data,
        candidate_id: candidateId,
        file_url: fileUrl,
        catalog_document_id: selectedCatalogId || document?.catalog_document_id || null,
        issue_date: data.issue_date ? formatDateForSave(data.issue_date) : undefined,
        expiry_date: data.expiry_date ? formatDateForSave(data.expiry_date) : undefined,
        carga_horaria_total: data.carga_horaria_total ? Number(data.carga_horaria_total) : undefined,
        carga_horaria_teorica: data.carga_horaria_teorica ? Number(data.carga_horaria_teorica) : undefined,
        carga_horaria_pratica: data.carga_horaria_pratica ? Number(data.carga_horaria_pratica) : undefined,
        arquivo_original: data.arquivo_original || undefined,
      };

      if (document) {
        await updateDocument.mutateAsync({ id: document.id, ...formattedData });
      } else {
        await createDocument.mutateAsync(formattedData);
      }
      
      // Wait a moment to ensure the database has processed the transaction
      await new Promise(resolve => setTimeout(resolve, 100));
      
      onSuccess();
    } catch (error: any) {
      console.error("Erro ao salvar documento:", error);
      toast({
        title: "Erro ao salvar documento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Informações Básicas */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Informações do Documento</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="group_name">Categoria</Label>
              <Input
                id="group_name"
                value={selectedCatalogDoc?.categoria || ""}
                placeholder="Preenchido automaticamente"
                readOnly
                className="bg-muted"
              />
            </div>
            
            <div>
              <Label htmlFor="document_name">Documento *</Label>
              <Controller
                name="document_name"
                control={control}
                rules={{ required: "Nome do documento é obrigatório" }}
                render={({ field }) => (
                  <Popover open={isComboOpen} onOpenChange={setIsComboOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={isComboOpen}
                        className={cn(
                          "w-full justify-between",
                          errors.document_name && "border-red-500"
                        )}
                      >
                        {field.value || "Selecione ou digite um documento..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0 z-50">
                      <Command className="w-full">
                        <CommandInput 
                          placeholder="Buscar documento..." 
                          value={searchValue}
                          onValueChange={(value) => {
                            setSearchValue(value);
                            setValue("document_name", value);
                          }}
                        />
                        <CommandList className="max-h-[300px] overflow-y-auto">
                          <CommandEmpty>
                            <div className="p-4 text-center">
                              <p className="text-sm text-muted-foreground mb-3">
                                Documento não encontrado no catálogo.
                              </p>
                              <Button 
                                size="sm" 
                                onClick={handleCreateNewDocument}
                                disabled={!searchValue.trim()}
                              >
                                Criar "{searchValue}"
                              </Button>
                            </div>
                          </CommandEmpty>
                          <CommandGroup>
                            {filteredDocuments.map((doc) => (
                              <CommandItem
                                key={doc.id}
                                value={doc.name}
                                onSelect={() => handleDocumentSelect(doc)}
                                className="cursor-pointer px-3 py-2"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4 shrink-0",
                                    field.value === doc.name ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col gap-1 min-w-0 flex-1">
                                  <span className="font-medium truncate">{doc.name}</span>
                                  <span className="text-sm text-muted-foreground truncate">{doc.group_name}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.document_name && <span className="text-sm text-red-500">{errors.document_name.message}</span>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="sigla_documento">Sigla</Label>
              <Input
                id="sigla_documento"
                value={selectedCatalogDoc?.sigla_documento || "N/A"}
                placeholder="Preenchido automaticamente"
                readOnly
                className="bg-muted"
              />
            </div>
            
            <div>
              <Label htmlFor="codigo">Tipo de Código *</Label>
              <Input
                id="codigo"
                {...register("codigo")}
                placeholder="Ex: NR-35, NR-37, STWC, etc."
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Código usado para comparação com a matriz
              </p>
            </div>
            
            <div>
              <Label htmlFor="modality">Modalidade</Label>
              <Input
                id="modality"
                {...register("modality")}
                placeholder="Ex: Presencial, EAD, etc."
              />
            </div>

          </div>
        </div>

        {/* Dados de Registro */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Dados de Registro</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="registration_number">Número de Registro</Label>
              <Input
                id="registration_number"
                {...register("registration_number")}
              />
            </div>
            
            <div>
              <Label htmlFor="issuing_authority">Órgão Emissor</Label>
              <Input
                id="issuing_authority"
                {...register("issuing_authority")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="issue_date">Data de Emissão</Label>
              <Input
                id="issue_date"
                type="date"
                {...register("issue_date")}
              />
            </div>
            
            <div>
              <Label htmlFor="expiry_date">Data de Validade</Label>
              <Input
                id="expiry_date"
                type="date"
                {...register("expiry_date")}
              />
            </div>
          </div>
        </div>

        {/* Carga Horária */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Carga Horária</h3>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="carga_horaria_total">Total</Label>
              <Input
                id="carga_horaria_total"
                type="number"
                {...register("carga_horaria_total")}
              />
            </div>
            
            <div>
              <Label htmlFor="carga_horaria_teorica">Teórica</Label>
              <Input
                id="carga_horaria_teorica"
                type="number"
                {...register("carga_horaria_teorica")}
              />
            </div>
            
            <div>
              <Label htmlFor="carga_horaria_pratica">Prática</Label>
              <Input
                id="carga_horaria_pratica"
                type="number"
                {...register("carga_horaria_pratica")}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="arquivo_original">Arquivo Original</Label>
            <Input
              id="arquivo_original"
              {...register("arquivo_original")}
              placeholder="Referência do arquivo original..."
            />
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : document ? "Atualizar" : "Criar"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>

      {/* Confirmation dialog for new document creation */}
      <AlertDialog open={showNewDocDialog} onOpenChange={setShowNewDocDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Criar novo documento no catálogo</AlertDialogTitle>
            <AlertDialogDescription>
              O documento "{newDocumentData?.name}" não existe na base de documentos. 
              Deseja criá-lo no catálogo para uso futuro?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowNewDocDialog(false);
              setNewDocumentData(null);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmCreateNewDocument}>
              Sim, criar documento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
