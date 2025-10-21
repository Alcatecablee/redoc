import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { 
  DocumentTextIcon, 
  ArrowTopRightOnSquareIcon, 
  ArrowDownTrayIcon, 
  BoltIcon, 
  ShieldCheckIcon, 
  CheckBadgeIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
  Square3Stack3DIcon,
  DocumentMagnifyingGlassIcon,
  SwatchIcon,
  Cog6ToothIcon,
  PlayCircleIcon,
  ClipboardDocumentListIcon,
  RocketLaunchIcon,
  ArrowPathIcon,
  VideoCameraIcon,
  ChatBubbleLeftRightIcon,
  CodeBracketIcon,
  AcademicCapIcon,
  QuestionMarkCircleIcon,
  BuildingOfficeIcon
} from "@heroicons/react/24/outline";
import { useToast } from "@/hooks/use-toast";
import { DollarSign } from "lucide-react";
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TypewriterText } from "@/components/TypewriterText";
import CustomPricingForm from "@/components/CustomPricingForm";

function convertToViewerTheme(theme: Theme) {
  return {
    // Colors
    primaryColor: theme.colors.primary,
    secondaryColor: theme.colors.secondary,
    accentColor: theme.colors.accent,
    backgroundColor: theme.colors.background,
    textColor: theme.colors.text,
    codeBgColor: theme.colors.code_bg,
    // Fonts
    fonts: [theme.typography.font_family, theme.typography.heading_font, theme.typography.code_font],
    primaryFont: theme.typography.font_family,
    // Structural tokens
    headingSizes: theme.typography.heading_sizes,
    spacing: {
      section: theme.spacing.section,
      paragraph: theme.spacing.paragraph,
      list_item: theme.spacing.list_item,
      density: theme.spacing.density,
    },
    styling: {
      border_radius: theme.styling.border_radius,
      code_border_radius: theme.styling.code_border_radius,
      shadow: theme.styling.shadow,
    },
    layout: {
      orientation: theme.layout.orientation,
    },
  } as const;
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
    <div className="min-h-screen bg-white">
      <Header />
      <SignInDialog open={showSignIn} onOpenChange={setShowSignIn} />

      {/* Hero Section */}
      <main id="main-content">
      <section id="hero" className="relative overflow-hidden bg-gradient-to-br from-[rgb(36,77,91)] via-[rgb(40,85,100)] to-[rgb(36,77,91)]">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-grid-white/[0.02] opacity-50" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/5 to-transparent" />
        
        <div className="relative pt-24 pb-24 lg:pt-32 lg:pb-32">
          <div className="container mx-auto px-6 max-w-7xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
              {/* Left Column - Text Content (7 columns) */}
              <div className="lg:col-span-7 text-left space-y-8">
                {/* Eyebrow */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm">
                  <BoltIcon className="h-4 w-4 text-white" />
                  <span className="text-sm font-medium text-white/90">AI-Powered Documentation</span>
                </div>
                
                {/* Headline - Primary Focus */}
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] text-white tracking-tight">
                  <TypewriterText
                    texts={[
                      'Your documentation is already written.',
                      "It's just scattered across the internet."
                    ]}
                    typingSpeed={40}
                    pauseBeforeNext={950}
                    separator={'\n'}
                    className=""
                    lineClassName="block mt-2 text-white/80 text-2xl md:text-3xl lg:text-4xl font-semibold tracking-tight"
                    cursorClassName="ml-3 text-white/90"
                  />
                </h1>
                
                {/* Description - Secondary */}
                <p className="text-lg lg:text-xl text-white/70 leading-relaxed max-w-xl">
                  We research how developers actually use your product across Stack Overflow, GitHub, and the web—then generate beautiful, Apple-quality docs that match your brand.
                </p>
                
                {/* CTA Form - Tertiary but Important */}
                <div className="pt-4">
                  <div className="flex flex-col sm:flex-row gap-3 p-2 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md shadow-2xl">
                    <Input
                      type="url"
                      placeholder="https://yourapp.com"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                      className="flex-1 h-14 bg-white/10 border-0 text-white placeholder:text-white/50 text-base focus-visible:ring-2 focus-visible:ring-white/30"
                      disabled={generateMutation.isPending}
                    />
                    <Button 
                      size="lg" 
                      onClick={handleGenerate}
                      disabled={generateMutation.isPending || !url}
                      className="h-14 px-8 bg-white text-[rgb(36,77,91)] hover:bg-white/90 font-semibold shadow-xl hover:shadow-2xl transition-all whitespace-nowrap"
                    >
                      {generateMutation.isPending ? (
                        <>
                          <ArrowPathIcon className="mr-2 h-5 w-5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <DocumentTextIcon className="mr-2 h-5 w-5" />
                          Generate Docs
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="mt-3 text-sm text-white/60 flex items-center gap-2">
                    <ShieldCheckIcon className="h-4 w-4" />
                    Multi-stage pipeline with external research. Free to try.
                  </p>
                </div>

                {/* Trust Elements */}
                <div className="pt-4 flex items-center gap-6 flex-wrap">
                  <div className="flex items-center gap-2">
                    <CheckBadgeIcon className="h-5 w-5 text-emerald-400" />
                    <span className="text-sm text-white/70">No credit card required</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckBadgeIcon className="h-5 w-5 text-emerald-400" />
                    <span className="text-sm text-white/70">5+ export formats</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckBadgeIcon className="h-5 w-5 text-emerald-400" />
                    <span className="text-sm text-white/70">Custom branding</span>
                  </div>
                </div>
              </div>

              {/* Right Column - Visual Demo (5 columns) */}
              <div className="lg:col-span-5 relative">
                <div className="relative aspect-[4/3] w-full rounded-2xl border border-white/20 bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl overflow-hidden shadow-2xl">
                  {/* Decorative Elements */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[rgb(36,77,91)]/50 to-transparent" />
                  <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                  
                  {/* Demo Content */}
                  <div className="relative flex items-center justify-center h-full p-8">
                    <div className="text-center">
                      <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-xl hover:scale-105 transition-transform cursor-pointer">
                        <PlayCircleIcon className="h-12 w-12 text-white" />
                      </div>
                      <p className="text-base font-medium text-white/90">Watch Demo</p>
                      <p className="text-sm text-white/60 mt-1">See it in action</p>
                    </div>
                  </div>
                </div>
                
                {/* Floating Stats */}
                <div className="absolute -bottom-6 -left-6 px-6 py-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl hidden lg:block">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/20">
                      <RocketLaunchIcon className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">500+</p>
                      <p className="text-xs text-white/70">Docs Generated</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By / Customers - Integrated into mint theme */}
      {!generatedDoc && (
        <section id="customers" className="relative overflow-hidden bg-[rgb(142,209,198)] py-12 border-t border-gray-900/10">
          <div className="relative container mx-auto px-6 max-w-7xl">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 mb-8">Trusted by teams shipping better docs faster</p>
              <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-16 opacity-60">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-8 w-24 bg-gray-900/10 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

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
                <ArrowDownTrayIcon className="h-5 w-5" />
                Download All (ZIP)
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="gap-2 border-white/10 bg-white/5 hover:bg-white/10 rounded-xl hover:scale-[1.02] transition-all"
                onClick={handleDownloadPDF}
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                PDF
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="gap-2 border-white/10 bg-white/5 hover:bg-white/10 rounded-xl hover:scale-[1.02] transition-all"
                onClick={handleDownloadDOCX}
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                DOCX
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="gap-2 border-white/10 bg-white/5 hover:bg-white/10 rounded-xl hover:scale-[1.02] transition-all"
                onClick={handleDownloadMarkdown}
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                Markdown
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="gap-2 border-white/10 bg-white/5 hover:bg-white/10 rounded-xl hover:scale-[1.02] transition-all"
                onClick={handleDownloadHTML}
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                HTML
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="gap-2 border-white/10 bg-white/5 hover:bg-white/10 rounded-xl hover:scale-[1.02] transition-all"
                onClick={handleDownloadJSON}
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
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

      {/* WHY Section + Problems Accordion */}
      {!generatedDoc && (
        <section id="why" className="relative overflow-hidden bg-[rgb(142,209,198)] py-16 lg:py-20">
          {/* Subtle Background Pattern */}
          <div className="absolute inset-0 bg-grid-white/[0.03] opacity-40" />
          
          <div className="relative container mx-auto px-6 max-w-7xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
              {/* Left Column - Content (7 columns) */}
              <div className="lg:col-span-7 space-y-6">
                <div className="space-y-4">
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                    Traditional Docs Tools Only Scratch the Surface
                  </h2>
                  <p className="text-xl text-gray-700 leading-relaxed">
                    Your website tells one part of the story. Real knowledge lives in Stack Overflow, GitHub, and community discussions.
                  </p>
                </div>
                
                <div className="pt-4">
                  <h3 className="text-2xl font-bold text-gray-900 mb-8 mt-8">Traditional tools fall short because they:</h3>
                  <Accordion type="single" collapsible className="w-full space-y-3">
                    <AccordionItem value="item-1" className="bg-white/40 backdrop-blur-sm border border-gray-900/10 rounded-xl px-6 data-[state=open]:shadow-lg transition-all">
                      <AccordionTrigger className="text-gray-900 hover:text-gray-900 font-medium py-4 hover:no-underline">
                        Only scrape your website—missing community knowledge
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <ul className="space-y-2 text-gray-700">
                          <li className="flex items-start gap-2">
                            <span className="text-gray-900 mt-1">•</span>
                            <span>Ignore Stack Overflow solutions to common problems</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-gray-900 mt-1">•</span>
                            <span>Miss GitHub Issues where users report real bugs</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-gray-900 mt-1">•</span>
                            <span>Skip community forums with best practices</span>
                          </li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="item-2" className="bg-white/40 backdrop-blur-sm border border-gray-900/10 rounded-xl px-6 data-[state=open]:shadow-lg transition-all">
                      <AccordionTrigger className="text-gray-900 hover:text-gray-900 font-medium py-4 hover:no-underline">
                        Generate incomplete troubleshooting sections
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <ul className="space-y-2 text-gray-700">
                          <li className="flex items-start gap-2">
                            <span className="text-gray-900 mt-1">•</span>
                            <span>FAQs based on guesses, not real user questions</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-gray-900 mt-1">•</span>
                            <span>Missing edge cases and error messages</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-gray-900 mt-1">•</span>
                            <span>No validation of content quality or sources</span>
                          </li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="item-3" className="bg-white/40 backdrop-blur-sm border border-gray-900/10 rounded-xl px-6 data-[state=open]:shadow-lg transition-all">
                      <AccordionTrigger className="text-gray-900 hover:text-gray-900 font-medium py-4 hover:no-underline">
                        Require manual styling and brand matching
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <ul className="space-y-2 text-gray-700">
                          <li className="flex items-start gap-2">
                            <span className="text-gray-900 mt-1">•</span>
                            <span>Generic templates that don't match your brand</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-gray-900 mt-1">•</span>
                            <span>Manual color and font configuration</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-gray-900 mt-1">•</span>
                            <span>Inconsistent formatting across export formats</span>
                          </li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="item-4" className="bg-white/40 backdrop-blur-sm border border-gray-900/10 rounded-xl px-6 data-[state=open]:shadow-lg transition-all">
                      <AccordionTrigger className="text-gray-900 hover:text-gray-900 font-medium py-4 hover:no-underline">
                        Lack transparency and reliability
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <ul className="space-y-2 text-gray-700">
                          <li className="flex items-start gap-2">
                            <span className="text-gray-900 mt-1">•</span>
                            <span>No visibility into what sources were used</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-gray-900 mt-1">•</span>
                            <span>Single-point failures kill the entire pipeline</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-gray-900 mt-1">•</span>
                            <span>No quality scores or source attribution</span>
                          </li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </div>
              
              {/* Right Column - Visual (5 columns) */}
              <div className="lg:col-span-5">
                <div className="relative aspect-[3/4] w-full rounded-2xl border border-gray-900/10 bg-white/30 backdrop-blur-sm overflow-hidden shadow-xl">
                  {/* Decorative gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-gray-900/5" />
                  
                  <div className="relative flex items-center justify-center h-full p-6">
                    <img 
                      src="https://placehold.co/600x800?text=Docs+Screenshot" 
                      alt="Documentation screenshot showing multi-source research" 
                      className="rounded-lg border border-gray-900/10 shadow-lg w-full h-full object-cover" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Pipeline Section - Rebuilt with Visual Storytelling */}
      {!generatedDoc && (
        <section id="pipeline" className="relative overflow-hidden bg-gradient-to-br from-[rgb(36,77,91)] via-[rgb(40,85,100)] to-[rgb(36,77,91)] py-24 lg:py-32">
          {/* Subtle Background Pattern */}
          <div className="absolute inset-0 bg-grid-white/[0.02] opacity-50" />
          
          <div className="relative container mx-auto px-6 max-w-7xl">
            {/* Header */}
            <div className="text-center mb-20">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-6">
                <ClipboardDocumentListIcon className="h-4 w-4 text-white" />
                <span className="text-sm font-medium text-white/90">The Research Pipeline</span>
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                From Discovery to Docs
              </h2>
              <p className="text-xl text-white/70 max-w-3xl mx-auto">
                A systematic 4-stage process that researches beyond your website to build comprehensive documentation
              </p>
            </div>
            
            {/* Visual Pipeline - Simplified */}
            <div className="relative max-w-5xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative">
                {/* Stage 1 */}
                <div className="group relative">
                  <div className="relative bg-white/10 border border-white/20 rounded-2xl p-8 hover:bg-white/15 transition-all duration-300 h-full">
                    <div className="text-3xl font-bold text-white/30 mb-4">01</div>
                    <GlobeAltIcon className="h-8 w-8 text-white mb-4" strokeWidth={1.5} />
                    <h3 className="text-xl font-bold text-white mb-2">Site Discovery</h3>
                    <p className="text-white/70 text-sm">Multi-domain crawling and sitemap parsing</p>
                  </div>
                </div>
                
                {/* Stage 2 */}
                <div className="group relative">
                  <div className="relative bg-white/10 border border-white/20 rounded-2xl p-8 hover:bg-white/15 transition-all duration-300 h-full">
                    <div className="text-3xl font-bold text-white/30 mb-4">02</div>
                    <MagnifyingGlassIcon className="h-8 w-8 text-white mb-4" strokeWidth={1.5} />
                    <h3 className="text-xl font-bold text-white mb-2">Content Extraction</h3>
                    <p className="text-white/70 text-sm">Code blocks, images, and structure</p>
                  </div>
                </div>
                
                {/* Stage 3 */}
                <div className="group relative">
                  <div className="relative bg-white/10 border border-white/20 rounded-2xl p-8 hover:bg-white/15 transition-all duration-300 h-full">
                    <div className="text-3xl font-bold text-white/30 mb-4">03</div>
                    <DocumentMagnifyingGlassIcon className="h-8 w-8 text-white mb-4" strokeWidth={1.5} />
                    <h3 className="text-xl font-bold text-white mb-2">External Research</h3>
                    <p className="text-white/70 text-sm">Stack Overflow, GitHub, Google</p>
                  </div>
                </div>
                
                {/* Stage 4 */}
                <div className="group relative">
                  <div className="relative bg-white/10 border border-white/20 rounded-2xl p-8 hover:bg-white/15 transition-all duration-300 h-full">
                    <div className="text-3xl font-bold text-white/30 mb-4">04</div>
                    <Square3Stack3DIcon className="h-8 w-8 text-white mb-4" strokeWidth={1.5} />
                    <h3 className="text-xl font-bold text-white mb-2">Synthesis & Export</h3>
                    <p className="text-white/70 text-sm">Beautiful docs in 5+ formats</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Trust Card - Source Attribution */}
            <div className="max-w-3xl mx-auto mt-20 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-10 text-center shadow-2xl">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/30 flex items-center justify-center">
                  <CheckBadgeIcon className="h-6 w-6 text-emerald-300" />
                </div>
                <h4 className="text-2xl font-bold text-white">100% Source Attribution</h4>
              </div>
              <p className="text-white/80 text-lg leading-relaxed">
                Every fact is traced to its source—Stack Overflow, GitHub, or your docs. Quality scored and validated for reliability.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Features Section - Rebuilt with Premium Design */}
      {!generatedDoc && (
        <section id="features" className="relative overflow-hidden bg-[rgb(142,209,198)] py-24 lg:py-32">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-grid-white/[0.03] opacity-40" />
          
          <div className="relative container mx-auto px-6 max-w-7xl">
            {/* Header */}
            <div className="text-center mb-20">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900/10 border border-gray-900/20 mb-6">
                <BoltIcon className="h-4 w-4 text-gray-900" />
                <span className="text-sm font-medium text-gray-900/90">Powered by Real Research</span>
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Built on Real User Knowledge
              </h2>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                We don't guess what developers need—we research how they actually use your product across the web
              </p>
            </div>
            
            {/* Premium Feature Grid - Asymmetric Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Large Feature Card - Spans 8 columns */}
              <div className="lg:col-span-8 group relative overflow-hidden bg-white/40 backdrop-blur-sm border border-gray-900/10 rounded-3xl p-10 hover:shadow-xl transition-all duration-500">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-gray-900/5 to-transparent rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gray-900/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <MagnifyingGlassIcon className="h-8 w-8 text-gray-900" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">Multi-Source Research Engine</h3>
                  <p className="text-gray-700 text-lg leading-relaxed mb-6">
                    We analyze your website, then research across 10+ high-quality sources including Stack Overflow, GitHub, YouTube, Reddit, DEV.to, CodeProject, Stack Exchange, Quora, and official forums. Every insight is quality-scored and source-attributed.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <div className="px-4 py-2 rounded-full bg-gray-900/10 border border-gray-900/20 text-sm text-gray-900/90">Stack Overflow</div>
                    <div className="px-4 py-2 rounded-full bg-gray-900/10 border border-gray-900/20 text-sm text-gray-900/90">GitHub Issues</div>
                    <div className="px-4 py-2 rounded-full bg-gray-900/10 border border-gray-900/20 text-sm text-gray-900/90">YouTube Videos</div>
                    <div className="px-4 py-2 rounded-full bg-gray-900/10 border border-gray-900/20 text-sm text-gray-900/90">Reddit Posts</div>
                    <div className="px-4 py-2 rounded-full bg-gray-900/10 border border-gray-900/20 text-sm text-gray-900/90">DEV.to Articles</div>
                    <div className="px-4 py-2 rounded-full bg-gray-900/10 border border-gray-900/20 text-sm text-gray-900/90">CodeProject</div>
                    <div className="px-4 py-2 rounded-full bg-gray-900/10 border border-gray-900/20 text-sm text-gray-900/90">Stack Exchange</div>
                    <div className="px-4 py-2 rounded-full bg-gray-900/10 border border-gray-900/20 text-sm text-gray-900/90">Quora Answers</div>
                    <div className="px-4 py-2 rounded-full bg-gray-900/10 border border-gray-900/20 text-sm text-gray-900/90">Official Forums</div>
                    <div className="px-4 py-2 rounded-full bg-gray-900/10 border border-gray-900/20 text-sm text-gray-900/90">Quality Scoring</div>
                  </div>
                </div>
              </div>
              
              {/* Smaller Feature Cards - Span 4 columns */}
              <div className="lg:col-span-4 space-y-6">
                <div className="group relative overflow-hidden bg-white/40 backdrop-blur-sm border border-gray-900/10 rounded-3xl p-8 hover:shadow-xl transition-all duration-300">
                  <div className="w-14 h-14 rounded-xl bg-gray-900/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <VideoCameraIcon className="h-7 w-7 text-gray-900" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">YouTube Integration</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">Video tutorials, demos, transcripts, and AI-powered content analysis</p>
                </div>
                
                <div className="group relative overflow-hidden bg-white/40 backdrop-blur-sm border border-gray-900/10 rounded-3xl p-8 hover:shadow-xl transition-all duration-300">
                  <div className="w-14 h-14 rounded-xl bg-gray-900/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <MagnifyingGlassIcon className="h-7 w-7 text-gray-900" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">SEO Optimization</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">Meta tags, schema markup, sitemaps, and keyword optimization</p>
                </div>
              </div>
              
              {/* Three Equal Cards */}
              <div className="lg:col-span-4 group relative overflow-hidden bg-white/40 backdrop-blur-sm border border-gray-900/10 rounded-3xl p-8 hover:shadow-xl transition-all duration-300">
                <div className="w-14 h-14 rounded-xl bg-gray-900/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <SwatchIcon className="h-7 w-7 text-gray-900" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Auto Brand Styling</h3>
                <p className="text-gray-700 leading-relaxed">Automatic color extraction from your site, professional typography, and consistent formatting</p>
              </div>
              
              <div className="lg:col-span-4 group relative overflow-hidden bg-white/40 backdrop-blur-sm border border-gray-900/10 rounded-3xl p-8 hover:shadow-xl transition-all duration-300">
                <div className="w-14 h-14 rounded-xl bg-gray-900/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Square3Stack3DIcon className="h-7 w-7 text-gray-900" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Multi-Format Export</h3>
                <p className="text-gray-700 leading-relaxed">PDF, DOCX, HTML, Markdown, JSON, or hosted subdomain—all with your branding</p>
              </div>
              
              <div className="lg:col-span-4 group relative overflow-hidden bg-white/40 backdrop-blur-sm border border-gray-900/10 rounded-3xl p-8 hover:shadow-xl transition-all duration-300">
                <div className="w-14 h-14 rounded-xl bg-gray-900/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Cog6ToothIcon className="h-7 w-7 text-gray-900" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Production Ready</h3>
                <p className="text-gray-700 leading-relaxed">Built-in searchability, accessibility features, and validation</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Combined Quality, Exports & Trust Section */}
      {!generatedDoc && (
        <section id="quality-exports" className="relative overflow-hidden bg-gradient-to-br from-[rgb(36,77,91)] via-[rgb(40,85,100)] to-[rgb(36,77,91)] py-24 lg:py-32">
          <div className="absolute inset-0 bg-grid-white/[0.02] opacity-50" />
          
          <div className="relative container mx-auto px-6 max-w-7xl">
            {/* Quality & Reliability */}
            <div className="text-center mb-20">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-6">
                <ShieldCheckIcon className="h-4 w-4 text-white" />
                <span className="text-sm font-medium text-white/90">Enterprise-Grade Quality</span>
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Built for Reliability
              </h2>
              <p className="text-xl text-white/70 max-w-3xl mx-auto">
                Pipeline monitoring, multi-provider fallbacks, and quality scoring deliver predictable outcomes
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 hover:bg-white/15 hover:shadow-xl transition-all duration-300">
                <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center mb-6">
                  <ClipboardDocumentListIcon className="h-7 w-7 text-white" strokeWidth={1.5} />
                </div>
                <h4 className="text-xl font-bold text-white mb-3">Pipeline Monitoring</h4>
                <p className="text-white/70 leading-relaxed">Stage-by-stage progress tracking with recommendations and partial success handling</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 hover:bg-white/15 hover:shadow-xl transition-all duration-300">
                <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center mb-6">
                  <ShieldCheckIcon className="h-7 w-7 text-white" strokeWidth={1.5} />
                </div>
                <h4 className="text-xl font-bold text-white mb-3">Fallbacks & Retries</h4>
                <p className="text-white/70 leading-relaxed">Provider rotation, exponential backoff, timeouts, and intelligent caching</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 hover:bg-white/15 hover:shadow-xl transition-all duration-300">
                <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center mb-6">
                  <CheckBadgeIcon className="h-7 w-7 text-white" strokeWidth={1.5} />
                </div>
                <h4 className="text-xl font-bold text-white mb-3">Quality Scoring</h4>
                <p className="text-white/70 leading-relaxed">Research weighted by authority, freshness, and consensus across sources</p>
              </div>
            </div>

            {/* Export Formats */}
            <div className="text-center mb-12">
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">Export Anywhere</h3>
              <p className="text-lg text-white/70">One-click exports in multiple formats, or publish to a custom subdomain</p>
            </div>
            
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-6">
                {[
                  { name: 'PDF', icon: DocumentTextIcon },
                  { name: 'DOCX', icon: DocumentTextIcon },
                  { name: 'HTML', icon: GlobeAltIcon },
                  { name: 'Markdown', icon: DocumentTextIcon },
                  { name: 'JSON', icon: DocumentTextIcon }
                ].map((fmt) => (
                  <div key={fmt.name} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 text-center hover:bg-white/15 hover:border-white/30 transition-all duration-200">
                    <fmt.icon className="h-8 w-8 text-white mx-auto mb-2" />
                    <h5 className="font-semibold text-white">{fmt.name}</h5>
                  </div>
                ))}
              </div>
              
              <div className="bg-white/10 backdrop-blur-md border border-white/30 rounded-2xl p-8 text-center">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <ArrowTopRightOnSquareIcon className="h-6 w-6 text-white" strokeWidth={1.5} />
                  <h5 className="text-xl font-bold text-white">Hosted Subdomain</h5>
                </div>
                <p className="text-white/80">Publish at <code className="px-2 py-1 rounded bg-white/20 text-white font-mono text-sm">your-docs.example.com</code> with your theme</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Premium Final CTA Section */}
      {!generatedDoc && (
        <section className="relative overflow-hidden bg-[rgb(142,209,198)] py-24 lg:py-32">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-grid-white/[0.03] opacity-40" />
          
          <div className="relative container mx-auto px-6 max-w-7xl">
            <div className="max-w-5xl mx-auto text-center">
              <div className="space-y-8">
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  Ready to transform your documentation?
                </h2>
                <p className="text-xl text-gray-700 leading-relaxed max-w-3xl mx-auto">
                  Join teams who've stopped guessing and started researching. Get comprehensive, accurate docs that match your brand—automatically.
                </p>
                
                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Button 
                    size="lg" 
                    onClick={() => setShowSignIn(true)}
                    className="h-14 px-8 bg-gray-900 text-white hover:bg-gray-800 font-semibold shadow-xl hover:shadow-2xl transition-all text-lg group"
                  >
                    <RocketLaunchIcon className="mr-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    Start Generating Docs
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline"
                    asChild
                    className="h-14 px-8 border-2 border-gray-900 bg-transparent text-gray-900 hover:bg-gray-900 hover:text-white font-semibold text-lg transition-all"
                  >
                    <a href="#pipeline">
                      <PlayCircleIcon className="mr-2 h-5 w-5" />
                      See How It Works
                    </a>
                  </Button>
                </div>
                
                {/* Trust Indicators */}
                <div className="flex flex-wrap justify-center gap-6 pt-8">
                  <div className="flex items-center gap-2">
                    <CheckBadgeIcon className="h-5 w-5 text-gray-900" />
                    <span className="text-sm text-gray-700">Free to try</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckBadgeIcon className="h-5 w-5 text-gray-900" />
                    <span className="text-sm text-gray-700">No credit card</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckBadgeIcon className="h-5 w-5 text-gray-900" />
                    <span className="text-sm text-gray-700">5-minute setup</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
