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
    { id: 1, name: "Site Discovery", description: "Comprehensive site discovery — multi-domain crawling, sitemap parsing, subdomain enumeration, robots.txt-aware crawling, and link-graph analysis to prioritize high-value pages." },
    { id: 2, name: "Research & Analysis", description: "Aggregate community knowledge across Stack Overflow, GitHub, YouTube, Reddit, and official docs. Extract authoritative answers, issue threads, and transcripts, then quality-score and prioritize insights for documentation." },
    { id: 3, name: "Documentation Generation", description: "Synthesize research into structured documentation—getting started guides, tutorials, troubleshooting, FAQs, and API references—with embedded code samples and inline source attributions." },
    { id: 4, name: "Export & Optimization", description: "Apply brand styling, run accessibility and SEO checks, and export to PDF, DOCX, HTML, Markdown, or JSON. Optionally publish to a hosted subdomain with search and indexing enabled." }
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
      <section id="hero" className="relative overflow-hidden bg-gradient-to-b from-[rgb(14,19,23)] via-[rgb(24,29,37)] to-[rgb(34,38,46)]">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-grid-white/[0.02] opacity-30" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-gradient-radial from-[rgb(102,255,228)]/10 via-transparent to-transparent blur-3xl" />

        <div className="relative pt-28 pb-28 lg:pt-36 lg:pb-36">
          <div className="container mx-auto px-6 max-w-5xl text-center">
            <div className="space-y-10">
              {/* Headline - Primary Focus */}
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-black leading-tight text-white tracking-tight space-y-3">
                <span className="text-[rgb(102,255,228)] block">Your Documentation is Already Written</span>
                <span className="block font-light text-white/90">It's Just Scattered Across the Internet</span>
              </h1>

              {/* Description - Secondary */}
              <p className="text-lg lg:text-xl text-white/80 leading-relaxed max-w-3xl mx-auto font-light text-center">
                We research how developers actually use your product across 10+ high-quality sources including <strong>Stack Overflow</strong>, <strong>GitHub</strong>, <strong>YouTube</strong>, <strong>Reddit</strong>, <strong>DEV.to</strong>, <strong>CodeProject</strong>, <strong>Stack Exchange</strong>, <strong>Quora</strong>, and official forums then generate beautiful, <strong>Apple-quality docs</strong> that match your brand.
              </p>

              {/* CTA Button */}
              <div className="pt-6">
                <Button
                  size="lg"
                  asChild
                  className="h-14 px-10 bg-[rgb(14,19,23)] border-4 border-[rgb(102,255,228)] text-white hover:bg-[rgb(102,255,228)] hover:text-[rgb(14,19,23)] font-bold text-base rounded-full uppercase tracking-wider transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-105"
                >
                  <a href="https://quarkly.io/dashboard">Create Project</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Watch Demo Section - Below Hero on Desktop */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[rgb(36,77,91)] via-[rgb(40,85,100)] to-[rgb(36,77,91)] py-20 lg:py-24">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-grid-white/[0.02] opacity-50" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/5 to-transparent" />

        <div className="relative container mx-auto px-6 max-w-7xl">
          <div className="max-w-2xl mx-auto">
            {/* Demo Card */}
            <div className="relative aspect-[16/9] w-full rounded-3xl border border-white/20 bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl overflow-hidden shadow-2xl">
              {/* Decorative Elements */}
              <div className="absolute inset-0 bg-gradient-to-t from-[rgb(36,77,91)]/50 to-transparent" />
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

              {/* Demo Content */}
              <div className="relative flex items-center justify-center h-full p-8">
                <div className="text-center">
                  <div id="demo" className="w-32 h-32 mx-auto mb-8 rounded-3xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-xl hover:scale-110 transition-transform cursor-pointer group">
                    <PlayCircleIcon className="h-16 w-16 text-white group-hover:text-[rgb(102,255,228)] transition-colors" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-3">Watch Demo</h2>
                  <p className="text-lg text-white/70">See how it works in action</p>
                </div>
              </div>
            </div>

            {/* Stats Below Demo */}
            <div className="mt-12 grid grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">1,000+</div>
                <p className="text-white/70">Sections Generated</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">5 min</div>
                <p className="text-white/70">Average Build Time</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">10+</div>
                <p className="text-white/70">Research Sources</p>
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
                        Only scrape your website missing community knowledge
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 relative">
                {[
                  { num: "01", icon: GlobeAltIcon, title: "Site Discovery", desc: "Crawl multiple domains and subdomains, parse sitemaps and robots.txt, detect canonical and duplicate pages, and extract structured content, code samples, and metadata. We create a prioritized crawl map so the most important pages and community-driven content are fetched and analyzed first." },
                  { num: "02", icon: MagnifyingGlassIcon, title: "Content Extraction", desc: "Extract code samples, configuration files, images, and structured metadata from pages. Normalize formatting, capture contextual snippets and error traces, and preserve example inputs/outputs for accurate troubleshooting sections." }
                ].map((stage, idx) => (
                  <div key={idx} className="group relative">
                    <div className="relative bg-white/10 border border-white/20 rounded-2xl p-6 md:p-8 hover:bg-white/15 hover:border-white/40 transition-all duration-500 h-full transform hover:scale-105 hover:shadow-2xl focus-within:ring-2 focus-within:ring-[rgb(102,255,228)]/50">
                      <div className="text-2xl md:text-3xl font-bold text-white/30 mb-4 group-hover:text-white/50 transition-colors">{stage.num}</div>
                      <div className="w-10 h-10 md:w-8 md:h-8 text-white mb-4 group-hover:text-[rgb(102,255,228)] transition-colors" aria-hidden="true">
                        <stage.icon strokeWidth={1.5} />
                      </div>
                      <h3 className="text-lg md:text-xl font-bold text-white mb-2">{stage.title}</h3>
                      <p className="text-white/70 text-xs md:text-sm leading-relaxed">{stage.desc}</p>
                    </div>
                  </div>
                ))}
                
                {[
                  { num: "03", icon: DocumentMagnifyingGlassIcon, title: "External Research", desc: "Search and aggregate across Stack Overflow, GitHub Issues, YouTube transcripts, Reddit, and official documentation. Identify consensus answers, relevant threads, and community fixes, then score each source for relevance and authority." },
                  { num: "04", icon: Square3Stack3DIcon, title: "Synthesis & Export", desc: "Synthesize findings into clear, searchable documentation, apply your brand theme, validate citations, and export to multiple formats—or publish to a branded subdomain with built-in search." }
                ].map((stage, idx) => (
                  <div key={idx} className="group relative">
                    <div className="relative bg-white/10 border border-white/20 rounded-2xl p-6 md:p-8 hover:bg-white/15 hover:border-white/40 transition-all duration-500 h-full transform hover:scale-105 hover:shadow-2xl focus-within:ring-2 focus-within:ring-[rgb(102,255,228)]/50">
                      <div className="text-2xl md:text-3xl font-bold text-white/30 mb-4 group-hover:text-white/50 transition-colors">{stage.num}</div>
                      <div className="w-10 h-10 md:w-8 md:h-8 text-white mb-4 group-hover:text-[rgb(102,255,228)] transition-colors" aria-hidden="true">
                        <stage.icon strokeWidth={1.5} />
                      </div>
                      <h3 className="text-lg md:text-xl font-bold text-white mb-2">{stage.title}</h3>
                      <p className="text-white/70 text-xs md:text-sm leading-relaxed">{stage.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trust Card - Source Attribution */}
            <div className="max-w-3xl mx-auto mt-20 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-10 text-center shadow-2xl">
              <div className="flex items-center justify-center gap-3 mb-4">
                <h4 className="text-2xl font-bold text-white">100% Source Attribution</h4>
              </div>
              <p className="text-white/80 text-lg leading-relaxed">
                Every fact is traced to its source. Stack Overflow, GitHub, or your docs. Quality scored and validated for reliability.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Features Section - Capability Showcase */}
      {!generatedDoc && (
        <section id="features" className="relative overflow-hidden bg-[rgb(14,19,23)] py-24 lg:py-32">
          <div className="absolute inset-0 bg-grid-white/[0.02] opacity-30" />

          <div className="relative container mx-auto px-6 max-w-7xl">
            {/* Header */}
            <div className="text-center mb-24">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Built on Real User Knowledge
              </h2>
              <p className="text-xl text-white/70 max-w-3xl mx-auto">
                We don't guess what developers need — we research how they actually use your product across the web
              </p>
            </div>
            
            {/* Capability Grid */}
            <div className="grid gap-4">
              {/* Research Sources */}
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-white mb-6 tracking-tight">Research Sources</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {[
                    { icon: MagnifyingGlassIcon, name: "Stack Overflow" },
                    { icon: CodeBracketIcon, name: "GitHub Issues" },
                    { icon: VideoCameraIcon, name: "YouTube" },
                    { icon: ChatBubbleLeftRightIcon, name: "Reddit" },
                    { icon: DocumentTextIcon, name: "Dev.to" }
                  ].map((item) => (
                    <div key={item.name} className="group bg-[rgb(34,38,46)] rounded-2xl p-6 hover:bg-[rgb(40,45,55)] transition-all duration-300 border border-white/10 hover:border-[rgb(102,255,228)]/30">
                      <div className="flex flex-col items-center text-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-[rgb(102,255,228)]/20 transition-colors">
                          <item.icon className="h-6 w-6 text-white/80 group-hover:text-[rgb(102,255,228)]" strokeWidth={1.5} />
                        </div>
                        <p className="text-sm font-medium text-white/80 leading-tight">{item.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Documentation Generation */}
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-white mb-6 tracking-tight">Documentation Generation</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[
                    { icon: DocumentTextIcon, name: "Getting Started" },
                    { icon: AcademicCapIcon, name: "Tutorials" },
                    { icon: QuestionMarkCircleIcon, name: "FAQs" },
                    { icon: BoltIcon, name: "Troubleshooting" },
                    { icon: CodeBracketIcon, name: "API Docs" },
                    { icon: CheckBadgeIcon, name: "Best Practices" },
                    { icon: Square3Stack3DIcon, name: "Examples" },
                    { icon: ShieldCheckIcon, name: "Security" }
                  ].map((item) => (
                    <div key={item.name} className="group bg-[rgb(34,38,46)] rounded-2xl p-6 hover:bg-[rgb(40,45,55)] transition-all duration-300 border border-white/10 hover:border-[rgb(102,255,228)]/30">
                      <div className="flex flex-col items-center text-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-[rgb(102,255,228)]/20 transition-colors">
                          <item.icon className="h-6 w-6 text-white/80 group-hover:text-[rgb(102,255,228)]" strokeWidth={1.5} />
                        </div>
                        <p className="text-sm font-medium text-white/80 leading-tight">{item.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Export Formats */}
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-white mb-6 tracking-tight">Export & Publishing</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {[
                    { icon: DocumentTextIcon, name: "PDF" },
                    { icon: DocumentTextIcon, name: "DOCX" },
                    { icon: GlobeAltIcon, name: "HTML" },
                    { icon: CodeBracketIcon, name: "Markdown" },
                    { icon: DocumentMagnifyingGlassIcon, name: "JSON" }
                  ].map((item) => (
                    <div key={item.name} className="group bg-[rgb(34,38,46)] rounded-2xl p-6 hover:bg-[rgb(40,45,55)] transition-all duration-300 border border-white/10 hover:border-[rgb(102,255,228)]/30">
                      <div className="flex flex-col items-center text-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-[rgb(102,255,228)]/20 transition-colors">
                          <item.icon className="h-6 w-6 text-white/80 group-hover:text-[rgb(102,255,228)]" strokeWidth={1.5} />
                        </div>
                        <p className="text-sm font-medium text-white/80 leading-tight">{item.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quality & Features */}
              <div>
                <h3 className="text-2xl font-bold text-white mb-6 tracking-tight">Quality & Features</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[
                    { icon: CheckBadgeIcon, name: "Quality Scoring" },
                    { icon: SwatchIcon, name: "Brand Styling" },
                    { icon: MagnifyingGlassIcon, name: "Full Search" },
                    { icon: Cog6ToothIcon, name: "SEO Ready" },
                    { icon: ShieldCheckIcon, name: "Accessibility" },
                    { icon: BuildingOfficeIcon, name: "Enterprise" },
                    { icon: ArrowPathIcon, name: "Auto Updates" },
                    { icon: ClipboardDocumentListIcon, name: "Analytics" }
                  ].map((item) => (
                    <div key={item.name} className="group bg-[rgb(34,38,46)] rounded-2xl p-6 hover:bg-[rgb(40,45,55)] transition-all duration-300 border border-white/10 hover:border-[rgb(102,255,228)]/30">
                      <div className="flex flex-col items-center text-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-[rgb(102,255,228)]/20 transition-colors">
                          <item.icon className="h-6 w-6 text-white/80 group-hover:text-[rgb(102,255,228)]" strokeWidth={1.5} />
                        </div>
                        <p className="text-sm font-medium text-white/80 leading-tight">{item.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
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
                <span className="text-sm font-medium text-white/90">Production-Ready Quality</span>
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Built for Reliability
              </h2>
              <p className="text-xl text-white/70 max-w-3xl mx-auto">
                Pipeline monitoring, multi-provider fallbacks, and quality scoring deliver predictable outcomes
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-20">
              {[
                { icon: ClipboardDocumentListIcon, title: "Pipeline Monitoring", desc: "Stage-by-stage progress tracking with recommendations and partial success handling" },
                { icon: ShieldCheckIcon, title: "Fallbacks & Retries", desc: "Provider rotation, exponential backoff, timeouts, and intelligent caching" },
                { icon: CheckBadgeIcon, title: "Quality Scoring", desc: "Research weighted by authority, freshness, and consensus across sources" }
              ].map((item, idx) => (
                <div key={idx} className="group bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 hover:bg-white/15 hover:border-white/40 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1 focus-within:ring-2 focus-within:ring-[rgb(102,255,228)]/50">
                  <div className="w-14 h-14 rounded-xl bg-white/20 group-hover:bg-white/30 flex items-center justify-center mb-6 transition-all duration-300 transform group-hover:scale-110">
                    <item.icon className="h-7 w-7 text-white" strokeWidth={1.5} aria-hidden="true" />
                  </div>
                  <h4 className="text-xl font-bold text-white mb-3">{item.title}</h4>
                  <p className="text-white/70 leading-relaxed text-sm md:text-base">{item.desc}</p>
                </div>
              ))}
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
                
                </div>
            </div>
          </div>
        </section>
      )}

      {/* Final CTA Section - Try it Free */}
      {!generatedDoc && (
        <section className="relative overflow-hidden bg-[rgb(34,38,46)] py-20 lg:py-28">
          <div className="relative container mx-auto px-6 max-w-5xl text-center">
            <div className="space-y-12">
              {/* Heading */}
              <h2 className="text-6xl md:text-7xl lg:text-8xl font-black leading-tight text-white tracking-tight">
                Try it for <span className="text-[rgb(102,255,228)] font-semibold">free<span className="text-[rgb(102,255,228)] font-black">.</span></span>
              </h2>

              {/* Description */}
              <p className="text-2xl md:text-3xl text-[rgb(228,232,236)] leading-relaxed max-w-3xl mx-auto">
                We provide <strong className="font-bold">for free</strong> as long as we can, and then <strong className="font-bold">the lowest price</strong> among competitors.
              </p>

              {/* CTA Button */}
              <div>
                <a
                  href="https://quarkly.io/dashboard"
                  className="inline-block px-10 py-4 bg-[rgb(14,19,23)] border-4 border-[rgb(102,255,228)] text-white hover:bg-[rgb(102,255,228)] hover:text-[rgb(14,19,23)] font-bold text-base rounded-full uppercase tracking-wider transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-105"
                >
                  Create Project
                </a>
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
