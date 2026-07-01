"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentList } from "@/components/llm-wiki/DocumentList";
import { AnalysisProgress } from "@/components/llm-wiki/AnalysisProgress";
import { fetchDocuments, uploadDocument, ANALYSIS_STEPS } from "@/lib/mock-api";
import type { Document } from "@/types/llm-wiki";

export default function RegisterPage() {
  const queryClient = useQueryClient();
  const [newDocs, setNewDocs] = useState<Document[]>([]);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: fetchDocuments,
  });

  const uploadMutation = useMutation({
    mutationFn: uploadDocument,
    onSuccess: (doc) => {
      setNewDocs((prev) => [doc, ...prev]);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const allDocs = [...newDocs, ...documents.filter((d) => !newDocs.some((n) => n.id === d.id))];
  const analyzingDoc = allDocs.find((d) => d.status === "analyzing");

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">문서 등록</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          분석할 문서를 업로드하면 AI가 자동으로 Wiki 노드를 생성합니다.
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
              documents={allDocs}
              onUpload={(file) => uploadMutation.mutateAsync(file).then(() => {})}
            />
          )}
        </div>

        <div className="space-y-4">
          {analyzingDoc && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">AI 분석 진행 중</CardTitle>
                <p className="text-xs text-muted-foreground truncate">{analyzingDoc.name}</p>
              </CardHeader>
              <CardContent>
                <AnalysisProgress steps={ANALYSIS_STEPS} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">업로드 가이드</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>• PDF, Word, Excel, Markdown, HTML 형식 지원</p>
              <p>• 파일당 최대 50MB</p>
              <p>• 업로드 후 AI가 자동으로 내용을 분석하여 Wiki 노드를 생성합니다</p>
              <p>• 분석 완료 후 검수 페이지에서 내용을 확인하고 승인할 수 있습니다</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
