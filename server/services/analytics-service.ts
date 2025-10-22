/**
 * TIER 3.4: Analytics Service
 * 
 * Tracks user behavior and generates insights for documentation usage.
 * Provides views, exports, search analytics, and popular content identification.
 */

import { db } from '../db';
import { analyticsEvents, analyticsSummary, documentations } from '../../shared/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

export interface AnalyticsEventData {
  documentationId: number;
  eventType: 'view' | 'export' | 'search' | 'share';
  pageUrl?: string;
  sectionId?: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  metadata?: Record<string, any>;
}

export interface AnalyticsPeriod {
  start: Date;
  end: Date;
}

export interface AnalyticsReport {
  period: AnalyticsPeriod;
  totalViews: number;
  uniqueVisitors: number;
  totalExports: number;
  totalSearches: number;
  avgTimeOnPage?: number;
  popularPages: Array<{ url: string; views: number }>;
  popularSections: Array<{ section: string; views: number }>;
  topReferrers: Array<{ referrer: string; count: number }>;
  deviceBreakdown: {
    mobile: number;
    desktop: number;
    tablet: number;
  };
}

export class AnalyticsService {
  /**
   * Track an analytics event
   */
  async trackEvent(event: AnalyticsEventData): Promise<void> {
    if (!db) throw new Error('Database not initialized');

    await db.insert(analyticsEvents).values({
      documentation_id: event.documentationId,
      event_type: event.eventType,
      page_url: event.pageUrl,
      section_id: event.sectionId,
      user_id: event.userId,
      session_id: event.sessionId,
      ip_address: event.ipAddress,
      user_agent: event.userAgent,
      referrer: event.referrer,
      metadata: event.metadata,
    });
  }

  /**
   * Track a page view
   */
  async trackView(
    documentationId: number,
    pageUrl?: string,
    sessionId?: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    referrer?: string
  ): Promise<void> {
    await this.trackEvent({
      documentationId,
      eventType: 'view',
      pageUrl,
      sessionId,
      userId,
      ipAddress,
      userAgent,
      referrer,
    });
  }

  /**
   * Track an export
   */
  async trackExport(
    documentationId: number,
    format: string,
    userId?: string,
    sessionId?: string
  ): Promise<void> {
    await this.trackEvent({
      documentationId,
      eventType: 'export',
      userId,
      sessionId,
      metadata: { format },
    });
  }

  /**
   * Track a search
   */
  async trackSearch(
    documentationId: number,
    query: string,
    resultsCount: number,
    sessionId?: string,
    userId?: string
  ): Promise<void> {
    await this.trackEvent({
      documentationId,
      eventType: 'search',
      sessionId,
      userId,
      metadata: { query, resultsCount },
    });
  }

