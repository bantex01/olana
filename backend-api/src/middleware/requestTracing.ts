import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { createRequestLogger } from '../utils/logger';

// Extend Express Request interface to include requestId and logger
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      log: ReturnType<typeof createRequestLogger>;
    }
  }
}

export const requestTracingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Generate unique request ID
  req.requestId = randomUUID();
  
  // Create request-scoped logger
  req.log = createRequestLogger(req.requestId);
  
  // Add request ID to response headers for debugging
  res.setHeader('X-Request-ID', req.requestId);
  
  // Log incoming request
  req.log.info({
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  }, 'Incoming request');

  // Log response when finished
  const originalSend = res.send;
  res.send = function(body) {
    req.log.info({
      statusCode: res.statusCode,
      contentLength: body ? body.length : 0
    }, 'Response sent');
    return originalSend.call(this, body);
  };

  next();
};