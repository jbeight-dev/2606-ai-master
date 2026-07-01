import { ChatInterface } from "@/components/llm-wiki/ChatInterface";

export default function AssistantPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border">
        <h1 className="text-xl font-bold text-foreground">AI Assistant</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Wiki 기반으로 시스템, API, 테이블에 대한 질문에 답변합니다.
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <ChatInterface />
      </div>
    </div>
  );
}
