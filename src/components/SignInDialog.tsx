import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SignInDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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
    if (!email || !password) {
      return toast({ 
        title: 'Missing fields', 
        description: 'Please provide email and password', 
        variant: 'destructive' 
      });
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: 'Sign-up failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ 
        title: 'Account created!', 
        description: 'Check your email for confirmation link' 
      });
      onOpenChange(false);
    }
  };

  const signInWithEmailPassword = async () => {
    if (!email || !password) {
      return toast({ 
        title: 'Missing fields', 
        description: 'Please provide email and password', 
        variant: 'destructive' 
      });
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: 'Sign-in failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Welcome back!', description: `Signed in as ${data.user?.email}` });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden rounded-3xl bg-gradient-to-br from-[rgb(14,19,23)] via-[rgb(24,29,37)] to-[rgb(34,38,46)] border-2 border-[rgb(102,255,228)]/40 text-white shadow-2xl p-0">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none opacity-50" />
        
        {/* Glow Effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-48 bg-gradient-radial from-[rgb(102,255,228)]/10 via-transparent to-transparent blur-3xl pointer-events-none" />

        <div className="relative p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-3xl font-black tracking-tight text-white text-center">
              Welcome to <span className="text-[rgb(102,255,228)]">Viberdoc</span>
            </DialogTitle>
            <p className="text-white/60 text-center text-sm mt-2 font-light">
              Generate beautiful documentation in minutes
            </p>
          </DialogHeader>

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10 rounded-full p-1 mb-6">
              <TabsTrigger 
                value="signin" 
                className="rounded-full data-[state=active]:bg-[rgb(102,255,228)] data-[state=active]:text-[rgb(14,19,23)] data-[state=active]:font-bold text-white/70 transition-all"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger 
                value="signup" 
                className="rounded-full data-[state=active]:bg-[rgb(102,255,228)] data-[state=active]:text-[rgb(14,19,23)] data-[state=active]:font-bold text-white/70 transition-all"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>

            {/* Sign In Tab */}
            <TabsContent value="signin" className="space-y-4 mt-0">
              <div className="space-y-3">
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && email && password) {
                      signInWithEmailPassword();
                    }
                  }}
                  className="h-12 bg-white/10 border-white/20 text-white placeholder-white/50 rounded-xl focus:border-[rgb(102,255,228)] focus:ring-2 focus:ring-[rgb(102,255,228)]/20 transition-all"
                />
                <Input
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && email && password) {
                      signInWithEmailPassword();
                    }
                  }}
                  className="h-12 bg-white/10 border-white/20 text-white placeholder-white/50 rounded-xl focus:border-[rgb(102,255,228)] focus:ring-2 focus:ring-[rgb(102,255,228)]/20 transition-all"
                />
              </div>

              <Button 
                onClick={signInWithEmailPassword} 
                disabled={loading} 
                className="w-full h-12 bg-gradient-to-r from-[rgb(102,255,228)] to-[rgb(102,255,228)]/90 hover:from-white hover:to-white/95 text-[rgb(14,19,23)] font-bold rounded-full uppercase tracking-wider transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>

              {/* Divider */}
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[rgb(24,29,37)] px-3 text-white/50 uppercase tracking-wider font-medium">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* OAuth Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => signInWithProvider('google')} 
                  disabled={loading}
                  className="h-12 border-white/20 text-white hover:bg-white/10 hover:border-[rgb(102,255,228)]/50 rounded-xl transition-all font-medium"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => signInWithProvider('github')} 
                  disabled={loading}
                  className="h-12 border-white/20 text-white hover:bg-white/10 hover:border-[rgb(102,255,228)]/50 rounded-xl transition-all font-medium"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                  GitHub
                </Button>
              </div>
            </TabsContent>

            {/* Sign Up Tab */}
            <TabsContent value="signup" className="space-y-4 mt-0">
              <div className="space-y-3">
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && email && password) {
                      signUpWithEmail();
                    }
                  }}
                  className="h-12 bg-white/10 border-white/20 text-white placeholder-white/50 rounded-xl focus:border-[rgb(102,255,228)] focus:ring-2 focus:ring-[rgb(102,255,228)]/20 transition-all"
                />
                <Input
                  type="password"
                  placeholder="Create a password (min 6 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && email && password) {
                      signUpWithEmail();
                    }
                  }}
                  className="h-12 bg-white/10 border-white/20 text-white placeholder-white/50 rounded-xl focus:border-[rgb(102,255,228)] focus:ring-2 focus:ring-[rgb(102,255,228)]/20 transition-all"
                />
              </div>

              <Button 
                onClick={signUpWithEmail} 
                disabled={loading} 
                className="w-full h-12 bg-gradient-to-r from-[rgb(102,255,228)] to-[rgb(102,255,228)]/90 hover:from-white hover:to-white/95 text-[rgb(14,19,23)] font-bold rounded-full uppercase tracking-wider transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>

              {/* Divider */}
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[rgb(24,29,37)] px-3 text-white/50 uppercase tracking-wider font-medium">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* OAuth Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => signInWithProvider('google')} 
                  disabled={loading}
                  className="h-12 border-white/20 text-white hover:bg-white/10 hover:border-[rgb(102,255,228)]/50 rounded-xl transition-all font-medium"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => signInWithProvider('github')} 
                  disabled={loading}
                  className="h-12 border-white/20 text-white hover:bg-white/10 hover:border-[rgb(102,255,228)]/50 rounded-xl transition-all font-medium"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                  GitHub
                </Button>
              </div>

              <p className="text-xs text-white/50 text-center pt-2 font-light">
                By signing up, you agree to our Terms of Service
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
