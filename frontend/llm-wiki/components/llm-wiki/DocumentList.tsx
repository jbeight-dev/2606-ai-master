"use client";

import { useCallback, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import type { Document } from "@/types/llm-wiki";

const FILE_TYPE_ICON: Record<Document["type"], string> = {
  PDF: "📄",
  Word: "📝",
  Excel: "📊",
  Markdown: "📋",
  HTML: "🌐",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface DocumentListProps {
  documents: Document[];
  onUpload?: (file: File) => Promise<void>;
}

export function DocumentList({ documents, onUpload }: DocumentListProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length || !onUpload) return;
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

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-accent/30"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm font-medium text-foreground mb-1">
          파일을 드래그하거나 클릭하여 업로드
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          PDF, Word, Excel, Markdown, HTML 지원
        </p>
        <label>
          <input
            type="file"
            className="hidden"
            multiple
            accept=".pdf,.docx,.xlsx,.md,.html"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button variant="outline" size="sm" disabled={uploading} type="button">
            {uploading ? "업로드 중..." : "파일 선택"}
          </Button>
        </label>
      </div>

      {/* Document list */}
      <div className="space-y-2">
        {documents.map((doc) => (
          <Card key={doc.id} className="group hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">{FILE_TYPE_ICON[doc.type]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium truncate text-foreground">{doc.name}</p>
                    <StatusBadge status={doc.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatBytes(doc.size)} · {formatDate(doc.uploadedAt)}
                  </p>
                  {doc.status === "analyzing" && doc.analysisPct !== undefined && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>AI 분석 중...</span>
                        <span>{doc.analysisPct}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${doc.analysisPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
