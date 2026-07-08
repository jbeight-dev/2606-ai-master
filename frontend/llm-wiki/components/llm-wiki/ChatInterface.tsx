"use client";

import { useEffect, useRef, useState } from "react";
import { Send, MessageCircle, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/llm-wiki/ChatMessage";
import { useSendChatMessage } from "@/lib/api";
import { getOrCreateUserId } from "@/lib/user-id";
import { useActiveSpace } from "@/lib/active-space";
import type { ChatMessage as ChatMessageType } from "@/types/llm-wiki";

interface ChatInterfaceProps {
  knowledgeBased: boolean;
}

export function ChatInterface({ knowledgeBased }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const sendMutation = useSendChatMessage();
  const { activeSpaceId, activeSpace } = useActiveSpace();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sendMutation.isPending]);

  function runQuery(question: string) {
    sendMutation.mutate(
      {
        user_id: getOrCreateUserId(),
        question,
        knowledge_space_id: knowledgeBased ? activeSpaceId : null,
      },
      {
        onSuccess: (res) => {
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: res.answer ?? "답변을 생성하지 못했습니다.",
              timestamp: new Date().toISOString(),
              sources: res.sources,
            },
          ]);
        },
        onError: () => {
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: "답변을 불러오지 못했어요. 일시적인 연결 문제일 수 있습니다.",
              timestamp: new Date().toISOString(),
              error: true,
              retryQuestion: question,
            },
          ]);
        },
      }
    );
  }

  function handleSend(text?: string) {
    const question = (text ?? input).trim();
    if (!question || sendMutation.isPending) return;

    const userMsg: ChatMessageType = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    runQuery(question);
  }

  function handleRetry(question: string) {
    if (sendMutation.isPending) return;
    setMessages((prev) => {
      const idx = [...prev].reverse().findIndex((m) => m.error && m.retryQuestion === question);
      if (idx === -1) return prev;
      const removeAt = prev.length - 1 - idx;
      return prev.filter((_, i) => i !== removeAt);
    });
    runQuery(question);
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 min-h-0 px-4">
        <div className="py-4 space-y-[22px] max-w-[820px] mx-auto">
          {messages.length === 0 && (
            <div className="text-center py-14 px-4">
              <div className="w-13.5 h-13.5 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-6 w-6" />
              </div>
              <p className="font-semibold text-foreground text-lg">무엇이든 물어보세요</p>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
                등록된 Wiki를 근거로 답변합니다.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} onRetry={handleRetry} />
          ))}

          {sendMutation.isPending && (
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="px-4 pb-4 pt-2 bg-background">
        <div className="max-w-[820px] mx-auto">
          {knowledgeBased && activeSpace && (
            <div className="mb-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
              <BookOpen className="h-3 w-3" />
              {activeSpace.name} 기준
            </div>
          )}
          <div className="flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="설비 위키에 대해 물어보세요..."
              rows={1}
              disabled={sendMutation.isPending}
              className="flex-1 max-h-32"
            />
            <Button
              onClick={() => handleSend()}
              disabled={sendMutation.isPending || !input.trim()}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground/70">
            Enter 로 전송 · Shift+Enter 줄바꿈 · 답변은 Wiki 지식 기반으로 생성됩니다
          </p>
        </div>
      </div>
    </div>
  );
}
