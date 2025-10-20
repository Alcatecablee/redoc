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
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 backdrop-blur-xl border-b border-white/10"></div>
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 md:h-18 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                DocSnap
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <a 
                  key={link.name} 
                  href={link.href} 
                  className="relative px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-all duration-300 rounded-xl hover:bg-white/60 hover:shadow-lg hover:shadow-gray-500/10 group"
                >
                  <span className="relative z-10">{link.name}</span>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </a>
              ))}
              {user ? (
                <a 
                  href="/dashboard" 
                  className="relative px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-all duration-300 rounded-xl hover:bg-white/60 hover:shadow-lg hover:shadow-gray-500/10 group"
                >
                  <span className="relative z-10">Dashboard</span>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </a>
              ) : null}
            </nav>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 rounded-xl bg-white/40 backdrop-blur-sm border border-gray-200/50">
                    <span className="text-sm font-medium text-gray-700">{user.email?.split('@')[0] || 'User'}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={signOut}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-white/60 hover:shadow-lg hover:shadow-gray-500/10 transition-all duration-300 rounded-xl"
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Sign Out
                  </Button>
                </div>
              ) : (
                <Button 
                  size="sm" 
                  onClick={signIn}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-105"
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
                  className="h-10 w-10 rounded-xl bg-white/40 backdrop-blur-sm border border-gray-200/50 hover:bg-white/60 hover:shadow-lg hover:shadow-gray-500/10 transition-all duration-300"
                >
                  <Menu className="h-5 w-5 text-gray-700" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[350px] bg-gradient-to-br from-blue-50/90 via-purple-50/90 to-pink-50/90 backdrop-blur-xl border-l border-white/20">
                <div className="flex flex-col gap-2 mt-8">
                  {navLinks.map((link) => (
                    <a 
                      key={link.name} 
                      href={link.href} 
                      onClick={() => setIsOpen(false)} 
                      className="text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-white/60 hover:shadow-lg hover:shadow-gray-500/10 transition-all duration-300 py-3 px-4 rounded-xl min-h-[48px] flex items-center group"
                    >
                      <span className="relative z-10">{link.name}</span>
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </a>
                  ))}
                  <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-gray-200/50">
                    {user ? (
                      <>
                        <a 
                          href="/dashboard" 
                          onClick={() => setIsOpen(false)} 
                          className="text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-white/60 hover:shadow-lg hover:shadow-gray-500/10 transition-all duration-300 py-3 px-4 rounded-xl min-h-[48px] flex items-center group"
                        >
                          <span className="relative z-10">Dashboard</span>
                          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </a>
                        <Button 
                          variant="outline" 
                          className="w-full justify-start rounded-xl bg-white/40 backdrop-blur-sm border border-gray-200/50 hover:bg-white/60 hover:shadow-lg hover:shadow-gray-500/10 transition-all duration-300" 
                          onClick={signOut}
                        >
                          <LogOut className="mr-2 h-4 w-4" /> Sign Out
                        </Button>
                      </>
                    ) : (
                      <Button 
                        className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300" 
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
