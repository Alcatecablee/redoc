/**
 * Documentation Versioning Routes
 * 
 * Endpoints for managing documentation versions:
 * - List versions
 * - Get specific version
 * - Restore previous version
 * - Compare versions
 * - View version history
 */

import { Router } from 'express';
import { verifySupabaseAuth } from '../middleware/auth';
import {
  getDocumentationVersions,
  getSpecificVersion,
  restoreDocumentationVersion,
  compareVersions,
  getVersionHistory,
} from '../utils/documentation-versioning';

const router = Router();

/**
 * Get version history summary for a documentation
 * GET /api/documentations/:id/versions/history
 */
router.get('/api/documentations/:id/versions/history', async (req, res) => {
  try {
    const docId = parseInt(req.params.id);
    
    if (isNaN(docId)) {
      return res.status(400).json({ error: 'Invalid documentation ID' });
    }

    const history = await getVersionHistory(docId);
    
    res.json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    console.error('Error getting version history:', error);
    res.status(500).json({
      error: 'Failed to get version history',
      message: error.message,
    });
  }
});

/**
 * List all versions for a documentation
 * GET /api/documentations/:id/versions
 */
router.get('/api/documentations/:id/versions', async (req, res) => {
  try {
    const docId = parseInt(req.params.id);
    
    if (isNaN(docId)) {
      return res.status(400).json({ error: 'Invalid documentation ID' });
    }

    const versions = await getDocumentationVersions(docId);
    
    res.json({
      success: true,
      total: versions.length,
      versions: versions.map(v => ({
        id: v.id,
        version: v.version,
        title: v.title,
        contentLength: v.content.length,
        versionNotes: v.version_notes,
        isLatest: v.is_latest,
        createdAt: v.created_at,
        createdBy: v.created_by,
      })),
    });
  } catch (error: any) {
    console.error('Error listing versions:', error);
    res.status(500).json({
      error: 'Failed to list versions',
      message: error.message,
    });
  }
});

/**
 * Get a specific version
 * GET /api/documentations/:id/versions/:version
 */
router.get('/api/documentations/:id/versions/:version', async (req, res) => {
  try {
    const docId = parseInt(req.params.id);
    const version = parseInt(req.params.version);
    
    if (isNaN(docId) || isNaN(version)) {
      return res.status(400).json({ error: 'Invalid documentation ID or version number' });
    }

    const versionRecord = await getSpecificVersion(docId, version);
    
    if (!versionRecord) {
      return res.status(404).json({ error: 'Version not found' });
    }
    
    res.json({
      success: true,
      version: versionRecord,
    });
  } catch (error: any) {
    console.error('Error getting version:', error);
    res.status(500).json({
      error: 'Failed to get version',
      message: error.message,
    });
  }
});

/**
 * Restore a previous version
 * POST /api/documentations/:id/versions/restore/:version
 */
router.post('/api/documentations/:id/versions/restore/:version', verifySupabaseAuth, async (req, res) => {
  try {
    const docId = parseInt(req.params.id);
    const versionToRestore = parseInt(req.params.version);
    
    if (isNaN(docId) || isNaN(versionToRestore)) {
      return res.status(400).json({ error: 'Invalid documentation ID or version number' });
    }

    const userEmail = req.user?.email;
    
    const result = await restoreDocumentationVersion(
      docId,
      versionToRestore,
      userEmail
    );
    
    res.json({
      success: true,
      message: `Documentation restored from version ${versionToRestore}`,
      newVersionNumber: result.newVersionNumber,
    });
  } catch (error: any) {
    console.error('Error restoring version:', error);
    res.status(500).json({
      error: 'Failed to restore version',
      message: error.message,
    });
  }
});

/**
 * Compare two versions
 * GET /api/documentations/:id/versions/compare/:v1/:v2
 */
router.get('/api/documentations/:id/versions/compare/:v1/:v2', async (req, res) => {
  try {
    const docId = parseInt(req.params.id);
    const v1 = parseInt(req.params.v1);
    const v2 = parseInt(req.params.v2);
    
    if (isNaN(docId) || isNaN(v1) || isNaN(v2)) {
      return res.status(400).json({ error: 'Invalid documentation ID or version numbers' });
    }

    const comparison = await compareVersions(docId, v1, v2);
    
    res.json({
      success: true,
      comparison,
    });
  } catch (error: any) {
    console.error('Error comparing versions:', error);
    res.status(500).json({
      error: 'Failed to compare versions',
      message: error.message,
    });
  }
});

export default router;
