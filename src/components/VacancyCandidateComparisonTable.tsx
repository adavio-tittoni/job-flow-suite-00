import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, CheckCircle, Clock, RefreshCw, Eye, XCircle } from 'lucide-react';
import { useVacancyCandidateComparison } from '@/hooks/useVacancyCandidateComparison';
import { cn } from '@/lib/utils';

interface VacancyCandidateComparisonTableProps {
  vacancyId: string;
}

export const VacancyCandidateComparisonTable = ({ vacancyId }: VacancyCandidateComparisonTableProps) => {
  const { comparisons, loading, error, refetch } = useVacancyCandidateComparison(vacancyId);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);

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

  const getMatchTypeBadge = (matchType: string) => {
    switch (matchType) {
      case 'exact_id':
        return <Badge variant="secondary" className="text-xs">ID Exato</Badge>;
      case 'exact_code':
        return <Badge variant="secondary" className="text-xs">Código Exato</Badge>;
      case 'semantic_name':
        return <Badge variant="outline" className="text-xs">IA Semântico</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Carregando comparação de candidatos...</span>
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

  const selectedComparison = comparisons.find(c => c.candidateId === selectedCandidate) || comparisons[0];

  return (
    <div className="space-y-6">
      {/* Header com estatísticas gerais */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Comparação de Candidatos com Matriz</CardTitle>
              <p className="text-sm text-muted-foreground">
                Análise inteligente com IA para determinar aderência dos candidatos
              </p>
            </div>
            <Button variant="outline" onClick={refetch} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Atualizando...' : 'Atualizar Comparação'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{comparisons.length}</div>
              <div className="text-sm text-muted-foreground">Candidatos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {comparisons.reduce((sum, c) => sum + c.metRequirements, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Requisitos Atendidos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {comparisons.reduce((sum, c) => sum + c.partialRequirements, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Parciais</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {comparisons.reduce((sum, c) => sum + c.pendingRequirements, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Pendentes</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs para selecionar candidato */}
      <Tabs value={selectedCandidate || comparisons[0]?.candidateId} onValueChange={setSelectedCandidate}>
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {comparisons.map((comparison) => (
            <TabsTrigger key={comparison.candidateId} value={comparison.candidateId}>
              <div className="text-left">
                <div className="font-medium">{comparison.candidateName}</div>
                <div className="text-xs text-muted-foreground">
                  {comparison.adherencePercentage}% aderência
                </div>
              </div>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCandidate || comparisons[0]?.candidateId} className="space-y-4">
          {/* Estatísticas do candidato selecionado */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{selectedComparison.candidateName}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {selectedComparison.matrixName}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{selectedComparison.adherencePercentage}%</div>
                  <div className="text-sm text-muted-foreground">Aderência</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-green-600">{selectedComparison.metRequirements}</div>
                  <div className="text-sm text-muted-foreground">Confere</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-yellow-600">{selectedComparison.partialRequirements}</div>
                  <div className="text-sm text-muted-foreground">Parcial</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-red-600">{selectedComparison.pendingRequirements}</div>
                  <div className="text-sm text-muted-foreground">Pendente</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold">{selectedComparison.totalRequirements}</div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </div>
              </div>
              <Progress value={selectedComparison.adherencePercentage} className="h-2" />
            </CardContent>
          </Card>

          {/* Tabela detalhada */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Obrigatoriedade</TableHead>
                      <TableHead>Horas</TableHead>
                      <TableHead>Modalidade</TableHead>
                      <TableHead>Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedComparison.documents.map((doc) => (
                      <TableRow key={doc.requirementId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(doc.status)}
                            {getStatusBadge(doc.status)}
                            {doc.matchType && getMatchTypeBadge(doc.matchType)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getValidityBadge(doc.validityStatus, doc.validityDate)}
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
        </TabsContent>
      </Tabs>
    </div>
  );
};
