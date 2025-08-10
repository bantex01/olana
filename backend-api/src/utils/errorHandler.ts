import { Response } from 'express';
import { Logger } from './logger';

// Standard error response format
export interface ErrorResponse {
  error: string;
  requestId?: string;
  timestamp: string;
}

// Helper function to create consistent error responses
export const handleRouteError = (
  error: unknown,
  res: Response,
  logger: Logger,
  context: string,
  metadata?: Record<string, any>
): void => {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const requestId = res.getHeader('X-Request-ID') as string;
  
  // Log the error with context
  logger.error({
    error: errorMessage,
    context,
    ...metadata
  }, `${context} failed`);

  // Send standardized error response
  const errorResponse: ErrorResponse = {
    error: `Failed to ${context.toLowerCase()}: ${errorMessage}`,
    requestId,
    timestamp: new Date().toISOString()
  };

  res.status(500).json(errorResponse);
};

// Helper for client errors (400 level)
export const handleClientError = (
  res: Response,
  message: string,
  statusCode: number = 400
): void => {
  const requestId = res.getHeader('X-Request-ID') as string;
  
  const errorResponse: ErrorResponse = {
    error: message,
    requestId,
    timestamp: new Date().toISOString()
  };

  res.status(statusCode).json(errorResponse);
};