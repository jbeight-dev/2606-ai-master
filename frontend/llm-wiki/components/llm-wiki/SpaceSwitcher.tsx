"use client";

import { useState } from "react";
import { ChevronDown, Plus, Check, Trash2 } from "lucide-react";
import { useKnowledgeSpaces } from "@/lib/api";
import { useActiveSpace } from "@/lib/active-space";
import { CreateSpaceModal } from "@/components/llm-wiki/CreateSpaceModal";
import { DeleteSpaceConfirmModal } from "@/components/llm-wiki/DeleteSpaceConfirmModal";

export function SpaceSwitcher() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteSpaceOpen, setDeleteSpaceOpen] = useState(false);
  const [spaceToDelete, setSpaceToDelete] = useState<number | null>(null);

  const { data: spaces = [] } = useKnowledgeSpaces();
  const { activeSpaceId, activeSpace, setActiveSpaceId } = useActiveSpace();

  const spaceToDeleteInfo = spaces.find((s) => s.id === spaceToDelete) || null;

  if (!activeSpace) return null;

  return (
    <div className="flex items-center h-16 bg-card/50 px-6">
      <div className="relative w-full max-w-4xl mx-auto">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg -mx-1.5 px-1.5 py-1 hover:bg-accent/60 transition-colors"
          title="Knowledge Space 전환"
        >
          <div
            className="w-6.5 h-6.5 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-semibold text-[10px] shrink-0"
            title={`Knowledge Space ID: ${activeSpace.id}`}
          >
            #{activeSpace.id}
          </div>
          <div className="flex items-baseline gap-2 min-w-0">
            <h2 className="text-sm font-semibold text-foreground shrink-0">{activeSpace.name}</h2>
            {activeSpace.description && (
              <p className="text-xs text-muted-foreground truncate">{activeSpace.description}</p>
            )}
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>

        {menuOpen && (
          <div className="absolute top-full left-0 mt-1 w-72 z-40 bg-popover border border-border rounded-xl shadow-lg p-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1.5 py-1">
              Knowledge Spaces
            </p>
            {spaces.map((space) => (
              <div key={space.id} className="relative group">
                <button
                  onClick={() => {
                    setActiveSpaceId(space.id);
                    setMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors ${
                    space.id === activeSpaceId ? "bg-accent" : "hover:bg-accent/50"
                  }`}
                >
                  <div className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold shrink-0">
                    {space.name.trim().charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate text-foreground">{space.name}</p>
                  </div>
                  {space.id === activeSpaceId && (
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteSpaceOpen(true);
                    setSpaceToDelete(space.id);
                    setMenuOpen(false);
                  }}
                  className="absolute inset-y-0 right-2 my-auto h-fit opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
                  title="스페이스 삭제"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                setCreateOpen(true);
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 rounded-lg px-2 py-2 mt-1 border-t border-border text-primary font-medium text-sm"
            >
              <span className="w-6.5 h-6.5 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <Plus className="h-3.5 w-3.5" />
              </span>
              새 Knowledge Space 만들기
            </button>
          </div>
        )}
      </div>

      <CreateSpaceModal open={createOpen} onOpenChange={setCreateOpen} />
      <DeleteSpaceConfirmModal
        open={deleteSpaceOpen}
        onOpenChange={setDeleteSpaceOpen}
        space={spaceToDeleteInfo}
      />
    </div>
  );
}
