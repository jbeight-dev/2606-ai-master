"use client";

import { useEffect, useRef, useState } from "react";
import { Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/llm-wiki/ChatMessage";
import { useSendChatMessage } from "@/lib/api";
import { getOrCreateUserId } from "@/lib/user-id";
import { useActiveSpace } from "@/lib/active-space";
import type { ChatMessage as ChatMessageType } from "@/types/llm-wiki";

const SUGGESTIONS = [
  "설비조회 화면은 어떤 API를 사용하나요?",
  "LOT이 무엇인가요?",
  "Yield는 어디서 확인하나요?",
];

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const sendMutation = useSendChatMessage();
  const { activeSpaceId } = useActiveSpace();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sendMutation.isPending]);

  async function handleSend(text?: string) {
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

    sendMutation.mutate(
      { user_id: getOrCreateUserId(), question, knowledge_space_id: activeSpaceId },
      {
        onSuccess: (res) => {
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: res.answer ?? "답변을 생성하지 못했습니다.",
              timestamp: new Date().toISOString(),
            },
          ]);
        },
        onError: () => {
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: "답변을 가져오지 못했습니다. 잠시 후 다시 시도해주세요.",
              timestamp: new Date().toISOString(),
              error: true,
            },
          ]);
        },
      }
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 min-h-0 px-4">
        <div className="py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-14 px-4">
              <div className="w-13.5 h-13.5 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-6 w-6" />
              </div>
              <p className="font-semibold text-foreground text-lg">무엇이든 물어보세요</p>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
                등록된 Wiki를 근거로 답변합니다.
              </p>
              <div className="flex flex-col gap-2 max-w-md mx-auto mt-6">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="text-left bg-card border border-border rounded-lg px-4 py-2.5 text-sm text-foreground hover:bg-accent/40 transition-colors"
                  >
                    ↗ {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
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

      {messages.length > 0 && (
        <div className="px-4 py-2 flex gap-2 overflow-x-auto">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleSend(s)}
              disabled={sendMutation.isPending}
              className="shrink-0 px-3 py-1.5 rounded-full border border-border text-xs text-muted-foreground bg-background hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="px-4 pb-4 pt-2 flex gap-2 items-end border-t border-border bg-background">
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
    </div>
  );
}
