import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  documentNameEnglish?: string; // Nome do documento em inglês
  documentCode: string;
  sigla?: string; // Sigla do documento (mesmo formato que EnhancedDocumentsView)
  category: string;
  obligation: string;
  requiredHours: number;
  modality: string;
  status: 'Confere' | 'Parcial' | 'Pendente' | 'N/A - Matriz';
  validityStatus: 'Valido' | 'Vencido' | 'N/A';
  validityDate?: string; // Data de validade do documento do candidato
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

const VACANCY_COMPARISON_QUERY_KEY = ['vacancy-candidate-comparison'] as const;

async function fetchVacancyComparisons(
  vacancyId: string,
  queryClient: ReturnType<typeof useQueryClient>
): Promise<VacancyCandidateComparison[]> {
  if (!vacancyId) return [];

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

  // 3. Buscar requisitos da matriz com TODOS os campos necessários
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
        nome_curso,
        nome_ingles,
        codigo,
        sigla,
        sigla_documento,
        document_category,
        group_name,
        categoria
      )
    `)
    .eq('matrix_id', vacancy.matrix_id);

  if (matrixError) throw matrixError;
  console.log('Itens da matriz encontrados:', matrixItems);

  // 4. Processar cada candidato
  const candidateComparisons: VacancyCandidateComparison[] = [];

  for (const vacancyCandidate of vacancyCandidates || []) {
    const candidate = vacancyCandidate.candidates;

    // Buscar comparações da tabela document_comparisons (MESMA FONTE que EnhancedDocumentsView)
    const { data: comparisons, error: compError } = await supabase
      .from('document_comparisons')
      .select('*')
      .eq('candidate_id', candidate.id);

    if (compError) throw compError;

    // Buscar TODOS os documentos do candidato para verificar declaracao
    // mesmo para itens não comparados
    const { data: allCandidateDocs } = await supabase
      .from('candidate_documents')
      .select('id, document_name, codigo, carga_horaria_total, modality, expiry_date, declaracao, catalog_document_id, sigla_documento, tipo_de_codigo')
      .eq('candidate_id', candidate.id);

    // Criar mapas para encontrar documentos por diferentes critérios
    const docByCatalogId: Record<string, typeof allCandidateDocs[0]> = {};
    const docsBySigla: Record<string, typeof allCandidateDocs[0][]> = {};
    const docsByTipoCodigo: Record<string, typeof allCandidateDocs[0][]> = {};
    
    (allCandidateDocs || []).forEach(d => {
      if (d.catalog_document_id) {
        docByCatalogId[d.catalog_document_id] = d;
      }
      if (d.sigla_documento) {
        const sigla = d.sigla_documento.toLowerCase().trim();
        if (!docsBySigla[sigla]) docsBySigla[sigla] = [];
        docsBySigla[sigla].push(d);
      }
      if (d.tipo_de_codigo) {
        const codigo = d.tipo_de_codigo.toLowerCase().trim();
        if (!docsByTipoCodigo[codigo]) docsByTipoCodigo[codigo] = [];
        docsByTipoCodigo[codigo].push(d);
      }
    });

    // Processar cada requisito da matriz
    const documentComparisons: VacancyDocumentComparison[] = [];

    for (const matrixItem of matrixItems || []) {
      const catalogDoc = matrixItem.documents_catalog;

      // Pular itens que não têm documento válido no catálogo
      if (!catalogDoc || !catalogDoc.id) {
        continue;
      }

      // Buscar comparação na tabela document_comparisons (mesma lógica que EnhancedDocumentsView)
      // Prioridade: CONFERE > PARCIAL > PENDENTE, depois por data mais recente
      const allComparisons = comparisons?.filter(comp => comp.matrix_item_id === matrixItem.id) || [];
      
      // Função para obter prioridade do status (menor = maior prioridade)
      const getStatusPriority = (status: string | null | undefined): number => {
        if (status === 'CONFERE') return 0;
        if (status === 'PARCIAL') return 1;
        return 2; // PENDENTE ou qualquer outro
      };
      
      const comparison = allComparisons.sort((a, b) => {
        // Primeiro ordenar por prioridade de status
        const priorityA = getStatusPriority(a.status);
        const priorityB = getStatusPriority(b.status);
        if (priorityA !== priorityB) {
          return priorityA - priorityB; // Menor prioridade primeiro (CONFERE = 0)
        }
        // Se mesmo status, ordenar por data mais recente
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      })[0]; // Pegar a primeira (maior prioridade + mais recente)

      // Usar status da tabela document_comparisons (fonte única da verdade)
      // Status na tabela é: 'CONFERE' | 'PARCIAL' | 'PENDENTE' (maiúsculas)
      const statusFromTable = comparison?.status || 'PENDENTE';
      // Converter para o formato usado no componente (primeira letra maiúscula)
      const status = statusFromTable === 'CONFERE' ? 'Confere' :
        statusFromTable === 'PARCIAL' ? 'Parcial' : 'Pendente';

      // Buscar documento do candidato e verificar se é declaração
      let candidateDocument = undefined;
      let isDeclaracao = false;
      
      // 1. Se há comparação com documento vinculado, usar esse documento
      if (comparison?.candidate_document_id) {
        const candidateDoc = allCandidateDocs?.find(d => d.id === comparison.candidate_document_id);

        if (candidateDoc) {
          candidateDocument = {
            id: candidateDoc.id,
            name: candidateDoc.document_name,
            code: candidateDoc.codigo || '',
            hours: candidateDoc.carga_horaria_total || 0,
            modality: candidateDoc.modality || '',
            expiryDate: candidateDoc.expiry_date || ''
          };
          isDeclaracao = candidateDoc.declaracao === true;
        }
      } else {
        // 2. Se não há comparação, tentar encontrar documento correspondente por ID do catálogo
        if (catalogDoc.id && docByCatalogId[catalogDoc.id]) {
          const matchedDoc = docByCatalogId[catalogDoc.id];
          isDeclaracao = matchedDoc.declaracao === true;
        }
        // 3. Se não encontrou por ID, tentar por sigla
        else if (catalogDoc.sigla_documento) {
          const sigla = catalogDoc.sigla_documento.toLowerCase().trim();
          const matchedDocs = docsBySigla[sigla];
          if (matchedDocs && matchedDocs.length > 0) {
            const docWithDeclaracao = matchedDocs.find(d => d.declaracao === true);
            if (docWithDeclaracao) {
              isDeclaracao = true;
            }
          }
        }
        // 4. Se não encontrou por sigla, tentar por código
        else if (catalogDoc.codigo) {
          const codigo = catalogDoc.codigo.toLowerCase().trim();
          const matchedDocs = docsByTipoCodigo[codigo];
          if (matchedDocs && matchedDocs.length > 0) {
            const docWithDeclaracao = matchedDocs.find(d => d.declaracao === true);
            if (docWithDeclaracao) {
              isDeclaracao = true;
            }
          }
        }
      }

      // Converter validity_status da tabela
      const validityStatusFromTable = comparison?.validity_status;
      const validityStatus = validityStatusFromTable === 'valid' ? 'Valido' :
        validityStatusFromTable === 'expired' ? 'Vencido' : 'N/A';

      // Montar observações com informação de declaração se aplicável
      let observations = comparison?.observations || (status === 'Pendente' ? 'Documento ainda não comparado' : '');
      if (isDeclaracao && observations && !observations.includes('Declaração')) {
        observations = 'Declaração | ' + observations;
      } else if (isDeclaracao && !observations) {
        observations = 'Declaração';
      }

      documentComparisons.push({
        requirementId: matrixItem.id,
        // Usar nome_curso se disponível, senão usar name (compatibilidade com documentos antigos e novos)
        documentName: catalogDoc.nome_curso || catalogDoc.name || '',
        documentNameEnglish: catalogDoc.nome_ingles || undefined,
        documentCode: catalogDoc.codigo || '',
        // Usar sigla_documento se disponível, senão usar sigla (compatibilidade com documentos antigos e novos)
        sigla: catalogDoc.sigla_documento || catalogDoc.sigla || '',
        // Usar mesma lógica que EnhancedDocumentsView: document_category ou categoria
        category: catalogDoc.document_category || catalogDoc.categoria || '',
        obligation: matrixItem.obrigatoriedade || '',
        requiredHours: matrixItem.carga_horaria || 0,
        modality: matrixItem.modalidade || '',
        status,
        validityStatus,
        validityDate: comparison?.validity_date, // Data de validade da comparação
        observations,
        candidateDocument,
        similarityScore: comparison?.similarity_score,
        matchType: comparison?.match_type as any
      });
    }

    const totalRequirements = documentComparisons.length;
    // Usar a mesma lógica do EnhancedDocumentsView: CONFERE conta 100%, PARCIAL conta 50%
    const confereCount = documentComparisons.filter(doc => doc.status === 'Confere').length;
    const parcialCount = documentComparisons.filter(doc => doc.status === 'Parcial').length;
    const adherencePercentage = totalRequirements > 0
      ? Math.round(((confereCount) + (parcialCount * 0.5)) / totalRequirements * 100)
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
      metRequirements: confereCount,
      partialRequirements: parcialCount,
      pendingRequirements: documentComparisons.filter(doc => doc.status === 'Pendente').length,
      documents: documentComparisons
    });
  }

  console.log('Comparações concluídas:', candidateComparisons);
  // Invalidar cache do useCandidateRequirementStatus para sincronizar os dados
  const candidateIds = candidateComparisons.map(comp => comp.candidateId);
  candidateIds.forEach(candidateId => {
    queryClient.invalidateQueries({
      queryKey: ['candidate-requirement-status', candidateId]
    });
  });

  return candidateComparisons;
}

export const useVacancyCandidateComparison = (vacancyId: string) => {
  const queryClient = useQueryClient();

  const {
    data: comparisons = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: [...VACANCY_COMPARISON_QUERY_KEY, vacancyId],
    queryFn: () => fetchVacancyComparisons(vacancyId, queryClient),
    enabled: !!vacancyId,
  });

  return {
    comparisons,
    loading,
    error: queryError ? (queryError as Error).message : null,
    refetch,
  };
};
