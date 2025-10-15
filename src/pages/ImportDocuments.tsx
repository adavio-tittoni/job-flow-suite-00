import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Upload, FileText, CheckCircle, AlertCircle, X, ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCandidateDocuments } from "@/hooks/useCandidates";
import { useAIDocumentProcessing } from "@/hooks/useAIDocumentProcessing";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ImportedDocument {
  id: string;
  name: string;
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  extractedData?: any;
  error?: string;
  progress: number;
}

const ImportDocumentsPage = () => {
  const { id: candidateId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { createDocument } = useCandidateDocuments(candidateId!);
  const { processDocumentWithAI, isProcessing: aiProcessing, progress: aiProgress, sendToN8nWebhook, createProcessingDocument } = useAIDocumentProcessing();
  const { toast } = useToast();

  const [importedDocuments, setImportedDocuments] = useState<ImportedDocument[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newDocuments: ImportedDocument[] = Array.from(files).map(file => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: file.name,
      file,
      status: 'pending',
      progress: 0
    }));

    setImportedDocuments(prev => [...prev, ...newDocuments]);
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
    setImportedDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  const processDocumentWithAIService = async (file: File): Promise<any> => {
    try {
      const result = await processDocumentWithAI(file, candidateId!, {
        enableOCR: true,
        extractDates: true,
        extractNumbers: true,
        extractText: true,
        language: 'pt'
      });

      return result;
    } catch (error: any) {
      throw new Error(`Erro no processamento com IA: ${error.message}`);
    }
  };

  const processDocument = async (document: ImportedDocument) => {
    try {
      setImportedDocuments(prev => 
        prev.map(doc => 
          doc.id === document.id 
            ? { ...doc, status: 'processing', progress: 10 }
            : doc
        )
      );

      // 1. Upload arquivo para storage
      const fileUrl = await uploadFileToStorage(document.file);
      setImportedDocuments(prev => 
        prev.map(doc => 
          doc.id === document.id 
            ? { ...doc, progress: 30 }
            : doc
        )
      );

      // 2. Criar registro na tabela candidate_documents com status "processando"
      const documentId = await createProcessingDocument(candidateId!, document.file, fileUrl);
      setImportedDocuments(prev => 
        prev.map(doc => 
          doc.id === document.id 
            ? { ...doc, progress: 50, documentId }
            : doc
        )
      );

      // 3. Enviar para n8n webhook
      await sendToN8nWebhook([document.file], candidateId!, []);
      setImportedDocuments(prev => 
        prev.map(doc => 
          doc.id === document.id 
            ? { ...doc, progress: 80 }
            : doc
        )
      );

      // 4. Marcar como "enviado para processamento"
      setImportedDocuments(prev => 
        prev.map(doc => 
          doc.id === document.id 
            ? { 
                ...doc, 
                status: 'processing', 
                progress: 100,
                extractedData: {
                  document_name: document.file.name.split('.')[0],
                  document_type: 'Processando...',
                  detail: 'Documento enviado para processamento com IA via n8n',
                  arquivo_original: document.file.name,
                  file_url: fileUrl,
                  documentId: documentId
                }
              }
            : doc
        )
      );

      toast({
        title: "Documento enviado para processamento",
        description: "O documento foi enviado para processamento com IA. Aguarde a resposta do n8n.",
      });

    } catch (error: any) {
      setImportedDocuments(prev => 
        prev.map(doc => 
          doc.id === document.id 
            ? { 
                ...doc, 
                status: 'error', 
                error: error.message || 'Erro ao processar documento',
                progress: 0
              }
            : doc
        )
      );
    }
  };

  const uploadFileToStorage = async (file: File): Promise<string> => {
    const fileName = `${candidateId}/${Date.now()}_${file.name}`;
    
    const { error: uploadError } = await supabase.storage
      .from('candidate-documents')
      .upload(fileName, file);

    if (uploadError) throw uploadError;
    return fileName;
  };

  const processAllDocuments = async () => {
    setIsProcessing(true);
    
    const pendingDocuments = importedDocuments.filter(doc => doc.status === 'pending');
    
    for (const document of pendingDocuments) {
      await processDocument(document);
    }
    
    setIsProcessing(false);
    
    toast({
      title: "Processamento concluído",
      description: "Todos os documentos foram processados.",
    });
  };

  const saveDocumentToDatabase = async (document: ImportedDocument) => {
    if (!document.extractedData) return;

    try {
      await createDocument.mutateAsync({
        ...document.extractedData,
        candidate_id: candidateId!,
        group_name: 'Importado',
        modality: 'Presencial'
      });

      toast({
        title: "Documento salvo",
        description: `${document.name} foi salvo com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Erro ao salvar documento no banco de dados.",
        variant: "destructive",
      });
    }
  };

  const saveAllDocuments = async () => {
    const processingDocuments = importedDocuments.filter(doc => doc.status === 'processing');
    
    if (processingDocuments.length === 0) {
      toast({
        title: "Nenhum documento sendo processado",
        description: "Todos os documentos já foram enviados para processamento.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Documentos já enviados",
      description: "Os documentos já foram enviados para processamento com IA. Aguarde a resposta do n8n.",
    });

    // Navegar de volta para a página do candidato
    navigate(`/candidates/${candidateId}`);
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

      {/* Documents List */}
      {importedDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Documentos Importados ({importedDocuments.length})</CardTitle>
              <div className="flex gap-2">
                <Button 
                  onClick={processAllDocuments}
                  disabled={isProcessing || importedDocuments.every(doc => doc.status !== 'pending')}
                >
                  {isProcessing ? 'Processando...' : 'Processar Todos'}
                </Button>
                <Button 
                  onClick={saveAllDocuments}
                  disabled={!importedDocuments.some(doc => doc.status === 'processing')}
                  variant="outline"
                >
                  Verificar Status
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {importedDocuments.map((document) => (
                <div key={document.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(document.status)}
                      <div>
                        <h4 className="font-medium">{document.name}</h4>
                        <p className="text-sm text-gray-500">
                          {(document.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(document.status)}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDocument(document.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {document.status === 'processing' && (
                    <div className="space-y-2">
                      <Progress value={document.progress} className="h-2" />
                      <p className="text-sm text-gray-500">
                        Processando com IA... {document.progress}%
                      </p>
                    </div>
                  )}

                  {document.status === 'processing' && document.extractedData && (
                    <div className="space-y-3">
                      <Alert>
                        <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <AlertDescription>
                          Documento enviado para processamento com IA via n8n. Aguarde a resposta...
                        </AlertDescription>
                      </Alert>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Nome:</span> {document.extractedData.document_name}
                        </div>
                        <div>
                          <span className="font-medium">Status:</span> {document.extractedData.document_type}
                        </div>
                        <div>
                          <span className="font-medium">ID do Documento:</span> {document.extractedData.documentId}
                        </div>
                        <div>
                          <span className="font-medium">Arquivo:</span> {document.extractedData.arquivo_original}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          size="sm"
                          variant="outline"
                          disabled
                        >
                          Aguardando Processamento...
                        </Button>
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const dataStr = JSON.stringify(document.extractedData, null, 2);
                            const dataBlob = new Blob([dataStr], { type: 'application/json' });
                            const url = URL.createObjectURL(dataBlob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `${document.name}_status.json`;
                            link.click();
                          }}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Baixar Status
                        </Button>
                      </div>
                    </div>
                  )}

                  {document.status === 'completed' && document.extractedData && (
                    <div className="space-y-3">
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          Documento processado com sucesso! Dados extraídos automaticamente.
                        </AlertDescription>
                      </Alert>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Nome:</span> {document.extractedData.document_name}
                        </div>
                        <div>
                          <span className="font-medium">Tipo:</span> {document.extractedData.document_type}
                        </div>
                        <div>
                          <span className="font-medium">Número:</span> {document.extractedData.registration_number}
                        </div>
                        <div>
                          <span className="font-medium">Emissão:</span> {document.extractedData.issue_date}
                        </div>
                        <div>
                          <span className="font-medium">Validade:</span> {document.extractedData.expiry_date}
                        </div>
                        <div>
                          <span className="font-medium">Carga Horária:</span> {document.extractedData.carga_horaria_total}h
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          size="sm"
                          onClick={() => saveDocumentToDatabase(document)}
                        >
                          Salvar Documento
                        </Button>
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const dataStr = JSON.stringify(document.extractedData, null, 2);
                            const dataBlob = new Blob([dataStr], { type: 'application/json' });
                            const url = URL.createObjectURL(dataBlob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `${document.name}_dados.json`;
                            link.click();
                          }}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Baixar Dados
                        </Button>
                      </div>
                    </div>
                  )}

                  {document.status === 'error' && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Erro ao processar documento: {document.error}
                      </AlertDescription>
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
    </div>
  );
};

export default ImportDocumentsPage;
