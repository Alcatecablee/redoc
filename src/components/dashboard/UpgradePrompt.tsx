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
      <Card className={cn('border-primary/20 bg-primary/5', className)}>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">{title}</p>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          <Button size="sm" onClick={() => navigate('/pricing')}>
            {ctaText}
            <ArrowUpRight className="ml-1 h-3 w-3" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5', className)}>
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {features && features.length > 0 && (
          <ul className="space-y-2">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        )}
        <Button className="w-full" onClick={() => navigate('/pricing')}>
          {ctaText}
          <ArrowUpRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
