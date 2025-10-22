import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';

export default function SignInDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const sendMagicLink = async () => {
    if (!email) return toast({ title: 'Email required', description: 'Please enter your email', variant: 'destructive' });
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);
    if (error) {
      toast({ title: 'Sign-in failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Magic link sent', description: `Check ${email} for a sign-in link` });
      onOpenChange(false);
    }
  };

  const signInWithProvider = async (provider: 'google' | 'github') => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider });
    setLoading(false);
    if (error) {
      toast({ title: 'OAuth failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Redirecting to provider...' });
      onOpenChange(false);
    }
  };

  const signUpWithEmail = async () => {
    if (!email || !password) return toast({ title: 'Missing fields', description: 'Please provide email and password', variant: 'destructive' });
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: 'Sign-up failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Account created', description: `Check ${email} for confirmation or sign-in link` });
      onOpenChange(false);
    }
  };

  const signInWithEmailPassword = async () => {
    if (!email || !password) return toast({ title: 'Missing fields', description: 'Please provide email and password', variant: 'destructive' });
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: 'Sign-in failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Signed in', description: `Welcome ${data.user?.email}` });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden rounded-2xl bg-gradient-to-b from-[rgb(14,19,23)] via-[rgb(24,29,37)] to-[rgb(34,38,46)] border-2 border-[rgb(102,255,228)]/30 text-white shadow-2xl">
        <div className="absolute inset-0 bg-grid-white/[0.04] pointer-events-none" />
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tight text-white">Sign in to DocSnap</DialogTitle>
        </DialogHeader>

        <div className="relative grid gap-4 py-4">
          <Input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder-white/50 rounded-xl"
          />
          <Input
            type="password"
            placeholder="Create a password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder-white/50 rounded-xl"
          />

          <div className="flex gap-2">
            <Button onClick={signInWithEmailPassword} disabled={loading} className="flex-1 h-11 px-6 bg-[rgb(14,19,23)] border-2 border-[rgb(102,255,228)] text-white hover:bg-[rgb(102,255,228)] hover:text-[rgb(14,19,23)] font-bold rounded-full uppercase tracking-wider transition-all duration-150">
              {loading ? 'Signing...' : 'Sign In'}
            </Button>
            <Button variant="outline" onClick={() => { setEmail(''); setPassword(''); onOpenChange(false); }} className="h-11 px-6 rounded-full border-white/30 text-white hover:bg-white/10">
              Cancel
            </Button>
          </div>

          <div className="flex gap-2">
            <Button onClick={signUpWithEmail} variant="ghost" className="flex-1 h-11 px-6 rounded-full text-white hover:bg-white/10">
              Create account
            </Button>
            <Button onClick={sendMagicLink} variant="outline" className="flex-1 h-11 px-6 rounded-full border-white/30 text-white hover:bg-white/10">
              Send Magic Link
            </Button>
          </div>

          <div className="pt-2">
            <div className="text-sm text-white/70 mb-2">Or continue with</div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => signInWithProvider('google')} className="flex-1 h-11 px-6 rounded-full border-white/30 text-white hover:bg-white/10">
                Google
              </Button>
              <Button variant="outline" onClick={() => signInWithProvider('github')} className="flex-1 h-11 px-6 rounded-full border-white/30 text-white hover:bg-white/10">
                GitHub
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <div />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
