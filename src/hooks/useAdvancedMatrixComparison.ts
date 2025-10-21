import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MatrixItem {
  id: string;
  document_id: string;
  obrigatoriedade: string;
  modalidade: string;
  carga_horaria: number | null;
  documents_catalog: {
    id: string;
    name: string;
    codigo: string;
    sigla_documento: string | null;
    categoria: string | null;
    document_category: string | null;
  };
}

interface CandidateDocument {
  id: string;
  document_name: string;
  group_name: string | null;
  catalog_document_id: string | null;
  codigo: string | null;
  sigla_documento: string | null;
  expiry_date: string | null;
  carga_horaria_total: number | null;
  modality: string | null;
  issue_date: string | null;
  detail: string | null;
}

interface ComparisonResult {
  status: 'Confere' | 'Parcial' | 'Pendente';
  validadeStatus: 'Valido' | 'Vencido' | 'N/A';
  observacoes: string;
  matchedDocument?: CandidateDocument;
  similarityScore?: number;
}

// Função para normalizar strings
const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/\s+/g, ' ') // Remove espaços duplicados
    .trim();
};

// Função para calcular similaridade entre strings (versão simplificada)
const calculateSimilarity = (str1: string, str2: string): number => {
  const normalized1 = normalizeString(str1);
  const normalized2 = normalizeString(str2);
  
  // Se são idênticos após normalização
  if (normalized1 === normalized2) {
    return 1.0;
  }
  
  // Verificar se um contém o outro
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return 0.9;
  }
  
  // Comparação simples por palavras
  const words1 = normalized1.split(' ').filter(w => w.length > 2);
  const words2 = normalized2.split(' ').filter(w => w.length > 2);
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  if (union.size === 0) return 0;
  
  return intersection.size / union.size;
};

// Função para verificar validade
const checkValidity = (expiryDate: string | null): 'Valido' | 'Vencido' | 'N/A' => {
  if (!expiryDate || expiryDate.trim() === '' || expiryDate === 'null' || expiryDate === 'undefined') {
    return 'N/A';
  }
  
  const today = new Date();
  const expiry = new Date(expiryDate);
  
  if (isNaN(expiry.getTime())) {
    return 'N/A';
  }
  
  return expiry >= today ? 'Valido' : 'Vencido';
};

// Função para determinar se é documento de identidade
const isIdentityDocument = (documentName: string): boolean => {
  const normalized = normalizeString(documentName);
  const identityKeywords = ['cir', 'rg', 'passaporte', 'identidade', 'registro'];
  return identityKeywords.some(keyword => normalized.includes(keyword));
};

// Função para determinar se é certificado de curso
const isCourseCertificate = (documentName: string): boolean => {
  const normalized = normalizeString(documentName);
  const courseKeywords = ['curso', 'treinamento', 'capacitação', 'certificado', 'nr-', 'stcw', 'huet', 'thuet', 'cbsp', 'caebs'];
  return courseKeywords.some(keyword => normalized.includes(keyword));
};

// Função principal de comparação seguindo o prompt
const compareDocumentWithMatrix = (
  candidateDoc: CandidateDocument,
  matrixItems: MatrixItem[]
): ComparisonResult => {
  
  // 1. Tentar match por código primeiro
  let bestMatch: MatrixItem | null = null;
  let matchType: 'codigo' | 'sigla' | 'similarity' | 'none' = 'none';
  let similarityScore = 0;
  
  if (candidateDoc.codigo) {
    bestMatch = matrixItems.find(item => 
      item.documents_catalog.codigo && 
      normalizeString(item.documents_catalog.codigo) === normalizeString(candidateDoc.codigo)
    );
    if (bestMatch) {
      matchType = 'codigo';
      similarityScore = 1.0;
    }
  }
  
  // 2. Se não encontrou por código, tentar por sigla
  if (!bestMatch && candidateDoc.sigla_documento) {
    bestMatch = matrixItems.find(item => 
      item.documents_catalog.sigla_documento && 
      normalizeString(item.documents_catalog.sigla_documento) === normalizeString(candidateDoc.sigla_documento)
    );
    if (bestMatch) {
      matchType = 'sigla';
      similarityScore = 0.9;
    }
  }
  
  // 2. Se não encontrou por código, tentar por similaridade
  if (!bestMatch) {
    let bestSimilarity = 0;
    
    for (const matrixItem of matrixItems) {
      const similarity = calculateSimilarity(
        candidateDoc.document_name,
        matrixItem.documents_catalog.name
      );
      
      if (similarity > bestSimilarity && similarity >= 0.8) {
        bestSimilarity = similarity;
        bestMatch = matrixItem;
        matchType = 'similarity';
        similarityScore = similarity;
      }
    }
  }
  
  // 3. Se não encontrou correspondência
  if (!bestMatch) {
    return {
      status: 'Pendente',
      validadeStatus: checkValidity(candidateDoc.expiry_date),
      observacoes: 'Documento não encontrado na matriz'
    };
  }
  
  const matrixItem = bestMatch;
  const validadeStatus = checkValidity(candidateDoc.expiry_date);
  
  // 4. Determinar status baseado no tipo de documento
  if (isIdentityDocument(candidateDoc.document_name)) {
    // Documentos de identidade: comparação flexível
    if (validadeStatus === 'Valido' || validadeStatus === 'N/A') {
      return {
        status: 'Confere',
        validadeStatus,
        observacoes: matchType === 'codigo' ? 'Código confere' : 'Descrição textual difere, mas é equivalente',
        matchedDocument: candidateDoc,
        similarityScore
      };
    } else {
      return {
        status: 'Parcial',
        validadeStatus,
        observacoes: 'Documento vencido',
        matchedDocument: candidateDoc,
        similarityScore
      };
    }
  }
  
  if (isCourseCertificate(candidateDoc.document_name)) {
    // Certificados de curso: comparação mais rígida
    let status: 'Confere' | 'Parcial' | 'Pendente' = 'Confere';
    let observacoes = 'Requisito atendido';
    
    // Verificar horas
    if (matrixItem.carga_horaria && matrixItem.carga_horaria > 0) {
      const actualHours = candidateDoc.carga_horaria_total || 0;
      if (actualHours < matrixItem.carga_horaria) {
        status = 'Parcial';
        observacoes = `Matriz exige ${matrixItem.carga_horaria}h; documento informa ${actualHours}h (inferior)`;
      }
    }
    
    // Verificar modalidade
    if (matrixItem.modalidade && matrixItem.modalidade !== 'N/A') {
      if (candidateDoc.modality && candidateDoc.modality !== matrixItem.modalidade) {
        if (status === 'Confere') {
          status = 'Parcial';
        }
        observacoes += observacoes !== 'Requisito atendido' ? ' ' : '';
        observacoes += `Matriz exige modalidade ${matrixItem.modalidade}; documento informa ${candidateDoc.modality}`;
      }
    }
    
    // Verificar validade
    if (validadeStatus === 'Vencido') {
      status = 'Parcial';
      observacoes += observacoes !== 'Requisito atendido' ? ' ' : '';
      observacoes += 'Documento vencido';
    }
    
    // Adicionar informação de similaridade se não foi match por código
    if (matchType === 'similarity') {
      observacoes += ` Similaridade: ${Math.round(similarityScore * 100)}%`;
    }
    
    return {
      status,
      validadeStatus,
      observacoes,
      matchedDocument: candidateDoc,
      similarityScore
    };
  }
  
  // Documentos genéricos
  return {
    status: similarityScore >= 0.8 ? 'Confere' : 'Pendente',
    validadeStatus,
    observacoes: similarityScore >= 0.8 ? 'Requisito atendido' : 'Documento não corresponde ao exigido',
    matchedDocument: candidateDoc,
    similarityScore
  };
};

