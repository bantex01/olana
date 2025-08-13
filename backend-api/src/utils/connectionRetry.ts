import { Pool, PoolClient } from 'pg';
import { logger } from './logger';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  jitter: true
};

export class ConnectionRetryHelper {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...defaultRetryConfig, ...config };
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    retryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = retryConfig ? { ...this.config, ...retryConfig } : this.config;
    let lastError: Error;

    for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
      try {
        const result = await operation();
        
        if (attempt > 1) {
          logger.info({
            operation: operationName,
            attempt,
            success: true
          }, 'Operation succeeded after retry');
        }
        
        return result;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt <= config.maxRetries && this.isRetryableError(lastError)) {
          const delay = this.calculateDelay(attempt, config);
          
          logger.warn({
            operation: operationName,
            attempt,
            maxRetries: config.maxRetries,
            delay,
            error: lastError.message
          }, 'Operation failed, retrying');
          
          await this.sleep(delay);
          continue;
        }
        
        logger.error({
          operation: operationName,
          attempt,
          maxRetries: config.maxRetries,
          error: lastError.message,
          finalAttempt: true
        }, 'Operation failed after all retries');
        
        throw lastError;
      }
    }
    
    throw lastError!;
  }

  async withConnection<T>(
    pool: Pool,
    operation: (client: PoolClient) => Promise<T>,
    operationName: string,
    retryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    return this.executeWithRetry(async () => {
      const client = await pool.connect();
      try {
        return await operation(client);
      } finally {
        client.release();
      }
    }, `${operationName}_with_connection`, retryConfig);
  }

  async withTransaction<T>(
    pool: Pool,
    operation: (client: PoolClient) => Promise<T>,
    operationName: string,
    retryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    return this.executeWithRetry(async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await operation(client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }, `${operationName}_transaction`, retryConfig);
  }

  private isRetryableError(error: Error): boolean {
    const retryableMessages = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEOUT',
      'ENOTFOUND',
      'EHOSTUNREACH',
      'connection terminated',
      'server closed the connection',
      'Connection terminated',
      'Client has encountered a connection error',
      'Connection pool exhausted'
    ];

    const errorMessage = error.message.toLowerCase();
    return retryableMessages.some(msg => errorMessage.includes(msg.toLowerCase()));
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    let delay = Math.min(
      config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
      config.maxDelay
    );

    if (config.jitter) {
      // Add random jitter to prevent thundering herd
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return Math.floor(delay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const connectionRetry = new ConnectionRetryHelper({
  maxRetries: parseInt(process.env.DB_MAX_RETRIES || '3'),
  baseDelay: parseInt(process.env.DB_RETRY_BASE_DELAY || '1000'),
  maxDelay: parseInt(process.env.DB_RETRY_MAX_DELAY || '10000'),
  backoffMultiplier: parseFloat(process.env.DB_RETRY_BACKOFF || '2'),
  jitter: process.env.DB_RETRY_JITTER !== 'false'
});