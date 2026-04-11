import * as React from "react";
import { cn } from "@/lib/utils";

export interface LifecycleStep {
  key: string;
  label: string;
}

const DEFAULT_STEPS: LifecycleStep[] = [
  { key: "REGISTERED", label: "RECIBIDO" },
  { key: "CLASSIFIED", label: "TRIAGE" },
  { key: "IN_PROGRESS", label: "ASIGNADO" },
  { key: "ATTENDED", label: "RESOLUCIÓN" },
  { key: "CLOSED", label: "CERRADO" },
];

export interface LifecycleTrackerProps {
  /** Current active step key */
  currentStep?: string;
  /** Alias for currentStep */
  currentStatus?: string;
  /** Custom steps (defaults to request lifecycle) */
  steps?: LifecycleStep[];
  /** If the request was cancelled or rejected, show dimmed */
  terminated?: boolean;
  className?: string;
}

function getStepIndex(steps: LifecycleStep[], key: string): number {
  return steps.findIndex((s) => s.key === key);
}

export function LifecycleTracker({
  currentStep,
  currentStatus,
  steps = DEFAULT_STEPS,
  terminated = false,
  className,
}: LifecycleTrackerProps) {
  const activeStep = currentStep || currentStatus || "REGISTERED";
  const currentIndex = getStepIndex(steps, activeStep);

  return (
    <div
      data-testid="lifecycle-tracker"
      className={cn(
        "flex items-center gap-0 w-full overflow-x-auto",
        terminated && "opacity-40",
        className
      )}
    >
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isFuture = index > currentIndex;

        return (
          <React.Fragment key={step.key}>
            {/* Step */}
            <div
              className="flex flex-col items-center gap-1.5 min-w-0"
              data-testid={`lifecycle-step-${step.key}`}
            >
              {/* Indicator */}
              <div
                className={cn(
                  "w-4 h-4 flex items-center justify-center font-mono text-[10px] transition-all",
                  isCompleted && "bg-white text-[#0A0A0A]",
                  isCurrent &&
                    "bg-white text-[#0A0A0A] ring-1 ring-white ring-offset-2 ring-offset-[#0A0A0A]",
                  isFuture && "ghost-border text-mercury"
                )}
              >
                {isCompleted ? "■" : isCurrent ? "■" : "▢"}
              </div>

              {/* Label */}
              <span
                className={cn(
                  "text-[9px] font-mono uppercase tracking-wider whitespace-nowrap",
                  isCompleted && "text-mercury",
                  isCurrent && "text-foreground font-semibold",
                  isFuture && "text-mercury opacity-40"
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-px min-w-[16px] mx-1 mt-[-12px]",
                  index < currentIndex
                    ? "bg-white"
                    : "bg-[rgba(192,192,192,0.15)]"
                )}
                aria-hidden="true"
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
