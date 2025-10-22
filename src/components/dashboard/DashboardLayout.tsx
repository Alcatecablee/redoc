import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  backLink?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function DashboardLayout({
  children,
  title,
  description,
  backLink,
  backLabel = 'Back',
  actions,
  className
}: DashboardLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className={cn('container mx-auto px-4 pt-24 pb-8', className)}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          {backLink && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate(backLink)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold">{title}</h1>
            {description && (
              <p className="text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
