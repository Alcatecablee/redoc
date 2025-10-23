import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  SparklesIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/24/solid";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Stage {
  id: number;
  name: string;
  description: string;
  icon: any;
}

const stages: Stage[] = [
  {
    id: 1,
    name: "Site Discovery",
    description: "Crawling your website and discovering all pages, links, and content structure",
    icon: GlobeAltIcon,
  },
  {
    id: 2,
    name: "Research & Analysis",
    description: "Gathering insights from Stack Overflow, GitHub, YouTube, Reddit, and more",
    icon: MagnifyingGlassIcon,
  },
  {
    id: 3,
    name: "Documentation Generation",
    description: "AI writing professional, Apple-quality documentation with your brand styling",
    icon: DocumentTextIcon,
  },
  {
    id: 4,
    name: "Export & Optimization",
    description: "Finalizing formats, SEO optimization, and preparing for download",
    icon: SparklesIcon,
  },
];

export default function GenerationProgress() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [currentStage, setCurrentStage] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [stageName, setStageName] = useState<string>("");
  const [stageDescription, setStageDescription] = useState<string>("");
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [documentationId, setDocumentationId] = useState<string>("");
  
  // Track completion status for cleanup without re-running effect
  const runFinishedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!sessionId) {
      navigate("/");
      return;
    }

    // Get URL from navigation state or localStorage (for refresh resilience)
    let url: string | undefined;
    let subdomain: string | undefined;

    // Try navigation state first
    const navState = (location.state as any) || {};
    url = navState.url;
    subdomain = navState.subdomain;

    // Fallback to localStorage if state is missing (e.g., after refresh)
    if (!url) {
      const storedData = localStorage.getItem(`generation_${sessionId}`);
      if (storedData) {
        try {
          const parsed = JSON.parse(storedData);
          url = parsed.url;
          subdomain = parsed.subdomain;
        } catch (e) {
          console.error("Failed to parse stored generation data:", e);
        }
      }
    }

    // If still no URL, redirect to home
    if (!url) {
      toast({
        title: "Missing URL",
        description: "No URL provided for generation",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    // Connect to SSE endpoint for real-time progress
    const eventSource = new EventSource(`/api/progress/${sessionId}`);

    eventSource.onmessage = (event) => {
      try {
        const progressData = JSON.parse(event.data);
        console.log("Progress update:", progressData);
        
        setCurrentStage(progressData.stage || 0);
        setProgress(progressData.progress || 0);
        setStageName(progressData.stageName || "");
        setStageDescription(progressData.description || "");
        
        // Check if complete
        if (progressData.complete) {
          setIsComplete(true);
          setDocumentationId(progressData.documentationId || "");
          runFinishedRef.current = true;
          localStorage.removeItem(`generation_${sessionId}`);
          eventSource.close();
        }
        
        // Check for errors
        if (progressData.error) {
          setHasError(true);
          setErrorMessage(progressData.error);
          runFinishedRef.current = true;
          localStorage.removeItem(`generation_${sessionId}`);
          eventSource.close();
        }
      } catch (e) {
        console.error("Failed to parse progress event:", e);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE error:", error);
      setHasError(true);
      setErrorMessage("Connection lost. Please try again.");
      runFinishedRef.current = true;
      localStorage.removeItem(`generation_${sessionId}`);
      eventSource.close();
    };

    // Start the generation process
    const startGeneration = async () => {
      try {
        const result = await apiRequest("/api/generate-docs", {
          method: "POST",
          body: JSON.stringify({ url, sessionId, subdomain }),
        });
        
        console.log("Generation completed:", result);
        setDocumentationId(result.id);
        runFinishedRef.current = true;
        
        // Clean up localStorage on successful completion
        localStorage.removeItem(`generation_${sessionId}`);
      } catch (error: any) {
        console.error("Generation failed:", error);
        setHasError(true);
        setErrorMessage(error.message || "Failed to generate documentation");
        runFinishedRef.current = true;
        eventSource.close();
        
        // Clean up localStorage on error
        localStorage.removeItem(`generation_${sessionId}`);
      }
    };

    startGeneration();

    return () => {
      eventSource.close();
      
      // Clean up localStorage on unmount if generation has finished
      // (This handles cases where user navigates away after completion/error)
      if (runFinishedRef.current) {
        localStorage.removeItem(`generation_${sessionId}`);
      }
    };
  }, [sessionId, navigate, location.state, toast]);

  const handleViewDocumentation = () => {
    navigate("/dashboard");
  };

  const handleStartNew = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[rgb(14,19,23)] flex flex-col">
      <Header />
      
      <main className="flex-1 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-grid-white/[0.02] opacity-30" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-radial from-[rgb(102,255,228)]/10 via-transparent to-transparent blur-3xl" />

        <div className="relative container mx-auto px-6 py-16 max-w-5xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {isComplete
                ? "🎉 Documentation Ready!"
                : hasError
                ? "⚠️ Generation Failed"
                : "✨ Generating Your Documentation"}
            </h1>
            <p className="text-lg text-white/70">
              {isComplete
                ? "Your professional documentation has been generated successfully"
                : hasError
                ? "Something went wrong during generation"
                : "Sit back and relax while we create your Apple-quality docs"}
            </p>
          </div>

          {/* Error State */}
          {hasError && (
            <Card className="mb-8 p-6 bg-red-500/10 border-red-500/50">
              <div className="flex items-start gap-4">
                <ExclamationCircleIcon className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-500 mb-2">Error</h3>
                  <p className="text-white/80">{errorMessage || "An unexpected error occurred"}</p>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <Button onClick={handleStartNew} className="bg-[rgb(102,255,228)] hover:bg-white text-[rgb(14,19,23)]">
                  Try Again
                </Button>
              </div>
            </Card>
          )}

          {/* Success State */}
          {isComplete && !hasError && (
            <Card className="mb-8 p-6 bg-[rgb(102,255,228)]/10 border-[rgb(102,255,228)]/50">
              <div className="flex items-start gap-4">
                <CheckCircleIcon className="h-6 w-6 text-[rgb(102,255,228)] flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-[rgb(102,255,228)] mb-2">Success!</h3>
                  <p className="text-white/80">Your documentation is ready to view and download in multiple formats</p>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <Button onClick={handleViewDocumentation} className="bg-[rgb(102,255,228)] hover:bg-white text-[rgb(14,19,23)]">
                  View Documentation
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Button>
                <Button onClick={handleStartNew} variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  Generate Another
                </Button>
              </div>
            </Card>
          )}

          {/* Overall Progress */}
          {!isComplete && !hasError && (
            <Card className="mb-8 p-8 bg-gradient-to-br from-white/10 via-white/5 to-white/10 border-white/20 backdrop-blur-xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white/90">Overall Progress</span>
                  <span className="text-sm font-bold text-[rgb(102,255,228)]">{progress}%</span>
                </div>
                <Progress value={progress} className="h-3 bg-white/10" />
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  <span>
                    {stageName || "Initializing..."} - {stageDescription || "Starting generation process"}
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* Stages */}
          <div className="space-y-4">
            {stages.map((stage, index) => {
              const isActive = currentStage === stage.id;
              const isCompleted = currentStage > stage.id;
              const isPending = currentStage < stage.id;
              const Icon = stage.icon;

              return (
                <Card
                  key={stage.id}
                  className={`p-6 transition-all duration-500 ${
                    isActive
                      ? "bg-gradient-to-br from-[rgb(102,255,228)]/20 via-[rgb(102,255,228)]/10 to-transparent border-[rgb(102,255,228)]/50 shadow-lg shadow-[rgb(102,255,228)]/20"
                      : isCompleted
                      ? "bg-white/5 border-white/10"
                      : "bg-white/5 border-white/10 opacity-50"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${
                        isCompleted
                          ? "bg-[rgb(102,255,228)] shadow-lg shadow-[rgb(102,255,228)]/50"
                          : isActive
                          ? "bg-[rgb(102,255,228)]/20 border-2 border-[rgb(102,255,228)] animate-pulse"
                          : "bg-white/10 border-2 border-white/20"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckIcon className="h-6 w-6 text-[rgb(14,19,23)]" />
                      ) : (
                        <Icon
                          className={`h-6 w-6 ${
                            isActive ? "text-[rgb(102,255,228)]" : "text-white/40"
                          }`}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3
                          className={`text-lg font-semibold ${
                            isActive ? "text-[rgb(102,255,228)]" : isCompleted ? "text-white" : "text-white/50"
                          }`}
                        >
                          {stage.name}
                        </h3>
                        {isActive && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgb(102,255,228)]/20 border border-[rgb(102,255,228)]/50">
                            <ArrowPathIcon className="h-3 w-3 animate-spin text-[rgb(102,255,228)]" />
                            <span className="text-xs font-semibold text-[rgb(102,255,228)]">In Progress</span>
                          </span>
                        )}
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgb(102,255,228)]/20 border border-[rgb(102,255,228)]/50">
                            <CheckIcon className="h-3 w-3 text-[rgb(102,255,228)]" />
                            <span className="text-xs font-semibold text-[rgb(102,255,228)]">Complete</span>
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-sm ${
                          isActive ? "text-white/80" : isCompleted ? "text-white/60" : "text-white/40"
                        }`}
                      >
                        {stage.description}
                      </p>
                    </div>

                    {/* Stage Number */}
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        isCompleted
                          ? "bg-[rgb(102,255,228)]/20 text-[rgb(102,255,228)]"
                          : isActive
                          ? "bg-[rgb(102,255,228)]/20 text-[rgb(102,255,228)]"
                          : "bg-white/10 text-white/40"
                      }`}
                    >
                      {stage.id}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Tips */}
          {!isComplete && !hasError && (
            <Card className="mt-8 p-6 bg-white/5 border-white/10">
              <h4 className="text-sm font-semibold text-white/90 mb-3">💡 Did you know?</h4>
              <ul className="space-y-2 text-sm text-white/70">
                <li className="flex items-start gap-2">
                  <span className="text-[rgb(102,255,228)] mt-1">•</span>
                  <span>We analyze over 10 high-quality sources to ensure comprehensive coverage</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[rgb(102,255,228)] mt-1">•</span>
                  <span>Your documentation will automatically match your brand colors and styling</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[rgb(102,255,228)] mt-1">•</span>
                  <span>Generated docs include SEO optimization and accessibility features out of the box</span>
                </li>
              </ul>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
