/**
 * Masking utilities for sensitive data obfuscation
 * 
 * SECURITY: Use these functions to mask sensitive data before displaying or logging.
 */

/**
 * Mask CPF showing only last 2 digits
 * Example: 123.456.789-01 -> ***.***.**9-01
 */
export const maskCPF = (cpf: string): string => {
  if (!cpf) return '';
  
  // Remove non-numeric characters
  const numbers = cpf.replace(/\D/g, '');
  
  if (numbers.length !== 11) {
    return '*'.repeat(cpf.length);
  }
  
  return `***.***.**${numbers.slice(8, 9)}-${numbers.slice(9)}`;
};

/**
 * Mask email showing first 2 chars and domain
 * Example: usuario@email.com -> us***@***.com
 */
export const maskEmail = (email: string): string => {
  if (!email || !email.includes('@')) return '***@***.***';
  
  const [localPart, domain] = email.split('@');
  const [domainName, ...extensions] = domain.split('.');
  
  const maskedLocal = localPart.length > 2 
    ? localPart.slice(0, 2) + '***' 
    : '***';
  
  const maskedDomain = domainName.length > 0 
    ? '***' 
    : '***';
  
  return `${maskedLocal}@${maskedDomain}.${extensions.join('.') || '***'}`;
};

/**
 * Mask phone number showing only last 4 digits
 * Example: (11) 98765-4321 -> (**) *****-4321
 */
export const maskPhone = (phone: string): string => {
  if (!phone) return '';
  
  // Remove non-numeric characters
  const numbers = phone.replace(/\D/g, '');
  
  if (numbers.length < 4) {
    return '*'.repeat(phone.length);
  }
  
  const last4 = numbers.slice(-4);
  
  if (numbers.length === 11) {
    // Celular com DDD
    return `(**) *****-${last4}`;
  } else if (numbers.length === 10) {
    // Fixo com DDD
    return `(**) ****-${last4}`;
  } else {
    return `****-${last4}`;
  }
};

/**
 * Mask credit card showing only last 4 digits
 * Example: 1234 5678 9012 3456 -> **** **** **** 3456
 */
export const maskCreditCard = (card: string): string => {
  if (!card) return '';
  
  const numbers = card.replace(/\D/g, '');
  
  if (numbers.length < 4) {
    return '*'.repeat(card.length);
  }
  
  const last4 = numbers.slice(-4);
  return `**** **** **** ${last4}`;
};

/**
 * Mask any string showing only first and last N characters
 */
export const maskString = (str: string, visibleStart: number = 2, visibleEnd: number = 2): string => {
  if (!str) return '';
  
  if (str.length <= visibleStart + visibleEnd) {
    return '*'.repeat(str.length);
  }
  
  const start = str.slice(0, visibleStart);
  const end = str.slice(-visibleEnd);
  const maskedLength = str.length - visibleStart - visibleEnd;
  
  return `${start}${'*'.repeat(maskedLength)}${end}`;
};

/**
 * Mask name showing only first name initial
 * Example: João Silva -> J*** S***
 */
export const maskName = (name: string): string => {
  if (!name) return '';
  
  const parts = name.trim().split(/\s+/);
  return parts.map(part => {
    if (part.length === 0) return '';
    return part[0] + '*'.repeat(Math.max(part.length - 1, 2));
  }).join(' ');
};

/**
 * Mask base64 content (for logs) showing only metadata
 */
export const maskBase64 = (base64: string): string => {
  if (!base64) return '[empty]';
  return `[base64:${base64.length} chars]`;
};

/**
 * Format CPF with mask (not obfuscation, just formatting)
 * Example: 12345678901 -> 123.456.789-01
 */
export const formatCPF = (cpf: string): string => {
  if (!cpf) return '';
  
  const numbers = cpf.replace(/\D/g, '');
  
  if (numbers.length !== 11) {
    return cpf;
  }
  
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
};

/**
 * Format phone number
 * Example: 11987654321 -> (11) 98765-4321
 */
export const formatPhone = (phone: string): string => {
  if (!phone) return '';
  
  const numbers = phone.replace(/\D/g, '');
  
  if (numbers.length === 11) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  } else if (numbers.length === 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  }
  
  return phone;
};

/**
 * Sanitize object for logging (mask all sensitive fields)
 */
export const sanitizeForLogging = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sensitiveKeys = ['password', 'senha', 'cpf', 'email', 'phone', 'telefone', 'base64', 'token', 'apiKey', 'api_key', 'secret'];
  
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      if (lowerKey.includes('email') && typeof value === 'string') {
        sanitized[key] = maskEmail(value);
      } else if (lowerKey.includes('cpf') && typeof value === 'string') {
        sanitized[key] = maskCPF(value);
      } else if ((lowerKey.includes('phone') || lowerKey.includes('telefone')) && typeof value === 'string') {
        sanitized[key] = maskPhone(value);
      } else if (lowerKey.includes('base64') && typeof value === 'string') {
        sanitized[key] = maskBase64(value);
      } else if (typeof value === 'string') {
        sanitized[key] = `[REDACTED:${value.length} chars]`;
      } else {
        sanitized[key] = '[REDACTED]';
      }
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = Array.isArray(value) 
        ? value.map(v => sanitizeForLogging(v))
        : sanitizeForLogging(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

export default {
  maskCPF,
  maskEmail,
  maskPhone,
  maskCreditCard,
  maskString,
  maskName,
  maskBase64,
  formatCPF,
  formatPhone,
  sanitizeForLogging,
};
