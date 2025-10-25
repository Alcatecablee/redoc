import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import PipelineVisualization from "@/components/PipelineVisualization";

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
  const navigate = useNavigate();
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
    if (!url) {
      toast({
        title: "URL Required",
        description: "Please enter a valid website URL",
        variant: "destructive",
      });
      return;
    }

    // Validate URL format
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch (e) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid website URL (e.g., https://example.com)",
        variant: "destructive",
      });
      return;
    }

    // Navigate to quotation page for instant quote
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    navigate(`/quotation?url=${encodeURIComponent(normalizedUrl)}`);
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
    <div className="min-h-screen bg-[rgb(14,19,23)]">
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
                For products with vibrant ecosystems—<strong>Stripe, Supabase, Next.js</strong>—your community has already documented you. We aggregate knowledge across <strong>Stack Overflow</strong>, <strong>GitHub</strong>, <strong>YouTube</strong>, <strong>Reddit</strong>, and 10+ sources then generate beautiful, <strong>Apple-quality docs</strong> that match your brand.
              </p>

              {/* URL Input with Generate Button */}
              <div className="pt-6 max-w-3xl mx-auto">
                <div className="relative group">
                  {/* Input Container */}
                  <div className="relative flex items-center bg-[rgb(14,19,23)] border-4 border-[rgb(102,255,228)] rounded-full shadow-xl group-hover:shadow-2xl transition-all duration-300">
                    {/* Globe Icon */}
                    <div className="absolute left-6 pointer-events-none">
                      <GlobeAltIcon className="h-6 w-6 text-[rgb(102,255,228)]" />
                    </div>
                    
                    {/* URL Input */}
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && url) {
                          handleGenerate();
                        }
                      }}
                      placeholder="Enter your website URL (e.g., https://example.com)"
                      className="flex-1 h-16 pl-16 pr-4 bg-transparent text-white placeholder-white/50 font-medium text-base focus:outline-none"
                    />
                    
                    {/* Generate Button */}
                    <Button
                      onClick={handleGenerate}
                      disabled={!url || generateMutation.isPending}
                      className="h-14 px-8 mr-1 bg-[rgb(102,255,228)] hover:bg-white text-[rgb(14,19,23)] font-bold text-base rounded-full uppercase tracking-wider transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generateMutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <ArrowPathIcon className="h-5 w-5 animate-spin" />
                          Generating...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <RocketLaunchIcon className="h-5 w-5" />
                          Generate Docs
                        </span>
                      )}
                    </Button>
                  </div>
                  
                  {/* Helper Text */}
                  <p className="mt-4 text-sm text-white/60 text-center font-light">
                    ✨ Built for DevRel teams • Aggregates 10+ community sources • Enterprise-ready
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Watch Demo Section - Premium Dark Design */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[rgb(36,77,91)] via-[rgb(40,85,100)] to-[rgb(36,77,91)] py-24 md:py-32 lg:py-40">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-grid-white/[0.02] opacity-50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-radial from-[rgb(102,255,228)]/10 via-transparent to-transparent blur-3xl" />

        <div className="relative container mx-auto px-6 max-w-7xl">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-6">
                <PlayCircleIcon className="h-4 w-4 text-[rgb(102,255,228)]" />
                <span className="text-sm font-semibold text-white/90 uppercase tracking-wide">See It In Action</span>
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                Watch the Magic Happen
              </h2>
              <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto">
                From URL to comprehensive documentation in under 5 minutes
              </p>
            </div>

            {/* Demo Card */}
            <div className="relative aspect-[16/9] w-full rounded-3xl border-2 border-white/25 hover:border-[rgb(102,255,228)]/50 bg-gradient-to-br from-white/15 via-white/10 to-white/5 backdrop-blur-xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.3)] hover:shadow-[0_30px_80px_rgba(102,255,228,0.2)] transition-all duration-500 group">
              {/* Decorative Elements */}
              <div className="absolute inset-0 bg-gradient-to-t from-[rgb(36,77,91)]/60 to-transparent" />
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[rgb(102,255,228)]/50 to-transparent" />
              <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[rgb(102,255,228)]/50 to-transparent" />
              
              {/* Corner Accents */}
              <div className="absolute top-0 left-0 w-24 h-24 border-t-2 border-l-2 border-[rgb(102,255,228)]/40 rounded-tl-3xl"></div>
              <div className="absolute bottom-0 right-0 w-24 h-24 border-b-2 border-r-2 border-[rgb(102,255,228)]/40 rounded-br-3xl"></div>

              {/* Demo Content */}
              <div className="relative flex items-center justify-center h-full p-8">
                <div className="text-center">
                  <div id="demo" className="w-28 md:w-36 h-28 md:h-36 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-[rgb(102,255,228)]/20 to-[rgb(102,255,228)]/10 backdrop-blur-sm flex items-center justify-center border-2 border-[rgb(102,255,228)]/40 shadow-2xl hover:scale-110 hover:shadow-[0_20px_50px_rgba(102,255,228,0.3)] transition-all duration-300 cursor-pointer group/play focus:outline-none focus:ring-4 focus:ring-[rgb(102,255,228)]/50" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { const el = document.getElementById('demo'); if(el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }}>
                    <PlayCircleIcon className="h-16 md:h-20 w-16 md:w-20 text-[rgb(102,255,228)] group-hover/play:scale-110 transition-transform" aria-hidden="true" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">Watch Demo Video</h3>
                  <p className="text-base md:text-lg text-white/80">See the complete workflow from start to finish</p>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="mt-16 grid grid-cols-3 gap-6 md:gap-8">
              {[
                { num: "1,000+", label: "Sections Generated", icon: DocumentTextIcon },
                { num: "5 min", label: "Average Build Time", icon: BoltIcon },
                { num: "10+", label: "Research Sources", icon: MagnifyingGlassIcon }
              ].map((stat, idx) => (
                <div key={idx} className="group relative">
                  <div className="relative bg-gradient-to-br from-white/15 to-white/5 border border-white/25 hover:border-[rgb(102,255,228)]/50 rounded-2xl p-6 md:p-8 transition-all duration-500 backdrop-blur-sm hover:shadow-[0_15px_40px_rgba(102,255,228,0.15)] hover:scale-105">
                    <div className="flex flex-col items-center text-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[rgb(102,255,228)]/20 to-[rgb(102,255,228)]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <stat.icon className="h-6 w-6 text-[rgb(102,255,228)]" strokeWidth={1.5} />
                      </div>
                      <div className="text-3xl md:text-4xl font-bold text-white group-hover:text-[rgb(102,255,228)] transition-colors">{stat.num}</div>
                      <p className="text-sm text-white/70 leading-tight">{stat.label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section - Comprehensive Process Flow */}
      <section id="how-it-works" className="relative overflow-hidden bg-gradient-to-br from-[rgb(14,19,23)] via-[rgb(24,29,37)] to-[rgb(34,38,46)] py-32 lg:py-40">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-grid-white/[0.02] opacity-30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-96 bg-gradient-radial from-[rgb(102,255,228)]/5 via-transparent to-transparent blur-3xl" />

        <div className="relative container mx-auto px-6 max-w-7xl">
          {/* Header */}
          <div className="text-center mb-24">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-6">
              <ArrowPathIcon className="h-4 w-4 text-[rgb(102,255,228)]" />
              <span className="text-sm font-semibold text-white/90 uppercase tracking-wide">The Process</span>
            </div>
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
              How It Works
            </h2>
            <p className="text-lg md:text-xl text-white/70 max-w-3xl mx-auto font-light">
              From URL to professional documentation in minutes. A fully automated pipeline that researches, synthesizes, and exports beautiful docs.
            </p>
          </div>

          {/* Process Flow */}
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Step 1: URL Input */}
            <div className="group relative">
              <div className="relative bg-gradient-to-br from-white/10 to-white/5 border border-white/20 hover:border-[rgb(102,255,228)]/50 rounded-3xl p-8 md:p-10 transition-all duration-500 backdrop-blur-sm hover:shadow-[0_20px_50px_rgba(102,255,228,0.1)]">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[rgb(102,255,228)]/20 to-[rgb(102,255,228)]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <GlobeAltIcon className="h-8 w-8 text-[rgb(102,255,228)]" strokeWidth={1.5} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-bold text-[rgb(102,255,228)] uppercase tracking-wider">Step 1</span>
                      <div className="h-px flex-1 bg-gradient-to-r from-[rgb(102,255,228)]/50 to-transparent"></div>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">Website URL Input</h3>
                    <p className="text-white/70 text-base leading-relaxed">
                      Simply paste your website URL and we'll handle the rest. Our system automatically discovers your entire product ecosystem.
                    </p>
                  </div>
                </div>
              </div>
              {/* Connector Arrow */}
              <div className="flex justify-center py-4">
                <div className="w-px h-8 bg-gradient-to-b from-[rgb(102,255,228)]/50 to-[rgb(102,255,228)]/20"></div>
              </div>
            </div>

            {/* Step 2: Site Discovery & Crawling */}
            <div className="group relative">
              <div className="relative bg-gradient-to-br from-white/10 to-white/5 border border-white/20 hover:border-[rgb(102,255,228)]/50 rounded-3xl p-8 md:p-10 transition-all duration-500 backdrop-blur-sm hover:shadow-[0_20px_50px_rgba(102,255,228,0.1)]">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[rgb(102,255,228)]/20 to-[rgb(102,255,228)]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <MagnifyingGlassIcon className="h-8 w-8 text-[rgb(102,255,228)]" strokeWidth={1.5} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-bold text-[rgb(102,255,228)] uppercase tracking-wider">Step 2</span>
                      <div className="h-px flex-1 bg-gradient-to-r from-[rgb(102,255,228)]/50 to-transparent"></div>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">Site Discovery & Crawling</h3>
                    <p className="text-white/70 text-base leading-relaxed">
                      Multi-domain crawling, sitemap parsing, subdomain enumeration, and intelligent link-graph analysis to prioritize high-value pages and extract all product information.
                    </p>
                  </div>
                </div>
              </div>
              {/* Connector Arrow */}
              <div className="flex justify-center py-4">
                <div className="w-px h-8 bg-gradient-to-b from-[rgb(102,255,228)]/50 to-[rgb(102,255,228)]/20"></div>
              </div>
            </div>

            {/* Step 3: Multi-Source Research Engine */}
            <div className="group relative">
              <div className="relative bg-gradient-to-br from-white/10 to-white/5 border border-white/20 hover:border-[rgb(102,255,228)]/50 rounded-3xl p-8 md:p-10 transition-all duration-500 backdrop-blur-sm hover:shadow-[0_20px_50px_rgba(102,255,228,0.1)]">
                <div className="flex flex-col md:flex-row items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[rgb(102,255,228)]/20 to-[rgb(102,255,228)]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Square3Stack3DIcon className="h-8 w-8 text-[rgb(102,255,228)]" strokeWidth={1.5} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-bold text-[rgb(102,255,228)] uppercase tracking-wider">Step 3</span>
                      <div className="h-px flex-1 bg-gradient-to-r from-[rgb(102,255,228)]/50 to-transparent"></div>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">Multi-Source Research Engine</h3>
                    <p className="text-white/70 text-base leading-relaxed mb-6">
                      We aggregate community knowledge across 10+ authoritative sources to capture how developers actually use your product.
                    </p>
                    {/* Research Sources Grid */}
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                      {[
                        { icon: CodeBracketIcon, label: "Stack Overflow" },
                        { icon: CodeBracketIcon, label: "GitHub Issues" },
                        { icon: VideoCameraIcon, label: "YouTube" },
                        { icon: ChatBubbleLeftRightIcon, label: "Reddit" },
                        { icon: DocumentTextIcon, label: "DEV.to" },
                        { icon: CodeBracketIcon, label: "CodeProject" },
                        { icon: AcademicCapIcon, label: "Stack Exchange" },
                        { icon: QuestionMarkCircleIcon, label: "Quora" },
                        { icon: BuildingOfficeIcon, label: "Forums" },
                      ].map((source) => (
                        <div key={source.label} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-[rgb(102,255,228)]/30 transition-all">
                          <source.icon className="h-5 w-5 text-white/60" strokeWidth={1.5} />
                          <span className="text-xs text-white/60 text-center leading-tight">{source.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {/* Connector Arrow */}
              <div className="flex justify-center py-4">
                <div className="w-px h-8 bg-gradient-to-b from-[rgb(102,255,228)]/50 to-[rgb(102,255,228)]/20"></div>
              </div>
            </div>

            {/* Step 4: AI Content Synthesis */}
            <div className="group relative">
              <div className="relative bg-gradient-to-br from-white/10 to-white/5 border border-white/20 hover:border-[rgb(102,255,228)]/50 rounded-3xl p-8 md:p-10 transition-all duration-500 backdrop-blur-sm hover:shadow-[0_20px_50px_rgba(102,255,228,0.1)]">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[rgb(102,255,228)]/20 to-[rgb(102,255,228)]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <BoltIcon className="h-8 w-8 text-[rgb(102,255,228)]" strokeWidth={1.5} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-bold text-[rgb(102,255,228)] uppercase tracking-wider">Step 4</span>
                      <div className="h-px flex-1 bg-gradient-to-r from-[rgb(102,255,228)]/50 to-transparent"></div>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">AI Content Synthesis (GPT-4o)</h3>
                    <p className="text-white/70 text-base leading-relaxed">
                      Advanced AI transforms scattered research into coherent, comprehensive documentation with proper structure, code examples, and source citations.
                    </p>
                  </div>
                </div>
              </div>
              {/* Connector Arrow */}
              <div className="flex justify-center py-4">
                <div className="w-px h-8 bg-gradient-to-b from-[rgb(102,255,228)]/50 to-[rgb(102,255,228)]/20"></div>
              </div>
            </div>

            {/* Step 5: SEO Optimization */}
            <div className="group relative">
              <div className="relative bg-gradient-to-br from-white/10 to-white/5 border border-white/20 hover:border-[rgb(102,255,228)]/50 rounded-3xl p-8 md:p-10 transition-all duration-500 backdrop-blur-sm hover:shadow-[0_20px_50px_rgba(102,255,228,0.1)]">
                <div className="flex flex-col md:flex-row items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[rgb(102,255,228)]/20 to-[rgb(102,255,228)]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <RocketLaunchIcon className="h-8 w-8 text-[rgb(102,255,228)]" strokeWidth={1.5} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-bold text-[rgb(102,255,228)] uppercase tracking-wider">Step 5</span>
                      <div className="h-px flex-1 bg-gradient-to-r from-[rgb(102,255,228)]/50 to-transparent"></div>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">SEO Optimization</h3>
                    <p className="text-white/70 text-base leading-relaxed mb-4">
                      Pro and Enterprise plans include comprehensive SEO optimization to ensure your documentation ranks well and drives organic traffic.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        "Metadata Generation",
                        "Schema Markup",
                        "Sitemap Creation",
                        "Keyword Optimization",
                      ].map((feature) => (
                        <div key={feature} className="flex items-center gap-2 text-white/60">
                          <CheckBadgeIcon className="h-5 w-5 text-[rgb(102,255,228)]/70 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {/* Connector Arrow */}
              <div className="flex justify-center py-4">
                <div className="w-px h-8 bg-gradient-to-b from-[rgb(102,255,228)]/50 to-[rgb(102,255,228)]/20"></div>
              </div>
            </div>

            {/* Step 6: Professional Output */}
            <div className="group relative">
              <div className="relative bg-gradient-to-br from-[rgb(102,255,228)]/15 to-[rgb(102,255,228)]/5 border-2 border-[rgb(102,255,228)]/40 rounded-3xl p-8 md:p-10 transition-all duration-500 backdrop-blur-sm shadow-[0_20px_50px_rgba(102,255,228,0.15)]">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[rgb(102,255,228)]/30 to-[rgb(102,255,228)]/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <DocumentTextIcon className="h-8 w-8 text-[rgb(102,255,228)]" strokeWidth={1.5} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-bold text-[rgb(102,255,228)] uppercase tracking-wider">Final Output</span>
                      <div className="h-px flex-1 bg-gradient-to-r from-[rgb(102,255,228)]/50 to-transparent"></div>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">Professional Documentation Output</h3>
                    <p className="text-white/70 text-base leading-relaxed mb-4">
                      Export your documentation in multiple formats, all matching your brand identity and ready for immediate deployment.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {["PDF", "DOCX", "HTML", "Markdown", "JSON"].map((format) => (
                        <div key={format} className="px-4 py-2 rounded-lg bg-white/10 border border-[rgb(102,255,228)]/30 text-white/80 text-sm font-semibold hover:bg-white/15 transition-all">
                          {format}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-20">
            <div className="inline-flex flex-col items-center gap-4 px-8 py-6 rounded-3xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-sm">
              <p className="text-white/80 text-lg font-light">
                <span className="font-bold text-[rgb(102,255,228)]">Average build time:</span> 5 minutes
              </p>
              <Button
                size="lg"
                asChild
                className="h-12 px-8 bg-[rgb(102,255,228)] text-[rgb(14,19,23)] hover:bg-[rgb(102,255,228)]/90 font-bold text-base rounded-full uppercase tracking-wider transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-105"
              >
                <a href="#hero">Get Started Now</a>
              </Button>
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

      {/* WHY Section - Problem/Solution Framework */}
      {!generatedDoc && (
        <section id="why" className="relative overflow-hidden bg-gradient-to-br from-[rgb(142,209,198)] via-[rgb(152,219,208)] to-[rgb(142,209,198)] py-32 lg:py-40">
          {/* Background Elements */}
          <div className="absolute inset-0 bg-grid-white/[0.03] opacity-40" />
          <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-radial from-white/10 via-transparent to-transparent blur-3xl" />
          
          <div className="relative container mx-auto px-6 max-w-7xl">
            {/* Header */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 border border-white/30 backdrop-blur-sm mb-6">
                <QuestionMarkCircleIcon className="h-4 w-4 text-gray-900" strokeWidth={2} />
                <span className="text-sm font-semibold text-gray-900 uppercase tracking-wide">The Problem</span>
              </div>
              <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
                Your Community is Documenting You Already
              </h2>
              <p className="text-xl md:text-2xl text-gray-800 max-w-3xl mx-auto leading-relaxed">
                <strong>DevRel teams</strong> at established companies spend 20-40 hours per month manually researching Stack Overflow, GitHub, and community discussions. <strong>We automate it.</strong>
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 max-w-6xl mx-auto">
              {/* Problem Cards */}
              {[
                {
                  icon: MagnifyingGlassIcon,
                  title: "Community Knowledge is Scattered",
                  problems: [
                    "Stack Overflow has 200+ questions about your product",
                    "GitHub Issues reveal real bugs users are hitting",
                    "YouTube tutorials show how people actually use it"
                  ]
                },
                {
                  icon: QuestionMarkCircleIcon,
                  title: "DevRel Teams are Drowning",
                  problems: [
                    "20-40 hours/month manually searching community sources",
                    "Official docs fall out of sync with community reality",
                    "No systematic way to track what users are saying"
                  ]
                },
                {
                  icon: SwatchIcon,
                  title: "Documentation Gets Outdated",
                  problems: [
                    "Community evolves faster than docs can keep up",
                    "New edge cases emerge in Stack Overflow daily",
                    "Support tickets repeat questions already answered online"
                  ]
                },
                {
                  icon: ShieldCheckIcon,
                  title: "Expensive Manual Process",
                  problems: [
                    "Technical writers cost $75-125/hour to research manually",
                    "DevRel consultants charge $150-300/hour",
                    "Documentation projects take weeks, cost $5K-$20K each"
                  ]
                }
              ].map((item, idx) => (
                <div key={idx} className="group">
                  <div className="relative bg-white/60 backdrop-blur-sm border-2 border-gray-900/15 hover:border-gray-900/30 rounded-3xl p-8 md:p-10 transition-all duration-500 hover:shadow-2xl hover:scale-105">
                    {/* Decorative corner */}
                    <div className="absolute top-0 right-0 w-20 h-20 border-t-2 border-r-2 border-gray-900/20 rounded-tr-3xl"></div>
                    
                    <div className="relative z-10">
                      <div className="w-14 h-14 rounded-xl bg-gray-900/10 group-hover:bg-gray-900/15 flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300">
                        <item.icon className="h-7 w-7 text-gray-900" strokeWidth={1.5} />
                      </div>
                      
                      <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-5 leading-tight">{item.title}</h3>
                      
                      <ul className="space-y-3">
                        {item.problems.map((problem, pidx) => (
                          <li key={pidx} className="flex items-start gap-3 text-gray-800">
                            <div className="flex-shrink-0 w-2 h-2 rounded-full bg-gray-900 mt-2"></div>
                            <span className="text-base leading-relaxed">{problem}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Solution CTA */}
            <div className="mt-16 text-center">
              <div className="inline-flex flex-col items-center gap-4 px-10 py-8 rounded-3xl bg-white/70 backdrop-blur-sm border-2 border-gray-900/20 shadow-2xl">
                <CheckBadgeIcon className="h-12 w-12 text-gray-900" strokeWidth={1.5} />
                <h4 className="text-2xl md:text-3xl font-bold text-gray-900">We Solve All of This for DevRel Teams</h4>
                <p className="text-lg text-gray-800 max-w-xl">
                  Automated community intelligence, continuous documentation refresh, and enterprise-grade reliability—all for less than one technical writer's hourly rate.
                </p>
                <Button
                  size="lg"
                  asChild
                  className="mt-2 h-14 px-10 bg-gray-900 text-white hover:bg-gray-800 font-bold text-base rounded-full uppercase tracking-wider transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-105"
                >
                  <a href="#how-it-works">See How It Works</a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Pipeline Section - Enhanced Visual Storytelling */}
      {!generatedDoc && (
        <section id="pipeline" className="relative overflow-hidden bg-gradient-to-br from-[rgb(36,77,91)] via-[rgb(40,85,100)] to-[rgb(36,77,91)] py-32 lg:py-40">
          {/* Background Elements */}
          <div className="absolute inset-0 bg-grid-white/[0.02] opacity-50" />
          <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-gradient-radial from-[rgb(102,255,228)]/10 via-transparent to-transparent blur-3xl" />

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
                A systematic 4-stage process that transforms scattered internet knowledge into comprehensive, accurate documentation
              </p>
            </div>

            {/* Visual Pipeline Grid */}
            <div className="relative max-w-6xl mx-auto mb-24">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 relative">
                {[
                  { num: "01", icon: GlobeAltIcon, title: "Site Discovery", desc: "Crawl multiple domains, parse sitemaps, and extract all structured content and code samples.", color: "from-cyan-500/20 to-cyan-500/10" },
                  { num: "02", icon: MagnifyingGlassIcon, title: "Content Extraction", desc: "Extract code samples, configuration files, and metadata. Normalize and structure for maximum clarity.", color: "from-blue-500/20 to-blue-500/10" },
                  { num: "03", icon: DocumentMagnifyingGlassIcon, title: "External Research", desc: "Search Stack Overflow, GitHub, YouTube, Reddit, and 5+ sources. Score and rank by authority and relevance.", color: "from-purple-500/20 to-purple-500/10" },
                  { num: "04", icon: Square3Stack3DIcon, title: "Synthesis & Export", desc: "Synthesize findings into clear docs, apply your brand, validate citations, and export to any format.", color: "from-green-500/20 to-green-500/10" }
                ].map((stage, idx) => (
                  <div key={idx} className="group relative">
                    <div className="relative bg-gradient-to-br from-white/15 to-white/5 border-2 border-white/25 hover:border-[rgb(102,255,228)]/60 rounded-3xl p-8 transition-all duration-500 h-full backdrop-blur-sm hover:bg-gradient-to-br hover:from-white/20 hover:to-white/10 shadow-2xl hover:shadow-[0_25px_60px_rgba(102,255,228,0.2)] hover:scale-105">
                      {/* Stage Number Watermark */}
                      <div className="absolute top-6 right-6 text-7xl font-black text-white/10 group-hover:text-[rgb(102,255,228)]/25 transition-colors leading-none">{stage.num}</div>
                      
                      {/* Icon */}
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${stage.color} group-hover:bg-gradient-to-br group-hover:from-[rgb(102,255,228)]/30 group-hover:to-[rgb(102,255,228)]/15 flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300 relative z-10`}>
                        <stage.icon className="h-7 w-7 text-white" strokeWidth={1.5} />
                      </div>
                      
                      <h3 className="text-2xl font-bold text-white mb-3 leading-tight relative z-10">{stage.title}</h3>
                      <p className="text-white/75 text-base leading-relaxed relative z-10">{stage.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trust Card - Enhanced Source Attribution */}
            <div className="max-w-4xl mx-auto bg-gradient-to-br from-[rgb(102,255,228)]/15 to-[rgb(102,255,228)]/5 border-2 border-[rgb(102,255,228)]/40 rounded-3xl p-10 md:p-14 text-center shadow-[0_25px_60px_rgba(102,255,228,0.25)] hover:shadow-[0_30px_80px_rgba(102,255,228,0.3)] transition-all duration-500 hover:border-[rgb(102,255,228)]/60">
              {/* Decorative corners */}
              <div className="absolute top-0 left-0 w-24 h-24 border-t-2 border-l-2 border-[rgb(102,255,228)]/60 rounded-tl-3xl"></div>
              <div className="absolute bottom-0 right-0 w-24 h-24 border-b-2 border-r-2 border-[rgb(102,255,228)]/60 rounded-br-3xl"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-center gap-4 mb-6">
                  <div className="p-3 bg-[rgb(102,255,228)]/25 rounded-full">
                    <CheckBadgeIcon className="h-10 w-10 text-[rgb(102,255,228)]" aria-hidden="true" />
                  </div>
                  <h4 className="text-3xl md:text-4xl font-bold text-white">100% Source Attribution</h4>
                </div>
                <p className="text-white/90 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">
                  Every insight is traced to its source. Quality scored, validated for reliability, and fully transparent so you can verify any claim.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Features Section - Capability Showcase */}
      {!generatedDoc && (
        <section id="features" className="relative overflow-hidden bg-gradient-to-br from-[rgb(14,19,23)] via-[rgb(24,29,37)] to-[rgb(34,38,46)] py-32 lg:py-40">
          {/* Background Elements */}
          <div className="absolute inset-0 bg-grid-white/[0.02] opacity-30" />
          <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-gradient-radial from-[rgb(102,255,228)]/10 via-transparent to-transparent blur-3xl" />
          <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-gradient-radial from-[rgb(102,255,228)]/5 via-transparent to-transparent blur-3xl" />

          <div className="relative container mx-auto px-6 max-w-7xl">
            {/* Header */}
            <div className="text-center mb-24">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-6">
                <Square3Stack3DIcon className="h-4 w-4 text-[rgb(102,255,228)]" />
                <span className="text-sm font-semibold text-white/90 uppercase tracking-wide">Research Engine</span>
              </div>
              <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
                Built on Real User Knowledge
              </h2>
              <p className="text-lg md:text-xl text-white/70 max-w-3xl mx-auto mb-12 font-light">
                No guessing. We research how developers actually use your product across 10+ authoritative sources and synthesize comprehensive documentation.
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-16">
                {[
                  { metric: "10+", label: "Research Sources", icon: MagnifyingGlassIcon },
                  { metric: "100%", label: "Source Attribution", icon: CheckBadgeIcon },
                  { metric: "AI-Powered", label: "Quality Scoring", icon: BoltIcon },
                ].map((stat, idx) => (
                  <div key={idx} className="group relative">
                    <div className="relative bg-gradient-to-br from-white/10 to-white/5 border border-white/20 hover:border-[rgb(102,255,228)]/50 rounded-2xl p-6 transition-all duration-500 backdrop-blur-sm hover:shadow-[0_10px_30px_rgba(102,255,228,0.15)]">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[rgb(102,255,228)]/20 to-[rgb(102,255,228)]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <stat.icon className="h-6 w-6 text-[rgb(102,255,228)]" strokeWidth={1.5} />
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-white mb-1 group-hover:text-[rgb(102,255,228)] transition-colors">{stat.metric}</div>
                          <p className="text-sm text-white/70 leading-tight">{stat.label}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Multi-Source Research Engine - Enhanced */}
              <div className="relative bg-gradient-to-br from-[rgb(102,255,228)]/15 to-[rgb(102,255,228)]/5 border-2 border-[rgb(102,255,228)]/40 rounded-3xl p-10 md:p-12 max-w-4xl mx-auto backdrop-blur-sm shadow-[0_20px_50px_rgba(102,255,228,0.2)] hover:shadow-[0_30px_70px_rgba(102,255,228,0.25)] transition-all duration-500">
                {/* Decorative corner accents */}
                <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-l-2 border-[rgb(102,255,228)]/60 rounded-tl-3xl"></div>
                <div className="absolute bottom-0 right-0 w-20 h-20 border-b-2 border-r-2 border-[rgb(102,255,228)]/60 rounded-br-3xl"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center justify-center gap-3 mb-5">
                    <div className="h-px w-16 bg-gradient-to-r from-transparent via-[rgb(102,255,228)]/50 to-[rgb(102,255,228)]"></div>
                    <Square3Stack3DIcon className="h-8 w-8 text-[rgb(102,255,228)]" strokeWidth={1.5} />
                    <div className="h-px w-16 bg-gradient-to-l from-transparent via-[rgb(102,255,228)]/50 to-[rgb(102,255,228)]"></div>
                  </div>
                  <h3 className="text-3xl md:text-4xl font-bold text-white mb-5">Multi-Source Research Engine</h3>
                  <p className="text-white/90 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">
                    We analyze your website, then research across <strong className="text-white">Stack Overflow</strong>, <strong className="text-white">GitHub</strong>, <strong className="text-white">YouTube</strong>, <strong className="text-white">Reddit</strong>, <strong className="text-white">DEV.to</strong>, <strong className="text-white">CodeProject</strong>, <strong className="text-white">Stack Exchange</strong>, <strong className="text-white">Quora</strong>, and official forums. Every insight is quality-scored and source-attributed for maximum reliability.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Capability Grid */}
            <div className="space-y-24">
              {/* Research Sources */}
              <div>
                <div className="flex flex-col items-center text-center mb-12">
                  <div className="inline-flex items-center gap-3 mb-4">
                    <div className="h-px w-12 bg-gradient-to-r from-transparent to-[rgb(102,255,228)]"></div>
                    <MagnifyingGlassIcon className="h-6 w-6 text-[rgb(102,255,228)]" strokeWidth={1.5} />
                    <div className="h-px w-12 bg-gradient-to-l from-transparent to-[rgb(102,255,228)]"></div>
                  </div>
                  <h3 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">Research Sources</h3>
                  <p className="text-white/70 text-lg max-w-2xl">
                    Real insights from where developers actually learn and troubleshoot
                  </p>
                </div>
                
                <div className="relative">
                  {/* Enhanced animated background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[rgb(102,255,228)]/5 via-transparent to-[rgb(102,255,228)]/5 rounded-3xl blur-xl"></div>
                  
                  {/* SVG Animated connecting lines */}
                  <svg className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1200 400" style={{opacity: 0.2}}>
                    <defs>
                      <linearGradient id="cyanPulse" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="rgb(102,255,228)" stopOpacity="0" />
                        <stop offset="50%" stopColor="rgb(102,255,228)" stopOpacity="1" />
                        <stop offset="100%" stopColor="rgb(102,255,228)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <g strokeLinecap="round" strokeWidth="1.5" fill="none">
                      <path d="M50 200 Q300 100, 550 200 T1050 200" stroke="url(#cyanPulse)" strokeDasharray="8 4" strokeDashoffset="0" style={{animation: 'flowCyan 8s linear infinite'}} />
                      <path d="M100 250 Q400 350, 700 250 T1200 250" stroke="url(#cyanPulse)" strokeDasharray="8 4" strokeDashoffset="0" style={{animation: 'flowCyan 10s linear infinite 2s'}} />
                    </g>
                  </svg>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-5 relative z-10">
                    {[
                      { image: "/attached_assets/images/Stack-Overflow-Logo-emblem-of-the-programming-community-transparent-png-image.png", name: "Stack Overflow", desc: "Q&A Solutions" },
                      { image: "/attached_assets/images/toppng.com-github-logo-524x512.png", name: "GitHub Issues", desc: "Real Bugs" },
                      { image: "/attached_assets/images/toppng.com-youtube-icon-1024x1024.png", name: "YouTube", desc: "Video Tutorials" },
                      { image: "/attached_assets/images/toppng.com-reddit-logo-reddit-icon-698x698.png", name: "Reddit", desc: "Community Posts" },
                      { image: "/attached_assets/images/dev-rainbow.png", name: "DEV.to", desc: "Best Practices" },
                      { image: "/attached_assets/images/toppng.com-custom-software-development-web-application-development-451x333.png", name: "CodeProject", desc: "Code Examples" },
                      { icon: DocumentTextIcon, name: "Stack Exchange", desc: "Expert Knowledge" },
                      { icon: ChatBubbleLeftRightIcon, name: "Quora", desc: "Expert Insights" },
                      { icon: GlobeAltIcon, name: "Official Forums", desc: "Product-Specific" },
                      { icon: MagnifyingGlassIcon, name: "Web Search", desc: "Comprehensive" },
                      { icon: DocumentMagnifyingGlassIcon, name: "Internal Docs", desc: "Official Guides" }
                    ].map((item, idx) => (
                      <div key={item.name} className="group" style={{animationDelay: `${idx * 50}ms`}}>
                        <div className="relative bg-gradient-to-br from-white/10 to-white/5 hover:from-white/15 hover:to-white/10 border border-white/20 hover:border-[rgb(102,255,228)]/50 rounded-2xl p-5 md:p-6 transition-all duration-400 h-full backdrop-blur-sm hover:shadow-[0_15px_40px_rgba(102,255,228,0.15)] hover:scale-105">
                          {/* Glow effect on hover */}
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[rgb(102,255,228)]/0 to-[rgb(102,255,228)]/0 group-hover:from-[rgb(102,255,228)]/5 group-hover:to-transparent transition-all duration-400"></div>
                          
                          <div className="flex flex-col items-center text-center gap-3 h-full relative z-10">
                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-white/15 group-hover:bg-[rgb(102,255,228)]/25 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 overflow-hidden shadow-lg">
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="h-6 w-6 md:h-8 md:w-8 object-contain group-hover:brightness-125 transition-all"
                                />
                              ) : (
                                <item.icon className="h-5 w-5 md:h-6 md:w-6 text-white/80 group-hover:text-[rgb(102,255,228)] transition-colors" strokeWidth={1.5} />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white/95 leading-snug mb-1">{item.name}</p>
                              <p className="text-xs text-white/60 leading-tight">{item.desc}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <style>{`
                  @keyframes flowCyan {
                    0% { stroke-dashoffset: 0; }
                    100% { stroke-dashoffset: 100; }
                  }
                `}</style>
              </div>

              {/* Documentation Types */}
              <div>
                <div className="flex flex-col items-center text-center mb-12">
                  <div className="inline-flex items-center gap-3 mb-4">
                    <div className="h-px w-12 bg-gradient-to-r from-transparent to-[rgb(102,255,228)]"></div>
                    <DocumentTextIcon className="h-6 w-6 text-[rgb(102,255,228)]" strokeWidth={1.5} />
                    <div className="h-px w-12 bg-gradient-to-l from-transparent to-[rgb(102,255,228)]"></div>
                  </div>
                  <h3 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">Documentation Types</h3>
                  <p className="text-white/70 text-lg max-w-2xl">
                    Comprehensive coverage for every stage of the developer journey
                  </p>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
                  {[
                    { icon: DocumentTextIcon, name: "Getting Started", desc: "Quick Setup Guides" },
                    { icon: AcademicCapIcon, name: "Tutorials", desc: "Step-by-Step" },
                    { icon: QuestionMarkCircleIcon, name: "FAQs", desc: "Common Questions" },
                    { icon: BoltIcon, name: "Troubleshooting", desc: "Error Solutions" },
                    { icon: CodeBracketIcon, name: "API Docs", desc: "Technical Reference" },
                    { icon: CheckBadgeIcon, name: "Best Practices", desc: "Expert Tips" },
                    { icon: Square3Stack3DIcon, name: "Examples", desc: "Code Samples" },
                    { icon: ShieldCheckIcon, name: "Security", desc: "Safety Guidelines" }
                  ].map((item, idx) => (
                    <div key={item.name} className="group" style={{animationDelay: `${idx * 40}ms`}}>
                      <div className="relative bg-gradient-to-br from-white/10 to-white/5 hover:from-white/15 hover:to-white/10 border border-white/20 hover:border-[rgb(102,255,228)]/50 rounded-2xl p-6 md:p-7 transition-all duration-400 h-full backdrop-blur-sm hover:shadow-[0_15px_40px_rgba(102,255,228,0.15)] hover:scale-105">
                        {/* Glow effect */}
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[rgb(102,255,228)]/0 to-[rgb(102,255,228)]/0 group-hover:from-[rgb(102,255,228)]/5 group-hover:to-transparent transition-all duration-400"></div>
                        
                        <div className="flex flex-col items-center text-center gap-3 h-full relative z-10">
                          <div className="w-14 h-14 rounded-xl bg-white/15 group-hover:bg-[rgb(102,255,228)]/25 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-lg">
                            <item.icon className="h-6 w-6 text-white/80 group-hover:text-[rgb(102,255,228)] transition-colors" strokeWidth={1.5} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white/95 leading-snug mb-1">{item.name}</p>
                            <p className="text-xs text-white/60 leading-tight">{item.desc}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Export Formats */}
              <div>
                <div className="flex flex-col items-center text-center mb-12">
                  <div className="inline-flex items-center gap-3 mb-4">
                    <div className="h-px w-12 bg-gradient-to-r from-transparent to-[rgb(102,255,228)]"></div>
                    <ArrowDownTrayIcon className="h-6 w-6 text-[rgb(102,255,228)]" strokeWidth={1.5} />
                    <div className="h-px w-12 bg-gradient-to-l from-transparent to-[rgb(102,255,228)]"></div>
                  </div>
                  <h3 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">Export & Publishing</h3>
                  <p className="text-white/70 text-lg max-w-2xl">
                    Download in any format or publish to your custom subdomain
                  </p>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-5">
                  {[
                    { image: "/attached_assets/images/toppng.com-exporter-pdf-en-450x423.png", name: "PDF", desc: "Print-Ready" },
                    { image: "/attached_assets/images/toppng.com-shadow-microsoft-icons-by-blackvariant-microsoft-office-2013-899x899.png", name: "DOCX", desc: "Editable Docs" },
                    { image: "/attached_assets/images/toppng.com-custom-software-development-web-application-development-451x333.png", name: "HTML", desc: "Web Pages" },
                    { image: "/attached_assets/images/toppng.com-markdown-logo-830x512.png", name: "Markdown", desc: "Developer Format" },
                    { image: "/attached_assets/images/json-file-document-icon-png-image_927931.jpg", name: "JSON", desc: "Structured Data" }
                  ].map((item, idx) => (
                    <div key={item.name} className="group" style={{animationDelay: `${idx * 40}ms`}}>
                      <div className="relative bg-gradient-to-br from-white/10 to-white/5 hover:from-white/15 hover:to-white/10 border border-white/20 hover:border-[rgb(102,255,228)]/50 rounded-2xl p-6 md:p-7 transition-all duration-400 h-full backdrop-blur-sm hover:shadow-[0_15px_40px_rgba(102,255,228,0.15)] hover:scale-105">
                        {/* Glow effect */}
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[rgb(102,255,228)]/0 to-[rgb(102,255,228)]/0 group-hover:from-[rgb(102,255,228)]/5 group-hover:to-transparent transition-all duration-400"></div>
                        
                        <div className="flex flex-col items-center text-center gap-3 h-full relative z-10">
                          <div className="w-14 h-14 rounded-xl bg-white/15 group-hover:bg-[rgb(102,255,228)]/25 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 overflow-hidden shadow-lg">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-8 w-8 object-contain group-hover:brightness-125 transition-all"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white/95 leading-snug mb-1">{item.name}</p>
                            <p className="text-xs text-white/60 leading-tight">{item.desc}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Enterprise Features */}
              <div>
                <div className="flex flex-col items-center text-center mb-12">
                  <div className="inline-flex items-center gap-3 mb-4">
                    <div className="h-px w-12 bg-gradient-to-r from-transparent to-[rgb(102,255,228)]"></div>
                    <BuildingOfficeIcon className="h-6 w-6 text-[rgb(102,255,228)]" strokeWidth={1.5} />
                    <div className="h-px w-12 bg-gradient-to-l from-transparent to-[rgb(102,255,228)]"></div>
                  </div>
                  <h3 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">Enterprise Features</h3>
                  <p className="text-white/70 text-lg max-w-2xl">
                    Production-ready capabilities for teams that demand the best
                  </p>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
                  {[
                    { icon: CheckBadgeIcon, name: "Quality Scoring", desc: "AI-Powered Validation" },
                    { icon: SwatchIcon, name: "Brand Styling", desc: "Auto-Match Colors" },
                    { icon: MagnifyingGlassIcon, name: "Full Search", desc: "Advanced Indexing" },
                    { icon: Cog6ToothIcon, name: "SEO Ready", desc: "Meta & Schema" },
                    { icon: ShieldCheckIcon, name: "Accessibility", desc: "WCAG Compliant" },
                    { icon: BuildingOfficeIcon, name: "Enterprise SSO", desc: "SAML & OAuth" },
                    { icon: ArrowPathIcon, name: "Auto Updates", desc: "Stay Current" },
                    { icon: ClipboardDocumentListIcon, name: "Analytics", desc: "Usage Insights" }
                  ].map((item, idx) => (
                    <div key={item.name} className="group" style={{animationDelay: `${idx * 40}ms`}}>
                      <div className="relative bg-gradient-to-br from-white/10 to-white/5 hover:from-white/15 hover:to-white/10 border border-white/20 hover:border-[rgb(102,255,228)]/50 rounded-2xl p-6 md:p-7 transition-all duration-400 h-full backdrop-blur-sm hover:shadow-[0_15px_40px_rgba(102,255,228,0.15)] hover:scale-105">
                        {/* Glow effect */}
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[rgb(102,255,228)]/0 to-[rgb(102,255,228)]/0 group-hover:from-[rgb(102,255,228)]/5 group-hover:to-transparent transition-all duration-400"></div>
                        
                        <div className="flex flex-col items-center text-center gap-3 h-full relative z-10">
                          <div className="w-14 h-14 rounded-xl bg-white/15 group-hover:bg-[rgb(102,255,228)]/25 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-lg">
                            <item.icon className="h-6 w-6 text-white/80 group-hover:text-[rgb(102,255,228)] transition-colors" strokeWidth={1.5} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white/95 leading-snug mb-1">{item.name}</p>
                            <p className="text-xs text-white/60 leading-tight">{item.desc}</p>
                          </div>
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

      {/* Enterprise-Grade Reliability & Publishing */}
      {!generatedDoc && (
        <section id="quality-exports" className="relative overflow-hidden bg-gradient-to-br from-[rgb(36,77,91)] via-[rgb(40,85,100)] to-[rgb(36,77,91)] py-32 lg:py-40">
          {/* Background Elements */}
          <div className="absolute inset-0 bg-grid-white/[0.02] opacity-50" />
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-[rgb(14,19,23)]/30 to-transparent" />
          
          <div className="relative container mx-auto px-6 max-w-7xl">
            {/* Header */}
            <div className="text-center mb-24">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-6">
                <ShieldCheckIcon className="h-4 w-4 text-[rgb(102,255,228)]" strokeWidth={2} />
                <span className="text-sm font-semibold text-white/90 uppercase tracking-wide">Enterprise-Grade</span>
              </div>
              <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                Built for Reliability
              </h2>
              <p className="text-lg md:text-xl text-white/70 max-w-3xl mx-auto">
                Pipeline monitoring, multi-provider fallbacks, and quality scoring deliver predictable outcomes every time
              </p>
            </div>
            
            {/* Reliability Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-28 max-w-6xl mx-auto">
              {[
                { 
                  icon: ClipboardDocumentListIcon, 
                  title: "Pipeline Monitoring", 
                  desc: "Stage-by-stage progress tracking with real-time recommendations and partial success handling for uninterrupted workflows"
                },
                { 
                  icon: ShieldCheckIcon, 
                  title: "Fallbacks & Retries", 
                  desc: "Automatic provider rotation, exponential backoff, smart timeouts, and intelligent caching ensure 99.9% reliability"
                },
                { 
                  icon: CheckBadgeIcon, 
                  title: "Quality Scoring", 
                  desc: "AI-powered research weighted by authority, freshness, and consensus across sources for maximum accuracy"
                }
              ].map((item, idx) => (
                <div key={idx} className="group relative">
                  <div className="relative bg-gradient-to-br from-white/15 to-white/5 border-2 border-white/25 hover:border-[rgb(102,255,228)]/60 rounded-3xl p-8 md:p-10 transition-all duration-500 backdrop-blur-sm hover:shadow-[0_25px_60px_rgba(102,255,228,0.2)] hover:scale-105 h-full">
                    {/* Decorative corner */}
                    <div className="absolute top-0 right-0 w-20 h-20 border-t-2 border-r-2 border-white/20 group-hover:border-[rgb(102,255,228)]/40 rounded-tr-3xl transition-colors"></div>
                    
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[rgb(102,255,228)]/20 to-[rgb(102,255,228)]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300">
                      <item.icon className="h-8 w-8 text-[rgb(102,255,228)]" strokeWidth={1.5} aria-hidden="true" />
                    </div>
                    <h4 className="text-2xl md:text-3xl font-bold text-white mb-4">{item.title}</h4>
                    <p className="text-white/75 leading-relaxed text-base">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Export & Publishing Section */}
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h3 className="text-4xl md:text-5xl font-bold text-white mb-4">Export & Publish Anywhere</h3>
                <p className="text-lg md:text-xl text-white/70">One-click exports in multiple formats or publish to your custom domain</p>
              </div>
              
              {/* Export Formats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-5 mb-12">
                {[
                  { image: "/attached_assets/images/toppng.com-exporter-pdf-en-450x423.png", name: 'PDF', desc: 'Print-Ready' },
                  { image: "/attached_assets/images/toppng.com-shadow-microsoft-icons-by-blackvariant-microsoft-office-2013-899x899.png", name: 'DOCX', desc: 'Editable' },
                  { image: "/attached_assets/images/toppng.com-custom-software-development-web-application-development-451x333.png", name: 'HTML', desc: 'Web Pages' },
                  { image: "/attached_assets/images/toppng.com-markdown-logo-830x512.png", name: 'Markdown', desc: 'Dev Format' },
                  { image: "/attached_assets/images/json-file-document-icon-png-image_927931.jpg", name: 'JSON', desc: 'Structured' }
                ].map((fmt, idx) => (
                  <div key={fmt.name} className="group">
                    <div className="relative bg-gradient-to-br from-white/15 to-white/5 border border-white/25 hover:border-[rgb(102,255,228)]/50 rounded-2xl p-6 text-center transition-all duration-400 hover:shadow-[0_15px_40px_rgba(102,255,228,0.15)] hover:scale-110 backdrop-blur-sm">
                      <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-white/10 group-hover:bg-[rgb(102,255,228)]/20 flex items-center justify-center transition-all">
                        <img
                          src={fmt.image}
                          alt={fmt.name}
                          className="h-8 w-8 object-contain group-hover:brightness-150 transition-all"
                        />
                      </div>
                      <h5 className="font-bold text-white text-sm mb-1">{fmt.name}</h5>
                      <p className="text-xs text-white/60">{fmt.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Custom Domain Publishing Card */}
              <div className="relative bg-gradient-to-br from-[rgb(102,255,228)]/15 to-[rgb(102,255,228)]/5 border-2 border-[rgb(102,255,228)]/40 rounded-3xl p-8 md:p-10 shadow-[0_25px_60px_rgba(102,255,228,0.25)] hover:shadow-[0_30px_80px_rgba(102,255,228,0.3)] transition-all duration-500">
                {/* Decorative corners */}
                <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-l-2 border-[rgb(102,255,228)]/60 rounded-tl-3xl"></div>
                <div className="absolute bottom-0 right-0 w-20 h-20 border-b-2 border-r-2 border-[rgb(102,255,228)]/60 rounded-br-3xl"></div>
                
                <div className="relative z-10">
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                    <div className="p-3 bg-[rgb(102,255,228)]/25 rounded-full">
                      <GlobeAltIcon className="h-8 w-8 text-[rgb(102,255,228)]" strokeWidth={1.5} aria-hidden="true" />
                    </div>
                    <h5 className="text-2xl md:text-3xl font-bold text-white">Custom Domain Publishing</h5>
                  </div>
                  <p className="text-white/90 text-base md:text-lg mb-6 text-center max-w-2xl mx-auto">
                    Publish your documentation at your own domain or use a hosted subdomain with full SSL and CDN support
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
                    <Input
                      type="text"
                      placeholder="docs.yourcompany.com"
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      className="flex-1 h-12 bg-white/20 border-2 border-white/30 text-white placeholder:text-white/50 rounded-xl focus:border-[rgb(102,255,228)] focus:ring-2 focus:ring-[rgb(102,255,228)]/20 px-4 text-base"
                    />
                    <Button
                      size="lg"
                      className="h-12 px-8 bg-[rgb(102,255,228)] text-[rgb(14,19,23)] hover:bg-[rgb(102,255,228)]/90 font-bold rounded-xl whitespace-nowrap shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
                    >
                      Publish Now
                    </Button>
                  </div>
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
                Join&nbsp;<strong className="font-semibold">DevRel teams</strong>&nbsp;at established companies who've automated their community research. Save 20-40 hours per month and keep docs aligned with reality&nbsp;<strong className="font-semibold">automatically</strong>
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
