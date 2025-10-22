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
    <div className="relative min-h-screen bg-gradient-to-b from-[rgb(14,19,23)] via-[rgb(24,29,37)] to-[rgb(34,38,46)]">
      <div className="absolute inset-0 bg-grid-white/[0.02]" />
      <div className={cn('relative container mx-auto px-4 pt-24 pb-8 text-white', className)}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {backLink && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(backLink)}
                className="gap-2 text-white hover:bg-white/10 border border-white/10 rounded-full"
              >
                <ArrowLeft className="h-4 w-4" />
                {backLabel}
              </Button>
            )}
            <div>
              <h1 className="text-3xl font-bold text-white">{title}</h1>
              {description && (
                <p className="text-white/70 mt-1">{description}</p>
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
    </div>
  );
}
