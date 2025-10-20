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
import { DollarSign, FileText, Zap, Globe, Palette, Clock, Search, CheckCircle2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface PricingFormData {
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
  total: number;
  currency: string;
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

export default function CustomPricingForm() {
  const [formData, setFormData] = useState<PricingFormData>({
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
  });

  const [pricing, setPricing] = useState<PricingBreakdown | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    calculatePricing();
  }, [formData]);

  const calculatePricing = async () => {
    try {
      const response = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sections: formData.sections,
          sourceDepth: formData.sourceDepth,
          delivery: formData.delivery,
          formats: formData.formats,
          branding: formData.branding,
          customRequirements: formData.customRequirements,
          currency: formData.currency,
          youtubeOptions: formData.youtubeOptions,
          seoOptions: formData.seoOptions,
        }),
      });
      const data = await response.json();
      setPricing(data);
    } catch (error) {
      console.error('Failed to calculate pricing:', error);
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
    <div className="space-y-6">
      {/* Main Configuration Card */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-white mb-2">Configure Your Project</h3>
          <p className="text-white/70">Customize your documentation requirements and get instant pricing</p>
        </div>

        <div className="space-y-8">
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

          <Separator className="bg-white/10" />

          {/* Configuration Options */}
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

          {/* Advanced Options */}
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
                      +{currencySymbol}{option.price}
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
                      +{currencySymbol}{option.price}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Custom Requirements */}
          <div className="space-y-2">
            <Label htmlFor="requirements" className="text-white font-medium">Custom Requirements</Label>
            <Textarea
              id="requirements"
              placeholder="e.g., Focus on SARS compliance, emphasize security features, target enterprise audience..."
              value={formData.customRequirements}
              onChange={(e) => setFormData({ ...formData, customRequirements: e.target.value })}
              rows={4}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 resize-none"
            />
            {formData.customRequirements && (
              <p className="text-sm text-white/60">
                Complex requirements may add up to {currencySymbol}{formData.currency === 'ZAR' ? '1,800' : '100'}
              </p>
            )}
          </div>

          {/* Currency Selection */}
          <div className="space-y-2">
            <Label htmlFor="currency" className="text-white font-medium">Currency</Label>
            <Select value={formData.currency} onValueChange={(value: 'USD' | 'ZAR') => setFormData({ ...formData, currency: value })}>
              <SelectTrigger id="currency" className="bg-white/10 border-white/20 text-white h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD ($) - US Dollar</SelectItem>
                <SelectItem value="ZAR">ZAR (R) - South African Rand</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Pricing Summary */}
      {pricing && (
        <div className="bg-gradient-to-br from-white/15 to-white/10 backdrop-blur-xl border border-white/30 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-white/10 border border-white/20">
              <DollarSign className="w-6 h-6 text-[rgb(142,209,198)]" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">Pricing Breakdown</h3>
              <p className="text-white/70 text-sm">Detailed cost analysis for your project</p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-white/80 pb-3 border-b border-white/10">
              <span>Base Price</span>
              <span className="font-semibold">{currencySymbol}{pricing.basePrice.toLocaleString()}</span>
            </div>
            {pricing.sectionsAddon > 0 && (
              <div className="flex justify-between text-white/70">
                <span>Additional Sections</span>
                <span>+{currencySymbol}{pricing.sectionsAddon.toLocaleString()}</span>
              </div>
            )}
            {pricing.depthAddon > 0 && (
              <div className="flex justify-between text-white/70">
                <span>Research Depth</span>
                <span>+{currencySymbol}{pricing.depthAddon.toLocaleString()}</span>
              </div>
            )}
            {pricing.deliveryAddon > 0 && (
              <div className="flex justify-between text-white/70">
                <span>Faster Delivery</span>
                <span>+{currencySymbol}{pricing.deliveryAddon.toLocaleString()}</span>
              </div>
            )}
            {pricing.formatsAddon > 0 && (
              <div className="flex justify-between text-white/70">
                <span>Export Formats ({formData.formats.length})</span>
                <span>+{currencySymbol}{pricing.formatsAddon.toLocaleString()}</span>
              </div>
            )}
            {pricing.brandingAddon > 0 && (
              <div className="flex justify-between text-white/70">
                <span>Advanced Branding</span>
                <span>+{currencySymbol}{pricing.brandingAddon.toLocaleString()}</span>
              </div>
            )}
            {pricing.youtubeAddon > 0 && (
              <div className="flex justify-between text-white/70">
                <span>YouTube Integration ({formData.youtubeOptions.length})</span>
                <span>+{currencySymbol}{pricing.youtubeAddon.toLocaleString()}</span>
              </div>
            )}
            {pricing.seoAddon > 0 && (
              <div className="flex justify-between text-white/70">
                <span>SEO Optimization ({formData.seoOptions.length})</span>
                <span>+{currencySymbol}{pricing.seoAddon.toLocaleString()}</span>
              </div>
            )}
            {pricing.complexityAddon > 0 && (
              <div className="flex justify-between text-white/70">
                <span>Complex Requirements</span>
                <span>+{currencySymbol}{pricing.complexityAddon.toLocaleString()}</span>
              </div>
            )}
          </div>

          <Separator className="bg-white/20 my-6" />

          <div className="flex justify-between items-center mb-8">
            <div>
              <span className="text-white/70 text-sm block mb-1">Total Project Cost</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white">{currencySymbol}{pricing.total.toLocaleString()}</span>
                <Badge className="bg-white/20 text-white border-0">{pricing.currency}</Badge>
              </div>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading || !formData.url}
            className="w-full h-14 text-lg font-semibold bg-white text-[rgb(36,77,91)] hover:bg-white/90 shadow-lg hover:shadow-xl transition-all"
          >
            {loading ? (
              'Processing...'
            ) : (
              <>
                Generate Custom Documentation
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>

          <div className="flex items-center justify-center gap-6 mt-6 text-white/60 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Secure payment</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Money-back guarantee</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
