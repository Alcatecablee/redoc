import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { 
  GlobeAltIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  VideoCameraIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  BoltIcon,
  ClockIcon,
  CodeBracketIcon,
  DocumentMagnifyingGlassIcon,
  SparklesIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import Header from '@/components/Header';

interface ComplexityFactors {
  pageCount: number;
  estimatedPages: number;
  hasGitHub: boolean;
  githubRepoCount: number;
  hasStackOverflow: boolean;
  stackOverflowQuestions: number;
  hasYouTube: boolean;
  youtubeVideos: number;
  hasReddit: boolean;
  redditDiscussions: number;
  contentDepth: string;
  technicalComplexity: string;
}

interface PricingQuote {
  basePrice: number;
  complexityFactors: ComplexityFactors;
  breakdown: {
    basePages: number;
    externalResearch: number;
    complexity: number;
  };
  estimatedTotal: number;
  isFree: boolean;
  freeReason?: string;
  currency: string;
}

interface Addon {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: any;
  category: 'format' | 'feature' | 'delivery';
}

const addons: Addon[] = [
  { 
    id: 'extended_research', 
    name: 'Extended Research', 
    description: 'Deep dive into 50+ YouTube tutorials, 200+ Stack Overflow, Discord/forums', 
    price: 500, 
    icon: MagnifyingGlassIcon, 
    category: 'feature' 
  },
  { 
    id: 'code_snippets', 
    name: 'Code Snippets & Validation', 
    description: 'Extract/test 50-200 code samples, multi-language support', 
    price: 700, 
    icon: CodeBracketIcon, 
    category: 'feature' 
  },
  { 
    id: 'migration_guides', 
    name: 'Migration Guides', 
    description: 'Getting Started, competitor migration paths, integration workflows', 
    price: 850, 
    icon: DocumentMagnifyingGlassIcon, 
    category: 'feature' 
  },
  { 
    id: 'troubleshooting', 
    name: 'Troubleshooting Hub', 
    description: '50-100 error solutions, debug guides, comprehensive FAQs', 
    price: 500, 
    icon: SparklesIcon, 
    category: 'feature' 
  },
  { 
    id: 'api_reference', 
    name: 'API Reference', 
    description: 'Auto-generate endpoint docs, auth guides, rate limits', 
    price: 1400, 
    icon: DocumentTextIcon, 
    category: 'feature' 
  },
  { 
    id: 'white_label', 
    name: 'White-Label Branding', 
    description: 'Custom themes, logo integration, subdomain hosting', 
    price: 350, 
    icon: SparklesIcon, 
    category: 'feature' 
  },
  { 
    id: 'quarterly_updates', 
    name: 'Quarterly Updates', 
    description: 'Re-run research every 3 months, track community changes', 
    price: 200, 
    icon: ClockIcon, 
    category: 'feature' 
  },
  { 
    id: 'rush', 
    name: 'Rush Delivery (24-48h)', 
    description: 'Priority processing and expedited delivery', 
    price: 500, 
    icon: BoltIcon, 
    category: 'delivery' 
  },
];

export default function Quotation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const url = searchParams.get('url');
  const [analyzing, setAnalyzing] = useState(true);
  const [quote, setQuote] = useState<PricingQuote | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());
  const [email, setEmail] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!url) {
      navigate('/');
      return;
    }

    analyzeComplexity();
  }, [url]);

  const analyzeComplexity = async () => {
    setAnalyzing(true);
    try {
      const response = await fetch('/api/analyze-complexity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      setQuote(data.quote);
    } catch (error: any) {
      toast({
        title: 'Analysis Failed',
        description: error.message || 'Could not analyze your URL',
        variant: 'destructive',
      });
      navigate('/');
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleAddon = (addonId: string) => {
    const newSelected = new Set(selectedAddons);
    if (newSelected.has(addonId)) {
      newSelected.delete(addonId);
    } else {
      newSelected.add(addonId);
    }
    setSelectedAddons(newSelected);
  };

  const calculateTotal = () => {
    if (!quote) return 0;
    const addonsTotal = Array.from(selectedAddons).reduce((sum, addonId) => {
      const addon = addons.find(a => a.id === addonId);
      return sum + (addon?.price || 0);
    }, 0);
    return quote.estimatedTotal + addonsTotal;
  };

  const handleProceed = async () => {
    if (!quote) return;

    const total = calculateTotal();

    // Only skip payment if FINAL total is actually $0 (base + addons)
    if (total === 0) {
      const sessionId = crypto.randomUUID();
      localStorage.setItem(`generation_${sessionId}`, JSON.stringify({
        url,
        subdomain: '',
        timestamp: new Date().toISOString(),
        paid: false,
        free: true,
        addons: Array.from(selectedAddons),
      }));
      navigate(`/generation/${sessionId}`);
      return;
    }

    // Otherwise, require email for payment
    if (!email) {
      toast({
        title: 'Email Required',
        description: 'Please enter your email to proceed with payment',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);
    try {
      // Create PayPal order
      const response = await fetch('/api/consulting/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          email,
          tier: 'custom',
          sections: quote.complexityFactors.estimatedPages < 10 ? '8-12' : quote.complexityFactors.estimatedPages < 20 ? '13-20' : '20+',
          sourceDepth: quote.complexityFactors.hasGitHub || quote.complexityFactors.hasStackOverflow ? 'deep' : 'standard',
          delivery: selectedAddons.has('rush') ? 'rush' : 'standard',
          formats: Array.from(selectedAddons).filter(id => ['pdf', 'docx', 'markdown', 'html', 'json'].includes(id)),
          branding: selectedAddons.has('branding') ? 'advanced' : 'basic',
          youtubeOptions: selectedAddons.has('youtube') ? ['youtubeSearch', 'youtubeTranscripts'] : [],
          seoOptions: selectedAddons.has('seo') ? ['seoMetadata', 'schemaMarkup'] : [],
          customRequirements: '',
          currency: 'USD',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment order');
      }

      const data = await response.json();
      console.log('Payment order response:', data);
      
      if (data.approvalUrl) {
        console.log('Redirecting to:', data.approvalUrl);
        // Redirect to PayPal or test success page
        window.location.href = data.approvalUrl;
      } else {
        throw new Error('No approval URL received from server');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: 'Payment Error',
        description: error.message || 'Could not process payment',
        variant: 'destructive',
      });
      setProcessing(false);
    }
  };

  if (analyzing || processing) {
    const loadingTitle = analyzing ? 'Analyzing Your Project' : 'Processing Payment';
    const loadingDescription = analyzing 
      ? 'Scanning community footprint and calculating complexity' 
      : 'Redirecting to payment...';
    
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-[rgb(14,19,23)] via-[rgb(24,29,37)] to-[rgb(34,38,46)] z-50">
        <Header />
        <div className="absolute inset-0 flex items-center justify-center p-6" style={{ marginTop: '80px' }}>
          <div className="relative bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-3xl p-12 text-center backdrop-blur-sm shadow-[0_20px_50px_rgba(0,0,0,0.3)] max-w-xl w-full">
            <ArrowPathIcon className="w-16 h-16 mx-auto mb-6 animate-spin text-[rgb(102,255,228)]" />
            <h2 className="text-3xl font-bold mb-3 text-white">{loadingTitle}</h2>
            <p className="text-white/70 text-lg mb-8">{loadingDescription}</p>
            {analyzing && (
              <div className="space-y-3 text-left">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                  <CheckCircleIcon className="w-5 h-5 text-[rgb(102,255,228)] flex-shrink-0" />
                  <span className="text-white/80">Checking Stack Overflow questions</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                  <CheckCircleIcon className="w-5 h-5 text-[rgb(102,255,228)] flex-shrink-0" />
                  <span className="text-white/80">Scanning GitHub repositories</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                  <CheckCircleIcon className="w-5 h-5 text-[rgb(102,255,228)] flex-shrink-0" />
                  <span className="text-white/80">Discovering YouTube tutorials</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!quote) return null;

  const total = calculateTotal();

  const totalResources = (quote.complexityFactors as any).totalResources || 0;
  const complexityTier = (quote.complexityFactors as any).complexityTier || 'Low';
  
  // Calculate ROI savings
  const manualResearchHours = totalResources * 0.5;
  const manualResearchCost = manualResearchHours * 100;
  const savingsAmount = Math.max(0, manualResearchCost - total);
  const savingsPercentage = manualResearchCost > 0 ? Math.round((savingsAmount / manualResearchCost) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[rgb(14,19,23)] via-[rgb(24,29,37)] to-[rgb(34,38,46)]">
      {/* Background Elements */}
      <div className="fixed inset-0 bg-grid-white/[0.02] opacity-30 pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-96 bg-gradient-radial from-[rgb(102,255,228)]/5 via-transparent to-transparent blur-3xl pointer-events-none" />
      
      <Header />
      
      <div className="relative py-12 px-4 lg:py-20">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12 lg:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-6">
              <CurrencyDollarIcon className="h-4 w-4 text-[rgb(102,255,228)]" />
              <span className="text-sm font-semibold text-white/90 uppercase tracking-wide">
                {quote.isFree ? "Free Tier" : "Custom Project Quote"}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-white leading-tight tracking-tight">
              Your Instant Quote
            </h1>
            <p className="text-white/70 text-lg lg:text-xl max-w-3xl mx-auto mb-8 font-light">{url}</p>
            
            {/* Complexity Badges */}
            <div className="flex flex-wrap justify-center gap-3">
              <div className="px-6 py-2 rounded-full bg-gradient-to-br from-white/15 to-white/5 border border-white/25 backdrop-blur-sm">
                <span className="text-base font-semibold text-white">
                  {complexityTier} Complexity
                </span>
              </div>
              <div className="px-6 py-2 rounded-full bg-gradient-to-br from-[rgb(102,255,228)]/20 to-[rgb(102,255,228)]/10 border border-[rgb(102,255,228)]/30 backdrop-blur-sm">
                <span className="text-base font-semibold text-[rgb(102,255,228)]">
                  {totalResources} Resources Found
                </span>
              </div>
            </div>
          </div>

          {/* Free Tier Banner */}
          {quote.isFree && (
            <div className="max-w-5xl mx-auto mb-8">
              <div className="relative bg-gradient-to-br from-green-500/20 to-green-500/10 border-2 border-green-500/40 rounded-3xl p-6 md:p-8 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <CheckCircleIcon className="w-10 h-10 text-green-400 flex-shrink-0" />
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold text-green-300 mb-1">{quote.freeReason}</h3>
                    <p className="text-green-200/80">Your project qualifies for free documentation generation</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Left Column - Community Footprint */}
            <div className="lg:col-span-1">
              <div className="relative bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-3xl p-8 transition-all duration-500 backdrop-blur-sm">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-white">
                  <GlobeAltIcon className="w-7 h-7 text-[rgb(102,255,228)]" />
                  Community Footprint
                </h2>
                
                <div className="space-y-5">
                  {/* Total Resources */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-[rgb(102,255,228)]/20 to-[rgb(102,255,228)]/10 border border-[rgb(102,255,228)]/30">
                    <div className="text-sm text-white/70 mb-2 font-medium">Total Resources Discovered</div>
                    <div className="text-5xl font-bold text-[rgb(102,255,228)]">{totalResources}</div>
                    <div className="text-xs text-white/60 mt-1">Across all platforms</div>
                  </div>

                  {/* Resource Breakdown */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                      <div className="flex items-center gap-2">
                        <GlobeAltIcon className="w-4 h-4 text-[rgb(102,255,228)]" />
                        <span className="text-sm text-white/90">Documentation Pages</span>
                      </div>
                      <span className="text-sm font-semibold text-white">{quote.complexityFactors.estimatedPages}</span>
                    </div>

                    {quote.complexityFactors.hasStackOverflow && (
                      <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                        <div className="flex items-center gap-2">
                          <MagnifyingGlassIcon className="w-4 h-4 text-orange-400" />
                          <span className="text-sm text-white/90">Stack Overflow</span>
                        </div>
                        <span className="text-sm font-semibold text-white">{quote.complexityFactors.stackOverflowQuestions}</span>
                      </div>
                    )}

                    {quote.complexityFactors.hasGitHub && (
                      <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                        <div className="flex items-center gap-2">
                          <CodeBracketIcon className="w-4 h-4 text-purple-400" />
                          <span className="text-sm text-white/90">GitHub Repos</span>
                        </div>
                        <span className="text-sm font-semibold text-white">{quote.complexityFactors.githubRepoCount}</span>
                      </div>
                    )}

                    {quote.complexityFactors.hasYouTube && (
                      <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                        <div className="flex items-center gap-2">
                          <VideoCameraIcon className="w-4 h-4 text-red-400" />
                          <span className="text-sm text-white/90">YouTube Videos</span>
                        </div>
                        <span className="text-sm font-semibold text-white">{quote.complexityFactors.youtubeVideos}</span>
                      </div>
                    )}

                    {quote.complexityFactors.hasReddit && (
                      <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                        <div className="flex items-center gap-2">
                          <ChatBubbleLeftRightIcon className="w-4 h-4 text-orange-500" />
                          <span className="text-sm text-white/90">Reddit Discussions</span>
                        </div>
                        <span className="text-sm font-semibold text-white">{quote.complexityFactors.redditDiscussions}</span>
                      </div>
                    )}
                  </div>

                  {/* Pricing Formula */}
                  <div className="pt-5 border-t border-white/20">
                    <h3 className="text-xs font-semibold mb-3 text-white/60 uppercase tracking-wider">Pricing Formula</h3>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-sm space-y-2">
                      {quote.isFree ? (
                        <div className="text-center py-4 text-green-400 font-semibold">
                          All components included FREE
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between text-white/80">
                            <span>Base minimum</span>
                            <span className="font-semibold">${quote.breakdown.basePages.toFixed(0)}</span>
                          </div>
                          <div className="flex justify-between text-white/80">
                            <span>{totalResources} resources × $5</span>
                            <span className="font-semibold">${quote.breakdown.externalResearch.toFixed(0)}</span>
                          </div>
                          <div className="flex justify-between text-white/80">
                            <span>{complexityTier} tier (×{complexityTier === 'High' ? '2.0' : complexityTier === 'Medium' ? '1.5' : '1.0'})</span>
                            <span className="font-semibold">+${quote.breakdown.complexity.toFixed(0)}</span>
                          </div>
                          {(quote.breakdown as any).capDiscount && (
                            <div className="flex justify-between text-green-400">
                              <span>Max quote discount</span>
                              <span className="font-semibold">${((quote.breakdown as any).capDiscount).toFixed(0)}</span>
                            </div>
                          )}
                        </>
                      )}
                      <div className="flex justify-between font-bold text-base pt-2 border-t border-white/20">
                        <span className="text-[rgb(102,255,228)]">Base Package</span>
                        <span className="text-[rgb(102,255,228)]">${quote.estimatedTotal.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>

                  {/* ROI Calculator */}
                  {!quote.isFree && savingsAmount > 0 && (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/20 to-green-500/10 border border-green-500/30">
                      <div className="flex items-center gap-2 mb-3">
                        <SparklesIcon className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-semibold text-green-300">Value Analysis</span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between text-white/70">
                          <span>Manual research cost:</span>
                          <span className="font-semibold">${manualResearchCost.toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between text-green-300 font-semibold">
                          <span>You save:</span>
                          <span>${savingsAmount.toFixed(0)} ({savingsPercentage}%)</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Middle Column - Premium Add-ons */}
            <div className="lg:col-span-1">
              <div className="relative bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-3xl p-8 transition-all duration-500 backdrop-blur-sm">
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-3 text-white">
                  <SparklesIcon className="w-7 h-7 text-[rgb(102,255,228)]" />
                  Premium Add-ons
                </h2>
                <p className="text-white/60 mb-6 text-sm">Enhance your documentation with optional features</p>

                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                  {addons.map((addon) => {
                    const Icon = addon.icon;
                    const isSelected = selectedAddons.has(addon.id);
                    
                    return (
                      <div
                        key={addon.id}
                        onClick={() => toggleAddon(addon.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] ${
                          isSelected
                            ? 'border-[rgb(102,255,228)]/50 bg-gradient-to-br from-[rgb(102,255,228)]/15 to-[rgb(102,255,228)]/5'
                            : 'border-white/20 hover:border-[rgb(102,255,228)]/30 bg-white/5'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox checked={isSelected} className="mt-1" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Icon className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-[rgb(102,255,228)]' : 'text-white/60'}`} />
                              <span className={`font-semibold text-sm ${isSelected ? 'text-white' : 'text-white/90'}`}>{addon.name}</span>
                              <span className={`ml-auto flex-shrink-0 text-sm font-semibold ${isSelected ? 'text-[rgb(102,255,228)]' : 'text-white/70'}`}>
                                +${addon.price}
                              </span>
                            </div>
                            <p className="text-xs text-white/60 leading-tight">{addon.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-1">
              <div className="relative bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-3xl p-8 transition-all duration-500 backdrop-blur-sm">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-white">
                  <CurrencyDollarIcon className="w-7 h-7 text-[rgb(102,255,228)]" />
                  Order Summary
                </h2>

                {/* What's Included */}
                <div className="mb-6 p-5 rounded-xl bg-white/5 border border-white/10">
                  <h3 className="text-xs font-semibold mb-4 text-white/60 uppercase tracking-wider">Base Package Includes</h3>
                  <div className="space-y-2 text-sm">
                    {[
                      'Crawl up to 50 pages + sitemap parsing',
                      'Top 50 Stack Overflow + 20 GitHub issues',
                      '10 Reddit threads + 5 DEV.to articles',
                      'Getting Started, FAQs, Troubleshooting',
                      '1 export format (PDF or Markdown)',
                      '15-day email support'
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-[rgb(102,255,228)] flex-shrink-0 mt-0.5" />
                        <span className="text-white/80 leading-tight">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pricing Summary */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">Base Package</span>
                    <span className="font-semibold text-white">${quote.estimatedTotal.toFixed(0)}</span>
                  </div>
                  
                  {selectedAddons.size > 0 && (
                    <>
                      <div className="border-t border-white/10 pt-3">
                        <div className="text-xs font-semibold mb-2 text-white/60 uppercase tracking-wider">Selected Add-ons</div>
                        {Array.from(selectedAddons).map((addonId) => {
                          const addon = addons.find(a => a.id === addonId);
                          return addon ? (
                            <div key={addonId} className="flex justify-between text-sm mb-2">
                              <span className="text-white/70">{addon.name}</span>
                              <span className="font-semibold text-white">+${addon.price}</span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </>
                  )}
                  
                  <div className="border-t border-white/20 pt-3 flex justify-between items-center">
                    <span className="text-lg font-bold text-white">Total Price</span>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-[rgb(102,255,228)]">
                        ${total.toFixed(0)}
                      </div>
                      <div className="text-xs text-white/60">USD</div>
                    </div>
                  </div>
                </div>

                {/* Email Input */}
                {total > 0 && (
                  <div className="mb-6">
                    <Input
                      type="email"
                      placeholder="Your email for receipt & delivery"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/50 focus:border-[rgb(102,255,228)]/50 h-12"
                    />
                  </div>
                )}

                {/* CTA Button */}
                <Button
                  onClick={handleProceed}
                  disabled={processing || (total > 0 && !email)}
                  className="w-full h-14 bg-[rgb(102,255,228)] hover:bg-white text-[rgb(14,19,23)] font-bold text-base rounded-full uppercase tracking-wider transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? (
                    <span className="flex items-center gap-2">
                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                      Processing...
                    </span>
                  ) : total === 0 ? (
                    <span className="flex items-center gap-2">
                      <BoltIcon className="h-5 w-5" />
                      Start Free Generation
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <CurrencyDollarIcon className="h-5 w-5" />
                      Proceed to Payment
                    </span>
                  )}
                </Button>

                <p className="mt-4 text-xs text-center text-white/50">
                  Secure payment powered by PayPal
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
