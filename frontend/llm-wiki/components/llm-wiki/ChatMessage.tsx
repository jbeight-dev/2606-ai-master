import { SourceTag } from "@/components/common/SourceTag";
import type { ChatMessage as ChatMessageType } from "@/types/llm-wiki";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        {!isUser && (
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <span className="text-xs text-primary-foreground font-bold">AI</span>
            </div>
            <span className="text-xs text-muted-foreground">Assistant</span>
          </div>
        )}

        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-card border border-border text-foreground rounded-tl-sm shadow-sm"
          }`}
        >
          {message.content}
        </div>

        {message.sources?.length && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {message.sources.map((src) => (
              <SourceTag
                key={src.id}
                type={src.type}
                title={src.title}
                nodeId={src.nodeId}
              />
            ))}
          </div>
        )}

        <span className="text-xs text-muted-foreground">
          {new Date(message.timestamp).toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}
