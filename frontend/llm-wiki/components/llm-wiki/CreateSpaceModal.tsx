"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateKnowledgeSpace } from "@/lib/api";
import { useActiveSpace } from "@/lib/active-space";

interface CreateSpaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSpaceModal({ open, onOpenChange }: CreateSpaceModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const createSpace = useCreateKnowledgeSpace();
  const { setActiveSpaceId } = useActiveSpace();

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    createSpace.mutate(
      { name: trimmed, description: description.trim() || undefined },
      {
        onSuccess: (space) => {
          setActiveSpaceId(space.knowledge_space_id);
          setName("");
          setDescription("");
          onOpenChange(false);
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 Knowledge Space</DialogTitle>
          <DialogDescription>
            지식을 담을 공간을 만듭니다. 문서는 이 공간에 등록됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">이름</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 반도체 설비관리"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">한 줄 설명</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="이 공간에 담길 지식을 한 줄로 설명하세요"
            />
          </div>
          {createSpace.isError && (
            <p className="text-xs text-destructive">
              {createSpace.error instanceof Error
                ? createSpace.error.message
                : "Knowledge Space를 만들지 못했습니다."}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || createSpace.isPending}
          >
            {createSpace.isPending ? "만드는 중..." : "만들기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
