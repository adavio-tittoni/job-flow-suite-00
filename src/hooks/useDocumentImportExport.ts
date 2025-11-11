import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

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

  const exportTemplateExcel = () => {
    try {
      // Criar workbook
      const workbook = XLSX.utils.book_new();
      
      // Dados do template
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
        ]
      ];
      
      // Criar worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(templateData);
      
      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Modelo Documentos');
      
      // Baixar arquivo
      XLSX.writeFile(workbook, 'modelo_documentos.xlsx');
      
      toast({
        title: "Modelo Excel baixado",
        description: "O arquivo modelo_documentos.xlsx foi baixado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao baixar modelo Excel",
        description: "Ocorreu um erro ao gerar o arquivo Excel.",
        variant: "destructive",
      });
    }
  };

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

  const exportDocumentsExcel = async (documents: any[]) => {
    try {
      setIsExporting(true);
      
      // Preparar dados para exportação
      const exportData = documents.map(doc => ({
        'categoria': doc.categoria || '',
        'codigo': doc.codigo || '',
        'sigla': doc.sigla || '',
        'nome_curso': doc.nome_curso || doc.name || '',
        'descricao_curso': doc.descricao_curso || '',
        'carga_horaria': doc.carga_horaria || '',
        'validade': doc.validade || '',
        'modalidade': doc.modalidade || '',
        'detalhes': doc.detalhes || '',
        'url_site': doc.url_site || '',
        'flag_requisito': doc.flag_requisito || '',
        'nome_ingles': doc.nome_ingles || ''
      }));

      // Criar workbook
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Ajustar largura das colunas
      const columnWidths = [
        { wch: 25 }, // categoria
        { wch: 15 }, // codigo
        { wch: 10 }, // sigla
        { wch: 40 }, // nome_curso
        { wch: 50 }, // descricao_curso
        { wch: 15 }, // carga_horaria
        { wch: 15 }, // validade
        { wch: 15 }, // modalidade
        { wch: 40 }, // detalhes
        { wch: 30 }, // url_site
        { wch: 15 }, // flag_requisito
        { wch: 40 }  // nome_ingles
      ];
      worksheet['!cols'] = columnWidths;
      
      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Documentos');
      
      // Baixar arquivo
      XLSX.writeFile(workbook, 'documentos.xlsx');

      toast({
        title: 'Documentos exportados com sucesso!',
        description: `${documents.length} documento(s) exportado(s) em Excel.`,
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

  const parseExcel = (file: File): Promise<DocumentImportData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length < 2) {
            throw new Error('Arquivo Excel deve ter pelo menos uma linha de cabeçalho e uma linha de dados');
          }
          
          const headers = jsonData[0] as string[];
          const dataRows = jsonData.slice(1) as any[][];
          
          const documents: DocumentImportData[] = dataRows.map((row, index) => {
            const document: any = {};
            
            headers.forEach((header, colIndex) => {
              if (header) {
                const value = row[colIndex];
                // Converter valores para string e limpar espaços
                const cleanValue = value ? String(value).trim() : '';
                document[header] = cleanValue;
              }
            });
            
            // Mapeamento inteligente de campos
            // Se não tem categoria mas tem nome_curso, usar nome_curso como categoria
            if (!document.categoria && document.nome_curso) {
              document.categoria = document.nome_curso;
            }
            
            // Se não tem nome_curso mas tem categoria, usar categoria como nome_curso
            if (!document.nome_curso && document.categoria) {
              document.nome_curso = document.categoria;
            }
            
            // Mapeamento de campos legacy
            if (!document.name && document.nome_curso) {
              document.name = document.nome_curso;
            }
            
            // Garantir que campos obrigatórios existam
            if (!document.categoria) {
              document.categoria = document.nome_curso || document.name || 'Sem categoria';
            }
            if (!document.nome_curso) {
              document.nome_curso = document.categoria || document.name || 'Documento sem nome';
            }
            if (!document.name) {
              document.name = document.nome_curso || document.categoria || 'Documento sem nome';
            }
            
            return document as DocumentImportData;
          });
          
          resolve(documents);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Erro ao ler o arquivo Excel'));
      };
      
      reader.readAsArrayBuffer(file);
    });
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
    
    // Validação de campos obrigatórios - mais flexível
    if (!data.categoria || data.categoria.trim() === '') {
      // Se não tem categoria, mas tem nome_curso, usar nome_curso como categoria
      if (data.nome_curso && data.nome_curso.trim() !== '') {
        data.categoria = data.nome_curso;
      } else {
        errors.push('Categoria é obrigatória (ou nome do curso)');
      }
    }
    
    // Garantir que sempre temos um nome
    if (!data.nome_curso || data.nome_curso.trim() === '') {
      if (data.categoria && data.categoria.trim() !== '') {
        data.nome_curso = data.categoria;
      } else {
        errors.push('Nome do curso é obrigatório (ou categoria)');
      }
    }
    
    // Validação de campos opcionais - apenas campos obrigatórios são validados
    // Campos opcionais são aceitos em qualquer formato para maior flexibilidade
    
    return errors;
  };

  const importDocuments = async (file: File): Promise<ImportResult> => {
    try {
      setIsImporting(true);
      
      let documents: DocumentImportData[];
      
      // Detectar tipo de arquivo e usar parser apropriado
      const fileExtension = file.name.toLowerCase().split('.').pop();
      
      if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        documents = await parseExcel(file);
      } else if (fileExtension === 'csv') {
        const csvText = await file.text();
        documents = parseCSV(csvText);
      } else {
        throw new Error('Formato de arquivo não suportado. Use CSV ou Excel (.xlsx/.xls)');
      }
      
      const result: ImportResult = {
        success: 0,
        errors: []
      };
      
      for (let i = 0; i < documents.length; i++) {
        const document = documents[i];
        const rowNumber = i + 2; // +2 porque começamos na linha 2 (linha 1 é cabeçalho)
        
        console.log(`Processando linha ${rowNumber}:`, document);
        
        const validationErrors = validateDocumentData(document, rowNumber);
        
        if (validationErrors.length > 0) {
          console.log(`Erros de validação na linha ${rowNumber}:`, validationErrors);
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
            // Campos obrigatórios (sempre devem existir)
            categoria: document.categoria || 'Sem categoria',
            name: document.nome_curso || document.name || document.categoria || 'Documento sem nome',
            
            // Campos opcionais (legacy)
            group_name: document.group_name || null,
            document_category: document.document_category || null,
            document_type: document.document_type || null,
            issuing_authority: document.issuing_authority || null,
            modality: document.modality || null,
            sigla_documento: document.sigla || null,
            detail: document.detalhes || null,
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

          console.log(`Inserindo dados na linha ${rowNumber}:`, insertData);

          const { error } = await supabase
            .from('documents_catalog')
            .insert(insertData);
          
          if (error) {
            let errorMessage = 'Erro no banco de dados';
            
            if (error.code === '23505') {
              errorMessage = 'Documento já existe (código duplicado)';
            } else if (error.code === '23502') {
              errorMessage = 'Campo obrigatório não preenchido';
            } else if (error.message) {
              errorMessage = error.message;
            }
            
            result.errors.push({
              row: rowNumber,
              message: errorMessage,
              data: document
            });
          } else {
            result.success++;
          }
        } catch (error: any) {
          console.error('Erro ao inserir documento:', error);
          
          let errorMessage = 'Erro inesperado ao inserir documento';
          
          if (error.message) {
            errorMessage = error.message;
          }
          
          result.errors.push({
            row: rowNumber,
            message: errorMessage,
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
    exportTemplateExcel,
    exportDocuments,
    exportDocumentsExcel,
    importDocuments,
    isImporting,
    isExporting,
  };
}