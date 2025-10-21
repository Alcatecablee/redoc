import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Save, Sparkles } from 'lucide-react';

interface WhiteLabelConfig {
  removeBranding: boolean;
  customProductName: string;
  customSupportEmail: string;
  emailTemplateCustomization: {
    headerText: string;
    footerText: string;
    brandColor: string;
  };
}

export default function WhiteLabelSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [config, setConfig] = useState<WhiteLabelConfig>({
    removeBranding: false,
    customProductName: 'DocSnap',
    customSupportEmail: '',
    emailTemplateCustomization: {
      headerText: 'Documentation Platform',
      footerText: 'Powered by AI',
      brandColor: '#2563eb',
    },
  });

  React.useEffect(() => {
    const loadConfig = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const response = await fetch('/api/enterprise/white-label', {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.config) {
            setConfig(data.config);
          }
        }
      } catch (error) {
        console.error('Failed to load white-label config:', error);
      } finally {
        setInitialLoad(false);
      }
    };
    loadConfig();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const response = await fetch('/api/enterprise/white-label', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) throw new Error('Failed to save settings');

      toast({
        title: 'Settings saved',
        description: 'Your white-label configuration has been updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error saving settings',
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
          <h2 className="text-xl font-semibold mb-2">White-Label Configuration</h2>
          <p className="text-sm text-muted-foreground">
            Customize the appearance and branding of your documentation platform
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <h3 className="font-semibold mb-1 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Remove DocSnap Branding
              </h3>
              <p className="text-sm text-muted-foreground">
                Remove "Powered by DocSnap" from all generated documentation
              </p>
            </div>
            <Switch
              checked={config.removeBranding}
              onCheckedChange={(checked) =>
                setConfig({ ...config, removeBranding: checked })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="productName">Custom Product Name</Label>
            <Input
              id="productName"
              value={config.customProductName}
              onChange={(e) =>
                setConfig({ ...config, customProductName: e.target.value })
              }
              placeholder="Your Product Name"
            />
            <p className="text-xs text-muted-foreground">
              This will replace "DocSnap" in all user-facing areas
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supportEmail">Custom Support Email</Label>
            <Input
              id="supportEmail"
              type="email"
              value={config.customSupportEmail}
              onChange={(e) =>
                setConfig({ ...config, customSupportEmail: e.target.value })
              }
              placeholder="support@yourcompany.com"
            />
            <p className="text-xs text-muted-foreground">
              Support emails will be sent from this address
            </p>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold mb-4">Email Template Customization</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="headerText">Email Header Text</Label>
                <Input
                  id="headerText"
                  value={config.emailTemplateCustomization.headerText}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      emailTemplateCustomization: {
                        ...config.emailTemplateCustomization,
                        headerText: e.target.value,
                      },
                    })
                  }
                  placeholder="Your Company Documentation"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="footerText">Email Footer Text</Label>
                <Textarea
                  id="footerText"
                  value={config.emailTemplateCustomization.footerText}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      emailTemplateCustomization: {
                        ...config.emailTemplateCustomization,
                        footerText: e.target.value,
                      },
                    })
                  }
                  placeholder="© 2025 Your Company. All rights reserved."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brandColor">Email Brand Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="brandColor"
                    type="color"
                    value={config.emailTemplateCustomization.brandColor}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        emailTemplateCustomization: {
                          ...config.emailTemplateCustomization,
                          brandColor: e.target.value,
                        },
                      })
                    }
                    className="w-20 h-10"
                  />
                  <Input
                    value={config.emailTemplateCustomization.brandColor}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        emailTemplateCustomization: {
                          ...config.emailTemplateCustomization,
                          brandColor: e.target.value,
                        },
                      })
                    }
                    placeholder="#2563eb"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSave} disabled={loading} className="gap-2">
              <Save className="h-4 w-4" />
              {loading ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
