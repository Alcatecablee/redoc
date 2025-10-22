import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  className 
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      <div className="relative p-6 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 mb-6 group hover:scale-110 transition-transform duration-300">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[rgb(102,255,228)]/0 to-[rgb(102,255,228)]/0 group-hover:from-[rgb(102,255,228)]/10 group-hover:to-transparent transition-all"></div>
        <Icon className="h-12 w-12 text-white/60 group-hover:text-[rgb(102,255,228)] transition-colors relative z-10" strokeWidth={1.5} />
      </div>
      <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
      <p className="text-white/70 text-base max-w-md mb-8 leading-relaxed">{description}</p>
      {action && (
        <Button 
          onClick={action.onClick}
          className="bg-[rgb(102,255,228)] text-[rgb(14,19,23)] hover:bg-[rgb(102,255,228)]/90 font-bold h-12 px-8 shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
