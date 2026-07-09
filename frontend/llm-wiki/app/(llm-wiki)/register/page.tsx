"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check } from "lucide-react";
import { DocumentList, UploadDropzone } from "@/components/llm-wiki/DocumentList";
import { AnalysisProgress } from "@/components/llm-wiki/AnalysisProgress";
import { useDocuments, useUploadDocument, useAnalyzeDocument, ApiRequestError } from "@/lib/api";
import { useActiveSpace } from "@/lib/active-space";
import type { SimulatedAnalysisStep } from "@/types/llm-wiki";

const STEP_LABELS = [
  "문서 분류",
  "구조 분석",
  "Wiki 초안 생성",
  "임베딩 및 Vector 저장",
  "검수 대기",
];

const UPLOAD_GUIDE_ITEMS = [
  ".txt 형식만 지원됩니다",
  "업로드 후 \"분석 시작\"을 눌러 AI가 Wiki를 생성합니다",
  "분석 완료 후 검수 페이지에서 내용을 확인하고 승인할 수 있습니다",
];

interface AnalysisState {
  documentId: number;
  stepIndex: number;
  status: "running" | "success" | "error";
  errorMessage?: string;
  startedAt: number;
  liveSeconds: number;
  elapsedMs?: number;
}

function formatElapsedMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}초`;
}

export default function RegisterPage() {
  const { activeSpaceId } = useActiveSpace();
  const { data: documents = [], isLoading } = useDocuments(activeSpaceId);
  const uploadMutation = useUploadDocument(activeSpaceId);
  const analyzeMutation = useAnalyzeDocument(activeSpaceId);

  const [analysis, setAnalysis] = useState<AnalysisState | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
  }, []);

  function handleAnalyze(documentId: number) {
    if (timerRef.current) clearInterval(timerRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    setAnalysis({ documentId, stepIndex: 0, status: "running", startedAt: Date.now(), liveSeconds: 0 });
    timerRef.current = setInterval(() => {
      setAnalysis((prev) =>
        prev && prev.status === "running"
          ? { ...prev, stepIndex: Math.min(prev.stepIndex + 1, STEP_LABELS.length - 1) }
          : prev
      );
    }, 620);
    tickRef.current = setInterval(() => {
      setAnalysis((prev) =>
        prev && prev.status === "running"
          ? { ...prev, liveSeconds: Math.max(0, Math.floor((Date.now() - prev.startedAt) / 1000)) }
          : prev
      );
    }, 1000);

    analyzeMutation.mutate(documentId, {
      onSuccess: (result) => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (tickRef.current) clearInterval(tickRef.current);
        setAnalysis((prev) =>
          prev && prev.documentId === documentId
            ? { ...prev, stepIndex: STEP_LABELS.length, status: "success", elapsedMs: result.elapsed_ms }
            : prev
        );
        setTimeout(() => {
          setAnalysis((prev) => (prev?.documentId === documentId && prev.status === "success" ? null : prev));
        }, 2500);
      },
      onError: (error) => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (tickRef.current) clearInterval(tickRef.current);
        const isRateLimit = error instanceof ApiRequestError && error.status === 429;
        const message = isRateLimit
          ? "AI 요청 한도를 초과했습니다 (429). 잠시 후 다시 시도해주세요."
          : error instanceof Error
          ? error.message
          : "분석 중 오류가 발생했습니다.";
        setAnalysis((prev) =>
          prev && prev.documentId === documentId
            ? { ...prev, status: "error", errorMessage: message, elapsedMs: Date.now() - prev.startedAt }
            : prev
        );
      },
    });
  }

  const stepIndex = analysis?.stepIndex ?? 0;
  const showInProgress = analysis?.status === "running";
  const steps: SimulatedAnalysisStep[] = STEP_LABELS.map((label, idx) => ({
    id: `step-${idx}`,
    label,
    status: idx < stepIndex ? "completed" : idx === stepIndex && showInProgress ? "in_progress" : "pending",
  }));

  const currentStepLabel = STEP_LABELS[Math.min(stepIndex, STEP_LABELS.length - 1)];

  const statusText =
    analysis == null
      ? "분석 대기 중"
      : analysis.status === "running"
      ? `${currentStepLabel} 처리 중... ${analysis.liveSeconds}초 경과`
      : analysis.status === "success"
      ? analysis.elapsedMs != null
        ? `분석 완료 · 총 ${formatElapsedMs(analysis.elapsedMs)} 소요`
        : "분석 완료"
      : "분석 실패";

  const statusDotClass =
    analysis == null
      ? "bg-muted-foreground/40"
      : analysis.status === "running"
      ? "bg-primary animate-pulse"
      : analysis.status === "success"
      ? "bg-green-500"
      : "bg-destructive";

  const statusTextClass =
    analysis == null
      ? "text-muted-foreground"
      : analysis.status === "running"
      ? "text-primary"
      : analysis.status === "success"
      ? "text-green-600 dark:text-green-400"
      : "text-destructive";

  const uploadFile = (file: File) => uploadMutation.mutateAsync({ file }).then(() => {});

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">문서 등록</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          문서를 올리면 AI가 자동으로 구조화합니다.
        </p>
      </div>

      <div>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className={`w-2 h-2 rounded-full shrink-0 ${statusDotClass}`} />
          <span className={statusTextClass}>{statusText}</span>
        </div>

        <div className="mt-4">
          <AnalysisProgress steps={steps} />
        </div>

        {analysis?.status === "error" && (
          <div className="mt-3 flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{analysis.errorMessage}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <UploadDropzone onUpload={uploadFile} />
          ) : (
            <DocumentList
              documents={documents}
              onUpload={uploadFile}
              onAnalyze={handleAnalyze}
              analyzingDocumentId={analysis?.status === "running" ? analysis.documentId : null}
              analyzingStepLabel={currentStepLabel}
            />
          )}
        </div>

        <div className="rounded-xl bg-muted px-4 py-3.5">
          <p className="text-sm font-semibold text-foreground mb-2.5">업로드 가이드</p>
          <ul className="space-y-2">
            {UPLOAD_GUIDE_ITEMS.map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/80" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
