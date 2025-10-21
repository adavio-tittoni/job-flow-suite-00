import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, FileDown, Eye, Upload, RefreshCw } from "lucide-react";
import { format } from "date-fns";

// Utility function to safely format dates
const safeFormatDate = (dateString: string | null | undefined, formatStr: string = 'dd/MM/yyyy'): string => {
  if (!dateString || dateString.trim() === '' || dateString === 'null' || dateString === 'undefined') {
    return '-';
  }
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return '-';
  }
  
  try {
    return format(date, formatStr);
  } catch {
    return '-';
  }
};

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useCandidateDocuments, type CandidateDocument } from "@/hooks/useCandidates";
import { CandidateDocumentForm } from "./CandidateDocumentForm";
import { useNavigate } from "react-router-dom";

import { CandidateIndicators } from "./CandidateIndicators";
import { EnhancedDocumentsView } from "../EnhancedDocumentsView";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCandidateRequirementStatus, type RequirementStatus } from "@/hooks/useCandidateRequirementStatus";
import { useN8nWebhookListener } from "@/hooks/useN8nWebhookListener";
import { useQueryClient } from "@tanstack/react-query";

interface CandidateDocumentsTabProps {
  candidateId: string;
  candidateName: string;
}

export const CandidateDocumentsTab = ({ candidateId, candidateName }: CandidateDocumentsTabProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { documents, isLoading, deleteDocument, refetch } = useCandidateDocuments(candidateId);
  const [selectedDocument, setSelectedDocument] = useState<CandidateDocument | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [candidateMatrixId, setCandidateMatrixId] = useState<string | null>(null);
  
  // Webhook listener para atualizações de documentos
  const { isListening } = useN8nWebhookListener();
  
  // Preview modal states
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [previewDirectUrl, setPreviewDirectUrl] = useState<string>("");
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewName, setPreviewName] = useState<string>("");
  const [previewType, setPreviewType] = useState<string>("");
  
  // Cache de URLs assinadas por documento (id -> URL)
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  
  const [prefilledData, setPrefilledData] = useState<Partial<CandidateDocument> | null>(null);
  const { toast } = useToast();

  // Get requirement status for pending items
  const { data: requirementStatus } = useCandidateRequirementStatus(candidateId);

  // Fetch candidate matrix_id and listen for changes
  useEffect(() => {
    const fetchCandidateMatrix = async () => {
      const { data, error } = await supabase
        .from('candidates')
        .select('matrix_id')
        .eq('id', candidateId)
        .single();
      
      if (!error && data) {
        setCandidateMatrixId(data.matrix_id);
      }
    };

    fetchCandidateMatrix();
  }, [candidateId]);

  // Listen for matrix changes and refresh data
  useEffect(() => {
    if (candidateMatrixId) {
      console.log('Matrix changed, refreshing comparison data for matrix:', candidateMatrixId);
      // Force refresh of all related queries
      queryClient.invalidateQueries({ queryKey: ["candidate-requirement-status", candidateId] });
      queryClient.invalidateQueries({ queryKey: ["advanced-matrix-comparison", candidateId] });
      queryClient.invalidateQueries({ queryKey: ["enhanced-matrix-comparison", candidateId] });
      
      // Force immediate refetch
      queryClient.refetchQueries({ queryKey: ["candidate-requirement-status", candidateId] });
    }
  }, [candidateMatrixId, candidateId, queryClient]);

  // Escutar mudanças nos documentos via Supabase realtime
  useEffect(() => {
    console.log('Setting up realtime listener for candidate:', candidateId);
    
    const channel = supabase
      .channel(`candidate_documents_${candidateId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'candidate_documents',
          filter: `candidate_id=eq.${candidateId}`
        },
        (payload) => {
          console.log('Document change detected:', payload);
          console.log('Event type:', payload.eventType);
          console.log('New data:', payload.new);
          
          // Invalidar e refazer a query para atualizar a UI
          queryClient.invalidateQueries({ queryKey: ["candidate-documents", candidateId] });
          queryClient.invalidateQueries({ queryKey: ["candidate-requirement-status", candidateId] });
          
          // Forçar refetch imediato
          queryClient.refetchQueries({ queryKey: ["candidate-documents", candidateId] });
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      console.log('Cleaning up realtime listener for candidate:', candidateId);
      supabase.removeChannel(channel);
    };
  }, [candidateId, queryClient]);

  // Listen for candidate matrix changes via realtime
  useEffect(() => {
    console.log('Setting up candidate matrix change listener for:', candidateId);
    
    const matrixChannel = supabase
      .channel(`candidate_matrix_${candidateId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'candidates',
          filter: `id=eq.${candidateId}`,
        },
        (payload) => {
          console.log('Candidate matrix change detected:', payload);
          const newMatrixId = payload.new?.matrix_id;
          if (newMatrixId !== candidateMatrixId) {
            console.log('Matrix ID changed from', candidateMatrixId, 'to', newMatrixId);
            setCandidateMatrixId(newMatrixId);
            // Force refresh of all comparison data
            queryClient.invalidateQueries({ queryKey: ["candidate-requirement-status", candidateId] });
            queryClient.invalidateQueries({ queryKey: ["advanced-matrix-comparison", candidateId] });
            queryClient.invalidateQueries({ queryKey: ["enhanced-matrix-comparison", candidateId] });
            
            // Force immediate refetch
            queryClient.refetchQueries({ queryKey: ["candidate-requirement-status", candidateId] });
          }
        }
      )
      .subscribe((status) => {
        console.log('Candidate matrix realtime subscription status:', status);
      });

    return () => {
      console.log('Cleaning up candidate matrix listener for:', candidateId);
      supabase.removeChannel(matrixChannel);
    };
  }, [candidateId, candidateMatrixId, queryClient]);

  // Function to get automatic observation for a document based on matrix requirements
  const getDocumentObservation = (document: CandidateDocument): string => {
    if (!requirementStatus) return '-';
    
    // Find the requirement status for this document in pendingItems
    const matchingRequirement = requirementStatus.pendingItems.find(req => 
      req.existingCandidateDocument?.id === document.id ||
      (req.documentName === document.document_name && req.groupName === document.group_name)
    );
    
    return matchingRequirement?.observation || '-';
  };

  const handleEdit = (document: CandidateDocument) => {
    setSelectedDocument(document);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    setDocumentToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (documentToDelete) {
      await deleteDocument.mutateAsync(documentToDelete);
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  const handleViewDocument = async (document: CandidateDocument) => {
    if (!document.file_url) {
      toast({
        title: "Arquivo não encontrado",
        description: "Este documento não possui arquivo anexado.",
        variant: "destructive",
      });
      return;
    }

    // Open modal immediately and start loading
    setPreviewName(document.document_name || document.file_url);
    const fileType = getFileType(document.file_url);
    setPreviewType(fileType);
    setIsPreviewOpen(true);
    setIsLoadingPreview(true);
    setPreviewUrl("");
    setPreviewDirectUrl("");

    try {
      const { data, error } = await supabase.storage
        .from('candidate-documents')
        .createSignedUrl(document.file_url, 600); // 10 minutes expiration

      if (error) throw error;

      // Ensure absolute URL
      let signedUrl = data.signedUrl;
      if (signedUrl.startsWith('/')) {
        signedUrl = `https://qlcmxnajdrigntfmjelp.supabase.co/storage/v1${signedUrl}`;
      }

      // Store direct URL for buttons
      setPreviewDirectUrl(signedUrl);

      // Para PDFs, usar URL assinada diretamente (evita bloqueio do Chrome)
      // Para imagens, continuar usando Blob URL (funciona perfeitamente)
      if (fileType === 'pdf') {
        setPreviewUrl(signedUrl);
      } else {
        // Fetch document and create blob URL for images
        const response = await fetch(signedUrl);
        if (!response.ok) throw new Error('Failed to fetch document');
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        setPreviewUrl(blobUrl);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar documento",
        description: error.message || "Não foi possível acessar o documento. Verifique se o arquivo ainda existe.",
        variant: "destructive",
      });
      setIsPreviewOpen(false);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const getFileType = (filePath: string): string => {
    const extension = filePath.split('.').pop()?.toLowerCase() || '';
    if (['pdf'].includes(extension)) return 'pdf';
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension)) return 'image';
    return 'other';
  };

  // Helpers para URLs assinadas
  const ensureAbsoluteUrl = (signed: string) => {
    if (signed.startsWith('/')) {
      return `https://qlcmxnajdrigntfmjelp.supabase.co/storage/v1${signed}`;
    }
    return signed;
  };

  const generateSignedUrl = async (filePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from('candidate-documents')
      .createSignedUrl(filePath, 600); // 10 minutos
    if (error) return null;
    return ensureAbsoluteUrl(data.signedUrl);
  };

  const refreshAllSignedUrls = async () => {
    if (!documents || documents.length === 0) {
      setSignedUrls({});
      return;
    }
    const entries = await Promise.all(
      documents
        .filter((d) => !!d.file_url)
        .map(async (d) => {
          const url = await generateSignedUrl(d.file_url!);
          return [d.id, url] as const;
        })
    );
    const map: Record<string, string> = {};
    entries.forEach(([id, url]) => {
      if (url) map[id] = url;
    });
    setSignedUrls(map);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedDocument(null);
    setPrefilledData(null);
  };

  const handleAddPendingDocument = (item: RequirementStatus) => {
    // Prefill form data based on requirement
    const prefillData = {
      document_name: item.documentName,
      group_name: item.groupName,
      catalog_document_id: item.documentId,
      detail: item.observation,
      document_type: "",
      modality: "",
      registration_number: "",
      issue_date: "",
      expiry_date: "",
      issuing_authority: "",
      carga_horaria_total: undefined,
      carga_horaria_teorica: undefined,
      carga_horaria_pratica: undefined,
      link_validacao: "",
      file_url: "",
    } as any;
    setPrefilledData(prefillData);
    setSelectedDocument(null);
    setIsFormOpen(true);
  };

  const handleEditPendingDocument = (item: RequirementStatus) => {
    if (item.existingCandidateDocument) {
      setSelectedDocument(item.existingCandidateDocument as any);
      setIsFormOpen(true);
    }
  };

  // Filter to show only valid (non-expired) documents
  const validDocuments = documents.filter(doc => {
    if (!doc.expiry_date) return true; // Documents without expiry date are considered valid
    const expiry = new Date(doc.expiry_date);
    const today = new Date();
    return expiry.getTime() >= today.getTime(); // Show only non-expired documents
  });

  const handleExportDocuments = () => {
    if (!validDocuments || validDocuments.length === 0) {
      toast({
        title: "Nenhum documento",
        description: "Não há documentos válidos para exportar.",
        variant: "destructive",
      });
      return;
    }

    // Prepare CSV data (only valid documents, no observation)
    const csvData = validDocuments.map(doc => ({
      'Grupo': doc.group_name || '',
      'Categoria': doc.document_category || 'N/A', // Always use document_category from catalog
      'Tipo': doc.document_type || '',
      'Documento': doc.document_name || '',
      'Autoridade Emissora': doc.issuing_authority || '',
      'Modalidade': doc.modality || '',
      'Data Emissão': safeFormatDate(doc.issue_date),
      'Data Validade': safeFormatDate(doc.expiry_date),
      'Status de Validade': doc.expiry_date ? (() => {
        const expiry = new Date(doc.expiry_date);
        const today = new Date();
        const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays < 0 ? 'Vencido' : diffDays <= 30 ? `Vence em ${diffDays} dias` : 'Válido';
      })() : 'N/A',
      'Arquivo Original': doc.arquivo_original || ''
    }));

    // Convert to CSV
    const headers = Object.keys(csvData[0]);
    const csvContent = [
      '\uFEFF' + headers.join(';'), // Add BOM for UTF-8
      ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(';'))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `documentos_candidato_${new Date().getTime()}.csv`;
    link.click();

    toast({
      title: "Exportação concluída",
      description: "Lista de documentos exportada com sucesso.",
    });
  };

  const handleExportPending = async () => {
    if (!requirementStatus || requirementStatus.pendingItems.length === 0) {
      toast({
        title: "Nenhum documento pendente",
        description: "Não há documentos pendentes para exportar.",
        variant: "destructive",
      });
      return;
    }

    // Fetch candidate and matrix information
    let matrixInfo = "Não vinculado";
    try {
      const { data: candidate, error: candidateError } = await supabase
        .from('candidates')
        .select('matrix_id')
        .eq('id', candidateId)
        .single();

      if (!candidateError && candidate?.matrix_id) {
        const { data: matrix, error: matrixError } = await supabase
          .from('matrices')
          .select('empresa, cargo, versao_matriz')
          .eq('id', candidate.matrix_id)
          .single();

        if (!matrixError && matrix) {
          const versao = matrix.versao_matriz || '1';
          matrixInfo = `${matrix.empresa} - ${matrix.cargo} - v${versao}`;
        }
      }
    } catch (error) {
      console.error('Error fetching matrix info:', error);
    }

    // Format current date and time
    const now = new Date();
    const currentDateTime = format(now, 'dd/MM/yy - HH:mm');

    // Prepare CSV data for pending documents
    const csvData = requirementStatus.pendingItems.map(item => ({
      'Departamento': item.groupName || '',
      'Tipo': item.documentCategory || '-',
      'Documento': item.documentName || '',
      'Obrigatoriedade': item.obrigatoriedade || '-',
      'Status': item.status === 'pending' ? 'Pendente' : 'Parcial',
      'Observação': item.observation || '',
      'Validade': item.existingCandidateDocument?.expiry_date ? (() => {
        const expiry = new Date(item.existingCandidateDocument.expiry_date);
        const today = new Date();
        const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays < 0 ? 'Vencido' : diffDays <= 30 ? `Vence em ${diffDays} dias` : 'Válido';
      })() : item.existingCandidateDocument ? 'Ausente' : 'N/A',
      'Horas Requeridas': item.requiredHours?.toString() || '',
      'Horas Atuais': item.actualHours?.toString() || ''
    }));

    // Convert to CSV
    const headers = Object.keys(csvData[0]);
    const csvContent = [
      '\uFEFF' + 'DOCUMENTOS PENDENTES', // Add BOM for UTF-8 + header
      `Candidato: ${candidateName}`,
      `Matriz: ${matrixInfo}`,
      `Data/Hora: ${currentDateTime}`,
      '', // Empty line
      headers.join(';'),
      ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(';'))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `documentos_pendentes_${new Date().getTime()}.csv`;
    link.click();

    toast({
      title: "Exportação concluída",
      description: "Lista de documentos pendentes exportada com sucesso.",
    });
  };

  const getExpiryStatus = (expiryDate?: string) => {
    if (!expiryDate) return null;
    
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return <Badge variant="destructive">Vencido</Badge>;
    } else if (diffDays <= 30) {
      return <Badge variant="secondary">Vence em {diffDays} dias</Badge>;
    } else {
      return <Badge variant="info">Válido</Badge>;
    }
  };

  // Pré-gerar URLs assinadas e atualizar periodicamente
  useEffect(() => {
    refreshAllSignedUrls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents]);

  useEffect(() => {
    if (!documents || documents.length === 0) return;
    const id = setInterval(() => {
      refreshAllSignedUrls();
    }, 9 * 60 * 1000); // a cada 9 minutos
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents]);

  const handleOpenInNewTab = async (doc: CandidateDocument) => {
    if (!doc.file_url) return;
    const url = await generateSignedUrl(doc.file_url);
    if (url) {
      setSignedUrls((prev) => ({ ...prev, [doc.id]: url }));
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      // fallback para o modal de preview
      handleViewDocument(doc);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-32">Carregando documentos...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Indicators Dashboard */}
      <CandidateIndicators candidateId={candidateId} />

      {/* Enhanced Documents View */}
      <EnhancedDocumentsView 
        candidateId={candidateId}
        matrixId={candidateMatrixId}
        onAddDocument={(catalogDocId) => {
          // Buscar dados do documento do catálogo para preencher o formulário
          supabase
            .from('documents_catalog')
            .select('*')
            .eq('id', catalogDocId)
            .single()
            .then(({ data, error }) => {
              if (!error && data) {
                setPrefilledData({
                  document_name: data.name,
                  group_name: data.group_name,
                  document_category: data.document_category,
                  document_type: data.document_type,
                  codigo: data.codigo,
                  catalog_document_id: catalogDocId,
                });
                setIsFormOpen(true);
              }
            });
        }}
        onViewDocument={(documentId) => {
          const doc = documents.find(d => d.id === documentId);
          if (doc) {
            handleViewDocument(doc);
          }
        }}
      />

      {/* Document Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={(open) => {
        if (!open && previewUrl) {
          // Clean up blob URL when closing modal (only for images)
          if (previewType === 'image') {
            URL.revokeObjectURL(previewUrl);
          }
          setPreviewUrl("");
          setPreviewDirectUrl("");
        }
        setIsPreviewOpen(open);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {previewName}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 min-h-[500px] flex flex-col">
            {isLoadingPreview ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p>Carregando documento...</p>
                </div>
              </div>
            ) : previewUrl ? (
              <div className="flex-1 flex flex-col">
                {/* Document content */}
                <div className="flex-1 min-h-[400px] border rounded-lg overflow-hidden">
                  {previewType === 'pdf' ? (
                    <object
                      data={previewUrl}
                      type="application/pdf"
                      className="w-full h-full min-h-[400px]"
                    >
                      <iframe
                        src={previewUrl}
                        className="w-full h-full min-h-[400px]"
                        title="PDF Preview"
                      />
                    </object>
                  ) : previewType === 'image' ? (
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <img
                        src={previewUrl}
                        alt={previewName}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-center p-8">
                      <div>
                        <FileDown className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">Visualização não disponível</h3>
                        <p className="text-muted-foreground mb-4">
                          Este tipo de arquivo não pode ser visualizado no navegador.
                        </p>
                        <Button asChild>
                          <a href={previewDirectUrl} download className="inline-flex items-center gap-2">
                            <FileDown className="h-4 w-4" />
                            Baixar arquivo
                          </a>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Action buttons */}
                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button asChild variant="outline">
                    <a 
                      href={previewDirectUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Abrir em nova aba
                    </a>
                  </Button>
                  <Button asChild variant="outline">
                    <a 
                      href={previewDirectUrl} 
                      download
                      className="inline-flex items-center gap-2"
                    >
                      <FileDown className="h-4 w-4" />
                      Baixar
                    </a>
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Documentos do Candidato</CardTitle>
          <div className="flex gap-2">
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setSelectedDocument(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Documento
                </Button>
              </DialogTrigger>
              
              <Button 
                variant="outline" 
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => navigate(`/candidates/${candidateId}/import-documents`)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </Button>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {selectedDocument ? "Editar Documento" : "Novo Documento"}
                  </DialogTitle>
                </DialogHeader>
                <CandidateDocumentForm
                  candidateId={candidateId}
                  document={selectedDocument}
                  prefilledData={prefilledData}
                  onSuccess={handleFormClose}
                  onCancel={handleFormClose}
                />
              </DialogContent>
            </Dialog>

            <Button variant="outline" onClick={handleExportDocuments}>
              <FileDown className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {validDocuments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Nenhum documento cadastrado</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Sigla</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Horas Total</TableHead>
                      <TableHead>Modalidade</TableHead>
                      <TableHead>Data Emissão</TableHead>
                      <TableHead>Data Validade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
              <TableBody>
                {validDocuments.map((document) => (
                  <TableRow key={document.id}>
                     <TableCell>{document.document_category || "-"}</TableCell>
                     <TableCell>{document.sigla_documento || "N/A"}</TableCell>
                     <TableCell className="font-mono">{document.codigo || "-"}</TableCell>
                     <TableCell className="font-medium">{document.document_name}</TableCell>
                     <TableCell>{document.carga_horaria_total ? `${document.carga_horaria_total}h` : "-"}</TableCell>
                     <TableCell>{document.modality || "-"}</TableCell>
                     <TableCell>
                       {safeFormatDate(document.issue_date)}
                     </TableCell>
                    <TableCell>
                      {safeFormatDate(document.expiry_date)}
                    </TableCell>
                     <TableCell>
                       {getExpiryStatus(document.expiry_date)}
                     </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {document.file_url && (
                          signedUrls[document.id] ? (
                            <Button asChild variant="ghost" size="sm" title="Abrir em nova aba">
                              <a href={signedUrls[document.id]} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenInNewTab(document)}
                              title="Abrir em nova aba"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(document)}
                          title="Editar documento"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(document.id)}
                          title="Excluir documento"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
    
    {/* Delete Confirmation Dialog */}
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita.
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
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </div>
  );
};
