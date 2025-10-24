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
  { id: 'pdf', name: 'PDF Export', description: 'Professional PDF document', price: 10, icon: FileText, category: 'format' },
  { id: 'docx', name: 'Word Export', description: 'Editable DOCX format', price: 10, icon: FileText, category: 'format' },
  { id: 'youtube', name: 'YouTube Integration', description: 'Include video tutorials', price: 50, icon: Youtube, category: 'feature' },
  { id: 'seo', name: 'SEO Optimization', description: 'Meta tags & indexing', price: 75, icon: Search, category: 'feature' },
  { id: 'branding', name: 'Custom Branding', description: 'Your logo & colors', price: 100, icon: Sparkles, category: 'feature' },
  { id: 'rush', name: 'Rush Delivery (24h)', description: '10x faster generation', price: 200, icon: Zap, category: 'delivery' },
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
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 flex items-center justify-center">
        <Card className="p-12 text-center">
          <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-purple-600" />
          <h2 className="text-2xl font-bold mb-2">Analyzing Your Project</h2>
          <p className="text-gray-600">Calculating complexity and pricing...</p>
        </Card>
      </div>
    );
  }

  if (!quote) return null;

  const total = calculateTotal();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Your Instant Quote</h1>
          <p className="text-white/90 text-lg">{url}</p>
        </div>

        {/* Free Tier Banner */}
        {quote.isFree && (
          <Card className="p-6 mb-6 bg-green-50 border-2 border-green-500">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="text-xl font-bold text-green-900">{quote.freeReason}</h3>
                <p className="text-green-700">Your project qualifies for free documentation generation!</p>
              </div>
            </div>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column - Analysis & Pricing */}
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Project Analysis</h2>
            
            <div className="space-y-4">
              {/* Page Count */}
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-600" />
                  <span>Estimated Pages</span>
                </div>
                <Badge>{quote.complexityFactors.estimatedPages}</Badge>
              </div>

              {/* External Resources */}
              {quote.complexityFactors.hasGitHub && (
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span>GitHub Repositories</span>
                  <Badge variant="secondary">{quote.complexityFactors.githubRepoCount}</Badge>
                </div>
              )}

              {quote.complexityFactors.hasStackOverflow && (
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span>Stack Overflow Questions</span>
                  <Badge variant="secondary">{quote.complexityFactors.stackOverflowQuestions}</Badge>
                </div>
              )}

              {/* Complexity */}
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span>Technical Complexity</span>
                <Badge variant={quote.complexityFactors.technicalComplexity === 'complex' ? 'destructive' : 'default'}>
                  {quote.complexityFactors.technicalComplexity}
                </Badge>
              </div>
            </div>

            {/* Pricing Breakdown */}
            <div className="mt-6 pt-6 border-t">
              <h3 className="text-xl font-bold mb-4">Price Breakdown</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Base Documentation</span>
                  <span>${quote.breakdown.basePages.toFixed(2)}</span>
                </div>
                {quote.breakdown.externalResearch > 0 && (
                  <div className="flex justify-between">
                    <span>External Research</span>
                    <span>${quote.breakdown.externalResearch.toFixed(2)}</span>
                  </div>
                )}
                {quote.breakdown.complexity > 0 && (
                  <div className="flex justify-between">
                    <span>Complexity Bonus</span>
                    <span>${quote.breakdown.complexity.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Base Total</span>
                  <span>${quote.estimatedTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Right Column - Addons */}
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Enhance Your Documentation</h2>
            <p className="text-gray-600 mb-6">Select optional features to boost your documentation's value</p>

            <div className="space-y-3">
              {addons.map((addon) => {
                const Icon = addon.icon;
                const isSelected = selectedAddons.has(addon.id);
                
                return (
                  <div
                    key={addon.id}
                    onClick={() => toggleAddon(addon.id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox checked={isSelected} className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="w-5 h-5 text-purple-600" />
                          <span className="font-semibold">{addon.name}</span>
                          <Badge className="ml-auto">${addon.price}</Badge>
                        </div>
                        <p className="text-sm text-gray-600">{addon.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Final Total */}
            <div className="mt-6 pt-6 border-t">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xl font-bold">Total Price</span>
                <div className="text-right">
                  <div className="text-3xl font-bold text-purple-600">
                    ${total.toFixed(2)}
                  </div>
                  {total > 0 && (
                    <div className="text-sm text-gray-600">One-time payment</div>
                  )}
                </div>
              </div>

              {total > 0 && (
                <input
                  type="email"
                  placeholder="Your email for receipt"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 border rounded-lg mb-4"
                  required
                />
              )}

              <Button
                onClick={handleProceed}
                disabled={processing || (total > 0 && !email)}
                className="w-full h-12 text-lg"
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
                    Proceed to Payment
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-gray-500 mt-3">
                Secure payment via PayPal • No recurring charges
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
