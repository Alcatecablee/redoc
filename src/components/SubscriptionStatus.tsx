import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, Crown, Sparkles, Key, Copy, Check, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';

interface SubscriptionStatusProps {
  userEmail: string;
}

export default function SubscriptionStatus({ userEmail }: SubscriptionStatusProps) {
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchSubscriptionStatus();
  }, [userEmail]);

  const fetchSubscriptionStatus = async () => {
    try {
      // Get auth token
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/subscriptions/status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setSubscription(data);
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyApiKey = async () => {
    if (subscription?.api_key) {
      await navigator.clipboard.writeText(subscription.api_key);
      setCopied(true);
      toast({
        title: 'API Key Copied',
        description: 'Your API key has been copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will revert to the Free plan.')) {
      return;
    }

    try {
      // Get auth token
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        toast({
          title: 'Not Authenticated',
          description: 'Please sign in to cancel your subscription.',
          variant: 'destructive',
        });
        return;
      }

      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      toast({
        title: 'Subscription Cancelled',
        description: 'Your subscription has been cancelled. You can resubscribe anytime.',
      });

      // Refresh status
      fetchSubscriptionStatus();
    } catch (error) {
      console.error('Cancel error:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel subscription. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading subscription status...</div>
        </CardContent>
      </Card>
    );
  }

  const plan = subscription?.plan || 'free';
  const generationCount = subscription?.generation_count || 0;
  const subscriptionStatus = subscription?.subscription_status;

  const getPlanIcon = () => {
    switch (plan) {
      case 'enterprise':
        return <Crown className="h-6 w-6 text-purple-500" />;
      case 'pro':
        return <Zap className="h-6 w-6 text-blue-500" />;
      default:
        return <Sparkles className="h-6 w-6 text-gray-500" />;
    }
  };

  const getPlanColor = () => {
    switch (plan) {
      case 'enterprise':
        return 'bg-purple-500';
      case 'pro':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPlanName = () => {
    return plan.charAt(0).toUpperCase() + plan.slice(1);
  };

  const getUsageInfo = () => {
    switch (plan) {
      case 'free':
        return {
          limit: 1,
          current: generationCount,
          text: `${generationCount}/1 document this month`,
        };
      case 'pro':
      case 'enterprise':
        return {
          limit: null,
          current: generationCount,
          text: `${generationCount} documents generated`,
        };
    }
  };

  const usageInfo = getUsageInfo();
  const isLimitReached = usageInfo.limit && usageInfo.current >= usageInfo.limit;

  return (
    <Card className={`border-2 ${plan !== 'free' ? 'border-blue-500/20' : ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getPlanIcon()}
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Subscription Plan
                <Badge className={getPlanColor()}>{getPlanName()}</Badge>
              </CardTitle>
              <CardDescription>
                {plan === 'free' && 'Start generating amazing documentation'}
                {plan === 'pro' && 'Unlimited docs with deep research'}
                {plan === 'enterprise' && 'Full API access and premium features'}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Usage Stats */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Usage this month</span>
            <span className="font-medium">{usageInfo.text}</span>
          </div>
          
          {usageInfo.limit && (
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  isLimitReached ? 'bg-red-500' : getPlanColor()
                }`}
                style={{ width: `${Math.min((usageInfo.current / usageInfo.limit) * 100, 100)}%` }}
              />
            </div>
          )}

          {isLimitReached && (
            <div className="flex items-center gap-2 text-sm text-orange-600">
              <AlertTriangle className="h-4 w-4" />
              <span>Monthly limit reached. Upgrade for unlimited generations!</span>
            </div>
          )}
        </div>

        {/* Plan Features */}
        <div className="space-y-2 pt-2 border-t">
          <h4 className="text-sm font-semibold">Your Plan Includes:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            {plan === 'free' && (
              <>
                <li>• 1 documentation per month</li>
                <li>• Basic research (5 SO + 5 GitHub)</li>
                <li>• PDF export only</li>
              </>
            )}
            {plan === 'pro' && (
              <>
                <li>• Unlimited documentation</li>
                <li>• Deep research (20 SO + 15 GitHub)</li>
                <li>• All export formats</li>
                <li>• Subdomain hosting</li>
              </>
            )}
            {plan === 'enterprise' && (
              <>
                <li>• Everything in Pro</li>
                <li>• API access with authentication</li>
                <li>• Custom AI voices</li>
                <li>• Priority support</li>
              </>
            )}
          </ul>
        </div>

        {/* API Key for Enterprise */}
        {plan === 'enterprise' && subscription?.api_key && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-purple-500" />
              <h4 className="text-sm font-semibold">API Key</h4>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-gray-100 rounded text-xs font-mono overflow-hidden text-ellipsis">
                {subscription.api_key}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={copyApiKey}
                className="gap-1"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use this key to authenticate API requests. Keep it secure!
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {plan === 'free' && (
            <Button
              onClick={() => navigate('/pricing')}
              className="flex-1 gap-2"
            >
              <Zap className="h-4 w-4" />
              Upgrade to Pro ($19/mo)
            </Button>
          )}
          {plan === 'pro' && (
            <>
              <Button
                onClick={() => navigate('/pricing')}
                variant="outline"
                className="flex-1 gap-2"
              >
                <Crown className="h-4 w-4" />
                Upgrade to Enterprise
              </Button>
              <Button
                onClick={handleCancelSubscription}
                variant="destructive"
                size="sm"
              >
                Cancel Plan
              </Button>
            </>
          )}
          {plan === 'enterprise' && subscriptionStatus === 'active' && (
            <Button
              onClick={handleCancelSubscription}
              variant="outline"
              className="flex-1"
            >
              Cancel Subscription
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
