"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X, ChevronDown, ChevronUp, Pencil, RotateCw } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  useWikis,
  useWiki,
  useUpdateWiki,
  useApproveWiki,
  useRejectWiki,
  useRegenerateWiki,
} from "@/lib/api";
import { useActiveSpace } from "@/lib/active-space";
import { REJECTION_REASONS } from "@/types/llm-wiki";
import type { WikiStatus, WikiSummary } from "@/types/llm-wiki";

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
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [rejectComment, setRejectComment] = useState("");

  const { data: detail } = useWiki(expanded ? item.wiki_id : null);
  const updateMutation = useUpdateWiki(knowledgeSpaceId);
  const approveMutation = useApproveWiki(knowledgeSpaceId);
  const rejectMutation = useRejectWiki(knowledgeSpaceId);
  const regenerateMutation = useRegenerateWiki(knowledgeSpaceId);

  function startEdit() {
    setDraftMarkdown(detail?.markdown ?? "");
    setEditing(true);
  }

  function toggleReason(reason: string) {
    setSelectedReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
    );
  }

  function confirmReject() {
    if (selectedReasons.length === 0 || !rejectComment.trim()) return;
    rejectMutation.mutate(
      { wikiId: item.wiki_id, reasons: selectedReasons, comment: rejectComment.trim() },
      {
        onSuccess: () => {
          setRejectDialogOpen(false);
          setSelectedReasons([]);
          setRejectComment("");
        },
      }
    );
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
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-left w-full cursor-pointer"
            >
              <div className="flex items-start gap-1.5 mt-1.5">
                {expanded ? (
                  <ChevronUp className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-foreground hover:text-primary transition-colors">
                    {item.title}
                  </p>
                  {item.summary && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.summary}</p>
                  )}
                </div>
              </div>
            </button>
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
                  onClick={() => {
                    setSelectedReasons([]);
                    setRejectComment("");
                    setRejectDialogOpen(true);
                  }}
                >
                  <X className="h-3.5 w-3.5 mr-1" /> 반려
                </Button>
              </>
            )}
            {item.status === "REJECTED" && (
              <Button
                size="sm"
                variant="outline"
                className="border-purple-500 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950"
                disabled={regenerateMutation.isPending}
                onClick={() => regenerateMutation.mutate(item.wiki_id)}
              >
                <RotateCw className={`h-3.5 w-3.5 mr-1 ${regenerateMutation.isPending ? "animate-spin" : ""}`} />
                {regenerateMutation.isPending ? "재생성 중..." : "재생성"}
              </Button>
            )}
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

          {item.status === "REJECTED" && item.rejection_reasons && item.rejection_reasons.length > 0 && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg px-4 py-2.5 space-y-1">
              <p className="text-xs text-red-700 dark:text-red-400">
                반려 사유: {item.rejection_reasons.join(", ")}
              </p>
              {item.rejection_comment && (
                <p className="text-xs text-red-700/90 dark:text-red-400/90">
                  코멘트: {item.rejection_comment}
                </p>
              )}
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

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>반려 사유 선택</DialogTitle>
            <DialogDescription>이 Wiki를 반려하는 이유를 하나 이상 선택해주세요.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            {REJECTION_REASONS.map((reason) => {
              const checked = selectedReasons.includes(reason);
              return (
                <button
                  key={reason}
                  type="button"
                  onClick={() => toggleReason(reason)}
                  className={`w-full flex items-center gap-2 text-left text-sm rounded-md border px-3 py-2 transition-colors ${
                    checked
                      ? "border-primary bg-primary/5 text-primary font-medium"
                      : "border-border hover:bg-accent/40"
                  }`}
                >
                  <span
                    className={`flex items-center justify-center w-4 h-4 rounded border shrink-0 ${
                      checked ? "bg-primary border-primary" : "border-border"
                    }`}
                  >
                    {checked && <Check className="h-3 w-3 text-primary-foreground" />}
                  </span>
                  {reason}
                </button>
              );
            })}
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">코멘트</p>
            <Textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              rows={3}
              placeholder="반려 사유에 대한 구체적인 코멘트를 작성해주세요."
              className="text-sm"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              취소
            </Button>
            <Button
              disabled={selectedReasons.length === 0 || !rejectComment.trim() || rejectMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={confirmReject}
            >
              {rejectMutation.isPending ? "반려 중..." : "반려하기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

type StatusFilter = "ALL" | WikiStatus;

const STATUS_TABS: { key: StatusFilter; label: string; colorClass: string }[] = [
  { key: "ALL", label: "전체", colorClass: "text-foreground" },
  { key: "DRAFT", label: "검수 대기", colorClass: "text-amber-600 dark:text-amber-400" },
  { key: "APPROVED", label: "승인", colorClass: "text-green-600 dark:text-green-400" },
  { key: "REJECTED", label: "반려", colorClass: "text-red-600 dark:text-red-400" },
];

export default function ReviewPage() {
  const { activeSpaceId } = useActiveSpace();
  const { data: items = [], isLoading } = useWikis(activeSpaceId);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const filteredItems =
    statusFilter === "ALL" ? items : items.filter((i) => i.status === statusFilter);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI 변환 결과 · 검수</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          AI가 분석한 Wiki 내용을 검토하고 승인하세요.
        </p>
      </div>

      <div className="flex items-stretch gap-1 bg-muted rounded-xl p-1">
        {STATUS_TABS.map((tab) => {
          const active = statusFilter === tab.key;
          const count =
            tab.key === "ALL" ? items.length : items.filter((i) => i.status === tab.key).length;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm transition-colors ${
                active ? "bg-background shadow-sm" : "hover:bg-background/50"
              }`}
            >
              <span className={`text-xl font-bold ${active ? tab.colorClass : "text-muted-foreground"}`}>
                {count}
              </span>
              <span className={active ? "font-medium text-foreground" : "text-muted-foreground"}>
                {tab.label}
              </span>
            </button>
          );
        })}
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
      ) : filteredItems.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          선택한 상태의 Wiki가 없습니다.
        </p>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <ReviewCard key={item.wiki_id} item={item} knowledgeSpaceId={activeSpaceId} />
          ))}
        </div>
      )}
    </div>
  );
}
