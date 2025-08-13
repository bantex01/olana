import { PoolClient } from 'pg';
import { logger } from './logger';

export interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  parameters?: any[];
  error?: string;
}

class QueryMonitor {
  private slowQueryThreshold: number;
  private metrics: QueryMetrics[] = [];
  private maxMetricsHistory: number;

  constructor(slowQueryThreshold = 1000, maxMetricsHistory = 100) {
    this.slowQueryThreshold = slowQueryThreshold; // milliseconds
    this.maxMetricsHistory = maxMetricsHistory;
  }

  async executeQuery(
    client: PoolClient,
    query: string,
    parameters?: any[],
    queryName?: string
  ): Promise<any> {
    const startTime = Date.now();
    const timestamp = new Date();
    
    try {
      const result = await client.query(query, parameters);
      const duration = Date.now() - startTime;
      
      // Record metrics
      this.recordMetrics({
        query: queryName || this.sanitizeQuery(query),
        duration,
        timestamp,
        parameters: this.sanitizeParameters(parameters)
      });
      
      // Log slow queries
      if (duration > this.slowQueryThreshold) {
        logger.warn({
          queryName: queryName || 'unnamed',
          duration,
          query: this.sanitizeQuery(query),
          parameterCount: parameters?.length || 0
        }, 'Slow query detected');
      }
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Record error metrics
      this.recordMetrics({
        query: queryName || this.sanitizeQuery(query),
        duration,
        timestamp,
        parameters: this.sanitizeParameters(parameters),
        error: error instanceof Error ? error.message : String(error)
      });
      
      logger.error({
        queryName: queryName || 'unnamed',
        duration,
        error: error instanceof Error ? error.message : String(error),
        query: this.sanitizeQuery(query)
      }, 'Query execution failed');
      
      throw error;
    }
  }

  private recordMetrics(metrics: QueryMetrics): void {
    this.metrics.push(metrics);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }
  }

  private sanitizeQuery(query: string): string {
    // Truncate long queries and remove sensitive data
    return query
      .replace(/\s+/g, ' ')
      .substring(0, 200)
      .trim();
  }

  private sanitizeParameters(parameters?: any[]): any[] | undefined {
    if (!parameters) return undefined;
    
    // Remove potentially sensitive parameter values
    return parameters.map(() => '[PARAM]');
  }

  getRecentMetrics(count = 10): QueryMetrics[] {
    return this.metrics.slice(-count);
  }

  getSlowestQueries(count = 5): QueryMetrics[] {
    return [...this.metrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, count);
  }

  getQueryStats(): {
    totalQueries: number;
    avgDuration: number;
    slowQueries: number;
    errors: number;
  } {
    if (this.metrics.length === 0) {
      return { totalQueries: 0, avgDuration: 0, slowQueries: 0, errors: 0 };
    }

    const totalQueries = this.metrics.length;
    const avgDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0) / totalQueries;
    const slowQueries = this.metrics.filter(m => m.duration > this.slowQueryThreshold).length;
    const errors = this.metrics.filter(m => m.error).length;

    return { totalQueries, avgDuration, slowQueries, errors };
  }

  clearMetrics(): void {
    this.metrics = [];
  }
}

// Export singleton instance
export const queryMonitor = new QueryMonitor(
  parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000'),
  parseInt(process.env.MAX_METRICS_HISTORY || '100')
);