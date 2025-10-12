import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, FileText, ExternalLink, Download, Zap, Shield, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/Header";
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

  const handleDownloadPDF = () => {
    if (!generatedDoc?.id) return;
    window.open(`/api/export/pdf/${generatedDoc.id}`, '_blank');
  };

  const handleDownloadDOCX = () => {
    if (!generatedDoc?.id) return;
    window.open(`/api/export/docx/${generatedDoc.id}`, '_blank');
  };

  const handleDownloadMarkdown = () => {
    if (!generatedDoc?.id) return;
    window.open(`/api/export/markdown/${generatedDoc.id}`, '_blank');
  };

  const handleDownloadHTML = () => {
    if (!generatedDoc?.id) return;
    window.open(`/api/export/html/${generatedDoc.id}`, '_blank');
  };

  const handleDownloadJSON = () => {
    if (!generatedDoc?.id) return;
    window.open(`/api/export/json/${generatedDoc.id}`, '_blank');
  };

  const handleBatchExport = () => {
    if (!generatedDoc?.id) return;
    window.open(`/api/export/batch/${generatedDoc.id}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">
        {/* Background gradient orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/30 rounded-full blur-[128px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-5xl mx-auto text-center space-y-12">
            
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full glass-effect animate-in fade-in slide-in-from-bottom-4 duration-1000 group hover:scale-105 transition-transform cursor-pointer">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </div>
              <span className="text-sm font-medium">AI-Powered Documentation</span>
              <Zap className="h-4 w-4 text-primary group-hover:rotate-12 transition-transform" />
            </div>
            
            {/* Main heading */}
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-100">
              <h1 className="text-6xl md:text-8xl font-bold tracking-tight">
                Transform Websites into
                <br />
                <span className="text-gradient">Professional Docs</span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-normal">
                Simply paste a URL and let AI create beautiful, structured documentation instantly. 
                Like Microsoft or Twitter help centers.
              </p>
            </div>
            
            {/* URL Input Card */}
            <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
              <div className="glass-effect rounded-2xl p-8 space-y-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <Input
                    type="url"
                    placeholder="https://yourapp.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="flex-1 h-14 text-base bg-background/50 border-white/10 focus-visible:border-primary/50 focus-visible:ring-primary/20 transition-all rounded-xl"
                    disabled={generateMutation.isPending}
                    data-testid="input-url"
                  />
                  <Button
                    onClick={handleGenerate}
                    disabled={generateMutation.isPending}
                    size="lg"
                    className="h-14 px-10 bg-primary hover:bg-primary/90 hover:shadow-glow transition-all duration-300 text-base font-semibold rounded-xl border-0 hover:scale-[1.02]"
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
                        Generate Docs
                      </>
                    )}
                  </Button>
                </div>

                {/* Enhanced 3-Stage Progress */}
                {generateMutation.isPending && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    
                    {/* Stage Indicators */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {stages.map((stage) => (
                        <div
                          key={stage.id}
                          className={`flex items-start gap-2 p-3 rounded-xl border transition-all ${
                            currentStage >= stage.id
                              ? 'border-primary/50 bg-primary/10'
                              : 'border-white/10 bg-white/5'
                          }`}
                        >
                          <div className="mt-0.5">
                            {currentStage > stage.id ? (
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            ) : currentStage === stage.id ? (
                              <Loader2 className="h-5 w-5 text-primary animate-spin" />
                            ) : (
                              <div className="h-5 w-5 rounded-full border-2 border-white/20" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${currentStage >= stage.id ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {stage.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {stage.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