  /**
   * Generate analytics report for a period
   */
  async generateReport(
    documentationId: number,
    period: AnalyticsPeriod
  ): Promise<AnalyticsReport> {
    if (!db) throw new Error('Database not initialized');

    // Get all events in the period
    const events = await db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.documentation_id, documentationId),
          gte(analyticsEvents.created_at, period.start),
          lte(analyticsEvents.created_at, period.end)
        )
      );

    // Calculate metrics
    const views = events.filter(e => e.event_type === 'view');
    const exports = events.filter(e => e.event_type === 'export');
    const searches = events.filter(e => e.event_type === 'search');

    const uniqueVisitors = new Set(
      views
        .map(e => e.session_id || e.ip_address)
        .filter(Boolean)
    ).size;

    // Popular pages
    const pageViewCounts = new Map<string, number>();
    views.forEach(view => {
      if (view.page_url) {
        pageViewCounts.set(
          view.page_url,
          (pageViewCounts.get(view.page_url) || 0) + 1
        );
      }
    });
    const popularPages = Array.from(pageViewCounts.entries())
      .map(([url, views]) => ({ url, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // Popular sections
    const sectionViewCounts = new Map<string, number>();
    views.forEach(view => {
      if (view.section_id) {
        sectionViewCounts.set(
          view.section_id,
          (sectionViewCounts.get(view.section_id) || 0) + 1
        );
      }
    });
    const popularSections = Array.from(sectionViewCounts.entries())
      .map(([section, views]) => ({ section, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // Top referrers
    const referrerCounts = new Map<string, number>();
    views.forEach(view => {
      if (view.referrer) {
        referrerCounts.set(
          view.referrer,
          (referrerCounts.get(view.referrer) || 0) + 1
        );
      }
    });
    const topReferrers = Array.from(referrerCounts.entries())
      .map(([referrer, count]) => ({ referrer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Device breakdown
    const deviceBreakdown = {
      mobile: 0,
      desktop: 0,
      tablet: 0,
    };
    views.forEach(view => {
      if (view.user_agent) {
        const ua = view.user_agent.toLowerCase();
        if (ua.includes('mobile')) {
          deviceBreakdown.mobile++;
        } else if (ua.includes('tablet') || ua.includes('ipad')) {
          deviceBreakdown.tablet++;
        } else {
          deviceBreakdown.desktop++;
        }
      }
    });

    return {
      period,
      totalViews: views.length,
      uniqueVisitors,
      totalExports: exports.length,
      totalSearches: searches.length,
      popularPages,
      popularSections,
      topReferrers,
      deviceBreakdown,
    };
  }

  /**
   * Save analytics summary (for caching)
   */
  async saveSummary(
    documentationId: number,
    report: AnalyticsReport
  ): Promise<void> {
    if (!db) throw new Error('Database not initialized');

    await db.insert(analyticsSummary).values({
      documentation_id: documentationId,
      period_start: report.period.start,
      period_end: report.period.end,
      total_views: report.totalViews,
      unique_visitors: report.uniqueVisitors,
      total_exports: report.totalExports,
      total_searches: report.totalSearches,
      avg_time_on_page: report.avgTimeOnPage,
      popular_pages: report.popularPages,
      popular_sections: report.popularSections,
    });
  }

  /**
   * Get cached analytics summary
   */
  async getSummary(
    documentationId: number,
    period: AnalyticsPeriod
  ): Promise<AnalyticsReport | null> {
    if (!db) throw new Error('Database not initialized');

    const summary = await db
      .select()
      .from(analyticsSummary)
      .where(
        and(
          eq(analyticsSummary.documentation_id, documentationId),
          eq(analyticsSummary.period_start, period.start),
          eq(analyticsSummary.period_end, period.end)
        )
      )
      .limit(1);

    if (summary.length === 0) return null;

    const s = summary[0];
    return {
      period,
      totalViews: s.total_views,
      uniqueVisitors: s.unique_visitors,
      totalExports: s.total_exports,
      totalSearches: s.total_searches,
      avgTimeOnPage: s.avg_time_on_page || undefined,
      popularPages: (s.popular_pages as any) || [],
      popularSections: (s.popular_sections as any) || [],
      topReferrers: [],
      deviceBreakdown: { mobile: 0, desktop: 0, tablet: 0 },
    };
  }

  /**
   * Get real-time analytics (last 24 hours)
   */
  async getRealTimeStats(documentationId: number): Promise<{
    viewsLast24h: number;
    viewsLastHour: number;
    activeUsers: number;
    recentPages: Array<{ url: string; timestamp: Date }>;
  }> {
    if (!db) throw new Error('Database not initialized');

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
    const last5min = new Date(now.getTime() - 5 * 60 * 1000);

    const events = await db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.documentation_id, documentationId),
          eq(analyticsEvents.event_type, 'view'),
          gte(analyticsEvents.created_at, last24h)
        )
      )
      .orderBy(desc(analyticsEvents.created_at));

    const viewsLast24h = events.length;
    const viewsLastHour = events.filter(e => e.created_at >= lastHour).length;
    
    const activeUsers = new Set(
      events
        .filter(e => e.created_at >= last5min)
        .map(e => e.session_id || e.ip_address)
        .filter(Boolean)
    ).size;

    const recentPages = events
      .filter(e => e.page_url)
      .slice(0, 10)
      .map(e => ({
        url: e.page_url!,
        timestamp: e.created_at,
      }));

    return {
      viewsLast24h,
      viewsLastHour,
      activeUsers,
      recentPages,
    };
  }

  /**
   * Export analytics to CSV
   */
  exportToCSV(report: AnalyticsReport): string {
    const rows: string[] = [];
    
    // Header
    rows.push('Metric,Value');
    rows.push(`Total Views,${report.totalViews}`);
    rows.push(`Unique Visitors,${report.uniqueVisitors}`);
    rows.push(`Total Exports,${report.totalExports}`);
    rows.push(`Total Searches,${report.totalSearches}`);
    rows.push('');
    
    // Popular Pages
    rows.push('Popular Pages');
    rows.push('Page URL,Views');
    report.popularPages.forEach(page => {
      rows.push(`"${page.url}",${page.views}`);
    });
    rows.push('');
    
    // Device Breakdown
    rows.push('Device Breakdown');
    rows.push('Device Type,Count');
    rows.push(`Mobile,${report.deviceBreakdown.mobile}`);
    rows.push(`Desktop,${report.deviceBreakdown.desktop}`);
    rows.push(`Tablet,${report.deviceBreakdown.tablet}`);
    
    return rows.join('\n');
  }
}

export const analyticsService = new AnalyticsService();
