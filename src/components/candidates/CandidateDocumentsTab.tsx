import { useState, useEffect } from "react";
import { Plus, Trash2, FileDown, Eye, Upload, RefreshCw, Copy } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";

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
import { useCandidateRequirementStatus, type RequirementStatus, type RequirementStatusResult } from "@/hooks/useCandidateRequirementStatus";
import { useN8nWebhookListener } from "@/hooks/useN8nWebhookListener";
import { useQueryClient } from "@tanstack/react-query";
import { useDocumentComparisons } from "@/hooks/useDocumentComparisons";

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
  
  // Get document comparisons to check if documents have been compared
  const { data: documentComparisonsData } = useDocumentComparisons(candidateId);

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
          
          // Don't refetch if form is open to prevent resetting form state
          if (isFormOpen) {
            console.log('Form is open, skipping refetch to prevent form reset');
            return;
          }
          
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
  }, [candidateId, queryClient, isFormOpen]);

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
    const matchingRequirement = (requirementStatus as RequirementStatusResult).pendingItems.find(req => 
      req.existingCandidateDocument?.id === document.id ||
      (req.documentName === document.document_name && req.groupName === document.group_name)
    );
    
    return matchingRequirement?.observation || '-';
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

  // Normalize file_url: extract relative path from full URL if needed
  // This handles URLs from n8n that might be download URLs with query parameters
  const normalizeFilePath = (fileUrl: string): string => {
    // If it's already a relative path (e.g., "candidateId/filename.pdf"), return as is
    if (!fileUrl.includes('http://') && !fileUrl.includes('https://') && !fileUrl.includes('supabase.co')) {
      return fileUrl;
    }
    
    // Remove query parameters (like ?download, ?token=, etc.) before parsing
    const urlWithoutQuery = fileUrl.split('?')[0];
    
    // If it's a full URL, extract the relative path
    // Examples:
    // - https://xxx.supabase.co/storage/v1/object/public/candidate-documents/candidateId/file.pdf?download
    // - https://xxx.supabase.co/storage/v1/object/sign/candidate-documents/candidateId/file.pdf?token=...
    // Should become: candidateId/file.pdf
    try {
      const url = new URL(urlWithoutQuery);
      const pathParts = url.pathname.split('/').filter(part => part !== ''); // Remove empty parts
      
      // Find the index of 'candidate-documents'
      const bucketIndex = pathParts.findIndex(part => part === 'candidate-documents');
      if (bucketIndex !== -1 && bucketIndex + 1 < pathParts.length) {
        // Get everything after 'candidate-documents'
        const relativePath = pathParts.slice(bucketIndex + 1).join('/');
        console.log('Normalized path from URL:', { original: fileUrl, normalized: relativePath });
        return relativePath;
      }
      
      // Alternative: if it's /object/public/candidate-documents/... or /object/sign/candidate-documents/...
      const objectIndex = pathParts.findIndex(part => part === 'object');
      if (objectIndex !== -1) {
        // Check for 'public' or 'sign' after 'object'
        const publicOrSignIndex = pathParts.findIndex((part, idx) => 
          idx > objectIndex && (part === 'public' || part === 'sign')
        );
        if (publicOrSignIndex !== -1) {
          // Find 'candidate-documents' after 'public' or 'sign'
          const bucketIndexAfter = pathParts.findIndex((part, idx) => 
            idx > publicOrSignIndex && part === 'candidate-documents'
          );
          if (bucketIndexAfter !== -1 && bucketIndexAfter + 1 < pathParts.length) {
            const relativePath = pathParts.slice(bucketIndexAfter + 1).join('/');
            console.log('Normalized path from object URL:', { original: fileUrl, normalized: relativePath });
            return relativePath;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to parse URL, trying regex fallback:', fileUrl, e);
    }
    
    // Fallback: try to extract from common patterns (even with query params)
    const match = urlWithoutQuery.match(/candidate-documents\/(.+)$/);
    if (match && match[1]) {
      console.log('Normalized path from regex:', { original: fileUrl, normalized: match[1] });
      return match[1];
    }
    
    // If all else fails, return as is (might work if it's already a relative path)
    console.warn('Could not normalize file URL, using as-is:', fileUrl);
    return fileUrl;
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
      const fileName = document.file_url.split('/').pop() || document.file_url;
      
      // Normalize file path - extract relative path if it's a full URL
      // IMPORTANTE: Isso garante que mesmo URLs de download do n8n sejam normalizadas
      const normalizedPath = normalizeFilePath(document.file_url);
      console.log('🔍 Normalizando caminho do arquivo:', { 
        original: document.file_url, 
        normalized: normalizedPath,
        documentId: document.id,
        documentName: document.document_name
      });
      
      // Verificar se o caminho normalizado é válido
      if (!normalizedPath || normalizedPath.includes('http://') || normalizedPath.includes('https://')) {
        throw new Error(`Caminho do arquivo inválido após normalização: ${normalizedPath}`);
      }
      
      const { data, error } = await supabase.storage
        .from('candidate-documents')
        .createSignedUrl(normalizedPath, 600); // 10 minutes expiration

      if (error) {
        // Handle specific "Object not found" error with a user-friendly message
        if (error.message?.includes('not found') || 
            error.message?.includes('Object not found') ||
            error.message?.toLowerCase().includes('object') && error.message?.toLowerCase().includes('not found')) {
          throw new Error(`O arquivo "${fileName}" não foi encontrado no armazenamento. O documento pode ter sido removido ou nunca foi enviado corretamente.`);
        }
        throw error;
      }

      // Ensure absolute URL
      let signedUrl = data.signedUrl;
      if (signedUrl.startsWith('/')) {
        // Extrair a URL base do Supabase do cliente
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://uuorwhhvjxafrqdyrrzt.supabase.co';
        signedUrl = `${supabaseUrl}/storage/v1${signedUrl}`;
      }

      // Store direct URL for buttons
      setPreviewDirectUrl(signedUrl);

      // Para PDFs, criar blob URL para garantir visualização (não download)
      // Isso força o navegador a visualizar em vez de baixar
      if (fileType === 'pdf') {
        try {
          // Buscar o PDF e criar blob URL para forçar visualização
          // NÃO usar credentials: 'include' pois causa erro CORS com Supabase
          console.log('📥 Buscando PDF para criar blob URL no modal:', signedUrl);
          const pdfResponse = await fetch(signedUrl, {
            method: 'GET',
            mode: 'cors',
            // Removido credentials: 'include' para evitar erro CORS
            headers: {
              'Accept': 'application/pdf'
            }
          });
          
          if (!pdfResponse.ok) {
            console.warn('⚠️ Não foi possível buscar PDF, usando URL assinada diretamente');
            setPreviewUrl(signedUrl);
          } else {
            const pdfBlob = await pdfResponse.blob();
            const pdfBlobUrl = URL.createObjectURL(new Blob([pdfBlob], { type: 'application/pdf' }));
            console.log('✅ Blob URL criado no modal para PDF:', pdfBlobUrl);
            setPreviewUrl(pdfBlobUrl);
          }
        } catch (error) {
          console.warn('⚠️ Erro ao criar blob URL, usando URL assinada diretamente:', error);
          setPreviewUrl(signedUrl);
        }
      } else {
        // Fetch document and create blob URL for images
        const response = await fetch(signedUrl);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Arquivo não encontrado no armazenamento');
          }
          throw new Error(`Falha ao buscar documento: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        setPreviewUrl(blobUrl);
      }
    } catch (error: any) {
      console.error('Error loading document:', error);
      toast({
        title: "Erro ao carregar documento",
        description: error.message || "Não foi possível acessar o documento. O arquivo pode não existir no armazenamento.",
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
      // Extrair a URL base do Supabase do cliente
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://uuorwhhvjxafrqdyrrzt.supabase.co';
      return `${supabaseUrl}/storage/v1${signed}`;
    }
    return signed;
  };

  const generateSignedUrl = async (filePath: string): Promise<string | null> => {
    try {
      // Normalize file path - extract relative path if it's a full URL
      const normalizedPath = normalizeFilePath(filePath);
      console.log('🔗 Gerando URL assinada:', { 
        original: filePath, 
        normalized: normalizedPath 
      });
      
      // Validar que o caminho normalizado não é uma URL completa
      if (normalizedPath.includes('http://') || normalizedPath.includes('https://')) {
        console.error('❌ Caminho normalizado ainda contém URL completa:', normalizedPath);
        return null;
      }
      
      const { data, error } = await supabase.storage
        .from('candidate-documents')
        .createSignedUrl(normalizedPath, 600); // 10 minutos
      
      if (error) {
        // Log error but don't throw - some files might not exist
        if (error.message?.includes('not found') || error.message?.includes('Object not found')) {
          console.warn(`File not found in storage: ${filePath}`, error);
        } else {
          console.error(`Error creating signed URL for ${filePath}:`, error);
        }
        return null;
      }
      
      return ensureAbsoluteUrl(data.signedUrl);
    } catch (error) {
      console.error(`Unexpected error creating signed URL for ${filePath}:`, error);
      return null;
    }
  };

  const refreshAllSignedUrls = async () => {
    if (!documents || documents.length === 0) {
      setSignedUrls({});
      return;
    }
    
    // Only generate URLs for documents that have file_url
    const documentsWithFiles = documents.filter((d) => !!d.file_url);
    
    if (documentsWithFiles.length === 0) {
      setSignedUrls({});
      return;
    }
    
    try {
      const entries = await Promise.all(
        documentsWithFiles.map(async (d) => {
          const url = await generateSignedUrl(d.file_url!);
          return [d.id, url] as const;
        })
      );
      
      const map: Record<string, string> = {};
      entries.forEach(([id, url]) => {
        if (url) map[id] = url;
      });
      setSignedUrls(map);
    } catch (error) {
      console.error('Error refreshing signed URLs:', error);
      // Don't show toast here as this runs automatically
    }
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
    console.log('📤 Exportando documentos pendentes...', { requirementStatus });
    
    if (!requirementStatus) {
      toast({
        title: "Aguardando dados",
        description: "Os dados ainda estão sendo carregados. Aguarde um momento e tente novamente.",
        variant: "destructive",
      });
      return;
    }

    const pendingItems = (requirementStatus as RequirementStatusResult).pendingItems || [];
    
    if (pendingItems.length === 0) {
      toast({
        title: "Nenhum documento pendente",
        description: "Não há documentos pendentes para exportar.",
        variant: "destructive",
      });
      return;
    }

    console.log('📋 Documentos pendentes encontrados:', pendingItems.length);

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

    // Prepare Excel data for pending documents
    const excelData = pendingItems.map(item => ({
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

    try {
      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Prepare header information
      const headerInfo = [
        ['DOCUMENTOS PENDENTES'],
        [`Candidato: ${candidateName}`],
        [`Matriz: ${matrixInfo}`],
        [`Data/Hora: ${currentDateTime}`],
        [], // Empty row
      ];

      // Create worksheet starting with header info
      const worksheet = XLSX.utils.aoa_to_sheet(headerInfo);
      
      // Add data starting after header rows (row 6, index 5)
      XLSX.utils.sheet_add_json(worksheet, excelData, { 
        origin: 'A6', 
        skipHeader: false 
      });
      
      // Set column widths for better readability
      const colWidths = [
        { wch: 20 }, // Departamento
        { wch: 15 }, // Tipo
        { wch: 40 }, // Documento
        { wch: 15 }, // Obrigatoriedade
        { wch: 12 }, // Status
        { wch: 50 }, // Observação
        { wch: 15 }, // Validade
        { wch: 15 }, // Horas Requeridas
        { wch: 15 }, // Horas Atuais
      ];
      worksheet['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Documentos Pendentes');

      // Generate filename with timestamp
      const fileName = `documentos_pendentes_${candidateName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().getTime()}.xlsx`;

      // Write file
      XLSX.writeFile(workbook, fileName);

      toast({
        title: "Exportação concluída",
        description: `${pendingItems.length} documento(s) pendente(s) exportado(s) em Excel com sucesso.`,
      });
    } catch (error: any) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: "Erro ao exportar",
        description: error.message || "Não foi possível exportar os documentos pendentes.",
        variant: "destructive",
      });
    }
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
      return <Badge variant="default">Válido</Badge>;
    }
  };

  // Get comparison status for a document
  const getComparisonStatus = (documentId: string): string | null => {
    if (!documentComparisonsData?.comparisons) return null;
    
    const comparison = documentComparisonsData.comparisons.find(
      (comp) => comp.candidate_document_id === documentId
    );
    
    return comparison?.status || null;
  };

  // Get comparison status badge
  const getComparisonStatusBadge = (status: string | null) => {
    if (!status) {
      return <Badge variant="outline">Não Comparado</Badge>;
    }
    
    switch (status) {
      case 'CONFERE':
        return <Badge className="bg-green-100 text-green-800">Confere</Badge>;
      case 'PARCIAL':
        return <Badge className="bg-yellow-100 text-yellow-800">Parcial</Badge>;
      case 'PENDENTE':
        return <Badge className="bg-red-100 text-red-800">Pendente</Badge>;
      default:
        return <Badge variant="outline">Não Comparado</Badge>;
    }
  };

  // Get signature status for a document
  const getSignatureStatus = (document: CandidateDocument): string | null => {
    // Prioridade 1: Verificar se tem selo de originalidade (QR)
    if (document.selo_originalidade && document.selo_originalidade.trim() !== '') {
      return 'ASS_QR';
    }
    
    // Prioridade 2: Verificar assinatura do titular
    if (document.assinatura_titular && 
        document.assinatura_titular.trim() !== '' && 
        document.assinatura_titular.trim().toLowerCase() !== 'não assinado') {
      return 'ASSINADO';
    }
    
    // Caso contrário: Sem assinatura
    return 'SEM_ASS';
  };

  // Get signature status badge (smaller than comparison badge)
  const getSignatureStatusBadge = (status: string | null) => {
    if (!status) {
      return null;
    }
    
    switch (status) {
      case 'ASSINADO':
        return (
          <Badge className="bg-green-50 text-green-700 border border-green-200 text-xs py-0.5 px-1.5">
            Assinado
          </Badge>
        );
      case 'ASS_QR':
        return (
          <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-xs py-0.5 px-1.5">
            Ass_QR
          </Badge>
        );
      case 'SEM_ASS':
        return (
          <Badge className="bg-gray-50 text-gray-700 border border-gray-200 text-xs py-0.5 px-1.5">
            Sem_Ass
          </Badge>
        );
      default:
        return null;
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
    if (!doc.file_url) {
      toast({
        title: "Arquivo não encontrado",
        description: "Este documento não possui arquivo anexado.",
        variant: "destructive",
      });
      return;
    }
    
    const url = await generateSignedUrl(doc.file_url);
    if (url) {
      setSignedUrls((prev) => ({ ...prev, [doc.id]: url }));
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      // If URL generation failed, try to show in preview modal with better error handling
      toast({
        title: "Arquivo não encontrado",
        description: "O arquivo não foi encontrado no armazenamento. Tentando abrir no visualizador...",
        variant: "default",
      });
      handleViewDocument(doc);
    }
  };

  const handleCopyLink = async () => {
    try {
      const currentUrl = window.location.href;
      await navigator.clipboard.writeText(currentUrl);
      toast({
        title: "Link copiado!",
        description: "O link desta página foi copiado para a área de transferência.",
      });
    } catch (error) {
      // Fallback para navegadores mais antigos
      const currentUrl = window.location.href;
      const textArea = document.createElement('textarea');
      textArea.value = currentUrl;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast({
          title: "Link copiado!",
          description: "O link desta página foi copiado para a área de transferência.",
        });
      } catch (err) {
        toast({
          title: "Erro ao copiar link",
          description: "Não foi possível copiar o link. Tente novamente.",
          variant: "destructive",
        });
      }
      document.body.removeChild(textArea);
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
        candidateName={candidateName}
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
        onExportPending={handleExportPending}
        onCopyLink={handleCopyLink}
      />

      {/* Document Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={(open) => {
        if (!open && previewUrl) {
          // Clean up blob URL when closing modal (for both images and PDFs)
          if (previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
            console.log('🧹 Blob URL revogado ao fechar modal');
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
                  <Button 
                    variant="outline"
                    onClick={async () => {
                      try {
                        setIsLoadingPreview(true);
                        
                        // Se já temos previewUrl (blob URL do modal), usar ele diretamente
                        if (previewUrl && previewUrl.startsWith('blob:')) {
                          console.log('✅ Usando blob URL existente do modal:', previewUrl);
                          const newWindow = window.open(previewUrl, '_blank', 'noopener,noreferrer');
                          if (!newWindow) {
                            throw new Error('Popup bloqueado. Permita popups para este site.');
                          }
                          return; // Sair da função, não precisa buscar novamente
                        }
                        
                        // Buscar o arquivo e criar um blob URL para forçar visualização
                        console.log('📥 Buscando arquivo para criar blob URL:', previewDirectUrl);
                        
                        // NÃO usar credentials: 'include' pois causa erro CORS com Supabase signed URLs
                        // A URL assinada já contém o token de autenticação na query string
                        const response = await fetch(previewDirectUrl, {
                          method: 'GET',
                          mode: 'cors',
                          // Removido credentials: 'include' para evitar erro CORS
                          headers: {
                            'Accept': 'application/pdf,application/octet-stream,*/*'
                          },
                          cache: 'no-cache'
                        });
                        
                        if (!response.ok) {
                          console.error('❌ Erro ao buscar arquivo:', {
                            status: response.status,
                            statusText: response.statusText,
                            url: previewDirectUrl
                          });
                          throw new Error(`Erro ao buscar arquivo: ${response.status} ${response.statusText}`);
                        }
                        
                        // Verificar o Content-Type da resposta
                        const contentType = response.headers.get('content-type') || 'application/pdf';
                        console.log('📄 Content-Type da resposta:', contentType);
                        
                        // Obter o blob do arquivo
                        const blob = await response.blob();
                        console.log('✅ Blob obtido:', { 
                          type: blob.type, 
                          size: blob.size,
                          originalContentType: contentType
                        });
                        
                        // Forçar o tipo MIME correto para PDF (importante para visualização)
                        const pdfBlob = new Blob([blob], { type: 'application/pdf' });
                        
                        // Criar blob URL
                        const blobUrl = URL.createObjectURL(pdfBlob);
                        console.log('✅ Blob URL criado para visualização:', blobUrl);
                        
                        // Abrir o blob URL diretamente - o navegador deve tentar visualizar
                        // O blob URL não tem headers HTTP, então não pode forçar download
                        const newWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');
                        
                        if (!newWindow) {
                          URL.revokeObjectURL(blobUrl);
                          throw new Error('Popup bloqueado. Permita popups para este site.');
                        }
                        
                        // Limpar o blob URL quando a janela for fechada ou após um tempo
                        const cleanup = () => {
                          URL.revokeObjectURL(blobUrl);
                        };
                        
                        // Tentar detectar quando a janela é fechada
                        const checkWindow = setInterval(() => {
                          if (newWindow.closed) {
                            clearInterval(checkWindow);
                            cleanup();
                          }
                        }, 1000);
                        
                        // Fallback: limpar após 10 minutos
                        setTimeout(() => {
                          clearInterval(checkWindow);
                          cleanup();
                        }, 600000);
                        
                      } catch (error) {
                        console.error('Erro ao abrir documento:', error);
                        toast({
                          title: "Erro",
                          description: error instanceof Error ? error.message : "Não foi possível abrir o documento em nova aba.",
                          variant: "destructive",
                        });
                      } finally {
                        setIsLoadingPreview(false);
                      }
                    }}
                    className="inline-flex items-center gap-2"
                    disabled={isLoadingPreview || !previewDirectUrl}
                  >
                    <Eye className="h-4 w-4" />
                    {isLoadingPreview ? 'Carregando...' : 'Abrir em nova aba'}
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
                      <TableHead>Tipo Código</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Horas Total</TableHead>
                      <TableHead>Modalidade</TableHead>
                      <TableHead>Data Emissão</TableHead>
                      <TableHead>Data Validade</TableHead>
                      <TableHead>Validade Status</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
              <TableBody>
                {validDocuments.map((document) => (
                  <TableRow key={document.id}>
                     <TableCell>{document.document_category || "-"}</TableCell>
                     <TableCell>{document.sigla_documento || "N/A"}</TableCell>
                     <TableCell className="font-mono">{document.tipo_de_codigo || "-"}</TableCell>
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
                       <div className="flex flex-col gap-1">
                         {getComparisonStatusBadge(getComparisonStatus(document.id))}
                         {getSignatureStatusBadge(getSignatureStatus(document))}
                       </div>
                     </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {document.file_url && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDocument(document)}
                              title="Visualizar documento"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {signedUrls[document.id] && (
                              <Button asChild variant="ghost" size="sm" title="Baixar documento">
                                <a 
                                  href={signedUrls[document.id]} 
                                  download
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <FileDown className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </>
                        )}
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
