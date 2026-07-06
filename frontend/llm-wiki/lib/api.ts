import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AnalyzeResult,
  ApiErrorBody,
  ChatRequest,
  ChatResponse,
  Document,
  DocumentType,
  KnowledgeSpace,
  UpdateWikiInput,
  Wiki,
  WikiSummary,
} from "@/types/llm-wiki";
import { useActiveSpace } from "@/lib/active-space";

const WIKI_API_BASE =
  process.env.NEXT_PUBLIC_WIKI_API_BASE_URL ?? "http://localhost:8000";
const ASSISTANT_API_BASE =
  process.env.NEXT_PUBLIC_ASSISTANT_API_BASE_URL ?? "http://localhost:8001";

export class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

async function request<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...(init?.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiRequestError(
      body?.message ?? `요청에 실패했습니다. (${res.status})`,
      res.status
    );
  }

  return res.json() as Promise<T>;
}

const wiki = <T>(path: string, init?: RequestInit) => request<T>(WIKI_API_BASE, path, init);
const assistant = <T>(path: string, init?: RequestInit) =>
  request<T>(ASSISTANT_API_BASE, path, init);

// ─── Knowledge Spaces ───────────────────────────────────────────────────────

export function createKnowledgeSpace(input: { name: string; description?: string }) {
  return wiki<KnowledgeSpace & { knowledge_space_id: number }>("/api/v1/knowledge-spaces", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listKnowledgeSpaces() {
  return wiki<{ items: KnowledgeSpace[] }>("/api/v1/knowledge-spaces").then((r) => r.items);
}

export function deleteKnowledgeSpace(knowledgeSpaceId: number) {
  return wiki<{ success: boolean }>(`/api/v1/knowledge-spaces/${knowledgeSpaceId}`, {
    method: "DELETE",
  });
}

// ─── Documents ──────────────────────────────────────────────────────────────

export function uploadDocument(
  knowledgeSpaceId: number,
  file: File,
  documentType: DocumentType = "UNKNOWN"
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("document_type", documentType);
  return wiki<Document>(`/api/v1/knowledge-spaces/${knowledgeSpaceId}/documents`, {
    method: "POST",
    body: formData,
  });
}

export function listDocuments(knowledgeSpaceId: number) {
  return wiki<{ items: Document[] }>(
    `/api/v1/knowledge-spaces/${knowledgeSpaceId}/documents`
  ).then((r) => r.items);
}

export function analyzeDocument(documentId: number) {
  return wiki<AnalyzeResult>(`/api/v1/documents/${documentId}/analyze`, {
    method: "POST",
  });
}

// ─── Wikis ──────────────────────────────────────────────────────────────────

export function listWikis(knowledgeSpaceId: number) {
  return wiki<{ items: WikiSummary[] }>(
    `/api/v1/knowledge-spaces/${knowledgeSpaceId}/wikis`
  ).then((r) => r.items);
}

export function getWiki(wikiId: number) {
  return wiki<Wiki>(`/api/v1/wikis/${wikiId}`);
}

export function updateWiki(wikiId: number, input: UpdateWikiInput) {
  return wiki<{ wiki_id: number; title: string; status: string; version: number }>(
    `/api/v1/wikis/${wikiId}`,
    { method: "PUT", body: JSON.stringify(input) }
  );
}

export function approveWiki(wikiId: number) {
  return wiki<{ wiki_id: number; status: string }>(`/api/v1/wikis/${wikiId}/approve`, {
    method: "POST",
  });
}

export function rejectWiki(wikiId: number) {
  return wiki<{ wiki_id: number; status: string }>(`/api/v1/wikis/${wikiId}/reject`, {
    method: "POST",
  });
}

// ─── Assistant chat ─────────────────────────────────────────────────────────

export function sendChatMessage(input: ChatRequest) {
  return assistant<ChatResponse>("/api/v1/chat", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ─── Query hooks ────────────────────────────────────────────────────────────

export function useKnowledgeSpaces() {
  return useQuery({ queryKey: ["knowledge-spaces"], queryFn: listKnowledgeSpaces });
}

export function useCreateKnowledgeSpace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createKnowledgeSpace,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["knowledge-spaces"] }),
  });
}

export function useDeleteKnowledgeSpace() {
  const queryClient = useQueryClient();
  const { activeSpaceId, setActiveSpaceId } = useActiveSpace();
  return useMutation({
    mutationFn: deleteKnowledgeSpace,
    onSuccess: (_, deletedSpaceId) => {
      if (deletedSpaceId === activeSpaceId) {
        setActiveSpaceId(null);
      }
      queryClient.invalidateQueries({ queryKey: ["knowledge-spaces"] });
    },
  });
}

export function useDocuments(knowledgeSpaceId: number | null) {
  return useQuery({
    queryKey: ["documents", knowledgeSpaceId],
    queryFn: () => listDocuments(knowledgeSpaceId as number),
    enabled: knowledgeSpaceId != null,
  });
}

export function useUploadDocument(knowledgeSpaceId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, documentType }: { file: File; documentType?: DocumentType }) =>
      uploadDocument(knowledgeSpaceId as number, file, documentType),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["documents", knowledgeSpaceId] }),
  });
}

export function useAnalyzeDocument(knowledgeSpaceId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: number) => analyzeDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", knowledgeSpaceId] });
      queryClient.invalidateQueries({ queryKey: ["wikis", knowledgeSpaceId] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", knowledgeSpaceId] });
    },
  });
}

export function useWikis(knowledgeSpaceId: number | null) {
  return useQuery({
    queryKey: ["wikis", knowledgeSpaceId],
    queryFn: () => listWikis(knowledgeSpaceId as number),
    enabled: knowledgeSpaceId != null,
  });
}

// The wiki list endpoint doesn't include document_id, so grouping wikis by
// their source document's type requires fetching each wiki's full detail.
export function useWikiDetails(wikiIds: number[]) {
  return useQueries({
    queries: wikiIds.map((id) => ({
      queryKey: ["wiki", id],
      queryFn: () => getWiki(id),
    })),
  });
}

export function useWiki(wikiId: number | null) {
  return useQuery({
    queryKey: ["wiki", wikiId],
    queryFn: () => getWiki(wikiId as number),
    enabled: wikiId != null,
  });
}

export function useUpdateWiki(knowledgeSpaceId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ wikiId, input }: { wikiId: number; input: UpdateWikiInput }) =>
      updateWiki(wikiId, input),
    onSuccess: (_, { wikiId }) => {
      queryClient.invalidateQueries({ queryKey: ["wikis", knowledgeSpaceId] });
      queryClient.invalidateQueries({ queryKey: ["wiki", wikiId] });
    },
  });
}

export function useApproveWiki(knowledgeSpaceId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (wikiId: number) => approveWiki(wikiId),
    onSuccess: (_, wikiId) => {
      queryClient.invalidateQueries({ queryKey: ["wikis", knowledgeSpaceId] });
      queryClient.invalidateQueries({ queryKey: ["wiki", wikiId] });
    },
  });
}

export function useRejectWiki(knowledgeSpaceId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (wikiId: number) => rejectWiki(wikiId),
    onSuccess: (_, wikiId) => {
      queryClient.invalidateQueries({ queryKey: ["wikis", knowledgeSpaceId] });
      queryClient.invalidateQueries({ queryKey: ["wiki", wikiId] });
    },
  });
}

export function useSendChatMessage() {
  return useMutation({ mutationFn: sendChatMessage });
}
