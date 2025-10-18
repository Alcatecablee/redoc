import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { DollarSign, FileText, Zap, Globe, Palette, Clock, Search } from 'lucide-react';
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
  { id: 'pdf', label: 'PDF', description: 'Portable Document Format' },
  { id: 'markdown', label: 'Markdown', description: 'Plain text format' },
  { id: 'html', label: 'HTML', description: 'Web format' },
  { id: 'docx', label: 'DOCX', description: 'Microsoft Word format' },
  { id: 'json', label: 'JSON', description: 'Structured data format' },
];

const youtubeOptions = [
  { id: 'youtubeSearch', label: 'YouTube Search', description: 'Include YouTube tutorials and demos', price: 50 },
  { id: 'youtubeApi', label: 'YouTube API Access', description: 'Rich metadata, views, comments', price: 100 },
  { id: 'youtubeTranscripts', label: 'Video Transcripts', description: 'Summarize video content', price: 200 },
];

const seoOptions = [
  { id: 'seoMetadata', label: 'SEO Metadata', description: 'Meta titles, descriptions, Open Graph tags', price: 100 },
  { id: 'schemaMarkup', label: 'Schema Markup', description: 'Structured data for rich snippets', price: 50 },
  { id: 'keywordTargeting', label: 'Keyword Optimization', description: 'Targeted keyword research and optimization', price: 75 },
  { id: 'sitemapIndexing', label: 'Sitemap & Indexing', description: 'XML sitemap and Google Search Console submission', price: 50 },
  { id: 'contentRefresh', label: 'Content Refresh', description: 'Monthly content updates and refresh scheduling', price: 100 },
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
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Custom Documentation Pricing</CardTitle>
          <CardDescription>
            Configure your documentation needs and get instant pricing for professional, AI-generated docs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">Website URL *</Label>
                <Input
                  id="url"
                  placeholder="e.g., taxfy.co.za"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="github">GitHub Repository (Optional)</Label>
                <Input
                  id="github"
                  placeholder="e.g., username/repo"
                  value={formData.githubRepo}
                  onChange={(e) => setFormData({ ...formData, githubRepo: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value: 'USD' | 'ZAR') => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($) - US Dollar</SelectItem>
                    <SelectItem value="ZAR">ZAR (R) - South African Rand</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sections" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Number of Sections
                </Label>
                <Select
                  value={formData.sections}
                  onValueChange={(value: any) => setFormData({ ...formData, sections: value })}
                >
                  <SelectTrigger id="sections">
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
                <Label htmlFor="depth" className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Research Depth
                </Label>
                <Select
                  value={formData.sourceDepth}
                  onValueChange={(value: any) => setFormData({ ...formData, sourceDepth: value })}
                >
                  <SelectTrigger id="depth">
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
                <Label htmlFor="delivery" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Delivery Speed
                </Label>
                <Select
                  value={formData.delivery}
                  onValueChange={(value: any) => setFormData({ ...formData, delivery: value })}
                >
                  <SelectTrigger id="delivery">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard (3 days)</SelectItem>
                    <SelectItem value="rush">Rush (1 day, +{currencySymbol}{formData.currency === 'ZAR' ? '1,800' : '100'})</SelectItem>
                    <SelectItem value="same-day">Same Day (12 hours, +{currencySymbol}{formData.currency === 'ZAR' ? '3,600' : '200'})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Export Formats ({currencySymbol}{formData.currency === 'ZAR' ? '900' : '50'} each)
              </Label>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                {formatOptions.map((format) => (
                  <div
                    key={format.id}
                    className="flex items-start space-x-2 p-3 rounded-lg border hover:bg-accent cursor-pointer"
                    onClick={() => handleFormatToggle(format.id)}
                  >
                    <Checkbox
                      id={format.id}
                      checked={formData.formats.includes(format.id)}
                      onCheckedChange={() => handleFormatToggle(format.id)}
                    />
                    <div className="space-y-1">
                      <Label htmlFor={format.id} className="cursor-pointer font-medium">
                        {format.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{format.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="branding" className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Branding Level
              </Label>
              <Select
                value={formData.branding}
                onValueChange={(value: any) => setFormData({ ...formData, branding: value })}
              >
                <SelectTrigger id="branding">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic (Auto-theming)</SelectItem>
                  <SelectItem value="advanced">Advanced (Custom logo + tone, +{currencySymbol}{formData.currency === 'ZAR' ? '1,800' : '100'})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                YouTube Integration
              </Label>
              <div className="space-y-2">
                {youtubeOptions.map((option) => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={option.id}
                      checked={formData.youtubeOptions.includes(option.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({
                            ...formData,
                            youtubeOptions: [...formData.youtubeOptions, option.id],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            youtubeOptions: formData.youtubeOptions.filter((id) => id !== option.id),
                          });
                        }
                      }}
                    />
                    <div className="flex-1">
                      <Label htmlFor={option.id} className="text-sm font-medium">
                        {option.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      +{currencySymbol}{option.price}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                SEO Optimization
              </Label>
              <div className="space-y-2">
                {seoOptions.map((option) => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={option.id}
                      checked={formData.seoOptions.includes(option.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({
                            ...formData,
                            seoOptions: [...formData.seoOptions, option.id],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            seoOptions: formData.seoOptions.filter((id) => id !== option.id),
                          });
                        }
                      }}
                    />
                    <div className="flex-1">
                      <Label htmlFor={option.id} className="text-sm font-medium">
                        {option.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      +{currencySymbol}{option.price}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Textarea
                id="requirements"
                placeholder="e.g., Focus on SARS compliance, emphasize security features, target enterprise audience..."
                value={formData.customRequirements}
                onChange={(e) => setFormData({ ...formData, customRequirements: e.target.value })}
                rows={4}
              />
              {formData.customRequirements && (
                <p className="text-sm text-muted-foreground">
                  ℹ️ Complex requirements may add up to {currencySymbol}{formData.currency === 'ZAR' ? '1,800' : '100'}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {pricing && (
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-6 h-6" />
              Pricing Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Base Price</span>
                <span>{currencySymbol}{pricing.basePrice.toLocaleString()}</span>
              </div>
              {pricing.sectionsAddon > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Additional Sections</span>
                  <span>+{currencySymbol}{pricing.sectionsAddon.toLocaleString()}</span>
                </div>
              )}
              {pricing.depthAddon > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Research Depth</span>
                  <span>+{currencySymbol}{pricing.depthAddon.toLocaleString()}</span>
                </div>
              )}
              {pricing.deliveryAddon > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Faster Delivery</span>
                  <span>+{currencySymbol}{pricing.deliveryAddon.toLocaleString()}</span>
                </div>
              )}
              {pricing.formatsAddon > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Export Formats ({formData.formats.length})</span>
                  <span>+{currencySymbol}{pricing.formatsAddon.toLocaleString()}</span>
                </div>
              )}
              {pricing.brandingAddon > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Advanced Branding</span>
                  <span>+{currencySymbol}{pricing.brandingAddon.toLocaleString()}</span>
                </div>
              )}
              {pricing.complexityAddon > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Complex Requirements</span>
                  <span>+{currencySymbol}{pricing.complexityAddon.toLocaleString()}</span>
                </div>
              )}
              {pricing.youtubeAddon > 0 && (
                <div className="flex justify-between text-sm">
                  <span>YouTube Integration ({formData.youtubeOptions.length} options)</span>
                  <span>+{currencySymbol}{pricing.youtubeAddon.toLocaleString()}</span>
                </div>
              )}
              {pricing.seoAddon > 0 && (
                <div className="flex justify-between text-sm">
                  <span>SEO Optimization ({formData.seoOptions.length} options)</span>
                  <span>+{currencySymbol}{pricing.seoAddon.toLocaleString()}</span>
                </div>
              )}
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold">Total</span>
              <div className="text-right">
                <div className="text-3xl font-bold text-primary">
                  {currencySymbol}{pricing.total.toLocaleString()}
                </div>
                <Badge variant="secondary" className="mt-1">
                  {pricing.currency}
                </Badge>
              </div>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={loading || !formData.url}
              className="w-full h-12 text-lg"
              size="lg"
            >
              {loading ? 'Processing...' : `Generate Documentation - ${currencySymbol}${pricing.total.toLocaleString()}`}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
