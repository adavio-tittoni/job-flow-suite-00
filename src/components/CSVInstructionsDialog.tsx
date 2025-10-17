import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { useDocumentImportExport } from '@/hooks/useDocumentImportExport';

interface CSVInstructionsDialogProps {
  children: React.ReactNode;
}

export function CSVInstructionsDialog({ children }: CSVInstructionsDialogProps) {
  const { exportTemplate, isExporting } = useDocumentImportExport();

  const handleDownloadTemplate = () => {
    exportTemplate();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Como usar o modelo CSV
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Botão de download */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-blue-900 text-sm">Baixar Modelo</h3>
                  <p className="text-xs text-blue-700">Clique no botão para baixar o arquivo modelo</p>
                </div>
                <Button onClick={handleDownloadTemplate} disabled={isExporting} size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? 'Baixando...' : 'Baixar'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Problema identificado */}
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-red-800 flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4" />
                Problema Comum
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-red-700 text-xs">
                Se o arquivo CSV aparecer em uma única coluna no Excel, isso acontece porque o Excel não está interpretando corretamente o formato CSV.
              </p>
            </CardContent>
          </Card>

          {/* Soluções */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Soluções:</h3>
            
            <Card className="border-l-4 border-green-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-green-800 flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  Método 1: Importar como CSV (Recomendado)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Abra o Excel</li>
                  <li>Vá em <Badge variant="outline" className="text-xs">Dados</Badge> → <Badge variant="outline" className="text-xs">Obter Dados</Badge> → <Badge variant="outline" className="text-xs">De Arquivo</Badge> → <Badge variant="outline" className="text-xs">De Texto/CSV</Badge></li>
                  <li>Selecione o arquivo <code className="bg-gray-100 px-1 rounded text-xs">modelo_documentos.csv</code></li>
                  <li>Configure o separador como <Badge variant="outline" className="text-xs">Vírgula (,)</Badge></li>
                  <li>Clique em <Badge variant="outline" className="text-xs">Carregar</Badge></li>
                </ol>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-blue-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-blue-800 flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  Método 2: Alterar extensão
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Renomeie o arquivo de <code className="bg-gray-100 px-1 rounded text-xs">modelo_documentos.csv</code> para <code className="bg-gray-100 px-1 rounded text-xs">modelo_documentos.txt</code></li>
                  <li>Abra o arquivo .txt no Excel</li>
                  <li>O Excel perguntará como importar - escolha <Badge variant="outline" className="text-xs">Delimitado</Badge></li>
                  <li>Selecione <Badge variant="outline" className="text-xs">Vírgula</Badge> como separador</li>
                  <li>Clique em <Badge variant="outline" className="text-xs">Concluir</Badge></li>
                </ol>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-purple-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-purple-800 flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  Método 3: Usar LibreOffice Calc
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Baixe o LibreOffice Calc (gratuito)</li>
                  <li>Abra o arquivo CSV diretamente</li>
                  <li>O Calc interpreta CSV corretamente por padrão</li>
                </ol>
              </CardContent>
            </Card>
          </div>

          {/* Campos obrigatórios */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Campos Obrigatórios</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Para importar com sucesso, preencha pelo menos:
                </p>
                <div className="flex gap-2">
                  <Badge variant="destructive" className="text-xs">categoria</Badge>
                  <Badge variant="destructive" className="text-xs">nome_curso</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Os demais campos são opcionais.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
