import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Key, Webhook, MessageSquare, Users, Settings, Palette } from 'lucide-react';
import Header from '@/components/Header';
import APIKeysManagement from '@/components/dashboard/APIKeysManagement';
import WebhooksManagement from '@/components/dashboard/WebhooksManagement';
import SupportTickets from '@/components/dashboard/SupportTickets';
import WhiteLabelSettings from '@/components/enterprise/WhiteLabelSettings';
import BrandingSettings from '@/components/enterprise/BrandingSettings';

export default function EnterpriseSettings() {
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        toast({ 
          title: 'Not signed in', 
          description: 'Please sign in to access enterprise settings' 
        });
        navigate('/');
        return;
      }
      setUser(data.user);
    };
    checkAuth();
  }, []);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[rgb(36,77,91)] via-[rgb(40,85,100)] to-[rgb(36,77,91)]">
      <Header />
      
      <div className="container mx-auto px-4 pt-24 pb-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Enterprise Settings</h1>
            <p className="text-white/70">Manage your advanced features and integrations</p>
          </div>
        </div>

        <Tabs defaultValue="api-keys" className="space-y-6">
          <TabsList className="bg-white/10 border border-white/20">
            <TabsTrigger value="api-keys" className="gap-2">
              <Key className="h-4 w-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="gap-2">
              <Webhook className="h-4 w-4" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="support" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Support
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2">
              <Users className="h-4 w-4" />
              Team
            </TabsTrigger>
            <TabsTrigger value="branding" className="gap-2">
              <Palette className="h-4 w-4" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="api-keys">
            <APIKeysManagement />
          </TabsContent>

          <TabsContent value="webhooks">
            <WebhooksManagement />
          </TabsContent>

          <TabsContent value="support">
            <SupportTickets />
          </TabsContent>

          <TabsContent value="team">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-2">Team Collaboration</h2>
              <p className="text-muted-foreground mb-4">
                Invite team members, manage roles, and collaborate on documentation projects.
              </p>
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Team collaboration features coming soon!</p>
                <p className="text-sm mt-2">Create organizations, invite members, and manage permissions.</p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="branding">
            <BrandingSettings />
          </TabsContent>

          <TabsContent value="settings">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-2">Advanced Settings</h2>
              <p className="text-muted-foreground mb-4">
                Configure advanced enterprise features including SSO, white-label options, and AI voice customization.
              </p>
              <div className="space-y-6 mt-6">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-1">Single Sign-On (SSO)</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Enable SSO with SAML providers like Okta, Azure AD, or Google Workspace
                  </p>
                  <Button variant="outline" disabled>Configure SSO (Coming Soon)</Button>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-1">AI Voice Customization</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Choose from premium AI voices for documentation narration
                  </p>
                  <Button variant="outline" disabled>Select AI Voice (Coming Soon)</Button>
                </div>
                
                <div className="col-span-full">
                  <WhiteLabelSettings />
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-1">Hosted Help Centers</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Create and host comprehensive help centers with custom domains
                  </p>
                  <Button variant="outline" disabled>Create Help Center (Coming Soon)</Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
