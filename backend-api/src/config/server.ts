import express from 'express';
import cors from 'cors';

export function createExpressApp(): express.Application {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

    app.use((req, res, next) => {
    if (req.path.includes('/webhooks/')) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    }
    next();
  });
  
  // Add error handling for malformed JSON
  app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (error instanceof SyntaxError && 'body' in error) {
      console.error('JSON parsing error:', error.message);
      return res.status(400).json({ 
        error: 'Invalid JSON payload',
        details: error.message 
      });
    }
    next(error);
  });


  return app;
}