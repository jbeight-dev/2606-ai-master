"use client";

import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useCreateQA, useUpdateQA } from "@/lib/api";
import type { QAItem } from "@/types/llm-wiki";

interface CreateQAModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  knowledgeSpaceId: number | null;
  qa?: QAItem | null;
}

export function CreateQAModal({ open, onOpenChange, knowledgeSpaceId, qa }: CreateQAModalProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const isEditing = qa != null;

  const createQA = useCreateQA(knowledgeSpaceId);
  const updateQA = useUpdateQA(knowledgeSpaceId);
  const mutation = isEditing ? updateQA : createQA;

  useEffect(() => {
    if (open) {
      setQuestion(qa?.question ?? "");
      setAnswer(qa?.answer ?? "");
    }
  }, [open, qa]);

  function handleSubmit() {
    const trimmedQuestion = question.trim();
    const trimmedAnswer = answer.trim();
    if (!trimmedQuestion || !trimmedAnswer) return;

    if (isEditing && qa) {
      updateQA.mutate(
        { qaId: qa.qa_id, input: { question: trimmedQuestion, answer: trimmedAnswer } },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createQA.mutate(
        { question: trimmedQuestion, answer: trimmedAnswer },
        {
          onSuccess: () => {
            setQuestion("");
            setAnswer("");
            onOpenChange(false);
          },
        }
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "답변 수정" : "새 답변 등록"}</DialogTitle>
          <DialogDescription>
            선택된 Knowledge Space에 등록될 질문과 답변을 입력하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">질문</label>
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="예: 설비 점검 주기는 어떻게 되나요?"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">답변</label>
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="질문에 대한 답변을 입력하세요"
              rows={6}
            />
          </div>
          {mutation.isError && (
            <p className="text-xs text-destructive">
              {mutation.error instanceof Error
                ? mutation.error.message
                : "저장하지 못했습니다."}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!question.trim() || !answer.trim() || mutation.isPending}
          >
            {mutation.isPending ? "저장 중..." : isEditing ? "저장" : "등록"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
