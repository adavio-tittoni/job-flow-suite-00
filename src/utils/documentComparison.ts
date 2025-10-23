/**
 * Função centralizada para comparação de documentos seguindo a semântica definida:
 * 1. Nome do curso (português ou inglês) → Comparado com certificado do candidato
 * 2. Sigla do documento → Comparado com sigla do documento do candidato  
 * 3. Código do curso → Comparado com código do curso do candidato
 */


export interface CandidateDocument {
  id: string;
  document_name: string;
  sigla_documento?: string;
  codigo?: string;
  catalog_document_id?: string;
  carga_horaria_total?: number;
  modality?: string;
  expiry_date?: string;
}

export interface MatrixDocument {
  id: string;
  name: string;
  sigla_documento?: string;
  codigo?: string;
  document_category?: string;
  group_name?: string;
  modality?: string;
  carga_horaria?: number;
}

export interface ComparisonResult {
  status: 'Confere' | 'Parcial' | 'Pendente';
  validityStatus: 'valid' | 'expired' | 'not_applicable' | 'missing';
  validityDate?: string; // Data de validade do documento do candidato
  observations: string;
  similarityScore: number;
  matchType: 'exact_id' | 'exact_name' | 'exact_sigla' | 'exact_code' | 'semantic_name' | 'none';
  matchedDocument?: CandidateDocument;
}

/**
 * Normaliza string para comparação (remove acentos, converte para minúsculo, trim)
 */
export const normalizeString = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

/**
 * Verifica se um documento está válido baseado na data de expiração
 */
export const checkValidity = (expiryDate?: string): 'valid' | 'expired' | 'not_applicable' | 'missing' => {
  if (!expiryDate || expiryDate === 'null' || expiryDate === 'undefined') {
    return 'not_applicable';
  }

  const expiry = new Date(expiryDate);
  if (isNaN(expiry.getTime())) {
    return 'missing';
  }

  const now = new Date();
  return now <= expiry ? 'valid' : 'expired';
};

/**
 * Calcula similaridade básica entre duas strings (sem IA para evitar timeout)
 */
export const calculateBasicSimilarity = (str1: string, str2: string): number => {
  if (!str1 || !str2) return 0;
  
  const normalized1 = normalizeString(str1);
  const normalized2 = normalizeString(str2);
  
  if (normalized1 === normalized2) return 1.0;
  
  // Verificar se uma string contém a outra
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return 0.8;
  }
  
  // Verificar códigos NR específicos
  const nrMatch1 = normalized1.match(/nr-?\d+/);
  const nrMatch2 = normalized2.match(/nr-?\d+/);
  if (nrMatch1 && nrMatch2 && nrMatch1[0] === nrMatch2[0]) {
    return 0.85; // Alta similaridade para documentos com mesmo código NR
  }
  
  // Verificar palavras-chave importantes para documentos técnicos
  const importantKeywords = [
    'seguranca', 'saude', 'trabalho', 'plataforma', 'petroleo', 'offshore',
    'altura', 'confinado', 'supervisor', 'basico', 'avancado', 'treinamento',
    'capacitacao', 'maritimo', 'aquaviario', 'helicopter', 'escape', 'submersa'
  ];
  
  const keywords1 = importantKeywords.filter(keyword => normalized1.includes(keyword));
  const keywords2 = importantKeywords.filter(keyword => normalized2.includes(keyword));
  
  if (keywords1.length > 0 && keywords2.length > 0) {
    const commonKeywords = keywords1.filter(k => keywords2.includes(k));
    if (commonKeywords.length > 0) {
      return 0.7 + (commonKeywords.length * 0.1); // Similaridade baseada em palavras-chave comuns
    }
  }
  
  // Verificar palavras-chave similares (método original)
  const words1 = normalized1.split(/\s+/);
  const words2 = normalized2.split(/\s+/);
  
  let commonWords = 0;
  for (const word1 of words1) {
    if (words2.some(word2 => word1 === word2 || word1.includes(word2) || word2.includes(word1))) {
      commonWords++;
    }
  }
  
  return commonWords > 0 ? commonWords / Math.max(words1.length, words2.length) : 0;
};

/**
 * Verifica se as modalidades são compatíveis
 */
export const checkModalityCompatibility = (matrixModality?: string, candidateModality?: string): boolean => {
  if (!matrixModality || !candidateModality) return true; // Se não especificado, considera compatível
  
  // Se candidato tem "N/A", considera compatível com qualquer modalidade
  if (candidateModality === 'N/A' || candidateModality === 'n/a' || candidateModality === '') {
    return true;
  }
  
  const normalizedMatrix = normalizeString(matrixModality);
  const normalizedCandidate = normalizeString(candidateModality);
  
  // Modalidades que são consideradas equivalentes
  const equivalentModalities = {
    'presencial': ['presencial', 'presence', 'in-person'],
    'ead': ['ead', 'e-learning', 'online', 'distancia', 'distância'],
    'hibrido': ['hibrido', 'híbrido', 'hybrid', 'blended'],
    'semipresencial': ['semipresencial', 'semi-presencial']
  };
  
  // Verificar se são exatamente iguais
  if (normalizedMatrix === normalizedCandidate) return true;
  
  // Verificar equivalências
  for (const [key, values] of Object.entries(equivalentModalities)) {
    if (values.includes(normalizedMatrix) && values.includes(normalizedCandidate)) {
      return true;
    }
  }
  
  return false;
};

