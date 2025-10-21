import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DocumentCatalogData {
  id: string;
  name: string;
  group_name: string;
  document_category: string;
  document_type: string;
  codigo: string;
  sigla: string;
  sigla_documento: string;
  nome_curso: string;
  descricao_curso: string;
  carga_horaria: string;
  validade: string;
  detalhes: string;
  url_site: string;
  flag_requisito: string;
  nome_ingles: string;
}

interface CandidateDocumentWithCatalog extends DocumentCatalogData {
  candidate_document_id?: string;
  candidate_document_name?: string;
  candidate_codigo?: string;
  status: 'approved' | 'pending' | 'partial' | 'missing';
  observation?: string;
  similarity_score?: number;
  match_type?: 'exact_id' | 'exact_code' | 'semantic_name' | 'none';
}

interface MatrixComparisonResult {
  matrixId: string;
  matrixName: string;
  totalRequirements: number;
  approvedDocuments: number;
  pendingDocuments: number;
  partialDocuments: number;
  adherencePercentage: number;
  documents: CandidateDocumentWithCatalog[];
}

// Função para normalizar strings para comparação
const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s]/g, '') // Remove pontuação
    .replace(/\s+/g, ' ') // Normaliza espaços
    .trim();
};

export const useEnhancedMatrixComparison = (candidateId: string, matrixId: string | null) => {
  const [result, setResult] = useState<MatrixComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEnhancedComparison = async () => {
    if (!matrixId) {
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Buscar dados completos da matriz
      const { data: matrixData, error: matrixError } = await supabase
        .from('matrices')
        .select('id, cargo, empresa')
        .eq('id', matrixId)
        .single();

      if (matrixError) throw matrixError;

      // 2. Buscar TODOS os dados do documents_catalog para os itens da matriz
      const { data: matrixItems, error: matrixItemsError } = await supabase
        .from('matrix_items')
        .select(`
          id,
          document_id,
          obrigatoriedade,
          modalidade,
          carga_horaria,
          regra_validade,
          documents_catalog!inner (
            id,
            name,
            group_name,
            document_category,
            document_type,
            codigo,
            sigla,
            sigla_documento,
            nome_curso,
            descricao_curso,
            carga_horaria,
            validade,
            detalhes,
            url_site,
            flag_requisito,
            nome_ingles
          )
        `)
        .eq('matrix_id', matrixId);

      if (matrixItemsError) throw matrixItemsError;

      // 3. Buscar documentos do candidato
      const { data: candidateDocs, error: candidateDocsError } = await supabase
        .from('candidate_documents')
        .select('*')
        .eq('candidate_id', candidateId);

      if (candidateDocsError) throw candidateDocsError;

      // 4. Processar comparação com todos os dados
      const documents: CandidateDocumentWithCatalog[] = [];
      let approvedCount = 0;
      let pendingCount = 0;
      let partialCount = 0;

      for (const matrixItem of matrixItems || []) {
        const catalogDoc = matrixItem.documents_catalog;
        
        // Tentar encontrar documento correspondente do candidato
        let matchedDoc = null;
        let matchType: 'exact_id' | 'exact_code' | 'semantic_name' | 'none' = 'none';
        let similarityScore = 0;

        // 1. Comparação exata por catalog_document_id
        matchedDoc = candidateDocs?.find(doc => 
          doc.catalog_document_id === catalogDoc.id
        );
        if (matchedDoc) {
          matchType = 'exact_id';
          similarityScore = 1.0;
        }

        // 2. Comparação por código
        if (!matchedDoc && catalogDoc.codigo) {
          matchedDoc = candidateDocs?.find(doc => {
            const docCodigo = doc.codigo;
            return docCodigo && 
              docCodigo.toLowerCase().trim() === catalogDoc.codigo.toLowerCase().trim();
          });
          if (matchedDoc) {
            matchType = 'exact_code';
            similarityScore = 0.95;
          }
        }

        // 3. Comparação rápida por nome (sem IA)
        if (!matchedDoc) {
          // Buscar match por nome normalizado (comparação rápida)
          const reqDocName = normalizeString(catalogDoc.name);
          matchedDoc = candidateDocs?.find(doc => {
            const docName = normalizeString(doc.document_name);
            return docName === reqDocName;
          });
          
          if (matchedDoc) {
            matchType = 'semantic_name';
            similarityScore = 0.8; // Similaridade alta para match exato por nome
          }
        }

        // Determinar status do documento
        let status: 'approved' | 'pending' | 'partial' | 'missing' = 'missing';
        let observation = 'Documento ausente';

        if (matchedDoc) {
          // Verificar validade
          const expiryDate = matchedDoc.expiry_date ? new Date(matchedDoc.expiry_date) : null;
          const today = new Date();

          if (expiryDate && expiryDate < today) {
            status = 'pending';
            observation = 'Documento vencido';
          } else {
            // Verificar carga horária se necessário
            if (matrixItem.carga_horaria && matrixItem.carga_horaria > 0) {
              const actualHours = matchedDoc.carga_horaria_total || 0;
              if (actualHours >= matrixItem.carga_horaria) {
                status = 'approved';
                observation = 'Requisito atendido';
                approvedCount++;
              } else if (actualHours > 0) {
                status = 'partial';
                observation = `Horas insuficientes (${actualHours}/${matrixItem.carga_horaria}h)`;
                partialCount++;
              } else {
                status = 'pending';
                observation = 'Horas não informadas';
                pendingCount++;
              }
            } else {
              status = 'approved';
              observation = 'Requisito atendido';
              approvedCount++;
            }
          }
        } else {
          pendingCount++;
        }

        // Criar objeto com todos os dados do catálogo + informações do candidato
        const documentWithCatalog: CandidateDocumentWithCatalog = {
          ...catalogDoc,
          candidate_document_id: matchedDoc?.id,
          candidate_document_name: matchedDoc?.document_name,
          candidate_codigo: matchedDoc?.codigo,
          status,
          observation,
          similarity_score: similarityScore,
          match_type: matchType
        };

        documents.push(documentWithCatalog);
      }

      // Calcular estatísticas
      const totalRequirements = documents.length;
      const adherencePercentage = totalRequirements > 0 
        ? Math.round((approvedCount / totalRequirements) * 100) 
        : 0;

      const matrixName = `${matrixData.cargo} - ${matrixData.empresa}`;

      setResult({
        matrixId,
        matrixName,
        totalRequirements,
        approvedDocuments: approvedCount,
        pendingDocuments: pendingCount,
        partialDocuments: partialCount,
        adherencePercentage,
        documents
      });

    } catch (err: any) {
      console.error('Erro na comparação aprimorada:', err);
      setError(err.message || 'Erro ao carregar comparação');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnhancedComparison();
  }, [candidateId, matrixId]);

  return {
    result,
    loading,
    error,
    refetch: fetchEnhancedComparison
  };
};
