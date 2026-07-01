export type DocumentStatus = "analyzing" | "pending_review" | "approved" | "rejected";

export type WikiCategory = "Systems" | "Screens" | "API" | "Tables" | "Glossary" | "Release";

export type SourceTagType = "Screen" | "API" | "Glossary" | "Table";

export interface Document {
  id: string;
  name: string;
  type: "PDF" | "Word" | "Excel" | "Markdown" | "HTML";
  size: number;
  uploadedAt: string;
  status: DocumentStatus;
  analysisPct?: number;
}

export interface AnalysisStep {
  id: string;
  label: string;
  status: "pending" | "in_progress" | "completed" | "failed";
}

export interface WikiNode {
  id: string;
  category: WikiCategory;
  title: string;
  parentId?: string;
  children?: WikiNode[];
  meta?: WikiNodeMeta;
  content?: WikiNodeContent;
}

export interface WikiNodeMeta {
  version: string;
  lastUpdated: string;
  status: DocumentStatus;
  relatedDocuments: string[];
}

export interface WikiNodeContent {
  summary: string;
  features?: WikiFeature[];
  apiSpec?: ApiSpec;
  tableSpec?: TableSpec;
  faqs?: WikiFaq[];
  relatedNodes?: RelatedNode[];
}

export interface WikiFeature {
  id: string;
  title: string;
  description: string;
}

export interface ApiSpec {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  description: string;
  parameters?: ApiParameter[];
  responseExample?: string;
}

export interface ApiParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface TableSpec {
  tableName: string;
  columns: TableColumn[];
  description: string;
}

export interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  description: string;
}

export interface WikiFaq {
  question: string;
  answer: string;
}

export interface RelatedNode {
  id: string;
  title: string;
  category: WikiCategory;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  timestamp: string;
}

export interface ChatSource {
  id: string;
  type: SourceTagType;
  title: string;
  nodeId: string;
}

export interface ReviewItem {
  id: string;
  documentId: string;
  documentName: string;
  nodeId: string;
  nodeTitle: string;
  category: WikiCategory;
  originalContent: string;
  aiContent: string;
  status: "pending" | "approved" | "rejected";
  reviewedAt?: string;
}
