"use client";

import { useState } from "react";
import { ChatInterface } from "@/components/llm-wiki/ChatInterface";

export default function AssistantPage() {
  const [knowledgeBased, setKnowledgeBased] = useState(true);

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-2 border-b border-border bg-muted/30 flex justify-end">
        <button
          onClick={() => setKnowledgeBased((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-full text-xs font-medium px-3 py-1.5 transition-colors ${
            knowledgeBased
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
          title="지식 기반 답변을 켜거나 끕니다"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              knowledgeBased ? "bg-primary" : "bg-muted-foreground/50"
            }`}
          />
          지식 기반 답변 · {knowledgeBased ? "ON" : "OFF"}
        </button>
      </div>
      <div className="flex-1 min-h-0 bg-muted/10">
        <ChatInterface knowledgeBased={knowledgeBased} />
      </div>
    </div>
  );
}
