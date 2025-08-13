import { PoolClient } from 'pg';
import { logger } from './logger';

export interface QueryTimeoutConfig {
  defaultTimeout: number;
  slowQueryThreshold: number;
  criticalQueryTimeout: number;
}

const defaultConfig: QueryTimeoutConfig = {
  defaultTimeout: 30000, // 30 seconds
  slowQueryThreshold: 5000, // 5 seconds
  criticalQueryTimeout: 60000 // 60 seconds for critical operations
};

export class QueryTimeoutHandler {
  private config: QueryTimeoutConfig;

  constructor(config: Partial<QueryTimeoutConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  async executeWithTimeout<T>(
    client: PoolClient,
    query: string,
    parameters?: any[],
    options: {
      timeout?: number;
      queryName?: string;
      critical?: boolean;
    } = {}
  ): Promise<T> {
    const {
      timeout = options.critical ? this.config.criticalQueryTimeout : this.config.defaultTimeout,
      queryName = 'unnamed_query',
      critical = false
    } = options;

    const startTime = Date.now();
    
    return new Promise(async (resolve, reject) => {
      let timeoutId: NodeJS.Timeout;
      let queryCompleted = false;

      // Set up timeout
      timeoutId = setTimeout(() => {
        if (!queryCompleted) {
          queryCompleted = true;
          
          logger.error({
            queryName,
            timeout,
            critical,
            query: this.sanitizeQuery(query)
          }, 'Query timed out');
          
          // Try to cancel the query
          this.cancelQuery(client, queryName);
          
          reject(new Error(`Query "${queryName}" timed out after ${timeout}ms`));
        }
      }, timeout);

      try {
        const result = await client.query(query, parameters);
        
        if (!queryCompleted) {
          queryCompleted = true;
          clearTimeout(timeoutId);
          
          const duration = Date.now() - startTime;
          
          // Log slow queries
          if (duration > this.config.slowQueryThreshold) {
            logger.warn({
              queryName,
              duration,
              timeout,
              critical,
              query: this.sanitizeQuery(query)
            }, 'Slow query detected');
          }
          
          resolve(result as T);
        }
        
      } catch (error) {
        if (!queryCompleted) {
          queryCompleted = true;
          clearTimeout(timeoutId);
          
          const duration = Date.now() - startTime;
          
          logger.error({
            queryName,
            duration,
            timeout,
            critical,
            error: error instanceof Error ? error.message : String(error),
            query: this.sanitizeQuery(query)
          }, 'Query execution failed');
          
          reject(error);
        }
      }
    });
  }

  async executeMultipleWithTimeout(
    client: PoolClient,
    queries: Array<{
      query: string;
      parameters?: any[];
      name: string;
      timeout?: number;
      critical?: boolean;
    }>,
    options: {
      parallel?: boolean;
      failFast?: boolean;
    } = {}
  ): Promise<Record<string, any>> {
    const { parallel = false, failFast = true } = options;

    if (parallel) {
      // Execute queries in parallel
      const promises = queries.map(q => 
        this.executeWithTimeout(client, q.query, q.parameters, {
          timeout: q.timeout,
          queryName: q.name,
          critical: q.critical
        }).then(result => ({ [q.name]: result }))
      );

      if (failFast) {
        const results = await Promise.all(promises);
        return results.reduce((acc, result) => ({ ...acc, ...result }), {});
      } else {
        const results = await Promise.allSettled(promises);
        const successfulResults: Record<string, any> = {};
        
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            Object.assign(successfulResults, result.value);
          } else {
            logger.error({
              queryName: queries[index].name,
              error: result.reason
            }, 'Query failed in parallel execution');
          }
        });
        
        return successfulResults;
      }
    } else {
      // Execute queries sequentially
      const results: Record<string, any> = {};
      
      for (const q of queries) {
        try {
          const result = await this.executeWithTimeout(client, q.query, q.parameters, {
            timeout: q.timeout,
            queryName: q.name,
            critical: q.critical
          });
          
          results[q.name] = result;
          
        } catch (error) {
          if (failFast) {
            throw error;
          }
          
          logger.error({
            queryName: q.name,
            error: error instanceof Error ? error.message : String(error)
          }, 'Query failed in sequential execution');
          
          results[q.name] = null;
        }
      }
      
      return results;
    }
  }

  private async cancelQuery(client: PoolClient, queryName: string): Promise<void> {
    try {
      // PostgreSQL doesn't have a direct way to cancel queries from the client
      // But we can try to close the connection to stop the query
      logger.warn({
        queryName
      }, 'Attempting to release connection due to timeout');
      
      // The connection will be released by the calling code
      // This is mainly for logging purposes
      
    } catch (error) {
      logger.error({
        queryName,
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to cancel query');
    }
  }

  private sanitizeQuery(query: string): string {
    return query
      .replace(/\s+/g, ' ')
      .substring(0, 150)
      .trim();
  }

  updateConfig(newConfig: Partial<QueryTimeoutConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): QueryTimeoutConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const queryTimeout = new QueryTimeoutHandler({
  defaultTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'),
  slowQueryThreshold: parseInt(process.env.DB_SLOW_QUERY_THRESHOLD || '5000'),
  criticalQueryTimeout: parseInt(process.env.DB_CRITICAL_QUERY_TIMEOUT || '60000')
});