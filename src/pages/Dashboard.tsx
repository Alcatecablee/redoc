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
    <div className="min-h-screen bg-gradient-to-br from-[rgb(14,19,23)] via-[rgb(24,29,37)] to-[rgb(34,38,46)]">
      {/* Background Elements */}
      <div className="fixed inset-0 bg-grid-white/[0.02] opacity-30" />
      <div className="fixed top-1/4 right-1/4 w-96 h-96 bg-gradient-radial from-[rgb(102,255,228)]/5 via-transparent to-transparent blur-3xl" />
      
      <div className="relative container mx-auto px-4 pt-24 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/')} 
              className="gap-2 text-white hover:bg-white/10 border border-white/10 rounded-full px-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-1">Dashboard</h1>
              <p className="text-white/60">Manage your generated documentation</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="default" 
              onClick={() => navigate('/')} 
              className="gap-2 bg-[rgb(102,255,228)] text-[rgb(14,19,23)] hover:bg-[rgb(102,255,228)]/90 font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              <Plus className="h-4 w-4" />
              Generate New Doc
            </Button>
            {user && (
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => { supabase.auth.signOut(); navigate('/'); }}
                className="bg-white/10 text-white hover:bg-white/20 border border-white/20"
              >
                Sign Out
              </Button>
            )}
          </div>
        </div>

      {user && (
        <>
          {/* User Profile Card */}
          <Card className="mb-8 bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <img 
                    src="https://cdn.builder.io/api/v1/image/assets%2Fa5240755456c40cdba09a9a8d717364c%2F538d34938c2641918290a7fc5923f99d?format=webp&width=800" 
                    alt="avatar" 
                    className="h-16 w-16 rounded-full object-cover border-2 border-[rgb(102,255,228)]/40 shadow-lg" 
                  />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[rgb(102,255,228)] border-2 border-[rgb(14,19,23)]"></div>
                </div>
                <div className="flex-1">
                  <CardTitle className="text-2xl text-white mb-1">
                    Welcome back, {user.email?.split('@')[0] || 'User'}
                  </CardTitle>
                  <CardDescription className="text-white/60 text-base">{user.email}</CardDescription>
                </div>
                <div className="flex gap-6">
                  <div className="text-center group">
                    <div className="flex items-center justify-center gap-2 text-white/60 mb-1">
                      <FileCheck className="h-5 w-5 group-hover:text-[rgb(102,255,228)] transition-colors" />
                      <span className="text-sm font-medium">Docs</span>
                    </div>
                    <div className="text-3xl font-bold text-white group-hover:text-[rgb(102,255,228)] transition-colors">{docs.length}</div>
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
          <Card className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[rgb(102,255,228)]"></div>
                <FileText className="h-5 w-5 text-[rgb(102,255,228)]" strokeWidth={1.5} />
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[rgb(102,255,228)]"></div>
              </div>
              <CardTitle className="text-2xl text-white text-center">Your Documentation</CardTitle>
              <CardDescription className="text-white/60 text-center">View and manage your generated docs</CardDescription>
            </CardHeader>
            <CardContent>
              {docs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="relative p-6 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 mb-6 inline-block">
                    <FileText className="h-14 w-14 text-white/50" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">No Documents Yet</h3>
                  <p className="text-white/60 mb-6">Start by generating your first documentation</p>
                  <Button 
                    variant="default" 
                    onClick={() => navigate('/')} 
                    className="gap-2 bg-[rgb(102,255,228)] text-[rgb(14,19,23)] hover:bg-[rgb(102,255,228)]/90 font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    Create Your First Doc
                  </Button>
                </div>
              ) : (
                <ul className="space-y-4">
                  {Array.isArray(docs) && docs.map((d, idx) => (
                    <li key={d.id} className="group relative bg-gradient-to-br from-white/10 to-white/5 border border-white/20 hover:border-[rgb(102,255,228)]/50 rounded-2xl p-5 transition-all duration-500 hover:shadow-[0_15px_40px_rgba(102,255,228,0.15)] hover:scale-[1.02]">
                      {/* Decorative corner */}
                      <div className="absolute top-0 right-0 w-16 h-16 border-t border-r border-white/10 group-hover:border-[rgb(102,255,228)]/30 rounded-tr-2xl transition-colors"></div>
                      
                      <div className="mb-4 relative z-10">
                        <div className="font-bold text-white text-lg truncate mb-2 group-hover:text-[rgb(102,255,228)] transition-colors">{d.title}</div>
                        <div className="text-sm text-white/60 truncate mb-2">{d.url}</div>
                        {d.generatedAt && (
                          <div className="flex items-center gap-2 text-xs text-white/50">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(d.generatedAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 flex-wrap relative z-10">
                        <Button variant="default" size="sm" onClick={() => openDoc(d.id)} className="gap-1 bg-[rgb(102,255,228)] text-[rgb(14,19,23)] hover:bg-[rgb(102,255,228)]/90 font-semibold">
                          <FileText className="h-3.5 w-3.5"/>View
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => downloadBlob(`/api/export/html/${d.id}`, `${(d.title || 'documentation').replace(/[^a-z0-9]/gi, '_')}.html`)} className="gap-1 border-white/30 text-white hover:bg-white/10">
                          <ExternalLink className="h-3.5 w-3.5"/>HTML
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => downloadBlob(`/api/export/pdf/${d.id}`, `${(d.title || 'documentation').replace(/[^a-z0-9]/gi, '_')}.pdf`)} className="gap-1 border-white/30 text-white hover:bg-white/10">
                          <Download className="h-3.5 w-3.5"/>PDF
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => downloadBlob(`/api/export/markdown/${d.id}`, `${(d.title || 'documentation').replace(/[^a-z0-9]/gi, '_')}.md`)} className="text-white/70 hover:text-white hover:bg-white/10">
                          MD
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => downloadBlob(`/api/export/docx/${d.id}`, `${(d.title || 'documentation').replace(/[^a-z0-9]/gi, '_')}.docx`)} className="text-white/70 hover:text-white hover:bg-white/10">
                          DOCX
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => createCustomDomain(d.id)} className="gap-1 border-white/30 text-white hover:bg-white/10">
                          <Globe className="h-3.5 w-3.5"/>Domain
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => deleteDoc(d.id)} className="gap-1 ml-auto bg-red-500/20 text-red-300 hover:bg-red-500/30 border-red-500/30">
                          <Trash2 className="h-3.5 w-3.5"/>
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
            <Card className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl text-white mb-2">{selectedDoc.title}</CardTitle>
                    {selectedDoc.parsedContent?.description && (
                      <CardDescription className="text-white/60 text-base">{selectedDoc.parsedContent.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <BrandKitExtractor onThemeGenerated={(theme) => setViewerTheme(theme)} />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSelectedDoc(null)}
                      className="border-white/30 text-white hover:bg-white/10"
                    >
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
            <Card className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-sm">
              <CardContent className="py-20 text-center">
                <div className="relative p-8 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 mb-8 inline-block">
                  <FileText className="h-20 w-20 text-white/40" strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">No Document Selected</h3>
                <p className="text-white/60 text-base mb-8 max-w-md mx-auto">Select a document from the list to preview its contents and manage exports</p>
                {docs.length === 0 && (
                  <Button 
                    variant="default" 
                    onClick={() => navigate('/')} 
                    className="gap-2 bg-[rgb(102,255,228)] text-[rgb(14,19,23)] hover:bg-[rgb(102,255,228)]/90 font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                  >
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
    </div>
  );
}
