import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, CheckCircle, Download, FileText } from 'lucide-react';
import { ImportResult } from '@/hooks/useDocumentImportExport';

interface ImportResultsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  result: ImportResult | null;
}

export function ImportResultsDialog({ isOpen, onClose, result }: ImportResultsDialogProps) {
  const [showErrors, setShowErrors] = useState(false);

  if (!result) return null;

  const downloadErrorReport = () => {
    if (result.errors.length === 0) return;

    const csvContent = [
      ['Linha', 'Erro', 'Categoria', 'Nome do Documento', 'Detalhes'],
      ...result.errors.map(error => [
        error.row.toString(),
        error.message,
        error.data.categoria || '',
        error.data.name || '',
        error.data.detail || ''
      ])
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'erros_importacao.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Resultado da Importação
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resumo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-600">{result.success}</div>
                <div className="text-sm text-green-700">Documentos importados</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <div>
                <div className="text-2xl font-bold text-red-600">{result.errors.length}</div>
                <div className="text-sm text-red-700">Erros encontrados</div>
              </div>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex gap-2">
            {result.errors.length > 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowErrors(!showErrors)}
                >
                  {showErrors ? 'Ocultar' : 'Ver'} Erros ({result.errors.length})
                </Button>
                <Button
                  variant="outline"
                  onClick={downloadErrorReport}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Relatório de Erros
                </Button>
              </>
            )}
          </div>

          {/* Lista de erros */}
          {showErrors && result.errors.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Detalhes dos Erros</h3>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Linha</TableHead>
                      <TableHead>Erro</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.errors.map((error, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Badge variant="destructive">{error.row}</Badge>
                        </TableCell>
                        <TableCell className="text-red-600 font-medium">
                          {error.message}
                        </TableCell>
                        <TableCell>{error.data.categoria || '-'}</TableCell>
                        <TableCell>{error.data.name || '-'}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {error.data.detail || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Instruções para correção */}
          {result.errors.length > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Como corrigir os erros:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Baixe o relatório de erros para ver todos os problemas</li>
                <li>• Corrija os dados no arquivo CSV original</li>
                <li>• Certifique-se de que os campos obrigatórios estão preenchidos</li>
                <li>• Verifique se não há caracteres especiais problemáticos</li>
                <li>• Tente importar novamente após as correções</li>
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
