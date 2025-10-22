import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useDashboardOverview, useDocumentAnalytics } from '@/hooks/use-dashboard';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ChartContainer } from '@/components/dashboard/ChartContainer';
import { UpgradePrompt } from '@/components/dashboard/UpgradePrompt';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Eye, 
  Download, 
  Plus, 
  TrendingUp,
  Clock,
  Zap,
  BarChart3,
  Users,
  Globe,
  Trash2,
  LogIn
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { apiRequest, apiRequestBlob } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function DashboardNew() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const { data: overview, isLoading, error } = useDashboardOverview();
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const { data: analytics } = useDocumentAnalytics(selectedDocId);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data?.session) {
      setIsAuthenticated(false);
    } else {
      setIsAuthenticated(true);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  // Show auth check loading state
  if (isAuthenticated === null) {
    return (
      <DashboardLayout title="Dashboard" description="Loading...">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  // Redirect if not authenticated
  if (isAuthenticated === false) {
    return (
      <DashboardLayout title="Dashboard" description="Authentication required">
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={LogIn}
              title="Please sign in"
              description="You need to be signed in to access the dashboard. Sign in to view your analytics and documentation."
              action={{
                label: 'Go to Home',
                onClick: () => navigate('/')
              }}
            />
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const downloadBlob = async (path: string, filename: string) => {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data?.session?.access_token) {
        toast({ title: 'Sign in required', description: 'Please sign in to download files' });
        navigate('/');
        return;
      }

      const blob = await apiRequestBlob(path);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: 'Download started', description: filename });
    } catch (err: any) {
      console.error('Download failed', err);
      toast({ title: 'Download failed', description: err?.message || 'Failed to download file', variant: 'destructive' });
    }
  };

  const deleteDoc = async (id: number) => {
    if (!confirm('Delete this documentation? This cannot be undone.')) return;
    try {
      await apiRequest(`/api/documentations/${id}`, { method: 'DELETE' });
      toast({ title: 'Deleted', description: 'Documentation deleted' });
      window.location.reload();
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e.message || String(e), variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Dashboard" description="Loading your analytics...">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 w-24 bg-muted rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </DashboardLayout>
    );
  }

  if (error || !overview) {
    return (
      <DashboardLayout title="Dashboard" description="Your documentation analytics">
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={BarChart3}
              title="Unable to load dashboard"
              description="There was an error loading your dashboard data. Please try again."
              action={{
                label: 'Retry',
                onClick: () => window.location.reload()
              }}
            />
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const quotaPercentage = (overview.stats.generationQuota.used / overview.stats.generationQuota.limit) * 100;
  const isNearQuota = quotaPercentage >= 80;
  const isAtQuota = quotaPercentage >= 100;

  const deviceData = analytics?.deviceBreakdown 
    ? [
        { name: 'Desktop', value: analytics.deviceBreakdown.desktop, color: '#3b82f6' },
        { name: 'Mobile', value: analytics.deviceBreakdown.mobile, color: '#10b981' },
        { name: 'Tablet', value: analytics.deviceBreakdown.tablet, color: '#f59e0b' },
      ]
    : [];

  return (
    <DashboardLayout
      title="Dashboard"
      description={`Welcome back, ${overview.user.name || overview.user.email.split('@')[0]}`}
      backLink="/"
      backLabel="Home"
      actions={
        <>
          <Button variant="default" onClick={() => navigate('/')} className="gap-2 px-5 py-2 text-xs font-bold text-[rgb(14,19,23)] bg-[rgb(102,255,228)] hover:bg-white rounded-full uppercase tracking-widest">
            <Plus className="h-4 w-4" />
            New Doc
          </Button>
          <Button variant="outline" onClick={signOut}>
            Sign Out
          </Button>
        </>
      }
    >
      <div className="grid gap-6">
        {/* Account & Plan Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-2xl font-bold text-white">
                  {(overview.user.name || overview.user.email)[0].toUpperCase()}
                </div>
                <div>
                  <CardTitle>{overview.user.email}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Badge variant={overview.user.plan === 'enterprise' ? 'default' : overview.user.plan === 'pro' ? 'secondary' : 'outline'}>
                      {overview.user.plan.toUpperCase()}
                    </Badge>
                    {overview.user.subscription_status && (
                      <span className="text-xs">
                        Status: <span className="font-medium capitalize">{overview.user.subscription_status}</span>
                      </span>
                    )}
                  </CardDescription>
                </div>
              </div>
              {overview.user.plan === 'free' && (
                <Button onClick={() => navigate('/pricing')} variant="default" className="gap-2">
                  <Zap className="h-4 w-4" />
                  Upgrade
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Documents"
            value={overview.stats.totalDocs}
            subtitle={`${overview.stats.docsThisMonth} this month`}
            icon={FileText}
          />
          <MetricCard
            title="Total Views"
            value={overview.stats.totalViews.toLocaleString()}
            subtitle="Across all docs"
            icon={Eye}
          />
          <MetricCard
            title="Total Exports"
            value={overview.stats.totalExports.toLocaleString()}
            subtitle="All time"
            icon={Download}
          />
          <MetricCard
            title="Generation Quota"
            value={`${overview.stats.generationQuota.used}/${overview.stats.generationQuota.limit}`}
            subtitle={isAtQuota ? 'Limit reached' : isNearQuota ? 'Nearly full' : 'Available'}
            icon={Zap}
            className={isNearQuota ? 'border-yellow-500' : isAtQuota ? 'border-red-500' : ''}
            onClick={() => isNearQuota && navigate('/pricing')}
          />
        </div>

        {/* Usage Limit Warning */}
        {isNearQuota && overview.user.plan === 'free' && (
          <UpgradePrompt
            title={isAtQuota ? "You've reached your generation limit" : "You're running low on generations"}
            description={isAtQuota 
              ? "Upgrade to Pro or Enterprise to generate unlimited documentation"
              : `You've used ${overview.stats.generationQuota.used} of ${overview.stats.generationQuota.limit} free generations. Upgrade for unlimited access.`}
            features={[
              'Unlimited documentation generation',
              'Advanced analytics and insights',
              'Priority support',
              'API access (Enterprise only)'
            ]}
            variant="compact"
          />
        )}

        {/* Usage Trend Chart */}
        {overview.usageTrend.length > 0 && (
          <ChartContainer 
            title="30-Day Activity" 
            description="Your generation, views, and export activity over the last month"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={overview.usageTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Area type="monotone" dataKey="generations" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Generations" />
                <Area type="monotone" dataKey="views" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Views" />
                <Area type="monotone" dataKey="exports" stackId="3" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} name="Exports" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}

        {/* Recent Documents */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Documentation</CardTitle>
            <CardDescription>Your latest generated documents with performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            {overview.recentDocs.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No documents yet"
                description="Generate your first documentation to see it here"
                action={{
                  label: 'Generate Documentation',
                  onClick: () => navigate('/')
                }}
              />
            ) : (
              <div className="space-y-4">
                {overview.recentDocs.map((doc) => (
                  <div key={doc.id} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{doc.title}</h3>
                        <p className="text-sm text-muted-foreground truncate">{doc.url}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {doc.views} views
                          </span>
                          <span className="flex items-center gap-1">
                            <Download className="h-3 w-3" />
                            {doc.exports} exports
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(doc.generatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedDocId(doc.id === selectedDocId ? null : doc.id)}
                        className="gap-2"
                      >
                        <BarChart3 className="h-4 w-4" />
                        {selectedDocId === doc.id ? 'Hide' : 'Analytics'}
                      </Button>
                    </div>

                    {/* Document Actions */}
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="default" size="sm" onClick={() => navigate(`/dashboard?doc=${doc.id}`)}>
                        View
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => downloadBlob(`/api/export/pdf/${doc.id}`, `${doc.title.replace(/[^a-z0-9]/gi, '_')}.pdf`)}>
                        PDF
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => downloadBlob(`/api/export/docx/${doc.id}`, `${doc.title.replace(/[^a-z0-9]/gi, '_')}.docx`)}>
                        DOCX
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteDoc(doc.id)} className="text-destructive ml-auto">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Inline Analytics */}
                    {selectedDocId === doc.id && analytics && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold">{analytics.overview.totalViews}</div>
                            <div className="text-xs text-muted-foreground">Total Views</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold">{analytics.overview.uniqueVisitors}</div>
                            <div className="text-xs text-muted-foreground">Unique Visitors</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold">{analytics.overview.totalExports}</div>
                            <div className="text-xs text-muted-foreground">Exports</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold">{analytics.overview.totalSearches}</div>
                            <div className="text-xs text-muted-foreground">Searches</div>
                          </div>
                        </div>

                        {deviceData.length > 0 && deviceData.some(d => d.value > 0) && (
                          <div className="h-48">
                            <h4 className="text-sm font-medium mb-2">Device Breakdown</h4>
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={deviceData}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                  outerRadius={60}
                                  fill="#8884d8"
                                  dataKey="value"
                                >
                                  {deviceData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        )}

                        {analytics.popularPages.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">Top Pages</h4>
                            <div className="space-y-2">
                              {analytics.popularPages.slice(0, 5).map((page, idx) => (
                                <div key={idx} className="flex items-center justify-between text-sm">
                                  <span className="truncate flex-1">{page.url}</span>
                                  <Badge variant="secondary">{page.views} views</Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upgrade Prompt for Free Users */}
        {overview.user.plan === 'free' && overview.stats.totalDocs >= 2 && (
          <UpgradePrompt
            title="You're building momentum! 🚀"
            description="Unlock unlimited potential with Pro or Enterprise"
            features={[
              'Generate unlimited documentation',
              'Advanced analytics and insights',
              'Team collaboration features',
              'Priority support and faster generation',
              'API access (Enterprise only)'
            ]}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
