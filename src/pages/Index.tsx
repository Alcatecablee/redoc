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
  const [customDomain, setCustomDomain] = useState("");
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
      <section className="relative overflow-hidden bg-gradient-to-br from-[rgb(36,77,91)] via-[rgb(40,85,100)] to-[rgb(36,77,91)] py-16 md:py-20 lg:py-24">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-grid-white/[0.02] opacity-50" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/5 to-transparent" />

        <div className="relative container mx-auto px-4 md:px-6 max-w-7xl">
          <div className="max-w-2xl mx-auto">
            {/* Demo Card */}
            <div className="relative aspect-[16/9] w-full rounded-2xl md:rounded-3xl border border-white/20 hover:border-[rgb(102,255,228)]/40 bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl overflow-hidden shadow-2xl transition-all duration-500 hover:shadow-2xl">
              {/* Decorative Elements */}
              <div className="absolute inset-0 bg-gradient-to-t from-[rgb(36,77,91)]/50 to-transparent" />
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

              {/* Demo Content */}
              <div className="relative flex items-center justify-center h-full p-6 md:p-8">
                <div className="text-center">
                  <div id="demo" className="w-24 md:w-32 h-24 md:h-32 mx-auto mb-6 md:mb-8 rounded-3xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-xl hover:scale-110 hover:shadow-2xl transition-all duration-300 cursor-pointer group focus:outline-none focus:ring-4 focus:ring-[rgb(102,255,228)]/50" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { const el = document.getElementById('demo'); if(el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }}>
                    <PlayCircleIcon className="h-12 md:h-16 w-12 md:w-16 text-white group-hover:text-[rgb(102,255,228)] transition-colors" aria-hidden="true" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 md:mb-3">Watch Demo</h2>
                  <p className="text-base md:text-lg text-white/70">See how it works in action</p>
                </div>
              </div>
            </div>

            {/* Stats Below Demo */}
            <div className="mt-10 md:mt-12 grid grid-cols-3 gap-4 md:gap-6">
              {[
                { num: "1,000+", label: "Sections Generated" },
                { num: "5 min", label: "Average Build Time" },
                { num: "10+", label: "Research Sources" }
              ].map((stat, idx) => (
                <div key={idx} className="text-center group">
                  <div className="text-2xl md:text-3xl font-bold text-white mb-1 md:mb-2 group-hover:text-[rgb(102,255,228)] transition-colors">{stat.num}</div>
                  <p className="text-xs md:text-sm text-white/70 leading-tight">{stat.label}</p>
                </div>
              ))}
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
        <section id="pipeline" className="relative overflow-hidden bg-gradient-to-br from-[rgb(36,77,91)] via-[rgb(40,85,100)] to-[rgb(36,77,91)] py-32 lg:py-40">
          {/* Subtle Background Pattern */}
          <div className="absolute inset-0 bg-grid-white/[0.02] opacity-50" />

          <div className="relative container mx-auto px-6 max-w-7xl">
            {/* Header */}
            <div className="text-center mb-28">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-6">
                <ClipboardDocumentListIcon className="h-4 w-4 text-[rgb(102,255,228)]" />
                <span className="text-sm font-semibold text-white/90 uppercase tracking-wide">The Research Pipeline</span>
              </div>
              <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
                From Discovery to Docs
              </h2>
              <p className="text-lg md:text-xl text-white/70 max-w-3xl mx-auto font-light">
                A systematic 4-stage process that transforms external research into comprehensive, accurate documentation
              </p>
            </div>

            {/* Visual Pipeline */}
            <div className="relative max-w-6xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 relative">
                {[
                  { num: "01", icon: GlobeAltIcon, title: "Site Discovery", desc: "Crawl multiple domains, parse sitemaps, and extract all structured content and code samples." },
                  { num: "02", icon: MagnifyingGlassIcon, title: "Content Extraction", desc: "Extract code samples, configuration files, and metadata. Normalize and structure for maximum clarity." }
                ].map((stage, idx) => (
                  <div key={idx} className="group relative">
                    <div className="relative bg-gradient-to-br from-white/15 to-white/5 border border-white/25 hover:border-[rgb(102,255,228)]/50 rounded-3xl p-8 transition-all duration-500 h-full backdrop-blur-sm hover:bg-gradient-to-br hover:from-white/20 hover:to-white/10 shadow-2xl hover:shadow-[0_20px_50px_rgba(102,255,228,0.15)]">
                      <div className="absolute top-8 right-8 text-6xl font-black text-white/10 group-hover:text-[rgb(102,255,228)]/20 transition-colors">{stage.num}</div>
                      <div className="w-12 h-12 text-white mb-6 group-hover:text-[rgb(102,255,228)] transition-all duration-300 group-hover:scale-110" aria-hidden="true">
                        <stage.icon strokeWidth={1.2} />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-3 leading-tight">{stage.title}</h3>
                      <p className="text-white/70 text-base leading-relaxed">{stage.desc}</p>
                    </div>
                  </div>
                ))}

                {[
                  { num: "03", icon: DocumentMagnifyingGlassIcon, title: "External Research", desc: "Search Stack Overflow, GitHub, YouTube, Reddit, and 5+ sources. Score and rank by authority and relevance." },
                  { num: "04", icon: Square3Stack3DIcon, title: "Synthesis & Export", desc: "Synthesize findings into clear docs, apply your brand, validate citations, and export to any format." }
                ].map((stage, idx) => (
                  <div key={idx} className="group relative">
                    <div className="relative bg-gradient-to-br from-white/15 to-white/5 border border-white/25 hover:border-[rgb(102,255,228)]/50 rounded-3xl p-8 transition-all duration-500 h-full backdrop-blur-sm hover:bg-gradient-to-br hover:from-white/20 hover:to-white/10 shadow-2xl hover:shadow-[0_20px_50px_rgba(102,255,228,0.15)]">
                      <div className="absolute top-8 right-8 text-6xl font-black text-white/10 group-hover:text-[rgb(102,255,228)]/20 transition-colors">{stage.num}</div>
                      <div className="w-12 h-12 text-white mb-6 group-hover:text-[rgb(102,255,228)] transition-all duration-300 group-hover:scale-110" aria-hidden="true">
                        <stage.icon strokeWidth={1.2} />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-3 leading-tight">{stage.title}</h3>
                      <p className="text-white/70 text-base leading-relaxed">{stage.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trust Card - Source Attribution */}
            <div className="max-w-3xl mx-auto mt-24 bg-gradient-to-r from-[rgb(102,255,228)]/10 to-[rgb(102,255,228)]/5 backdrop-blur-md border border-[rgb(102,255,228)]/30 rounded-3xl p-10 md:p-12 text-center shadow-2xl hover:shadow-[0_20px_50px_rgba(102,255,228,0.2)] transition-all duration-500 hover:border-[rgb(102,255,228)]/50">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="p-2 bg-[rgb(102,255,228)]/20 rounded-full">
                  <CheckBadgeIcon className="h-8 w-8 text-[rgb(102,255,228)]" aria-hidden="true" />
                </div>
                <h4 className="text-2xl md:text-3xl font-bold text-white">100% Source Attribution</h4>
              </div>
              <p className="text-white/80 text-lg leading-relaxed">
                Every insight is traced to its source. Quality scored and validated for reliability.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Features Section - Capability Showcase */}
      {!generatedDoc && (
        <section id="features" className="relative overflow-hidden bg-gradient-to-br from-[rgb(36,77,91)] via-[rgb(40,85,100)] to-[rgb(36,77,91)] py-32 lg:py-40">
          <div className="absolute inset-0 bg-grid-white/[0.02] opacity-30" />

          <div className="relative container mx-auto px-6 max-w-7xl">
            {/* Header */}
            <div className="text-center mb-28">
              <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-8 leading-tight tracking-tight">
                Built on Real User Knowledge
              </h2>
              <p className="text-lg md:text-xl text-white/70 max-w-3xl mx-auto mb-12 font-light">
                No guessing. We research how developers actually use your product across 10+ sources.
              </p>

              {/* Multi-Source Research Engine */}
              <div className="bg-gradient-to-br from-white/15 to-white/5 border border-[rgb(102,255,228)]/30 rounded-3xl p-10 md:p-12 max-w-3xl mx-auto backdrop-blur-sm shadow-2xl hover:shadow-[0_20px_50px_rgba(102,255,228,0.15)] transition-all duration-500 hover:border-[rgb(102,255,228)]/50">
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">Multi-Source Research Engine</h3>
                <p className="text-white/80 text-lg leading-relaxed">
                  We analyze your website, then research across Stack Overflow, GitHub, YouTube, Reddit, DEV.to, CodeProject, Stack Exchange, Quora, and official forums. Every insight is quality-scored and source-attributed.
                </p>
              </div>
            </div>
            
            {/* Capability Grid */}
            <div className="grid gap-20">
              {/* Research Sources */}
              <div>
                <div className="flex items-center gap-4 mb-10">
                  <div className="h-1 w-12 bg-gradient-to-r from-[rgb(102,255,228)] to-transparent"></div>
                  <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Research Sources</h3>
                </div>
                <div className="relative">
                  {/* SVG Animated connecting lines */}
                  <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{height: '100%'}} preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="flowGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="rgb(102,255,228)" stopOpacity="0" />
                        <stop offset="50%" stopColor="rgb(102,255,228)" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="rgb(102,255,228)" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="flowGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgb(102,255,228)" stopOpacity="0" />
                        <stop offset="50%" stopColor="rgb(102,255,228)" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="rgb(102,255,228)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <polyline points="0,50 20,50" stroke="url(#flowGradient1)" strokeWidth="2" fill="none" style={{animation: 'flowLine 3s ease-in-out infinite'}} />
                  </svg>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5 relative z-10">
                    {[
                      { image: "/attached_assets/images/Stack-Overflow-Logo-emblem-of-the-programming-community-transparent-png-image.png", name: "Stack Overflow" },
                      { image: "/attached_assets/images/toppng.com-github-logo-524x512.png", name: "GitHub Issues" },
                      { image: "/attached_assets/images/toppng.com-youtube-icon-1024x1024.png", name: "YouTube Videos" },
                      { image: "/attached_assets/images/toppng.com-reddit-logo-reddit-icon-698x698.png", name: "Reddit Posts" },
                      { image: "/attached_assets/images/dev-rainbow.png", name: "DEV.to Articles" },
                      { image: "/attached_assets/images/toppng.com-custom-software-development-web-application-development-451x333.png", name: "CodeProject" },
                      { icon: DocumentTextIcon, name: "Stack Exchange" },
                      { icon: ChatBubbleLeftRightIcon, name: "Quora Answers" },
                      { icon: GlobeAltIcon, name: "Official Forums" },
                      { icon: MagnifyingGlassIcon, name: "Web Search" },
                      { icon: DocumentMagnifyingGlassIcon, name: "Internal Search" }
                    ].map((item) => (
                      <div key={item.name} className="group">
                        <div className="relative bg-gradient-to-br from-white/10 to-white/5 hover:from-white/15 hover:to-white/10 border border-white/20 hover:border-[rgb(102,255,228)]/40 rounded-2xl p-7 transition-all duration-400 h-full backdrop-blur-sm hover:shadow-[0_10px_30px_rgba(102,255,228,0.1)]">
                          {/* Animated glow background on hover */}
                          <div className="absolute inset-0 bg-gradient-to-r from-[rgb(102,255,228)]/0 via-[rgb(102,255,228)]/10 to-[rgb(102,255,228)]/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{animation: 'glow 2s ease-in-out infinite'}} />

                          <div className="flex flex-col items-center text-center gap-4 h-full relative z-10">
                            <div className="w-14 h-14 rounded-xl bg-white/15 group-hover:bg-[rgb(102,255,228)]/20 flex items-center justify-center transition-all duration-300 group-hover:scale-110 overflow-hidden relative">
                              {/* Flowing gradient pulse on icon */}
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" style={{animation: 'pulse-flow 1.5s ease-in-out infinite'}} />

                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="h-8 w-8 object-contain group-hover:brightness-125 transition-all relative z-10"
                                  style={{animation: 'iconFloat 3s ease-in-out infinite'}}
                                />
                              ) : (
                                <item.icon className="h-6 w-6 text-white/80 group-hover:text-[rgb(102,255,228)] transition-colors relative z-10" strokeWidth={1.5} style={{animation: 'iconFloat 3s ease-in-out infinite'}} />
                              )}
                            </div>
                            <p className="text-sm font-semibold text-white/90 leading-snug">{item.name}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <style>{`
                  @keyframes iconFloat {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-4px); }
                  }
                  @keyframes pulse-flow {
                    0% { transform: translateX(-100%); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateX(100%); opacity: 0; }
                  }
                  @keyframes glow {
                    0%, 100% { opacity: 0; }
                    50% { opacity: 1; }
                  }
                  @keyframes flowLine {
                    0%, 100% { strokeDashoffset: 100; }
                    50% { strokeDashoffset: 0; }
                  }
                `}</style>
              </div>

              {/* Documentation Generation */}
              <div>
                <div className="flex items-center gap-4 mb-10">
                  <div className="h-1 w-12 bg-gradient-to-r from-[rgb(102,255,228)] to-transparent"></div>
                  <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Documentation Types</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                  {[
                    { icon: DocumentTextIcon, name: "Getting Started" },
                    { icon: AcademicCapIcon, name: "Tutorials" },
                    { icon: QuestionMarkCircleIcon, name: "FAQs" },
                    { icon: BoltIcon, name: "Troubleshooting" },
                    { icon: CodeBracketIcon, name: "API Docs" },
                    { icon: CheckBadgeIcon, name: "Best Practices" },
                    { icon: Square3Stack3DIcon, name: "Examples" },
                    { icon: ShieldCheckIcon, name: "Security" }
                  ].map((item, idx) => (
                    <div key={item.name} className="group" style={{animation: `slideUp 0.6s ease-out ${idx * 0.1}s both`}}>
                      <div className="relative bg-gradient-to-br from-white/10 to-white/5 hover:from-white/15 hover:to-white/10 border border-white/20 hover:border-[rgb(102,255,228)]/40 rounded-2xl p-7 transition-all duration-400 h-full backdrop-blur-sm hover:shadow-[0_10px_30px_rgba(102,255,228,0.1)]">
                        {/* Animated border glow */}
                        <div className="absolute inset-0 bg-gradient-to-r from-[rgb(102,255,228)]/20 via-transparent to-[rgb(102,255,228)]/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{animation: 'borderGlow 2s ease-in-out infinite'}} />

                        <div className="flex flex-col items-center text-center gap-4 h-full relative z-10">
                          <div className="w-14 h-14 rounded-xl bg-white/15 group-hover:bg-[rgb(102,255,228)]/20 flex items-center justify-center transition-all duration-300 group-hover:scale-110 relative overflow-hidden">
                            {/* Rotating background on hover */}
                            <div className="absolute inset-0 bg-gradient-to-r from-[rgb(102,255,228)]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{animation: 'rotate 4s linear infinite'}} />
                            <item.icon className="h-6 w-6 text-white/80 group-hover:text-[rgb(102,255,228)] transition-colors relative z-10" strokeWidth={1.5} />
                          </div>
                          <p className="text-sm font-semibold text-white/90 leading-snug">{item.name}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <style>{`
                  @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                  }
                  @keyframes borderGlow {
                    0%, 100% { opacity: 0; }
                    50% { opacity: 1; }
                  }
                  @keyframes rotate {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                `}</style>
              </div>

              {/* Export Formats */}
              <div>
                <div className="flex items-center gap-4 mb-10">
                  <div className="h-1 w-12 bg-gradient-to-r from-[rgb(102,255,228)] to-transparent"></div>
                  <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Export & Publishing</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
                  {[
                    { image: "/attached_assets/images/toppng.com-exporter-pdf-en-450x423.png", name: "PDF" },
                    { image: "/attached_assets/images/toppng.com-shadow-microsoft-icons-by-blackvariant-microsoft-office-2013-899x899.png", name: "DOCX" },
                    { image: "/attached_assets/images/toppng.com-custom-software-development-web-application-development-451x333.png", name: "HTML" },
                    { image: "/attached_assets/images/toppng.com-markdown-logo-830x512.png", name: "Markdown" },
                    { image: "/attached_assets/images/json-file-document-icon-png-image_927931.jpg", name: "JSON" }
                  ].map((item, idx) => (
                    <div key={item.name} className="group" style={{animation: `scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${idx * 0.12}s both`}}>
                      <div className="relative bg-gradient-to-br from-white/10 to-white/5 hover:from-white/15 hover:to-white/10 border border-white/20 hover:border-[rgb(102,255,228)]/40 rounded-2xl p-7 transition-all duration-400 h-full backdrop-blur-sm hover:shadow-[0_10px_30px_rgba(102,255,228,0.1)]">
                        {/* Shimmer effect on hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{animation: 'shimmer 2s infinite'}} />

                        <div className="flex flex-col items-center text-center gap-4 h-full relative z-10">
                          <div className="w-14 h-14 rounded-xl bg-white/15 group-hover:bg-[rgb(102,255,228)]/20 flex items-center justify-center transition-all duration-300 group-hover:scale-110 overflow-hidden relative">
                            {/* Pulsing background */}
                            <div className="absolute inset-0 bg-[rgb(102,255,228)]/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{animation: 'pulse 2s ease-in-out infinite'}} />
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-8 w-8 object-contain group-hover:brightness-125 transition-all relative z-10"
                              style={{animation: 'iconBounce 2s ease-in-out infinite'}}
                            />
                          </div>
                          <p className="text-sm font-semibold text-white/90 leading-snug">{item.name}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <style>{`
                  @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.8); }
                    to { opacity: 1; transform: scale(1); }
                  }
                  @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                  }
                  @keyframes pulse {
                    0%, 100% { opacity: 0.3; }
                    50% { opacity: 1; }
                  }
                  @keyframes iconBounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-6px); }
                  }
                `}</style>
              </div>

              {/* Quality & Features */}
              <div>
                <div className="flex items-center gap-4 mb-10">
                  <div className="h-1 w-12 bg-gradient-to-r from-[rgb(102,255,228)] to-transparent"></div>
                  <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Quality & Features</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
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
                    <div key={item.name} className="group">
                      <div className="relative bg-gradient-to-br from-white/10 to-white/5 hover:from-white/15 hover:to-white/10 border border-white/20 hover:border-[rgb(102,255,228)]/40 rounded-2xl p-7 transition-all duration-400 h-full backdrop-blur-sm hover:shadow-[0_10px_30px_rgba(102,255,228,0.1)]">
                        <div className="flex flex-col items-center text-center gap-4 h-full">
                          <div className="w-14 h-14 rounded-xl bg-white/15 group-hover:bg-[rgb(102,255,228)]/20 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                            <item.icon className="h-6 w-6 text-white/80 group-hover:text-[rgb(102,255,228)] transition-colors" strokeWidth={1.5} />
                          </div>
                          <p className="text-sm font-semibold text-white/90 leading-snug">{item.name}</p>
                        </div>
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4 mb-6">
                {[
                  { image: "/attached_assets/images/toppng.com-exporter-pdf-en-450x423.png", name: 'PDF' },
                  { image: "/attached_assets/images/toppng.com-shadow-microsoft-icons-by-blackvariant-microsoft-office-2013-899x899.png", name: 'DOCX' },
                  { image: "/attached_assets/images/toppng.com-custom-software-development-web-application-development-451x333.png", name: 'HTML' },
                  { image: "/attached_assets/images/toppng.com-markdown-logo-830x512.png", name: 'Markdown' },
                  { image: "/attached_assets/images/json-file-document-icon-png-image_927931.jpg", name: 'JSON' }
                ].map((fmt) => (
                  <div key={fmt.name} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 md:p-6 text-center hover:bg-white/15 hover:border-[rgb(102,255,228)]/40 hover:shadow-lg transition-all duration-300 transform hover:scale-110 cursor-default focus-within:ring-2 focus-within:ring-[rgb(102,255,228)]/50">
                    <img
                      src={fmt.image}
                      alt={fmt.name}
                      className="h-6 md:h-8 w-6 md:w-8 mx-auto mb-2 object-contain transition-all hover:brightness-150"
                    />
                    <h5 className="font-semibold text-white text-sm md:text-base">{fmt.name}</h5>
                  </div>
                ))}
              </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/30 hover:border-[rgb(102,255,228)]/40 rounded-2xl p-6 md:p-8 transition-all duration-500 hover:shadow-2xl">
                <div className="flex items-center justify-center gap-3 mb-4 flex-wrap">
                  <GlobeAltIcon className="h-5 md:h-6 text-[rgb(102,255,228)]" strokeWidth={1.5} aria-hidden="true" />
                  <h5 className="text-lg md:text-xl font-bold text-white">Custom Domain Publishing</h5>
                </div>
                <p className="text-white/80 text-sm md:text-base mb-4">Publish your docs at your own domain or use a hosted subdomain</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Input
                    type="text"
                    placeholder="example.com"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    className="flex-1 bg-white/20 border border-white/30 text-white placeholder:text-white/50 rounded-lg focus:border-[rgb(102,255,228)] focus:ring-2 focus:ring-[rgb(102,255,228)]/20 px-4 py-2"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/30 bg-white/20 hover:bg-white/30 text-white rounded-lg whitespace-nowrap font-semibold"
                  >
                    Publish
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Final CTA Section - Try it Free */}
      {!generatedDoc && (
        <section className="relative overflow-hidden bg-[rgb(34,38,46)] py-16 md:py-20 lg:py-28">
          <div className="absolute inset-0 bg-grid-white/[0.02] opacity-30" />
          <div className="relative container mx-auto px-6 max-w-5xl text-center">
            <div className="space-y-8 md:space-y-12">
              {/* Heading */}
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-black leading-tight text-white tracking-tight">
                Try it for <span className="text-[rgb(102,255,228)] font-semibold">free<span className="text-[rgb(102,255,228)] font-black">.</span></span>
              </h2>

              {/* Description */}
              <p className="text-lg md:text-2xl lg:text-3xl text-[rgb(228,232,236)] leading-relaxed max-w-3xl mx-auto font-light">
                Join&nbsp;<strong className="font-semibold">teams</strong>&nbsp;who've stopped guessing and started researching. Get comprehensive, accurate docs that match your brand&nbsp;<strong className="font-semibold">automatically</strong>
              </p>

              {/* CTA Button */}
              <div className="pt-4 md:pt-8">
                <a
                  href="https://quarkly.io/dashboard"
                  className="inline-block px-8 md:px-10 py-3 md:py-4 bg-[rgb(14,19,23)] border-4 border-[rgb(102,255,228)] text-white hover:bg-[rgb(102,255,228)] hover:text-[rgb(14,19,23)] font-bold text-base md:text-lg rounded-full uppercase tracking-wider transition-all duration-500 shadow-xl hover:shadow-2xl hover:scale-105 focus:outline-none focus:ring-4 focus:ring-[rgb(102,255,228)]/50 active:scale-95"
                >
                  Create DOC
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
