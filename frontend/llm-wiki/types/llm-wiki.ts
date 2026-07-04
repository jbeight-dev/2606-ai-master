// Knowledge Space

export type KnowledgeSpaceStatus = "ACTIVE" | "INACTIVE";

export interface KnowledgeSpace {
  knowledge_space_id: number;
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

export interface WikiSummary {
  wiki_id: number;
  title: string;
  summary?: string | null;
  status: WikiStatus;
  version: number;
  tags: string[];
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

// Assistant chat (assistant-service, separate from wiki-builder-service)

export interface ChatRequest {
  user_id: string;
  question: string;
}

export interface ChatResponse {
  success: boolean;
  intent?: string | null;
  rewritten_query?: string | null;
  answer?: string | null;
  elapsed_ms?: number | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  error?: boolean;
}

// Errors

export interface ApiErrorBody {
  success: false;
  message: string;
  detail?: unknown;
}
