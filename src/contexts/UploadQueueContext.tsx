import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAIDocumentProcessing } from "@/hooks/useAIDocumentProcessing";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as uploadQueueStore from "@/lib/uploadQueueStore";

export type QueueItemStatus = "pending" | "processing" | "completed" | "error";

export interface QueueItem {
  id: string;
  candidateId: string;
  fileName: string;
  status: QueueItemStatus;
  progress: number;
  documentId?: string;
  error?: string;
  extractedData?: Record<string, unknown>;
}

interface UploadQueueContextValue {
  items: QueueItem[];
  addJobs: (candidateId: string, files: File[]) => void;
  updateJob: (id: string, patch: Partial<QueueItem>) => void;
  clearCompleted: () => void;
  removeJob: (id: string) => void;
}

const UploadQueueContext = createContext<UploadQueueContextValue | null>(null);

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function QueueProcessor({ children }: { children: ReactNode }) {
  const { items, updateJob, clearCompleted } = useUploadQueue()!;
  const {
    uploadFileToStorage,
    createProcessingDocument,
    sendToN8nWebhookWithMatrix,
  } = useAIDocumentProcessing();
  const { toast } = useToast();
  const isProcessingRef = useRef(false);
  const lastToastRef = useRef(false);

  const processNext = useCallback(async () => {
    const pending = items.find((i) => i.status === "pending");
    if (!pending || isProcessingRef.current) return;
    isProcessingRef.current = true;

    const file = uploadQueueStore.getFile(pending.id);
    if (!file) {
      updateJob(pending.id, { status: "error", error: "Arquivo não encontrado na fila." });
      isProcessingRef.current = false;
      return;
    }
    updateJob(pending.id, { status: "processing", progress: 10 });

    try {
      const fileUrl = await uploadFileToStorage(file, pending.candidateId);
      updateJob(pending.id, { progress: 30 });

      const documentId = await createProcessingDocument(
        pending.candidateId,
        file,
        fileUrl
      );
      updateJob(pending.id, { progress: 50, documentId });

      const webhookResponse = await sendToN8nWebhookWithMatrix(
        [file],
        pending.candidateId,
        [],
        { documentId, fileStoragePath: fileUrl }
      );
      updateJob(pending.id, { progress: 80 });

      if (webhookResponse.isDocumentNotBelonging) {
        await supabase
          .from("candidate_documents")
          .update({
            document_name: "Documento não pertence ao candidato",
            document_type: "Rejeitado",
            detail: `Documento rejeitado: ${file.name}. ${webhookResponse.message || "O documento não pertence ao candidato."}`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", documentId);

        updateJob(pending.id, {
          status: "error",
          progress: 100,
          error: "Documento não pertence ao candidato",
          extractedData: {
            document_name: "Documento não pertence ao candidato",
            document_type: "Rejeitado",
            detail: webhookResponse.message,
            arquivo_original: file.name,
            file_url: fileUrl,
            documentId,
          },
        });
      } else if (webhookResponse.success) {
        updateJob(pending.id, {
          status: "completed",
          progress: 100,
          extractedData: {
            document_name: file.name.split(".")[0],
            document_type: "Processado",
            detail: webhookResponse.message || "Documento processado com sucesso.",
            arquivo_original: file.name,
            file_url: fileUrl,
            documentId,
          },
        });
        toast({
          title: "Documento processado",
          description: webhookResponse.message || "O documento foi processado com sucesso.",
        });
      } else {
        updateJob(pending.id, {
          status: "error",
          progress: 100,
          error: webhookResponse.message || "Erro ao processar documento",
          extractedData: {
            document_name: file.name.split(".")[0],
            document_type: "Erro",
            detail: webhookResponse.message || "Erro ao processar documento.",
            arquivo_original: file.name,
            file_url: fileUrl,
            documentId,
          },
        });
        toast({
          title: "Erro no processamento",
          description: webhookResponse.message || "Erro ao processar documento.",
          variant: "destructive",
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao processar documento";
      const isAlreadyExists = message.includes("DOCUMENTO_JA_EXISTE") || message.includes("já existe") || message.includes("already exists");
      const displayMessage = message.replace("DOCUMENTO_JA_EXISTE: ", "");
      updateJob(pending.id, {
        status: "error",
        error: displayMessage,
        progress: 0,
      });
      toast({
        title: isAlreadyExists ? "Documento já existe" : "Erro no processamento",
        description: displayMessage,
        variant: "destructive",
      });
    } finally {
      isProcessingRef.current = false;
    }
  }, [
    items,
    updateJob,
    uploadFileToStorage,
    createProcessingDocument,
    sendToN8nWebhookWithMatrix,
    toast,
  ]);

  useEffect(() => {
    if (items.length === 0) {
      lastToastRef.current = false;
      return;
    }
    const hasPending = items.some((i) => i.status === "pending");
    const hasProcessing = items.some((i) => i.status === "processing");
    if (hasPending && !isProcessingRef.current) {
      processNext();
    } else if (!hasPending && !hasProcessing && !lastToastRef.current) {
      lastToastRef.current = true;
      const hasAnyCompleted = items.some((i) => i.status === "completed");
      if (hasAnyCompleted) {
        toast({
          title: "Processamento em background concluído",
          description: "Todos os documentos da fila foram processados.",
        });
      }
      clearCompleted();
    }
  }, [items, processNext, clearCompleted, toast]);

  return <>{children}</>;
}

export function UploadQueueProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<QueueItem[]>([]);

  const addJobs = useCallback((candidateId: string, files: File[]) => {
    const newItems: QueueItem[] = files.map((file) => {
      const id = generateId();
      uploadQueueStore.setFile(id, file);
      return {
        id,
        candidateId,
        fileName: file.name,
        status: "pending" as QueueItemStatus,
        progress: 0,
      };
    });
    setItems((prev) => [...prev, ...newItems]);
  }, []);

  const updateJob = useCallback((id: string, patch: Partial<QueueItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }, []);

  const clearCompleted = useCallback(() => {
    setItems((prev) => {
      const toRemove = prev.filter(
        (i) => i.status === "completed" || i.status === "error"
      );
      uploadQueueStore.clearFiles(toRemove.map((i) => i.id));
      return prev.filter(
        (i) => i.status !== "completed" && i.status !== "error"
      );
    });
  }, []);

  const removeJob = useCallback((id: string) => {
    uploadQueueStore.removeFile(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const value: UploadQueueContextValue = {
    items,
    addJobs,
    updateJob,
    clearCompleted,
    removeJob,
  };

  return (
    <UploadQueueContext.Provider value={value}>
      <QueueProcessor>{children}</QueueProcessor>
    </UploadQueueContext.Provider>
  );
}

export function useUploadQueue(): UploadQueueContextValue | null {
  return useContext(UploadQueueContext);
}
