/**
 * Safe error message extraction
 * @param error - Unknown error
 * @returns Error message string
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
};

/**
 * API Error Response Type
 */
export type ApiErrorResponse = {
  error: string;
  code?: string;
  details?: unknown;
};

/**
 * Create standardized error response
 * @param message - Error message
 * @param code - Error code (optional)
 * @param details - Additional details (optional)
 * @returns Standardized error object
 */
export const createErrorResponse = (
  message: string,
  code?: string,
  details?: unknown
): ApiErrorResponse => {
  return {
    error: message,
    ...(code && { code }),
    ...(details && { details }),
  };
};
