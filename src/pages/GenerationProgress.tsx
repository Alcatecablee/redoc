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
  ClockIcon,
  CpuChipIcon,
  ChartBarIcon,
  BeakerIcon,
} from "@heroicons/react/24/outline";
import { CheckIcon, FireIcon } from "@heroicons/react/24/solid";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Stage {
  id: number;
  name: string;
  description: string;
  icon: any;
  substages?: string[];
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

interface Metrics {
  sourcesAnalyzed: number;
  pagesProcessed: number;
  sectionsGenerated: number;
  tokensProcessed: number;
  stackOverflow: number;
  github: number;
  reddit: number;
  youtube: number;
}

const stages: Stage[] = [
  {
    id: 1,
    name: "Site Discovery",
    description: "Crawling your website and discovering all pages, links, and content structure",
    icon: GlobeAltIcon,
    substages: ["Analyzing sitemap", "Discovering pages", "Mapping structure"],
  },
  {
    id: 2,
    name: "Research & Analysis",
    description: "Gathering insights from Stack Overflow, GitHub, YouTube, Reddit, and more",
    icon: MagnifyingGlassIcon,
    substages: ["Mining Stack Overflow", "Scanning GitHub repos", "Analyzing community discussions"],
  },
  {
    id: 3,
    name: "Documentation Generation",
    description: "AI writing professional, Apple-quality documentation with your brand styling",
    icon: DocumentTextIcon,
    substages: ["Extracting brand identity", "Generating content", "Optimizing structure"],
  },
  {
    id: 4,
    name: "Export & Optimization",
    description: "Finalizing formats, SEO optimization, and preparing for download",
    icon: SparklesIcon,
    substages: ["SEO optimization", "Format finalization", "Quality assurance"],
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
  const [metrics, setMetrics] = useState<Metrics>({
    sourcesAnalyzed: 0,
    pagesProcessed: 0,
    sectionsGenerated: 0,
    tokensProcessed: 0,
    stackOverflow: 0,
    github: 0,
    reddit: 0,
    youtube: 0,
  });
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>("00:00");
  const [showConfetti, setShowConfetti] = useState(false);
  
  const runFinishedRef = useRef<boolean>(false);
  const activityEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);
  const generationStartedRef = useRef<boolean>(false);
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);

  const addActivityLog = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', data?: ActivityLog['data']) => {
    setActivityLogs(prev => [...prev, {
      id: `${Date.now()}-${Math.random()}`,
      message,
      timestamp: new Date(),
      type,
      data,
    }]);
    
    if (data) {
      setMetrics(prev => ({
        ...prev,
        sourcesAnalyzed: data.sourcesFound || prev.sourcesAnalyzed,
        pagesProcessed: data.pagesProcessed || prev.pagesProcessed,
        sectionsGenerated: data.sectionsGenerated || prev.sectionsGenerated,
      }));
    }
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
    if (startTime && !isComplete && !hasError) {
      elapsedTimerRef.current = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        const minutes = Math.floor(diff / 60);
        const seconds = diff % 60;
        setElapsedTime(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
      }, 1000);
    }
    
    return () => {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
      }
    };
  }, [startTime, isComplete, hasError]);

  useEffect(() => {
    if (progress > 0 && progress < 100 && startTime) {
      const elapsed = (new Date().getTime() - startTime.getTime()) / 1000;
      const estimatedTotal = (elapsed / progress) * 100;
      const remaining = Math.max(0, estimatedTotal - elapsed);
      setEstimatedTimeRemaining(Math.round(remaining));
    }
  }, [progress, startTime]);

  useEffect(() => {
    activityEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activityLogs]);

  useEffect(() => {
    if (isComplete) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  }, [isComplete]);

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

    if (!startTime) {
      setStartTime(new Date());
    }

    addActivityLog(`🚀 Initiating AI-powered documentation generation for ${url}`, 'info');
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
              `✅ Discovered ${progressData.metrics.sources.length} high-quality external sources`,
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
          addActivityLog('🎉 Documentation generation completed successfully! Your professional docs are ready.', 'success');
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
          addActivityLog(`❌ Error: ${progressData.error || 'An error occurred'}`, 'error');
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
        addActivityLog(`⚠️ Connection lost (attempt ${retryCountRef.current}/5). Reconnecting in ${backoffDelay/1000}s...`, 'warning');
        
        reconnectTimeoutRef.current = setTimeout(() => {
          addActivityLog(`🔄 Reconnecting (attempt ${retryCountRef.current}/5)...`, 'info');
          connectToSSE(url, subdomain);
        }, backoffDelay);
      } else if (!runFinishedRef.current) {
        setHasError(true);
        setErrorMessage("Connection lost after 5 retries. Please try again.");
        runFinishedRef.current = true;
        localStorage.removeItem(`generation_${sessionId}`);
        addActivityLog("❌ Connection lost after 5 retries. Please try again.", 'error');
      }
      
      eventSource.close();
    };

    if (!generationStartedRef.current) {
      generationStartedRef.current = true;
      
      const startGeneration = async () => {
        try {
          addActivityLog("⚙️ Initializing AI generation pipeline...", 'info');
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
            addActivityLog(`❌ Generation failed: ${error.message || "Unknown error"}`, 'error');
          }
        }
      };

      startGeneration();
    }
  }, [sessionId, addActivityLog, startTime]);

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
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
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

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="h-screen bg-gradient-to-br from-[#0A0E12] via-[#0E1317] to-[#12171D] flex flex-col overflow-hidden relative">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[rgb(102,255,228)] rounded-full filter blur-[128px] animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full filter blur-[128px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Confetti Effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-[rgb(102,255,228)] rounded-full animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Header - Mission Control */}
      <header className="relative bg-gradient-to-r from-[#1A1F26]/90 to-[#22262E]/90 backdrop-blur-xl border-b border-[rgb(102,255,228)]/20 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between z-20 shadow-2xl">
        <div className="flex items-center gap-3 md:gap-4">
          <Button
            onClick={handleGoBack}
            variant="ghost"
            size="sm"
            className="text-[rgb(228,232,236)] hover:text-white hover:bg-white/10 transition-all duration-300 hover:scale-105 focus-enhanced touch-target"
            aria-label="Back to Dashboard"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <div className="h-6 w-px bg-gradient-to-b from-transparent via-[rgb(102,255,228)]/50 to-transparent hidden md:block" />
          <div className="flex items-center gap-2">
            <div className="relative">
              <CpuChipIcon className="h-5 w-5 text-[rgb(102,255,228)]" />
              <div className="absolute inset-0 bg-[rgb(102,255,228)] blur-md opacity-50 animate-pulse"></div>
            </div>
            <span className="text-sm font-bold bg-gradient-to-r from-[rgb(102,255,228)] to-white bg-clip-text text-transparent hidden md:inline">
              AI Mission Control
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Elapsed Time */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm">
            <ClockIcon className="h-4 w-4 text-[rgb(102,255,228)]" />
            <span className="text-xs font-mono text-white">{elapsedTime}</span>
          </div>

          {/* Connection Status with Heartbeat */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm transition-all duration-300">
            {connectionStatus.connected ? (
              <>
                <div className="relative">
                  <SignalIcon className="h-4 w-4 text-[rgb(102,255,228)]" aria-hidden="true" />
                  <div className="absolute inset-0 bg-[rgb(102,255,228)] blur-sm opacity-50 animate-pulse"></div>
                </div>
                <span className="text-xs text-[rgb(102,255,228)] font-semibold hidden sm:inline">Live</span>
                <span className="sr-only">Connection status: Connected</span>
              </>
            ) : connectionStatus.reconnecting ? (
              <>
                <ArrowPathIcon className="h-4 w-4 text-yellow-400 animate-spin" aria-hidden="true" />
                <span className="text-xs text-yellow-400 font-semibold hidden sm:inline">Reconnecting</span>
                <span className="sr-only">Connection status: Reconnecting</span>
              </>
            ) : (
              <>
                <SignalSlashIcon className="h-4 w-4 text-red-400" aria-hidden="true" />
                <span className="text-xs text-red-400 font-semibold hidden sm:inline">Offline</span>
                <span className="sr-only">Connection status: Disconnected</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content - 3 Column Layout */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="flex-1 relative">
          
          {/* LEFT PANEL - Mission Feed & Controls */}
          <ResizablePanel 
            defaultSize={30} 
            minSize={25} 
            maxSize={40} 
            collapsible 
            onCollapse={() => setLeftPanelCollapsed(true)} 
            onExpand={() => setLeftPanelCollapsed(false)}
          >
            <div className="h-full overflow-y-auto bg-gradient-to-br from-[#0E1317]/50 to-[#12171D]/50 backdrop-blur-sm">
              <div className="p-4 md:p-6 space-y-4">
                
                {/* AI Mission Feed Header */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FireIcon className="h-5 w-5 text-[rgb(102,255,228)]" />
                    <h2 className="text-lg font-bold bg-gradient-to-r from-white to-[rgb(102,255,228)] bg-clip-text text-transparent">
                      AI Mission Feed
                    </h2>
                  </div>
                  <p className="text-xs text-white/60">Real-time AI activity stream</p>
                </div>

                {/* Activity Log - Enhanced with Narrative Style */}
                <Card className="glass-morphism border-[rgb(102,255,228)]/20 shadow-2xl" role="log" aria-label="AI Activity feed">
                  <div className="p-4 border-b border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white/90 uppercase tracking-wider">Live Activity</span>
                      <div className="flex gap-1">
                        <Button
                          onClick={copyActivityLog}
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-white/60 hover:text-white hover:bg-white/10 transition-all duration-300 hover:scale-110"
                          aria-label="Copy activity log"
                        >
                          <DocumentDuplicateIcon className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          onClick={downloadActivityLog}
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-white/60 hover:text-white hover:bg-white/10 transition-all duration-300 hover:scale-110"
                          aria-label="Download log"
                        >
                          <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                    <div className="space-y-3">
                      {activityLogs.length === 0 ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="text-center space-y-2">
                            <ArrowPathIcon className="h-8 w-8 text-white/20 mx-auto animate-spin" />
                            <p className="text-xs text-white/40 italic">Initializing AI systems...</p>
                          </div>
                        </div>
                      ) : (
                        activityLogs.map((log, index) => (
                          <div 
                            key={log.id} 
                            className={`flex items-start gap-3 p-2 rounded-lg transition-all duration-500 ${
                              index === activityLogs.length - 1 ? 'bg-white/5 scale-[1.02] border-l-2 border-[rgb(102,255,228)]' : ''
                            }`}
                            style={{
                              animation: index === activityLogs.length - 1 ? 'slideIn 0.3s ease-out' : 'none'
                            }}
                          >
                            <div className={`flex-shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 ${
                              log.type === 'success' ? 'bg-[rgb(102,255,228)] shadow-lg shadow-[rgb(102,255,228)]/50' :
                              log.type === 'warning' ? 'bg-yellow-400 shadow-lg shadow-yellow-400/50' :
                              log.type === 'error' ? 'bg-red-400 shadow-lg shadow-red-400/50' :
                              'bg-blue-400 shadow-lg shadow-blue-400/50'
                            } ${index === activityLogs.length - 1 ? 'animate-pulse' : ''}`}></div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2">
                                <span className="text-[10px] text-white/40 font-mono flex-shrink-0">
                                  {log.timestamp.toLocaleTimeString()}
                                </span>
                              </div>
                              <p className={`text-xs leading-relaxed mt-0.5 ${
                                log.type === 'success' ? 'text-[rgb(102,255,228)] font-medium' :
                                log.type === 'warning' ? 'text-yellow-400' :
                                log.type === 'error' ? 'text-red-400 font-medium' :
                                'text-white/80'
                              }`}>
                                {log.message}
                                {log.data && (
                                  <span className="text-white/50 ml-1 font-normal">
                                    {log.data.urlsDiscovered && `• ${log.data.urlsDiscovered} URLs discovered`}
                                    {log.data.pagesProcessed && `• ${log.data.pagesProcessed} pages analyzed`}
                                    {log.data.sourcesFound && `• ${log.data.sourcesFound} sources`}
                                    {log.data.sectionsGenerated && `• ${log.data.sectionsGenerated} sections`}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={activityEndRef} />
                    </div>
                  </div>
                </Card>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <Card className="glass-morphism border-[rgb(102,255,228)]/20 p-3 hover:border-[rgb(102,255,228)]/40 transition-all duration-300">
                    <div className="flex items-center gap-2">
                      <GlobeAltIcon className="h-4 w-4 text-[rgb(102,255,228)]" />
                      <div>
                        <div className="text-xs text-white/60">Pages</div>
                        <div className="text-lg font-bold text-white">{metrics.pagesProcessed}</div>
                      </div>
                    </div>
                  </Card>
                  <Card className="glass-morphism border-[rgb(102,255,228)]/20 p-3 hover:border-[rgb(102,255,228)]/40 transition-all duration-300">
                    <div className="flex items-center gap-2">
                      <DocumentTextIcon className="h-4 w-4 text-[rgb(102,255,228)]" />
                      <div>
                        <div className="text-xs text-white/60">Sections</div>
                        <div className="text-lg font-bold text-white">{metrics.sectionsGenerated}</div>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Keyboard Shortcuts */}
                <Card className="glass-morphism border-white/10 p-3">
                  <h3 className="text-xs font-semibold text-white/70 mb-2 uppercase tracking-wider">Shortcuts</h3>
                  <div className="space-y-1.5 text-xs text-white/60">
                    <div className="flex justify-between items-center">
                      <span>Toggle left panel</span>
                      <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-[10px]">Ctrl+←</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Toggle right panel</span>
                      <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-[10px]">Ctrl+→</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Exit (when done)</span>
                      <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-[10px]">Esc</kbd>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-gradient-to-b from-[rgb(102,255,228)]/20 via-[rgb(102,255,228)]/30 to-[rgb(102,255,228)]/20 hover:from-[rgb(102,255,228)]/40 hover:via-[rgb(102,255,228)]/50 hover:to-[rgb(102,255,228)]/40 transition-all duration-300 w-1" />

          {/* CENTER PANEL - Pipeline & Analytics */}
          <ResizablePanel defaultSize={40} minSize={35}>
            <div className="h-full overflow-y-auto bg-gradient-to-br from-[#0E1317]/30 to-[#12171D]/30 backdrop-blur-sm">
              <div className="p-4 md:p-6 lg:p-8 space-y-6">
                
                {/* Status Header with Large Typography */}
                <div className="space-y-3">
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-black bg-gradient-to-r from-white via-[rgb(102,255,228)] to-white bg-clip-text text-transparent leading-tight animate-gradient">
                    {isComplete
                      ? "🎉 Mission Complete"
                      : hasError
                      ? "⚠️ Mission Failed"
                      : "⚡ Generation in Progress"}
                  </h1>
                  <p className="text-sm md:text-base text-white/70 leading-relaxed">
                    {isComplete
                      ? "Your professional, Apple-quality documentation is ready for deployment"
                      : hasError
                      ? "We encountered an issue during the generation process"
                      : "Our AI is crafting beautiful, comprehensive documentation for your product"}
                  </p>
                </div>

                {/* Error Card */}
                {hasError && (
                  <Card className="glass-morphism-error border-2 border-red-500/50 shadow-2xl shadow-red-500/20 p-5 animate-shake" role="alert">
                    <div className="flex items-start gap-3">
                      <ExclamationCircleIcon className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5 animate-pulse" />
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-red-400 mb-2">Generation Error</h3>
                        <p className="text-sm text-white/80 leading-relaxed">{errorMessage || "An unexpected error occurred"}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2 flex-wrap">
                      <Button 
                        onClick={handleStartNew} 
                        size="sm" 
                        className="bg-gradient-to-r from-[rgb(102,255,228)] to-[rgb(80,200,180)] hover:from-white hover:to-[rgb(102,255,228)] text-[rgb(14,19,23)] transition-all duration-300 font-bold shadow-lg hover:shadow-[rgb(102,255,228)]/50 hover:scale-105"
                      >
                        <ArrowPathIcon className="h-4 w-4 mr-2" />
                        Try Again
                      </Button>
                      <Button 
                        onClick={handleGoBack} 
                        size="sm" 
                        variant="outline" 
                        className="border-white/20 text-white hover:bg-white/10 transition-all duration-300 hover:scale-105"
                      >
                        Back to Dashboard
                      </Button>
                    </div>
                  </Card>
                )}

                {/* Success Card */}
                {isComplete && !hasError && (
                  <Card className="glass-morphism-success border-2 border-[rgb(102,255,228)]/50 shadow-2xl shadow-[rgb(102,255,228)]/20 p-5 animate-slideDown" role="status">
                    <div className="flex items-start gap-3">
                      <CheckCircleIcon className="h-6 w-6 text-[rgb(102,255,228)] flex-shrink-0 mt-0.5 animate-bounce" />
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-[rgb(102,255,228)] mb-2">Documentation Ready!</h3>
                        <p className="text-sm text-white/80 leading-relaxed">Your beautiful, SEO-optimized documentation is ready to download and deploy</p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2 flex-wrap">
                      <Button 
                        onClick={handleViewDocumentation} 
                        size="sm" 
                        className="bg-gradient-to-r from-[rgb(102,255,228)] to-[rgb(80,200,180)] hover:from-white hover:to-[rgb(102,255,228)] text-[rgb(14,19,23)] transition-all duration-300 font-bold shadow-lg hover:shadow-[rgb(102,255,228)]/50 hover:scale-105"
                      >
                        View Documentation
                        <ArrowRightIcon className="ml-2 h-4 w-4" />
                      </Button>
                      <Button 
                        onClick={handleStartNew} 
                        size="sm" 
                        variant="outline" 
                        className="border-white/20 text-white hover:bg-white/10 transition-all duration-300 hover:scale-105"
                      >
                        Generate Another
                      </Button>
                    </div>
                  </Card>
                )}

                {/* Progress Overview Card */}
                {!isComplete && !hasError && (
                  <Card className="glass-morphism border-[rgb(102,255,228)]/30 shadow-2xl p-5 hover:border-[rgb(102,255,228)]/50 transition-all duration-500" role="progressbar" aria-valuenow={progress}>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-semibold text-white/90 uppercase tracking-wider">Overall Progress</span>
                          <div className="flex items-center gap-2 mt-1">
                            <ArrowPathIcon className="h-4 w-4 animate-spin text-[rgb(102,255,228)]" />
                            <span className="text-xs text-white/60">{stageName || "Initializing AI systems..."}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-black bg-gradient-to-r from-[rgb(102,255,228)] to-white bg-clip-text text-transparent">
                            {progress}%
                          </div>
                          {estimatedTimeRemaining !== null && (
                            <div className="text-xs text-white/60 mt-1">
                              ~{formatTime(estimatedTimeRemaining)} remaining
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Enhanced Progress Bar with Glow */}
                      <div className="relative">
                        <div className="h-3 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                          <div 
                            className="h-full bg-gradient-to-r from-[rgb(102,255,228)] via-[rgb(80,200,180)] to-[rgb(102,255,228)] rounded-full transition-all duration-500 relative overflow-hidden animate-gradient-flow"
                            style={{ width: `${progress}%` }}
                          >
                            <div className="absolute inset-0 bg-white/30 animate-shimmer"></div>
                          </div>
                        </div>
                        <div 
                          className="absolute top-0 left-0 h-3 bg-[rgb(102,255,228)] rounded-full filter blur-md opacity-50 transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      {/* Milestone Indicators */}
                      <div className="flex justify-between text-xs text-white/40">
                        <span className={progress >= 25 ? 'text-[rgb(102,255,228)] font-semibold' : ''}>25%</span>
                        <span className={progress >= 50 ? 'text-[rgb(102,255,228)] font-semibold' : ''}>50%</span>
                        <span className={progress >= 75 ? 'text-[rgb(102,255,228)] font-semibold' : ''}>75%</span>
                        <span className={progress >= 100 ? 'text-[rgb(102,255,228)] font-semibold' : ''}>100%</span>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Pipeline Stages - Enhanced */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ChartBarIcon className="h-5 w-5 text-[rgb(102,255,228)]" />
                    <h2 className="text-base font-bold text-white">Generation Pipeline</h2>
                  </div>
                  {stages.map((stage, index) => {
                    const isActive = currentStage === stage.id;
                    const isCompleted = currentStage > stage.id;
                    const Icon = stage.icon;

                    return (
                      <Card
                        key={stage.id}
                        className={`p-4 transition-all duration-500 ${
                          isActive
                            ? "glass-morphism-active border-2 border-[rgb(102,255,228)] shadow-2xl shadow-[rgb(102,255,228)]/30 scale-[1.02]"
                            : isCompleted
                            ? "glass-morphism border-[rgb(102,255,228)]/30"
                            : "bg-white/5 border border-white/10 opacity-60"
                        }`}
                        style={{
                          animation: isActive ? 'pulseGlow 2s ease-in-out infinite' : 'none'
                        }}
                      >
                        <div className="flex items-start gap-4">
                          {/* Stage Icon */}
                          <div className="relative">
                            <div
                              className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${
                                isCompleted
                                  ? "bg-gradient-to-br from-[rgb(102,255,228)] to-[rgb(80,200,180)] shadow-lg shadow-[rgb(102,255,228)]/50"
                                  : isActive
                                  ? "bg-[rgb(102,255,228)]/20 border-2 border-[rgb(102,255,228)] animate-pulse"
                                  : "bg-white/10 border-2 border-white/20"
                              }`}
                            >
                              {isCompleted ? (
                                <CheckIcon className="h-5 w-5 text-[rgb(14,19,23)] font-bold" />
                              ) : (
                                <Icon
                                  className={`h-5 w-5 ${
                                    isActive ? "text-[rgb(102,255,228)]" : "text-white/40"
                                  }`}
                                />
                              )}
                            </div>
                            {isActive && (
                              <div className="absolute inset-0 bg-[rgb(102,255,228)] rounded-xl filter blur-lg opacity-50 animate-pulse"></div>
                            )}
                          </div>

                          {/* Stage Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3
                                className={`text-sm font-bold ${
                                  isActive 
                                    ? "text-[rgb(102,255,228)]" 
                                    : isCompleted 
                                    ? "text-white" 
                                    : "text-white/50"
                                }`}
                              >
                                {stage.name}
                              </h3>
                              {isActive && (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-[rgb(102,255,228)]/20 border border-[rgb(102,255,228)]/50 text-[rgb(102,255,228)] font-semibold animate-pulse">
                                  Active
                                </span>
                              )}
                              {isCompleted && (
                                <CheckCircleIcon className="h-4 w-4 text-[rgb(102,255,228)]" />
                              )}
                            </div>
                            <p
                              className={`text-xs leading-relaxed ${
                                isActive ? "text-white/80" : isCompleted ? "text-white/60" : "text-white/40"
                              }`}
                            >
                              {stage.description}
                            </p>
                            
                            {/* Substages */}
                            {isActive && stage.substages && (
                              <div className="mt-3 space-y-1.5">
                                {stage.substages.map((substage, subIndex) => (
                                  <div key={subIndex} className="flex items-center gap-2 text-xs">
                                    <div className={`w-1.5 h-1.5 rounded-full ${
                                      subIndex === 0 ? 'bg-[rgb(102,255,228)] animate-pulse' : 'bg-white/30'
                                    }`}></div>
                                    <span className={subIndex === 0 ? 'text-white/90' : 'text-white/50'}>
                                      {substage}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Stage Number Badge */}
                          <div
                            className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                              isCompleted || isActive
                                ? "bg-gradient-to-br from-[rgb(102,255,228)]/30 to-[rgb(102,255,228)]/10 text-[rgb(102,255,228)] border border-[rgb(102,255,228)]/50"
                                : "bg-white/10 text-white/40 border border-white/20"
                            }`}
                          >
                            {stage.id}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {/* Live Metrics Dashboard */}
                {!isComplete && !hasError && metrics.sourcesAnalyzed > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <BeakerIcon className="h-5 w-5 text-[rgb(102,255,228)]" />
                      <h2 className="text-base font-bold text-white">Live Metrics</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Card className="glass-morphism border-[rgb(102,255,228)]/20 p-4 hover:scale-105 transition-transform duration-300">
                        <div className="text-xs text-white/60 mb-1">Sources Analyzed</div>
                        <div className="text-2xl font-black text-[rgb(102,255,228)]">{metrics.sourcesAnalyzed}</div>
                        <div className="text-xs text-white/40 mt-1">Stack Overflow, GitHub, Reddit...</div>
                      </Card>
                      <Card className="glass-morphism border-[rgb(102,255,228)]/20 p-4 hover:scale-105 transition-transform duration-300">
                        <div className="text-xs text-white/60 mb-1">Pages Processed</div>
                        <div className="text-2xl font-black text-white">{metrics.pagesProcessed}</div>
                        <div className="text-xs text-white/40 mt-1">Crawled and analyzed</div>
                      </Card>
                    </div>
                  </div>
                )}

                {/* Info Card - Did You Know */}
                <Card className="glass-morphism border-white/10 p-4">
                  <h3 className="text-xs font-bold text-white/90 mb-3 uppercase tracking-wider flex items-center gap-2">
                    <SparklesIcon className="h-4 w-4 text-[rgb(102,255,228)]" />
                    Did You Know?
                  </h3>
                  <ul className="space-y-2.5 text-xs text-white/70 leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-[rgb(102,255,228)] mt-0.5 font-bold">•</span>
                      <span>We analyze <strong className="text-white">10+ high-quality sources</strong> including Stack Overflow, GitHub, Reddit, and YouTube for comprehensive coverage</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[rgb(102,255,228)] mt-0.5 font-bold">•</span>
                      <span>Documentation automatically <strong className="text-white">matches your brand colors and styling</strong> using AI-powered theme extraction</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[rgb(102,255,228)] mt-0.5 font-bold">•</span>
                      <span><strong className="text-white">SEO optimization and accessibility features</strong> are included out of the box</span>
                    </li>
                  </ul>
                </Card>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-gradient-to-b from-[rgb(102,255,228)]/20 via-[rgb(102,255,228)]/30 to-[rgb(102,255,228)]/20 hover:from-[rgb(102,255,228)]/40 hover:via-[rgb(102,255,228)]/50 hover:to-[rgb(102,255,228)]/40 transition-all duration-300 w-1" />

          {/* RIGHT PANEL - Smart Preview */}
          <ResizablePanel 
            defaultSize={30} 
            minSize={25} 
            collapsible 
            onCollapse={() => setRightPanelCollapsed(true)} 
            onExpand={() => setRightPanelCollapsed(false)}
          >
            <div className="h-full bg-[rgb(20,25,30)] flex flex-col">
              {/* Preview Header */}
              <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-r from-[#1A1F26]/90 to-[#22262E]/90 backdrop-blur-xl">
                <div className="flex items-center gap-2 mb-2">
                  <GlobeAltIcon className="h-4 w-4 text-[rgb(102,255,228)]" />
                  <span className="text-xs text-white/60 font-mono truncate flex-1">{targetUrl}</span>
                  {rightPanelCollapsed && (
                    <Button
                      onClick={() => setRightPanelCollapsed(false)}
                      size="sm"
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10 transition-all duration-300 hover:scale-105"
                    >
                      <ChevronLeftIcon className="h-4 w-4 mr-1" />
                      Expand
                    </Button>
                  )}
                </div>
                <h2 className="text-sm font-bold bg-gradient-to-r from-white to-[rgb(102,255,228)] bg-clip-text text-transparent">
                  {previewContent ? "📝 Documentation Preview" : "🌐 Target Website"}
                </h2>
              </div>
              
              {/* Preview Content */}
              <div className="flex-1 relative bg-white overflow-hidden">
                {previewContent ? (
                  <div className="p-6 h-full overflow-y-auto bg-white custom-scrollbar">
                    <div className="prose prose-sm md:prose max-w-none">
                      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 border-2 border-[rgb(102,255,228)]/30 shadow-2xl">
                        <div className="mb-4 pb-4 border-b-2 border-[rgb(102,255,228)]/20">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[rgb(102,255,228)] animate-pulse"></div>
                            <span className="text-xs text-[rgb(102,255,228)] font-bold uppercase tracking-wider">Live Preview</span>
                          </div>
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
                  <div className="flex items-center justify-center h-full bg-gradient-to-br from-[#0E1317] to-[#12171D]">
                    <div className="text-center space-y-3">
                      <DocumentTextIcon className="h-16 w-16 text-white/20 mx-auto animate-pulse" />
                      <p className="text-sm text-white/40">Preview will appear here</p>
                    </div>
                  </div>
                )}
                
                {/* Analyzing Indicator */}
                {!isComplete && !hasError && (
                  <div className="absolute top-4 right-4">
                    <div className="glass-morphism rounded-xl px-4 py-2.5 flex items-center gap-2 border border-[rgb(102,255,228)]/30 shadow-2xl shadow-[rgb(102,255,228)]/20">
                      <div className="relative">
                        <ArrowPathIcon className="h-4 w-4 animate-spin text-[rgb(102,255,228)]" />
                        <div className="absolute inset-0 bg-[rgb(102,255,228)] blur-md opacity-50"></div>
                      </div>
                      <span className="text-xs font-bold text-[rgb(102,255,228)]">
                        Analyzing
                      </span>
                    </div>
                  </div>
                )}

                {/* Panel Control Hint */}
                <div className="absolute bottom-4 right-4">
                  <div className="text-xs text-white/60 bg-black/70 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10">
                    <kbd className="px-2 py-1 rounded bg-white/10 font-mono text-[10px]">Ctrl+→</kbd>
                    <span className="ml-2">to toggle</span>
                  </div>
                </div>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Custom Styles */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes pulseGlow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(102, 255, 228, 0.3);
          }
          50% {
            box-shadow: 0 0 40px rgba(102, 255, 228, 0.5);
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        @keyframes confetti {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes gradient-flow {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
        }

        .animate-confetti {
          animation: confetti linear forwards;
        }

        .animate-gradient-flow {
          background-size: 200% 200%;
          animation: gradient-flow 3s ease infinite;
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }

        .animate-slideDown {
          animation: slideDown 0.5s ease-out;
        }

        .animate-gradient {
          background-size: 200% auto;
          animation: gradient-flow 3s linear infinite;
        }

        .glass-morphism {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .glass-morphism-active {
          background: rgba(102, 255, 228, 0.05);
          backdrop-filter: blur(20px);
        }

        .glass-morphism-error {
          background: rgba(239, 68, 68, 0.05);
          backdrop-filter: blur(20px);
        }

        .glass-morphism-success {
          background: rgba(102, 255, 228, 0.05);
          backdrop-filter: blur(20px);
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(102, 255, 228, 0.3);
          border-radius: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(102, 255, 228, 0.5);
        }
      `}</style>
    </div>
  );
}
