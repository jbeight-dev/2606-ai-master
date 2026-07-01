import Link from "next/link";
import type { SourceTagType } from "@/types/llm-wiki";

interface SourceTagProps {
  type: SourceTagType;
  title: string;
  nodeId: string;
}

const TAG_CONFIG: Record<SourceTagType, { bg: string; text: string; prefix: string }> = {
  Screen: {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-700 dark:text-purple-400",
    prefix: "Screen",
  },
  API: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
    prefix: "API",
  },
  Glossary: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
    prefix: "Glossary",
  },
  Table: {
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-400",
    prefix: "Table",
  },
};

export function SourceTag({ type, title, nodeId }: SourceTagProps) {
  const config = TAG_CONFIG[type];
  return (
    <Link href={`/explorer/${nodeId}`}>
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text} hover:opacity-80 transition-opacity cursor-pointer`}
      >
        <span className="opacity-60">[{config.prefix}]</span>
        {title}
      </span>
    </Link>
  );
}