/**
 * Gera observações simplificadas e úteis
 * Foca apenas em informações relevantes para o recrutador
 */
export const generateDetailedObservations = (
  matrixDoc: MatrixDocument,
  matchedDoc: CandidateDocument,
  matchType: string,
  similarityScore: number,
  validityStatus: string,
  modalityCompatible: boolean // Sempre true agora (apenas informativo)
): string => {
  const observations: string[] = [];
  
  // Adicionar tipo de match de forma simples
  switch (matchType) {
    case 'exact_id':
      observations.push('Match exato por ID');
      break;
    case 'exact_name':
      observations.push('Nome do curso idêntico');
      break;
    case 'exact_sigla':
      observations.push('Sigla idêntica');
      break;
    case 'exact_code':
      observations.push('Código idêntico');
      break;
    case 'semantic_name':
      observations.push('Nome do curso com algumas diferenças');
      break;
    default:
      observations.push('Documento não encontrado');
  }
  
  // Mostrar diferenças importantes na carga horária
  if (matrixDoc.carga_horaria && matchedDoc.carga_horaria_total) {
    if (matchedDoc.carga_horaria_total < matrixDoc.carga_horaria) {
      observations.push(`Horas abaixo do esperado: candidato tem ${matchedDoc.carga_horaria_total}h e a matriz solicita ${matrixDoc.carga_horaria}h`);
    }
  }
  
  // Mostrar status de validade de forma simples
  if (validityStatus === 'expired') {
    observations.push('Documento vencido');
  } else if (validityStatus === 'valid') {
    observations.push('Documento válido');
  }
  
  return observations.join(' | ');
};

/**
 * Função principal de comparação seguindo a semântica definida
 * Esta função deve ser usada em TODOS os hooks de comparação para garantir consistência
 * Sequência de comparação: ID → Código → Semântica Nome → Sigla → Nome Exato
 * Critérios de status: Validade e Horas (modalidade apenas informativa)
 */
