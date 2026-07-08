import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertCircle, RotateCcw, FileText } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "@/types/llm-wiki";

interface ChatMessageProps {
  message: ChatMessageType;
  onRetry?: (question: string) => void;
}

export function ChatMessage({ message, onRetry }: ChatMessageProps) {
  const isUser = message.role === "user";

  if (message.error) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 px-3.5 py-3 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground/70" />
          <div className="flex-1 min-w-0">
            <p>{message.content}</p>
            {onRetry && message.retryQuestion && (
              <button
                onClick={() => onRetry(message.retryQuestion!)}
                className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-foreground hover:underline"
              >
                <RotateCcw className="h-3 w-3" /> 다시 시도
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

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
              ? "bg-primary text-primary-foreground rounded-tr-sm whitespace-pre-wrap"
              : "bg-card border border-border text-foreground rounded-tl-sm shadow-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-ul:my-1.5"
          }`}
        >
          {isUser ? (
            message.content
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          )}
        </div>

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-0.5">
            <span className="text-[11px] text-muted-foreground/70 self-center">출처</span>
            {message.sources.map((source) => (
              <Link
                key={source.wiki_id}
                href={`/explorer/${source.wiki_id}`}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[11px] text-foreground hover:bg-accent transition-colors"
              >
                <FileText className="h-3 w-3 text-muted-foreground" />
                {source.title}
              </Link>
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
