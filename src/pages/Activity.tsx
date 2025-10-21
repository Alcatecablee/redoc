import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function Activity() {
  const [activities, setActivities] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const { toast } = useToast();

  const fetchActivity = async () => {
    try {
      const res = await fetch('/api/activity?limit=50');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setActivities(data.activities || []);
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: err.message || 'Failed to load activity', variant: 'destructive' });
    }
  };

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/activity/metrics');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setMetrics(data.metrics || {});
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: err.message || 'Failed to load metrics', variant: 'destructive' });
    }
  };

  useEffect(() => { fetchActivity(); fetchMetrics(); }, []);

  return (
    <div className="container mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-4">
            <h3 className="text-lg font-bold">Recent Activity</h3>
            <div className="mt-4 space-y-3">
              {activities.length === 0 && <p className="text-sm text-gray-500">No recent activity</p>}
              {activities.map(a => (
                <div key={a.id} className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{a.action}</div>
                    <div className="text-xs text-gray-500">{a.resource_type} {a.resource_id}</div>
                  </div>
                  <div className="text-xs text-gray-400">{new Date(a.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="p-4">
            <h3 className="text-lg font-bold">Metrics</h3>
            <div className="mt-4">
              {!metrics && <p className="text-sm text-gray-500">No metrics</p>}
              {metrics?.recentActions && (
                <ul className="space-y-2">
                  {metrics.recentActions.map((r: any, idx: number) => (
                    <li key={idx} className="flex items-center justify-between">
                      <span className="text-sm">{r.action}</span>
                      <span className="text-sm font-semibold">{r.cnt}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
