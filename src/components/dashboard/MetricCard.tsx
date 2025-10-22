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
      ? (trend.isPositive ? 'text-[rgb(102,255,228)]' : 'text-red-400')
      : (trend.value > 0 ? 'text-[rgb(102,255,228)]' : trend.value < 0 ? 'text-red-400' : 'text-gray-400')
    : undefined;

  return (
    <Card 
      className={cn(
        'group relative bg-gradient-to-br from-white/10 to-white/5 border border-white/20 hover:border-[rgb(102,255,228)]/50 backdrop-blur-sm transition-all duration-500 hover:shadow-[0_15px_40px_rgba(102,255,228,0.15)] hover:scale-105',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[rgb(102,255,228)]/0 to-[rgb(102,255,228)]/0 group-hover:from-[rgb(102,255,228)]/5 group-hover:to-transparent transition-all duration-400"></div>
      
      {/* Decorative corner accent */}
      <div className="absolute top-0 right-0 w-16 h-16 border-t border-r border-white/10 group-hover:border-[rgb(102,255,228)]/30 rounded-tr-lg transition-colors"></div>
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
        <CardTitle className="text-sm font-semibold text-white/70 uppercase tracking-wide">
          {title}
        </CardTitle>
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[rgb(102,255,228)]/20 to-[rgb(102,255,228)]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Icon className="h-5 w-5 text-[rgb(102,255,228)]" strokeWidth={1.5} />
          </div>
        )}
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="text-3xl md:text-4xl font-bold text-white mb-2 group-hover:text-[rgb(102,255,228)] transition-colors">
          {value}
        </div>
        {(subtitle || trend) && (
          <div className="flex items-center gap-2 mt-2">
            {trend && TrendIcon && (
              <div className={cn('flex items-center text-xs font-semibold', trendColor)}>
                <TrendIcon className="h-3 w-3 mr-1" />
                <span>{Math.abs(trend.value)}%</span>
                {trend.label && <span className="ml-1 text-white/60 font-normal">{trend.label}</span>}
              </div>
            )}
            {subtitle && !trend && (
              <p className="text-sm text-white/60">{subtitle}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
