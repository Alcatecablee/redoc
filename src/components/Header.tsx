import { Button } from "@/components/ui/button";
import { Menu, X, LogIn, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/lib/supabaseClient";
import SignInDialog from "@/components/SignInDialog";

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showSignIn, setShowSignIn] = useState(false);

  // Navigation links based on actual site sections and pages
  const navLinks = [
    { name: "Demo", href: "#demo" },
    { name: "How It Works", href: "#how-it-works" },
    { name: "Features", href: "#features" },
    { name: "Pricing", href: "/pricing" },
    { name: "Custom Projects", href: "/custom-projects" },
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

  const signIn = () => {
    setShowSignIn(true);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <>
      <SignInDialog open={showSignIn} onOpenChange={setShowSignIn} />
      <header className="fixed top-0 left-0 right-0 z-50 w-full bg-[rgb(34,38,46)] border-b border-[rgb(14,19,23)]">
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="flex h-16 md:h-18 items-center justify-between">
            {/* Logo */}
            <a href="/" className="flex items-center gap-3">
              <img 
                src="/viberdoc-logo.png" 
                alt="Viberdoc" 
                className="h-8 md:h-10"
              />
            </a>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="relative px-3 py-2 text-xs font-bold text-[rgb(228,232,236)] hover:text-white uppercase tracking-widest transition-colors duration-300"
                >
                  {link.name}
                </a>
              ))}
              {user ? (
                <a
                  href="/dashboard"
                  className="relative px-3 py-2 text-xs font-bold text-[rgb(228,232,236)] hover:text-white uppercase tracking-widest transition-colors duration-300"
                >
                  Dashboard
                </a>
              ) : null}
            </nav>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                    <span className="text-xs font-medium text-white/90">{user.email?.split('@')[0] || 'User'}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={signOut}
                    className="px-5 py-1 text-xs font-bold text-white/80 hover:text-white hover:bg-white/10 backdrop-blur-sm transition-all duration-300 rounded-full uppercase tracking-widest border border-[rgb(102,255,228)] border-2"
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Sign Out
                  </Button>
                </div>
              ) : (
                <>
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); signIn(); }}
                    className="px-5 py-1 text-xs font-bold text-white border-2 border-[rgb(102,255,228)] hover:bg-[rgb(102,255,228)] hover:text-[rgb(14,19,23)] rounded-full uppercase tracking-widest transition-all duration-100"
                  >
                    Log In
                  </a>
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); signIn(); }}
                    className="px-5 py-1 text-xs font-bold text-[rgb(14,19,23)] bg-[rgb(102,255,228)] hover:bg-white rounded-full uppercase tracking-widest transition-all duration-100 ml-3"
                  >
                    Sign Up
                  </a>
                </>
              )}
            </div>

            {/* Mobile Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300"
                >
                  <Menu className="h-5 w-5 text-white" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[350px] bg-[rgb(34,38,46)] border-l border-[rgb(14,19,23)]">
                <div className="flex flex-col gap-2 mt-8">
                  {navLinks.map((link) => (
                    <a
                      key={link.name}
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className="text-xs font-bold text-[rgb(228,232,236)] hover:text-white uppercase tracking-widest transition-colors duration-300 py-3 px-4 rounded-lg min-h-[48px] flex items-center"
                    >
                      {link.name}
                    </a>
                  ))}
                  <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-[rgb(14,19,23)]">
                    {user ? (
                      <>
                        <a
                          href="/dashboard"
                          onClick={() => setIsOpen(false)}
                          className="text-xs font-bold text-[rgb(228,232,236)] hover:text-white uppercase tracking-widest transition-colors duration-300 py-3 px-4 rounded-lg min-h-[48px] flex items-center"
                        >
                          Dashboard
                        </a>
                        <Button
                          variant="outline"
                          className="w-full justify-start rounded-full bg-white/10 backdrop-blur-sm border-2 border-[rgb(102,255,228)] hover:bg-white/20 transition-all duration-300 text-white uppercase text-xs font-bold tracking-widest"
                          onClick={signOut}
                        >
                          <LogOut className="mr-2 h-4 w-4" /> Sign Out
                        </Button>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <a
                          href="#"
                          onClick={(e) => { e.preventDefault(); signIn(); setIsOpen(false); }}
                          className="block w-full text-center px-5 py-2 text-xs font-bold text-white border-2 border-[rgb(102,255,228)] hover:bg-[rgb(102,255,228)] hover:text-[rgb(14,19,23)] rounded-full uppercase tracking-widest transition-all duration-100"
                        >
                          Log In
                        </a>
                        <a
                          href="#"
                          onClick={(e) => { e.preventDefault(); signIn(); setIsOpen(false); }}
                          className="block w-full text-center px-5 py-2 text-xs font-bold text-[rgb(14,19,23)] bg-[rgb(102,255,228)] hover:bg-white rounded-full uppercase tracking-widest transition-all duration-100"
                        >
                          Sign Up
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
