import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, Crown, Sparkles, DollarSign, ClipboardList, Bolt, Palette } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import CustomPricingForm from '@/components/CustomPricingForm';

interface PricingTier {
  name: string;
  price: number;
  interval: string;
  icon: React.ReactNode;
  popular?: boolean;
  features: string[];
  planId?: string;
  buttonText: string;
  buttonVariant: 'default' | 'outline' | 'secondary';
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Free',
    price: 0,
    interval: 'forever',
    icon: <Sparkles className="w-6 h-6" />,
    features: [
      '1 documentation per month',
      'Basic research depth',
      'PDF export only',
      '8-12 sections',
      'Community support'
    ],
    buttonText: 'Get Started Free',
    buttonVariant: 'outline'
  },
  {
    name: 'Pro',
    price: 19,
    interval: 'month',
    icon: <Zap className="w-6 h-6" />,
    popular: true,
    planId: 'pro',
    features: [
      'Unlimited documentation',
      'Deep research (20 SO + 15 GitHub)',
      'All export formats',
      'Up to 20 sections',
      'Subdomain hosting',
      'Email support'
    ],
    buttonText: 'Upgrade to Pro',
    buttonVariant: 'default'
  },
  {
    name: 'Enterprise',
    price: 99,
    interval: 'month',
    icon: <Crown className="w-6 h-6" />,
    planId: 'enterprise',
    features: [
      'Everything in Pro',
      'API access',
      'Custom AI voices',
      'Hosted help centers',
      'Priority support',
      'Custom branding',
      'White-label options'
    ],
    buttonText: 'Upgrade to Enterprise',
    buttonVariant: 'secondary'
  }
];

export default function SubscriptionPricing() {
  const [loading, setLoading] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
    };
    checkAuth();
  }, []);

  const handleSubscribe = async (tier: PricingTier) => {
    if (!tier.planId) {
      toast({
        title: 'Already on Free Plan',
        description: 'You can start generating documentation right away!',
      });
      navigate('/');
      return;
    }

    if (!user) {
      toast({
        title: 'Sign In Required',
        description: 'Please sign in to subscribe to a plan.',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }

    setLoading(tier.planId);

    try {
      // Get auth token
      const { data: sessionData } = await supabase.auth.getSession();
      const authToken = sessionData?.session?.access_token;

      if (!authToken) {
        throw new Error('Not authenticated');
      }

      // Create subscription via backend
      const response = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          plan: tier.planId,
          returnUrl: `${window.location.origin}/subscription/success`,
          cancelUrl: `${window.location.origin}/pricing`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create subscription');
      }

      const data = await response.json();

      // Redirect to PayPal approval page
      if (data.approvalUrl) {
        window.location.href = data.approvalUrl;
      } else {
        throw new Error('No approval URL received');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast({
        title: 'Error',
        description: 'Failed to start subscription. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="pt-24 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold mb-4 text-[rgb(36,77,91)]">
              Choose Your Plan
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Start free and scale as you grow. All plans include our AI-powered documentation generator.
            </p>
          </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {pricingTiers.map((tier) => (
            <Card
              key={tier.name}
              className={`relative p-8 ${
                tier.popular
                  ? 'border-2 border-[rgb(36,77,91)] shadow-xl scale-105'
                  : 'border border-gray-200'
              }`}
            >
              {tier.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[rgb(36,77,91)]">
                  Most Popular
                </Badge>
              )}

              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[rgb(142,209,198)] text-[rgb(36,77,91)] mb-4">
                  {tier.icon}
                </div>
                <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold">${tier.price}</span>
                  <span className="text-gray-600">/{tier.interval}</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[rgb(142,209,198)] flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={tier.buttonVariant}
                onClick={() => handleSubscribe(tier)}
                disabled={loading !== null}
              >
                {loading === tier.planId ? 'Processing...' : tier.buttonText}
              </Button>
            </Card>
          ))}
        </div>

        {/* Enterprise-Grade Custom Documentation Section */}
        <div className="mt-24 bg-gradient-to-br from-[rgb(245,245,250)] to-white py-16 -mx-4 px-4 rounded-3xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[rgb(142,209,198)]/10 border border-[rgb(142,209,198)]/20 backdrop-blur-sm mb-6">
              <DollarSign className="h-4 w-4 text-[rgb(36,77,91)]" />
              <span className="text-sm font-medium text-[rgb(36,77,91)]">Custom Documentation Services</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-[rgb(36,77,91)]">
              Enterprise-Grade Custom Documentation
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Need bespoke documentation for your SaaS, API, or complex platform? Get custom documentation projects with 10+ source research, YouTube integration, enterprise SEO optimization, flexible delivery options and professional quality.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-5xl mx-auto">
            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-[rgb(142,209,198)]/20 flex items-center justify-center mx-auto mb-4">
                <ClipboardList className="h-6 w-6 text-[rgb(36,77,91)]" />
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Flexible Pricing</h4>
              <p className="text-sm text-gray-600">From $500 based on your specific needs</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-[rgb(142,209,198)]/20 flex items-center justify-center mx-auto mb-4">
                <Bolt className="h-6 w-6 text-[rgb(36,77,91)]" />
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Fast Delivery</h4>
              <p className="text-sm text-gray-600">Standard (3 days), Rush (1 day), or Same-Day</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-[rgb(142,209,198)]/20 flex items-center justify-center mx-auto mb-4">
                <Palette className="h-6 w-6 text-[rgb(36,77,91)]" />
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Custom Branding</h4>
              <p className="text-sm text-gray-600">Match your brand with custom logos and tone</p>
            </div>
          </div>
          
          <CustomPricingForm />
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-16 text-center text-gray-600">
          <p className="mb-2">
            All subscriptions are processed securely through PayPal.
          </p>
          <p>
            Cancel anytime. No questions asked.
          </p>
        </div>
      </div>
    </div>
    </div>
  );
}
