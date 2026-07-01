"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/common/StatusBadge";
import { fetchReviewItems, approveReviewItem, rejectReviewItem } from "@/lib/mock-api";
import type { ReviewItem } from "@/types/llm-wiki";

function ReviewCard({ item, onApprove, onReject }: {
  item: ReviewItem;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className={`transition-shadow hover:shadow-md ${
      item.status === "approved" ? "border-green-200 dark:border-green-900" :
      item.status === "rejected" ? "border-red-200 dark:border-red-900" : ""
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">{item.category}</Badge>
              {item.status !== "pending" && (
                <StatusBadge status={item.status === "approved" ? "approved" : "rejected"} />
              )}
            </div>
            <p className="font-semibold text-foreground mt-1">{item.nodeTitle}</p>
            <p className="text-xs text-muted-foreground mt-0.5">출처: {item.documentName}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {item.status === "pending" && (
              <>
                <Button size="sm" variant="outline" className="border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950" onClick={onApprove}>
                  <Check className="h-3.5 w-3.5 mr-1" /> 승인
                </Button>
                <Button size="sm" variant="outline" className="border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950" onClick={onReject}>
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
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">원문</p>
              <div className="p-3 rounded-md bg-muted/50 text-sm text-muted-foreground">
                {item.originalContent}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-2">AI 변환 결과</p>
              <div className="p-3 rounded-md bg-primary/5 border border-primary/20 text-sm text-foreground">
                {item.aiContent}
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function ReviewPage() {
  const queryClient = useQueryClient();
  const [localStatuses, setLocalStatuses] = useState<Record<string, "approved" | "rejected">>({});

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["review-items"],
    queryFn: fetchReviewItems,
  });

  const approveMutation = useMutation({
    mutationFn: approveReviewItem,
    onSuccess: (_, id) => {
      setLocalStatuses((prev) => ({ ...prev, [id]: "approved" }));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: rejectReviewItem,
    onSuccess: (_, id) => {
      setLocalStatuses((prev) => ({ ...prev, [id]: "rejected" }));
    },
  });

  const displayItems = items.map((item) => ({
    ...item,
    status: (localStatuses[item.id] ?? item.status) as ReviewItem["status"],
  }));

  const pending = displayItems.filter((i) => i.status === "pending").length;
  const approved = displayItems.filter((i) => i.status === "approved").length;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI 변환 결과 검수</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            AI가 분석한 Wiki 노드 내용을 검토하고 승인하세요.
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <div className="text-center">
            <p className="font-bold text-amber-600">{pending}</p>
            <p className="text-xs text-muted-foreground">대기</p>
          </div>
          <Separator orientation="vertical" className="h-8" />
          <div className="text-center">
            <p className="font-bold text-green-600">{approved}</p>
            <p className="text-xs text-muted-foreground">승인</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {displayItems.map((item) => (
            <ReviewCard
              key={item.id}
              item={item}
              onApprove={() => approveMutation.mutate(item.id)}
              onReject={() => rejectMutation.mutate(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
