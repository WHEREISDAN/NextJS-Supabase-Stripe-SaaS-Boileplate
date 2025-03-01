import { AuthError } from '@supabase/supabase-js';
import { ZodError } from 'zod';

// Error types
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  DATABASE = 'DATABASE',
  SERVER = 'SERVER',
  PAYMENT = 'PAYMENT',
  UNKNOWN = 'UNKNOWN',
}

// Structured error interface
export interface AppError {
  type: ErrorType;
  message: string;
  details?: Record<string, string[]>;
  originalError?: unknown;
}

// Create formatted error from ZodError
export function handleZodError(error: ZodError): AppError {
  const details = error.errors.reduce((acc: Record<string, string[]>, curr) => {
    const key = curr.path[0] as string;
    if (!acc[key]) acc[key] = [];
    acc[key].push(curr.message);
    return acc;
  }, {});

  return {
    type: ErrorType.VALIDATION,
    message: 'Validation error',
    details,
    originalError: error,
  };
}

// Create formatted error from Supabase AuthError
export function handleAuthError(error: AuthError): AppError {
  return {
    type: ErrorType.AUTHENTICATION,
    message: error.message,
    originalError: error,
  };
}

// Create formatted error from database error
export function handleDatabaseError(error: Error): AppError {
  return {
    type: ErrorType.DATABASE,
    message: error.message,
    originalError: error,
  };
}

// Create formatted error from unknown error
export function handleUnknownError(error: unknown): AppError {
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  
  return {
    type: ErrorType.UNKNOWN,
    message,
    originalError: error,
  };
}

// Main error handler function
export function handleError(error: unknown): AppError {
  if (error instanceof ZodError) {
    return handleZodError(error);
  } else if (error instanceof AuthError) {
    return handleAuthError(error);
  } else if (error instanceof Error && error.message.includes('database')) {
    return handleDatabaseError(error);
  } else {
    return handleUnknownError(error);
  }
}

// Log error to console or monitoring service
export function logError(error: AppError): void {
  console.error(`[${error.type}] ${error.message}`, {
    details: error.details,
    originalError: error.originalError,
  });
  
  // Here you could add integration with error monitoring services
  // like Sentry, LogRocket, etc.
} 