"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateKnowledgeSpace, useKnowledgeSpaces } from "@/lib/api";
import { useActiveSpace } from "@/lib/active-space";

export default function NewSpacePage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { data: spaces = [] } = useKnowledgeSpaces();
  const createSpace = useCreateKnowledgeSpace();
  const { setActiveSpaceId } = useActiveSpace();
  const router = useRouter();

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    createSpace.mutate(
      { name: trimmed, description: description.trim() || undefined },
      {
        onSuccess: (space) => {
          setActiveSpaceId(space.id);
          router.replace("/register");
        },
      }
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-7">
          <div className="w-15 h-15 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <Boxes className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Knowledge Space 등록</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mt-2 leading-relaxed">
            지식을 담을 공간을 먼저 만듭니다. <br />이후 Wiki 생성/탐색은 이 공간을
            기준으로 이루어집니다.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
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
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="이 공간에 담길 지식을 한 줄로 설명하세요"
              rows={3}
            />
          </div>
          {createSpace.isError && (
            <p className="text-xs text-destructive">
              {createSpace.error instanceof Error
                ? createSpace.error.message
                : "Knowledge Space를 만들지 못했습니다."}
            </p>
          )}

          <div className="flex justify-end gap-2 mt-2">
            {spaces.length > 0 && (
              <Button variant="outline" onClick={() => router.back()}>
                취소
              </Button>
            )}
            <Button onClick={handleCreate} disabled={!name.trim() || createSpace.isPending}>
              {createSpace.isPending ? "만드는 중..." : "만들기"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
