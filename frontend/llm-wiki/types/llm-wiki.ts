// Knowledge Space

export type KnowledgeSpaceStatus = "ACTIVE" | "INACTIVE";

export interface KnowledgeSpace {
  id: number;
  name: string;
  description?: string | null;
  status: KnowledgeSpaceStatus;
  created_at?: string;
}

// Document

export type DocumentType = "USER_MANUAL" | "ERD" | "DATA_CATALOG" | "GLOSSARY" | "UNKNOWN";
export type DocumentStatus = "UPLOADED" | "ANALYZED" | "FAILED";

export interface Document {
  document_id: number;
  file_name: string;
  document_type: DocumentType;
  status: DocumentStatus;
  analysis_elapsed_ms?: number | null;
  created_at?: string;
}

export interface AnalyzeResult {
  document_id: number;
  status: string;
  wiki_count: number;
  embedding_count: number;
  elapsed_ms: number;
}

// UI-only: purely cosmetic step animation shown while the single blocking
// analyze request is in flight. Not backed by any server-side progress state.
export interface SimulatedAnalysisStep {
  id: string;
  label: string;
  status: "pending" | "in_progress" | "completed";
}

// Wiki

export type WikiStatus = "DRAFT" | "APPROVED" | "REJECTED";

export const REJECTION_REASONS = [
  "핵심 내용 누락",
  "사실 오류",
  "구조 부적절",
  "너무 요약됨",
  "불필요한 내용 포함",
  "문서 유형 오분류",
  "그 외 사유",
] as const;

export type RejectionReason = (typeof REJECTION_REASONS)[number];

export interface WikiSummary {
  wiki_id: number;
  title: string;
  summary?: string | null;
  status: WikiStatus;
  version: number;
  tags: string[];
  rejection_reasons?: string[];
  rejection_comment?: string | null;
}

export interface Wiki extends WikiSummary {
  knowledge_space_id: number;
  document_id: number;
  markdown: string;
  created_at?: string;
  updated_at?: string;
}

export interface UpdateWikiInput {
  title: string;
  summary?: string;
  markdown: string;
}

// QA (답변관리)

export interface QAItem {
  qa_id: number;
  question: string;
  answer: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateQAInput {
  question: string;
  answer: string;
}

export interface UpdateQAInput {
  question: string;
  answer: string;
}

// Assistant chat (assistant-service, separate from wiki-builder-service)

export interface ChatRequest {
  user_id: string;
  question: string;
  knowledge_space_id?: number | null;
}

export interface WikiSource {
  wiki_id: number;
  title: string;
  similarity_score: number;
}

export interface ChatResponse {
  success: boolean;
  intent?: string | null;
  rewritten_query?: string | null;
  answer?: string | null;
  sources?: WikiSource[];
  elapsed_ms?: number | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  error?: boolean;
  sources?: WikiSource[];
  retryQuestion?: string;
}

// Errors

export interface ApiErrorBody {
  success: false;
  message: string;
  detail?: unknown;
}
