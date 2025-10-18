import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, Loader2, Clock } from 'lucide-react';

interface PipelineStage {
  id: number;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'partial';
  progress: number;
  itemsProcessed?: number;
  itemsTotal?: number;
  warnings?: string[];
  error?: string;
}

interface PipelineMonitorProps {
  sessionId?: string;
  stages: PipelineStage[];
  overallQuality?: number;
  sourcesUsed?: number;
  sourcesMissing?: string[];
}

export function PipelineMonitor({ 
  sessionId, 
  stages, 
  overallQuality = 0,
  sourcesUsed = 0,
  sourcesMissing = []
}: PipelineMonitorProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'partial':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'in_progress':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      completed: 'default',
      failed: 'destructive',
      partial: 'secondary',
      in_progress: 'outline',
      pending: 'outline',
    };
    
    return (
      <Badge variant={variants[status] || 'outline'}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Pipeline Status</span>
          {overallQuality > 0 && (
            <Badge variant={overallQuality >= 85 ? 'default' : 'secondary'}>
              Quality: {overallQuality}/100
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Real-time documentation generation progress
          {sessionId && <span className="ml-2 text-xs opacity-60">Session: {sessionId.slice(0, 8)}</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {stages.map((stage) => (
          <div key={stage.id} className="space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                {getStatusIcon(stage.status)}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-sm">{stage.name}</h4>
                    {getStatusBadge(stage.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">{stage.description}</p>
                  
                  {stage.itemsTotal && (
                    <p className="text-xs mt-1">
                      {stage.itemsProcessed}/{stage.itemsTotal} items
                      {stage.itemsTotal && stage.itemsTotal > 0 && ' processed'}
                    </p>
                  )}
                  
                  {stage.warnings && stage.warnings.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {stage.warnings.map((warning, i) => (
                        <p key={i} className="text-xs text-yellow-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {warning}
                        </p>
                      ))}
                    </div>
                  )}
                  
                  {stage.error && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <XCircle className="h-3 w-3" />
                      {stage.error}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {stage.status === 'in_progress' && (
              <Progress value={stage.progress} className="h-2" />
            )}
          </div>
        ))}
        
        {sourcesUsed !== undefined && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium">Sources Used: {sourcesUsed || 0}</p>
            {sourcesMissing.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Missing: {sourcesMissing.join(', ')}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
