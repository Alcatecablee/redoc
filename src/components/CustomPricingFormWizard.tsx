import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Zap, 
  Globe, 
  Palette, 
  Clock, 
  CheckCircle2, 
  Star, 
  Building2, 
  Sparkles,
  AlertCircle 
} from 'lucide-react';
import { toast } from 'sonner';
import ConfigurationWizard, { type WizardStep } from './ConfigurationWizard';
import DeliveryCalculator from './DeliveryCalculator';
import InteractivePricingBreakdown from './InteractivePricingBreakdown';
import { useLocalStorage, useAutoSave } from '@/hooks/use-local-storage';
import { validateURL, isValidGitHubRepo } from '@/utils/url-validator';

type PricingTier = 'custom' | 'standard' | 'professional' | 'enterprise';

interface PricingFormData {
  tier?: PricingTier;
  url: string;
  githubRepo: string;
  sections: '8-12' | '13-20' | '20+';
  sourceDepth: 'basic' | 'standard' | 'deep';
  delivery: 'standard' | 'rush' | 'same-day';
  formats: string[];
  branding: 'basic' | 'advanced';
  customRequirements: string;
  currency: 'USD' | 'ZAR';
  youtubeOptions: string[];
  seoOptions: string[];
  enterpriseFeatures: string[];
}

interface PricingBreakdown {
  basePrice: number;
  sectionsAddon: number;
  depthAddon: number;
  deliveryAddon: number;
  formatsAddon: number;
  brandingAddon: number;
  complexityAddon: number;
  youtubeAddon: number;
  seoAddon: number;
  enterpriseFeaturesAddon: number;
  total: number;
  currency: string;
  tierName?: string;
}

const wizardSteps: WizardStep[] = [
  {
    id: 'package',
    title: 'Choose Package',
    description: 'Select your documentation tier'
  },
  {
    id: 'configure',
    title: 'Configure Details',
    description: 'Provide project information'
  },
  {
    id: 'review',
    title: 'Review & Confirm',
    description: 'Review your order'
  },
  {
    id: 'payment',
    title: 'Payment',
    description: 'Complete your purchase'
  }
];

const tierPackages = [
  {
    id: 'standard' as PricingTier,
    name: 'Standard',
    price: 500,
    description: 'Perfect for basic documentation needs',
    icon: FileText,
    features: [
      '8-12 documentation sections',
      'Standard research depth',
      'PDF & Markdown formats',
      'Basic branding',
      '72-hour delivery',
      'Stack Overflow & GitHub research',
      'Web search integration',
    ],
    config: {
      sections: '8-12' as const,
      sourceDepth: 'standard' as const,
      delivery: 'standard' as const,
      formats: ['pdf', 'markdown'],
      branding: 'basic' as const,
      youtubeOptions: [],
      seoOptions: [],
      enterpriseFeatures: [],
    }
  },
  {
    id: 'professional' as PricingTier,
    name: 'Professional',
    price: 1200,
    description: 'Comprehensive documentation with multimedia',
    icon: Sparkles,
    popular: true,
    features: [
      '13-20 documentation sections',
      'Deep research across all sources',
      'All export formats (PDF, HTML, DOCX, MD, JSON)',
      'Advanced branding & theming',
      '24-hour rush delivery',
      'YouTube integration & transcripts',
      'Complete SEO optimization',
      'Schema markup & metadata',
    ],
    config: {
      sections: '13-20' as const,
      sourceDepth: 'deep' as const,
      delivery: 'rush' as const,
      formats: ['pdf', 'markdown', 'html', 'docx', 'json'],
      branding: 'advanced' as const,
      youtubeOptions: ['youtubeSearch', 'youtubeApi', 'youtubeTranscripts'],
      seoOptions: ['seoMetadata', 'schemaMarkup', 'keywordTargeting', 'sitemapIndexing'],
      enterpriseFeatures: [],
    }
  },
  {
    id: 'enterprise' as PricingTier,
    name: 'Enterprise',
    price: 2500,
    description: 'Premium service with dedicated support',
    icon: Building2,
    features: [
      '20+ comprehensive sections',
      'Maximum research depth',
      'All formats & customization',
      'Premium branded themes',
      'Same-day delivery (12 hours)',
      'Full YouTube & video analysis',
      'Advanced SEO & content refresh',
      'Dedicated account manager',
      '3 revision rounds included',
      'Priority API documentation',
      'Compliance & security docs',
    ],
    config: {
      sections: '20+' as const,
      sourceDepth: 'deep' as const,
      delivery: 'same-day' as const,
      formats: ['pdf', 'markdown', 'html', 'docx', 'json'],
      branding: 'advanced' as const,
      youtubeOptions: ['youtubeSearch', 'youtubeApi', 'youtubeTranscripts'],
      seoOptions: ['seoMetadata', 'schemaMarkup', 'keywordTargeting', 'sitemapIndexing', 'contentRefresh'],
      enterpriseFeatures: ['accountManager', 'revisions', 'apiPriority', 'compliance'],
    }
  }
];

