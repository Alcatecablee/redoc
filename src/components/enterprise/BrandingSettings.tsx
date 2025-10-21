import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Upload, Save, Palette, Image as ImageIcon, RefreshCw } from 'lucide-react';

interface BrandingConfig {
  logoUrl: string;
  brandColors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  extractedColors: string[];
}

export default function BrandingSettings() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [config, setConfig] = useState<BrandingConfig>({
    logoUrl: '',
    brandColors: {
      primary: '#2563eb',
      secondary: '#64748b',
      accent: '#0ea5e9',
    },
    extractedColors: [],
  });

  React.useEffect(() => {
    const loadConfig = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const response = await fetch('/api/enterprise/branding', {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.config) {
            setConfig({ ...data.config, extractedColors: [] });
          }
        }
      } catch (error) {
        console.error('Failed to load branding config:', error);
      } finally {
        setInitialLoad(false);
      }
    };
    loadConfig();
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (PNG, JPG, or SVG)',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Logo must be smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        setConfig({ ...config, logoUrl: dataUrl });
        
        toast({
          title: 'Logo uploaded',
          description: 'Click "Extract Colors" to automatically detect brand colors',
        });
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const extractColorsFromLogo = async () => {
    if (!config.logoUrl) {
      toast({
        title: 'No logo uploaded',
        description: 'Please upload a logo first',
        variant: 'destructive',
      });
      return;
    }

    setExtracting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const response = await fetch('/api/enterprise/extract-logo-colors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ logoUrl: config.logoUrl }),
      });

      if (!response.ok) throw new Error('Failed to extract colors');

      const data = await response.json();
      
      setConfig({
        ...config,
        extractedColors: data.colors || [],
        brandColors: {
          primary: data.colors[0] || config.brandColors.primary,
          secondary: data.colors[1] || config.brandColors.secondary,
          accent: data.colors[2] || config.brandColors.accent,
        },
      });

      toast({
        title: 'Colors extracted',
        description: `Found ${data.colors.length} brand colors from your logo`,
      });
    } catch (error: any) {
      toast({
        title: 'Extraction failed',
        description: error.message || 'Could not extract colors from logo',
        variant: 'destructive',
      });
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const response = await fetch('/api/enterprise/branding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) throw new Error('Failed to save branding');

      toast({
        title: 'Branding saved',
        description: 'Your brand configuration has been updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error saving branding',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Brand Identity</h2>
          <p className="text-sm text-muted-foreground">
            Upload your logo and customize brand colors for your documentation
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <Label>Company Logo</Label>
            <div className="flex flex-col sm:flex-row gap-4">
              {config.logoUrl && (
                <div className="flex-shrink-0">
                  <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden bg-muted">
                    <img
                      src={config.logoUrl}
                      alt="Logo preview"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                </div>
              )}
              
              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:w-auto gap-2"
                  disabled={loading}
                >
                  <Upload className="h-4 w-4" />
                  {config.logoUrl ? 'Change Logo' : 'Upload Logo'}
                </Button>
                
                {config.logoUrl && (
                  <Button
                    variant="outline"
                    onClick={extractColorsFromLogo}
                    className="w-full sm:w-auto gap-2"
                    disabled={extracting}
                  >
                    <RefreshCw className={`h-4 w-4 ${extracting ? 'animate-spin' : ''}`} />
                    {extracting ? 'Extracting...' : 'Extract Colors'}
                  </Button>
                )}
                
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, or SVG. Max 5MB. Recommended: 512x512px
                </p>
              </div>
            </div>
          </div>

          {config.extractedColors.length > 0 && (
            <div className="p-4 border rounded-lg bg-muted/30">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Extracted Colors
              </h3>
              <div className="flex flex-wrap gap-2">
                {config.extractedColors.map((color, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-2 rounded border bg-background"
                  >
                    <div
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm font-mono">{color}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2"
                      onClick={() => {
                        navigator.clipboard.writeText(color);
                        toast({ title: 'Copied to clipboard' });
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="font-semibold">Brand Colors</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={config.brandColors.primary}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        brandColors: { ...config.brandColors, primary: e.target.value },
                      })
                    }
                    className="w-16 h-10"
                  />
                  <Input
                    value={config.brandColors.primary}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        brandColors: { ...config.brandColors, primary: e.target.value },
                      })
                    }
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondary">Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={config.brandColors.secondary}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        brandColors: { ...config.brandColors, secondary: e.target.value },
                      })
                    }
                    className="w-16 h-10"
                  />
                  <Input
                    value={config.brandColors.secondary}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        brandColors: { ...config.brandColors, secondary: e.target.value },
                      })
                    }
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accent">Accent Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={config.brandColors.accent}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        brandColors: { ...config.brandColors, accent: e.target.value },
                      })
                    }
                    className="w-16 h-10"
                  />
                  <Input
                    value={config.brandColors.accent}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        brandColors: { ...config.brandColors, accent: e.target.value },
                      })
                    }
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSave} disabled={loading} className="gap-2">
              <Save className="h-4 w-4" />
              {loading ? 'Saving...' : 'Save Branding'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
