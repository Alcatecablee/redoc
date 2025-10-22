import { db } from '../db';
import { 
  users, 
  documentations, 
  analyticsEvents, 
  analyticsSummary,
  paymentHistory,
  subscriptionEvents,
  apiKeys,
  webhooks,
  supportTickets,
  activityLogs,
  organizations,
  organizationMembers
} from '../../shared/schema';
import { eq, and, gte, lte, desc, sql, count } from 'drizzle-orm';
import { LRUCache } from 'lru-cache';

function ensureDb() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

const CACHE_TTL = 5 * 60 * 1000;
const dashboardCache = new LRUCache<string, any>({
  max: 500,
  ttl: CACHE_TTL,
});

export interface DashboardOverview {
  user: {
    id: number;
    email: string;
    name: string | null;
    plan: string;
    subscription_status: string | null;
    created_at: Date;
  };
  stats: {
    totalDocs: number;
    totalViews: number;
    totalExports: number;
    docsThisMonth: number;
    generationQuota: {
      used: number;
      limit: number;
      resetDate: Date;
    };
  };
  recentDocs: Array<{
    id: number;
    title: string;
    url: string;
    views: number;
    exports: number;
    generatedAt: Date;
  }>;
  usageTrend: Array<{
    date: string;
    generations: number;
    views: number;
    exports: number;
  }>;
}

export interface DocumentAnalytics {
  documentId: number;
  title: string;
  url: string;
  overview: {
    totalViews: number;
    uniqueVisitors: number;
    totalExports: number;
    totalSearches: number;
    avgTimeOnPage: number | null;
  };
  timeSeries: Array<{
    date: string;
    views: number;
    exports: number;
    searches: number;
  }>;
  popularPages: Array<{ url: string; views: number }>;
  popularSections: Array<{ section: string; views: number }>;
  deviceBreakdown: {
    mobile: number;
    desktop: number;
    tablet: number;
  };
  topReferrers: Array<{ referrer: string; count: number }>;
}

export interface TeamOverview {
  organization: {
    id: number;
    name: string;
    plan: string;
    memberCount: number;
  };
  teamStats: {
    totalDocs: number;
    totalViews: number;
    activeMembers: number;
    docsThisMonth: number;
  };
  topContributors: Array<{
    userId: number;
    email: string;
    name: string | null;
    docsCreated: number;
    lastActive: Date | null;
  }>;
  recentActivity: Array<{
    id: number;
    action: string;
    userEmail: string;
    resourceType: string;
    createdAt: Date;
  }>;
}

export interface IntegrationHealth {
  apiKeys: Array<{
    id: number;
    name: string;
    keyPrefix: string;
    usageCount: number;
    lastUsed: Date | null;
    rateLimitPerMinute: number;
    isActive: boolean;
  }>;
  webhooks: Array<{
    id: number;
    url: string;
    events: string[];
    isActive: boolean;
    lastTriggered: Date | null;
    failureCount: number;
  }>;
  health: {
    totalApiCalls: number;
    activeWebhooks: number;
    failedWebhooks: number;
    avgResponseTime: number | null;
  };
}

export interface RevenueMetrics {
  overview: {
    mrr: number;
    activeSubscriptions: number;
    totalRevenue: number;
    churnRate: number;
  };
  recentPayments: Array<{
    id: number;
    amount: string;
    currency: string;
    status: string;
    plan: string;
    createdAt: Date;
  }>;
  revenueTrend: Array<{
    month: string;
    revenue: number;
    subscriptions: number;
  }>;
  planDistribution: {
    free: number;
    pro: number;
    enterprise: number;
  };
}

export class DashboardService {
  static async getUserOverview(userId: number): Promise<DashboardOverview> {
    const cacheKey = `user-overview-${userId}`;
    const cached = dashboardCache.get(cacheKey);
    if (cached) return cached;

    const database = ensureDb();
    const user = await database.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user[0]) throw new Error('User not found');

    const totalDocsResult = await database
      .select({ count: count() })
      .from(documentations)
      .where(eq(documentations.user_id, userId));
    
    const totalDocs = totalDocsResult[0]?.count || 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const docsThisMonthResult = await database
      .select({ count: count() })
      .from(documentations)
      .where(
        and(
          eq(documentations.user_id, userId),
          gte(documentations.generatedAt, thirtyDaysAgo)
        )
      );
    
    const docsThisMonth = docsThisMonthResult[0]?.count || 0;

    const userDocs = await database
      .select({ id: documentations.id })
      .from(documentations)
      .where(eq(documentations.user_id, userId));
    
    const docIds = userDocs.map(d => d.id);

    let totalViews = 0;
    let totalExports = 0;