export const useAdvancedMatrixComparison = (candidateId: string, matrixId: string | null) => {
  const [comparisonResults, setComparisonResults] = useState<Array<{
    matrixItem: MatrixItem;
    result: ComparisonResult;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComparison = useCallback(async () => {
    if (!candidateId || !matrixId) {
      console.log('❌ useAdvancedMatrixComparison: Missing candidateId or matrixId', { candidateId, matrixId });
      return;
    }

    console.log('🔄 useAdvancedMatrixComparison: Starting fetch for', { candidateId, matrixId });
    setLoading(true);
    setError(null);

    try {
      // Buscar itens da matriz
      const { data: matrixItems, error: matrixError } = await supabase
        .from('matrix_items')
        .select(`
          id,
          document_id,
          obrigatoriedade,
          modalidade,
          carga_horaria,
          documents_catalog (
            id,
            name,
            codigo,
            sigla_documento,
            categoria,
            document_category
          )
        `)
        .eq('matrix_id', matrixId);

      if (matrixError) throw matrixError;

      // Filtrar apenas itens com documentos válidos no catálogo
      const validMatrixItems = matrixItems?.filter(item => 
        item.documents_catalog && item.documents_catalog.id
      ) || [];

      // Buscar documentos do candidato
      const { data: candidateDocs, error: docsError } = await supabase
        .from('candidate_documents')
        .select('*')
        .eq('candidate_id', candidateId);

      if (docsError) throw docsError;

      // Processar comparação para cada item da matriz
      const results: Array<{
        matrixItem: MatrixItem;
        result: ComparisonResult;
      }> = [];

      for (const matrixItem of validMatrixItems) {
        // Encontrar o melhor match entre os documentos do candidato
        let bestResult: ComparisonResult = {
          status: 'Pendente',
          validadeStatus: 'N/A',
          observacoes: 'Documento não encontrado na matriz'
        };

        for (const candidateDoc of candidateDocs || []) {
          const result = compareDocumentWithMatrix(candidateDoc, [matrixItem]);
          
          // Se encontrou um match melhor, usar ele
          if (result.status === 'Confere' || 
              (result.status === 'Parcial' && bestResult.status === 'Pendente')) {
            bestResult = result;
          }
        }

        results.push({
          matrixItem,
          result: bestResult
        });
      }

      setComparisonResults(results);
      console.log('✅ useAdvancedMatrixComparison: Results updated', { 
        totalResults: results.length,
        summary: {
          approved: results.filter(r => r.result.status === 'Confere').length,
          partial: results.filter(r => r.result.status === 'Parcial').length,
          pending: results.filter(r => r.result.status === 'Pendente').length,
          adherencePercentage: results.length > 0 ? Math.round((results.filter(r => r.result.status === 'Confere').length / results.length) * 100) : 0
        }
      });

    } catch (err: any) {
      console.error('Erro na comparação avançada:', err);
      setError(err.message || 'Erro ao carregar comparação');
    } finally {
      setLoading(false);
    }
  }, [candidateId, matrixId]);

  useEffect(() => {
    console.log('🔄 useAdvancedMatrixComparison: useEffect triggered', { candidateId, matrixId });
    fetchComparison();
  }, [fetchComparison]);

  return {
    comparisonResults,
    loading,
    error,
    refetch: fetchComparison
  };
};
