import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRevenueMetrics, useDashboardOverview, useTeamOverview } from '@/hooks/use-dashboard';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ChartContainer } from '@/components/dashboard/ChartContainer';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  TrendingUp,
  TrendingDown,
  Users, 
  FileText, 
  Eye,
  Download,
  BarChart3,
  Calendar,
  CreditCard,
  Shield,
  Globe,
  Settings
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area,
  BarChart, 
  Bar, 
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts';

const PLAN_COLORS = {
  free: '#94a3b8',
  pro: '#3b82f6',
  enterprise: '#8b5cf6'
};

export default function EnterpriseDashboard() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  
  const { data: overview, isLoading: overviewLoading } = useDashboardOverview();
  const { data: revenue, isLoading: revenueLoading, error: revenueError } = useRevenueMetrics();
  const { data: team, isLoading: teamLoading } = useTeamOverview();

  const isEnterprise = overview?.user.plan === 'enterprise';

  if (overviewLoading || revenueLoading || teamLoading) {
    return (
      <DashboardLayout title="Enterprise Insights" description="Loading executive analytics...">
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

  if (!isEnterprise) {
    return (
      <DashboardLayout title="Enterprise Insights" description="Executive analytics and reporting">
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={Shield}
              title="Enterprise Plan Required"
              description="Upgrade to Enterprise to access executive dashboards, revenue analytics, and advanced reporting features."
              action={{
                label: 'View Enterprise Plans',
                onClick: () => navigate('/pricing')
              }}
            />
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (revenueError || !revenue) {
    return (
      <DashboardLayout title="Enterprise Insights" description="Executive analytics">
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={BarChart3}
              title="Unable to load revenue data"
              description="There was an error loading revenue metrics. Please try again."
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

  const planDistributionData = [
    { name: 'Free', value: revenue.planDistribution.free, color: PLAN_COLORS.free },
    { name: 'Pro', value: revenue.planDistribution.pro, color: PLAN_COLORS.pro },
    { name: 'Enterprise', value: revenue.planDistribution.enterprise, color: PLAN_COLORS.enterprise },
  ].filter(plan => plan.value > 0);

  const totalCustomers = revenue.planDistribution.free + revenue.planDistribution.pro + revenue.planDistribution.enterprise;

  return (
    <DashboardLayout
      title="Enterprise Insights"
      description="Executive dashboard and business analytics"
      backLink="/dashboard"
      actions={
        <>
          <Button variant="outline" onClick={() => navigate('/settings')} className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
          <Button variant="default" onClick={() => navigate('/team')} className="gap-2">
            <Users className="h-4 w-4" />
            Team
          </Button>
        </>
      }
    >
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Executive KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Monthly Recurring Revenue"
              value={`$${revenue.overview.mrr.toLocaleString()}`}
              subtitle="MRR"
              icon={DollarSign}
              trend={{
                value: 12.5,
                isPositive: true,
                label: 'vs last month'
              }}
            />
            <MetricCard
              title="Active Subscriptions"
              value={revenue.overview.activeSubscriptions}
              subtitle={`${totalCustomers} total customers`}
              icon={Users}
            />
            <MetricCard
              title="Total Revenue"
              value={`$${revenue.overview.totalRevenue.toLocaleString()}`}
              subtitle="All time"
              icon={TrendingUp}
            />
            <MetricCard
              title="Churn Rate"
              value={`${revenue.overview.churnRate.toFixed(1)}%`}
              subtitle="Monthly"
              icon={TrendingDown}
              className={revenue.overview.churnRate > 5 ? 'border-yellow-500' : ''}
            />
          </div>

          {/* Revenue Trend */}
          {revenue.revenueTrend.length > 0 && (
            <ChartContainer 
              title="Revenue Trend" 
              description="Monthly recurring revenue and subscription growth"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenue.revenueTrend}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSubs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    className="text-xs"
                  />
                  <YAxis yAxisId="left" className="text-xs" />
                  <YAxis yAxisId="right" orientation="right" className="text-xs" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    formatter={(value: any, name: string) => {
                      if (name === 'Revenue') return `$${value.toLocaleString()}`;
                      return value;
                    }}
                  />
                  <Legend />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#10b981" 
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                    name="Revenue"
                  />
                  <Area 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="subscriptions" 
                    stroke="#3b82f6" 
                    fillOpacity={1} 
                    fill="url(#colorSubs)" 
                    name="Subscriptions"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}

          {/* Plan Distribution */}
          {planDistributionData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ChartContainer 
                title="Customer Distribution" 
                description="Breakdown by subscription plan"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={planDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {planDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>

              <Card>
                <CardHeader>
                  <CardTitle>Plan Breakdown</CardTitle>
                  <CardDescription>Detailed subscription metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {planDistributionData.map((plan) => {
                      const percentage = (plan.value / totalCustomers * 100).toFixed(1);
                      return (
                        <div key={plan.name}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div 
                                className="h-3 w-3 rounded-full" 
                                style={{ backgroundColor: plan.color }}
                              />
                              <span className="font-medium">{plan.name}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {plan.value} ({percentage}%)
                            </span>
                          </div>
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full transition-all" 
                              style={{ 
                                width: `${percentage}%`,
                                backgroundColor: plan.color 
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title="MRR"
              value={`$${revenue.overview.mrr.toLocaleString()}`}
              subtitle="Monthly Recurring Revenue"
              icon={DollarSign}
            />
            <MetricCard
              title="ARR"
              value={`$${(revenue.overview.mrr * 12).toLocaleString()}`}
              subtitle="Annual Recurring Revenue"
              icon={Calendar}
            />
            <MetricCard
              title="Avg Revenue per User"
              value={`$${(revenue.overview.mrr / Math.max(revenue.overview.activeSubscriptions, 1)).toFixed(2)}`}
              subtitle="ARPU"
              icon={Users}
            />
          </div>

          {/* Recent Payments */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Payments</CardTitle>
                  <CardDescription>Latest subscription transactions</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/billing')}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {revenue.recentPayments.length === 0 ? (
                <EmptyState
                  icon={CreditCard}
                  title="No payments yet"
                  description="Payment transactions will appear here"
                />
              ) : (
                <div className="space-y-3">
                  {revenue.recentPayments.slice(0, 10).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-green-500/10">
                          <DollarSign className="h-4 w-4 text-green-500" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {payment.currency.toUpperCase()} {payment.amount}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {payment.plan} plan
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={payment.status === 'succeeded' ? 'default' : 'secondary'}
                          className="mb-1"
                        >
                          {payment.status}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {overview && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricCard
                  title="Total Documents"
                  value={overview.stats.totalDocs}
                  subtitle="Platform-wide"
                  icon={FileText}
                />
                <MetricCard
                  title="Total Views"
                  value={overview.stats.totalViews.toLocaleString()}
                  subtitle="All time"
                  icon={Eye}
                />
                <MetricCard
                  title="Total Exports"
                  value={overview.stats.totalExports.toLocaleString()}
                  subtitle="Downloads"
                  icon={Download}
                />
                <MetricCard
                  title="Docs This Month"
                  value={overview.stats.docsThisMonth}
                  subtitle="Generation activity"
                  icon={TrendingUp}
                />
              </div>

              {overview.usageTrend.length > 0 && (
                <ChartContainer 
                  title="Platform Activity" 
                  description="Documentation generation, views, and exports"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={overview.usageTrend}>
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
                      <Legend />
                      <Line type="monotone" dataKey="generations" stroke="#3b82f6" strokeWidth={2} name="Generations" />
                      <Line type="monotone" dataKey="views" stroke="#10b981" strokeWidth={2} name="Views" />
                      <Line type="monotone" dataKey="exports" stroke="#f59e0b" strokeWidth={2} name="Exports" />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title="Total Customers"
              value={totalCustomers}
              subtitle="All plans"
              icon={Users}
            />
            <MetricCard
              title="Paying Customers"
              value={revenue.planDistribution.pro + revenue.planDistribution.enterprise}
              subtitle={`${revenue.planDistribution.pro} Pro, ${revenue.planDistribution.enterprise} Enterprise`}
              icon={CreditCard}
            />
            <MetricCard
              title="Free Users"
              value={revenue.planDistribution.free}
              subtitle="Conversion opportunity"
              icon={TrendingUp}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Enterprise Features</CardTitle>
              <CardDescription>Advanced capabilities for your organization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <Button 
                  variant="outline" 
                  className="justify-start h-auto p-4"
                  onClick={() => navigate('/settings')}
                >
                  <Globe className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Custom Domains</div>
                    <div className="text-sm text-muted-foreground">
                      Configure white-label domains for your documentation
                    </div>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  className="justify-start h-auto p-4"
                  onClick={() => navigate('/settings')}
                >
                  <Shield className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">White-Label Branding</div>
                    <div className="text-sm text-muted-foreground">
                      Customize colors, logos, and branding
                    </div>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  className="justify-start h-auto p-4"
                  onClick={() => navigate('/team')}
                >
                  <Users className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Team Management</div>
                    <div className="text-sm text-muted-foreground">
                      Manage members, roles, and permissions
                    </div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
