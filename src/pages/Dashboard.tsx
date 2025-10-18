import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, apiRequestBlob } from '@/lib/queryClient';
import { DocumentationViewer } from '@/components/DocumentationViewer';
import { BrandKitExtractor } from '@/components/BrandKitExtractor';
import SubscriptionStatus from '@/components/SubscriptionStatus';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileText, ExternalLink, Trash2, ArrowLeft, Home, Plus, FileCheck, Clock, Globe } from 'lucide-react';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [viewerTheme, setViewerTheme] = useState<any | undefined>(undefined);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        toast({ title: 'Not signed in', description: 'Please sign in to access the dashboard' });
        navigate('/');
        return;
      }
      if (mounted) setUser(data.user);

      try {
        const json = await apiRequest('/api/documentations');
        if (mounted) setDocs(Array.isArray(json) ? json : []);
      } catch (e: any) {
        console.error('Failed to load docs:', e);
        if (mounted) setDocs([]); // Ensure docs is always an array
        toast({ title: 'Failed to load docs', description: e.message || String(e), variant: 'destructive' });
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

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
      // ensure user session
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

  return (
    <div className="container mx-auto px-4 py-20">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
          <h1 className="text-3xl font-bold">Dashboard</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="default" onClick={() => navigate('/')} className="gap-2">
            <Plus className="h-4 w-4" />
            Generate New Doc
          </Button>
          {user && (
            <Button variant="secondary" size="sm" onClick={() => { supabase.auth.signOut(); navigate('/'); }}>
              Sign Out
            </Button>
          )}
        </div>
      </div>

      {user && (
        <>
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center gap-4">
                <img src="https://cdn.builder.io/api/v1/image/assets%2Fa5240755456c40cdba09a9a8d717364c%2F538d34938c2641918290a7fc5923f99d?format=webp&width=800" alt="avatar" className="h-12 w-12 rounded-full object-cover" />
                <div className="flex-1">
                  <CardTitle className="text-lg">Welcome back, {user.email?.split('@')[0] || 'User'}</CardTitle>
                  <CardDescription>{user.email}</CardDescription>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <FileCheck className="h-4 w-4" />
                      <span>Docs</span>
                    </div>
                    <div className="text-2xl font-bold">{docs.length}</div>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
          
          <div className="mb-8">
            <SubscriptionStatus userEmail={user.email} />
          </div>
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Your Documentation</CardTitle>
              <CardDescription>View and manage your generated docs</CardDescription>
            </CardHeader>
            <CardContent>
              {docs.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">No documents generated yet.</p>
                  <Button variant="default" onClick={() => navigate('/')} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Your First Doc
                  </Button>
                </div>
              ) : (
                <ul className="space-y-3">
                  {Array.isArray(docs) && docs.map((d) => (
                    <li key={d.id} className="p-4 rounded-lg bg-[#0b0f17]/60 border border-white/6 hover:border-white/20 transition-colors">
                      <div className="mb-3">
                        <div className="font-semibold truncate mb-1">{d.title}</div>
                        <div className="text-sm text-muted-foreground truncate">{d.url}</div>
                        {d.generatedAt && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3" />
                            {new Date(d.generatedAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button variant="default" size="sm" onClick={() => openDoc(d.id)} className="gap-1">
                          <FileText className="h-3 w-3"/>View
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => downloadBlob(`/api/export/html/${d.id}`, `${(d.title || 'documentation').replace(/[^a-z0-9]/gi, '_')}.html`)} className="gap-1">
                          <ExternalLink className="h-3 w-3"/>HTML
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => downloadBlob(`/api/export/pdf/${d.id}`, `${(d.title || 'documentation').replace(/[^a-z0-9]/gi, '_')}.pdf`)} className="gap-1">
                          <Download className="h-3 w-3"/>PDF
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => downloadBlob(`/api/export/markdown/${d.id}`, `${(d.title || 'documentation').replace(/[^a-z0-9]/gi, '_')}.md`)}>
                          MD
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => downloadBlob(`/api/export/docx/${d.id}`, `${(d.title || 'documentation').replace(/[^a-z0-9]/gi, '_')}.docx`)}>
                          DOCX
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => createCustomDomain(d.id)} className="gap-1">
                          <Globe className="h-3 w-3"/>Domain
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => deleteDoc(d.id)} className="gap-1 ml-auto">
                          <Trash2 className="h-3 w-3"/>
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {selectedDoc ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedDoc.title}</CardTitle>
                    {selectedDoc.parsedContent?.description && (
                      <CardDescription>{selectedDoc.parsedContent.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <BrandKitExtractor onThemeGenerated={(theme) => setViewerTheme(theme)} />
                    <Button variant="outline" size="sm" onClick={() => setSelectedDoc(null)}>
                      Close Preview
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <DocumentationViewer
                  title={selectedDoc.parsedContent.title || selectedDoc.title}
                  description={selectedDoc.parsedContent.description}
                  sections={selectedDoc.parsedContent.sections || []}
                  theme={viewerTheme}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Document Selected</h3>
                <p className="text-muted-foreground mb-6">Select a document from the list to preview its contents</p>
                {docs.length === 0 && (
                  <Button variant="default" onClick={() => navigate('/')} className="gap-2">
                    <Home className="h-4 w-4" />
                    Go to Home & Generate
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
