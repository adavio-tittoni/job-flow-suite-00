import { supabase } from '@/integrations/supabase/client';

// Função para normalizar strings
const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

// Função para extrair palavras-chave importantes
const extractKeywords = (text: string): string[] => {
  const words = text.split(' ').filter(word => word.length > 2);
  
  // Palavras-chave importantes para documentos técnicos
  const importantKeywords = [
    'nr-35', 'nr-33', 'nr-12', 'nr-10', 'nr-11', 'nr-18', 'nr-20',
    'stcw', 'huet', 'thuet', 'bso', 'ca-ebs', 'tst', 'supervisor',
    'trabalho', 'altura', 'confinado', 'segurança', 'treinamento',
    'capacitação', 'plataforma', 'petróleo', 'offshore', 'marítimo',
    'aquaviário', 'helicopter', 'escape', 'submersa', 'sobrevivência'
  ];
  
  const keywords = new Set<string>();
  
  // Adicionar palavras-chave importantes encontradas
  importantKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      keywords.add(keyword);
    }
  });
  
  // Adicionar palavras comuns (exceto artigos e preposições)
  const commonWords = ['de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no', 'nas', 'nos', 'para', 'com', 'por', 'sobre', 'entre'];
  words.forEach(word => {
    if (!commonWords.includes(word) && word.length > 3) {
      keywords.add(word);
    }
  });
  
  return Array.from(keywords);
};

// Função para comparação básica
const calculateBasicSimilarity = (text1: string, text2: string): number => {
  const normalized1 = normalizeString(text1);
  const normalized2 = normalizeString(text2);
  
  // Se os textos são idênticos após normalização
  if (normalized1 === normalized2) {
    return 1.0;
  }
  
  // Verificar se um texto contém o outro
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return 0.9;
  }
  
  // Comparação por palavras-chave importantes
  const keywords1 = extractKeywords(normalized1);
  const keywords2 = extractKeywords(normalized2);
  
  const intersection = new Set([...keywords1].filter(x => keywords2.has(x)));
  const union = new Set([...keywords1, ...keywords2]);
  
  if (union.size === 0) return 0;
  
  return intersection.size / union.size;
};

export const updateCandidateDocumentCodes = async () => {
  try {
    console.log('Iniciando atualização de códigos dos documentos dos candidatos...');
    
    // Buscar todos os documentos dos candidatos sem código
    const { data: candidateDocs, error: docsError } = await supabase
      .from('candidate_documents')
      .select('*')
      .is('codigo', null);

    if (docsError) throw docsError;

    console.log(`Encontrados ${candidateDocs?.length || 0} documentos sem código`);

    // Buscar todos os documentos do catálogo com código e sigla
    const { data: catalogDocs, error: catalogError } = await supabase
      .from('documents_catalog')
      .select('*')
      .not('codigo', 'is', null);

    if (catalogError) throw catalogError;

    console.log(`Encontrados ${catalogDocs?.length || 0} documentos do catálogo com código`);

    let updatedCount = 0;
    const updates: Array<{ id: string; codigo: string; sigla_documento: string; catalog_document_id: string }> = [];

    // Para cada documento do candidato, tentar encontrar correspondência no catálogo
    for (const candidateDoc of candidateDocs || []) {
      let bestMatch = null;
      let bestSimilarity = 0;

      for (const catalogDoc of catalogDocs || []) {
        const similarity = calculateBasicSimilarity(
          candidateDoc.document_name,
          catalogDoc.name
        );

        if (similarity > bestSimilarity && similarity > 0.7) {
          bestSimilarity = similarity;
          bestMatch = catalogDoc;
        }
      }

      if (bestMatch) {
        updates.push({
          id: candidateDoc.id,
          codigo: bestMatch.codigo,
          sigla_documento: bestMatch.sigla_documento || bestMatch.codigo,
          catalog_document_id: bestMatch.id
        });
        console.log(`Match encontrado: "${candidateDoc.document_name}" -> "${bestMatch.name}" (${bestMatch.codigo}) - Similaridade: ${bestSimilarity.toFixed(2)}`);
      }
    }

    // Atualizar os documentos em lotes
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('candidate_documents')
        .update({
          codigo: update.codigo,
          sigla_documento: update.sigla_documento,
          catalog_document_id: update.catalog_document_id
        })
        .eq('id', update.id);

      if (updateError) {
        console.error(`Erro ao atualizar documento ${update.id}:`, updateError);
      } else {
        updatedCount++;
      }
    }

    console.log(`Atualização concluída! ${updatedCount} documentos atualizados.`);
    return { success: true, updatedCount };

  } catch (error) {
    console.error('Erro na atualização de códigos:', error);
    return { success: false, error };
  }
};
