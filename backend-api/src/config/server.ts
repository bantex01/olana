import express from 'express';
import cors from 'cors';
import { logger } from '../utils/logger';

export function createExpressApp(): express.Application {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

    app.use((req, res, next) => {
    if (req.path.includes('/webhooks/')) {
      logger.info({ method: req.method, path: req.path }, 'Webhook request');
    }
    next();
  });
  
  // Add error handling for malformed JSON
  app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (error instanceof SyntaxError && 'body' in error) {
      logger.error({ error: error.message }, 'JSON parsing error');
      return res.status(400).json({ 
        error: 'Invalid JSON payload',
        details: error.message 
      });
    }
    return next(error);
  });


  return app;
}