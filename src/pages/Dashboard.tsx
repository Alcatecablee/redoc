import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, apiRequestBlob } from '@/lib/queryClient';
import { DocumentationViewer } from '@/components/DocumentationViewer';
import { BrandKitExtractor } from '@/components/BrandKitExtractor';

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
        if (mounted) setDocs(json || []);
      } catch (e: any) {
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

  return (
    <div className="container mx-auto px-4 py-20">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      {user && (
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <p className="font-medium">{user.email}</p>
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
                <li key={d.id} className="p-4 rounded-lg glass-effect flex justify-between items-center">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{d.title}</div>
                    <div className="text-sm text-muted-foreground truncate">{d.url}</div>
                    {d.generatedAt && <div className="text-xs text-muted-foreground">Generated: {new Date(d.generatedAt).toLocaleString()}</div>}
                  </div>
                  <div className="flex gap-2 items-center">
                    <button onClick={() => openDoc(d.id)} className="text-sm underline">Open</button>
                    <button onClick={() => downloadBlob(`/api/export/html/${d.id}`, `${(d.title || 'documentation').replace(/[^a-z0-9]/gi, '_')}.html`)} className="text-sm">HTML</button>
                    <button onClick={() => downloadBlob(`/api/export/pdf/${d.id}`, `${(d.title || 'documentation').replace(/[^a-z0-9]/gi, '_')}.pdf`)} className="text-sm">PDF</button>
                    <button onClick={() => downloadBlob(`/api/export/markdown/${d.id}`, `${(d.title || 'documentation').replace(/[^a-z0-9]/gi, '_')}.md`)} className="text-sm">MD</button>
                    <button onClick={() => downloadBlob(`/api/export/docx/${d.id}`, `${(d.title || 'documentation').replace(/[^a-z0-9]/gi, '_')}.docx`)} className="text-sm">DOCX</button>
                    <button onClick={() => deleteDoc(d.id)} className="text-sm text-red-600">Delete</button>
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
                  <button className="btn" onClick={() => setSelectedDoc(null)}>Close</button>
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
