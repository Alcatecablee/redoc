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
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 md:h-18 items-center justify-between">
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
            <nav className="hidden md:flex items-center gap-6 lg:gap-8">
              {navLinks.map((link) => (
                <a 
                  key={link.name} 
                  href={link.href} 
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-all duration-200 relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all after:duration-200 hover:after:w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm px-1 py-1"
                >
                  {link.name}
                </a>
              ))}
              {user ? (
                <a 
                  href="/dashboard" 
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-all duration-200 relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all after:duration-200 hover:after:w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm px-1 py-1"
                >
                  Dashboard
                </a>
              ) : null}
            </nav>

            {/* CTA Buttons (minimal) */}
            <div className="hidden md:flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{user.email}</span>
                  <Button variant="ghost" size="sm" onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" /> Sign Out
                  </Button>
                </div>
              ) : (
                <Button size="sm" className="bg-gradient-primary" onClick={signIn}>
                  Get Started
                </Button>
              )}
            </div>

            {/* Mobile Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[350px]">
                <div className="flex flex-col gap-2 mt-8">
                  {navLinks.map((link) => (
                    <a 
                      key={link.name} 
                      href={link.href} 
                      onClick={() => setIsOpen(false)} 
                      className="text-base font-medium text-muted-foreground hover:text-primary hover:bg-accent/50 transition-all duration-200 py-3 px-4 rounded-md min-h-[48px] flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      {link.name}
                    </a>
                  ))}
                  <div className="flex flex-col gap-3 mt-4 pt-4 border-t">
                    {user ? (
                      <>
                        <a 
                          href="/dashboard" 
                          onClick={() => setIsOpen(false)} 
                          className="text-base font-medium text-muted-foreground hover:text-primary hover:bg-accent/50 transition-all duration-200 py-3 px-4 rounded-md min-h-[48px] flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        >
                          Dashboard
                        </a>
                        <Button variant="outline" className="w-full justify-start" onClick={signOut}>
                          <LogOut className="mr-2 h-4 w-4" /> Sign Out
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" className="w-full" onClick={signIn}>
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
