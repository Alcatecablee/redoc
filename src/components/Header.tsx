import { Button } from "@/components/ui/button";
import { FileText, Menu, X, LogIn, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/lib/supabaseClient";
import SignInDialog from "@/components/SignInDialog";

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showSignIn, setShowSignIn] = useState(false);

  // Landing anchors tailored to the product capabilities
  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Pipeline", href: "#pipeline" },
    { name: "Quality", href: "#quality" },
    { name: "Exports", href: "#exports" },
    { name: "Security", href: "#security" },
    { name: "Features", href: "#features" },
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
      <header className="fixed top-0 left-0 right-0 z-50 w-full">
        <div className="absolute inset-0 bg-gradient-to-r from-[rgb(36,77,91)]/90 via-[rgb(40,85,100)]/90 to-[rgb(36,77,91)]/90 backdrop-blur-xl border-b border-white/10"></div>
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 md:h-18 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">
                DocSnap
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <a 
                  key={link.name} 
                  href={link.href} 
                  className="relative px-4 py-2 text-sm font-medium text-white/80 hover:text-white transition-all duration-300 rounded-xl hover:bg-white/10 backdrop-blur-sm group"
                >
                  <span className="relative z-10">{link.name}</span>
                </a>
              ))}
              {user ? (
                <a 
                  href="/dashboard" 
                  className="relative px-4 py-2 text-sm font-medium text-white/80 hover:text-white transition-all duration-300 rounded-xl hover:bg-white/10 backdrop-blur-sm group"
                >
                  <span className="relative z-10">Dashboard</span>
                </a>
              ) : null}
            </nav>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                    <span className="text-sm font-medium text-white/90">{user.email?.split('@')[0] || 'User'}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={signOut}
                    className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 backdrop-blur-sm transition-all duration-300 rounded-xl"
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Sign Out
                  </Button>
                </div>
              ) : (
                <Button 
                  size="sm" 
                  onClick={signIn}
                  className="px-6 py-2 bg-white text-[rgb(36,77,91)] hover:bg-white/90 font-medium rounded-xl shadow-lg transition-all duration-300 hover:scale-105"
                >
                  Get Started
                </Button>
              )}
            </div>

            {/* Mobile Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300"
                >
                  <Menu className="h-5 w-5 text-white" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[350px] bg-gradient-to-br from-[rgb(36,77,91)]/95 via-[rgb(40,85,100)]/95 to-[rgb(36,77,91)]/95 backdrop-blur-xl border-l border-white/20">
                <div className="flex flex-col gap-2 mt-8">
                  {navLinks.map((link) => (
                    <a 
                      key={link.name} 
                      href={link.href} 
                      onClick={() => setIsOpen(false)} 
                      className="text-base font-medium text-white/80 hover:text-white hover:bg-white/10 backdrop-blur-sm transition-all duration-300 py-3 px-4 rounded-xl min-h-[48px] flex items-center"
                    >
                      {link.name}
                    </a>
                  ))}
                  <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-white/20">
                    {user ? (
                      <>
                        <a 
                          href="/dashboard" 
                          onClick={() => setIsOpen(false)} 
                          className="text-base font-medium text-white/80 hover:text-white hover:bg-white/10 backdrop-blur-sm transition-all duration-300 py-3 px-4 rounded-xl min-h-[48px] flex items-center"
                        >
                          Dashboard
                        </a>
                        <Button 
                          variant="outline" 
                          className="w-full justify-start rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300 text-white" 
                          onClick={signOut}
                        >
                          <LogOut className="mr-2 h-4 w-4" /> Sign Out
                        </Button>
                      </>
                    ) : (
                      <Button 
                        className="w-full rounded-xl bg-white text-[rgb(36,77,91)] hover:bg-white/90 font-medium shadow-lg transition-all duration-300" 
                        onClick={signIn}
                      >
                        Get Started
                      </Button>
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
