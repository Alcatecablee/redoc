/**
 * TIER 3.5: Audit Logs API Routes
 * 
 * Endpoints for viewing and exporting audit logs for compliance
 */

import express from 'express';
import { verifySupabaseAuth } from '../middleware/auth';
import { auditService } from '../services/audit-service';

const router = express.Router();

/**
 * GET /api/audit/logs
 * Query audit logs with filters
 */
router.get('/api/audit/logs', verifySupabaseAuth, async (req, res) => {
  try {
    const {
      userId,
      organizationId,
      action,
      resourceType,
      resourceId,
      startDate,
      endDate,
      limit,
      offset,
    } = req.query;

    const result = await auditService.query({
      userId: userId ? parseInt(userId as string) : undefined,
      organizationId: organizationId ? parseInt(organizationId as string) : undefined,
      action: action as string | undefined,
      resourceType: resourceType as string | undefined,
      resourceId: resourceId as string | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : 100,
      offset: offset ? parseInt(offset as string) : 0,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error querying audit logs:', error);
    res.status(500).json({
      error: 'Failed to query audit logs',
      message: error.message,
    });
  }
});

/**
 * GET /api/audit/users/:userId
 * Get audit logs for a specific user
 */
router.get('/api/audit/users/:userId', verifySupabaseAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { startDate, endDate, limit } = req.query;

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const result = await auditService.getUserAuditLog(
      userId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
      limit ? parseInt(limit as string) : 100
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error getting user audit log:', error);
    res.status(500).json({
      error: 'Failed to get user audit log',
      message: error.message,
    });
  }
});

/**
 * GET /api/audit/organizations/:organizationId
 * Get audit logs for an organization
 */
router.get('/api/audit/organizations/:organizationId', verifySupabaseAuth, async (req, res) => {
  try {
    const organizationId = parseInt(req.params.organizationId);
    const { startDate, endDate, limit } = req.query;

    if (isNaN(organizationId)) {
      return res.status(400).json({ error: 'Invalid organization ID' });
    }

    const result = await auditService.getOrganizationAuditLog(
      organizationId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
      limit ? parseInt(limit as string) : 100
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error getting organization audit log:', error);
    res.status(500).json({
      error: 'Failed to get organization audit log',
      message: error.message,
    });
  }
});

/**
 * GET /api/audit/resources/:resourceType/:resourceId
 * Get audit logs for a specific resource
 */
router.get('/api/audit/resources/:resourceType/:resourceId', verifySupabaseAuth, async (req, res) => {
  try {
    const { resourceType, resourceId } = req.params;
    const { startDate, endDate } = req.query;

    const result = await auditService.getResourceAuditLog(
      resourceType,
      resourceId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error getting resource audit log:', error);
    res.status(500).json({
      error: 'Failed to get resource audit log',
      message: error.message,
    });
  }
});

/**
 * GET /api/audit/export/csv
 * Export audit logs as CSV
 */
router.get('/api/audit/export/csv', verifySupabaseAuth, async (req, res) => {
  try {
    const {
      userId,
      organizationId,
      action,
      resourceType,
      resourceId,
      startDate,
      endDate,
      limit,
    } = req.query;

    const result = await auditService.query({
      userId: userId ? parseInt(userId as string) : undefined,
      organizationId: organizationId ? parseInt(organizationId as string) : undefined,
      action: action as string | undefined,
      resourceType: resourceType as string | undefined,
      resourceId: resourceId as string | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : 10000,
      offset: 0,
    });

    const csv = auditService.exportToCSV(result);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-log-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error: any) {
    console.error('Error exporting audit logs to CSV:', error);
    res.status(500).json({
      error: 'Failed to export audit logs',
      message: error.message,
    });
  }
});

/**
 * GET /api/audit/export/json
 * Export audit logs as JSON
 */
router.get('/api/audit/export/json', verifySupabaseAuth, async (req, res) => {
  try {
    const {
      userId,
      organizationId,
      action,
      resourceType,
      resourceId,
      startDate,
      endDate,
      limit,
    } = req.query;

    const result = await auditService.query({
      userId: userId ? parseInt(userId as string) : undefined,
      organizationId: organizationId ? parseInt(organizationId as string) : undefined,
      action: action as string | undefined,
      resourceType: resourceType as string | undefined,
      resourceId: resourceId as string | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : 10000,
      offset: 0,
    });

    const json = auditService.exportToJSON(result);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="audit-log-${Date.now()}.json"`);
    res.send(json);
  } catch (error: any) {
    console.error('Error exporting audit logs to JSON:', error);
    res.status(500).json({
      error: 'Failed to export audit logs',
      message: error.message,
    });
  }
});

/**
 * GET /api/audit/stats
 * Get audit log statistics
 */
router.get('/api/audit/stats', verifySupabaseAuth, async (req, res) => {
  try {
    const {
      userId,
      organizationId,
      startDate,
      endDate,
    } = req.query;

    // Default to last 30 days if no dates provided
    const end = endDate ? new Date(endDate as string) : new Date();
    const start = startDate 
      ? new Date(startDate as string) 
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const stats = await auditService.getStatistics(
      start,
      end,
      userId ? parseInt(userId as string) : undefined,
      organizationId ? parseInt(organizationId as string) : undefined
    );

    res.json({
      success: true,
      stats,
      period: { start, end },
    });
  } catch (error: any) {
    console.error('Error getting audit stats:', error);
    res.status(500).json({
      error: 'Failed to get audit stats',
      message: error.message,
    });
  }
});

export default router;
