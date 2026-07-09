import { Check, Loader2, Clock } from "lucide-react";
import type { SimulatedAnalysisStep } from "@/types/llm-wiki";

interface AnalysisProgressProps {
  steps: SimulatedAnalysisStep[];
}

const STEP_ICON: Record<SimulatedAnalysisStep["status"], React.ReactNode> = {
  completed: <Check className="h-4 w-4 text-white" />,
  in_progress: <Loader2 className="h-4 w-4 text-white animate-spin" />,
  pending: <Clock className="h-4 w-4 text-muted-foreground" />,
};

const STEP_BG: Record<SimulatedAnalysisStep["status"], string> = {
  completed: "bg-green-500",
  in_progress: "bg-primary",
  pending: "bg-muted",
};

const STEP_LABEL_COLOR: Record<SimulatedAnalysisStep["status"], string> = {
  completed: "text-foreground",
  in_progress: "text-primary",
  pending: "text-muted-foreground",
};

const CONNECTOR_COLOR: Record<SimulatedAnalysisStep["status"], string> = {
  completed: "bg-green-500",
  in_progress: "bg-primary",
  pending: "bg-border",
};

export function AnalysisProgress({ steps }: AnalysisProgressProps) {
  return (
    <ol className="flex items-start">
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        return (
          <li key={step.id} className="relative flex flex-1 flex-col items-start">
            {!isLast && (
              <div
                className={`absolute top-4 left-8 right-0 h-0.5 ${CONNECTOR_COLOR[steps[idx + 1].status]}`}
                aria-hidden="true"
              />
            )}
            <div
              className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${STEP_BG[step.status]}`}
            >
              {STEP_ICON[step.status]}
            </div>
            <p
              className={`mt-1.5 text-[11px] text-left leading-tight pr-2 ${STEP_LABEL_COLOR[step.status]}`}
            >
              {step.label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
