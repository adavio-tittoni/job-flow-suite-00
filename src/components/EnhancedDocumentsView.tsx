import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, Clock, Download, Eye, Plus, XCircle } from 'lucide-react';
import { useAdvancedMatrixComparison } from '@/hooks/useAdvancedMatrixComparison';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface EnhancedDocumentsViewProps {
  candidateId: string;
  matrixId: string | null;
  onAddDocument?: (catalogDocId: string) => void;
  onViewDocument?: (documentId: string) => void;
}

export const EnhancedDocumentsView = ({ 
  candidateId, 
  matrixId,
  onAddDocument, 
  onViewDocument 
}: EnhancedDocumentsViewProps) => {
  const { comparisonResults, loading, error, refetch } = useAdvancedMatrixComparison(candidateId, matrixId);
  const [activeTab, setActiveTab] = useState('all');

  // Fetch vacancy name based on matrix_id
  const { data: vacancy } = useQuery({
    queryKey: ["vacancy-by-matrix", matrixId],
    queryFn: async () => {
      if (!matrixId) return null;
      const { data, error } = await supabase
        .from("vacancies")
        .select("id, title")
        .eq("matrix_id", matrixId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!matrixId,
  });

  // Force refresh when matrixId changes
  useEffect(() => {
    console.log('🔄 EnhancedDocumentsView: Matrix ID changed, forcing refresh:', matrixId);
    if (matrixId) {
      // Use setTimeout to avoid infinite loop
      const timeoutId = setTimeout(() => {
        refetch();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [matrixId]); // Remove refetch from dependencies to avoid loop

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Carregando comparação avançada...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>Erro ao carregar comparação: {error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!comparisonResults || comparisonResults.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma matriz vinculada ao candidato</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Processar dados para exibição
  const matrixName = vacancy?.title || 'Matriz';
  const documents = comparisonResults.map(item => ({
    id: item.matrixItem.id,
    documentName: item.matrixItem.documents_catalog.name,
    documentCode: item.matrixItem.documents_catalog.codigo || '',
    category: item.matrixItem.documents_catalog.categoria || item.matrixItem.documents_catalog.document_category || '',
    sigla: item.matrixItem.documents_catalog.sigla_documento || '',
    obligation: item.matrixItem.obrigatoriedade || '',
    requiredHours: item.matrixItem.carga_horaria || 0,
    modality: item.matrixItem.modalidade || '',
    status: item.result.status,
    validityStatus: item.result.validadeStatus,
    observations: item.result.observacoes,
    candidateDocument: item.result.matchedDocument,
    similarityScore: item.result.similarityScore
  }));

  const summary = {
    total: documents.length,
    approved: documents.filter(d => d.status === 'Confere').length,
    partial: documents.filter(d => d.status === 'Parcial').length,
    pending: documents.filter(d => d.status === 'Pendente').length,
    adherencePercentage: documents.length > 0 ? Math.round((documents.filter(d => d.status === 'Confere').length / documents.length) * 100) : 0
  };

  console.log('📊 EnhancedDocumentsView: Summary calculated', summary);
  console.log('📋 EnhancedDocumentsView: Documents processed', documents.map(d => ({
    name: d.documentName,
    category: d.category,
    sigla: d.sigla,
    obligation: d.obligation
  })));

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Confere':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'Parcial':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'Pendente':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Confere':
        return <Badge className="bg-green-100 text-green-800">Confere</Badge>;
      case 'Parcial':
        return <Badge className="bg-yellow-100 text-yellow-800">Parcial</Badge>;
      case 'Pendente':
        return <Badge className="bg-red-100 text-red-800">Pendente</Badge>;
      default:
        return <Badge variant="outline">Ausente</Badge>;
    }
  };

  const getValidityBadge = (validity: string) => {
    switch (validity) {
      case 'Valido':
        return <Badge className="bg-green-100 text-green-800">Válido</Badge>;
      case 'Vencido':
        return <Badge className="bg-red-100 text-red-800">Vencido</Badge>;
      default:
        return <Badge variant="outline">N/A</Badge>;
    }
  };

  const filteredDocuments = documents.filter(doc => {
    switch (activeTab) {
      case 'approved':
        return doc.status === 'Confere';
      case 'pending':
        return doc.status === 'Pendente';
      case 'partial':
        return doc.status === 'Parcial';
      default:
        return true;
    }
  });

  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {matrixName}
                <span className="text-sm font-normal text-muted-foreground">
                  ({documents.length} documentos solicitados)
                </span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Comparação avançada seguindo prompt específico - dados completos do catálogo
              </p>
            </div>
            <Button variant="outline" onClick={refetch} disabled={loading}>
              <Download className="h-4 w-4 mr-2" />
              Exportar Pendentes
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{summary.approved}</div>
              <div className="text-sm text-muted-foreground">Confere</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{summary.partial}</div>
              <div className="text-sm text-muted-foreground">Parcial</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{summary.pending}</div>
              <div className="text-sm text-muted-foreground">Pendente</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{summary.adherencePercentage}%</div>
              <div className="text-sm text-muted-foreground">Aderência</div>
            </div>
          </div>
          <Progress value={summary.adherencePercentage} className="h-2" />
        </CardContent>
      </Card>

      {/* Tabs para filtrar documentos */}
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">Todos ({summary.total})</TabsTrigger>
              <TabsTrigger value="approved">Confere ({summary.approved})</TabsTrigger>
              <TabsTrigger value="partial">Parcial ({summary.partial})</TabsTrigger>
              <TabsTrigger value="pending">Pendente ({summary.pending})</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Categoria</th>
                  <th className="text-left p-2 font-medium">Sigla</th>
                  <th className="text-left p-2 font-medium">Documento</th>
                  <th className="text-left p-2 font-medium">Código</th>
                  <th className="text-left p-2 font-medium">Obrigatoriedade</th>
                  <th className="text-left p-2 font-medium">Horas</th>
                  <th className="text-left p-2 font-medium">Modalidade</th>
                  <th className="text-left p-2 font-medium">Status</th>
                  <th className="text-left p-2 font-medium">Validade</th>
                  <th className="text-left p-2 font-medium">Observação</th>
                  <th className="text-left p-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">{doc.category || '-'}</td>
                    <td className="p-2">{doc.sigla || '-'}</td>
                    <td className="p-2">
                      <div className="font-medium">{doc.documentName}</div>
                      {doc.candidateDocument && (
                        <div className="text-sm text-muted-foreground">
                          Candidato: {doc.candidateDocument.document_name}
                        </div>
                      )}
                    </td>
                    <td className="p-2 font-mono text-sm">{doc.documentCode || '-'}</td>
                    <td className="p-2">
                      <Badge variant="outline" className="text-xs">
                        {doc.obligation || 'N/A'}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <div className="text-sm">
                        {doc.requiredHours > 0 ? `${doc.requiredHours}h` : '-'}
                        {doc.candidateDocument && doc.candidateDocument.carga_horaria_total && (
                          <div className="text-muted-foreground text-xs">
                            Candidato: {doc.candidateDocument.carga_horaria_total}h
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="text-sm">
                        {doc.modality || '-'}
                        {doc.candidateDocument && doc.candidateDocument.modality && (
                          <div className="text-muted-foreground text-xs">
                            Candidato: {doc.candidateDocument.modality}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(doc.status)}
                        {getStatusBadge(doc.status)}
                      </div>
                    </td>
                    <td className="p-2">
                      {getValidityBadge(doc.validityStatus)}
                    </td>
                    <td className="p-2">
                      <div className="text-sm text-muted-foreground max-w-xs">
                        {doc.observations}
                        {doc.similarityScore && doc.similarityScore < 1 && (
                          <div className="text-xs mt-1">
                            Similaridade: {Math.round(doc.similarityScore * 100)}%
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        {doc.candidateDocument && onViewDocument && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewDocument(doc.candidateDocument!.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {doc.status === 'Pendente' && onAddDocument && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onAddDocument(doc.id)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};