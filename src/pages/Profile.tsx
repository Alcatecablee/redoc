import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { apiRequest, apiRequestBlob } from '@/lib/queryClient';
import { DocumentationViewer } from '@/components/DocumentationViewer';
import { BrandKitExtractor } from '@/components/BrandKitExtractor';
import { Download, FileText, ExternalLink, Trash2, Globe } from 'lucide-react';

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [viewerTheme, setViewerTheme] = useState<any | undefined>(undefined);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        toast({ title: 'Not signed in', description: 'Please sign in to access your profile' });
        navigate('/');
        return;
      }
      setUser(data.user);

      try {
        const [docsData, profileData] = await Promise.all([
          apiRequest('/api/documentations'),
          apiRequest('/api/user/profile')
        ]);
        setDocs(docsData || []);
        setUserProfile(profileData);
      } catch (e: any) {
        toast({ title: 'Failed to load data', description: e.message || String(e), variant: 'destructive' });
      }
    })();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const openDoc = async (id: number) => {
    try {
      const doc = await apiRequest(`/api/documentations/${id}`);
      const parsed = typeof doc.content === 'string' ? JSON.parse(doc.content) : doc.content;
      setSelectedDoc({ ...doc, parsedContent: parsed });
      setViewerTheme(parsed.theme || undefined);
    } catch (e: any) {
      toast({ title: 'Failed to open doc', description: e.message || String(e), variant: 'destructive' });
    }
  };

  const deleteDoc = async (id: number) => {
    if (!confirm('Delete this documentation? This cannot be undone.')) return;
    try {
      await apiRequest(`/api/documentations/${id}`, { method: 'DELETE' });
      setDocs((prev) => prev.filter((d) => d.id !== id));
      if (selectedDoc?.id === id) setSelectedDoc(null);
      toast({ title: 'Deleted', description: 'Documentation deleted' });
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e.message || String(e), variant: 'destructive' });
    }
  };

  const downloadBlob = async (path: string, filename: string) => {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data?.session?.access_token) {
        toast({ title: 'Sign in required', description: 'Please sign in to download files' });
        navigate('/');
        return;
      }
      const blob = await apiRequestBlob(path);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Download failed', err);
      toast({ title: 'Download failed', description: err?.message || 'Failed to download file', variant: 'destructive' });
    }
  };

  const createCustomDomain = async (id: number) => {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data?.session?.access_token) {
        toast({ title: 'Sign in required', description: 'Please sign in to create custom domain' });
        navigate('/');
        return;
      }

      const result = await apiRequest(`/api/export/subdomain/${id}`, { method: 'POST' });
      
      // Copy URL to clipboard
      if (result.url) {
        await navigator.clipboard.writeText(result.url);
        toast({ 
          title: 'Custom Domain Created! 🌐', 
          description: `${result.url} (copied to clipboard)`,
          duration: 5000
        });
      }
    } catch (err: any) {
      console.error('Custom domain creation failed', err);
      toast({ 
        title: 'Failed to create custom domain', 
        description: err?.message || 'An error occurred', 
        variant: 'destructive' 
      });
    }
  };

  const copyApiKey = async () => {
    if (userProfile?.api_key) {
      try {
        await navigator.clipboard.writeText(userProfile.api_key);
        setApiKeyCopied(true);
        toast({ 
          title: 'API Key Copied', 
          description: 'Your API key has been copied to clipboard',
          duration: 3000
        });
        setTimeout(() => setApiKeyCopied(false), 3000);
      } catch (err) {
        toast({ 
          title: 'Failed to copy', 
          description: 'Could not copy API key to clipboard', 
          variant: 'destructive' 
        });
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-20">
      <h1 className="text-3xl font-bold mb-6">Profile</h1>
      {user && (
        <div className="mb-6 space-y-6">
          <div className="flex items-center gap-4">
            <img src="https://cdn.builder.io/api/v1/image/assets%2Fa5240755456c40cdba09a9a8d717364c%2F538d34938c2641918290a7fc5923f99d?format=webp&width=800" alt="avatar" className="h-12 w-12 rounded-full object-cover" />
            <div>
              <p className="text-sm text-muted-foreground">Signed in as</p>
              <p className="font-medium">{user.email}</p>
              <div className="mt-2">
                <Button onClick={signOut} size="sm">Sign Out</Button>
              </div>
            </div>
          </div>

          {userProfile && (
            <div className="bg-[#0b0f17]/60 border border-white/10 rounded-lg p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Subscription</h3>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold capitalize">{userProfile.plan}</span>
                  {userProfile.plan === 'enterprise' && (
                    <span className="px-2 py-1 bg-purple-600/20 border border-purple-500/30 rounded text-purple-300 text-xs font-medium">
                      Premium
                    </span>
                  )}
                  {userProfile.plan === 'pro' && (
                    <span className="px-2 py-1 bg-blue-600/20 border border-blue-500/30 rounded text-blue-300 text-xs font-medium">
                      Active
                    </span>
                  )}
                </div>
                {userProfile.subscription_status && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Status: <span className="capitalize">{userProfile.subscription_status}</span>
                  </p>
                )}
              </div>

              {userProfile.plan === 'enterprise' && userProfile.api_key && (
                <div className="border-t border-white/10 pt-4">
                  <h4 className="font-semibold mb-2">API Access</h4>
                  <div className="bg-[#1a1f2e] border border-white/10 rounded-lg p-4 space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Your API Key</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-black/40 px-3 py-2 rounded text-sm font-mono text-cyan-400 truncate">
                          {userProfile.api_key}
                        </code>
                        <Button 
                          onClick={copyApiKey} 
                          size="sm" 
                          variant="outline"
                          className="min-w-[80px]"
                        >
                          {apiKeyCopied ? 'Copied!' : 'Copy'}
                        </Button>
                      </div>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded p-3">
                      <p className="text-xs text-amber-200/90">
                        <strong className="font-semibold">Security Warning:</strong> Keep your API key secure and never share it publicly. Store it in environment variables when using it in your applications.
                      </p>
                    </div>
                    {userProfile.api_usage > 0 && (
                      <p className="text-sm text-muted-foreground">
                        API Usage: {userProfile.api_usage?.toLocaleString()} tokens
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <h2 className="text-xl font-semibold mb-3">Your Generated Docs</h2>
          {docs.length === 0 ? (
            <p className="text-muted-foreground">No documents generated yet.</p>
          ) : (
            <ul className="space-y-3">
              {docs.map((d) => (
                <li key={d.id} className="p-4 rounded-lg bg-[#0b0f17]/60 border border-white/6 flex justify-between items-center shadow-sm">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{d.title}</div>
                    <div className="text-sm text-muted-foreground truncate">{d.url}</div>
                    {d.generatedAt && <div className="text-xs text-muted-foreground">Generated: {new Date(d.generatedAt).toLocaleString()}</div>}
                  </div>
                  <div className="flex gap-2 items-center">
                    <Button variant="ghost" size="sm" asChild>
                      <a onClick={() => openDoc(d.id)} className="flex items-center gap-2"><FileText className="h-4 w-4"/>Open</a>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => downloadBlob(`/api/export/html/${d.id}`, `${(d.title || 'documentation').replace(/[^a-z0-9]/gi, '_')}.html`)}>
                      <ExternalLink className="h-4 w-4"/>HTML
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => downloadBlob(`/api/export/pdf/${d.id}`, `${(d.title || 'documentation').replace(/[^a-z0-9]/gi, '_')}.pdf`)}>
                      <Download className="h-4 w-4"/>PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => createCustomDomain(d.id)} className="gap-1">
                      <Globe className="h-4 w-4"/>Domain
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteDoc(d.id)}>
                      <Trash2 className="h-4 w-4"/>Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-2">
          {selectedDoc ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold">{selectedDoc.title}</h2>
                  {selectedDoc.parsedContent?.description && (
                    <p className="text-sm text-muted-foreground">{selectedDoc.parsedContent.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <BrandKitExtractor onThemeGenerated={(theme) => setViewerTheme(theme)} />
                  <Button onClick={() => setSelectedDoc(null)}>Close</Button>
                </div>
              </div>

              <DocumentationViewer
                title={selectedDoc.parsedContent.title || selectedDoc.title}
                description={selectedDoc.parsedContent.description}
                sections={selectedDoc.parsedContent.sections || []}
                theme={viewerTheme}
              />
            </div>
          ) : (
            <div className="p-6 rounded-lg border-dashed border-2 border-gray-200 text-center">
              <p className="text-muted-foreground">Select a document to preview its contents</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
