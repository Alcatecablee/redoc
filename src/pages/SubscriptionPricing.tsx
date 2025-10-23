import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, Crown, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';

interface PricingTier {
  name: string;
  price: number;
  interval: string;
  icon: React.ReactNode;
  popular?: boolean;
  features: string[];
  planId?: string;
  buttonText: string;
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Free',
    price: 0,
    interval: 'forever',
    icon: <Sparkles className="w-7 h-7" />,
    features: [
      '1 documentation per month',
      'Basic research depth',
      'PDF export only',
      '8-12 sections',
      'Community support'
    ],
    buttonText: 'Get Started Free'
  },
  {
    name: 'Pro',
    price: 19,
    interval: 'month',
    icon: <Zap className="w-7 h-7" />,
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
    buttonText: 'Upgrade to Pro'
  },
  {
    name: 'Enterprise',
    price: 99,
    interval: 'month',
    icon: <Crown className="w-7 h-7" />,
    planId: 'enterprise',
    features: [
      'Everything in Pro',
      'YouTube transcripts & AI analysis',
      'API access ($0.10/1K tokens)',
      'Webhook integration',
      'SEO optimization & sitemaps',
      'Content refresh scheduling',
      'Custom branding & white-label',
      'AI voice narration (TTS)',
      'Hosted help centers & subdomains',
      'Custom domain support',
      'Advanced caching & optimization',
      'Priority support & SLA'
    ],
    buttonText: 'Upgrade to Enterprise'
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
      const { data: sessionData } = await supabase.auth.getSession();
      const authToken = sessionData?.session?.access_token;

      if (!authToken) {
        throw new Error('Not authenticated');
      }

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
    <div className="min-h-screen bg-gradient-to-br from-[rgb(36,77,91)] via-[rgb(40,85,100)] to-[rgb(36,77,91)]">
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 bg-grid-white/[0.02] opacity-50" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/5 to-transparent" />
        
        <div className="relative container mx-auto px-6 max-w-7xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-6">
              <Sparkles className="h-4 w-4 text-white" />
              <span className="text-sm font-medium text-white/90">Simple, Transparent Pricing</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-white mb-6 tracking-tight">
              Choose Your Plan
            </h1>
            <p className="text-lg lg:text-xl text-white/70 leading-relaxed max-w-3xl mx-auto">
              Start free and scale as you grow. All plans include our AI-powered documentation generator with external research.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-20">
            {pricingTiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-2xl backdrop-blur-xl border transition-all duration-300 ${
                  tier.popular
                    ? 'bg-white/15 border-white/30 shadow-2xl scale-105 hover:scale-[1.07]'
                    : 'bg-white/10 border-white/20 shadow-xl hover:bg-white/[0.12] hover:scale-105'
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-[rgb(142,209,198)] text-[rgb(36,77,91)] border-0 px-4 py-1 text-sm font-semibold shadow-lg">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <div className="p-8">
                  {/* Icon & Name */}
                  <div className="mb-6">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-white/10 border border-white/20 text-white mb-4">
                      {tier.icon}
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-bold text-white">${tier.price}</span>
                      <span className="text-white/60 text-lg">/{tier.interval}</span>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-4 mb-8">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-[rgb(142,209,198)] flex-shrink-0 mt-0.5" />
                        <span className="text-white/80 text-sm leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Button
                    className={`w-full h-12 font-semibold transition-all duration-300 ${
                      tier.popular
                        ? 'bg-white text-[rgb(36,77,91)] hover:bg-white/90 shadow-lg hover:shadow-xl'
                        : 'bg-white/10 text-white border border-white/30 hover:bg-white/20 backdrop-blur-sm'
                    }`}
                    onClick={() => handleSubscribe(tier)}
                    disabled={loading !== null}
                  >
                    {loading === tier.planId ? 'Processing...' : tier.buttonText}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-white/70 text-sm mb-8">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[rgb(142,209,198)]" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[rgb(142,209,198)]" />
              <span>Secure PayPal payments</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[rgb(142,209,198)]" />
              <span>Instant activation</span>
            </div>
          </div>
        </div>
      </section>

      {/* Custom Projects CTA */}
      <section className="relative overflow-hidden py-20 bg-white/5 border-t border-white/10">
        <div className="absolute inset-0 bg-grid-white/[0.02]" />
        
        <div className="relative container mx-auto px-6 max-w-4xl">
          <div className="bg-gradient-to-br from-[rgb(142,209,198)]/15 to-[rgb(142,209,198)]/5 border-2 border-[rgb(142,209,198)]/40 rounded-3xl p-10 md:p-14 text-center backdrop-blur-sm shadow-[0_25px_60px_rgba(142,209,198,0.25)]">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[rgb(142,209,198)]/20 border border-[rgb(142,209,198)]/30 backdrop-blur-sm mb-6">
              <Crown className="h-4 w-4 text-[rgb(142,209,198)]" />
              <span className="text-sm font-medium text-white/90">One-Time Projects</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
              Need Custom Documentation?
            </h2>
            <p className="text-lg text-white/80 leading-relaxed mb-8 max-w-2xl mx-auto">
              Beyond subscriptions? Configure a bespoke documentation project with our interactive pricing wizard. From $500 with fast delivery and custom branding.
            </p>
            <Button
              asChild
              size="lg"
              className="h-14 px-10 bg-white text-[rgb(36,77,91)] hover:bg-white/90 font-bold text-base rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200"
            >
              <a href="/custom-projects">
                Explore Custom Projects
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
