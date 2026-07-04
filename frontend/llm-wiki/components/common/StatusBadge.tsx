import { Badge } from "@/components/ui/badge";
import type { DocumentStatus, WikiStatus } from "@/types/llm-wiki";

const WIKI_STATUS_CONFIG: Record<WikiStatus, { label: string; className: string }> = {
  APPROVED: {
    label: "Approved",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
  },
  DRAFT: {
    label: "검수 대기",
    className:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
  },
  REJECTED: {
    label: "반려",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  },
};

export function StatusBadge({ status }: { status: WikiStatus }) {
  const config = WIKI_STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={`text-xs font-medium ${config.className}`}>
      {config.label}
    </Badge>
  );
}

const DOCUMENT_STATUS_CONFIG: Record<DocumentStatus, { label: string; className: string }> = {
  ANALYZED: {
    label: "분석 완료",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
  },
  UPLOADED: {
    label: "업로드됨",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  },
  FAILED: {
    label: "분석 실패",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  },
};

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const config = DOCUMENT_STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={`text-xs font-medium ${config.className}`}>
      {config.label}
    </Badge>
  );
}
