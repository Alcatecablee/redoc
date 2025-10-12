import { Button } from "@/components/ui/button";
import { FileText, Menu, X, LogIn, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/lib/supabaseClient";
import SignInDialog from "@/components/SignInDialog";

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  const navLinks = [
    { name: "Features", href: "#features" },
    { name: "How it Works", href: "#how-it-works" },
    { name: "Pricing", href: "#pricing" },
    { name: "About", href: "#about" },
  ];

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (mounted) setUser(data.user ?? null);
      } catch (e) {
        console.warn('Failed to get supabase user', e);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      listener?.subscription.unsubscribe();
    };
  }, []);

  const signIn = async () => {
    const email = window.prompt('Enter your email to sign in (magic link):');
    if (!email) return;
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      alert('Failed to send sign-in link: ' + error.message);
    } else {
      alert('Magic link sent to ' + email);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              DocSnap
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                {link.name}
              </a>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{user.email}</span>
                <Button variant="ghost" size="sm" onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign Out
                </Button>
              </div>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={signIn}>
                  <LogIn className="mr-2 h-4 w-4" /> Sign In
                </Button>
                <Button size="sm" className="bg-gradient-primary hover:shadow-glow" onClick={signIn}>
                  Get Started
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <div className="flex flex-col gap-4 mt-8">
                {navLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="text-base font-medium text-muted-foreground hover:text-primary transition-colors py-2"
                  >
                    {link.name}
                  </a>
                ))}
                <div className="flex flex-col gap-3 mt-4 pt-4 border-t">
                  {user ? (
                    <Button variant="outline" className="w-full" onClick={signOut}>
                      <LogOut className="mr-2 h-4 w-4" /> Sign Out
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" className="w-full" onClick={signIn}>
                        <LogIn className="mr-2 h-4 w-4" /> Sign In
                      </Button>
                      <Button className="w-full bg-gradient-primary" onClick={signIn}>
                        Get Started
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;
