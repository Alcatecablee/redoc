import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle, 
  Loader2, 
  Globe, 
  FileText, 
  Youtube, 
  Search, 
  Sparkles,
  DollarSign,
  Zap,
  Clock,
  Download
} from 'lucide-react';

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
    icon: Search, 
    category: 'feature' 
  },
  { 
    id: 'code_snippets', 
    name: 'Code Snippets & Validation', 
    description: 'Extract/test 50-200 code samples, multi-language support', 
    price: 700, 
    icon: FileText, 
    category: 'feature' 
  },
  { 
    id: 'migration_guides', 
    name: 'Migration Guides', 
    description: '"Getting Started", competitor migration paths, integration workflows', 
    price: 850, 
    icon: Sparkles, 
    category: 'feature' 
  },
  { 
    id: 'troubleshooting', 
    name: 'Troubleshooting Hub', 
    description: '50-100 error solutions, debug guides, comprehensive FAQs', 
    price: 500, 
    icon: Globe, 
    category: 'feature' 
  },
  { 
    id: 'api_reference', 
    name: 'API Reference', 
    description: 'Auto-generate endpoint docs, auth guides, rate limits', 
    price: 1400, 
    icon: FileText, 
    category: 'feature' 
  },
  { 
    id: 'white_label', 
    name: 'White-Label Branding', 
    description: 'Custom themes, logo integration, subdomain hosting', 
    price: 350, 
    icon: Sparkles, 
    category: 'feature' 
  },
  { 
    id: 'quarterly_updates', 
    name: 'Quarterly Updates', 
    description: 'Re-run research every 3 months, track community changes', 
    price: 200, 
    icon: Clock, 
    category: 'feature' 
  },
  { 
    id: 'rush', 
    name: 'Rush Delivery (24-48h)', 
    description: 'Priority processing and expedited delivery', 
    price: 500, 
    icon: Zap, 
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

      const data = await response.json();
      
      if (data.paypalOrderId && data.approvalUrl) {
        // Redirect to PayPal
        window.location.href = data.approvalUrl;
      } else {
        throw new Error('Failed to create payment order');
      }
    } catch (error: any) {
      toast({
        title: 'Payment Error',
        description: error.message || 'Could not process payment',
        variant: 'destructive',
      });
      setProcessing(false);
    }
  };

  if (analyzing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-12 text-center glass-effect border-primary/20">
          <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-primary" />
          <h2 className="text-2xl font-bold mb-2">Analyzing Your Project</h2>
          <p className="text-muted-foreground">Scanning community footprint and calculating complexity...</p>
          <div className="mt-6 space-y-2 text-sm text-left text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              <span>Checking Stack Overflow questions...</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              <span>Scanning GitHub repositories...</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              <span>Discovering YouTube tutorials...</span>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!quote) return null;

  const total = calculateTotal();

  const totalResources = (quote.complexityFactors as any).totalResources || 0;
  const complexityTier = (quote.complexityFactors as any).complexityTier || 'Low';
  
  // Calculate ROI savings
  const manualResearchHours = totalResources * 0.5; // Assume 30min per resource
  const manualResearchCost = manualResearchHours * 100; // $100/hour rate
  const savingsAmount = Math.max(0, manualResearchCost - total);
  const savingsPercentage = manualResearchCost > 0 ? Math.round((savingsAmount / manualResearchCost) * 100) : 0;

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 px-4 py-2" variant={quote.isFree ? "default" : "outline"}>
            {quote.isFree ? "Free Tier" : "Custom Project Quote"}
          </Badge>
          <h1 className="text-5xl font-bold mb-4 text-gradient">Your Instant Quote</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{url}</p>
          
          {/* Complexity Badge */}
          <div className="flex justify-center gap-4 mt-6">
            <Badge 
              className="text-lg px-6 py-2" 
              variant={complexityTier === 'High' ? 'destructive' : complexityTier === 'Medium' ? 'default' : 'secondary'}
            >
              {complexityTier} Complexity
            </Badge>
            <Badge className="text-lg px-6 py-2 bg-primary/10 text-primary border-primary/20">
              {totalResources} Resources Found
            </Badge>
          </div>
        </div>

        {/* Free Tier Banner */}
        {quote.isFree && (
          <Card className="p-6 mb-8 glass-effect border-green-500/50 bg-green-500/10">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <div>
                <h3 className="text-xl font-bold text-green-300">{quote.freeReason}</h3>
                <p className="text-green-200/80">Your project qualifies for free documentation generation!</p>
              </div>
            </div>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Resource Analysis */}
          <Card className="p-6 glass-effect border-primary/10">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Globe className="w-6 h-6 text-primary" />
              Community Footprint
            </h2>
            
            <div className="space-y-4">
              {/* Total Resources - Prominent */}
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="text-sm text-muted-foreground mb-1">Total Resources Discovered</div>
                <div className="text-4xl font-bold text-primary">{totalResources}</div>
                <div className="text-xs text-muted-foreground mt-1">Across all platforms</div>
              </div>

              {/* Resource Breakdown */}
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-lg bg-card/50 hover:bg-card/80 transition-smooth">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" />
                    <span className="text-sm">Documentation Pages</span>
                  </div>
                  <Badge variant="outline">{quote.complexityFactors.estimatedPages}</Badge>
                </div>

                {quote.complexityFactors.hasStackOverflow && (
                  <div className="flex justify-between items-center p-3 rounded-lg bg-card/50 hover:bg-card/80 transition-smooth">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-orange-400" />
                      <span className="text-sm">Stack Overflow</span>
                    </div>
                    <Badge variant="outline">{quote.complexityFactors.stackOverflowQuestions}</Badge>
                  </div>
                )}

                {quote.complexityFactors.hasGitHub && (
                  <div className="flex justify-between items-center p-3 rounded-lg bg-card/50 hover:bg-card/80 transition-smooth">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-400" />
                      <span className="text-sm">GitHub Repos</span>
                    </div>
                    <Badge variant="outline">{quote.complexityFactors.githubRepoCount}</Badge>
                  </div>
                )}

                {quote.complexityFactors.hasYouTube && (
                  <div className="flex justify-between items-center p-3 rounded-lg bg-card/50 hover:bg-card/80 transition-smooth">
                    <div className="flex items-center gap-2">
                      <Youtube className="w-4 h-4 text-red-400" />
                      <span className="text-sm">YouTube Videos</span>
                    </div>
                    <Badge variant="outline">{quote.complexityFactors.youtubeVideos}</Badge>
                  </div>
                )}

                {quote.complexityFactors.hasReddit && (
                  <div className="flex justify-between items-center p-3 rounded-lg bg-card/50 hover:bg-card/80 transition-smooth">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-orange-500" />
                      <span className="text-sm">Reddit Discussions</span>
                    </div>
                    <Badge variant="outline">{quote.complexityFactors.redditDiscussions}</Badge>
                  </div>
                )}
              </div>

              {/* Pricing Formula Display */}
              <div className="mt-6 pt-6 border-t border-border/50">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground">PRICING FORMULA</h3>
                <div className="p-3 rounded-lg bg-card/50 border border-border/50 text-sm space-y-2">
                  {quote.isFree ? (
                    <div className="text-center py-4 text-green-400 font-semibold">
                      All components included FREE!
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Base minimum</span>
                        <span>${quote.breakdown.basePages.toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{totalResources} resources × $5</span>
                        <span>${quote.breakdown.externalResearch.toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{complexityTier} tier (×{complexityTier === 'High' ? '2.0' : complexityTier === 'Medium' ? '1.5' : '1.0'})</span>
                        <span>+${quote.breakdown.complexity.toFixed(0)}</span>
                      </div>
                      {(quote.breakdown as any).capDiscount && (
                        <div className="flex justify-between text-green-400">
                          <span>Max quote discount</span>
                          <span>${((quote.breakdown as any).capDiscount).toFixed(0)}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between font-bold text-base pt-2 border-t border-border/50">
                    <span className="text-primary">Base Package</span>
                    <span className="text-primary">${quote.estimatedTotal.toFixed(0)}</span>
                  </div>
                </div>
              </div>

              {/* ROI Calculator */}
              {!quote.isFree && savingsAmount > 0 && (
                <div className="mt-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-semibold text-green-300">Value Analysis</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Manual research cost:</span>
                      <span>${manualResearchCost.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-green-300 font-semibold">
                      <span>You save:</span>
                      <span>${savingsAmount.toFixed(0)} ({savingsPercentage}%)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Middle Column - Add-ons */}
          <Card className="p-6 glass-effect border-primary/10 lg:col-span-1">
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              Premium Add-ons
            </h2>
            <p className="text-muted-foreground mb-6 text-sm">Enhance your documentation with optional features</p>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {addons.map((addon) => {
                const Icon = addon.icon;
                const isSelected = selectedAddons.has(addon.id);
                
                return (
                  <div
                    key={addon.id}
                    onClick={() => toggleAddon(addon.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 bg-card/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox checked={isSelected} className="mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className="font-semibold text-sm">{addon.name}</span>
                          <Badge className="ml-auto flex-shrink-0" variant={isSelected ? "default" : "outline"}>
                            +${addon.price}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-tight">{addon.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Right Column - Summary & Checkout */}
          <Card className="p-6 glass-effect border-primary/10 lg:col-span-1">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-primary" />
              Order Summary
            </h2>

            {/* What's Included */}
            <div className="mb-6 p-4 rounded-lg bg-card/50 border border-border/50">
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">BASE PACKAGE INCLUDES</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Crawl up to 50 pages + sitemap parsing</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Top 50 Stack Overflow + 20 GitHub issues</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>10 Reddit threads + 5 DEV.to articles</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Getting Started, FAQs, Troubleshooting</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>1 export format (PDF or Markdown)</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>15-day email support</span>
                </div>
              </div>
            </div>

            {/* Pricing Summary */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Base Package</span>
                <span className="font-semibold">${quote.estimatedTotal.toFixed(0)}</span>
              </div>
              
              {selectedAddons.size > 0 && (
                <>
                  <div className="border-t border-border/50 pt-3">
                    <div className="text-xs font-semibold mb-2 text-muted-foreground">SELECTED ADD-ONS</div>
                    {Array.from(selectedAddons).map((addonId) => {
                      const addon = addons.find(a => a.id === addonId);
                      return addon ? (
                        <div key={addonId} className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">{addon.name}</span>
                          <span className="font-semibold">+${addon.price}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </>
              )}
              
              <div className="border-t border-border/50 pt-3 flex justify-between items-center">
                <span className="text-lg font-bold">Total Price</span>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">
                    ${total.toFixed(0)}
                  </div>
                  {total > 0 && (
                    <div className="text-xs text-muted-foreground">One-time payment</div>
                  )}
                </div>
              </div>
            </div>

            {/* Delivery Time */}
            <div className="mb-6 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-primary" />
                <span className="font-semibold">
                  {selectedAddons.has('rush') ? '24-48 hours' : '3-5 business days'}
                </span>
                <span className="text-muted-foreground">delivery</span>
              </div>
            </div>

            {/* Email Input */}
            {total > 0 && (
              <input
                type="email"
                placeholder="Your email for receipt & delivery"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-border rounded-lg mb-4 bg-background focus:border-primary focus:ring-1 focus:ring-primary transition-smooth"
                required
              />
            )}

            {/* CTA Button */}
            <Button
              onClick={handleProceed}
              disabled={processing || (total > 0 && !email)}
              className="w-full h-14 text-lg hover-glow hover-scale"
              size="lg"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : total === 0 ? (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Generate Free Documentation
                </>
              ) : (
                <>
                  <DollarSign className="w-5 h-5 mr-2" />
                  Proceed to PayPal Checkout
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-3">
              🔒 Secure payment via PayPal • No recurring charges
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
