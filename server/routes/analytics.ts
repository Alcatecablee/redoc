/**
 * TIER 3.4: Analytics API Routes
 * 
 * Endpoints for tracking and viewing documentation analytics
 */

import express from 'express';
import { verifySupabaseAuth } from '../middleware/auth';
import { analyticsService } from '../services/analytics-service';

const router = express.Router();

/**
 * POST /api/analytics/track
 * Track an analytics event (public endpoint for tracking views)
 */
router.post('/api/analytics/track', async (req, res) => {
  try {
    const {
      documentationId,
      eventType,
      pageUrl,
      sectionId,
      userId,
      sessionId,
      referrer,
      metadata,
    } = req.body;

    if (!documentationId || !eventType) {
      return res.status(400).json({ 
        error: 'documentationId and eventType are required' 
      });
    }

    // Get IP and User Agent from request
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');

    await analyticsService.trackEvent({
      documentationId: parseInt(documentationId),
      eventType,
      pageUrl,
      sectionId,
      userId,
      sessionId,
      ipAddress,
      userAgent,
      referrer,
      metadata,
    });

    res.json({
      success: true,
      message: 'Event tracked successfully',
    });
  } catch (error: any) {
    console.error('Error tracking event:', error);
    res.status(500).json({
      error: 'Failed to track event',
      message: error.message,
    });
  }
});

/**
 * POST /api/documentations/:id/analytics/view
 * Track a page view (public endpoint)
 */
router.post('/api/documentations/:id/analytics/view', async (req, res) => {
  try {
    const docId = parseInt(req.params.id);
    const { pageUrl, sessionId, userId, referrer } = req.body;

    if (isNaN(docId)) {
      return res.status(400).json({ error: 'Invalid documentation ID' });
    }

    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');

    await analyticsService.trackView(
      docId,
      pageUrl,
      sessionId,
      userId,
      ipAddress,
      userAgent,
      referrer
    );

    res.json({
      success: true,
      message: 'View tracked successfully',
    });
  } catch (error: any) {
    console.error('Error tracking view:', error);
    res.status(500).json({
      error: 'Failed to track view',
      message: error.message,
    });
  }
});

/**
 * GET /api/documentations/:id/analytics/report
 * Get analytics report for a documentation
 */
router.get('/api/documentations/:id/analytics/report', verifySupabaseAuth, async (req, res) => {
  try {
    const docId = parseInt(req.params.id);
    const { startDate, endDate } = req.query;

    if (isNaN(docId)) {
      return res.status(400).json({ error: 'Invalid documentation ID' });
    }

    // Default to last 30 days if no dates provided
    const end = endDate ? new Date(endDate as string) : new Date();
    const start = startDate 
      ? new Date(startDate as string) 
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Try to get cached summary first
    let report = await analyticsService.getSummary(docId, { start, end });

    // If no cached summary, generate fresh report
    if (!report) {
      report = await analyticsService.generateReport(docId, { start, end });
      
      // Cache the report for future use
      await analyticsService.saveSummary(docId, report);
    }

    res.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error('Error generating analytics report:', error);
    res.status(500).json({
      error: 'Failed to generate analytics report',
      message: error.message,
    });
  }
});

/**
 * GET /api/documentations/:id/analytics/realtime
 * Get real-time analytics for a documentation
 */
router.get('/api/documentations/:id/analytics/realtime', verifySupabaseAuth, async (req, res) => {
  try {
    const docId = parseInt(req.params.id);

    if (isNaN(docId)) {
      return res.status(400).json({ error: 'Invalid documentation ID' });
    }

    const stats = await analyticsService.getRealTimeStats(docId);

    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error('Error getting real-time stats:', error);
    res.status(500).json({
      error: 'Failed to get real-time stats',
      message: error.message,
    });
  }
});

/**
 * GET /api/documentations/:id/analytics/export
 * Export analytics report as CSV
 */
router.get('/api/documentations/:id/analytics/export', verifySupabaseAuth, async (req, res) => {
  try {
    const docId = parseInt(req.params.id);
    const { startDate, endDate } = req.query;

    if (isNaN(docId)) {
      return res.status(400).json({ error: 'Invalid documentation ID' });
    }

    // Default to last 30 days if no dates provided
    const end = endDate ? new Date(endDate as string) : new Date();
    const start = startDate 
      ? new Date(startDate as string) 
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const report = await analyticsService.generateReport(docId, { start, end });
    const csv = analyticsService.exportToCSV(report);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="analytics-${docId}-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error: any) {
    console.error('Error exporting analytics:', error);
    res.status(500).json({
      error: 'Failed to export analytics',
      message: error.message,
    });
  }
});

export default router;
