import express from 'express';
import cors from 'cors';

export function createExpressApp(): express.Application {
  const app = express();
  app.use(cors());
  app.use(express.json());
  return app;
}