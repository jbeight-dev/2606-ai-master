import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/StatusBadge";
import type { Wiki } from "@/types/llm-wiki";

function formatDate(iso?: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface WikiDetailProps {
  wiki: Wiki;
  crumb: string;
}

export function WikiDetail({ wiki, crumb }: WikiDetailProps) {
  const meta = [
    { k: "상태", v: wiki.status },
    { k: "버전", v: `v${wiki.version}` },
    { k: "태그 수", v: `${wiki.tags.length}개` },
    { k: "최종 수정", v: formatDate(wiki.updated_at) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs text-muted-foreground mb-2">{crumb}</p>
        <div className="flex items-start gap-3">
          <h1 className="text-2xl font-bold text-foreground">{wiki.title}</h1>
          <StatusBadge status={wiki.status} />
        </div>
        {wiki.summary && <p className="text-sm text-muted-foreground mt-2">{wiki.summary}</p>}
      </div>

      {wiki.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {wiki.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              #{tag}
            </Badge>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-6 gap-y-1 border border-border rounded-lg px-4 py-3">
        {meta.map((m) => (
          <div key={m.k} className="flex justify-between gap-3 py-1.5 border-b border-border/60 text-sm last:border-0">
            <span className="text-muted-foreground">{m.k}</span>
            <span className="font-medium text-foreground">{m.v}</span>
          </div>
        ))}
      </div>

      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{wiki.markdown}</ReactMarkdown>
      </div>
    </div>
  );
}
