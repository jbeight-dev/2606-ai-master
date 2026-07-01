"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/llm-wiki/ChatMessage";
import { sendChatMessage, INITIAL_CHAT_MESSAGES } from "@/lib/mock-api";
import type { ChatMessage as ChatMessageType } from "@/types/llm-wiki";

const QUICK_PROMPTS = [
  "주문 생성 API는 어떻게 되나요?",
  "orders 테이블 구조를 알려주세요",
  "주문 상태 전환 흐름을 설명해줘",
  "결제 관련 API 목록 보여줘",
];

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessageType[]>(INITIAL_CHAT_MESSAGES);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userMsg: ChatMessageType = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const reply = await sendChatMessage(content);
      setMessages((prev) => [...prev, reply]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <ScrollArea className="flex-1 px-4">
        <div className="py-4 space-y-4">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Quick prompts */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-none">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => handleSend(prompt)}
            disabled={loading}
            className="shrink-0 px-3 py-1.5 rounded-full border border-border text-xs text-muted-foreground bg-background hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 flex gap-2 border-t border-border bg-background">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Wiki에 대해 자유롭게 질문하세요..."
          disabled={loading}
          className="flex-1"
        />
        <Button onClick={() => handleSend()} disabled={loading || !input.trim()} size="icon">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
