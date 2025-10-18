import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ArrowRight, Zap, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UpgradePromptProps {
  message: string;
  plan?: string;
  generationCount?: number;
  variant?: 'default' | 'warning';
}

export default function UpgradePrompt({ 
  message, 
  plan = 'free', 
  generationCount,
  variant = 'warning'
}: UpgradePromptProps) {
  const navigate = useNavigate();

  const suggestedPlan = plan === 'free' ? 'Pro' : 'Enterprise';
  const suggestedPrice = plan === 'free' ? '$19/mo' : '$99/mo';

  return (
    <Alert className={variant === 'warning' ? 'border-orange-500 bg-orange-50' : 'border-blue-500 bg-blue-50'}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {variant === 'warning' ? (
            <AlertTriangle className="h-6 w-6 text-orange-600" />
          ) : (
            <Zap className="h-6 w-6 text-blue-600" />
          )}
        </div>
        
        <div className="flex-1">
          <AlertTitle className="text-lg font-semibold mb-2">
            {variant === 'warning' ? 'Tier Limit Reached' : 'Upgrade for More'}
          </AlertTitle>
          <AlertDescription className="text-gray-700 mb-4">
            {message}
            
            {generationCount !== undefined && (
              <div className="mt-2 text-sm">
                <span className="font-medium">Current usage:</span> {generationCount} documentation
                {generationCount !== 1 ? 's' : ''} generated this month
              </div>
            )}
          </AlertDescription>
          
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => navigate('/pricing')}
              className="gap-2"
            >
              Upgrade to {suggestedPlan} ({suggestedPrice})
              <ArrowRight className="h-4 w-4" />
            </Button>
            
            {plan === 'free' && (
              <p className="text-sm text-gray-600">
                Get unlimited generations + deep research
              </p>
            )}
          </div>
        </div>
      </div>
    </Alert>
  );
}
