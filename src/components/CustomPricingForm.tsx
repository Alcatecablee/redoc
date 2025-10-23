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
import { Card } from '@/components/ui/card';
import { DollarSign, FileText, Zap, Globe, Palette, Clock, Search, CheckCircle2, ArrowRight, Star, Building2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

type PricingTier = 'custom' | 'basic' | 'plus' | 'premium';

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

const formatOptions = [
  { id: 'pdf', label: 'PDF', description: 'Portable Document' },
  { id: 'markdown', label: 'Markdown', description: 'Plain text' },
  { id: 'html', label: 'HTML', description: 'Web format' },
  { id: 'docx', label: 'DOCX', description: 'MS Word' },
  { id: 'json', label: 'JSON', description: 'Structured data' },
];

const youtubeOptions = [
  { id: 'youtubeSearch', label: 'YouTube Search', description: 'Include tutorials and demos', price: 50 },
  { id: 'youtubeApi', label: 'YouTube API', description: 'Rich metadata access', price: 100 },
  { id: 'youtubeTranscripts', label: 'Video Transcripts', description: 'Summarize video content', price: 200 },
];

const seoOptions = [
  { id: 'seoMetadata', label: 'SEO Metadata', description: 'Meta tags & Open Graph', price: 100 },
  { id: 'schemaMarkup', label: 'Schema Markup', description: 'Rich snippets', price: 50 },
  { id: 'keywordTargeting', label: 'Keyword Optimization', description: 'Targeted research', price: 75 },
  { id: 'sitemapIndexing', label: 'Sitemap & Indexing', description: 'XML sitemap', price: 50 },
  { id: 'contentRefresh', label: 'Content Refresh', description: 'Monthly updates', price: 100 },
];

const enterpriseFeatureOptions = [
  { id: 'accountManager', label: 'Dedicated Account Manager', description: 'Personal support & coordination', price: 500 },
  { id: 'revisions', label: 'Multiple Revision Rounds', description: '3 rounds of revisions included', price: 200 },
  { id: 'apiPriority', label: 'API Documentation Priority', description: 'Enhanced API docs focus', price: 300 },
  { id: 'compliance', label: 'Compliance/Security Documentation', description: 'Regulatory & security standards', price: 500 },
];

const tierPackages = [
  {
    id: 'basic' as PricingTier,
    name: 'Project Basic',
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
    id: 'plus' as PricingTier,
    name: 'Project Plus',
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
    id: 'premium' as PricingTier,
    name: 'Project Premium',
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

export default function CustomPricingForm() {
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null);
  const [formData, setFormData] = useState<PricingFormData>({
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

  const [pricing, setPricing] = useState<PricingBreakdown | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedTier) {
      calculatePricing();
    }
  }, [formData, selectedTier]);

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
  };

  const handleFormatToggle = (formatId: string) => {
    setFormData((prev) => ({
      ...prev,
      formats: prev.formats.includes(formatId)
        ? prev.formats.filter((f) => f !== formatId)
        : [...prev.formats, formatId],
    }));
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

  return (
    <div className="space-y-8">
      {/* Pricing Tiers Section */}
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-white">Choose Your Package</h2>
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
                    <p className="text-white/50 text-xs mt-1">
                      ({currencySymbol}{formData.currency === 'ZAR' ? (tier.price * 18).toLocaleString() : tier.price} {formData.currency})
                    </p>
                  </div>
                  
                  <ul className="space-y-2">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start text-sm text-white/80">
                        <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-green-400" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom Configuration Option */}
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
      </div>

      {/* Configuration Form - Only show if a tier is selected */}
      {selectedTier && (
        <>
          <Separator className="bg-white/20" />
          
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">
                {selectedTier === 'custom' ? 'Configure Your Project' : `${tierPackages.find(t => t.id === selectedTier)?.name} Package Details`}
              </h3>
              <p className="text-white/70">
                {selectedTier === 'custom' 
                  ? 'Customize your documentation requirements and get instant pricing'
                  : 'Provide your project details to get started'
                }
              </p>
            </div>

            <div className="space-y-8">
              {/* Currency Selection */}
              <div className="flex items-center justify-end gap-4">
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

              {/* Basic Information */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="url" className="text-white font-medium">Website URL *</Label>
                  <Input
                    id="url"
                    placeholder="e.g., yourapp.com"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 h-12"
                  />
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
                </div>
              </div>

              {/* Custom Configuration Options - Only show for custom tier */}
              {selectedTier === 'custom' && (
                <>
                  <Separator className="bg-white/10" />

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="sections" className="text-white font-medium flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Number of Sections
                      </Label>
                      <Select value={formData.sections} onValueChange={(value: any) => setFormData({ ...formData, sections: value })}>
                        <SelectTrigger id="sections" className="bg-white/10 border-white/20 text-white h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="8-12">8-12 sections (Basic)</SelectItem>
                          <SelectItem value="13-20">13-20 sections (+{currencySymbol}{formData.currency === 'ZAR' ? '3,600' : '200'})</SelectItem>
                          <SelectItem value="20+">20+ sections (+{currencySymbol}{formData.currency === 'ZAR' ? '7,200' : '400'})</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="depth" className="text-white font-medium flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Research Depth
                      </Label>
                      <Select value={formData.sourceDepth} onValueChange={(value: any) => setFormData({ ...formData, sourceDepth: value })}>
                        <SelectTrigger id="depth" className="bg-white/10 border-white/20 text-white h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">Basic (5 sources each)</SelectItem>
                          <SelectItem value="standard">Standard (10 sources, +{currencySymbol}{formData.currency === 'ZAR' ? '900' : '50'})</SelectItem>
                          <SelectItem value="deep">Deep (20 SO/15 GitHub, +{currencySymbol}{formData.currency === 'ZAR' ? '2,700' : '150'})</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="delivery" className="text-white font-medium flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Delivery Speed
                      </Label>
                      <Select value={formData.delivery} onValueChange={(value: any) => setFormData({ ...formData, delivery: value })}>
                        <SelectTrigger id="delivery" className="bg-white/10 border-white/20 text-white h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard (3 days)</SelectItem>
                          <SelectItem value="rush">Rush (1 day, +{currencySymbol}{formData.currency === 'ZAR' ? '1,800' : '100'})</SelectItem>
                          <SelectItem value="same-day">Same Day (12 hours, +{currencySymbol}{formData.currency === 'ZAR' ? '3,600' : '200'})</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="branding" className="text-white font-medium flex items-center gap-2">
                        <Palette className="w-4 h-4" />
                        Branding Level
                      </Label>
                      <Select value={formData.branding} onValueChange={(value: any) => setFormData({ ...formData, branding: value })}>
                        <SelectTrigger id="branding" className="bg-white/10 border-white/20 text-white h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">Basic (Auto-theming)</SelectItem>
                          <SelectItem value="advanced">Advanced (Custom logo + tone, +{currencySymbol}{formData.currency === 'ZAR' ? '1,800' : '100'})</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator className="bg-white/10" />

                  {/* Export Formats */}
                  <div className="space-y-4">
                    <Label className="text-white font-medium flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Export Formats ({currencySymbol}{formData.currency === 'ZAR' ? '900' : '50'} each)
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                      {formatOptions.map((format) => (
                        <div
                          key={format.id}
                          className={`p-4 rounded-xl border cursor-pointer transition-all ${
                            formData.formats.includes(format.id)
                              ? 'bg-white/20 border-white/40'
                              : 'bg-white/5 border-white/20 hover:bg-white/10'
                          }`}
                          onClick={() => handleFormatToggle(format.id)}
                        >
                          <div className="flex items-start space-x-2">
                            <Checkbox
                              id={format.id}
                              checked={formData.formats.includes(format.id)}
                              onCheckedChange={() => handleFormatToggle(format.id)}
                              className="border-white/40 data-[state=checked]:bg-white data-[state=checked]:text-[rgb(36,77,91)]"
                            />
                            <div className="space-y-1">
                              <Label htmlFor={format.id} className="cursor-pointer font-medium text-white text-sm">
                                {format.label}
                              </Label>
                              <p className="text-xs text-white/60">{format.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* YouTube & SEO Options */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-white font-medium flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        YouTube Integration
                      </Label>
                      <div className="space-y-2">
                        {youtubeOptions.map((option) => (
                          <div key={option.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                id={option.id}
                                checked={formData.youtubeOptions.includes(option.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setFormData({ ...formData, youtubeOptions: [...formData.youtubeOptions, option.id] });
                                  } else {
                                    setFormData({ ...formData, youtubeOptions: formData.youtubeOptions.filter((id) => id !== option.id) });
                                  }
                                }}
                                className="border-white/40 data-[state=checked]:bg-white data-[state=checked]:text-[rgb(36,77,91)]"
                              />
                              <div>
                                <Label htmlFor={option.id} className="text-sm font-medium text-white cursor-pointer">
                                  {option.label}
                                </Label>
                                <p className="text-xs text-white/60">{option.description}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs border-white/30 text-white/80">
                              +{currencySymbol}{formData.currency === 'ZAR' ? option.price * 18 : option.price}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-white font-medium flex items-center gap-2">
                        <Search className="w-4 h-4" />
                        SEO Optimization
                      </Label>
                      <div className="space-y-2">
                        {seoOptions.map((option) => (
                          <div key={option.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                id={option.id}
                                checked={formData.seoOptions.includes(option.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setFormData({ ...formData, seoOptions: [...formData.seoOptions, option.id] });
                                  } else {
                                    setFormData({ ...formData, seoOptions: formData.seoOptions.filter((id) => id !== option.id) });
                                  }
                                }}
                                className="border-white/40 data-[state=checked]:bg-white data-[state=checked]:text-[rgb(36,77,91)]"
                              />
                              <div>
                                <Label htmlFor={option.id} className="text-sm font-medium text-white cursor-pointer">
                                  {option.label}
                                </Label>
                                <p className="text-xs text-white/60">{option.description}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs border-white/30 text-white/80">
                              +{currencySymbol}{formData.currency === 'ZAR' ? option.price * 18 : option.price}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Enterprise Features - Show for all tiers */}
              {(selectedTier === 'custom' || selectedTier === 'standard' || selectedTier === 'professional') && (
                <>
                  <Separator className="bg-white/10" />
                  
                  <div className="space-y-4">
                    <div>
                      <Label className="text-white font-medium flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Enterprise Add-Ons
                      </Label>
                      <p className="text-white/60 text-sm mt-1">Premium services for enterprise customers</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      {enterpriseFeatureOptions.map((option) => (
                        <div key={option.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              id={option.id}
                              checked={formData.enterpriseFeatures.includes(option.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFormData({ ...formData, enterpriseFeatures: [...formData.enterpriseFeatures, option.id] });
                                } else {
                                  setFormData({ ...formData, enterpriseFeatures: formData.enterpriseFeatures.filter((id) => id !== option.id) });
                                }
                              }}
                              className="border-white/40 data-[state=checked]:bg-white data-[state=checked]:text-[rgb(36,77,91)]"
                            />
                            <div>
                              <Label htmlFor={option.id} className="text-sm font-medium text-white cursor-pointer">
                                {option.label}
                              </Label>
                              <p className="text-xs text-white/60">{option.description}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs border-white/30 text-white/80">
                            +{currencySymbol}{formData.currency === 'ZAR' ? option.price * 18 : option.price}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Custom Requirements */}
              <div className="space-y-2">
                <Label htmlFor="requirements" className="text-white font-medium">
                  Custom Requirements (Optional)
                </Label>
                <Textarea
                  id="requirements"
                  placeholder="Describe any specific requirements, compliance needs, or special instructions..."
                  value={formData.customRequirements}
                  onChange={(e) => setFormData({ ...formData, customRequirements: e.target.value })}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 min-h-24"
                />
              </div>

              {/* Pricing Breakdown */}
              {pricing && (
                <>
                  <Separator className="bg-white/10" />
                  
                  <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-xl p-6 border border-white/20">
                    <h4 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Pricing Summary
                    </h4>
                    
                    <div className="space-y-2">
                      {pricing.tierName ? (
                        <div className="flex justify-between text-white/90">
                          <span>{pricing.tierName} Package</span>
                          <span className="font-semibold">{currencySymbol}{pricing.basePrice.toLocaleString()}</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between text-white/80">
                            <span>Base Price</span>
                            <span>{currencySymbol}{pricing.basePrice.toLocaleString()}</span>
                          </div>
                          {pricing.sectionsAddon > 0 && (
                            <div className="flex justify-between text-white/70 text-sm">
                              <span>Sections Add-on</span>
                              <span>+{currencySymbol}{pricing.sectionsAddon.toLocaleString()}</span>
                            </div>
                          )}
                          {pricing.depthAddon > 0 && (
                            <div className="flex justify-between text-white/70 text-sm">
                              <span>Research Depth</span>
                              <span>+{currencySymbol}{pricing.depthAddon.toLocaleString()}</span>
                            </div>
                          )}
                          {pricing.deliveryAddon > 0 && (
                            <div className="flex justify-between text-white/70 text-sm">
                              <span>Fast Delivery</span>
                              <span>+{currencySymbol}{pricing.deliveryAddon.toLocaleString()}</span>
                            </div>
                          )}
                          {pricing.formatsAddon > 0 && (
                            <div className="flex justify-between text-white/70 text-sm">
                              <span>Export Formats</span>
                              <span>+{currencySymbol}{pricing.formatsAddon.toLocaleString()}</span>
                            </div>
                          )}
                          {pricing.brandingAddon > 0 && (
                            <div className="flex justify-between text-white/70 text-sm">
                              <span>Advanced Branding</span>
                              <span>+{currencySymbol}{pricing.brandingAddon.toLocaleString()}</span>
                            </div>
                          )}
                          {pricing.youtubeAddon > 0 && (
                            <div className="flex justify-between text-white/70 text-sm">
                              <span>YouTube Integration</span>
                              <span>+{currencySymbol}{pricing.youtubeAddon.toLocaleString()}</span>
                            </div>
                          )}
                          {pricing.seoAddon > 0 && (
                            <div className="flex justify-between text-white/70 text-sm">
                              <span>SEO Optimization</span>
                              <span>+{currencySymbol}{pricing.seoAddon.toLocaleString()}</span>
                            </div>
                          )}
                          {pricing.enterpriseFeaturesAddon > 0 && (
                            <div className="flex justify-between text-white/70 text-sm">
                              <span>Enterprise Features</span>
                              <span>+{currencySymbol}{pricing.enterpriseFeaturesAddon.toLocaleString()}</span>
                            </div>
                          )}
                          {pricing.complexityAddon > 0 && (
                            <div className="flex justify-between text-white/70 text-sm">
                              <span>Complexity</span>
                              <span>+{currencySymbol}{pricing.complexityAddon.toLocaleString()}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    
                    <Separator className="bg-white/20 my-4" />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold text-white">Total</span>
                      <span className="text-3xl font-bold text-white">
                        {currencySymbol}{pricing.total.toLocaleString()} {pricing.currency}
                      </span>
                    </div>
                    
                    {pricing.currency === 'USD' && (
                      <p className="text-white/50 text-xs mt-2 text-right">
                        Approx. R{(pricing.total * 18).toLocaleString()} ZAR
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={loading || !formData.url}
                variant="default"
                size="lg"
                className="w-full"
              >
                {loading ? (
                  'Processing...'
                ) : (
                  <>
                    Proceed to Payment
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>

              <p className="text-white/50 text-center text-sm">
                Secure payment processing via PayPal
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
