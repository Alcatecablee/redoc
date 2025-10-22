import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface UpgradePromptProps {
  title: string;
  description: string;
  features?: string[];
  ctaText?: string;
  className?: string;
  variant?: 'default' | 'compact';
}

export function UpgradePrompt({ 
  title, 
  description, 
  features, 
  ctaText = 'Upgrade Now',
  className,
  variant = 'default'
}: UpgradePromptProps) {
  const navigate = useNavigate();

  if (variant === 'compact') {
    return (
      <Card className={cn(
        'relative overflow-hidden bg-gradient-to-br from-[rgb(102,255,228)]/15 to-[rgb(102,255,228)]/5 border-2 border-[rgb(102,255,228)]/40',
        className
      )}>
        <div className="absolute inset-0 bg-gradient-to-r from-[rgb(102,255,228)]/10 via-transparent to-[rgb(102,255,228)]/10"></div>
        
        <CardContent className="p-5 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[rgb(102,255,228)]/30 to-[rgb(102,255,228)]/15 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-[rgb(102,255,228)]" />
            </div>
            <div>
              <p className="font-bold text-white mb-0.5">{title}</p>
              <p className="text-sm text-white/70">{description}</p>
            </div>
          </div>
          <Button 
            size="sm" 
            onClick={() => navigate('/pricing')}
            className="bg-[rgb(102,255,228)] text-[rgb(14,19,23)] hover:bg-[rgb(102,255,228)]/90 font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            {ctaText}
            <ArrowUpRight className="ml-1.5 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      'relative overflow-hidden bg-gradient-to-br from-[rgb(102,255,228)]/15 to-[rgb(102,255,228)]/5 border-2 border-[rgb(102,255,228)]/40 shadow-[0_20px_50px_rgba(102,255,228,0.2)]',
      className
    )}>
      <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-l-2 border-[rgb(102,255,228)]/60 rounded-tl-lg"></div>
      <div className="absolute bottom-0 right-0 w-20 h-20 border-b-2 border-r-2 border-[rgb(102,255,228)]/60 rounded-br-lg"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-[rgb(102,255,228)]/10 via-transparent to-[rgb(102,255,228)]/5"></div>
      
      <CardHeader className="relative z-10">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-[rgb(102,255,228)]/30 to-[rgb(102,255,228)]/15 shadow-lg">
            <Sparkles className="h-7 w-7 text-[rgb(102,255,228)]" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-2xl text-white mb-2">{title}</CardTitle>
            <CardDescription className="text-white/80 text-base">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 relative z-10">
        {features && features.length > 0 && (
          <ul className="space-y-3">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center gap-3 text-sm text-white/90">
                <div className="w-2 h-2 rounded-full bg-[rgb(102,255,228)] shadow-lg shadow-[rgb(102,255,228)]/50" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        )}
        <Button 
          className="w-full bg-[rgb(102,255,228)] text-[rgb(14,19,23)] hover:bg-[rgb(102,255,228)]/90 font-bold text-base h-12 shadow-xl hover:shadow-2xl hover:scale-105 transition-all" 
          onClick={() => navigate('/pricing')}
        >
          {ctaText}
          <ArrowUpRight className="ml-2 h-5 w-5" />
        </Button>
      </CardContent>
    </Card>
  );
}
