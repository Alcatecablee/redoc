import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Stage {
  id: number;
  name: string;
  description: string;
  icon: any;
}

interface ActivityLog {
  id: string;
  message: string;
  timestamp: Date;
  type: 'info' | 'success' | 'warning';
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
  const [targetUrl, setTargetUrl] = useState<string>("");
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  
  const runFinishedRef = useRef<boolean>(false);
  const activityEndRef = useRef<HTMLDivElement>(null);

  const addActivityLog = (message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setActivityLogs(prev => [...prev, {
      id: Date.now().toString(),
      message,
      timestamp: new Date(),
      type
    }]);
  };

  useEffect(() => {
    activityEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activityLogs]);

  useEffect(() => {
    if (!sessionId) {
      navigate("/");
      return;
    }

    let url: string | undefined;
    let subdomain: string | undefined;

    const navState = (location.state as any) || {};
    url = navState.url;
    subdomain = navState.subdomain;

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

    if (!url) {
      toast({
        title: "Missing URL",
        description: "No URL provided for generation",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    setTargetUrl(url);
    addActivityLog(`Starting documentation generation for ${url}`, 'info');

    const eventSource = new EventSource(`/api/progress/${sessionId}`);

    eventSource.onmessage = (event) => {
      try {
        const progressData = JSON.parse(event.data);
        console.log("Progress update:", progressData);
        
        setCurrentStage(progressData.stage || 0);
        setProgress(progressData.progress || 0);
        setStageName(progressData.stageName || "");
        setStageDescription(progressData.description || "");
        
        if (progressData.description) {
          addActivityLog(progressData.description, 'info');
        }
        
        if (progressData.complete) {
          setIsComplete(true);
          setDocumentationId(progressData.documentationId || "");
          runFinishedRef.current = true;
          localStorage.removeItem(`generation_${sessionId}`);
          eventSource.close();
          addActivityLog('Documentation generation completed successfully!', 'success');
        }
        
        if (progressData.error) {
          setHasError(true);
          setErrorMessage(progressData.error);
          runFinishedRef.current = true;
          localStorage.removeItem(`generation_${sessionId}`);
          eventSource.close();
          addActivityLog(`Error: ${progressData.error}`, 'warning');
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
      addActivityLog("Connection lost. Please try again.", 'warning');
    };

    const startGeneration = async () => {
      try {
        addActivityLog("Initializing generation pipeline...", 'info');
        const result = await apiRequest("/api/generate-docs", {
          method: "POST",
          body: JSON.stringify({ url, sessionId, subdomain }),
        });
        
        console.log("Generation completed:", result);
        setDocumentationId(result.id);
        runFinishedRef.current = true;
        localStorage.removeItem(`generation_${sessionId}`);
      } catch (error: any) {
        console.error("Generation failed:", error);
        setHasError(true);
        setErrorMessage(error.message || "Failed to generate documentation");
        runFinishedRef.current = true;
        eventSource.close();
        localStorage.removeItem(`generation_${sessionId}`);
        addActivityLog(`Generation failed: ${error.message || "Unknown error"}`, 'warning');
      }
    };

    startGeneration();

    return () => {
      eventSource.close();
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
    <div className="h-screen bg-[rgb(14,19,23)] flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col">
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          <ResizablePanel defaultSize={45} minSize={30} maxSize={70}>
            <div className="h-full overflow-y-auto bg-[rgb(14,19,23)]">
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-white">
                    {isComplete
                      ? "🎉 Documentation Ready!"
                      : hasError
                      ? "⚠️ Generation Failed"
                      : "✨ Generating Documentation"}
                  </h1>
                  <p className="text-sm text-white/60">
                    {isComplete
                      ? "Your professional documentation has been generated successfully"
                      : hasError
                      ? "Something went wrong during generation"
                      : "AI is creating your Apple-quality documentation"}
                  </p>
                </div>

                {hasError && (
                  <Card className="p-4 bg-red-500/10 border-red-500/50">
                    <div className="flex items-start gap-3">
                      <ExclamationCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-red-500 mb-1">Error</h3>
                        <p className="text-xs text-white/80">{errorMessage || "An unexpected error occurred"}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button onClick={handleStartNew} size="sm" className="bg-[rgb(102,255,228)] hover:bg-white text-[rgb(14,19,23)]">
                        Try Again
                      </Button>
                    </div>
                  </Card>
                )}

                {isComplete && !hasError && (
                  <Card className="p-4 bg-[rgb(102,255,228)]/10 border-[rgb(102,255,228)]/50">
                    <div className="flex items-start gap-3">
                      <CheckCircleIcon className="h-5 w-5 text-[rgb(102,255,228)] flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-[rgb(102,255,228)] mb-1">Success!</h3>
                        <p className="text-xs text-white/80">Your documentation is ready to view and download</p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button onClick={handleViewDocumentation} size="sm" className="bg-[rgb(102,255,228)] hover:bg-white text-[rgb(14,19,23)]">
                        View Documentation
                        <ArrowRightIcon className="ml-2 h-3 w-3" />
                      </Button>
                      <Button onClick={handleStartNew} size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10">
                        Generate Another
                      </Button>
                    </div>
                  </Card>
                )}

                {!isComplete && !hasError && (
                  <Card className="p-4 bg-white/5 border-white/20">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white/90">Overall Progress</span>
                        <span className="text-xs font-bold text-[rgb(102,255,228)]">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2 bg-white/10" />
                      <div className="flex items-center gap-2 text-xs text-white/60">
                        <ArrowPathIcon className="h-3 w-3 animate-spin" />
                        <span>
                          {stageName || "Initializing..."}
                        </span>
                      </div>
                    </div>
                  </Card>
                )}

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-white/90">Pipeline Stages</h3>
                  {stages.map((stage) => {
                    const isActive = currentStage === stage.id;
                    const isCompleted = currentStage > stage.id;
                    const Icon = stage.icon;

                    return (
                      <Card
                        key={stage.id}
                        className={`p-3 transition-all duration-300 ${
                          isActive
                            ? "bg-[rgb(102,255,228)]/10 border-[rgb(102,255,228)]/50"
                            : isCompleted
                            ? "bg-white/5 border-white/10"
                            : "bg-white/5 border-white/10 opacity-50"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                              isCompleted
                                ? "bg-[rgb(102,255,228)]"
                                : isActive
                                ? "bg-[rgb(102,255,228)]/20 border-2 border-[rgb(102,255,228)]"
                                : "bg-white/10 border-2 border-white/20"
                            }`}
                          >
                            {isCompleted ? (
                              <CheckIcon className="h-4 w-4 text-[rgb(14,19,23)]" />
                            ) : (
                              <Icon
                                className={`h-4 w-4 ${
                                  isActive ? "text-[rgb(102,255,228)]" : "text-white/40"
                                }`}
                              />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4
                                className={`text-sm font-semibold ${
                                  isActive ? "text-[rgb(102,255,228)]" : isCompleted ? "text-white" : "text-white/50"
                                }`}
                              >
                                {stage.name}
                              </h4>
                              {isActive && (
                                <span className="px-2 py-0.5 text-[10px] rounded-full bg-[rgb(102,255,228)]/20 border border-[rgb(102,255,228)]/50 text-[rgb(102,255,228)]">
                                  In Progress
                                </span>
                              )}
                            </div>
                            <p
                              className={`text-xs ${
                                isActive ? "text-white/70" : isCompleted ? "text-white/50" : "text-white/40"
                              }`}
                            >
                              {stage.description}
                            </p>
                          </div>

                          <div
                            className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              isCompleted || isActive
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

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-white/90">Activity Log</h3>
                  <Card className="p-3 bg-white/5 border-white/10 max-h-64 overflow-y-auto">
                    <div className="space-y-2">
                      {activityLogs.length === 0 ? (
                        <p className="text-xs text-white/40 italic">Waiting for activity...</p>
                      ) : (
                        activityLogs.map((log) => (
                          <div key={log.id} className="flex items-start gap-2 text-xs">
                            <span className="text-white/40 font-mono flex-shrink-0">
                              {log.timestamp.toLocaleTimeString()}
                            </span>
                            <span className={`${
                              log.type === 'success' ? 'text-[rgb(102,255,228)]' :
                              log.type === 'warning' ? 'text-yellow-400' :
                              'text-white/70'
                            }`}>
                              {log.message}
                            </span>
                          </div>
                        ))
                      )}
                      <div ref={activityEndRef} />
                    </div>
                  </Card>
                </div>

                <Card className="p-3 bg-white/5 border-white/10">
                  <h4 className="text-xs font-semibold text-white/90 mb-2">💡 Did you know?</h4>
                  <ul className="space-y-1.5 text-xs text-white/60">
                    <li className="flex items-start gap-2">
                      <span className="text-[rgb(102,255,228)] mt-0.5">•</span>
                      <span>We analyze 10+ high-quality sources for comprehensive coverage</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[rgb(102,255,228)] mt-0.5">•</span>
                      <span>Documentation automatically matches your brand colors</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[rgb(102,255,228)] mt-0.5">•</span>
                      <span>SEO optimization and accessibility features included</span>
                    </li>
                  </ul>
                </Card>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-white/10" />

          <ResizablePanel defaultSize={55} minSize={30}>
            <div className="h-full bg-[rgb(20,25,30)] flex flex-col">
              <div className="px-4 py-3 border-b border-white/10 bg-[rgb(14,19,23)]">
                <div className="flex items-center gap-2">
                  <GlobeAltIcon className="h-4 w-4 text-white/60" />
                  <span className="text-xs text-white/60 font-mono truncate">{targetUrl}</span>
                </div>
                <h3 className="text-sm font-semibold text-white mt-1">Website Preview</h3>
              </div>
              
              <div className="flex-1 relative bg-white">
                {targetUrl ? (
                  <iframe
                    src={targetUrl}
                    className="w-full h-full border-0"
                    title="Website Preview"
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-[rgb(20,25,30)]">
                    <div className="text-center space-y-2">
                      <GlobeAltIcon className="h-12 w-12 text-white/20 mx-auto" />
                      <p className="text-sm text-white/40">Preview will appear here</p>
                    </div>
                  </div>
                )}
                
                {!isComplete && !hasError && (
                  <div className="absolute top-4 right-4">
                    <div className="bg-[rgb(14,19,23)]/90 backdrop-blur-sm border border-[rgb(102,255,228)]/50 rounded-lg px-3 py-2 flex items-center gap-2">
                      <ArrowPathIcon className="h-3 w-3 animate-spin text-[rgb(102,255,228)]" />
                      <span className="text-xs font-semibold text-[rgb(102,255,228)]">
                        Analyzing...
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
