import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Upload, FileText, CheckCircle, AlertCircle, X, ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useCandidateDocuments } from "@/hooks/useCandidates";
import { useCandidateVacancyAutoLink } from "@/hooks/useCandidateVacancyAutoLink";
import { useUploadQueue } from "@/contexts/UploadQueueContext";
import { useToast } from "@/hooks/use-toast";
import type { QueueItem } from "@/contexts/UploadQueueContext";

const ImportDocumentsPage = () => {
  const { id: candidateId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { createDocument } = useCandidateDocuments(candidateId!);
  const queue = useUploadQueue();
  const { toast } = useToast();
  
  useCandidateVacancyAutoLink(candidateId!);

  const [dragActive, setDragActive] = useState(false);
  const [documentNotBelongingDialog, setDocumentNotBelongingDialog] = useState<{
    open: boolean;
    documentId?: string;
    fileName?: string;
  }>({ open: false });

  const queueItems = queue?.items.filter((i) => i.candidateId === candidateId) ?? [];
  const totalInQueue = queue?.items.length ?? 0;
  const isProcessing = queueItems.some((i) => i.status === "processing" || i.status === "pending");

  const handleFileSelect = (files: FileList | null) => {
    if (!files || !candidateId || !queue) return;
    queue.addJobs(candidateId, Array.from(files));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const removeDocument = (id: string) => {
    queue?.removeJob(id);
  };

  const saveDocumentToDatabase = async (item: QueueItem) => {
    if (!item.extractedData || !candidateId) return;
    try {
      await createDocument.mutateAsync({
        ...item.extractedData,
        candidate_id: candidateId,
        group_name: "Importado",
        modality: "Presencial",
      });
      toast({
        title: "Documento salvo",
        description: `${item.fileName} foi salvo com sucesso.`,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Erro ao salvar documento.";
      toast({
        title: "Erro ao salvar",
        description: msg,
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'processing':
        return <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Processado</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processando</Badge>;
      default:
        return <Badge variant="outline">Pendente</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(`/candidates/${candidateId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Importar Documentos</h1>
            <p className="text-muted-foreground">
              Faça upload de documentos para processamento automático com IA
            </p>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Upload de Documentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Arraste e solte seus documentos aqui
            </h3>
            <p className="text-gray-500 mb-4">
              ou clique para selecionar arquivos
            </p>
            <Button onClick={() => fileInputRef.current?.click()}>
              Selecionar Arquivos
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* Documents List - fila global; processamento em background um a um */}
      {queueItems.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Documentos na fila ({queueItems.length} deste candidato
                {totalInQueue > queueItems.length ? ` · ${totalInQueue} no total` : ""})
              </CardTitle>
              <div className="flex gap-2">
                {isProcessing && (
                  <span className="text-sm text-muted-foreground">Processando em background...</span>
                )}
                {queueItems.length > 0 &&
                  !isProcessing &&
                  queueItems.every((i) => i.status === "completed" || i.status === "error") && (
                    <Button onClick={() => navigate(`/candidates/${candidateId}`)} variant="default">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Voltar ao Candidato
                    </Button>
                  )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {queueItems.map((item) => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(item.status)}
                      <div>
                        <h4 className="font-medium">{item.fileName}</h4>
                        <p className="text-sm text-gray-500">
                          {item.status === "processing" ? `${item.progress}%` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(item.status)}
                      {item.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDocument(item.id)}
                          aria-label="Remover da fila"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      {item.status === "completed" && item.extractedData && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => saveDocumentToDatabase(item)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Salvar no banco
                        </Button>
                      )}
                    </div>
                  </div>

                  {item.status === "processing" && (
                    <>
                      <Progress value={item.progress} className="h-2" />
                      <Alert className="mt-2">
                        <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <AlertDescription>
                          Documento enviado para processamento com IA via n8n. Aguarde a resposta...
                        </AlertDescription>
                      </Alert>
                    </>
                  )}

                  {item.status === "completed" && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>Documento processado com sucesso!</AlertDescription>
                    </Alert>
                  )}

                  {item.status === "error" && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>Erro: {item.error}</AlertDescription>
                    </Alert>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Como Funciona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <Upload className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-medium mb-1">1. Upload</h3>
              <p className="text-sm text-gray-500">
                Faça upload dos documentos do candidato
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-medium mb-1">2. Processamento IA</h3>
              <p className="text-sm text-gray-500">
                IA extrai automaticamente os dados dos documentos
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-medium mb-1">3. Salvamento</h3>
              <p className="text-sm text-gray-500">
                Dados são salvos automaticamente no sistema
              </p>
            </div>
          </div>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Formatos suportados:</strong> PDF, JPG, PNG, DOC, DOCX. 
              A IA irá extrair automaticamente informações como nome do documento, 
              datas de emissão e validade, número de registro, carga horária e outros dados relevantes.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Diálogo para documento que não pertence ao candidato */}
      <AlertDialog open={documentNotBelongingDialog.open} onOpenChange={(open) => {
        if (!open) {
          setDocumentNotBelongingDialog({ open: false });
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Documento não pertence ao candidato
            </AlertDialogTitle>
            <AlertDialogDescription>
              O documento <strong>{documentNotBelongingDialog.fileName}</strong> foi identificado como não pertencente ao candidato.
              <br /><br />
              O documento foi salvo com o nome "Documento não pertence ao candidato" para que você possa excluí-lo posteriormente se necessário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => {
              setDocumentNotBelongingDialog({ open: false });
            }}>
              Entendi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ImportDocumentsPage;
