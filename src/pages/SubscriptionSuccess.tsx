import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';

export default function SubscriptionSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [plan, setPlan] = useState<string>('');

  useEffect(() => {
    const activateSubscription = async () => {
      const subscriptionId = searchParams.get('subscription_id');
      const baToken = searchParams.get('ba_token');
      const token = searchParams.get('token');

      const actualSubscriptionId = subscriptionId || baToken || token;

      if (!actualSubscriptionId) {
        toast({
          title: 'Error',
          description: 'Missing subscription information',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      try {
        // Get auth token
        const { data: sessionData } = await supabase.auth.getSession();
        const authToken = sessionData?.session?.access_token;

        if (!authToken) {
          throw new Error('Not authenticated');
        }

        // Activate subscription on backend
        const response = await fetch('/api/subscriptions/activate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            subscriptionId: actualSubscriptionId
          })
        });

        if (!response.ok) {
          throw new Error('Failed to activate subscription');
        }

        const data = await response.json();
        setPlan(data.plan);
        
        if (data.apiKey) {
          setApiKey(data.apiKey);
        }

        toast({
          title: 'Success!',
          description: `Welcome to ${data.plan.charAt(0).toUpperCase() + data.plan.slice(1)}! Your subscription is now active.`,
        });
      } catch (error) {
        console.error('Activation error:', error);
        toast({
          title: 'Error',
          description: 'Failed to activate subscription. Please contact support.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    activateSubscription();
  }, [searchParams, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <Card className="p-8 max-w-md text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-500" />
          <h2 className="text-2xl font-bold mb-2">Activating Subscription...</h2>
          <p className="text-gray-600">Please wait while we set up your account.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <Card className="p-8 max-w-md text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-4">Welcome Aboard!</h1>
        <p className="text-lg text-gray-700 mb-6">
          Your {plan.charAt(0).toUpperCase() + plan.slice(1)} subscription is now active.
        </p>

        {apiKey && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900">Your API Key</h3>
            </div>
            <code className="block bg-white px-3 py-2 rounded text-sm font-mono text-gray-800 break-all">
              {apiKey}
            </code>
            <p className="text-xs text-blue-700 mt-2">
              Save this key securely. You won't be able to see it again!
            </p>
          </div>
        )}

        <div className="space-y-3">
          <Button
            className="w-full"
            size="lg"
            onClick={() => navigate('/dashboard')}
          >
            Go to Dashboard
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate('/')}
          >
            Start Generating Docs
          </Button>
        </div>
      </Card>
    </div>
  );
}
