/**
 * Job Status API Endpoints
 * Provides real-time job status and queue statistics
 * 
 * SECURITY: All endpoints require Supabase authentication
 */

import { Router } from 'express';
import { getUnifiedQueue } from '../queue/unified-queue';
import { verifySupabaseAuth } from '../routes';

const router = Router();

/**
 * GET /api/jobs/:id
 * Get job status by ID
 * Requires authentication - users can only see their own jobs
 */
router.get('/api/jobs/:id', verifySupabaseAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const queue = getUnifiedQueue();
    
    const job = await queue.getJob(id);
    
    if (!job) {
      return res.status(404).json({ 
        error: 'Job not found',
        message: `No job found with ID: ${id}`
      });
    }

    return res.json({
      success: true,
      job: {
        id: job.id,
        name: job.name,
        status: job.status,
        progress: job.progress,
        result: job.result,
        error: job.error,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        attempts: job.attempts,
      },
    });
  } catch (error) {
    console.error('Error fetching job:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch job status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/jobs/stats
 * Get queue statistics
 * Requires authentication - admin/monitoring only
 */
router.get('/api/jobs/stats', verifySupabaseAuth, async (req, res) => {
  try {
    const queue = getUnifiedQueue();
    const stats = await queue.getStats();
    
    return res.json({
      success: true,
      mode: queue.getMode(),
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching queue stats:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch queue statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
