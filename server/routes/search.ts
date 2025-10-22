/**
 * TIER 3.3: Full-Text Search API Routes
 * 
 * Endpoints for searching documentation and getting search statistics
 */

import express from 'express';
import { fullTextSearchService } from '../services/search-service-ft';

const router = express.Router();

/**
 * GET /api/search
 * Search across all documentation
 */
router.get('/api/search', async (req, res) => {
  try {
    const { 
      q, 
      query,
      documentationId, 
      limit, 
      offset 
    } = req.query;

    const searchQuery = (q || query) as string;

    if (!searchQuery || searchQuery.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Search query is required (use ?q=... or ?query=...)' 
      });
    }

    const result = await fullTextSearchService.search({
      query: searchQuery,
      documentationId: documentationId ? parseInt(documentationId as string) : undefined,
      limit: limit ? parseInt(limit as string) : 20,
      offset: offset ? parseInt(offset as string) : 0,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error searching:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/documentations/:id/search
 * Search within a specific documentation
 */
router.get('/api/documentations/:id/search', async (req, res) => {
  try {
    const docId = parseInt(req.params.id);
    const { q, query, limit, offset } = req.query;

    const searchQuery = (q || query) as string;

    if (isNaN(docId)) {
      return res.status(400).json({ error: 'Invalid documentation ID' });
    }

    if (!searchQuery || searchQuery.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Search query is required (use ?q=... or ?query=...)' 
      });
    }

    const result = await fullTextSearchService.searchDocumentation(
      docId,
      searchQuery,
      limit ? parseInt(limit as string) : 20,
      offset ? parseInt(offset as string) : 0
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error searching documentation:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/search/suggestions
 * Get search suggestions based on partial query
 */
router.get('/api/search/suggestions', async (req, res) => {
  try {
    const { q, query, limit } = req.query;

    const partialQuery = (q || query) as string;

    if (!partialQuery || partialQuery.trim().length === 0) {
      return res.json({
        success: true,
        suggestions: [],
      });
    }

    const suggestions = await fullTextSearchService.getSuggestions(
      partialQuery,
      limit ? parseInt(limit as string) : 10
    );

    res.json({
      success: true,
      suggestions,
    });
  } catch (error: any) {
    console.error('Error getting suggestions:', error);
    res.status(500).json({
      error: 'Failed to get suggestions',
      message: error.message,
    });
  }
});

/**
 * POST /api/documentations/:id/search/reindex
 * Re-index a specific documentation for search
 */
router.post('/api/documentations/:id/search/reindex', async (req, res) => {
  try {
    const docId = parseInt(req.params.id);

    if (isNaN(docId)) {
      return res.status(400).json({ error: 'Invalid documentation ID' });
    }

    await fullTextSearchService.reindexDocumentation(docId);

    res.json({
      success: true,
      message: 'Documentation reindexed successfully',
    });
  } catch (error: any) {
    console.error('Error reindexing documentation:', error);
    res.status(500).json({
      error: 'Failed to reindex documentation',
      message: error.message,
    });
  }
});

/**
 * GET /api/search/stats
 * Get search statistics
 */
router.get('/api/search/stats', async (req, res) => {
  try {
    const stats = await fullTextSearchService.getSearchStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error('Error getting search stats:', error);
    res.status(500).json({
      error: 'Failed to get search stats',
      message: error.message,
    });
  }
});

export default router;
