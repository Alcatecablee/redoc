import { useState, useCallback, useRef, useEffect } from 'react';

export interface ProgressStage {
  id: number;
  name: string;
  description: string;
  progress: number;
}

export interface ProgressState {
  currentStage: number;
  overallProgress: number;
  stages: ProgressStage[];
  isActive: boolean;
}

export const useProgressTracking = (stages: Omit<ProgressStage, 'progress'>[]) => {
  const [progressState, setProgressState] = useState<ProgressState>({
    currentStage: 0,
    overallProgress: 0,
    stages: stages.map(stage => ({ ...stage, progress: 0 })),
    isActive: false,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const startProgress = useCallback(() => {
    startTimeRef.current = Date.now();
    setProgressState(prev => ({
      ...prev,
      currentStage: 1,
      overallProgress: 0,
      isActive: true,
      stages: prev.stages.map(stage => ({ ...stage, progress: 0 })),
    }));

    // Start a realistic progress simulation that responds to actual API calls
    intervalRef.current = setInterval(() => {
      setProgressState(prev => {
        if (!prev.isActive) return prev;

        const elapsed = Date.now() - startTimeRef.current;
        const currentStageIndex = prev.currentStage - 1;
        
        // Each stage should take approximately 15-30 seconds
        const stageBaseDuration = 20000; // 20 seconds base
        const currentStageDuration = stageBaseDuration + (Math.random() * 10000); // 20-30 seconds
        
        const stageProgress = Math.min(95, (elapsed % currentStageDuration) / currentStageDuration * 100);
        
        // Calculate overall progress
        const completedStages = Math.floor(elapsed / stageBaseDuration);
        const overallProgress = Math.min(95, (completedStages * 25) + (stageProgress * 0.25));
        
        const newCurrentStage = Math.min(stages.length, completedStages + 1);

        return {
          ...prev,
          currentStage: newCurrentStage,
          overallProgress,
          stages: prev.stages.map((stage, index) => ({
            ...stage,
            progress: index < completedStages ? 100 : 
                     index === completedStages ? stageProgress : 0,
          })),
        };
      });
    }, 500); // Update every 500ms for smooth progress
  }, [stages]);

  const completeProgress = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setProgressState(prev => ({
      ...prev,
      currentStage: stages.length,
      overallProgress: 100,
      isActive: false,
      stages: prev.stages.map(stage => ({ ...stage, progress: 100 })),
    }));
  }, [stages.length]);

  const resetProgress = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setProgressState({
      currentStage: 0,
      overallProgress: 0,
      stages: stages.map(stage => ({ ...stage, progress: 0 })),
      isActive: false,
    });
  }, [stages]);

  const updateStageProgress = useCallback((stageId: number, progress: number) => {
    setProgressState(prev => ({
      ...prev,
      stages: prev.stages.map(stage => 
        stage.id === stageId ? { ...stage, progress: Math.min(100, progress) } : stage
      ),
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    progressState,
    startProgress,
    completeProgress,
    resetProgress,
    updateStageProgress,
  };
};