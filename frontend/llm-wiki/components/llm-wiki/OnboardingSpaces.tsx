"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Boxes } from "lucide-react";
import { useKnowledgeSpaces } from "@/lib/api";
import { useActiveSpace } from "@/lib/active-space";
import { CreateSpaceModal } from "@/components/llm-wiki/CreateSpaceModal";

export function OnboardingSpaces() {
  const { data: spaces = [], isLoading } = useKnowledgeSpaces();
  const { setActiveSpaceId } = useActiveSpace();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  function selectSpace(id: number) {
    setActiveSpaceId(id);
    router.push("/register");
  }

  return (
    <div className="max-w-3xl mx-auto pt-4">
      <div className="text-center mb-7">
        <div className="w-15 h-15 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
          <Boxes className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Knowledge Space를 먼저 만드세요</h1>
        <p className="text-muted-foreground text-sm max-w-md mx-auto mt-2 leading-relaxed">
          문서를 등록하기 전에, 지식을 담을 공간을 먼저 정합니다. 이후 등록·변환·탐색은 이 공간을
          기준으로 이루어집니다.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {spaces.map((space) => (
            <button
              key={space.knowledge_space_id}
              onClick={() => selectSpace(space.knowledge_space_id)}
              className="text-left bg-card border border-border rounded-2xl p-5 flex gap-3.5 items-start hover:shadow-md transition-shadow"
            >
              <div className="w-10.5 h-10.5 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-semibold shrink-0">
                {space.name.trim().charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{space.name}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {space.description || "설명 없음"}
                </p>
              </div>
            </button>
          ))}

          <button
            onClick={() => setCreateOpen(true)}
            className="border-1.5 border-dashed border-border rounded-2xl p-5 flex gap-3.5 items-center hover:border-primary/50 hover:bg-accent/30 transition-colors"
          >
            <div className="w-10.5 h-10.5 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Plus className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-foreground">새 Knowledge Space</p>
              <p className="text-xs text-muted-foreground mt-1">
                이름과 한 줄 설명을 입력해 시작하세요
              </p>
            </div>
          </button>
        </div>
      )}

      <CreateSpaceModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
