/**
 * Matriz de Hierarquia STCW (Standards of Training, Certification and Watchkeeping)
 * Define quais códigos superiores cobrem/substituem códigos inferiores
 */

export interface STCWReplacement {
  code: string;
  description: string;
  covers: string[]; // Códigos que este certificado cobre/substitui
}

export const STCW_HIERARCHY: STCWReplacement[] = [
  {
    code: 'A-II/2',
    description: 'Master/Chief Mate',
    covers: ['A-II/1', 'A-II/4', 'A-VI/1']
  },
  {
    code: 'A-II/1',
    description: 'OOW (Officer of the Watch)',
    covers: ['A-II/4', 'A-VI/1']
  },
  {
    code: 'A-III/2',
    description: 'Chief/2nd Engineer',
    covers: ['A-III/1', 'A-III/4', 'A-VI/1']
  },
  {
    code: 'A-III/1',
    description: 'OOW Engineering',
    covers: ['A-III/4', 'A-VI/1']
  },
  {
    code: 'A-III/6',
    description: 'ETO (Electro-Technical Officer)',
    covers: ['A-VI/1']
  },
  {
    code: 'A-VI/3',
    description: 'Advanced Fire Fighting',
    covers: ['A-VI/1']
  },
  {
    code: 'A-VI/2-1',
    description: 'Survival Craft and Rescue Boats',
    covers: ['A-VI/1']
  }
];

/**
 * Verifica se um código do candidato cobre/substitui um código exigido pela matriz
 * Considera a hierarquia STCW e também match exato
 */
export const validateSTCWHierarchy = (
  requiredCode: string,
  candidateCode: string
): boolean => {
  if (!requiredCode || !candidateCode) return false;
  
  const normalizedRequired = requiredCode.trim().toUpperCase();
  const normalizedCandidate = candidateCode.trim().toUpperCase();
  
  // Match exato (primeira prioridade)
  if (normalizedCandidate === normalizedRequired) {
    return true;
  }
  
  // Verificar na hierarquia STCW
  const replacement = STCW_HIERARCHY.find(h => 
    h.code.toUpperCase() === normalizedCandidate
  );
  
  if (!replacement) return false;
  
  // Verificar se o código exigido está na lista de códigos que este certificado cobre
  return replacement.covers.some(coveredCode => 
    coveredCode.toUpperCase() === normalizedRequired
  );
};

