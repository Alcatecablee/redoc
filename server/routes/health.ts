/**
 * Health Monitoring Routes
 * 
 * Production-ready health check endpoints for monitoring system status,
 * memory usage, queue statistics, and circuit breaker states.
 */

import { Router } from 'express';
import { monitoring } from '../monitoring';
import { getAllCircuitStates } from '../utils/circuit-breaker';
import { getIdempotencyStats } from '../middleware/idempotency';

const router = Router();

/**
 * Basic health check endpoint
 * Returns: healthy | degraded | unhealthy
 */
router.get('/', (req, res) => {
  try {
    const health = monitoring.getHealthStatus();
    // Only return 503 for truly unhealthy status
    // "unknown" (no activity yet) and "degraded" still return 200
    const statusCode = health.status === 'unhealthy' ? 503 : 200;
    
    res.status(statusCode).json({
      status: health.status,
      message: health.message,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Memory usage statistics
 */
router.get('/memory', (req, res) => {
  try {
    const usage = process.memoryUsage();
    const total = usage.heapTotal;
    const used = usage.heapUsed;
    const external = usage.external;
    
    const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(2);
    
    res.json({
      status: 'ok',
      memory: {
        heapUsed: mb(used) + ' MB',
        heapTotal: mb(total) + ' MB',
        heapUtilization: ((used / total) * 100).toFixed(1) + '%',
        external: mb(external) + ' MB',
        rss: mb(usage.rss) + ' MB',
      },
      raw: usage,
      warnings: used / total > 0.9 ? ['High memory usage (>90%)'] : [],
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * Queue statistics
 */
router.get('/queue', async (req, res) => {
  try {
    // Import queue dynamically to avoid circular dependencies
    const { getQueueStats } = await import('../queue/unified-queue');
    const stats = await getQueueStats();
    
    res.json({
      status: 'ok',
      queue: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      note: 'Queue statistics not available - queue may not be initialized',
    });
  }
});

/**
 * Circuit breaker states
 */
router.get('/circuits', (req, res) => {
  try {
    const circuits = getAllCircuitStates();
    const circuitCount = Object.keys(circuits).length;
    
    const openCircuits = Object.entries(circuits)
      .filter(([_, stats]) => stats.state === 'OPEN')
      .map(([key]) => key);
    
    const halfOpenCircuits = Object.entries(circuits)
      .filter(([_, stats]) => stats.state === 'HALF_OPEN')
      .map(([key]) => key);
    
    res.json({
      status: openCircuits.length > 0 ? 'warning' : 'ok',
      circuits,
      summary: {
        total: circuitCount,
        open: openCircuits.length,
        halfOpen: halfOpenCircuits.length,
        closed: circuitCount - openCircuits.length - halfOpenCircuits.length,
      },
      openCircuits,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * Monitoring statistics
 */
router.get('/stats', (req, res) => {
  try {
    const operation = req.query.operation as string | undefined;
    const stats = monitoring.getStats(operation);
    
    res.json({
      status: 'ok',
      stats,
      operation: operation || 'all',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * Idempotency cache statistics
 */
router.get('/idempotency', async (req, res) => {
  try {
    const stats = await getIdempotencyStats();
    
    res.json({
      status: 'ok',
      idempotency: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * Detailed system health (comprehensive)
 */
router.get('/detailed', async (req, res) => {
  try {
    const health = monitoring.getHealthStatus();
    const usage = process.memoryUsage();
    const circuits = getAllCircuitStates();
    const stats = monitoring.getStats();
    
    let queueStats;
    try {
      const { getQueueStats } = await import('../queue/unified-queue');
      queueStats = await getQueueStats();
    } catch {
      queueStats = { error: 'Queue not available' };
    }
    
    let idempotencyStats;
    try {
      idempotencyStats = await getIdempotencyStats();
    } catch {
      idempotencyStats = { error: 'Stats not available' };
    }
    
    const openCircuits = Object.entries(circuits)
      .filter(([_, s]) => s.state === 'OPEN')
      .map(([key]) => key);
    
    const overallStatus = 
      health.status === 'unhealthy' || openCircuits.length > 2 ? 'unhealthy' :
      health.status === 'degraded' || openCircuits.length > 0 ? 'degraded' :
      'healthy';
    
    res.json({
      status: overallStatus,
      health,
      memory: {
        heapUsed: (usage.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
        heapTotal: (usage.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
        utilization: ((usage.heapUsed / usage.heapTotal) * 100).toFixed(1) + '%',
      },
      circuits: {
        states: circuits,
        summary: {
          total: Object.keys(circuits).length,
          open: openCircuits.length,
        },
        openCircuits,
      },
      queue: queueStats,
      monitoring: stats,
      idempotency: idempotencyStats,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
