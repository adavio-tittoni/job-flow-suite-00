import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { compareDocumentWithMatrix, calculateAdherenceStats, normalizeString, ComparisonResult } from '@/utils/documentComparison';

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

      console.log('📊 useAdvancedMatrixComparison: Matrix items fetched', {
        totalItems: matrixItems?.length || 0,
        items: matrixItems?.map(item => ({
          id: item.id,
          document_id: item.document_id,
          hasDocumentsCatalog: !!item.documents_catalog,
          documentsCatalog: item.documents_catalog ? {
            id: item.documents_catalog.id,
            name: item.documents_catalog.name,
            codigo: item.documents_catalog.codigo,
            sigla_documento: item.documents_catalog.sigla_documento
          } : 'UNDEFINED'
        }))
      });

      // Filtrar apenas itens com documentos válidos no catálogo
      const validMatrixItems = matrixItems?.filter(item => {
        const isValid = item.documents_catalog && item.documents_catalog.id;
        if (!isValid) {
          console.warn('⚠️ useAdvancedMatrixComparison: Invalid matrix item', {
            itemId: item.id,
            document_id: item.document_id,
            documents_catalog: item.documents_catalog
          });
        }
        return isValid;
      }) || [];

      // Buscar documentos do candidato com todos os campos necessários
      const { data: candidateDocs, error: docsError } = await supabase
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
          tipo_de_codigo
        `)
        .eq('candidate_id', candidateId);

      if (docsError) throw docsError;

      console.log('📊 useAdvancedMatrixComparison: Candidate documents fetched', {
        candidateId,
        totalDocs: candidateDocs?.length || 0,
        docs: candidateDocs?.map(doc => ({
          id: doc.id,
          document_name: doc.document_name,
          catalog_document_id: doc.catalog_document_id,
          sigla_documento: doc.sigla_documento,
          codigo: doc.codigo
        }))
      });

      // Processar comparação para cada item da matriz
      const results: Array<{
        matrixItem: MatrixItem;
        result: ComparisonResult;
      }> = [];

      for (const matrixItem of validMatrixItems) {
        console.log('🔍 useAdvancedMatrixComparison: Processing matrixItem', {
          matrixItemId: matrixItem.id,
          documents_catalog: matrixItem.documents_catalog ? {
            id: matrixItem.documents_catalog.id,
            name: matrixItem.documents_catalog.name,
            sigla_documento: matrixItem.documents_catalog.sigla_documento,
            codigo: matrixItem.documents_catalog.codigo
          } : 'UNDEFINED',
          candidateDocsCount: candidateDocs?.length || 0
        });

        // Preparar dados da matriz com modalidade e carga horária
        const matrixDocWithDetails = {
          ...matrixItem.documents_catalog,
          modality: matrixItem.modalidade,
          carga_horaria: matrixItem.carga_horaria
        };

        // Usar a função centralizada de comparação para garantir consistência
        const comparisonResult = compareDocumentWithMatrix(matrixDocWithDetails, candidateDocs || []);
        
        results.push({
          matrixItem,
          result: comparisonResult
        });
      }

      setComparisonResults(results);
      console.log('✅ useAdvancedMatrixComparison: Results updated', { 
        candidateId,
        matrixId,
        totalResults: results.length,
        summary: {
          approved: results.filter(r => r.result.status === 'Confere').length,
          partial: results.filter(r => r.result.status === 'Parcial').length,
          pending: results.filter(r => r.result.status === 'Pendente').length,
          adherencePercentage: results.length > 0 ? Math.round((results.filter(r => r.result.status === 'Confere').length / results.length) * 100) : 0
        },
        detailedResults: results.map(r => ({
          documentName: r.matrixItem.documents_catalog?.name || 'Nome não disponível',
          status: r.result.status,
          observations: r.result.observations,
          similarityScore: r.result.similarityScore
        }))
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
