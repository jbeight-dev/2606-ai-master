"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  useWikis,
  useWiki,
  useUpdateWiki,
  useApproveWiki,
  useRejectWiki,
} from "@/lib/api";
import { useActiveSpace } from "@/lib/active-space";
import type { WikiSummary } from "@/types/llm-wiki";

function ReviewCard({
  item,
  knowledgeSpaceId,
}: {
  item: WikiSummary;
  knowledgeSpaceId: number | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftMarkdown, setDraftMarkdown] = useState("");

  const { data: detail } = useWiki(expanded ? item.wiki_id : null);
  const updateMutation = useUpdateWiki(knowledgeSpaceId);
  const approveMutation = useApproveWiki(knowledgeSpaceId);
  const rejectMutation = useRejectWiki(knowledgeSpaceId);

  function startEdit() {
    setDraftMarkdown(detail?.markdown ?? "");
    setEditing(true);
  }

  function saveEdit() {
    if (!detail) return;
    updateMutation.mutate(
      { wikiId: item.wiki_id, input: { title: detail.title, summary: detail.summary ?? undefined, markdown: draftMarkdown } },
      { onSuccess: () => setEditing(false) }
    );
  }

  return (
    <Card
      className={
        item.status === "APPROVED"
          ? "border-green-200 dark:border-green-900"
          : item.status === "REJECTED"
          ? "border-red-200 dark:border-red-900"
          : ""
      }
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={item.status} />
              {item.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
            <p className="font-semibold text-foreground mt-1.5">{item.title}</p>
            {item.summary && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.summary}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {item.status === "DRAFT" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                  onClick={() => approveMutation.mutate(item.wiki_id)}
                >
                  <Check className="h-3.5 w-3.5 mr-1" /> 승인
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                  onClick={() => rejectMutation.mutate(item.wiki_id)}
                >
                  <X className="h-3.5 w-3.5 mr-1" /> 반려
                </Button>
              </>
            )}
            <Button size="sm" variant="ghost" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-3">
          {item.status === "APPROVED" && (
            <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg px-4 py-2.5">
              <p className="text-xs text-green-700 dark:text-green-400">
                Version {item.version} · Approved — 이제 AI Assistant가 이 내용을 참조합니다.
              </p>
              <Link href="/assistant" className="text-xs font-medium text-green-700 dark:text-green-400 hover:underline">
                Assistant에서 확인 →
              </Link>
            </div>
          )}

          {!detail ? (
            <div className="h-24 rounded-md bg-muted animate-pulse" />
          ) : editing ? (
            <div className="space-y-2">
              <Textarea
                value={draftMarkdown}
                onChange={(e) => setDraftMarkdown(e.target.value)}
                rows={10}
                className="font-mono text-xs"
              />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                  취소
                </Button>
                <Button size="sm" onClick={saveEdit} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "저장 중..." : "저장"}
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">AI 생성 결과</p>
                <Button size="sm" variant="ghost" onClick={startEdit}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> 수정
                </Button>
              </div>
              <pre className="p-3 rounded-md bg-muted/50 text-xs text-foreground whitespace-pre-wrap font-mono max-h-80 overflow-y-auto">
                {detail.markdown}
              </pre>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function ReviewPage() {
  const { activeSpaceId } = useActiveSpace();
  const { data: items = [], isLoading } = useWikis(activeSpaceId);

  const stats = [
    { label: "전체", value: items.length },
    { label: "검수 대기", value: items.filter((i) => i.status === "DRAFT").length },
    { label: "승인", value: items.filter((i) => i.status === "APPROVED").length },
    { label: "반려", value: items.filter((i) => i.status === "REJECTED").length },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI 변환 결과 · 검수</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          AI가 분석한 Wiki 내용을 검토하고 승인하세요.
        </p>
      </div>

      <div className="flex gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="flex-1">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          아직 검수할 Wiki가 없습니다. 문서를 등록하고 분석을 완료하면 이곳에 나타납니다.
        </p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <ReviewCard key={item.wiki_id} item={item} knowledgeSpaceId={activeSpaceId} />
          ))}
        </div>
      )}
    </div>
  );
}
