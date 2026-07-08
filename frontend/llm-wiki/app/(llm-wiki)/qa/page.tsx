"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateQAModal } from "@/components/llm-wiki/CreateQAModal";
import { useQAs, useDeleteQA } from "@/lib/api";
import { useActiveSpace } from "@/lib/active-space";
import type { QAItem } from "@/types/llm-wiki";

export default function QAPage() {
  const { activeSpaceId } = useActiveSpace();
  const { data: items = [], isLoading } = useQAs(activeSpaceId);
  const deleteQA = useDeleteQA(activeSpaceId);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingQA, setEditingQA] = useState<QAItem | null>(null);
  const [deletingQA, setDeletingQA] = useState<QAItem | null>(null);

  function openCreateModal() {
    setEditingQA(null);
    setModalOpen(true);
  }

  function openEditModal(qa: QAItem) {
    setEditingQA(qa);
    setModalOpen(true);
  }

  function handleConfirmDelete() {
    if (!deletingQA) return;
    deleteQA.mutate(deletingQA.qa_id, { onSuccess: () => setDeletingQA(null) });
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">답변관리</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            선택된 Knowledge Space의 질문과 답변을 조회하고 등록/수정합니다.
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4" /> 새 답변 등록
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          등록된 답변이 없습니다. "새 답변 등록"으로 질문과 답변을 추가해보세요.
        </p>
      ) : (
        <div className="space-y-4">
          {items.map((qa) => (
            <Card key={qa.qa_id}>
              <CardContent className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{qa.question}</p>
                  <p className="text-sm text-muted-foreground mt-1.5 whitespace-pre-wrap">
                    {qa.answer}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon-sm" variant="ghost" onClick={() => openEditModal(qa)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon-sm" variant="ghost" onClick={() => setDeletingQA(qa)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateQAModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        knowledgeSpaceId={activeSpaceId}
        qa={editingQA}
      />

      <Dialog open={deletingQA != null} onOpenChange={(open) => !open && setDeletingQA(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>답변 삭제</DialogTitle>
            <DialogDescription>이 작업은 되돌릴 수 없습니다.</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            <span className="font-semibold text-foreground">{deletingQA?.question}</span> 항목을
            삭제하시겠습니까?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingQA(null)} disabled={deleteQA.isPending}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleteQA.isPending}>
              {deleteQA.isPending ? "삭제하는 중..." : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
