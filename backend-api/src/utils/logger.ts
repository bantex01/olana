import pino from 'pino';

// Create logger with structured configuration
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // In development, use pretty printing. In production, use JSON
  ...(process.env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: 'HH:MM:ss',
      }
    }
  })
});

// Child logger for request tracing  
export const createRequestLogger = (requestId: string) => {
  return logger.child({ requestId });
};

// Export the main logger type for type safety
export type Logger = typeof logger;