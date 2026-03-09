/**
 * Validation utilities for Brazilian documents and common data types
 * 
 * SECURITY: Use these validators to ensure data integrity before processing.
 */

/**
 * Validate CPF with digit verification
 * Returns true if CPF is valid
 */
export const validateCPF = (cpf: string): boolean => {
  if (!cpf) return false;
  
  // Remove non-numeric characters
  const numbers = cpf.replace(/\D/g, '');
  
  // Must have exactly 11 digits
  if (numbers.length !== 11) return false;
  
  // Check for known invalid patterns (all same digits)
  if (/^(\d)\1+$/.test(numbers)) return false;
  
  // Validate first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(numbers.charAt(9))) return false;
  
  // Validate second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(numbers.charAt(10))) return false;
  
  return true;
};

/**
 * Validate CNPJ with digit verification
 * Returns true if CNPJ is valid
 */
export const validateCNPJ = (cnpj: string): boolean => {
  if (!cnpj) return false;
  
  // Remove non-numeric characters
  const numbers = cnpj.replace(/\D/g, '');
  
  // Must have exactly 14 digits
  if (numbers.length !== 14) return false;
  
  // Check for known invalid patterns
  if (/^(\d)\1+$/.test(numbers)) return false;
  
  // Validate first check digit
  let size = numbers.length - 2;
  let nums = numbers.substring(0, size);
  const digits = numbers.substring(size);
  let sum = 0;
  let pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(nums.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  
  // Validate second check digit
  size = size + 1;
  nums = numbers.substring(0, size);
  sum = 0;
  pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(nums.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;
  
  return true;
};

/**
 * Validate Brazilian phone number
 * Accepts formats: (11) 98765-4321, 11987654321, etc.
 */
export const validatePhone = (phone: string): boolean => {
  if (!phone) return false;
  
  const numbers = phone.replace(/\D/g, '');
  
  // Must be 10 (landline) or 11 (mobile) digits
  if (numbers.length !== 10 && numbers.length !== 11) return false;
  
  // DDD must be valid (11-99, excluding some)
  const ddd = parseInt(numbers.substring(0, 2));
  const validDDDs = [
    11, 12, 13, 14, 15, 16, 17, 18, 19, // SP
    21, 22, 24, // RJ
    27, 28, // ES
    31, 32, 33, 34, 35, 37, 38, // MG
    41, 42, 43, 44, 45, 46, // PR
    47, 48, 49, // SC
    51, 53, 54, 55, // RS
    61, // DF
    62, 64, // GO
    63, // TO
    65, 66, // MT
    67, // MS
    68, // AC
    69, // RO
    71, 73, 74, 75, 77, // BA
    79, // SE
    81, 87, // PE
    82, // AL
    83, // PB
    84, // RN
    85, 88, // CE
    86, 89, // PI
    91, 93, 94, // PA
    92, 97, // AM
    95, // RR
    96, // AP
    98, 99, // MA
  ];
  
  if (!validDDDs.includes(ddd)) return false;
  
  // For mobile numbers (11 digits), first digit after DDD must be 9
  if (numbers.length === 11 && numbers.charAt(2) !== '9') return false;
  
  return true;
};

/**
 * Validate email address
 */
export const validateEmail = (email: string): boolean => {
  if (!email) return false;
  
  // RFC 5322 compliant regex (simplified)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * Returns object with validation result and feedback
 */
export const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!password) {
    errors.push('Senha é obrigatória');
    return { valid: false, errors };
  }
  
  if (password.length < 6) {
    errors.push('Senha deve ter pelo menos 6 caracteres');
  }
  
  // Optional: Add more strength requirements
  // if (!/[A-Z]/.test(password)) {
  //   errors.push('Senha deve conter pelo menos uma letra maiúscula');
  // }
  // if (!/[a-z]/.test(password)) {
  //   errors.push('Senha deve conter pelo menos uma letra minúscula');
  // }
  // if (!/[0-9]/.test(password)) {
  //   errors.push('Senha deve conter pelo menos um número');
  // }
  
  return { valid: errors.length === 0, errors };
};

/**
 * Validate date format (DD/MM/YYYY or YYYY-MM-DD)
 */
export const validateDate = (date: string): boolean => {
  if (!date) return false;
  
  // Try DD/MM/YYYY
  const brRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const brMatch = date.match(brRegex);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return d.getDate() === parseInt(day) && 
           d.getMonth() === parseInt(month) - 1 && 
           d.getFullYear() === parseInt(year);
  }
  
  // Try YYYY-MM-DD
  const isoRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
  const isoMatch = date.match(isoRegex);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return d.getDate() === parseInt(day) && 
           d.getMonth() === parseInt(month) - 1 && 
           d.getFullYear() === parseInt(year);
  }
  
  return false;
};

/**
 * Validate URL
 */
export const validateURL = (url: string): boolean => {
  if (!url) return false;
  
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate LinkedIn URL
 */
export const validateLinkedInURL = (url: string): boolean => {
  if (!url) return false;
  
  const linkedInRegex = /^(https?:\/\/)?(www\.)?linkedin\.com\/(in|pub|company)\/[\w-]+\/?$/i;
  return linkedInRegex.test(url);
};

/**
 * Sanitize input to prevent XSS
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Remove potentially dangerous characters from filename
 */
export const sanitizeFilename = (filename: string): string => {
  if (!filename) return '';
  
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 255);
};

export default {
  validateCPF,
  validateCNPJ,
  validatePhone,
  validateEmail,
  validatePassword,
  validateDate,
  validateURL,
  validateLinkedInURL,
  sanitizeInput,
  sanitizeFilename,
};