    if (docIds.length > 0) {
      const viewsResult = await database
        .select({ count: count() })
        .from(analyticsEvents)
        .where(
          and(
            sql`${analyticsEvents.documentation_id} = ANY(${docIds})`,
            eq(analyticsEvents.event_type, 'view')
          )
        );
      
      const exportsResult = await database
        .select({ count: count() })
        .from(analyticsEvents)
        .where(
          and(
            sql`${analyticsEvents.documentation_id} = ANY(${docIds})`,
            eq(analyticsEvents.event_type, 'export')
          )
        );

      totalViews = viewsResult[0]?.count || 0;
      totalExports = exportsResult[0]?.count || 0;
    }

    const quotaLimit = user[0].plan === 'free' ? 3 : user[0].plan === 'pro' ? 50 : 999999;
    const resetDate = new Date(user[0].last_reset_at);
    resetDate.setMonth(resetDate.getMonth() + 1);

    const recentDocs = await database
      .select()
      .from(documentations)
      .where(eq(documentations.user_id, userId))
      .orderBy(desc(documentations.generatedAt))
      .limit(10);

    const recentDocsWithStats = await Promise.all(
      recentDocs.map(async (doc) => {
        const viewsResult = await database
          .select({ count: count() })
          .from(analyticsEvents)
          .where(
            and(
              eq(analyticsEvents.documentation_id, doc.id),
              eq(analyticsEvents.event_type, 'view')
            )
          );

        const exportsResult = await database
          .select({ count: count() })
          .from(analyticsEvents)
          .where(
            and(
              eq(analyticsEvents.documentation_id, doc.id),
              eq(analyticsEvents.event_type, 'export')
            )
          );

        return {
          id: doc.id,
          title: doc.title,
          url: doc.url,
          views: viewsResult[0]?.count || 0,
          exports: exportsResult[0]?.count || 0,
          generatedAt: doc.generatedAt,
        };
      })
    );

    const usageTrendData: Array<{
      date: string;
      generations: number;
      views: number;
      exports: number;
    }> = [];
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const generationsResult = await database
        .select({ count: count() })
        .from(documentations)
        .where(
          and(
            eq(documentations.user_id, userId),
            gte(documentations.generatedAt, dayStart),
            lte(documentations.generatedAt, dayEnd)
          )
        );

      const viewsResult = await database
        .select({ count: count() })
        .from(analyticsEvents)
        .where(
          and(
            sql`${analyticsEvents.documentation_id} = ANY(${docIds.length > 0 ? docIds : [-1]})`,
            eq(analyticsEvents.event_type, 'view'),
            gte(analyticsEvents.created_at, dayStart),
            lte(analyticsEvents.created_at, dayEnd)
          )
        );

      const exportsResult = await database
        .select({ count: count() })
        .from(analyticsEvents)
        .where(
          and(
            sql`${analyticsEvents.documentation_id} = ANY(${docIds.length > 0 ? docIds : [-1]})`,
            eq(analyticsEvents.event_type, 'export'),
            gte(analyticsEvents.created_at, dayStart),
            lte(analyticsEvents.created_at, dayEnd)
          )
        );

