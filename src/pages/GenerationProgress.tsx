import { useEffect, useState, useRef, useCallback } from "react";
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
  ChevronLeftIcon,
  ChevronRightIcon,
  SignalIcon,
  SignalSlashIcon,
  DocumentDuplicateIcon,
  ArrowDownTrayIcon,
  HomeIcon,
  ArrowLeftIcon,
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
  type: 'info' | 'success' | 'warning' | 'error';
  data?: {
    urlsDiscovered?: number;
    pagesProcessed?: number;
    sourcesFound?: number;
    sectionsGenerated?: number;
  };
}

interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  retryCount: number;
  lastHeartbeat?: Date;
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
  const [previewContent, setPreviewContent] = useState<string>("");
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    reconnecting: false,
    retryCount: 0,
  });
  
  const runFinishedRef = useRef<boolean>(false);
  const activityEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);
  const generationStartedRef = useRef<boolean>(false);

  const addActivityLog = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', data?: ActivityLog['data']) => {
    setActivityLogs(prev => [...prev, {
      id: `${Date.now()}-${Math.random()}`,
      message,
      timestamp: new Date(),
      type,
      data,
    }]);
  }, []);

  const copyActivityLog = useCallback(() => {
    const logText = activityLogs.map(log => 
      `[${log.timestamp.toLocaleTimeString()}] ${log.type.toUpperCase()}: ${log.message}`
    ).join('\n');
    navigator.clipboard.writeText(logText);
    toast({ title: "Copied!", description: "Activity log copied to clipboard" });
  }, [activityLogs, toast]);

  const downloadActivityLog = useCallback(() => {
    const logText = activityLogs.map(log => 
      `[${log.timestamp.toLocaleString()}] ${log.type.toUpperCase()}: ${log.message}`
    ).join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `generation-log-${sessionId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activityLogs, sessionId]);

  useEffect(() => {
    activityEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activityLogs]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isComplete || hasError) {
          navigate('/');
        }
      }
      if (e.key === 'ArrowLeft' && e.ctrlKey) {
        setLeftPanelCollapsed(prev => !prev);
      }
      if (e.key === 'ArrowRight' && e.ctrlKey) {
        setRightPanelCollapsed(prev => !prev);
      }
      if (e.key === 'r' && e.ctrlKey && hasError) {
        e.preventDefault();
        navigate('/');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isComplete, hasError, navigate]);

  const connectToSSE = useCallback((url: string, subdomain?: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    addActivityLog(`Starting documentation generation for ${url}`, 'info');
    const eventSource = new EventSource(`/api/progress/${sessionId}`);
    eventSourceRef.current = eventSource;

    setConnectionStatus({
      connected: true,
      reconnecting: false,
      retryCount: retryCountRef.current,
      lastHeartbeat: new Date(),
    });

    const updateHeartbeat = () => {
      setConnectionStatus(prev => ({ ...prev, lastHeartbeat: new Date() }));
    };

    heartbeatIntervalRef.current = setInterval(updateHeartbeat, 5000);

    eventSource.onmessage = (event) => {
      try {
        const progressData = JSON.parse(event.data);
        console.log("Progress update:", progressData);
        updateHeartbeat();
        
        setCurrentStage(progressData.stage || 0);
        setProgress(progressData.progress || 0);
        setStageName(progressData.stageName || "");
        setStageDescription(progressData.description || "");
        
        if (progressData.activity) {
          addActivityLog(
            progressData.activity.message,
            progressData.activity.type || 'info',
            progressData.activity.data
          );
        } else if (progressData.description) {
          addActivityLog(progressData.description, 'info');
        }

        if (progressData.previewContent) {
          setPreviewContent(progressData.previewContent);
        }

        if (progressData.metrics) {
          if (progressData.metrics.sources) {
            addActivityLog(
              `Found ${progressData.metrics.sources.length} external sources`,
              'success',
              { sourcesFound: progressData.metrics.sources.length }
            );
          }
          if (progressData.metrics.warnings && progressData.metrics.warnings.length > 0) {
            progressData.metrics.warnings.forEach((warning: string) => {
              addActivityLog(warning, 'warning');
            });
          }
        }
        
        if (progressData.complete || progressData.status === 'complete') {
          setIsComplete(true);
          setDocumentationId(progressData.documentationId || "");
          runFinishedRef.current = true;
          retryCountRef.current = 0;
          localStorage.removeItem(`generation_${sessionId}`);
          eventSource.close();
          if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
          }
          addActivityLog('Documentation generation completed successfully!', 'success');
          setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.innerHTML = '🎉';
            confetti.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl animate-bounce';
            document.body.appendChild(confetti);
            setTimeout(() => confetti.remove(), 2000);
          }, 100);
        }
        
        if (progressData.error || progressData.status === 'error') {
          setHasError(true);
          setErrorMessage(progressData.error || 'An error occurred');
          runFinishedRef.current = true;
          localStorage.removeItem(`generation_${sessionId}`);
          eventSource.close();
          if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
          }
          addActivityLog(`Error: ${progressData.error || 'An error occurred'}`, 'error');
        }
      } catch (e) {
        console.error("Failed to parse progress event:", e);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE error:", error);
      retryCountRef.current += 1;
      
      setConnectionStatus(prev => ({
        ...prev,
        connected: false,
        reconnecting: true,
        retryCount: retryCountRef.current,
      }));
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }

      if (!runFinishedRef.current && retryCountRef.current <= 5) {
        const backoffDelay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 30000);
        addActivityLog(`Connection lost (attempt ${retryCountRef.current}/5). Reconnecting in ${backoffDelay/1000}s...`, 'warning');
        
        reconnectTimeoutRef.current = setTimeout(() => {
          addActivityLog(`Reconnecting (attempt ${retryCountRef.current}/${5})...`, 'info');
          connectToSSE(url, subdomain);
        }, backoffDelay);
      } else if (!runFinishedRef.current) {
        setHasError(true);
        setErrorMessage("Connection lost after 5 retries. Please try again.");
        runFinishedRef.current = true;
        localStorage.removeItem(`generation_${sessionId}`);
        addActivityLog("Connection lost after 5 retries. Please try again.", 'error');
      }
      
      eventSource.close();
    };

    if (!generationStartedRef.current) {
      generationStartedRef.current = true;
      
      const startGeneration = async () => {
        try {
          addActivityLog("Initializing generation pipeline...", 'info');
          const result = await apiRequest("/api/generate-docs", {
            method: "POST",
            body: JSON.stringify({ url, sessionId, subdomain }),
          });
          
          console.log("Generation completed:", result);
          if (result.id) {
            setDocumentationId(result.id);
          }
        } catch (error: any) {
          console.error("Generation failed:", error);
          if (!runFinishedRef.current) {
            setHasError(true);
            setErrorMessage(error.message || "Failed to generate documentation");
            runFinishedRef.current = true;
            if (eventSourceRef.current) {
              eventSourceRef.current.close();
            }
            if (heartbeatIntervalRef.current) {
              clearInterval(heartbeatIntervalRef.current);
            }
            localStorage.removeItem(`generation_${sessionId}`);
            addActivityLog(`Generation failed: ${error.message || "Unknown error"}`, 'error');
          }
        }
      };

      startGeneration();
    }
  }, [sessionId, addActivityLog]);

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
    connectToSSE(url, subdomain);

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (runFinishedRef.current) {
        localStorage.removeItem(`generation_${sessionId}`);
      }
    };
  }, [sessionId, navigate, location.state, toast, connectToSSE]);

  const handleViewDocumentation = () => {
    navigate("/dashboard");
  };

  const handleStartNew = () => {
    navigate("/");
  };

  const handleGoBack = () => {
    if (isComplete || hasError) {
      navigate("/dashboard");
    } else {
      const confirmLeave = window.confirm(
        "Documentation generation is in progress. Are you sure you want to leave?"
      );
      if (confirmLeave) {
        navigate("/dashboard");
      }
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-[rgb(14,19,23)] via-[rgb(24,29,37)] to-[rgb(34,38,46)] flex flex-col overflow-hidden">
      {/* Header Navigation */}
      <div className="bg-gradient-to-r from-[rgb(14,19,23)] via-[rgb(20,25,30)] to-[rgb(24,29,35)] border-b border-white/10 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3 md:gap-4">
          <Button
            onClick={handleGoBack}
            variant="ghost"
            size="sm"
            className="text-white/70 hover:text-white hover:bg-white/10 transition-all"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <div className="h-6 w-px bg-white/20 hidden md:block" />
          <Button
            onClick={() => navigate("/")}
            variant="ghost"
            size="sm"
            className="text-white/70 hover:text-white hover:bg-white/10 transition-all hidden md:flex"
          >
            <HomeIcon className="h-4 w-4 mr-2" />
            Home
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
            {connectionStatus.connected ? (
              <>
                <SignalIcon className="h-4 w-4 text-[rgb(102,255,228)] animate-pulse" />
                <span className="text-xs text-white/70 hidden sm:inline">Connected</span>
              </>
            ) : connectionStatus.reconnecting ? (
              <>
                <ArrowPathIcon className="h-4 w-4 text-yellow-400 animate-spin" />
                <span className="text-xs text-white/70 hidden sm:inline">Reconnecting...</span>
              </>
            ) : (
              <>
                <SignalSlashIcon className="h-4 w-4 text-red-400" />
                <span className="text-xs text-white/70 hidden sm:inline">Disconnected</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02] opacity-30" />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-radial from-[rgb(102,255,228)]/10 via-transparent to-transparent blur-3xl" />
        
        <ResizablePanelGroup direction="horizontal" className="flex-1 relative z-10">
          <ResizablePanel defaultSize={45} minSize={30} maxSize={70} collapsible onCollapse={() => setLeftPanelCollapsed(true)} onExpand={() => setLeftPanelCollapsed(false)}>
            <div className="h-full overflow-y-auto bg-gradient-to-br from-[rgb(14,19,23)] via-[rgb(24,29,37)] to-[rgb(34,38,46)]">
              <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                {leftPanelCollapsed && (
                  <Button
                    onClick={() => setLeftPanelCollapsed(false)}
                    size="sm"
                    variant="outline"
                    className="mb-4 border-white/20 text-white hover:bg-white/10"
                  >
                    <ChevronRightIcon className="h-4 w-4 mr-1" />
                    Expand
                  </Button>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h1 className="text-xl md:text-2xl font-bold text-white">
                      {isComplete
                        ? "🎉 Documentation Ready!"
                        : hasError
                        ? "⚠️ Generation Failed"
                        : "✨ Generating Documentation"}
                    </h1>
                  </div>
                  <p className="text-xs md:text-sm text-white/60">
                    {isComplete
                      ? "Your professional documentation has been generated successfully"
                      : hasError
                      ? "Something went wrong during generation"
                      : "AI is creating your Apple-quality documentation"}
                  </p>
                </div>

                {hasError && (
                  <Card className="p-3 md:p-4 bg-gradient-to-br from-red-500/10 to-red-500/5 border-2 border-red-500/50 backdrop-blur-sm shadow-[0_10px_30px_rgba(239,68,68,0.1)]">
                    <div className="flex items-start gap-3">
                      <ExclamationCircleIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-red-400 mb-1">Error</h3>
                        <p className="text-xs text-white/80">{errorMessage || "An unexpected error occurred"}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button onClick={handleStartNew} size="sm" className="bg-[rgb(102,255,228)] hover:bg-white text-[rgb(14,19,23)] transition-all">
                        Try Again
                      </Button>
                      <Button onClick={handleGoBack} size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10">
                        Back to Dashboard
                      </Button>
                    </div>
                  </Card>
                )}

                {isComplete && !hasError && (
                  <Card className="p-3 md:p-4 bg-gradient-to-br from-[rgb(102,255,228)]/15 to-[rgb(102,255,228)]/5 border-2 border-[rgb(102,255,228)]/50 backdrop-blur-sm shadow-[0_20px_50px_rgba(102,255,228,0.15)]">
                    <div className="flex items-start gap-3">
                      <CheckCircleIcon className="h-5 w-5 text-[rgb(102,255,228)] flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-[rgb(102,255,228)] mb-1">Success!</h3>
                        <p className="text-xs text-white/80">Your documentation is ready to view and download</p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2 flex-wrap">
                      <Button onClick={handleViewDocumentation} size="sm" className="bg-[rgb(102,255,228)] hover:bg-white text-[rgb(14,19,23)] transition-all">
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
                  <Card className="p-3 md:p-4 bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-sm transition-all duration-300 hover:border-[rgb(102,255,228)]/50">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white/90">Overall Progress</span>
                        <span className="text-xs font-bold text-[rgb(102,255,228)]">{progress}%</span>
                      </div>
                      <div className="relative">
                        <Progress value={progress} className="h-2 bg-white/10" />
                        <div 
                          className="absolute top-0 left-0 h-2 bg-gradient-to-r from-[rgb(102,255,228)] to-[rgb(80,200,180)] rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/60">
                        <ArrowPathIcon className="h-3 w-3 animate-spin text-[rgb(102,255,228)]" />
                        <span>{stageName || "Initializing..."}</span>
                      </div>
                    </div>
                  </Card>
                )}

                <div className="space-y-2 md:space-y-3">
                  <h3 className="text-xs md:text-sm font-semibold text-white/90">Pipeline Stages</h3>
                  {stages.map((stage) => {
                    const isActive = currentStage === stage.id;
                    const isCompleted = currentStage > stage.id;
                    const Icon = stage.icon;

                    return (
                      <Card
                        key={stage.id}
                        className={`p-2 md:p-3 transition-all duration-500 ${
                          isActive
                            ? "bg-gradient-to-br from-[rgb(102,255,228)]/20 to-[rgb(102,255,228)]/5 border-2 border-[rgb(102,255,228)]/50 shadow-[0_10px_30px_rgba(102,255,228,0.15)] scale-105"
                            : isCompleted
                            ? "bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-sm"
                            : "bg-gradient-to-br from-white/5 to-white/3 border border-white/10 opacity-50"
                        }`}
                      >
                        <div className="flex items-start gap-2 md:gap-3">
                          <div
                            className={`flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-all duration-500 ${
                              isCompleted
                                ? "bg-[rgb(102,255,228)] shadow-lg shadow-[rgb(102,255,228)]/50"
                                : isActive
                                ? "bg-[rgb(102,255,228)]/20 border-2 border-[rgb(102,255,228)] animate-pulse"
                                : "bg-white/10 border-2 border-white/20"
                            }`}
                          >
                            {isCompleted ? (
                              <CheckIcon className="h-3 w-3 md:h-4 md:w-4 text-[rgb(14,19,23)]" />
                            ) : (
                              <Icon
                                className={`h-3 w-3 md:h-4 md:w-4 ${
                                  isActive ? "text-[rgb(102,255,228)]" : "text-white/40"
                                }`}
                              />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4
                                className={`text-xs md:text-sm font-semibold ${
                                  isActive ? "text-[rgb(102,255,228)]" : isCompleted ? "text-white" : "text-white/50"
                                }`}
                              >
                                {stage.name}
                              </h4>
                              {isActive && (
                                <span className="px-2 py-0.5 text-[10px] rounded-full bg-[rgb(102,255,228)]/20 border border-[rgb(102,255,228)]/50 text-[rgb(102,255,228)] animate-pulse">
                                  In Progress
                                </span>
                              )}
                            </div>
                            <p
                              className={`text-[10px] md:text-xs ${
                                isActive ? "text-white/70" : isCompleted ? "text-white/50" : "text-white/40"
                              }`}
                            >
                              {stage.description}
                            </p>
                          </div>

                          <div
                            className={`flex-shrink-0 w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold ${
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

                <div className="space-y-2 md:space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs md:text-sm font-semibold text-white/90">Activity Log</h3>
                    <div className="flex gap-1">
                      <Button
                        onClick={copyActivityLog}
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-white/60 hover:text-white hover:bg-white/10"
                        title="Copy to clipboard"
                      >
                        <DocumentDuplicateIcon className="h-3 w-3" />
                      </Button>
                      <Button
                        onClick={downloadActivityLog}
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-white/60 hover:text-white hover:bg-white/10"
                        title="Download log"
                      >
                        <ArrowDownTrayIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <Card className="p-2 md:p-3 bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-sm max-h-48 md:max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                    <div className="space-y-1.5 md:space-y-2">
                      {activityLogs.length === 0 ? (
                        <p className="text-[10px] md:text-xs text-white/40 italic">Waiting for activity...</p>
                      ) : (
                        activityLogs.map((log) => (
                          <div key={log.id} className="flex items-start gap-2 text-[10px] md:text-xs">
                            <span className="text-white/40 font-mono flex-shrink-0 text-[9px] md:text-[10px]">
                              {log.timestamp.toLocaleTimeString()}
                            </span>
                            <span className={`flex-1 ${
                              log.type === 'success' ? 'text-[rgb(102,255,228)]' :
                              log.type === 'warning' ? 'text-yellow-400' :
                              log.type === 'error' ? 'text-red-400' :
                              'text-white/70'
                            }`}>
                              {log.message}
                              {log.data && (
                                <span className="text-white/40 ml-1">
                                  {log.data.urlsDiscovered && `(${log.data.urlsDiscovered} URLs)`}
                                  {log.data.pagesProcessed && `(${log.data.pagesProcessed} pages)`}
                                  {log.data.sourcesFound && `(${log.data.sourcesFound} sources)`}
                                  {log.data.sectionsGenerated && `(${log.data.sectionsGenerated} sections)`}
                                </span>
                              )}
                            </span>
                          </div>
                        ))
                      )}
                      <div ref={activityEndRef} />
                    </div>
                  </Card>
                </div>

                <Card className="p-2 md:p-3 bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-sm">
                  <h4 className="text-[10px] md:text-xs font-semibold text-white/90 mb-2">💡 Did you know?</h4>
                  <ul className="space-y-1 md:space-y-1.5 text-[10px] md:text-xs text-white/60">
                    <li className="flex items-start gap-2">
                      <span className="text-[rgb(102,255,228)] mt-0.5 text-xs">•</span>
                      <span>We analyze 10+ high-quality sources for comprehensive coverage</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[rgb(102,255,228)] mt-0.5 text-xs">•</span>
                      <span>Documentation automatically matches your brand colors</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[rgb(102,255,228)] mt-0.5 text-xs">•</span>
                      <span>SEO optimization and accessibility features included</span>
                    </li>
                  </ul>
                </Card>

                <div className="text-[10px] text-white/40 text-center">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-white/10">Ctrl+←</kbd> to toggle this panel
                </div>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-white/10 hover:bg-[rgb(102,255,228)]/30 transition-colors w-1" />

          <ResizablePanel defaultSize={55} minSize={30} collapsible onCollapse={() => setRightPanelCollapsed(true)} onExpand={() => setRightPanelCollapsed(false)}>
            <div className="h-full bg-gradient-to-br from-[rgb(20,25,30)] via-[rgb(30,35,40)] to-[rgb(36,40,45)] flex flex-col">
              <div className="px-3 md:px-4 py-2 md:py-3 border-b border-white/10 bg-gradient-to-br from-[rgb(14,19,23)] via-[rgb(20,25,30)] to-[rgb(24,29,35)] backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <GlobeAltIcon className="h-3 w-3 md:h-4 md:w-4 text-white/60" />
                  <span className="text-[10px] md:text-xs text-white/60 font-mono truncate flex-1">{targetUrl}</span>
                  {rightPanelCollapsed && (
                    <Button
                      onClick={() => setRightPanelCollapsed(false)}
                      size="sm"
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      <ChevronLeftIcon className="h-4 w-4 mr-1" />
                      Expand
                    </Button>
                  )}
                </div>
                <h3 className="text-xs md:text-sm font-semibold text-white mt-1">
                  {previewContent ? "Documentation Preview" : "Website Preview"}
                </h3>
              </div>
              
              <div className="flex-1 relative bg-white overflow-hidden">
                {previewContent ? (
                  <div className="p-4 md:p-6 h-full overflow-y-auto bg-gradient-to-br from-white via-gray-50 to-gray-100">
                    <div className="prose prose-sm md:prose max-w-none">
                      <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 border-2 border-[rgb(102,255,228)]/30">
                        <div className="mb-4 pb-4 border-b border-[rgb(102,255,228)]/20">
                          <span className="text-[10px] md:text-xs text-[rgb(102,255,228)] font-semibold uppercase tracking-wide">Live Preview</span>
                        </div>
                        <div 
                          className="text-xs md:text-sm text-gray-800 leading-relaxed whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{ __html: previewContent }}
                        />
                      </div>
                    </div>
                  </div>
                ) : targetUrl ? (
                  <iframe
                    src={targetUrl}
                    className="w-full h-full border-0"
                    title="Website Preview"
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-gradient-to-br from-[rgb(20,25,30)] via-[rgb(30,35,40)] to-[rgb(36,40,45)]">
                    <div className="text-center space-y-2">
                      <DocumentTextIcon className="h-10 w-10 md:h-12 md:w-12 text-white/20 mx-auto" />
                      <p className="text-xs md:text-sm text-white/40">Preview will appear here</p>
                    </div>
                  </div>
                )}
                
                {!isComplete && !hasError && (
                  <div className="absolute top-3 md:top-4 right-3 md:right-4">
                    <div className="bg-[rgb(14,19,23)]/95 backdrop-blur-md border border-[rgb(102,255,228)]/50 rounded-lg px-2 md:px-3 py-1.5 md:py-2 flex items-center gap-2 shadow-[0_10px_30px_rgba(102,255,228,0.2)]">
                      <ArrowPathIcon className="h-2.5 w-2.5 md:h-3 md:w-3 animate-spin text-[rgb(102,255,228)]" />
                      <span className="text-[10px] md:text-xs font-semibold text-[rgb(102,255,228)]">
                        Analyzing...
                      </span>
                    </div>
                  </div>
                )}

                <div className="absolute bottom-3 md:bottom-4 right-3 md:right-4">
                  <div className="text-[10px] text-white/60 bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
                    Press <kbd className="px-1 py-0.5 rounded bg-white/10">Ctrl+→</kbd> to toggle
                  </div>
                </div>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
