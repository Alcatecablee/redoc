// Monitoring and logging for YouTube integration

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  success: boolean;
  error?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class MonitoringService {
  private static metrics: PerformanceMetrics[] = [];
  private static maxMetrics = 1000; // Keep last 1000 metrics

  /**
   * Record a performance metric
   */
  static recordMetric(operation: string, duration: number, success: boolean, error?: string, metadata?: Record<string, any>) {
    const metric: PerformanceMetrics = {
      operation,
      duration,
      success,
      error,
      timestamp: new Date(),
      metadata
    };

    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log significant issues
    if (!success && error) {
      console.error(`[MONITORING] ${operation} failed:`, error);
    } else if (duration > 5000) {
      console.warn(`[MONITORING] ${operation} took ${duration}ms (slow operation)`);
    }
  }

  /**
   * Get performance statistics
   */
  static getStats(operation?: string) {
    const filtered = operation 
      ? this.metrics.filter(m => m.operation === operation)
      : this.metrics;

    if (filtered.length === 0) {
      return {
        totalOperations: 0,
        successRate: 0,
        averageDuration: 0,
        errorCount: 0
      };
    }

    const successCount = filtered.filter(m => m.success).length;
    const errorCount = filtered.filter(m => !m.success).length;
    const totalDuration = filtered.reduce((sum, m) => sum + m.duration, 0);

    return {
      totalOperations: filtered.length,
      successRate: (successCount / filtered.length) * 100,
      averageDuration: totalDuration / filtered.length,
      errorCount,
      recentErrors: filtered
        .filter(m => !m.success)
        .slice(-5)
        .map(m => ({ operation: m.operation, error: m.error, timestamp: m.timestamp }))
    };
  }

  /**
   * Clear old metrics
   */
  static clearOldMetrics(olderThanHours: number = 24) {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
  }

  /**
   * Get health status
   */
  static getHealthStatus() {
    const recentMetrics = this.metrics.filter(
      m => m.timestamp > new Date(Date.now() - 60 * 60 * 1000) // Last hour
    );

    if (recentMetrics.length === 0) {
      return { status: 'unknown', message: 'No recent activity' };
    }

    const successRate = (recentMetrics.filter(m => m.success).length / recentMetrics.length) * 100;
    const averageDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length;

    if (successRate < 80) {
      return { status: 'unhealthy', message: `Low success rate: ${successRate.toFixed(1)}%` };
    }

    if (averageDuration > 10000) {
      return { status: 'degraded', message: `Slow performance: ${averageDuration.toFixed(0)}ms average` };
    }

    return { status: 'healthy', message: `Success rate: ${successRate.toFixed(1)}%, Avg duration: ${averageDuration.toFixed(0)}ms` };
  }
}

// Export singleton instance
export const monitoring = MonitoringService;
