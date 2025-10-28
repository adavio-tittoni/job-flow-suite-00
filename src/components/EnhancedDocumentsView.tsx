import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, Clock, Download, Eye, Plus, XCircle } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('all');

  // Buscar TODOS os itens da matriz e suas comparações (LEFT JOIN)
  const { data: allMatrixItems, isLoading: loading, error } = useQuery({
    queryKey: ['matrix-items-comparisons', candidateId, matrixId],
    queryFn: async () => {
      if (!matrixId) return [];
      
      console.log('🔍 Buscando todos os itens da matriz:', matrixId);
      
      // 1. Buscar todos os itens da matriz
      const { data: matrixItems, error: matrixError } = await supabase
        .from('matrix_items')
        .select(`
          id,
          obrigatoriedade,
          modalidade,
          carga_horaria,
          documents_catalog (
            name,
            codigo,
            sigla_documento,
            document_category,
            categoria,
            group_name
          )
        `)
        .eq('matrix_id', matrixId);

      if (matrixError) throw matrixError;

      // 2. Buscar comparações existentes para este candidato
      const { data: comparisons, error: compError } = await supabase
        .from('document_comparisons')
        .select('*')
        .eq('candidate_id', candidateId);

      if (compError) throw compError;

      // 3. Combinar: para cada item da matriz, encontrar sua comparação MAIS RECENTE ou criar status PENDENTE
      const itemsWithComparisons = matrixItems?.map(item => {
        // Se houver múltiplas comparações, pegar a mais recente
        const allComparisons = comparisons?.filter(comp => comp.matrix_item_id === item.id) || [];
        const comparison = allComparisons.sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA; // Ordenar por mais recente primeiro
        })[0]; // Pegar a primeira (mais recente)
        
        const status = comparison?.status || 'PENDENTE';
        
        console.log('📋 Item da matriz:', {
          matrixItemId: item.id,
          hasComparison: !!comparison,
          status: status,
          comparisonStatus: comparison?.status,
          totalComparisons: allComparisons.length,
          selectedComparisonId: comparison?.id
        });
        
        return {
          matrixItem: item,
          comparison,
          status
        };
      }) || [];

      console.log('✅ Itens da matriz com comparações:', itemsWithComparisons.length);
      console.log('📊 Comparações encontradas:', comparisons?.map(c => ({
        matrix_item_id: c.matrix_item_id,
        status: c.status
      })));
      return itemsWithComparisons;
    },
    enabled: !!candidateId && !!matrixId,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const comparisonResults = allMatrixItems || [];

  console.log('🔍 EnhancedDocumentsView: Component state', {
    candidateId,
    matrixId,
    loading,
    error,
    comparisonResultsLength: comparisonResults?.length || 0,
    hasComparisonResults: !!comparisonResults
  });

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

  // Listen for document_comparisons changes to auto-refresh
  useEffect(() => {
    console.log('🔄 EnhancedDocumentsView: Component mounted or matrixId changed:', matrixId);
  }, [matrixId]);

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

  // Processar dados da combinação matrix_items + document_comparisons
  // IMPORTANTE: SEMPRE usar documents_catalog como fonte primária para nome/sigla/código
  const matrixName = vacancy?.title || 'Matriz';
  const documents = comparisonResults.map((item: any) => {
    const matrixItem = item.matrixItem;
    const comparison = item.comparison;
    const status = item.status; // CONFERE, PARCIAL ou PENDENTE
    const docCatalog = matrixItem.documents_catalog;
    
    // SEMPRE priorizar documents_catalog para informações do documento
    // comparison contém apenas status e observações da comparação
    
    console.log('📄 Processando documento:', {
      documentName: docCatalog?.name,
      sigla: docCatalog?.sigla_documento,
      statusFinal: status,
      hasComparison: !!comparison,
      comparisonStatus: comparison?.status
    });
    
    return {
      id: matrixItem.id,
      documentName: docCatalog?.name || 'Nome não disponível',
      documentCode: docCatalog?.codigo || '',
      category: docCatalog?.document_category || docCatalog?.categoria || '',
      sigla: docCatalog?.sigla_documento || '', // SEMPRE da documents_catalog
      obligation: matrixItem.obrigatoriedade || 'Obrigatório',
      requiredHours: matrixItem.carga_horaria || 0,
      modality: matrixItem.modalidade || '',
      status: status, // CONFERE, PARCIAL ou PENDENTE - FONTE ÚNICA DA VERDADE
      validityStatus: comparison?.validity_status === 'valid' ? 'Valido' : 
                     comparison?.validity_status === 'expired' ? 'Vencido' : 
                     comparison ? 'N/A' : 'Não verificado',
      validityDate: comparison?.validity_date,
      observations: comparison?.observations || (status === 'PENDENTE' ? 'Documento ainda não comparado' : '-'),
      candidateDocument: comparison?.candidate_document_id ? { id: comparison.candidate_document_id } : undefined,
      similarityScore: comparison?.similarity_score || 0,
      matrixItemId: matrixItem.id,
      candidateDocumentId: comparison?.candidate_document_id
    };
  });

  const summary = {
    total: documents.length,
    approved: documents.filter(d => d.status === 'CONFERE').length,
    partial: documents.filter(d => d.status === 'PARCIAL').length,
    pending: documents.filter(d => d.status === 'PENDENTE').length,
    // Parcial conta 50% para aderência, CONFERE conta 100%
    adherencePercentage: documents.length > 0 
      ? Math.round(((documents.filter(d => d.status === 'CONFERE').length) + (documents.filter(d => d.status === 'PARCIAL').length * 0.5)) / documents.length * 100)
      : 0
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
      case 'CONFERE':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'PARCIAL':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'PENDENTE':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFERE':
        return <Badge className="bg-green-100 text-green-800">Confere</Badge>;
      case 'PARCIAL':
        return <Badge className="bg-yellow-100 text-yellow-800">Parcial</Badge>;
      case 'PENDENTE':
        return <Badge className="bg-red-100 text-red-800">Pendente</Badge>;
      default:
        return <Badge variant="outline">Ausente</Badge>;
    }
  };

  const getValidityBadge = (validity: string, validityDate?: string) => {
    // Se temos data de validade, mostrar a data
    if (validityDate && validityDate !== 'null' && validityDate !== 'undefined') {
      const date = new Date(validityDate);
      const formattedDate = date.toLocaleDateString('pt-BR');
      
      switch (validity) {
        case 'Valido':
          return <Badge className="bg-green-100 text-green-800">Válido até {formattedDate}</Badge>;
        case 'Vencido':
          return <Badge className="bg-red-100 text-red-800">Vencido em {formattedDate}</Badge>;
        default:
          return <Badge variant="outline">{formattedDate}</Badge>;
      }
    }
    
    // Fallback para quando não há data
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
        return doc.status === 'CONFERE';
      case 'pending':
        return doc.status === 'PENDENTE';
      case 'partial':
        return doc.status === 'PARCIAL';
      default:
        return true;
    }
  });

  return (
    <div className="space-y-6">
      {/* Enhanced Header Section */}
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-blue-900">
                    {matrixName}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 font-semibold">
                      {documents.length} documentos solicitados
                    </Badge>
                    <Badge variant="outline" className="text-xs bg-white">
                      Comparação Avançada
                    </Badge>
                  </div>
                </div>
              </div>
              <p className="text-sm text-blue-700 font-medium ml-12">
                📋 Análise completa de conformidade com dados do catálogo de documentos
              </p>
            </div>
            <div className="text-right">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={loading}
                className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar Pendentes
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Enhanced Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-3xl font-bold text-green-600 mb-1">{summary.approved}</div>
              <div className="text-sm font-semibold text-green-700">Confere</div>
              <div className="text-xs text-green-600 mt-1">✅ Documentos válidos</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-3xl font-bold text-yellow-600 mb-1">{summary.partial}</div>
              <div className="text-sm font-semibold text-yellow-700">Parcial</div>
              <div className="text-xs text-yellow-600 mt-1">⚠️ Requer atenção</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-3xl font-bold text-red-600 mb-1">{summary.pending}</div>
              <div className="text-sm font-semibold text-red-700">Pendente</div>
              <div className="text-xs text-red-600 mt-1">❌ Documentos ausentes</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-3xl font-bold text-blue-600 mb-1">{summary.adherencePercentage}%</div>
              <div className="text-sm font-semibold text-blue-700">Aderência</div>
              <div className="text-xs text-blue-600 mt-1">📊 Conformidade geral</div>
            </div>
          </div>
          
          {/* Enhanced Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">Progresso de Conformidade</span>
              <span className="font-semibold text-blue-600">{summary.adherencePercentage}%</span>
            </div>
            <Progress 
              value={summary.adherencePercentage} 
              className="h-3 bg-gray-200"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Tabs Section */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">📋 Documentos da Matriz</h3>
            <div className="text-sm text-gray-500">
              Filtre por status para análise detalhada
            </div>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 bg-gray-100">
              <TabsTrigger 
                value="all" 
                className="data-[state=active]:bg-blue-500 data-[state=active]:text-white"
              >
                Todos ({summary.total})
              </TabsTrigger>
              <TabsTrigger 
                value="approved"
                className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
              >
                Confere ({summary.approved})
              </TabsTrigger>
              <TabsTrigger 
                value="partial"
                className="data-[state=active]:bg-yellow-500 data-[state=active]:text-white"
              >
                Parcial ({summary.partial})
              </TabsTrigger>
              <TabsTrigger 
                value="pending"
                className="data-[state=active]:bg-red-500 data-[state=active]:text-white"
              >
                Pendente ({summary.pending})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3 font-semibold text-gray-700">Categoria</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Sigla</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Documento</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Código</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Obrigatoriedade</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Horas</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Modalidade</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Status</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Validade</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Observação</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className={cn(
                    "border-b transition-colors",
                    doc.status === 'CONFERE' && "hover:bg-green-50",
                    doc.status === 'PARCIAL' && "hover:bg-yellow-50", 
                    doc.status === 'PENDENTE' && "hover:bg-red-50",
                    "hover:bg-gray-50"
                  )}>
                    <td className="p-3">{doc.category || '-'}</td>
                    <td className="p-3 font-mono text-sm">{doc.sigla || '-'}</td>
                    <td className="p-3">
                      <div className="font-medium text-gray-900">{doc.documentName}</div>
                    </td>
                    <td className="p-3 font-mono text-sm bg-gray-50">{doc.documentCode || '-'}</td>
                    <td className="p-3">
                      <Badge 
                        variant={doc.obligation === 'Obrigatório' ? 'default' : 'secondary'}
                        className={cn(
                          "text-xs",
                          doc.obligation === 'Obrigatório' && "bg-red-100 text-red-800 border-red-200",
                          doc.obligation !== 'Obrigatório' && "bg-gray-100 text-gray-600"
                        )}
                      >
                        {doc.obligation || 'N/A'}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="text-sm">
                        {doc.requiredHours > 0 ? (
                          <span className="font-medium text-gray-900">{doc.requiredHours}h</span>
                        ) : '-'}
                        {doc.candidateDocument && doc.candidateDocument.carga_horaria_total && (
                          <div className="text-blue-600 text-xs mt-1">
                            Candidato: {doc.candidateDocument.carga_horaria_total}h
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-sm">
                        {doc.modality || '-'}
                        {doc.candidateDocument && doc.candidateDocument.modality && (
                          <div className="text-blue-600 text-xs mt-1">
                            Candidato: {doc.candidateDocument.modality}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {doc.status === 'CONFERE' && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              Confere
                            </Badge>
                          </div>
                        )}
                        {doc.status === 'PARCIAL' && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-yellow-600" />
                            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                              Parcial
                            </Badge>
                          </div>
                        )}
                        {doc.status === 'PENDENTE' && (
                          <div className="flex items-center gap-1">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <Badge className="bg-red-100 text-red-800 border-red-200">
                              Pendente
                            </Badge>
                          </div>
                        )}
                        {!doc.status && (
                          <div className="flex items-center gap-1">
                            <AlertCircle className="h-4 w-4 text-gray-600" />
                            <Badge className="bg-gray-100 text-gray-800 border-gray-200">
                              Não verificado
                            </Badge>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      {getValidityBadge(doc.validityStatus, doc.validityDate)}
                    </td>
                    <td className="p-3">
                      <div className="text-sm text-gray-600 max-w-xs">
                        {doc.observations || '-'}
                        {doc.similarityScore && doc.similarityScore < 1 && (
                          <div className="text-xs text-blue-600 mt-1">
                            Similaridade: {Math.round(doc.similarityScore * 100)}%
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        {doc.status === 'PENDENTE' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onAddDocument?.(doc.id)}
                            className="h-8 w-8 p-0 bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        ) : doc.candidateDocument ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onViewDocument?.(doc.candidateDocument!.id)}
                            className="h-8 w-8 p-0 bg-green-50 border-green-200 text-green-600 hover:bg-green-100"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        ) : null}
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