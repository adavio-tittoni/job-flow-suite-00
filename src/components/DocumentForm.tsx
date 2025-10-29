import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useCreateDocument, useUpdateDocument, useCheckDuplicateDocument, DocumentCatalog } from "@/hooks/useDocuments";
import { useToast } from "@/hooks/use-toast";

const documentSchema = z.object({
  // Legacy fields
  name: z.string().optional(),
  group_name: z.string().optional(),
  document_category: z.string().optional(),
  document_type: z.string().optional(),
  issuing_authority: z.string().optional(),
  modality: z.string().optional(),
  
  // New unified fields
  categoria: z.string().min(1, "Categoria é obrigatória"),
  codigo: z.string().optional(),
  sigla: z.string().optional(),
  nome_curso: z.string().min(1, "Nome do curso é obrigatório"),
  descricao_curso: z.string().optional(),
  carga_horaria: z.string().optional(),
  validade: z.string().optional(),
  detalhes: z.string().optional(),
  url_site: z.string().optional(),
  flag_requisito: z.string().optional(),
  nome_ingles: z.string().optional(),
});

type DocumentFormData = z.infer<typeof documentSchema>;

interface DocumentFormProps {
  document?: DocumentCatalog;
  onClose: () => void;
}

export function DocumentForm({ document, onClose }: DocumentFormProps) {
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [pendingData, setPendingData] = useState<DocumentFormData | null>(null);
  
  const createDocument = useCreateDocument();
  const updateDocument = useUpdateDocument();
  const checkDuplicate = useCheckDuplicateDocument();
  const { toast } = useToast();

  const form = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      // Legacy fields
      name: document?.name || "",
      group_name: document?.group_name || "",
      document_category: document?.document_category || "",
      document_type: document?.document_type || "",
      issuing_authority: document?.issuing_authority || "",
      modality: document?.modality || "",
      
      // New unified fields
      categoria: document?.categoria || "",
      codigo: document?.codigo || "",
      sigla: document?.sigla || "",
      nome_curso: document?.nome_curso || "",
      descricao_curso: document?.descricao_curso || "",
      carga_horaria: document?.carga_horaria || "",
      validade: document?.validade || "",
      detalhes: document?.detalhes || "",
      url_site: document?.url_site || "",
      flag_requisito: document?.flag_requisito || "",
      nome_ingles: document?.nome_ingles || "",
    },
  });

  const onSubmit = async (data: DocumentFormData) => {
    // Verificar se é uma criação e se já existe documento com o mesmo nome
    if (!document) {
      const documentName = data.nome_curso || data.name || '';
      const isDuplicate = await checkDuplicate.mutateAsync(documentName);
      if (isDuplicate) {
        setPendingData(data);
        setShowDuplicateDialog(true);
        return;
      }
    }

    await saveDocument(data);
  };

  const saveDocument = async (data: DocumentFormData) => {
    try {
      // Garantir que o campo 'name' esteja preenchido para compatibilidade com busca e exibição
      // Se name estiver vazio, usar nome_curso como fallback
      const documentData = {
        ...data,
        name: data.name || data.nome_curso || "",
        // Também garantir que sigla_documento seja preenchido se sigla estiver preenchido
        sigla_documento: data.sigla_documento || data.sigla || undefined,
      };

      if (document) {
        await updateDocument.mutateAsync({ id: document.id, ...documentData });
        toast({
          title: "Documento atualizado com sucesso!",
        });
      } else {
        await createDocument.mutateAsync(documentData);
        toast({
          title: "Documento criado com sucesso!",
        });
      }
      onClose();
    } catch (error) {
      toast({
        title: "Erro ao salvar documento",
        description: "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmDuplicate = () => {
    if (pendingData) {
      saveDocument(pendingData);
    }
    setShowDuplicateDialog(false);
    setPendingData(null);
  };

  const handleCancelDuplicate = () => {
    setShowDuplicateDialog(false);
    setPendingData(null);
  };

  return (
    <>
      <div className="max-h-96 overflow-y-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="categoria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: CoC (Competência), NR-10, EPI" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="codigo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: A-II/1, NR-10, NR-6" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sigla"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sigla</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: COCN, BST, CBSP" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nome_curso"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Curso *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Oficial de Quarto de Navegação" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="carga_horaria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Carga Horária</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 40 h, 8-16 h" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="validade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Validade</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 5 anos, 2 anos" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="modalidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modalidade</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Presencial, EAD, Híbrido" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="url_site"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL do Site</FormLabel>
                    <FormControl>
                      <Input placeholder="https://exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="flag_requisito"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Flag Requisito</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: sim, não, sempre, depende" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nome_ingles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome em Inglês</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Officer in Charge of a Navigational Watch" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="descricao_curso"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição do Curso</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descrição detalhada do curso..." 
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="detalhes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Detalhes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Observações adicionais..." 
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createDocument.isPending || updateDocument.isPending}>
                {document ? "Atualizar" : "Salvar"}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Documento Duplicado</AlertDialogTitle>
            <AlertDialogDescription>
              Já existe um documento com o nome "{pendingData?.nome_curso || pendingData?.name}". Deseja criar mesmo assim?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDuplicate}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDuplicate}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
