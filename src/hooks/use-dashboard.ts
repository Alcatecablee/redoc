import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

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

export function useDashboardOverview(): UseQueryResult<DashboardOverview> {
  return useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: async () => {
      const data = await apiRequest('/api/dashboard/overview');
      return data as DashboardOverview;
    },
    staleTime: 2 * 60 * 1000,
    refetchOnMount: true,
  });
}

export function useDocumentAnalytics(
  docId: number | null,
  days: number = 30
): UseQueryResult<DocumentAnalytics> {
  return useQuery({
    queryKey: ['dashboard', 'analytics', docId, days],
    queryFn: async () => {
      if (!docId) throw new Error('Document ID required');
      const data = await apiRequest(`/api/dashboard/analytics/${docId}?days=${days}`);
      return data as DocumentAnalytics;
    },
    enabled: !!docId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTeamOverview(): UseQueryResult<TeamOverview> {
  return useQuery({
    queryKey: ['dashboard', 'team'],
    queryFn: async () => {
      const data = await apiRequest('/api/dashboard/team');
      return data as TeamOverview;
    },
    staleTime: 2 * 60 * 1000,
    refetchOnMount: true,
  });
}

export function useIntegrationHealth(): UseQueryResult<IntegrationHealth> {
  return useQuery({
    queryKey: ['dashboard', 'integrations'],
    queryFn: async () => {
      const data = await apiRequest('/api/dashboard/integrations');
      return data as IntegrationHealth;
    },
    staleTime: 1 * 60 * 1000,
    refetchOnMount: true,
  });
}

export function useRevenueMetrics(): UseQueryResult<RevenueMetrics> {
  return useQuery({
    queryKey: ['dashboard', 'revenue'],
    queryFn: async () => {
      const data = await apiRequest('/api/dashboard/revenue');
      return data as RevenueMetrics;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnMount: true,
  });
}
