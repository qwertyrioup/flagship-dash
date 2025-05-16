/**
 * Types for standardized API responses
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  body?: T;
  error?: string;
  redirectUrl?: string;
}

/**
 * Creates a successful response object
 */
export function successResponse<T>(message: string, body?: T): ApiResponse<T> {
  return {
    success: true,
    message,
    body
  };
}

/**
 * Creates an error response object
 */
export function errorResponse(message: string, error?: unknown, redirectUrl?: string): ApiResponse {
  return {
    success: false,
    message,
    error: error instanceof Error ? error.message : error ? String(error) : undefined,
    redirectUrl
  };
}

/**
 * Generic response generator with type safety
 */
export function createResponse<T>(
  success: boolean,
  message: string,
  body?: T
): ApiResponse<T> {
  return {
    success,
    message,
    body: body as T,
  };
} 