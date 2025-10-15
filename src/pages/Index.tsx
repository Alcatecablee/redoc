import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, FileText, ExternalLink, Download, Zap, Shield, CheckCircle2, Globe, Search, Layers, BookOpen, Palette, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, apiRequestBlob } from "@/lib/queryClient";
import Header from "@/components/Header";
import SignInDialog from "@/components/SignInDialog";
import { supabase } from "@/lib/supabaseClient";
import Footer from "@/components/Footer";
import { DocumentationViewer } from "@/components/DocumentationViewer";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { ThemeBuilder } from "@/components/ThemeBuilder";
import { BrandKitExtractor } from "@/components/BrandKitExtractor";
import { getDefaultTheme, Theme } from "../../shared/themes";

function convertToViewerTheme(theme: Theme) {
  return {
    primaryColor: theme.colors.primary,
    secondaryColor: theme.colors.secondary,
    accentColor: theme.colors.accent,
    colors: Object.values(theme.colors),
    fonts: [theme.typography.font_family, theme.typography.heading_font, theme.typography.code_font],
    primaryFont: theme.typography.font_family
  };
}

const Index = () => {
  const [url, setUrl] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState<number>(0);
  const [currentStageName, setCurrentStageName] = useState<string>("");
  const [currentStageDesc, setCurrentStageDesc] = useState<string>("");
  const [generatedDoc, setGeneratedDoc] = useState<any>(null);
  const [selectedTheme, setSelectedTheme] = useState<Theme>(getDefaultTheme());
  const { toast } = useToast();
  const [showSignIn, setShowSignIn] = useState(false);

  const stages = [
    { id: 1, name: "Site Discovery", description: "Multi-domain crawling and content mapping" },
    { id: 2, name: "Research & Analysis", description: "External research and community insights" },
    { id: 3, name: "Documentation Generation", description: "Professional content creation and structuring" },
    { id: 4, name: "Export & Optimization", description: "Multi-format export with theme application" }
  ];

  const generateMutation = useMutation({
    mutationFn: async ({ url, sessionId, subdomain }: { url: string; sessionId: string; subdomain?: string }) => {
      return apiRequest("/api/generate-docs", {
        method: "POST",
        body: JSON.stringify({ url, sessionId, subdomain }),
      });
    },
    onSuccess: (data) => {
      setProgress(100);
      setGeneratedDoc(data);
      toast({
        title: "Documentation Generated!",
        description: "Your professional documentation is ready",
      });
    },
    onError: (error: Error) => {
      console.error('Error generating documentation:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate documentation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGenerate = async () => {
    // Check auth
    try {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        setShowSignIn(true);
        toast({ title: 'Sign in required', description: 'Please sign in to generate documentation' });
        return;
      }
    } catch (e) {
      console.warn('Auth check failed', e);
      setShowSignIn(true);
      return;
    }

    if (!url) {
      toast({
        title: "URL Required",
        description: "Please enter a valid website URL",
        variant: "destructive",
      });
      return;
    }

    setProgress(0);
    setCurrentStage(0);

    // Generate a unique session ID
    const sessionId = crypto.randomUUID();

    // Connect to SSE endpoint for real-time progress
    const eventSource = new EventSource(`/api/progress/${sessionId}`);

    eventSource.onmessage = (event) => {
      try {
        const progressData = JSON.parse(event.data);
        console.log('Progress update:', progressData);
        setCurrentStage(progressData.stage);
        setProgress(progressData.progress);
        setCurrentStageName(progressData.stageName || "");
        setCurrentStageDesc(progressData.description || "");
      } catch (e) {
        console.error('Failed to parse progress event:', e);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      eventSource.close();
    };

    try {
      await generateMutation.mutateAsync({ url, sessionId, subdomain: subdomain || undefined });
    } finally {
      eventSource.close();
    }
  };

  const downloadBlob = async (path: string, filename: string) => {
    try {
      // Ensure user is signed in and we have an access token
      try {
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token;
        if (!token) {
          setShowSignIn(true);
          toast({ title: 'Sign in required', description: 'Please sign in to download generated files' });
          return;
        }
      } catch (err) {
        console.warn('Failed to get supabase session before download', err);
        setShowSignIn(true);
        toast({ title: 'Sign in required', description: 'Please sign in to download generated files' });
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
      console.error('Download failed', err);
      toast({ title: 'Download failed', description: err?.message || 'Failed to download file', variant: 'destructive' });
    }
  };

  const handleDownloadPDF = () => {
    if (!generatedDoc?.id) return;
    const filename = `${generatedDoc.title ? generatedDoc.title.replace(/[^a-z0-9]/gi, '_') : 'documentation'}.pdf`;
    downloadBlob(`/api/export/pdf/${generatedDoc.id}`, filename);
  };

  const handleDownloadDOCX = () => {
    if (!generatedDoc?.id) return;
    const filename = `${generatedDoc.title ? generatedDoc.title.replace(/[^a-z0-9]/gi, '_') : 'documentation'}.docx`;
    downloadBlob(`/api/export/docx/${generatedDoc.id}`, filename);
  };

  const handleDownloadMarkdown = () => {
    if (!generatedDoc?.id) return;
    const filename = `${generatedDoc.title ? generatedDoc.title.replace(/[^a-z0-9]/gi, '_') : 'documentation'}.md`;
    downloadBlob(`/api/export/markdown/${generatedDoc.id}`, filename);
  };

  const handleDownloadHTML = () => {
    if (!generatedDoc?.id) return;
    const filename = `${generatedDoc.title ? generatedDoc.title.replace(/[^a-z0-9]/gi, '_') : 'documentation'}.html`;
    downloadBlob(`/api/export/html/${generatedDoc.id}`, filename);
  };

  const handleDownloadJSON = () => {
    if (!generatedDoc?.id) return;
    const filename = `${generatedDoc.title ? generatedDoc.title.replace(/[^a-z0-9]/gi, '_') : 'documentation'}.json`;
    downloadBlob(`/api/export/json/${generatedDoc.id}`, filename);
  };

  const handleBatchExport = () => {
    if (!generatedDoc?.id) return;
    const filename = `${generatedDoc.title ? generatedDoc.title.replace(/[^a-z0-9]/gi, '_') : 'documentation'}_documentation.zip`;
    downloadBlob(`/api/export/batch/${generatedDoc.id}`, filename);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <SignInDialog open={showSignIn} onOpenChange={setShowSignIn} />

      {/* Hero Section (Lovable-style) */}
      <section
        className="relative overflow-hidden min-h-[80vh] flex items-center"
        style={{
          backgroundImage: `linear-gradient(rgba(6,8,15,0.65), rgba(6,8,15,0.65)), url('https://cdn.builder.io/api/v1/image/assets%2Fa5240755456c40cdba09a9a8d717364c%2F1f853cf5f2c84b1fbfe37b8beeaf6e15?format=webp&width=800')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="container mx-auto px-4 py-24 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Centered large input card */}
            <div className="mt-6">
              <div className="mx-auto max-w-3xl bg-[#0b0f17]/70 backdrop-blur rounded-2xl shadow-xl border border-white/6 p-6">
                <div className="text-left md:text-center">
                  <h1 className="text-3xl md:text-4xl font-bold text-white">Enterprise Documentation Generator</h1>
                  <p className="text-sm text-white/80 mt-2">Transform any website into comprehensive, professional documentation in seconds.</p>
                </div>

                <div className="mt-6">
                  <div className="flex items-center gap-3">
                    <Input
                      type="url"
                      placeholder="https://yourapp.com"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="flex-1 h-14 text-base bg-white/5 placeholder-white/60 border border-white/8 focus-visible:border-primary/60 focus-visible:ring-primary/20 transition-all rounded-lg px-4"
                      disabled={generateMutation.isPending}
                      data-testid="input-url"
                    />
                    <Button
                      onClick={handleGenerate}
                      disabled={generateMutation.isPending}
                      size="lg"
                      className="h-14 px-6 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg"
                      data-testid="button-generate"
                    >
                      {generateMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <FileText className="mr-2 h-5 w-5" />
                          Generate
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {/* Optional subdomain input */}
                  <div className="mt-3">
                    <Input
                      type="text"
                      placeholder="Custom subdomain (optional, e.g., my-docs)"
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="h-12 text-sm bg-white/5 placeholder-white/50 border border-white/8 focus-visible:border-primary/60 focus-visible:ring-primary/20 transition-all rounded-lg px-4"
                      disabled={generateMutation.isPending}
                    />
                  </div>

                  {/* small helper text */}
                  <div className="text-xs text-white/70 mt-3 text-left md:text-center">
                    Advanced multi-stage pipeline with external research and professional theming. Sign in to save your documentation.
                  </div>

                  {/* Progress strip */}
                  {generateMutation.isPending && (
                    <div className="mt-6 space-y-3">
                      {currentStageName && (
                        <div className="text-center">
                          <p className="text-sm font-semibold text-white/90">{currentStageName}</p>
                          <p className="text-xs text-white/60 mt-1">{currentStageDesc}</p>
                        </div>
                      )}
                      <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
                      </div>
                      <p className="text-xs text-white/50 text-right">{progress}%</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      {generatedDoc && (
        <section className="container mx-auto px-4 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          {/* Shareable Link Section */}
          {generatedDoc.subdomain && (
            <div className="mb-8 glass-effect rounded-2xl p-6">
              <h3 className="text-xl font-semibold mb-4">🔗 Your Documentation is Live!</h3>
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg p-4">
                <ExternalLink className="h-5 w-5 text-primary flex-shrink-0" />
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm text-white/70 mb-1">Shareable Link:</p>
                  <a 
                    href={`https://${generatedDoc.subdomain}.${window.location.hostname.split('.').slice(1).join('.')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 font-mono text-base truncate block"
                  >
                    {generatedDoc.subdomain}.{window.location.hostname.split('.').slice(1).join('.')}
                  </a>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const link = `https://${generatedDoc.subdomain}.${window.location.hostname.split('.').slice(1).join('.')}`;
                    navigator.clipboard.writeText(link);
                    toast({ title: "Link copied!", description: "Shareable link copied to clipboard" });
                  }}
                  className="flex-shrink-0"
                >
                  Copy
                </Button>
              </div>
            </div>
          )}
          
          <div className="mb-8 glass-effect rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <h3 className="text-xl font-semibold">Export Documentation</h3>
              <div className="flex gap-2 flex-wrap">
                <BrandKitExtractor
                  onThemeGenerated={(theme) => {
                    setSelectedTheme(theme);
                  }}
                />
                <ThemeBuilder 
                  onThemeCreated={(theme) => {
                    setSelectedTheme(theme);
                  }}
                />
                <ThemeSwitcher
                  currentTheme={selectedTheme}
                  onThemeChange={setSelectedTheme}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button 
                variant="default" 
                size="lg" 
                className="gap-2 bg-primary hover:bg-primary/90 hover:shadow-glow rounded-xl hover:scale-[1.02] transition-all"
                onClick={handleBatchExport}
              >
                <Download className="h-5 w-5" />
                Download All (ZIP)
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="gap-2 border-white/10 bg-white/5 hover:bg-white/10 rounded-xl hover:scale-[1.02] transition-all"
                onClick={handleDownloadPDF}
              >
                <Download className="h-5 w-5" />
                PDF
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="gap-2 border-white/10 bg-white/5 hover:bg-white/10 rounded-xl hover:scale-[1.02] transition-all"
                onClick={handleDownloadDOCX}
              >
                <Download className="h-5 w-5" />
                DOCX
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="gap-2 border-white/10 bg-white/5 hover:bg-white/10 rounded-xl hover:scale-[1.02] transition-all"
                onClick={handleDownloadMarkdown}
              >
                <Download className="h-5 w-5" />
                Markdown
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="gap-2 border-white/10 bg-white/5 hover:bg-white/10 rounded-xl hover:scale-[1.02] transition-all"
                onClick={handleDownloadHTML}
              >
                <Download className="h-5 w-5" />
                HTML
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="gap-2 border-white/10 bg-white/5 hover:bg-white/10 rounded-xl hover:scale-[1.02] transition-all"
                onClick={handleDownloadJSON}
              >
                <Download className="h-5 w-5" />
                JSON
              </Button>
            </div>
          </div>

          <DocumentationViewer
            title={generatedDoc.title}
            description={generatedDoc.description}
            sections={generatedDoc.sections || []}
            theme={convertToViewerTheme(selectedTheme)}
          />
        </section>
      )}

      {/* Technical Overview Section */}
      {!generatedDoc && (
        <section className="container mx-auto px-4 py-24 border-b border-white/10">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Advanced Multi-Stage Pipeline</h2>
            <p className="text-lg text-muted-foreground mb-12">
              Our sophisticated system goes beyond simple web scraping to deliver comprehensive, research-backed documentation
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-2">Site Discovery</h4>
                <p className="text-sm text-muted-foreground">Multi-domain crawling, sitemap parsing, subdomain detection</p>
              </div>
              
              <div className="text-center">
                <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Search className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-2">External Research</h4>
                <p className="text-sm text-muted-foreground">Stack Overflow, GitHub issues, community insights</p>
              </div>
              
              <div className="text-center">
                <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-2">Content Generation</h4>
                <p className="text-sm text-muted-foreground">Professional writing, structure optimization, cross-references</p>
              </div>
              
              <div className="text-center">
                <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Layers className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-2">Export & Deploy</h4>
                <p className="text-sm text-muted-foreground">Multi-format export, theme application, metadata optimization</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      {!generatedDoc && (
        <section id="features" className="container mx-auto px-4 pb-24">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Enterprise-Grade Documentation Platform</h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Advanced multi-stage pipeline that discovers, researches, and generates comprehensive documentation with professional theming and export capabilities
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
              <div className="glass-effect rounded-2xl p-8 hover:scale-[1.02] transition-all duration-300 group">
                <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center mb-6 shadow-glow group-hover:shadow-glow transition-shadow">
                  <Globe className="h-7 w-7 text-primary-foreground" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">Comprehensive Discovery</h3>
                <p className="text-muted-foreground leading-relaxed">Multi-domain crawling across subdomains, sitemaps, and documentation sections. Analyzes up to 60+ pages per site.</p>
              </div>
              
              <div className="glass-effect rounded-2xl p-8 hover:scale-[1.02] transition-all duration-300 group">
                <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center mb-6 shadow-glow group-hover:shadow-glow transition-shadow">
                  <Search className="h-7 w-7 text-primary-foreground" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">External Research</h3>
                <p className="text-muted-foreground leading-relaxed">Integrates Stack Overflow, GitHub issues, and search engine results for comprehensive troubleshooting and best practices.</p>
              </div>
              
              <div className="glass-effect rounded-2xl p-8 hover:scale-[1.02] transition-all duration-300 group">
                <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center mb-6 shadow-glow group-hover:shadow-glow transition-shadow">
                  <Shield className="h-7 w-7 text-primary-foreground" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">Enterprise Quality</h3>
                <p className="text-muted-foreground leading-relaxed">Apple-style documentation with professional formatting, accessibility compliance, and SEO optimization.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-effect rounded-2xl p-8 hover:scale-[1.02] transition-all duration-300 group">
                <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center mb-6 shadow-glow group-hover:shadow-glow transition-shadow">
                  <Palette className="h-7 w-7 text-primary-foreground" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">Advanced Theming</h3>
                <p className="text-muted-foreground leading-relaxed">Brand kit extraction, custom theme builder, and professional presets. Automatic color and font detection from source sites.</p>
              </div>
              
              <div className="glass-effect rounded-2xl p-8 hover:scale-[1.02] transition-all duration-300 group">
                <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center mb-6 shadow-glow group-hover:shadow-glow transition-shadow">
                  <Layers className="h-7 w-7 text-primary-foreground" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">Multi-Format Export</h3>
                <p className="text-muted-foreground leading-relaxed">PDF, DOCX, HTML, Markdown, and JSON exports with consistent theming. Batch export and live preview capabilities.</p>
              </div>
              
              <div className="glass-effect rounded-2xl p-8 hover:scale-[1.02] transition-all duration-300 group">
                <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center mb-6 shadow-glow group-hover:shadow-glow transition-shadow">
                  <Settings className="h-7 w-7 text-primary-foreground" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">Production Ready</h3>
                <p className="text-muted-foreground leading-relaxed">Metadata generation, cross-references, validation checks, and deployment-ready output with accessibility scoring.</p>
              </div>
            </div>
          </div>
        </section>
      )}
      
      <Footer />
    </div>
  );
};

export default Index;
