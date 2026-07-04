"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentList } from "@/components/llm-wiki/DocumentList";
import { AnalysisProgress } from "@/components/llm-wiki/AnalysisProgress";
import { useDocuments, useUploadDocument, useAnalyzeDocument, ApiRequestError } from "@/lib/api";
import { useActiveSpace } from "@/lib/active-space";
import type { DocumentType, SimulatedAnalysisStep } from "@/types/llm-wiki";

const STEP_LABELS = [
  "문서 파싱",
  "구조 분석",
  "엔티티 추출",
  "Wiki 노드 생성",
  "관계 매핑",
  "검수 대기",
];

interface AnalysisState {
  documentId: number;
  stepIndex: number;
  status: "running" | "success" | "error";
  errorMessage?: string;
}

export default function RegisterPage() {
  const { activeSpaceId } = useActiveSpace();
  const { data: documents = [], isLoading } = useDocuments(activeSpaceId);
  const uploadMutation = useUploadDocument(activeSpaceId);
  const analyzeMutation = useAnalyzeDocument(activeSpaceId);

  const [analysis, setAnalysis] = useState<AnalysisState | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  function handleAnalyze(documentId: number) {
    if (timerRef.current) clearInterval(timerRef.current);
    setAnalysis({ documentId, stepIndex: 0, status: "running" });
    timerRef.current = setInterval(() => {
      setAnalysis((prev) =>
        prev && prev.status === "running"
          ? { ...prev, stepIndex: Math.min(prev.stepIndex + 1, STEP_LABELS.length - 1) }
          : prev
      );
    }, 620);

    analyzeMutation.mutate(documentId, {
      onSuccess: () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setAnalysis((prev) =>
          prev && prev.documentId === documentId
            ? { ...prev, stepIndex: STEP_LABELS.length, status: "success" }
            : prev
        );
        setTimeout(() => {
          setAnalysis((prev) => (prev?.documentId === documentId && prev.status === "success" ? null : prev));
        }, 900);
      },
      onError: (error) => {
        if (timerRef.current) clearInterval(timerRef.current);
        const isRateLimit = error instanceof ApiRequestError && error.status === 429;
        const message = isRateLimit
          ? "AI 요청 한도를 초과했습니다 (429). 잠시 후 다시 시도해주세요."
          : error instanceof Error
          ? error.message
          : "분석 중 오류가 발생했습니다.";
        setAnalysis((prev) =>
          prev && prev.documentId === documentId ? { ...prev, status: "error", errorMessage: message } : prev
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

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">문서 등록</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          문서를 올리면 AI가 자동으로 구조화합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <DocumentList
              documents={documents}
              onUpload={(file, documentType: DocumentType) =>
                uploadMutation.mutateAsync({ file, documentType }).then(() => {})
              }
              onAnalyze={handleAnalyze}
              analyzingDocumentId={analysis?.status === "running" ? analysis.documentId : null}
            />
          )}
        </div>

        <div className="space-y-4">
          {analysis != null && (
            <Card className={analysis.status === "error" ? "border-destructive/40" : undefined}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  {analysis.status === "running"
                    ? "AI 분석 중..."
                    : analysis.status === "success"
                    ? "분석 완료"
                    : "분석 실패"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <AnalysisProgress steps={steps} />
                {analysis.status === "error" && (
                  <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>{analysis.errorMessage}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">업로드 가이드</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>• .txt 형식만 지원됩니다</p>
              <p>• 업로드 후 &quot;분석 시작&quot;을 눌러 AI가 Wiki를 생성합니다</p>
              <p>• 분석 완료 후 검수 페이지에서 내용을 확인하고 승인할 수 있습니다</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
