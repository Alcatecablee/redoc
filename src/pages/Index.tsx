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
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-primary opacity-5" />
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>
        <div className="container mx-auto px-4 py-20 md:py-32 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border bg-background/50 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">AI-Powered Documentation Generator</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-primary bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-100">
              Transform Websites into
              <br />
              <span className="text-primary">Professional Docs</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
              Simply paste a URL and let AI create beautiful, structured documentation instantly. Like Microsoft or Twitter help centers.
            </p>
            
            {/* URL Input Card */}
            <Card className="p-8 shadow-elegant backdrop-blur-sm bg-gradient-glass border-2 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <Input
                    type="url"
                    placeholder="https://yourapp.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="flex-1 h-14 text-lg border-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all"
                    disabled={generateMutation.isPending}
                    data-testid="input-url"
                  />
                  <Button
                    onClick={handleGenerate}
                    disabled={generateMutation.isPending}
                    size="lg"
                    className="h-14 px-8 bg-gradient-primary hover:shadow-glow transition-all duration-300 text-lg font-semibold"
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
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-primary transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    
                    {/* Stage Indicators */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {stages.map((stage) => (
                        <div
                          key={stage.id}
                          className={`flex items-start gap-2 p-3 rounded-lg border transition-all ${
                            currentStage >= stage.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border bg-muted/30'
                          }`}
                        >
                          <div className="mt-0.5">
                            {currentStage > stage.id ? (
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            ) : currentStage === stage.id ? (
                              <Loader2 className="h-5 w-5 text-primary animate-spin" />
                            ) : (
                              <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${currentStage >= stage.id ? 'text-primary' : 'text-muted-foreground'}`}>
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
            </Card>
          </div>
        </div>
      </section>

      {/* Results Section */}
      {generatedDoc && (
        <section className="container mx-auto px-4 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h3 className="text-lg font-semibold">Export Documentation</h3>
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
                className="gap-2 bg-gradient-primary hover:shadow-glow"
                onClick={handleBatchExport}
              >
                <Download className="h-5 w-5" />
                Download All (ZIP)
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="gap-2"
                onClick={handleDownloadPDF}
              >
                <Download className="h-5 w-5" />
                PDF
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="gap-2"
                onClick={handleDownloadDOCX}
              >
                <Download className="h-5 w-5" />
                DOCX
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="gap-2"
                onClick={handleDownloadMarkdown}
              >
                <Download className="h-5 w-5" />
                Markdown
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="gap-2"
                onClick={handleDownloadHTML}
              >
                <Download className="h-5 w-5" />
                HTML
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="gap-2"
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
        <section id="features" className="container mx-auto px-4 pb-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose DocSnap?</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Everything you need to create professional documentation in seconds
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="p-8 hover:shadow-elegant transition-all duration-300 border-2 hover:border-primary/50">
                <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-6 shadow-glow">
                  <Zap className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Lightning Fast</h3>
                <p className="text-muted-foreground">Generate complete documentation in under 30 seconds. AI-powered extraction and structuring.</p>
              </Card>
              
              <Card className="p-8 hover:shadow-elegant transition-all duration-300 border-2 hover:border-primary/50">
                <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-6 shadow-glow">
                  <Shield className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Enterprise Quality</h3>
                <p className="text-muted-foreground">Professional formatting that matches industry leaders like Microsoft and Twitter.</p>
              </Card>
              
              <Card className="p-8 hover:shadow-elegant transition-all duration-300 border-2 hover:border-primary/50">
                <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-6 shadow-glow">
                  <Download className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Multiple Formats</h3>
                <p className="text-muted-foreground">Export to PDF, DOCX, or publish as a live web page. Your choice, your format.</p>
              </Card>
            </div>
          </div>
        </section>
      )}
      
      <Footer />
    </div>
  );
};

export default Index;
