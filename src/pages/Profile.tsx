import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '@/lib/queryClient';
import { DocumentationViewer } from '@/components/DocumentationViewer';
import { BrandKitExtractor } from '@/components/BrandKitExtractor';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [viewerTheme, setViewerTheme] = useState<any | undefined>(undefined);
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
        const json = await apiRequest('/api/documentations');
        setDocs(json || []);
      } catch (e: any) {
        toast({ title: 'Failed to load docs', description: e.message || String(e), variant: 'destructive' });
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

  return (
    <div className="container mx-auto px-4 py-20">
      <h1 className="text-3xl font-bold mb-6">Profile</h1>
      {user && (
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">Signed in as</p>
          <p className="font-medium">{user.email}</p>
          <div className="mt-4">
            <Button onClick={signOut}>Sign Out</Button>
          </div>
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
                  <div>
                    <div className="font-semibold">{d.title}</div>
                    <div className="text-sm text-muted-foreground">{d.url}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openDoc(d.id)} className="text-sm underline">Open</button>
                    <a href={`/api/export/html/${d.id}`} className="text-sm">HTML</a>
                    <a href={`/api/export/pdf/${d.id}`} className="text-sm">PDF</a>
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
