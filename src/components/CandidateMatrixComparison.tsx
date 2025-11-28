import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, CheckCircle, XCircle, Target, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useVacancyCandidateComparison } from "@/hooks/useVacancyCandidateComparison";

interface MatrixItem {
  id: string;
  document_id: string;
  obrigatoriedade: string;
  modalidade: string;
  regra_validade: string;
  documents_catalog: {
    name: string;
    document_category: string;
    document_type: string;
  };
}

interface CandidateMatrixComparisonProps {
  vacancyId: string;
  matrixId: string | null;
}

const CandidateMatrixComparison = ({ vacancyId, matrixId }: CandidateMatrixComparisonProps) => {
  const [matrixItems, setMatrixItems] = useState<MatrixItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!matrixId) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);

        // Buscar itens da matriz
        const { data: matrixData, error: matrixError } = await supabase
          .from('matrix_items')
          .select(`
            id,
            document_id,
            obrigatoriedade,
            modalidade,
            regra_validade,
            documents_catalog!inner (
              id,
              name,
              nome_curso,
              codigo,
              sigla,
              sigla_documento,
              document_category,
              document_type,
              categoria,
              group_name
            )
          `)
          .eq('matrix_id', matrixId);

        if (matrixError) throw matrixError;
        setMatrixItems(matrixData || []);

      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [matrixId]);

  if (!matrixId) {
    return (
      <div className="text-center py-8">
        <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Vincule uma matriz à vaga para ver a comparação.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Comparação com Matriz</h3>
        {!loading && (
          <Badge variant="outline">
            {matrixItems.length} requisitos
          </Badge>
        )}
      </div>

      <DetailedComparisonTable vacancyId={vacancyId} matrixId={matrixId} />
    </div>
  );
};



interface DetailedComparisonTableProps {
  vacancyId: string;
  matrixId: string | null;
}

const DetailedComparisonTable = ({ vacancyId, matrixId }: DetailedComparisonTableProps) => {
  const { comparisons, loading, error } = useVacancyCandidateComparison(vacancyId);

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
      case 'N/A - Matriz':
        return <Badge variant="outline">N/A - Matriz</Badge>;
      default:
        return <Badge variant="outline">N/A</Badge>;
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

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Carregando comparação detalhada...</span>
          </div>
        </CardContent>
      </Card>
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

  if (comparisons.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum candidato encontrado para esta vaga</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Ordenar comparações por aderência (maior para menor)
  const sortedComparisons = [...comparisons].sort((a, b) => {
    return b.adherencePercentage - a.adherencePercentage; // Maior para menor
  });

  return (
    <div className="space-y-4">
      {sortedComparisons.map((comparison) => (
        <Card key={comparison.candidateId}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{comparison.candidateName}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {comparison.matrixName}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{comparison.adherencePercentage}%</div>
                <div className="text-sm text-muted-foreground">Aderência</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-xl font-bold text-green-600">{comparison.metRequirements}</div>
                <div className="text-sm text-muted-foreground">Confere</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-yellow-600">{comparison.partialRequirements}</div>
                <div className="text-sm text-muted-foreground">Parcial</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-red-600">{comparison.pendingRequirements}</div>
                <div className="text-sm text-muted-foreground">Pendente</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold">{comparison.totalRequirements}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
            </div>
            <Progress value={comparison.adherencePercentage} className="h-2 mb-4" />
            
            {/* Tabela detalhada */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Sigla</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Obrigatoriedade</TableHead>
                    <TableHead>Horas</TableHead>
                    <TableHead>Modalidade</TableHead>
                    <TableHead>Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparison.documents.map((doc) => (
                    <TableRow key={doc.requirementId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(doc.status)}
                          {getStatusBadge(doc.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getValidityBadge(doc.validityStatus)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {doc.category || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-mono">
                          {doc.sigla || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{doc.documentName}</div>
                          {doc.candidateDocument && (
                            <div className="text-muted-foreground text-xs">
                              Candidato: {doc.candidateDocument.name}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-mono">
                          {doc.documentCode || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {doc.obligation || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {doc.requiredHours > 0 ? `${doc.requiredHours}h` : '-'}
                          {doc.candidateDocument && doc.candidateDocument.hours > 0 && (
                            <div className="text-muted-foreground text-xs">
                              Candidato: {doc.candidateDocument.hours}h
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {doc.modality || '-'}
                          {doc.candidateDocument && doc.candidateDocument.modality && (
                            <div className="text-muted-foreground text-xs">
                              Candidato: {doc.candidateDocument.modality}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground max-w-xs">
                          {doc.observations}
                          {doc.similarityScore && doc.similarityScore < 1 && (
                            <div className="text-xs mt-1">
                              Similaridade IA: {Math.round(doc.similarityScore * 100)}%
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default CandidateMatrixComparison;