export const compareDocumentWithMatrix = (
  matrixDoc: MatrixDocument,
  candidateDocs: CandidateDocument[]
): ComparisonResult => {
  
  try {
    console.log('🔍 compareDocumentWithMatrix: Input validation', {
      matrixDoc: matrixDoc ? {
        id: matrixDoc.id,
        name: matrixDoc.name,
        sigla_documento: matrixDoc.sigla_documento,
        codigo: matrixDoc.codigo,
        modality: matrixDoc.modality,
        carga_horaria: matrixDoc.carga_horaria
      } : 'UNDEFINED',
      candidateDocsCount: candidateDocs?.length || 0
    });

    // Validar se matrixDoc é válido
    if (!matrixDoc || !matrixDoc.id) {
      console.log('❌ compareDocumentWithMatrix: Invalid matrixDoc', matrixDoc);
      return {
        status: 'Pendente',
        validityStatus: 'missing',
        observations: 'Documento da matriz inválido',
        similarityScore: 0,
        matchType: 'none'
      };
    }
  
  // Tentar encontrar documento correspondente do candidato
  let matchedDoc: CandidateDocument | null = null;
  let matchType: 'exact_id' | 'exact_name' | 'exact_sigla' | 'exact_code' | 'semantic_name' | 'none' = 'none';
  let similarityScore = 0;

  // 1. Comparação por ID exato (manter como primeira prioridade)
  matchedDoc = candidateDocs?.find(doc => 
    doc.catalog_document_id === matrixDoc.id
  );
  if (matchedDoc) {
    matchType = 'exact_id';
    similarityScore = 1.0;
  }

  // 2. Comparação por CÓDIGO (segunda prioridade) - Melhorada para encontrar códigos no nome
  if (!matchedDoc && matrixDoc.codigo) {
    const matrixCode = normalizeString(matrixDoc.codigo);
    
    // Buscar por código exato primeiro
    matchedDoc = candidateDocs?.find(doc => {
      const docCodigo = doc.codigo;
      return docCodigo && 
        normalizeString(docCodigo) === matrixCode;
    });
    
    // Se não encontrou por código exato, buscar por código no nome do documento
    if (!matchedDoc) {
      matchedDoc = candidateDocs?.find(doc => {
        const docName = normalizeString(doc.document_name);
        return docName.includes(matrixCode);
      });
    }
    
    if (matchedDoc) {
      matchType = 'exact_code';
      similarityScore = 0.9;
    }
  }

  // 3. Comparação semântica por NOME (terceira prioridade) - Com IA como fallback
  if (!matchedDoc && matrixDoc.name) {
    let bestMatch = null;
    let bestSimilarity = 0;

    for (const candidateDoc of candidateDocs || []) {
      // Primeiro tentar comparação básica
      const basicSimilarity = calculateBasicSimilarity(
        candidateDoc.document_name,
        matrixDoc.name
      );
      
      // Threshold para garantir qualidade
      if (basicSimilarity > bestSimilarity && basicSimilarity > 0.7) {
        bestSimilarity = basicSimilarity;
        bestMatch = candidateDoc;
      }
    }

    if (bestMatch) {
      matchedDoc = bestMatch;
      matchType = 'semantic_name';
      similarityScore = bestSimilarity;
    }
  }

  // 4. Comparação por SIGLA (quarta prioridade)
  if (!matchedDoc && matrixDoc.sigla_documento) {
    matchedDoc = candidateDocs?.find(doc => {
      const docSigla = doc.sigla_documento;
      return docSigla && 
        normalizeString(docSigla) === normalizeString(matrixDoc.sigla_documento);
    });
    if (matchedDoc) {
      matchType = 'exact_sigla';
      similarityScore = 0.85;
    }
  }

  // 5. Comparação por NOME exato (fallback)
  if (!matchedDoc && matrixDoc.name) {
    const matrixDocName = normalizeString(matrixDoc.name);
    matchedDoc = candidateDocs?.find(doc => {
      const docName = normalizeString(doc.document_name);
      return docName === matrixDocName;
    });
    if (matchedDoc) {
      matchType = 'exact_name';
      similarityScore = 0.95;
    }
  }

  // Determinar status baseado no match encontrado
  if (!matchedDoc) {
    return {
      status: 'Pendente',
      validityStatus: 'missing',
      observations: 'Documento não encontrado na matriz',
      similarityScore: 0,
      matchType: 'none'
    };
  }

  // Verificar validade do documento
  const validityStatus = checkValidity(matchedDoc.expiry_date);
  
  // Verificar carga horária se especificada na matriz
  let hoursCompatible = true;
  if (matrixDoc.carga_horaria && matrixDoc.carga_horaria > 0) {
    const candidateHours = matchedDoc.carga_horaria_total || 0;
    hoursCompatible = candidateHours >= matrixDoc.carga_horaria;
  }

  // Determinar status baseado na validade, similaridade e horas (SEM modalidade)
  let status: 'Confere' | 'Parcial' | 'Pendente';
  
  // Se documento vencido, sempre parcial
  if (validityStatus === 'expired') {
    status = 'Parcial';
  }
  // Se horas insuficientes, sempre parcial
  else if (!hoursCompatible) {
    status = 'Parcial';
  }
  // Se match exato (ID, nome, código, sigla), confere
  else if (matchType === 'exact_id' || matchType === 'exact_name' || matchType === 'exact_code' || matchType === 'exact_sigla') {
    status = 'Confere';
  }
  // Se match semântico com alta similaridade, confere (não parcial)
  else if (matchType === 'semantic_name' && similarityScore >= 0.9) {
    status = 'Confere';
  }
  // Se match semântico com baixa similaridade, parcial
  else if (matchType === 'semantic_name') {
    status = 'Parcial';
  }
  else {
    status = 'Pendente';
  }

  // Gerar observações detalhadas
  const observations = generateDetailedObservations(
    matrixDoc,
    matchedDoc,
    matchType,
    similarityScore,
    validityStatus,
    true // Modalidade sempre compatível (apenas informativa)
  );

    return {
      status,
      validityStatus,
      validityDate: matchedDoc.expiry_date, // Incluir data de validade
      observations,
      similarityScore,
      matchType,
      matchedDocument: matchedDoc
    };
    
  } catch (error) {
    console.error('❌ compareDocumentWithMatrix: Error caught', {
      error: error,
      matrixDoc: matrixDoc,
      candidateDocsCount: candidateDocs?.length || 0,
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    
    return {
      status: 'Pendente',
      validityStatus: 'missing',
      observations: `Erro na comparação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      similarityScore: 0,
      matchType: 'none'
    };
  }
};

/**
 * Calcula estatísticas de aderência baseado nos resultados da comparação
 * Esta função garante que todos os hooks usem a mesma lógica de cálculo
 */
export const calculateAdherenceStats = (results: ComparisonResult[]) => {
  const total = results.length;
  const fulfilled = results.filter(r => r.status === 'Confere').length;
  const partial = results.filter(r => r.status === 'Parcial').length;
  const pending = results.filter(r => r.status === 'Pendente').length;
  
  // Apenas documentos "Confere" contam como atendidos para o percentual
  const adherencePercentage = total > 0 ? Math.round((fulfilled / total) * 100) : 0;
  
  return {
    total,
    fulfilled,
    partial,
    pending,
    adherencePercentage
  };
};
