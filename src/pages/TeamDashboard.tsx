import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeamOverview, useIntegrationHealth } from '@/hooks/use-dashboard';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ChartContainer } from '@/components/dashboard/ChartContainer';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  FileText, 
  TrendingUp, 
  Eye,
  Key,
  Webhook,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Activity
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function TeamDashboard() {
  const navigate = useNavigate();
  const { data: team, isLoading: teamLoading, error: teamError } = useTeamOverview();
  const { data: integrations, isLoading: integrationsLoading } = useIntegrationHealth();

  if (teamLoading) {
    return (
      <DashboardLayout title="Team Dashboard" description="Loading team analytics...">
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

  if (teamError || !team) {
    return (
      <DashboardLayout title="Team Dashboard" description="Manage your organization">
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={Users}
              title="No organization found"
              description="You need to be part of an organization to access team features. Create or join an organization to get started."
              action={{
                label: 'Go to Dashboard',
                onClick: () => navigate('/dashboard')
              }}
            />
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const contributorData = team.topContributors.map(c => ({
    name: c.name || c.email.split('@')[0],
    docs: c.docsCreated
  }));

  return (
    <DashboardLayout
      title={`${team.organization.name} Team Dashboard`}
      description="Team collaboration and analytics"
      backLink="/dashboard"
      actions={
        <Button variant="outline" onClick={() => navigate('/team')}>
          Manage Team
        </Button>
      }
    >
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Organization Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{team.organization.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Badge>{team.organization.plan.toUpperCase()}</Badge>
                    <span className="text-xs">{team.organization.memberCount} members</span>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Team Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Team Members"
              value={team.teamStats.activeMembers}
              subtitle="Active collaborators"
              icon={Users}
            />
            <MetricCard
              title="Total Documents"
              value={team.teamStats.totalDocs}
              subtitle={`${team.teamStats.docsThisMonth} this month`}
              icon={FileText}
            />
            <MetricCard
              title="Total Views"
              value={team.teamStats.totalViews.toLocaleString()}
              subtitle="Across all docs"
              icon={Eye}
            />
            <MetricCard
              title="Avg per Member"
              value={team.teamStats.activeMembers > 0 
                ? Math.round(team.teamStats.totalDocs / team.teamStats.activeMembers)
                : 0}
              subtitle="Docs per person"
              icon={TrendingUp}
            />
          </div>

          {/* Top Contributors */}
          {contributorData.length > 0 && (
            <ChartContainer
              title="Top Contributors"
              description="Documentation generated by team members"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={contributorData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar dataKey="docs" fill="#3b82f6" name="Documents" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </TabsContent>

        <TabsContent value="members" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Manage your organization members and their contributions</CardDescription>
            </CardHeader>
            <CardContent>
              {team.topContributors.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No team members"
                  description="Invite team members to start collaborating on documentation"
                  action={{
                    label: 'Invite Members',
                    onClick: () => navigate('/team')
                  }}
                />
              ) : (
                <div className="space-y-4">
                  {team.topContributors.map((member) => (
                    <div key={member.userId} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-sm font-bold text-white">
                          {(member.name || member.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{member.name || member.email}</div>
                          <div className="text-sm text-muted-foreground">{member.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold">{member.docsCreated}</div>
                          <div className="text-xs text-muted-foreground">Docs</div>
                        </div>
                        {member.lastActive && (
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(member.lastActive).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          {integrationsLoading ? (
            <Card className="animate-pulse">
              <CardHeader>
                <div className="h-6 w-48 bg-muted rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-muted rounded" />
              </CardContent>
            </Card>
          ) : integrations ? (
            <>
              {/* Integration Health Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                  title="API Calls"
                  value={integrations.health.totalApiCalls.toLocaleString()}
                  subtitle="Total usage"
                  icon={Key}
                />
                <MetricCard
                  title="Active Webhooks"
                  value={integrations.health.activeWebhooks}
                  subtitle={`${integrations.health.failedWebhooks} failed`}
                  icon={Webhook}
                  className={integrations.health.failedWebhooks > 0 ? 'border-yellow-500' : ''}
                />
                <MetricCard
                  title="API Keys"
                  value={integrations.apiKeys.filter(k => k.isActive).length}
                  subtitle={`${integrations.apiKeys.length} total`}
                  icon={Key}
                />
              </div>

              {/* API Keys */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>API Keys</CardTitle>
                      <CardDescription>Manage your API keys and monitor usage</CardDescription>
                    </div>
                    <Button onClick={() => navigate('/settings')}>Manage Keys</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {integrations.apiKeys.length === 0 ? (
                    <EmptyState
                      icon={Key}
                      title="No API keys"
                      description="Create API keys to integrate with your applications"
                      action={{
                        label: 'Create API Key',
                        onClick: () => navigate('/settings')
                      }}
                    />
                  ) : (
                    <div className="space-y-3">
                      {integrations.apiKeys.slice(0, 5).map((key) => (
                        <div key={key.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-3">
                            {key.isActive ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            <div>
                              <div className="font-medium">{key.name}</div>
                              <div className="text-xs text-muted-foreground">{key.keyPrefix}...</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Usage:</span>{' '}
                              <span className="font-medium">{key.usageCount.toLocaleString()}</span>
                            </div>
                            {key.lastUsed && (
                              <div className="text-muted-foreground">
                                Last used: {new Date(key.lastUsed).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Webhooks */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Webhooks</CardTitle>
                      <CardDescription>Monitor webhook delivery and status</CardDescription>
                    </div>
                    <Button onClick={() => navigate('/settings')}>Manage Webhooks</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {integrations.webhooks.length === 0 ? (
                    <EmptyState
                      icon={Webhook}
                      title="No webhooks"
                      description="Configure webhooks to receive real-time event notifications"
                      action={{
                        label: 'Create Webhook',
                        onClick: () => navigate('/settings')
                      }}
                    />
                  ) : (
                    <div className="space-y-3">
                      {integrations.webhooks.map((webhook) => (
                        <div key={webhook.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-3">
                            {webhook.isActive ? (
                              webhook.failureCount > 5 ? (
                                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              )
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            <div>
                              <div className="font-medium truncate max-w-xs">{webhook.url}</div>
                              <div className="text-xs text-muted-foreground">
                                {webhook.events.join(', ')}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            {webhook.failureCount > 0 && (
                              <Badge variant="destructive">{webhook.failureCount} failures</Badge>
                            )}
                            {webhook.lastTriggered && (
                              <div className="text-muted-foreground">
                                Last: {new Date(webhook.lastTriggered).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12">
                <EmptyState
                  icon={Key}
                  title="Unable to load integrations"
                  description="There was an error loading integration data"
                  action={{
                    label: 'Retry',
                    onClick: () => window.location.reload()
                  }}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Team member actions and changes</CardDescription>
            </CardHeader>
            <CardContent>
              {team.recentActivity.length === 0 ? (
                <EmptyState
                  icon={Activity}
                  title="No recent activity"
                  description="Team activity will appear here as members use the platform"
                />
              ) : (
                <div className="space-y-3">
                  {team.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg border">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Activity className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{activity.userEmail}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(activity.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <span className="capitalize">{activity.action}</span>{' '}
                          <Badge variant="outline" className="ml-1">{activity.resourceType}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
