import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, FileText, ExternalLink, Download, Zap, Shield, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Index = () => {
  const [url, setUrl] = useState("");
  const [progress, setProgress] = useState(0);
  const [generatedDoc, setGeneratedDoc] = useState<any>(null);
  const { toast } = useToast();

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
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 500);

    try {
      await generateMutation.mutateAsync(url);
    } finally {
      clearInterval(progressInterval);
    }
  };

  const handleDownloadPDF = () => {
    // TODO: Implement PDF download
    toast({
      title: "Coming Soon",
      description: "PDF download will be available soon",
    });
  };

  const handleDownloadDOCX = () => {
    // TODO: Implement DOCX download
    toast({
      title: "Coming Soon",
      description: "DOCX download will be available soon",
    });
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

                {/* Progress Bar */}
                {generateMutation.isPending && (
                  <div className="space-y-2 animate-in fade-in duration-300">
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-primary transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      Analyzing content and generating documentation...
                    </p>
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
          <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-3xl font-bold text-center mb-8">Your Documentation</h2>
            
            {/* Output Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-6 hover:shadow-elegant transition-all duration-300 cursor-pointer border-2 hover:border-primary group">
                <div className="space-y-4">
                  <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ExternalLink className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Web Preview</h3>
                    <p className="text-sm text-muted-foreground">View live documentation in browser</p>
                  </div>
                </div>
              </Card>

              <Card 
                className="p-6 hover:shadow-elegant transition-all duration-300 cursor-pointer border-2 hover:border-primary group"
                onClick={handleDownloadPDF}
              >
                <div className="space-y-4">
                  <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Download className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Download PDF</h3>
                    <p className="text-sm text-muted-foreground">Professional PDF document</p>
                  </div>
                </div>
              </Card>

              <Card 
                className="p-6 hover:shadow-elegant transition-all duration-300 cursor-pointer border-2 hover:border-primary group"
                onClick={handleDownloadDOCX}
              >
                <div className="space-y-4">
                  <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Download className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Download DOCX</h3>
                    <p className="text-sm text-muted-foreground">Editable Word document</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Preview Content */}
            <Card className="p-8 shadow-elegant">
              <div className="prose prose-lg max-w-none">
                <h1>{generatedDoc.title || "Documentation"}</h1>
                <div dangerouslySetInnerHTML={{ __html: generatedDoc.content || "<p>No content generated</p>" }} />
              </div>
            </Card>
          </div>
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
