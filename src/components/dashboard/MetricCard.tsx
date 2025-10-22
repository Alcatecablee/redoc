import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive?: boolean;
    label?: string;
  };
  className?: string;
  onClick?: () => void;
}

export function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  className, 
  onClick 
}: MetricCardProps) {
  const TrendIcon = trend 
    ? (trend.value > 0 ? TrendingUp : trend.value < 0 ? TrendingDown : Minus)
    : null;

  const trendColor = trend
    ? trend.isPositive !== undefined
      ? (trend.isPositive ? 'text-green-500' : 'text-red-500')
      : (trend.value > 0 ? 'text-green-500' : trend.value < 0 ? 'text-red-500' : 'text-gray-500')
    : undefined;

  return (
    <Card 
      className={cn(
        'hover:shadow-lg transition-shadow',
        onClick && 'cursor-pointer hover:border-primary/50',
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <Icon className="h-4 w-4 text-muted-foreground" />
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(subtitle || trend) && (
          <div className="flex items-center gap-2 mt-1">
            {trend && TrendIcon && (
              <div className={cn('flex items-center text-xs font-medium', trendColor)}>
                <TrendIcon className="h-3 w-3 mr-1" />
                <span>{Math.abs(trend.value)}%</span>
                {trend.label && <span className="ml-1 text-muted-foreground">{trend.label}</span>}
              </div>
            )}
            {subtitle && !trend && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
