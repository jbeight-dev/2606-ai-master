"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { useKnowledgeSpaces } from "@/lib/api";
import type { KnowledgeSpace } from "@/types/llm-wiki";

const STORAGE_KEY = "llm-wiki:active-space-id";

type Listener = () => void;
const listeners = new Set<Listener>();

function subscribe(listener: Listener) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function getSnapshot(): number | null {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored ? Number(stored) : null;
}

function getServerSnapshot(): number | null {
  return null;
}

function setStoredActiveSpaceId(id: number | null) {
  if (id == null) {
    window.localStorage.removeItem(STORAGE_KEY);
  } else {
    window.localStorage.setItem(STORAGE_KEY, String(id));
  }
  listeners.forEach((listener) => listener());
}

interface ActiveSpaceContextValue {
  activeSpaceId: number | null;
  activeSpace: KnowledgeSpace | null;
  setActiveSpaceId: (id: number | null) => void;
}

const ActiveSpaceContext = createContext<ActiveSpaceContextValue | null>(null);

export function ActiveSpaceProvider({ children }: { children: React.ReactNode }) {
  const activeSpaceId = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { data: spaces = [] } = useKnowledgeSpaces();

  const activeSpace = useMemo(
    () => spaces.find((s) => s.id === activeSpaceId) ?? null,
    [spaces, activeSpaceId]
  );

  return (
    <ActiveSpaceContext.Provider
      value={{ activeSpaceId, activeSpace, setActiveSpaceId: setStoredActiveSpaceId }}
    >
      {children}
    </ActiveSpaceContext.Provider>
  );
}

export function useActiveSpace() {
  const ctx = useContext(ActiveSpaceContext);
  if (!ctx) throw new Error("useActiveSpace must be used within ActiveSpaceProvider");
  return ctx;
}