      usageTrendData.push({
        date: dateStr,
        generations: generationsResult[0]?.count || 0,
        views: viewsResult[0]?.count || 0,
        exports: exportsResult[0]?.count || 0,
      });
    }

    const result: DashboardOverview = {
      user: {
        id: user[0].id,
        email: user[0].email,
        name: user[0].name,
        plan: user[0].plan,
        subscription_status: user[0].subscription_status,
        created_at: user[0].created_at,
      },
      stats: {
        totalDocs,
        totalViews,
        totalExports,
        docsThisMonth,
        generationQuota: {
          used: user[0].generation_count,
          limit: quotaLimit,
          resetDate,
        },
      },
      recentDocs: recentDocsWithStats,
      usageTrend: usageTrendData,
    };

    dashboardCache.set(cacheKey, result);
    return result;
  }

  static async getDocumentAnalytics(
    docId: number,
    startDate: Date,
    endDate: Date
  ): Promise<DocumentAnalytics> {
    const cacheKey = `doc-analytics-${docId}-${startDate.getTime()}-${endDate.getTime()}`;
    const cached = dashboardCache.get(cacheKey);
    if (cached) return cached;

    const database = ensureDb();
    const doc = await database.select().from(documentations).where(eq(documentations.id, docId)).limit(1);
    if (!doc[0]) throw new Error('Documentation not found');

    const events = await database
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.documentation_id, docId),
          gte(analyticsEvents.created_at, startDate),
          lte(analyticsEvents.created_at, endDate)
        )
      );

    const views = events.filter(e => e.event_type === 'view');
    const exports = events.filter(e => e.event_type === 'export');
    const searches = events.filter(e => e.event_type === 'search');

    const uniqueVisitors = new Set(
      views.map(e => e.session_id || e.ip_address).filter(Boolean)
    ).size;

    const pageViewCounts = new Map<string, number>();
    views.forEach(view => {
      if (view.page_url) {
        pageViewCounts.set(view.page_url, (pageViewCounts.get(view.page_url) || 0) + 1);
      }
    });

    const popularPages = Array.from(pageViewCounts.entries())
      .map(([url, views]) => ({ url, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    const sectionViewCounts = new Map<string, number>();
    views.forEach(view => {
      if (view.section_id) {
        sectionViewCounts.set(view.section_id, (sectionViewCounts.get(view.section_id) || 0) + 1);
      }
    });

    const popularSections = Array.from(sectionViewCounts.entries())
      .map(([section, views]) => ({ section, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    const referrerCounts = new Map<string, number>();
    views.forEach(view => {
      if (view.referrer) {
        referrerCounts.set(view.referrer, (referrerCounts.get(view.referrer) || 0) + 1);
      }
    });

    const topReferrers = Array.from(referrerCounts.entries())
      .map(([referrer, count]) => ({ referrer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const deviceBreakdown = { mobile: 0, desktop: 0, tablet: 0 };
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

    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const timeSeriesData: Array<{
      date: string;
      views: number;
      exports: number;
      searches: number;
    }> = [];
    
    for (let i = 0; i < daysDiff; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayViews = views.filter(e => {
        const eventDate = new Date(e.created_at);
        return eventDate >= dayStart && eventDate <= dayEnd;
      }).length;

      const dayExports = exports.filter(e => {
        const eventDate = new Date(e.created_at);
        return eventDate >= dayStart && eventDate <= dayEnd;
      }).length;

      const daySearches = searches.filter(e => {
        const eventDate = new Date(e.created_at);
        return eventDate >= dayStart && eventDate <= dayEnd;
      }).length;

      timeSeriesData.push({
        date: dateStr,
        views: dayViews,
        exports: dayExports,
        searches: daySearches,
      });
    }

    const result: DocumentAnalytics = {
      documentId: docId,
      title: doc[0].title,
      url: doc[0].url,
      overview: {
        totalViews: views.length,
        uniqueVisitors,
        totalExports: exports.length,
        totalSearches: searches.length,
        avgTimeOnPage: null,
      },
      timeSeries: timeSeriesData,
      popularPages,
      popularSections,
      deviceBreakdown,
      topReferrers,
    };

    dashboardCache.set(cacheKey, result);
    return result;
  }

  static async getTeamOverview(organizationId: number): Promise<TeamOverview> {
    const cacheKey = `team-overview-${organizationId}`;
    const cached = dashboardCache.get(cacheKey);
    if (cached) return cached;

    const database = ensureDb();
    const org = await database.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
    if (!org[0]) throw new Error('Organization not found');

    const members = await database
      .select({
        userId: organizationMembers.user_id,
        email: users.email,
        name: users.name,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.user_id, users.id))
      .where(eq(organizationMembers.organization_id, organizationId));

    const memberIds = members.map(m => m.user_id);

    const totalDocsResult = await db
      .select({ count: count() })
      .from(documentations)
      .where(sql`${documentations.user_id} = ANY(${memberIds.length > 0 ? memberIds : [-1]})`);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const docsThisMonthResult = await db
      .select({ count: count() })
      .from(documentations)
      .where(
        and(
          sql`${documentations.user_id} = ANY(${memberIds.length > 0 ? memberIds : [-1]})`,
          gte(documentations.generatedAt, thirtyDaysAgo)
        )
      );

    const topContributors = await Promise.all(
      members.map(async (member) => {
        const docsResult = await db
          .select({ count: count() })
          .from(documentations)
          .where(eq(documentations.user_id, member.user_id));

        const lastActivityResult = await db
          .select({ createdAt: activityLogs.created_at })
          .from(activityLogs)
          .where(eq(activityLogs.user_id, member.user_id))
          .orderBy(desc(activityLogs.created_at))
          .limit(1);

        return {
          userId: member.user_id,
          email: member.email,
          name: member.name,
          docsCreated: docsResult[0]?.count || 0,
          lastActive: lastActivityResult[0]?.createdAt || null,
        };
      })
    );

    topContributors.sort((a, b) => b.docsCreated - a.docsCreated);

    const recentActivity = await db
      .select({
        id: activityLogs.id,
        action: activityLogs.action,
        userId: activityLogs.user_id,
        resourceType: activityLogs.resource_type,
        createdAt: activityLogs.created_at,
      })
      .from(activityLogs)
      .where(eq(activityLogs.organization_id, organizationId))
      .orderBy(desc(activityLogs.created_at))
      .limit(20);

    const activityWithUsers = await Promise.all(
      recentActivity.map(async (activity) => {
        if (!activity.user_id) {
          return {
            id: activity.id,
            action: activity.action,
            userEmail: 'System',
            resourceType: activity.resourceType,
            createdAt: activity.createdAt,
          };
        }

        const user = await db
          .select({ email: users.email })
          .from(users)
          .where(eq(users.id, activity.user_id))
          .limit(1);

        return {
          id: activity.id,
          action: activity.action,
          userEmail: user[0]?.email || 'Unknown',
          resourceType: activity.resourceType,
          createdAt: activity.createdAt,
        };
      })
    );

    const result: TeamOverview = {
      organization: {
        id: org[0].id,
        name: org[0].name,
        plan: org[0].plan,
        memberCount: members.length,
      },
      teamStats: {
        totalDocs: totalDocsResult[0]?.count || 0,
        totalViews: 0,
        activeMembers: members.length,
        docsThisMonth: docsThisMonthResult[0]?.count || 0,
      },
      topContributors: topContributors.slice(0, 10),
      recentActivity: activityWithUsers,
    };

    dashboardCache.set(cacheKey, result);
    return result;
  }

  static async getIntegrationHealth(userId: number): Promise<IntegrationHealth> {
    const cacheKey = `integration-health-${userId}`;
    const cached = dashboardCache.get(cacheKey);
    if (cached) return cached;

    const userApiKeys = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.user_id, userId))
      .orderBy(desc(apiKeys.created_at));

    const userWebhooks = await db
      .select()
      .from(webhooks)
      .where(eq(webhooks.user_id, userId))
      .orderBy(desc(webhooks.created_at));

    const totalApiCalls = userApiKeys.reduce((sum, key) => sum + key.usage_count, 0);
    const activeWebhooksCount = userWebhooks.filter(w => w.is_active).length;
    const failedWebhooksCount = userWebhooks.filter(w => w.failure_count > 0).length;

    const result: IntegrationHealth = {
      apiKeys: userApiKeys.map(key => ({
        id: key.id,
        name: key.name,
        keyPrefix: key.key_prefix,
        usageCount: key.usage_count,
        lastUsed: key.last_used_at,
        rateLimitPerMinute: key.rate_limit_per_minute,
        isActive: key.is_active,
      })),
      webhooks: userWebhooks.map(webhook => ({
        id: webhook.id,
        url: webhook.url,
        events: (webhook.events as string[]) || [],
        isActive: webhook.is_active,
        lastTriggered: webhook.last_triggered_at,
        failureCount: webhook.failure_count,
      })),
      health: {
        totalApiCalls,
        activeWebhooks: activeWebhooksCount,
        failedWebhooks: failedWebhooksCount,
        avgResponseTime: null,
      },
    };

    dashboardCache.set(cacheKey, result);
    return result;
  }

  static async getRevenueMetrics(): Promise<RevenueMetrics> {
    const cacheKey = 'revenue-metrics-global';
    const cached = dashboardCache.get(cacheKey);
    if (cached) return cached;

    const activeSubsResult = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.subscription_status, 'active'));

    const totalRevenueResult = await db
      .select({ total: sql<number>`COALESCE(SUM(CAST(${paymentHistory.amount} AS DECIMAL)), 0)` })
      .from(paymentHistory)
      .where(eq(paymentHistory.status, 'completed'));

    const recentPayments = await db
      .select()
      .from(paymentHistory)
      .orderBy(desc(paymentHistory.created_at))
      .limit(10);

    const planDistResult = await db
      .select({
        plan: users.plan,
        count: count(),
      })
      .from(users)
      .groupBy(users.plan);

    const planDistribution = {
      free: 0,
      pro: 0,
      enterprise: 0,
    };

    planDistResult.forEach(row => {
      if (row.plan === 'free') planDistribution.free = row.count;
      if (row.plan === 'pro') planDistribution.pro = row.count;
      if (row.plan === 'enterprise') planDistribution.enterprise = row.count;
    });

    const result: RevenueMetrics = {
      overview: {
        mrr: 0,
        activeSubscriptions: activeSubsResult[0]?.count || 0,
        totalRevenue: Number(totalRevenueResult[0]?.total || 0),
        churnRate: 0,
      },
      recentPayments: recentPayments.map(p => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        plan: p.plan,
        createdAt: p.created_at,
      })),
      revenueTrend: [],
      planDistribution,
    };

    dashboardCache.set(cacheKey, result);
    return result;
  }

  static clearCache(key?: string) {
    if (key) {
      dashboardCache.delete(key);
    } else {
      dashboardCache.clear();
    }
  }
}
