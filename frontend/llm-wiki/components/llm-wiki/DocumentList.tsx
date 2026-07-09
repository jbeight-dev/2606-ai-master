"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileText, RotateCcw, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentStatusBadge } from "@/components/common/StatusBadge";
import type { Document, DocumentType } from "@/types/llm-wiki";

const DOCUMENT_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: "USER_MANUAL", label: "사용자 매뉴얼" },
  { value: "ERD", label: "ERD" },
  { value: "DATA_CATALOG", label: "데이터 카탈로그" },
  { value: "GLOSSARY", label: "용어집" },
  { value: "UNKNOWN", label: "기타" },
];

function formatDate(iso?: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatElapsedMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}초`;
}

function useUploadHandler(onUpload: (file: File) => Promise<void>) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setUploading(true);
      try {
        for (const file of Array.from(files)) {
          await onUpload(file);
        }
      } finally {
        setUploading(false);
      }
    },
    [onUpload]
  );

  return { uploading, fileInputRef, handleFiles };
}

interface UploadDropzoneProps {
  onUpload: (file: File) => Promise<void>;
  className?: string;
}

export function UploadDropzone({ onUpload, className }: UploadDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const { uploading, fileInputRef, handleFiles } = useUploadHandler(onUpload);

  return (
    <div
      className={`h-full flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-8 px-6 text-center transition-colors ${
        dragging
          ? "border-primary bg-primary/5"
          : "border-border bg-muted/30 hover:border-primary/50 hover:bg-accent/30"
      } ${className ?? ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        accept=".txt"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-2.5" />
      <p className="text-sm font-medium text-foreground mb-2">
        파일을 드래그하거나 클릭하여 업로드
      </p>
      <p className="text-xs text-muted-foreground mb-3">.txt 파일만 지원됩니다</p>

      <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="outline"
          size="sm"
          disabled={uploading}
          type="button"
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? "업로드 중..." : "파일 선택"}
        </Button>
      </div>
    </div>
  );
}

interface DocumentListProps {
  documents: Document[];
  onUpload: (file: File) => Promise<void>;
  onAnalyze: (documentId: number) => void;
  analyzingDocumentId: number | null;
  analyzingStepLabel?: string;
}

export function DocumentList({
  documents,
  onUpload,
  onAnalyze,
  analyzingDocumentId,
  analyzingStepLabel,
}: DocumentListProps) {
  const { uploading, fileInputRef, handleFiles } = useUploadHandler(onUpload);

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="divide-y divide-border">
        {documents.map((doc) => (
          <div key={doc.document_id} className="px-4 py-3 hover:bg-accent/30 transition-colors">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="text-sm font-medium truncate text-foreground">{doc.file_name}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {DOCUMENT_TYPE_OPTIONS.find((o) => o.value === doc.document_type)?.label ??
                    doc.document_type}{" "}
                  · {formatDate(doc.created_at)}
                  {doc.analysis_elapsed_ms != null &&
                    ` · 분석 ${formatElapsedMs(doc.analysis_elapsed_ms)} 소요`}
                </span>
              </div>
              <DocumentStatusBadge status={doc.status} />
            </div>

            {(doc.status === "UPLOADED" || doc.status === "FAILED") && (
              <div className="mt-2 pl-8">
                {analyzingDocumentId === doc.document_id ? (
                  <div className="flex items-center gap-2 bg-primary/10 text-primary text-xs rounded-lg px-3 py-2.5">
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                    <span>
                      {analyzingStepLabel ?? "AI 분석"} 단계 처리 중 — 완료되면 자동으로 검수 페이지로
                      안내합니다
                    </span>
                  </div>
                ) : doc.status === "FAILED" ? (
                  <Button size="sm" variant="outline" onClick={() => onAnalyze(doc.document_id)}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> 다시 시도
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-purple-500 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950"
                    onClick={() => onAnalyze(doc.document_id)}
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1" /> 분석 시작
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-border px-4 py-3">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept=".txt"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={uploading}
          type="button"
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? "업로드 중..." : "다른 파일 업로드"}
        </Button>
      </div>
    </div>
  );
}