export default function CustomPricingFormWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null);
  const [formData, setFormData, clearFormData] = useLocalStorage<PricingFormData>('docsnap-quote-v1', {
    tier: undefined,
    url: '',
    githubRepo: '',
    sections: '8-12',
    sourceDepth: 'standard',
    delivery: 'standard',
    formats: ['pdf', 'markdown'],
    branding: 'basic',
    customRequirements: '',
    currency: 'USD',
    youtubeOptions: [],
    seoOptions: [],
    enterpriseFeatures: [],
  });

  const { lastSaved } = useAutoSave('docsnap-quote-v1', formData);
  const [pricing, setPricing] = useState<PricingBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [urlValidation, setUrlValidation] = useState<{isValid: boolean; error?: string} | null>(null);
  const [validatingUrl, setValidatingUrl] = useState(false);

  useEffect(() => {
    if (selectedTier || formData.tier) {
      calculatePricing();
    }
  }, [formData, selectedTier]);

  useEffect(() => {
    if (formData.url && formData.url.length > 5) {
      const timer = setTimeout(async () => {
        setValidatingUrl(true);
        const result = await validateURL(formData.url);
        setUrlValidation(result);
        setValidatingUrl(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [formData.url]);

  const calculatePricing = async () => {
    try {
      const response = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: formData.tier,
          sections: formData.sections,
          sourceDepth: formData.sourceDepth,
          delivery: formData.delivery,
          formats: formData.formats,
          branding: formData.branding,
          customRequirements: formData.customRequirements,
          currency: formData.currency,
          youtubeOptions: formData.youtubeOptions,
          seoOptions: formData.seoOptions,
          enterpriseFeatures: formData.enterpriseFeatures,
        }),
      });
      const data = await response.json();
      setPricing(data);
    } catch (error) {
      console.error('Failed to calculate pricing:', error);
    }
  };

  const handleTierSelection = (tier: PricingTier) => {
    setSelectedTier(tier);
    
    if (tier === 'custom') {
      setFormData({
        ...formData,
        tier: 'custom',
      });
    } else {
      const tierConfig = tierPackages.find(t => t.id === tier);
      if (tierConfig) {
        setFormData({
          ...formData,
          tier: tier,
          ...tierConfig.config,
        });
      }
    }
    
    setCurrentStep(1);
  };

  const canGoNext = () => {
    if (currentStep === 0) return selectedTier !== null;
    if (currentStep === 1) return formData.url.length > 0 && (!urlValidation || urlValidation.isValid);
    if (currentStep === 2) return true;
    return false;
  };

  const handleSubmit = async () => {
    if (!formData.url) {
      toast.error('Please enter a website URL');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/consulting/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (data.paypalOrderId) {
        clearFormData();
        window.location.href = data.approvalUrl;
      } else {
        toast.error('Failed to create order');
      }
    } catch (error) {
      console.error('Order submission failed:', error);
      toast.error('Failed to submit order');
    } finally {
      setLoading(false);
    }
  };

  const currencySymbol = formData.currency === 'ZAR' ? 'R' : '$';

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2 mb-8">
              <p className="text-white/70 text-lg">
                Starting at ${tierPackages[0].price} - Professional documentation at a fraction of the cost
              </p>
              <p className="text-white/60 text-sm">
                Compare: Professional technical writers cost $1,500-$6,000 for similar work
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {tierPackages.map((tier) => {
                const Icon = tier.icon;
                const isSelected = selectedTier === tier.id;
                
                return (
                  <div
                    key={tier.id}
                    onClick={() => handleTierSelection(tier.id)}
                    className={`
                      relative cursor-pointer rounded-2xl p-6 transition-all
                      ${isSelected 
                        ? 'bg-white/20 border-2 border-white/60 shadow-2xl scale-105' 
                        : 'bg-white/10 border border-white/20 hover:bg-white/15 hover:border-white/40'
                      }
                    `}
                  >
                    {tier.popular && (
                      <Badge className="absolute -top-3 right-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                        <Star className="w-3 h-3 mr-1" />
                        Most Popular
                      </Badge>
                    )}
                    
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <Icon className="w-10 h-10 text-white/90" />
                        {isSelected && (
                          <CheckCircle2 className="w-6 h-6 text-green-400" />
                        )}
                      </div>
                      
                      <div>
                        <h3 className="text-2xl font-bold text-white">{tier.name}</h3>
                        <p className="text-white/60 text-sm mt-1">{tier.description}</p>
                      </div>
                      
                      <div className="py-3">
                        <span className="text-4xl font-bold text-white">
                          ${tier.price}
                        </span>
                        <span className="text-white/60 ml-2">USD</span>
                      </div>
                      
                      <ul className="space-y-2">
                        {tier.features.slice(0, 5).map((feature, idx) => (
                          <li key={idx} className="flex items-start text-sm text-white/80">
                            <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-green-400" />
                            <span>{feature}</span>
                          </li>
                        ))}
                        {tier.features.length > 5 && (
                          <li className="text-sm text-white/60">
                            +{tier.features.length - 5} more features
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              onClick={() => handleTierSelection('custom')}
              className={`
                cursor-pointer rounded-2xl p-6 transition-all border-2 border-dashed
                ${selectedTier === 'custom'
                  ? 'bg-white/20 border-white/60 shadow-xl'
                  : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/40'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Zap className="w-6 h-6" />
                    Custom Configuration
                  </h3>
                  <p className="text-white/60 text-sm mt-1">
                    Build your own package with exactly the features you need
                  </p>
                </div>
                {selectedTier === 'custom' && (
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                )}
              </div>
            </div>

            {lastSaved && (
              <div className="text-center text-white/50 text-sm">
                Last saved: {lastSaved.toLocaleTimeString()}
              </div>
            )}
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="url" className="text-white font-medium">Website URL *</Label>
                <Input
                  id="url"
                  placeholder="e.g., yourapp.com or https://yourapp.com"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 h-12"
                />
                {validatingUrl && (
                  <p className="text-white/60 text-sm">Validating URL...</p>
                )}
                {urlValidation && !validatingUrl && (
                  <div className={`flex items-center gap-2 text-sm ${urlValidation.isValid ? 'text-green-400' : 'text-red-400'}`}>
                    {urlValidation.isValid ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>URL is valid</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4" />
                        <span>{urlValidation.error}</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="github" className="text-white font-medium">GitHub Repository (Optional)</Label>
                <Input
                  id="github"
                  placeholder="e.g., username/repo"
                  value={formData.githubRepo}
                  onChange={(e) => setFormData({ ...formData, githubRepo: e.target.value })}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 h-12"
                />
                {formData.githubRepo && !isValidGitHubRepo(formData.githubRepo) && (
                  <p className="text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Invalid GitHub repository format
                  </p>
                )}
              </div>
            </div>

            <Separator className="bg-white/10" />

            <div className="space-y-2">
              <Label htmlFor="requirements" className="text-white font-medium">
                Custom Requirements (Optional)
              </Label>
              <Textarea
                id="requirements"
                placeholder="Describe any specific needs, compliance requirements, or special features you need..."
                value={formData.customRequirements}
                onChange={(e) => setFormData({ ...formData, customRequirements: e.target.value })}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 min-h-32"
              />
              <p className="text-white/50 text-sm">
                Mention specific integrations, compliance needs, or documentation style preferences
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <Label className="text-white/70 text-sm">Currency:</Label>
              <Select value={formData.currency} onValueChange={(value: 'USD' | 'ZAR') => setFormData({ ...formData, currency: value })}>
                <SelectTrigger className="w-32 bg-white/10 border-white/20 text-white h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="ZAR">ZAR (R)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="bg-white/5 rounded-lg p-6 space-y-4">
              <h4 className="text-white font-semibold text-lg">Order Summary</h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-white/60">Package</p>
                  <p className="text-white font-medium">
                    {selectedTier === 'custom' ? 'Custom Configuration' : tierPackages.find(t => t.id === selectedTier)?.name}
                  </p>
                </div>
                <div>
                  <p className="text-white/60">Website</p>
                  <p className="text-white font-medium">{formData.url}</p>
                </div>
                {formData.githubRepo && (
                  <div>
                    <p className="text-white/60">GitHub Repository</p>
                    <p className="text-white font-medium">{formData.githubRepo}</p>
                  </div>
                )}
                {formData.customRequirements && (
                  <div className="md:col-span-2">
                    <p className="text-white/60">Custom Requirements</p>
                    <p className="text-white font-medium">{formData.customRequirements.substring(0, 100)}{formData.customRequirements.length > 100 ? '...' : ''}</p>
                  </div>
                )}
              </div>
            </div>

            <DeliveryCalculator 
              deliverySpeed={formData.delivery}
            />

            {pricing && (
              <InteractivePricingBreakdown
                lineItems={[
                  { label: 'Base Package', amount: pricing.basePrice, tooltip: 'Starting price for your selected tier', marketRate: pricing.basePrice * 1.5 },
                  ...(pricing.sectionsAddon > 0 ? [{ label: 'Additional Sections', amount: pricing.sectionsAddon }] : []),
                  ...(pricing.depthAddon > 0 ? [{ label: 'Research Depth', amount: pricing.depthAddon }] : []),
                  ...(pricing.deliveryAddon > 0 ? [{ label: 'Expedited Delivery', amount: pricing.deliveryAddon }] : []),
                  ...(pricing.formatsAddon > 0 ? [{ label: 'Export Formats', amount: pricing.formatsAddon }] : []),
                  ...(pricing.brandingAddon > 0 ? [{ label: 'Advanced Branding', amount: pricing.brandingAddon }] : []),
                  ...(pricing.youtubeAddon > 0 ? [{ label: 'YouTube Integration', amount: pricing.youtubeAddon }] : []),
                  ...(pricing.seoAddon > 0 ? [{ label: 'SEO Optimization', amount: pricing.seoAddon }] : []),
                  ...(pricing.enterpriseFeaturesAddon > 0 ? [{ label: 'Enterprise Features', amount: pricing.enterpriseFeaturesAddon }] : []),
                ]}
                subtotal={pricing.total}
                total={pricing.total}
                currency={formData.currency}
                tierName={pricing.tierName}
              />
            )}
          </div>
        );

      case 3:
        return (
          <div className="text-center space-y-6 py-8">
            <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-full mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Ready to Proceed</h3>
              <p className="text-white/70">
                Click below to complete your order with PayPal
              </p>
            </div>
            {pricing && (
              <div className="bg-white/10 rounded-lg p-6 max-w-md mx-auto">
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Total Amount</span>
                  <span className="text-3xl font-bold text-white">
                    {currencySymbol}{pricing.total.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <ConfigurationWizard
        steps={wizardSteps}
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        onComplete={handleSubmit}
        canGoNext={canGoNext()}
        canGoPrevious={currentStep > 0}
        isLastStep={currentStep === wizardSteps.length - 1}
        completeButtonText={loading ? 'Processing...' : 'Complete Order'}
      >
        {renderStepContent()}
      </ConfigurationWizard>
    </div>
  );
}
