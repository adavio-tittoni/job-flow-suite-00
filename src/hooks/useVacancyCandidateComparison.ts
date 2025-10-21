import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SEMANTIC_COMPARISON_CONFIG } from '@/config/semanticComparison';

interface VacancyCandidateComparison {
  candidateId: string;
  candidateName: string;
  vacancyId: string;
  vacancyTitle: string;
  matrixId: string;
  matrixName: string;
  adherencePercentage: number;
  totalRequirements: number;
  metRequirements: number;
  partialRequirements: number;
  pendingRequirements: number;
  documents: VacancyDocumentComparison[];
}

interface VacancyDocumentComparison {
  requirementId: string;
  documentName: string;
  documentCode: string;
  category: string;
  obligation: string;
  requiredHours: number;
  modality: string;
  status: 'Confere' | 'Parcial' | 'Pendente' | 'N/A - Matriz';
  validityStatus: 'Valido' | 'Vencido' | 'N/A';
  observations: string;
  candidateDocument?: {
    id: string;
    name: string;
    code: string;
    hours: number;
    modality: string;
    expiryDate: string;
  };
  similarityScore?: number;
  matchType?: 'exact_id' | 'exact_code' | 'semantic_name' | 'none';
}

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

// Função para comparação semântica com IA
const compareWithAI = async (candidateDoc: string, matrixDoc: string): Promise<{
  similarity: number;
  confidence: number;
  explanation: string;
}> => {
  try {
    const apiKey = SEMANTIC_COMPARISON_CONFIG.openaiApiKey;
    
    if (!apiKey) {
      // Fallback para comparação básica
      const similarity = calculateBasicSimilarity(candidateDoc, matrixDoc);
      return {
        similarity,
        confidence: similarity > 0.7 ? 0.8 : 0.5,
        explanation: similarity > 0.7 
          ? 'Alta similaridade encontrada por análise de palavras-chave'
          : 'Similaridade baixa - documentos podem ser diferentes'
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: SEMANTIC_COMPARISON_CONFIG.model,
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em análise de documentos técnicos e certificações para RH.
            Sua tarefa é comparar dois documentos e determinar se são equivalentes para fins de contratação.
            IMPORTANTE: Responda APENAS com JSON válido.
            Formato: {"similarity": 0.0-1.0, "confidence": 0.0-1.0, "explanation": "texto explicativo"}`
          },
          {
            role: 'user',
            content: `Compare estes documentos para contratação:
            
            Documento do Candidato: "${candidateDoc}"
            Requisito da Vaga: "${matrixDoc}"
            
            Determine se o candidato atende ao requisito. Considere:
            - Equivalência funcional (ex: Supervisor vs Treinamento)
            - Códigos técnicos (NR-35, STCW, TST-004, etc.)
            - Área de conhecimento
            - Nível hierárquico (Básico vs Avançado vs Supervisor)
            
            Responda APENAS com JSON válido:`
          }
        ],
        temperature: 0.1,
        max_tokens: 150
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim();
    
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Limpar e fazer parse do JSON
    let cleanContent = content;
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    let result;
    try {
      result = JSON.parse(cleanContent);
    } catch (parseError) {
      // Fallback com regex
      const similarityMatch = cleanContent.match(/["']?similarity["']?\s*:\s*([0-9.]+)/i);
      const confidenceMatch = cleanContent.match(/["']?confidence["']?\s*:\s*([0-9.]+)/i);
      const explanationMatch = cleanContent.match(/["']?explanation["']?\s*:\s*["']([^"']+)["']/i);
      
      result = {
        similarity: similarityMatch ? parseFloat(similarityMatch[1]) : 0.5,
        confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5,
        explanation: explanationMatch ? explanationMatch[1] : 'Análise semântica realizada'
      };
    }
    
    return {
      similarity: Math.max(0, Math.min(1, result.similarity)),
      confidence: Math.max(0, Math.min(1, result.confidence)),
      explanation: result.explanation || 'Análise semântica realizada'
    };

  } catch (error: any) {
    console.error('Erro na comparação com IA:', error);
    
    const similarity = calculateBasicSimilarity(candidateDoc, matrixDoc);
    return {
      similarity,
      confidence: 0.3,
      explanation: error.name === 'AbortError' 
        ? 'Timeout na comparação - usando análise básica'
        : 'Comparação básica devido a erro na API'
    };
  }
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

export const useVacancyCandidateComparison = (vacancyId: string) => {
  const [comparisons, setComparisons] = useState<VacancyCandidateComparison[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComparisons = async () => {
    if (!vacancyId) return;

    setLoading(true);
    setError(null);

    try {
      console.log('Iniciando busca de comparações para vaga:', vacancyId);
      // 1. Buscar vaga e matriz
      const { data: vacancy, error: vacancyError } = await supabase
        .from('vacancies')
        .select(`
          id,
          title,
          matrix_id,
          matrices!inner (
            id,
            cargo,
            empresa
          )
        `)
        .eq('id', vacancyId)
        .single();

      if (vacancyError) throw vacancyError;
      console.log('Vaga encontrada:', vacancy);

      // 2. Buscar candidatos da vaga
      const { data: vacancyCandidates, error: candidatesError } = await supabase
        .from('vacancy_candidates')
        .select(`
          candidates!inner (
            id,
            name
          )
        `)
        .eq('vacancy_id', vacancyId);

      if (candidatesError) throw candidatesError;
      console.log('Candidatos encontrados:', vacancyCandidates);

      // 3. Buscar requisitos da matriz
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
            document_category
          )
        `)
        .eq('matrix_id', vacancy.matrix_id);

      if (matrixError) throw matrixError;
      console.log('Itens da matriz encontrados:', matrixItems);

      // 4. Processar cada candidato
      const candidateComparisons: VacancyCandidateComparison[] = [];

      for (const vacancyCandidate of vacancyCandidates || []) {
        const candidate = vacancyCandidate.candidates;
        
        // Buscar documentos do candidato
        const { data: candidateDocs, error: docsError } = await supabase
          .from('candidate_documents')
          .select('*')
          .eq('candidate_id', candidate.id);

        if (docsError) throw docsError;

        // Processar cada requisito da matriz
        const documentComparisons: VacancyDocumentComparison[] = [];
        let metCount = 0;
        let partialCount = 0;
        let pendingCount = 0;

        for (const matrixItem of matrixItems || []) {
          const catalogDoc = matrixItem.documents_catalog;
          
          // Pular itens que não têm documento válido no catálogo
          if (!catalogDoc || !catalogDoc.id) {
            continue;
          }
          
          // Tentar encontrar documento correspondente
          let matchedDoc = null;
          let matchType: 'exact_id' | 'exact_code' | 'semantic_name' | 'none' = 'none';
          let similarityScore = 0;
          let observations = '';

          // 1. Comparação por ID exato
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

          // 3. Comparação semântica básica (sem IA para evitar timeout)
          if (!matchedDoc) {
            let bestMatch = null;
            let bestSimilarity = 0;

            for (const candidateDoc of candidateDocs || []) {
              const basicSimilarity = calculateBasicSimilarity(
                candidateDoc.document_name,
                catalogDoc.name
              );
              
              if (basicSimilarity > bestSimilarity && basicSimilarity > 0.6) {
                bestSimilarity = basicSimilarity;
                bestMatch = candidateDoc;
                observations = 'Comparação por palavras-chave similares';
              }
            }

            if (bestMatch) {
              matchedDoc = bestMatch;
              matchType = 'semantic_name';
              similarityScore = bestSimilarity;
            }
          }

          // Determinar status
          let status: 'Confere' | 'Parcial' | 'Pendente' | 'N/A - Matriz' = 'Pendente';
          let validityStatus: 'Valido' | 'Vencido' | 'N/A' = 'N/A';

          if (matchedDoc) {
            // Verificar validade
            if (matchedDoc.expiry_date) {
              const expiry = new Date(matchedDoc.expiry_date);
              const today = new Date();
              validityStatus = expiry >= today ? 'Valido' : 'Vencido';
            } else {
              validityStatus = 'Valido';
            }

            // Verificar horas
            if (matrixItem.carga_horaria && matrixItem.carga_horaria > 0) {
              const actualHours = matchedDoc.carga_horaria_total || 0;
              if (actualHours >= matrixItem.carga_horaria) {
                status = 'Confere';
                metCount++;
              } else if (actualHours > 0) {
                status = 'Parcial';
                partialCount++;
                observations = `Matriz exige ${matrixItem.carga_horaria}h; documento informa ${actualHours}h (inferior).`;
              } else {
                status = 'Parcial';
                partialCount++;
                observations = 'Horas não informadas no documento.';
              }
            } else {
              status = 'Confere';
              metCount++;
            }

            // Verificar modalidade
            if (matrixItem.modalidade && matrixItem.modalidade !== matchedDoc.modality) {
              if (status === 'Confere') {
                status = 'Parcial';
                metCount--;
                partialCount++;
              }
              observations += observations ? ' ' : '';
              observations += `Matriz exige modalidade ${matrixItem.modalidade}; documento informa ${matchedDoc.modality || 'N/A'}.`;
            }
          } else {
            status = 'Pendente';
            pendingCount++;
            observations = 'Documento ausente.';
          }

          documentComparisons.push({
            requirementId: matrixItem.id,
            documentName: catalogDoc.name,
            documentCode: catalogDoc.codigo || '',
            category: catalogDoc.document_category || '',
            obligation: matrixItem.obrigatoriedade || '',
            requiredHours: matrixItem.carga_horaria || 0,
            modality: matrixItem.modalidade || '',
            status,
            validityStatus,
            observations,
            candidateDocument: matchedDoc ? {
              id: matchedDoc.id,
              name: matchedDoc.document_name,
              code: matchedDoc.codigo || '',
              hours: matchedDoc.carga_horaria_total || 0,
              modality: matchedDoc.modality || '',
              expiryDate: matchedDoc.expiry_date || ''
            } : undefined,
            similarityScore,
            matchType
          });
        }

        const totalRequirements = documentComparisons.length;
        const adherencePercentage = totalRequirements > 0 
          ? Math.round((metCount / totalRequirements) * 100) 
          : 0;

        candidateComparisons.push({
          candidateId: candidate.id,
          candidateName: candidate.name,
          vacancyId,
          vacancyTitle: vacancy.title,
          matrixId: vacancy.matrix_id,
          matrixName: `${vacancy.matrices.cargo} - ${vacancy.matrices.empresa}`,
          adherencePercentage,
          totalRequirements,
          metRequirements: metCount,
          partialRequirements: partialCount,
          pendingRequirements: pendingCount,
          documents: documentComparisons
        });
      }

      console.log('Comparações concluídas:', candidateComparisons);
      setComparisons(candidateComparisons);

    } catch (err: any) {
      console.error('Erro na comparação de vagas:', err);
      setError(err.message || 'Erro ao carregar comparações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparisons();
  }, [vacancyId]);

  return {
    comparisons,
    loading,
    error,
    refetch: fetchComparisons
  };
};
