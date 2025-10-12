import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, FileText, ExternalLink, Download, Zap, Shield, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState<number>(0);
  const [generatedDoc, setGeneratedDoc] = useState<any>(null);
  const [selectedTheme, setSelectedTheme] = useState<Theme>(getDefaultTheme());
  const { toast } = useToast();
  const [showSignIn, setShowSignIn] = useState(false);

  const stages = [
    { id: 1, name: "Extracting Content", description: "Analyzing website structure and content" },
    { id: 2, name: "Writing Documentation", description: "Creating professional documentation" },
    { id: 3, name: "Adding Metadata", description: "Optimizing for SEO and deployment" },
    { id: 4, name: "Quality Check", description: "Validating and refining content" }
  ];

  const generateMutation = useMutation({
    mutationFn: async (url: string) => {
      return apiRequest("/api/generate-docs", {
        method: "POST",
        body: JSON.stringify({ url }),
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

    // Simulate 4-stage progress
    const stageTimings = [
      { stage: 1, progress: 25, duration: 3000 },
      { stage: 2, progress: 50, duration: 3000 },
      { stage: 3, progress: 75, duration: 3000 },
      { stage: 4, progress: 90, duration: 2000 }
    ];

    let currentTimeout: NodeJS.Timeout;

    const simulateProgress = (index: number) => {
      if (index < stageTimings.length) {
        const { stage, progress, duration } = stageTimings[index];
        setCurrentStage(stage);
        setProgress(progress);
        currentTimeout = setTimeout(() => simulateProgress(index + 1), duration);
      }
    };

    simulateProgress(0);

    try {
      await generateMutation.mutateAsync(url);
    } finally {
      if (currentTimeout) clearTimeout(currentTimeout);
    }
  };

  const downloadBlob = async (path: string, filename: string) => {
    try {
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
                  <h1 className="text-3xl md:text-4xl font-bold text-white">Instant AI Docs</h1>
                  <p className="text-sm text-white/80 mt-2">Paste a URL — get polished documentation.</p>
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

                  {/* small helper text */}
                  <div className="text-xs text-white/70 mt-3 text-left md:text-center">
                    Works best with public sites. Sign in to save your docs.
                  </div>

                  {/* Progress strip */}
                  {generateMutation.isPending && (
                    <div className="mt-4">
                      <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                      </div>
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

      {/* Features Section */}
      {!generatedDoc && (
        <section id="features" className="container mx-auto px-4 pb-24">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Why Choose DocSnap?</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Everything you need to create professional documentation in seconds
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-effect rounded-2xl p-8 hover:scale-[1.02] transition-all duration-300 group">
                <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center mb-6 shadow-glow group-hover:shadow-glow transition-shadow">
                  <Zap className="h-7 w-7 text-primary-foreground" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">Lightning Fast</h3>
                <p className="text-muted-foreground leading-relaxed">Generate complete documentation in under 30 seconds. AI-powered extraction and structuring.</p>
              </div>
              
              <div className="glass-effect rounded-2xl p-8 hover:scale-[1.02] transition-all duration-300 group">
                <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center mb-6 shadow-glow group-hover:shadow-glow transition-shadow">
                  <Shield className="h-7 w-7 text-primary-foreground" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">Enterprise Quality</h3>
                <p className="text-muted-foreground leading-relaxed">Professional formatting that matches industry leaders like Microsoft and Twitter.</p>
              </div>
              
              <div className="glass-effect rounded-2xl p-8 hover:scale-[1.02] transition-all duration-300 group">
                <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center mb-6 shadow-glow group-hover:shadow-glow transition-shadow">
                  <Download className="h-7 w-7 text-primary-foreground" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">Multiple Formats</h3>
                <p className="text-muted-foreground leading-relaxed">Export to PDF, DOCX, or publish as a live web page. Your choice, your format.</p>
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
