/**
 * TIER 3.3: Full-Text Search Service
 * 
 * Provides PostgreSQL-based full-text search across documentation.
 * Includes ranking, highlighting, and filtering capabilities.
 */

import { db } from '../db';
import { documentations, documentationPages } from '../../shared/schema';
import { sql, eq } from 'drizzle-orm';

export interface SearchQuery {
  query: string;
  documentationId?: number;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  id: number;
  type: 'documentation' | 'page';
  title: string;
  content: string;
  excerpt: string;
  url?: string;
  rank: number;
  highlights: string[];
  documentation_id?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  took_ms: number;
}

export class FullTextSearchService {
  /**
   * Search across all documentation
   */
  async search(params: SearchQuery): Promise<SearchResponse> {
    if (!db) throw new Error('Database not initialized');

    const startTime = Date.now();
    const { query, documentationId, limit = 20, offset = 0 } = params;

    // Prepare search query with proper escaping
    const searchQuery = query.trim().split(/\s+/).join(' & ');

    let documentationResults: SearchResult[] = [];
    let pageResults: SearchResult[] = [];

    // Search in documentation titles and content
    if (!documentationId) {
      const docQuery = sql`
        SELECT 
          id,
          title,
          content,
          url,
          ts_rank(search_vector, to_tsquery('english', ${searchQuery})) as rank,
          ts_headline('english', content, to_tsquery('english', ${searchQuery}), 
            'MaxWords=50, MinWords=25, ShortWord=3, HighlightAll=FALSE, MaxFragments=3') as excerpt
        FROM ${documentations}
        WHERE search_vector @@ to_tsquery('english', ${searchQuery})
        ORDER BY rank DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      const docs = await db.execute(docQuery);
      
      documentationResults = (docs.rows as any[]).map(row => ({
        id: row.id,
        type: 'documentation' as const,
        title: row.title,
        content: row.content,
        excerpt: row.excerpt || this.truncateText(row.content, 200),
        url: row.url,
        rank: parseFloat(row.rank || '0'),
        highlights: this.extractHighlights(row.excerpt || row.content),
      }));
    }

    // Search in documentation pages
    const pageQuery = sql`
      SELECT 
        p.id,
        p.title,
        p.content,
        p.url,
        p.documentation_id,
        ts_rank(p.search_vector, to_tsquery('english', ${searchQuery})) as rank,
        ts_headline('english', p.content, to_tsquery('english', ${searchQuery}),
          'MaxWords=50, MinWords=25, ShortWord=3, HighlightAll=FALSE, MaxFragments=3') as excerpt
      FROM ${documentationPages} p
      WHERE p.search_vector @@ to_tsquery('english', ${searchQuery})
        ${documentationId ? sql`AND p.documentation_id = ${documentationId}` : sql``}
      ORDER BY rank DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const pages = await db.execute(pageQuery);

    pageResults = (pages.rows as any[]).map(row => ({
      id: row.id,
      type: 'page' as const,
      title: row.title,
      content: row.content,
      excerpt: row.excerpt || this.truncateText(row.content, 200),
      url: row.url,
      rank: parseFloat(row.rank || '0'),
      highlights: this.extractHighlights(row.excerpt || row.content),
      documentation_id: row.documentation_id,
    }));

    // Combine and sort results by rank
    const allResults = [...documentationResults, ...pageResults]
      .sort((a, b) => b.rank - a.rank)
      .slice(0, limit);

    const took_ms = Date.now() - startTime;

    return {
      results: allResults,
      total: allResults.length,
      query,
      took_ms,
    };
  }

  /**
   * Search within a specific documentation
   */
  async searchDocumentation(
    documentationId: number,
    query: string,
    limit = 20,
    offset = 0
  ): Promise<SearchResponse> {
    return this.search({ query, documentationId, limit, offset });
  }

  /**
   * Get search suggestions based on partial query
   */
  async getSuggestions(partialQuery: string, limit = 10): Promise<string[]> {
    if (!db) throw new Error('Database not initialized');

    // Use trigram similarity for suggestions
    const suggestions = await db
      .select({
        title: documentations.title,
      })
      .from(documentations)
      .where(
        sql`title ILIKE ${`%${partialQuery}%`}`
      )
      .limit(limit);

    return suggestions.map(s => s.title);
  }

  /**
   * Extract highlights from headline result
   */
  private extractHighlights(text: string): string[] {
    // PostgreSQL ts_headline wraps matches in <b>...</b> tags
    const regex = /<b>(.*?)<\/b>/g;
    const highlights: string[] = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      highlights.push(match[1]);
    }

    return highlights;
  }

  /**
   * Truncate text to specified length
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    return lastSpace > 0 
      ? truncated.substring(0, lastSpace) + '...'
      : truncated + '...';
  }

  /**
   * Re-index a specific documentation
   */
  async reindexDocumentation(documentationId: number): Promise<void> {
    if (!db) throw new Error('Database not initialized');

    // Update search vector for documentation
    await db.execute(sql`
      UPDATE ${documentations}
      SET search_vector = 
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(content, '')), 'B')
      WHERE id = ${documentationId}
    `);

    // Update search vector for all pages
    await db.execute(sql`
      UPDATE ${documentationPages}
      SET search_vector = 
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(content, '')), 'B')
      WHERE documentation_id = ${documentationId}
    `);
  }

  /**
   * Get search statistics
   */
  async getSearchStats(): Promise<{
    totalDocumentations: number;
    totalPages: number;
    indexedDocumentations: number;
    indexedPages: number;
  }> {
    if (!db) throw new Error('Database not initialized');

    const docStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(search_vector) as indexed
      FROM ${documentations}
    `);

    const pageStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(search_vector) as indexed
      FROM ${documentationPages}
    `);

    return {
      totalDocumentations: parseInt((docStats.rows[0] as any).total || '0'),
      indexedDocumentations: parseInt((docStats.rows[0] as any).indexed || '0'),
      totalPages: parseInt((pageStats.rows[0] as any).total || '0'),
      indexedPages: parseInt((pageStats.rows[0] as any).indexed || '0'),
    };
  }
}

export const fullTextSearchService = new FullTextSearchService();
