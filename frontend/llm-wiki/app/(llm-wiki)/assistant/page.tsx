"use client";

import { ChatInterface } from "@/components/llm-wiki/ChatInterface";

export default function AssistantPage() {
  return (
    <div className="flex flex-col h-full bg-muted/10">
      <ChatInterface knowledgeBased />
    </div>
  );
}
