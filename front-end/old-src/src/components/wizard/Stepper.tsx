import React from 'react';
import { IconCheck } from '@tabler/icons-react';

interface Step {
  id: number;
  title: string;
  description: string;
  icon?: React.ReactNode;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  completedSteps: number[];
  onStepClick?: (step: number) => void;
}

export const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  completedSteps,
  onStepClick
}) => {
  const isStepCompleted = (stepId: number) => completedSteps.includes(stepId);
  const isStepActive = (stepId: number) => stepId === currentStep;
  const isStepClickable = (stepId: number) => onStepClick && (isStepCompleted(stepId) || stepId < currentStep);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = isStepCompleted(step.id);
          const isActive = isStepActive(step.id);
          const isClickable = isStepClickable(step.id);
          
          return (
            <React.Fragment key={step.id}>
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => isClickable && onStepClick?.(step.id)}
                  disabled={!isClickable}
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
                    ${isCompleted 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg' 
                      : isActive 
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg ring-4 ring-indigo-100' 
                        : 'bg-gray-200 text-gray-400'
                    }
                    ${isClickable ? 'cursor-pointer hover:scale-110' : 'cursor-default'}
                  `}
                >
                  {isCompleted ? (
                    <IconCheck size={20} />
                  ) : (
                    <span className="font-semibold text-sm">{step.id}</span>
                  )}
                </button>
                
                {/* Step Info */}
                <div className="mt-3 text-center max-w-32">
                  <h3 className={`
                    text-sm font-semibold transition-colors duration-200
                    ${isCompleted || isActive ? 'text-gray-900' : 'text-gray-500'}
                  `}>
                    {step.title}
                  </h3>
                  <p className={`
                    text-xs mt-1 transition-colors duration-200
                    ${isCompleted || isActive ? 'text-gray-600' : 'text-gray-400'}
                  `}>
                    {step.description}
                  </p>
                </div>
              </div>
              
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-4 relative">
                  <div className={`
                    h-full transition-all duration-500 rounded-full
                    ${isStepCompleted(step.id + 1) 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                      : 'bg-gray-200'
                    }
                  `} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      
      {/* Progress Bar */}
      <div className="mt-8">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-indigo-600 to-indigo-700 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Step {currentStep} of {steps.length}</span>
          <span>{Math.round(((currentStep - 1) / (steps.length - 1)) * 100)}% Complete</span>
        </div>
      </div>
    </div>
  );
};
