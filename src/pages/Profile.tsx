import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '@/lib/queryClient';

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
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

      <div>
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
                  <a href={`/api/export/html/${d.id}`} className="text-sm">HTML</a>
                  <a href={`/api/export/pdf/${d.id}`} className="text-sm">PDF</a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
