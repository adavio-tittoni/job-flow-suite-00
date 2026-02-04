import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { compareDocumentWithMatrix, MatrixDocument, CandidateDocument } from '@/utils/documentComparison';

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

      // 3. Buscar documentos do candidato com todos os campos necessários
      const { data: candidateDocs, error: candidateDocsError } = await supabase
        .from('candidate_documents')
        .select(`
          id,
          candidate_id,
          document_name,
          group_name,
          catalog_document_id,
          codigo,
          sigla_documento,
          expiry_date,
          carga_horaria_total,
          modality,
          issue_date,
          detail,
          document_category,
          document_type,
          issuing_authority,
          registration_number,
          carga_horaria_teorica,
          carga_horaria_pratica,
          link_validacao,
          file_url,
          arquivo_original,
          tipo_de_codigo,
          declaracao
        `)
        .eq('candidate_id', candidateId);

      if (candidateDocsError) throw candidateDocsError;

      // 4. Processar comparação com todos os dados
      const documents: CandidateDocumentWithCatalog[] = [];
      let approvedCount = 0;
      let pendingCount = 0;
      let partialCount = 0;

      for (const matrixItem of matrixItems || []) {
        const catalogDoc = matrixItem.documents_catalog;
        
        // Preparar dados da matriz com modalidade e carga horária
        const matrixDocWithDetails: MatrixDocument = {
          ...catalogDoc,
          modality: matrixItem.modalidade,
          carga_horaria: matrixItem.carga_horaria
        };

        // Usar a função centralizada de comparação
        const comparisonResult = compareDocumentWithMatrix(matrixDocWithDetails, candidateDocs || []);
        const matchedDoc = comparisonResult.matchedDocument;
        const matchType = comparisonResult.matchType;
        const similarityScore = comparisonResult.similarityScore;
        const observations = comparisonResult.observations;

        // Mapear status para o formato esperado pelo hook
        let status: 'approved' | 'pending' | 'partial' | 'missing' = 'missing';
        switch (comparisonResult.status) {
          case 'Confere':
            status = 'approved';
            approvedCount++;
            break;
          case 'Parcial':
            status = 'partial';
            partialCount++;
            break;
          case 'Pendente':
            status = 'pending';
            pendingCount++;
            break;
          default:
            status = 'missing';
            pendingCount++;
        }

        // Criar objeto com todos os dados do catálogo + informações do candidato
        const documentWithCatalog: CandidateDocumentWithCatalog = {
          ...catalogDoc,
          candidate_document_id: matchedDoc?.id,
          candidate_document_name: matchedDoc?.document_name,
          candidate_codigo: matchedDoc?.codigo,
          status,
          observation: observations,
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
