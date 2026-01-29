/**
 * Logger utility for conditional logging in development vs production
 * 
 * SECURITY: This logger prevents sensitive data from being logged in production.
 * - debug and info logs are only shown in development mode
 * - warn and error logs are always shown (but should not contain sensitive data)
 * 
 * Usage:
 * import { logger } from '@/lib/logger';
 * logger.debug('Debug message', { data });  // Only in development
 * logger.error('Error message', error);     // Always shown
 */

const isDev = import.meta.env.DEV;

// Sanitize objects to remove sensitive fields before logging
const sensitiveFields = [
  'password',
  'senha',
  'token',
  'apiKey',
  'api_key',
  'secret',
  'authorization',
  'base64',
  'cpf',
  'ssn',
];

const sanitizeObject = (obj: any, depth = 0): any => {
  if (depth > 5) return '[MAX_DEPTH]';
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }
  
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    // Check if key contains sensitive field names
    const isSensitive = sensitiveFields.some(field => lowerKey.includes(field));
    
    if (isSensitive) {
      if (typeof value === 'string' && value.length > 0) {
        sanitized[key] = `[REDACTED:${value.length} chars]`;
      } else {
        sanitized[key] = '[REDACTED]';
      }
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

// Sanitize arguments for safe logging
const sanitizeArgs = (args: any[]): any[] => {
  return args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      return sanitizeObject(arg);
    }
    return arg;
  });
};

export const logger = {
  /**
   * Debug level - only shown in development
   * Use for detailed debugging information
   */
  debug: (...args: any[]) => {
    if (isDev) {
      console.log('[DEBUG]', ...sanitizeArgs(args));
    }
  },

  /**
   * Info level - only shown in development
   * Use for general information about application flow
   */
  info: (...args: any[]) => {
    if (isDev) {
      console.info('[INFO]', ...sanitizeArgs(args));
    }
  },

  /**
   * Warn level - always shown
   * Use for warnings that don't break functionality
   * IMPORTANT: Do not include sensitive data in warnings
   */
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...sanitizeArgs(args));
  },

  /**
   * Error level - always shown
   * Use for errors and exceptions
   * IMPORTANT: Do not include sensitive data in error messages
   */
  error: (...args: any[]) => {
    console.error('[ERROR]', ...sanitizeArgs(args));
  },

  /**
   * Security log - only in development, with full sanitization
   * Use for logging that might contain sensitive data during debugging
   */
  security: (...args: any[]) => {
    if (isDev) {
      console.log('[SECURITY]', ...sanitizeArgs(args));
    }
  },
};

export default logger;
