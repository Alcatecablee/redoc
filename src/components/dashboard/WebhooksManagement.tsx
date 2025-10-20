import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Webhook, Plus, Trash2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

const AVAILABLE_EVENTS = [
  { value: 'documentation.created', label: 'Documentation Created' },
  { value: 'documentation.updated', label: 'Documentation Updated' },
  { value: 'documentation.deleted', label: 'Documentation Deleted' },
  { value: 'export.completed', label: 'Export Completed' },
];

export default function WebhooksManagement() {
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['documentation.created']);
  const { toast } = useToast();

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/api/webhooks');
      setWebhooks(data.webhooks || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load webhooks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createWebhook = async (url: string) => {
    try {
      await apiRequest('/api/webhooks', {
        method: 'POST',
        body: JSON.stringify({ url, events: selectedEvents }),
      });

      await loadWebhooks();

      toast({
        title: 'Webhook Created',
        description: 'Your webhook has been created successfully.',
      });

      setIsCreateDialogOpen(false);
      setSelectedEvents(['documentation.created']);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create webhook',
        variant: 'destructive',
      });
    }
  };

  const deleteWebhook = async (webhookId: number) => {
    if (!confirm('Are you sure you want to delete this webhook?')) {
      return;
    }

    try {
      await apiRequest(`/api/webhooks/${webhookId}`, {
        method: 'DELETE',
      });

      await loadWebhooks();

      toast({
        title: 'Webhook Deleted',
        description: 'The webhook has been deleted successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete webhook',
        variant: 'destructive',
      });
    }
  };

  const toggleEvent = (event: string) => {
    if (selectedEvents.includes(event)) {
      setSelectedEvents(selectedEvents.filter((e) => e !== event));
    } else {
      setSelectedEvents([...selectedEvents, event]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Webhooks
            </CardTitle>
            <CardDescription>Receive real-time notifications for events</CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Webhook
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Webhook</DialogTitle>
                <DialogDescription>
                  Set up a webhook to receive HTTP POST requests when events occur
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  await createWebhook(formData.get('url') as string);
                }}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="url">Webhook URL</Label>
                  <Input
                    id="url"
                    name="url"
                    type="url"
                    placeholder="https://your-domain.com/webhooks"
                    required
                  />
                </div>
                <div>
                  <Label>Events to Subscribe</Label>
                  <div className="space-y-2 mt-2">
                    {AVAILABLE_EVENTS.map((event) => (
                      <div key={event.value} className="flex items-center gap-2">
                        <Checkbox
                          id={event.value}
                          checked={selectedEvents.includes(event.value)}
                          onCheckedChange={() => toggleEvent(event.value)}
                        />
                        <label htmlFor={event.value} className="text-sm cursor-pointer">
                          {event.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={selectedEvents.length === 0}>
                  Create Webhook
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading webhooks...</div>
        ) : webhooks.length === 0 ? (
          <div className="text-center py-8">
            <Webhook className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">No webhooks configured yet</p>
            <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Webhook
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {webhooks.map((webhook) => (
              <div
                key={webhook.id}
                className="p-4 rounded-lg bg-[#0b0f17]/60 border border-white/6 hover:border-white/20 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <code className="text-sm bg-white/5 px-2 py-1 rounded">{webhook.url}</code>
                      {webhook.is_active ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-500">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-500/10 text-red-500">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      {(typeof webhook.events === 'string'
                        ? JSON.parse(webhook.events)
                        : webhook.events
                      ).map((event: string) => (
                        <Badge key={event} variant="secondary" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Created: {new Date(webhook.created_at).toLocaleDateString()}</span>
                      {webhook.last_triggered_at && (
                        <span>
                          Last triggered: {new Date(webhook.last_triggered_at).toLocaleDateString()}
                        </span>
                      )}
                      {webhook.failure_count > 0 && (
                        <span className="flex items-center gap-1 text-yellow-500">
                          <AlertCircle className="h-3 w-3" />
                          {webhook.failure_count} failures
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteWebhook(webhook.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
