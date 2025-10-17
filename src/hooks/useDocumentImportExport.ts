import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface DocumentImportData {
  // Legacy fields (for backward compatibility)
  name?: string;
  group_name?: string;
  document_category?: string;
  document_type?: string;
  issuing_authority?: string;
  modality?: string;
  
  // New unified fields
  categoria: string;
  codigo?: string;
  sigla?: string;
  nome_curso: string;
  descricao_curso?: string;
  carga_horaria?: string;
  validade?: string;
  detalhes?: string;
  url_site?: string;
  flag_requisito?: string;
  nome_ingles?: string;
}

export interface ImportResult {
  success: number;
  errors: Array<{
    row: number;
    message: string;
    data: DocumentImportData;
  }>;
}

export function useDocumentImportExport() {
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportTemplate = () => {
    try {
      setIsExporting(true);
      
      const templateData = [
        [
          'categoria',
          'codigo',
          'sigla',
          'nome_curso',
          'descricao_curso',
          'carga_horaria',
          'validade',
          'modalidade',
          'detalhes',
          'url_site',
          'flag_requisito',
          'nome_ingles'
        ],
        [
          'CoC (Competência)',
          'A-II/1',
          'COCN',
          'Oficial de Quarto de Navegação (Convés)',
          'Licença para atuar como oficial de navegação',
          '40 h',
          '5 anos',
          'Presencial',
          'Requer flag state',
          'https://exemplo.com',
          'sim',
          'Officer in Charge of a Navigational Watch'
        ],
        [
          'Segurança e Saúde Ocupacional',
          'NR-1',
          '',
          'Disposições Gerais e GRO/PGR',
          'Capacitação conforme riscos',
          '8 h',
          'Conforme PGR',
          'Híbrido',
          'Parte teórica pode ser EAD',
          '',
          '',
          ''
        ],
        [
          'EPI',
          'NR-6',
          '',
          'Equipamentos de Proteção Individual',
          'Uso, conservação e registro de EPIs',
          '4 h',
          '1-2 anos',
          'Presencial',
          'Deve incluir prática simulada',
          '',
          '',
          ''
        ],
        [
          'Saúde Ocupacional / Primeiros Socorros',
          'NR-7',
          '',
          'Primeiros Socorros (no âmbito do PCMSO)',
          'Atendimento básico de emergência médica',
          '8-16 h',
          '2 anos',
          'Presencial',
          'Com instrutor habilitado',
          '',
          '',
          ''
        ]
      ];

      // Criar CSV com separador de vírgula e aspas duplas apenas quando necessário
      const csvContent = templateData
        .map(row => 
          row.map(field => {
            // Se o campo contém vírgula, aspas ou quebra de linha, envolver com aspas
            if (field.includes(',') || field.includes('"') || field.includes('\n')) {
              return `"${field.replace(/"/g, '""')}"`;
            }
            return field;
          }).join(',')
        )
        .join('\r\n'); // Usar \r\n para melhor compatibilidade com Windows/Excel

      // Adicionar BOM (Byte Order Mark) para UTF-8 para melhor compatibilidade com Excel
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { 
        type: 'text/csv;charset=utf-8;' 
      });
      
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'modelo_documentos.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Modelo exportado com sucesso!',
        description: 'O arquivo modelo_documentos.csv foi baixado. Abra no Excel para ver as colunas separadas.',
      });
    } catch (error) {
      console.error('Erro ao exportar modelo:', error);
      toast({
        title: 'Erro ao exportar modelo',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportDocuments = async (documents: any[]) => {
    try {
      setIsExporting(true);
      
      const csvData = [
        [
          'categoria',
          'codigo',
          'sigla',
          'nome_curso',
          'descricao_curso',
          'carga_horaria',
          'validade',
          'modalidade',
          'detalhes',
          'url_site',
          'flag_requisito',
          'nome_ingles'
        ],
        ...documents.map(doc => [
          doc.categoria || '',
          doc.codigo || '',
          doc.sigla || '',
          doc.nome_curso || doc.name || '',
          doc.descricao_curso || '',
          doc.carga_horaria || '',
          doc.validade || '',
          doc.modalidade || '',
          doc.detalhes || '',
          doc.url_site || '',
          doc.flag_requisito || '',
          doc.nome_ingles || ''
        ])
      ];

      // Criar CSV com separador de vírgula e aspas duplas apenas quando necessário
      const csvContent = csvData
        .map(row => 
          row.map(field => {
            // Se o campo contém vírgula, aspas ou quebra de linha, envolver com aspas
            if (field.includes(',') || field.includes('"') || field.includes('\n')) {
              return `"${field.replace(/"/g, '""')}"`;
            }
            return field;
          }).join(',')
        )
        .join('\r\n'); // Usar \r\n para melhor compatibilidade com Windows/Excel

      // Adicionar BOM (Byte Order Mark) para UTF-8 para melhor compatibilidade com Excel
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { 
        type: 'text/csv;charset=utf-8;' 
      });
      
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'documentos.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Documentos exportados com sucesso!',
        description: `${documents.length} documento(s) exportado(s).`,
      });
    } catch (error) {
      console.error('Erro ao exportar documentos:', error);
      toast({
        title: 'Erro ao exportar documentos',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const parseCSV = (csvText: string): DocumentImportData[] => {
    // Remover BOM se presente
    const cleanText = csvText.replace(/^\uFEFF/, '');
    
    // Dividir em linhas, considerando tanto \n quanto \r\n
    const lines = cleanText.split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('Arquivo CSV deve ter pelo menos uma linha de cabeçalho e uma linha de dados');
    }
    
    // Parse do cabeçalho
    const headers = parseCSVLine(lines[0]);
    
    const data: DocumentImportData[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      data.push(row as DocumentImportData);
    }
    
    return data;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Aspas duplas escapadas
          current += '"';
          i += 2;
        } else {
          // Início ou fim de campo com aspas
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // Separador de campo
        result.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }
    
    // Adicionar o último campo
    result.push(current.trim());
    
    return result;
  };

  const validateDocumentData = (data: DocumentImportData, rowIndex: number): string[] => {
    const errors: string[] = [];
    
    if (!data.categoria || data.categoria.trim() === '') {
      errors.push('Categoria é obrigatória');
    }
    
    if (!data.nome_curso || data.nome_curso.trim() === '') {
      errors.push('Nome do curso é obrigatório');
    }
    
    return errors;
  };

  const importDocuments = async (file: File): Promise<ImportResult> => {
    try {
      setIsImporting(true);
      
      const csvText = await file.text();
      const documents = parseCSV(csvText);
      
      const result: ImportResult = {
        success: 0,
        errors: []
      };
      
      for (let i = 0; i < documents.length; i++) {
        const document = documents[i];
        const rowNumber = i + 2; // +2 porque começamos na linha 2 (linha 1 é cabeçalho)
        
        const validationErrors = validateDocumentData(document, rowNumber);
        
        if (validationErrors.length > 0) {
          result.errors.push({
            row: rowNumber,
            message: validationErrors.join(', '),
            data: document
          });
          continue;
        }
        
        try {
          // Prepare data object with only existing fields
          const insertData: any = {
            // Legacy fields (always exist)
            name: document.nome_curso || document.name || '',
            group_name: document.group_name || null,
            document_category: document.document_category || null,
            document_type: document.document_type || null,
            issuing_authority: document.issuing_authority || null,
            modality: document.modality || null,
            sigla_documento: document.sigla || null,
            detail: document.detalhes || null,
            
            // New unified fields (may not exist yet)
            categoria: document.categoria,
          };

          // Add new fields only if they have values
          if (document.codigo && document.codigo.trim() !== '') {
            insertData.codigo = document.codigo;
          }
          if (document.nome_curso && document.nome_curso.trim() !== '') {
            insertData.nome_curso = document.nome_curso;
          }
          if (document.descricao_curso && document.descricao_curso.trim() !== '') {
            insertData.descricao_curso = document.descricao_curso;
          }
          if (document.carga_horaria && document.carga_horaria.trim() !== '') {
            insertData.carga_horaria = document.carga_horaria;
          }
          if (document.validade && document.validade.trim() !== '') {
            insertData.validade = document.validade;
          }
          if (document.detalhes && document.detalhes.trim() !== '') {
            insertData.detalhes = document.detalhes;
          }
          if (document.url_site && document.url_site.trim() !== '') {
            insertData.url_site = document.url_site;
          }
          if (document.flag_requisito && document.flag_requisito.trim() !== '') {
            insertData.flag_requisito = document.flag_requisito;
          }
          if (document.nome_ingles && document.nome_ingles.trim() !== '') {
            insertData.nome_ingles = document.nome_ingles;
          }

          const { error } = await supabase
            .from('documents_catalog')
            .insert(insertData);
          
          if (error) {
            result.errors.push({
              row: rowNumber,
              message: `Erro no banco de dados: ${error.message}`,
              data: document
            });
          } else {
            result.success++;
          }
        } catch (error) {
          result.errors.push({
            row: rowNumber,
            message: `Erro inesperado: ${error}`,
            data: document
          });
        }
      }
      
      if (result.success > 0) {
        toast({
          title: 'Importação concluída!',
          description: `${result.success} documento(s) importado(s) com sucesso.`,
        });
      }
      
      if (result.errors.length > 0) {
        toast({
          title: 'Alguns documentos não foram importados',
          description: `${result.errors.length} erro(s) encontrado(s). Verifique os dados.`,
          variant: 'destructive',
        });
      }
      
      return result;
    } catch (error) {
      console.error('Erro ao importar documentos:', error);
      toast({
        title: 'Erro ao importar documentos',
        description: 'Verifique se o arquivo está no formato correto.',
        variant: 'destructive',
      });
      
      return {
        success: 0,
        errors: [{
          row: 0,
          message: 'Erro ao processar arquivo',
          data: {} as DocumentImportData
        }]
      };
    } finally {
      setIsImporting(false);
    }
  };

  return {
    exportTemplate,
    exportDocuments,
    importDocuments,
    isImporting,
    isExporting,
  };
}