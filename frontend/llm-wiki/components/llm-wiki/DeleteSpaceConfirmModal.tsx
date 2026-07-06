"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useDeleteKnowledgeSpace } from "@/lib/api";
import type { KnowledgeSpace } from "@/types/llm-wiki";

interface DeleteSpaceConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  space: KnowledgeSpace | null;
}

export function DeleteSpaceConfirmModal({ open, onOpenChange, space }: DeleteSpaceConfirmModalProps) {
  const deleteSpace = useDeleteKnowledgeSpace();

  const handleConfirmDelete = () => {
    if (!space) return;
    deleteSpace.mutate(space.knowledge_space_id, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>Knowledge Space 삭제</DialogTitle>
              <DialogDescription>이 작업은 되돌릴 수 없습니다</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="space-y-3 py-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{space?.name}</span>를 삭제하시겠습니까?
          </p>
          <div className="rounded-md bg-muted/50 p-3 border border-border">
            <p className="text-sm text-muted-foreground">
              이 스페이스는 시스템에서 비활성화되며, 관련된 모든 문서와 위키 정보는 유지됩니다.
            </p>
          </div>
        </div>

        {/* Error message if mutation fails */}
        {deleteSpace.isError && (
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30">
            <p className="text-sm text-destructive">
              {deleteSpace.error instanceof Error
                ? deleteSpace.error.message
                : "삭제 중 오류가 발생했습니다"}
            </p>
          </div>
        )}

        {/* Footer */}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteSpace.isPending}
          >
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirmDelete}
            disabled={deleteSpace.isPending}
          >
            {deleteSpace.isPending ? "삭제하는 중..." : "삭제"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
