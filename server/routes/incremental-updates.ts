/**
 * TIER 3.2: Incremental Updates API Routes
 * 
 * Endpoints for detecting changes and triggering incremental regeneration
 */

import express from 'express';
import { verifySupabaseAuth } from '../middleware/auth';
import { incrementalUpdateService } from '../services/incremental-update-service';

const router = express.Router();

/**
 * POST /api/documentations/:id/incremental-update/detect
 * Detect changes in a documentation without regenerating
 */
router.post('/api/documentations/:id/incremental-update/detect', verifySupabaseAuth, async (req, res) => {
  try {
    const docId = parseInt(req.params.id);
    const { pages } = req.body;

    if (isNaN(docId)) {
      return res.status(400).json({ error: 'Invalid documentation ID' });
    }

    if (!pages || !Array.isArray(pages)) {
      return res.status(400).json({ error: 'Pages array is required' });
    }

    const result = await incrementalUpdateService.detectChanges(docId, pages);
    const savings = incrementalUpdateService.calculateCostSavings(result);

    res.json({
      success: true,
      result,
      savings,
    });
  } catch (error: any) {
    console.error('Error detecting changes:', error);
    res.status(500).json({
      error: 'Failed to detect changes',
      message: error.message,
    });
  }
});

/**
 * POST /api/documentations/:id/incremental-update/apply
 * Apply detected changes to documentation
 */
router.post('/api/documentations/:id/incremental-update/apply', verifySupabaseAuth, async (req, res) => {
  try {
    const docId = parseInt(req.params.id);
    const { changes } = req.body;

    if (isNaN(docId)) {
      return res.status(400).json({ error: 'Invalid documentation ID' });
    }

    if (!changes || !Array.isArray(changes)) {
      return res.status(400).json({ error: 'Changes array is required' });
    }

    await incrementalUpdateService.applyChanges(docId, changes);

    res.json({
      success: true,
      message: 'Changes applied successfully',
    });
  } catch (error: any) {
    console.error('Error applying changes:', error);
    res.status(500).json({
      error: 'Failed to apply changes',
      message: error.message,
    });
  }
});

/**
 * GET /api/documentations/:id/incremental-update/unregenerated
 * Get list of unregenerated changes
 */
router.get('/api/documentations/:id/incremental-update/unregenerated', verifySupabaseAuth, async (req, res) => {
  try {
    const docId = parseInt(req.params.id);

    if (isNaN(docId)) {
      return res.status(400).json({ error: 'Invalid documentation ID' });
    }

    const changes = await incrementalUpdateService.getUnregeneratedChanges(docId);

    res.json({
      success: true,
      total: changes.length,
      changes,
    });
  } catch (error: any) {
    console.error('Error getting unregenerated changes:', error);
    res.status(500).json({
      error: 'Failed to get unregenerated changes',
      message: error.message,
    });
  }
});

/**
 * POST /api/documentations/:id/incremental-update/mark-regenerated
 * Mark changes as regenerated
 */
router.post('/api/documentations/:id/incremental-update/mark-regenerated', verifySupabaseAuth, async (req, res) => {
  try {
    const docId = parseInt(req.params.id);
    const { changeIds } = req.body;

    if (isNaN(docId)) {
      return res.status(400).json({ error: 'Invalid documentation ID' });
    }

    if (!changeIds || !Array.isArray(changeIds)) {
      return res.status(400).json({ error: 'changeIds array is required' });
    }

    await incrementalUpdateService.markChangesRegenerated(changeIds);

    res.json({
      success: true,
      message: 'Changes marked as regenerated',
    });
  } catch (error: any) {
    console.error('Error marking changes as regenerated:', error);
    res.status(500).json({
      error: 'Failed to mark changes as regenerated',
      message: error.message,
    });
  }
});

/**
 * GET /api/documentations/pages/:pageId/history
 * Get change history for a specific page
 */
router.get('/api/documentations/pages/:pageId/history', verifySupabaseAuth, async (req, res) => {
  try {
    const pageId = parseInt(req.params.pageId);

    if (isNaN(pageId)) {
      return res.status(400).json({ error: 'Invalid page ID' });
    }

    const history = await incrementalUpdateService.getPageHistory(pageId);

    res.json({
      success: true,
      total: history.length,
      history,
    });
  } catch (error: any) {
    console.error('Error getting page history:', error);
    res.status(500).json({
      error: 'Failed to get page history',
      message: error.message,
    });
  }
});

export default router;
