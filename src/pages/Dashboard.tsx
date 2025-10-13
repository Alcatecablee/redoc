import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, apiRequestBlob } from '@/lib/queryClient';
import { DocumentationViewer } from '@/components/DocumentationViewer';
import { BrandKitExtractor } from '@/components/BrandKitExtractor';
import { Button } from '@/components/ui/button';
import { Download, FileText, ExternalLink, Trash2, FileX } from 'lucide-react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { LoadingState, DocumentListSkeleton } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [viewerTheme, setViewerTheme] = useState<any | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
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
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const openDoc = async (id: number) => {
    setIsLoadingDoc(true);
    try {
      const doc = await apiRequest(`/api/documentations/${id}`);
      const parsed = typeof doc.content === 'string' ? JSON.parse(doc.content) : doc.content;
      setSelectedDoc({ ...doc, parsedContent: parsed });
      setViewerTheme(parsed.theme || undefined);
    } catch (e: any) {
      toast({ title: 'Failed to open doc', description: e.message || String(e), variant: 'destructive' });
    } finally {
      setIsLoadingDoc(false);
    }
  };

  const handleDeleteClick = (id: number) => {
    setDocToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!docToDelete) return;
    
    try {
      await apiRequest(`/api/documentations/${docToDelete}`, { method: 'DELETE' });
      setDocs((prev) => prev.filter((d) => d.id !== docToDelete));
      if (selectedDoc?.id === docToDelete) setSelectedDoc(null);
      toast({ title: 'Deleted', description: 'Documentation deleted successfully' });
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e.message || String(e), variant: 'destructive' });
    } finally {
      setDocToDelete(null);
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
      toast({ title: 'Download failed', description: err?.message || 'Failed to download file', variant: 'destructive' });
    }
  };

  return (
    <div className="container mx-auto px-4 py-20">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      {user && (
        <div className="mb-6 flex items-center gap-4">
          <img src="https://cdn.builder.io/api/v1/image/assets%2Fa5240755456c40cdba09a9a8d717364c%2F538d34938c2641918290a7fc5923f99d?format=webp&width=800" alt="avatar" className="h-12 w-12 rounded-full object-cover" />
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Welcome back</p>
            <p className="font-medium">{user.email}</p>
          </div>
          <div>
            <Button variant="secondary" size="sm" onClick={() => { supabase.auth.signOut(); navigate('/'); }}>Sign Out</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <h2 className="text-xl font-semibold mb-3">Your Generated Docs</h2>
          {isLoading ? (
            <DocumentListSkeleton />
          ) : docs.length === 0 ? (
            <EmptyState
              icon={FileX}
              title="No documents yet"
              description="Generate your first documentation by visiting the homepage and entering a website URL."
              action={{
                label: "Generate Documentation",
                onClick: () => navigate('/')
              }}
              showCard
            />
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
                    <Button variant="ghost" size="sm" onClick={() => downloadBlob(`/api/export/markdown/${d.id}`, `${(d.title || 'documentation').replace(/[^a-z0-9]/gi, '_')}.md`)}>
                      MD
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => downloadBlob(`/api/export/docx/${d.id}`, `${(d.title || 'documentation').replace(/[^a-z0-9]/gi, '_')}.docx`)}>
                      DOCX
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(d.id)}>
                      <Trash2 className="h-4 w-4"/>Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-2">
          {isLoadingDoc ? (
            <LoadingState 
              message="Loading document..." 
              size="lg" 
              showCard 
              className="min-h-[400px]" 
            />
          ) : selectedDoc ? (
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
                  <Button variant="outline" onClick={() => setSelectedDoc(null)}>Close</Button>
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
            <EmptyState
              icon={FileText}
              title="Select a document"
              description="Choose a document from the list to preview its contents and download in various formats."
              showCard
              className="min-h-[400px]"
            />
          )}
        </div>
      </div>

      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Documentation"
        description="Are you sure you want to delete this documentation? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </div>
  );
}
