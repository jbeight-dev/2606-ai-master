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

export function AnalysisProgress({ steps }: AnalysisProgressProps) {
  return (
    <div className="space-y-3">
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        return (
          <div key={step.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${STEP_BG[step.status]}`}
              >
                {STEP_ICON[step.status]}
              </div>
              {!isLast && (
                <div
                  className={`w-0.5 flex-1 mt-1 ${
                    step.status === "completed" ? "bg-green-500" : "bg-border"
                  }`}
                  style={{ minHeight: "16px" }}
                />
              )}
            </div>
            <div className="pb-4">
              <p
                className={`text-sm font-medium ${
                  step.status === "pending"
                    ? "text-muted-foreground"
                    : step.status === "in_progress"
                    ? "text-primary"
                    : "text-foreground"
                }`}
              >
                {step.label}
              </p>
              {step.status === "in_progress" && (
                <p className="text-xs text-muted-foreground mt-0.5">처리 중...</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
