"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileText, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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

interface DocumentListProps {
  documents: Document[];
  onUpload: (file: File, documentType: DocumentType) => Promise<void>;
  onAnalyze: (documentId: number) => void;
  analyzingDocumentId: number | null;
}

export function DocumentList({
  documents,
  onUpload,
  onAnalyze,
  analyzingDocumentId,
}: DocumentListProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [documentType, setDocumentType] = useState<DocumentType>("USER_MANUAL");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setUploading(true);
      try {
        for (const file of Array.from(files)) {
          await onUpload(file, documentType);
        }
      } finally {
        setUploading(false);
      }
    },
    [onUpload, documentType]
  );

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-accent/30"
        }`}
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

        <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm font-medium text-foreground mb-1">
          파일을 드래그하거나 클릭하여 업로드
        </p>
        <p className="text-xs text-muted-foreground mb-4">.txt 파일만 지원됩니다</p>

        <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as DocumentType)}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground"
          >
            {DOCUMENT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
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

      {/* Document list */}
      <div className="space-y-2">
        {documents.map((doc) => (
          <Card key={doc.document_id} className="group hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <span className="text-muted-foreground shrink-0 mt-0.5">
                  <FileText className="h-5 w-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium truncate text-foreground">{doc.file_name}</p>
                    <DocumentStatusBadge status={doc.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {DOCUMENT_TYPE_OPTIONS.find((o) => o.value === doc.document_type)?.label ??
                      doc.document_type}{" "}
                    · {formatDate(doc.created_at)}
                  </p>

                  {doc.status === "UPLOADED" && (
                    <div className="mt-2.5">
                      {analyzingDocumentId === doc.document_id ? (
                        <p className="text-xs text-primary flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 animate-pulse" /> AI 분석 중...
                        </p>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => onAnalyze(doc.document_id)}>
                          <Sparkles className="h-3.5 w-3.5 mr-1" /> 분석 시작
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {documents.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            아직 등록된 문서가 없습니다. 위 영역에 문서를 올려 이 공간의 Wiki를 시작하세요.
          </p>
        )}
      </div>
    </div>
  );
}
