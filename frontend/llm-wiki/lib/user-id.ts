const STORAGE_KEY = "llm-wiki:user-id";

export function getOrCreateUserId(): string {
  if (typeof window === "undefined") return "server";
  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  window.localStorage.setItem(STORAGE_KEY, id);
  return id;
}
