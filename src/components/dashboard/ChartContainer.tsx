import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ChartContainerProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

export function ChartContainer({ 
  title, 
  description, 
  children, 
  className,
  actions 
}: ChartContainerProps) {
  return (
    <Card className={cn(
      'group w-full relative bg-gradient-to-br from-white/10 to-white/5 border border-white/20 hover:border-[rgb(102,255,228)]/40 backdrop-blur-sm transition-all duration-500 hover:shadow-[0_20px_50px_rgba(102,255,228,0.1)]',
      className
    )}>
      {/* Decorative top border */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[rgb(102,255,228)]/30 to-transparent"></div>
      
      <CardHeader className="relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-white mb-1">{title}</CardTitle>
            {description && (
              <CardDescription className="text-white/60">{description}</CardDescription>
            )}
          </div>
          {actions && (
            <div className="flex gap-2">
              {actions}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="w-full h-[300px] rounded-lg bg-white/5 p-4 border border-white/10">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
