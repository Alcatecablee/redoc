import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

export type WizardStep = {
  id: string;
  title: string;
  description: string;
};

interface ConfigurationWizardProps {
  steps: WizardStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onComplete?: () => void;
  children: React.ReactNode;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  isLastStep?: boolean;
  nextButtonText?: string;
  previousButtonText?: string;
  completeButtonText?: string;
}

export default function ConfigurationWizard({
  steps,
  currentStep,
  onStepChange,
  onComplete,
  children,
  canGoNext = true,
  canGoPrevious = true,
  isLastStep = false,
  nextButtonText = 'Next Step',
  previousButtonText = 'Previous',
  completeButtonText = 'Complete Order',
}: ConfigurationWizardProps) {
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      onStepChange(currentStep + 1);
    } else if (isLastStep && onComplete) {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      onStepChange(currentStep - 1);
    }
  };

  return (
    <div className="w-full space-y-8">
      {/* Progress Bar */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/70">
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="text-white/70">{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isUpcoming = index > currentStep;

          return (
            <button
              key={step.id}
              onClick={() => {
                if (index <= currentStep) {
                  onStepChange(index);
                }
              }}
              disabled={index > currentStep}
              className={`
                relative flex flex-col items-start p-4 rounded-lg border-2 transition-all text-left
                ${isCurrent
                  ? 'bg-white/20 border-white/60 shadow-lg'
                  : isCompleted
                  ? 'bg-green-500/20 border-green-400/60 cursor-pointer hover:bg-green-500/30'
                  : 'bg-white/5 border-white/20 cursor-not-allowed opacity-50'
                }
              `}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`
                    flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                    ${isCurrent
                      ? 'bg-white text-gray-900'
                      : isCompleted
                      ? 'bg-green-500 text-white'
                      : 'bg-white/20 text-white/60'
                    }
                  `}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                </div>
                {isCurrent && (
                  <span className="text-xs font-medium text-white/90 uppercase tracking-wider">
                    Current
                  </span>
                )}
              </div>
              <h3 className={`font-semibold text-sm ${isCurrent || isCompleted ? 'text-white' : 'text-white/60'}`}>
                {step.title}
              </h3>
              <p className={`text-xs mt-1 ${isCurrent ? 'text-white/70' : 'text-white/50'}`}>
                {step.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Current Step Content */}
      <div className="bg-white/10 rounded-2xl border border-white/20 p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            {steps[currentStep].title}
          </h2>
          <p className="text-white/70">
            {steps[currentStep].description}
          </p>
        </div>
        
        {children}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-6 border-t border-white/20">
        <Button
          variant="outline"
          size="lg"
          onClick={handlePrevious}
          disabled={!canGoPrevious || currentStep === 0}
          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {previousButtonText}
        </Button>

        <div className="flex items-center gap-2 text-white/60 text-sm">
          <span>Press Enter to continue</span>
        </div>

        <Button
          size="lg"
          onClick={handleNext}
          disabled={!canGoNext}
          className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg"
        >
          {isLastStep ? (
            <>
              {completeButtonText}
              <Check className="w-4 h-4 ml-2" />
            </>
          ) : (
            <>
              {nextButtonText}
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
