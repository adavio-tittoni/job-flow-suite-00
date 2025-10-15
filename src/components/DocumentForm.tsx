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
  categoria: z.string().min(1, "Categoria é obrigatória"),
  document_category: z.string().optional(),
  document_type: z.string().optional(),
  name: z.string().min(1, "Nome do documento é obrigatório"),
  detail: z.string().optional(),
  sigla_documento: z.string().optional(),
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
      categoria: document?.categoria || "",
      document_category: document?.document_category || "",
      document_type: document?.document_type || "",
      name: document?.name || "",
      detail: document?.detail || "",
      sigla_documento: document?.sigla_documento || "",
    },
  });

  const onSubmit = async (data: DocumentFormData) => {
    // Verificar se é uma criação e se já existe documento com o mesmo nome
    if (!document) {
      const isDuplicate = await checkDuplicate.mutateAsync(data.name);
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
      if (document) {
        await updateDocument.mutateAsync({ id: document.id, ...data });
        toast({
          title: "Documento atualizado com sucesso!",
        });
      } else {
        await createDocument.mutateAsync(data);
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
                      <Input placeholder="Ex: Certificação" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="document_category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria do Documento</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Técnica" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="document_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Código</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: CERT-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sigla_documento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sigla do Documento</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: RG, CPF, CNH" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Documento *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Certificação de Segurança" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="detail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Detalhes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descrição adicional do documento..." 
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
              Já existe um documento com o nome "{pendingData?.name}". Deseja criar mesmo assim?
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
