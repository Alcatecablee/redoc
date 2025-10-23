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
    toast({ title: "Copied", description: "Activity log copied to clipboard" });
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
          navigate('/dashboard');
        }
      }
      if (e.key === 'ArrowLeft' && e.ctrlKey) {
        e.preventDefault();
        setLeftPanelCollapsed(prev => !prev);
      }
      if (e.key === 'ArrowRight' && e.ctrlKey) {
        e.preventDefault();
        setRightPanelCollapsed(prev => !prev);
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
          addActivityLog('Documentation generation completed successfully', 'success');
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
          addActivityLog(`Reconnecting (attempt ${retryCountRef.current}/5)...`, 'info');
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
    <div className="h-screen bg-[rgb(14,19,23)] flex flex-col overflow-hidden">
      {/* Header Navigation */}
      <header className="bg-[rgb(34,38,46)] border-b border-[rgb(14,19,23)] px-4 md:px-6 py-3 md:py-4 flex items-center justify-between z-20 transition-smooth">
        <div className="flex items-center gap-3 md:gap-4">
          <Button
            onClick={handleGoBack}
            variant="ghost"
            size="sm"
            className="text-[rgb(228,232,236)] hover:text-white hover:bg-white/10 transition-smooth focus-enhanced touch-target"
            aria-label="Back to Dashboard"
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
            className="text-[rgb(228,232,236)] hover:text-white hover:bg-white/10 transition-smooth focus-enhanced touch-target hidden md:flex"
            aria-label="Go to Home"
          >
            <HomeIcon className="h-4 w-4 mr-2" />
            Home
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 transition-smooth">
            {connectionStatus.connected ? (
              <>
                <SignalIcon className="h-4 w-4 text-[rgb(102,255,228)]" aria-hidden="true" />
                <span className="text-xs text-[rgb(228,232,236)] hidden sm:inline">Connected</span>
                <span className="sr-only">Connection status: Connected</span>
              </>
            ) : connectionStatus.reconnecting ? (
              <>
                <ArrowPathIcon className="h-4 w-4 text-yellow-400 animate-spin" aria-hidden="true" />
                <span className="text-xs text-[rgb(228,232,236)] hidden sm:inline">Reconnecting...</span>
                <span className="sr-only">Connection status: Reconnecting</span>
              </>
            ) : (
              <>
                <SignalSlashIcon className="h-4 w-4 text-red-400" aria-hidden="true" />
                <span className="text-xs text-[rgb(228,232,236)] hidden sm:inline">Disconnected</span>
                <span className="sr-only">Connection status: Disconnected</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="flex-1 relative">
          <ResizablePanel 
            defaultSize={45} 
            minSize={30} 
            maxSize={70} 
            collapsible 
            onCollapse={() => setLeftPanelCollapsed(true)} 
            onExpand={() => setLeftPanelCollapsed(false)}
          >
            <div className="h-full overflow-y-auto bg-[rgb(14,19,23)]">
              <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">
                {leftPanelCollapsed && (
                  <Button
                    onClick={() => setLeftPanelCollapsed(false)}
                    size="sm"
                    variant="outline"
                    className="mb-4 border-white/20 text-white hover:bg-white/10 transition-smooth focus-enhanced"
                    aria-label="Expand left panel"
                  >
                    <ChevronRightIcon className="h-4 w-4 mr-1" />
                    Expand
                  </Button>
                )}

                {/* Status Header */}
                <div className="space-y-2">
                  <h1 className="text-2xl md:text-3xl font-bold text-white">
                    {isComplete
                      ? "Documentation Ready"
                      : hasError
                      ? "Generation Failed"
                      : "Generating Documentation"}
                  </h1>
                  <p className="text-sm md:text-base text-[rgb(228,232,236)]/70">
                    {isComplete
                      ? "Your professional documentation has been generated successfully"
                      : hasError
                      ? "Something went wrong during generation"
                      : "AI is creating your professional documentation"}
                  </p>
                </div>

                {/* Error Card */}
                {hasError && (
                  <Card className="p-4 md:p-5 glass-effect border-2 border-red-500/50 transition-smooth" role="alert" aria-live="assertive">
                    <div className="flex items-start gap-3">
                      <ExclamationCircleIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-red-400 mb-1">Error</h3>
                        <p className="text-sm text-white/80">{errorMessage || "An unexpected error occurred"}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2 flex-wrap">
                      <Button 
                        onClick={handleStartNew} 
                        size="sm" 
                        className="bg-[rgb(102,255,228)] hover:bg-white text-[rgb(14,19,23)] transition-smooth focus-enhanced font-semibold"
                      >
                        Try Again
                      </Button>
                      <Button 
                        onClick={handleGoBack} 
                        size="sm" 
                        variant="outline" 
                        className="border-white/20 text-white hover:bg-white/10 transition-smooth focus-enhanced"
                      >
                        Back to Dashboard
                      </Button>
                    </div>
                  </Card>
                )}

                {/* Success Card */}
                {isComplete && !hasError && (
                  <Card className="p-4 md:p-5 glass-effect border-2 border-[rgb(102,255,228)]/50 transition-smooth" role="status" aria-live="polite">
                    <div className="flex items-start gap-3">
                      <CheckCircleIcon className="h-5 w-5 text-[rgb(102,255,228)] flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-[rgb(102,255,228)] mb-1">Success</h3>
                        <p className="text-sm text-white/80">Your documentation is ready to view and download</p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2 flex-wrap">
                      <Button 
                        onClick={handleViewDocumentation} 
                        size="sm" 
                        className="bg-[rgb(102,255,228)] hover:bg-white text-[rgb(14,19,23)] transition-smooth focus-enhanced font-semibold"
                      >
                        View Documentation
                        <ArrowRightIcon className="ml-2 h-3 w-3" />
                      </Button>
                      <Button 
                        onClick={handleStartNew} 
                        size="sm" 
                        variant="outline" 
                        className="border-white/20 text-white hover:bg-white/10 transition-smooth focus-enhanced"
                      >
                        Generate Another
                      </Button>
                    </div>
                  </Card>
                )}

                {/* Progress Card */}
                {!isComplete && !hasError && (
                  <Card className="p-4 md:p-5 glass-effect transition-smooth hover:border-[rgb(102,255,228)]/30" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-white/90">Overall Progress</span>
                        <span className="text-sm font-bold text-[rgb(102,255,228)]">{progress}%</span>
                      </div>
                      <div className="relative">
                        <Progress value={progress} className="h-2 bg-white/10" />
                        <div 
                          className="absolute top-0 left-0 h-2 bg-gradient-to-r from-[rgb(102,255,228)] to-[rgb(80,200,180)] rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <ArrowPathIcon className="h-4 w-4 animate-spin text-[rgb(102,255,228)]" aria-hidden="true" />
                        <span>{stageName || "Initializing..."}</span>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Pipeline Stages */}
                <div className="space-y-3">
                  <h2 className="text-sm md:text-base font-semibold text-white/90">Pipeline Stages</h2>
                  {stages.map((stage) => {
                    const isActive = currentStage === stage.id;
                    const isCompleted = currentStage > stage.id;
                    const Icon = stage.icon;

                    return (
                      <Card
                        key={stage.id}
                        className={`p-3 md:p-4 transition-all duration-500 ${
                          isActive
                            ? "glass-effect border-2 border-[rgb(102,255,228)]/50 scale-[1.02]"
                            : isCompleted
                            ? "glass-effect"
                            : "bg-white/5 border border-white/10 opacity-60"
                        }`}
                        role="status"
                        aria-label={`Stage ${stage.id}: ${stage.name} - ${isActive ? 'In Progress' : isCompleted ? 'Completed' : 'Pending'}`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex-shrink-0 w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center transition-all duration-500 ${
                              isCompleted
                                ? "bg-[rgb(102,255,228)]"
                                : isActive
                                ? "bg-[rgb(102,255,228)]/20 border-2 border-[rgb(102,255,228)]"
                                : "bg-white/10 border-2 border-white/20"
                            }`}
                            aria-hidden="true"
                          >
                            {isCompleted ? (
                              <CheckIcon className="h-4 w-4 md:h-5 md:w-5 text-[rgb(14,19,23)]" />
                            ) : (
                              <Icon
                                className={`h-4 w-4 md:h-5 md:w-5 ${
                                  isActive ? "text-[rgb(102,255,228)]" : "text-white/40"
                                }`}
                              />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3
                                className={`text-sm md:text-base font-semibold ${
                                  isActive ? "text-[rgb(102,255,228)]" : isCompleted ? "text-white" : "text-white/50"
                                }`}
                              >
                                {stage.name}
                              </h3>
                              {isActive && (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-[rgb(102,255,228)]/20 border border-[rgb(102,255,228)]/50 text-[rgb(102,255,228)]">
                                  In Progress
                                </span>
                              )}
                            </div>
                            <p
                              className={`text-xs md:text-sm ${
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
                            aria-hidden="true"
                          >
                            {stage.id}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {/* Activity Log */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm md:text-base font-semibold text-white/90">Activity Log</h2>
                    <div className="flex gap-1">
                      <Button
                        onClick={copyActivityLog}
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10 transition-smooth focus-enhanced"
                        aria-label="Copy activity log to clipboard"
                      >
                        <DocumentDuplicateIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={downloadActivityLog}
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10 transition-smooth focus-enhanced"
                        aria-label="Download activity log"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Card className="p-3 md:p-4 glass-effect max-h-64 overflow-y-auto" role="log" aria-label="Activity log">
                    <div className="space-y-2">
                      {activityLogs.length === 0 ? (
                        <p className="text-xs md:text-sm text-white/40 italic">Waiting for activity...</p>
                      ) : (
                        activityLogs.map((log) => (
                          <div key={log.id} className="flex items-start gap-2 text-xs md:text-sm">
                            <span className="text-white/40 font-mono flex-shrink-0 text-[10px] md:text-xs">
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

                {/* Info Card */}
                <Card className="p-3 md:p-4 glass-effect">
                  <h3 className="text-xs md:text-sm font-semibold text-white/90 mb-2">Did you know?</h3>
                  <ul className="space-y-2 text-xs md:text-sm text-white/60">
                    <li className="flex items-start gap-2">
                      <span className="text-[rgb(102,255,228)] mt-0.5" aria-hidden="true">•</span>
                      <span>We analyze 10+ high-quality sources for comprehensive coverage</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[rgb(102,255,228)] mt-0.5" aria-hidden="true">•</span>
                      <span>Documentation automatically matches your brand colors</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[rgb(102,255,228)] mt-0.5" aria-hidden="true">•</span>
                      <span>SEO optimization and accessibility features included</span>
                    </li>
                  </ul>
                </Card>

                <div className="text-xs text-white/40 text-center" aria-label="Keyboard shortcuts">
                  Press <kbd className="px-2 py-1 rounded bg-white/10 font-mono">Ctrl+←</kbd> to toggle this panel
                </div>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-white/10 hover:bg-[rgb(102,255,228)]/30 transition-smooth w-1" />

          <ResizablePanel 
            defaultSize={55} 
            minSize={30} 
            collapsible 
            onCollapse={() => setRightPanelCollapsed(true)} 
            onExpand={() => setRightPanelCollapsed(false)}
          >
            <div className="h-full bg-[rgb(20,25,30)] flex flex-col">
              <div className="px-4 py-3 border-b border-white/10 bg-[rgb(34,38,46)]">
                <div className="flex items-center gap-2">
                  <GlobeAltIcon className="h-4 w-4 text-white/60" aria-hidden="true" />
                  <span className="text-xs md:text-sm text-white/60 font-mono truncate flex-1">{targetUrl}</span>
                  {rightPanelCollapsed && (
                    <Button
                      onClick={() => setRightPanelCollapsed(false)}
                      size="sm"
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10 transition-smooth focus-enhanced"
                      aria-label="Expand right panel"
                    >
                      <ChevronLeftIcon className="h-4 w-4 mr-1" />
                      Expand
                    </Button>
                  )}
                </div>
                <h2 className="text-sm md:text-base font-semibold text-white mt-1">
                  {previewContent ? "Documentation Preview" : "Website Preview"}
                </h2>
              </div>
              
              <div className="flex-1 relative bg-white overflow-hidden">
                {previewContent ? (
                  <div className="p-6 h-full overflow-y-auto bg-white">
                    <div className="prose prose-sm md:prose max-w-none">
                      <div className="bg-white rounded-lg p-6 border-2 border-[rgb(102,255,228)]/30">
                        <div className="mb-4 pb-4 border-b border-[rgb(102,255,228)]/20">
                          <span className="text-xs text-[rgb(102,255,228)] font-semibold uppercase tracking-wide">Live Preview</span>
                        </div>
                        <div 
                          className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap"
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
                  <div className="flex items-center justify-center h-full bg-[rgb(20,25,30)]">
                    <div className="text-center space-y-2">
                      <DocumentTextIcon className="h-12 w-12 text-white/20 mx-auto" aria-hidden="true" />
                      <p className="text-sm text-white/40">Preview will appear here</p>
                    </div>
                  </div>
                )}
                
                {!isComplete && !hasError && (
                  <div className="absolute top-4 right-4">
                    <div className="glass-effect rounded-lg px-3 py-2 flex items-center gap-2">
                      <ArrowPathIcon className="h-3 w-3 animate-spin text-[rgb(102,255,228)]" aria-hidden="true" />
                      <span className="text-xs font-semibold text-[rgb(102,255,228)]">
                        Analyzing...
                      </span>
                    </div>
                  </div>
                )}

                <div className="absolute bottom-4 right-4">
                  <div className="text-xs text-white/60 bg-black/50 backdrop-blur-sm px-2 py-1 rounded" aria-label="Keyboard shortcuts">
                    Press <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono">Ctrl+→</kbd> to toggle
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
