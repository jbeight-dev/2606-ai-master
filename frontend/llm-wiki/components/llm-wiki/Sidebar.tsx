"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileText,
  MessageSquare,
  Search,
  ClipboardCheck,
  Plus,
  Check,
  Boxes,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useKnowledgeSpaces, useWikis } from "@/lib/api";
import { useActiveSpace } from "@/lib/active-space";
import { CreateSpaceModal } from "@/components/llm-wiki/CreateSpaceModal";
import { DeleteSpaceConfirmModal } from "@/components/llm-wiki/DeleteSpaceConfirmModal";

const NAV_ITEMS = [
  { href: "/register", icon: FileText, label: "문서 등록", sub: "Documents" },
  { href: "/review", icon: ClipboardCheck, label: "AI 변환 결과", sub: "Review" },
  { href: "/explorer", icon: Search, label: "Wiki 탐색", sub: "Explorer" },
  { href: "/assistant", icon: MessageSquare, label: "AI Assistant", sub: "Assistant" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [spaceMenuOpen, setSpaceMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteSpaceOpen, setDeleteSpaceOpen] = useState(false);
  const [spaceToDelete, setSpaceToDelete] = useState<number | null>(null);

  const { data: spaces = [] } = useKnowledgeSpaces();
  const { activeSpaceId, activeSpace, setActiveSpaceId } = useActiveSpace();
  const { data: wikis = [] } = useWikis(activeSpaceId);

  const pendingCount = wikis.filter((w) => w.status === "DRAFT").length;
  const spaceToDeleteInfo = spaces.find((s) => s.knowledge_space_id === spaceToDelete) || null;

  return (
    <aside
      className={`flex flex-col border-r border-border bg-card transition-all duration-300 relative ${
        collapsed ? "w-16" : "w-64"
      } min-h-screen`}
    >
      {/* Space switcher */}
      <div className={`flex items-center gap-2 px-3 py-4 ${collapsed ? "justify-center px-2" : ""}`}>
        <button
          onClick={() => setSpaceMenuOpen((v) => !v)}
          className={`flex items-center gap-2.5 flex-1 min-w-0 rounded-lg hover:bg-accent/60 transition-colors ${
            collapsed ? "p-1 justify-center" : "p-1.5"
          }`}
          title="Knowledge Space 전환"
        >
          <div className="w-8.5 h-8.5 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm shrink-0">
            {activeSpace ? activeSpace.name.trim().charAt(0) : <Boxes className="h-4 w-4" />}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-semibold text-sm truncate text-foreground">
                  {activeSpace ? activeSpace.name : "Knowledge Space"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {activeSpace ? activeSpace.description || "설명 없음" : "선택하거나 새로 만드세요"}
                </p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </>
          )}
        </button>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            title="메뉴 접기"
            className="w-7 h-7 shrink-0 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {spaceMenuOpen && (
        <div className="absolute top-16 left-3 right-3 z-40 bg-popover border border-border rounded-xl shadow-lg p-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1.5 py-1">
            Knowledge Spaces
          </p>
          {spaces.map((space) => (
            <div key={space.knowledge_space_id} className="relative group">
              <button
                onClick={() => {
                  setActiveSpaceId(space.knowledge_space_id);
                  setSpaceMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors ${
                  space.knowledge_space_id === activeSpaceId ? "bg-accent" : "hover:bg-accent/50"
                }`}
              >
                <div className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold shrink-0">
                  {space.name.trim().charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate text-foreground">{space.name}</p>
                </div>
                {space.knowledge_space_id === activeSpaceId && (
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                )}
              </button>
              {/* Three-dot menu */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteSpaceOpen(true);
                  setSpaceToDelete(space.knowledge_space_id);
                  setSpaceMenuOpen(false);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
                title="스페이스 삭제"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              setCreateOpen(true);
              setSpaceMenuOpen(false);
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

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          title="메뉴 펼치기"
          className="mx-auto mb-1 w-8.5 h-7.5 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      <Separator />

      {/* Navigation */}
      {activeSpace && (
        <nav className="flex-1 px-2 py-3 space-y-1">
          {NAV_ITEMS.map(({ href, icon: Icon, label, sub }) => {
            const active = pathname.startsWith(href);
            return (
              <Link key={href} href={href}>
                <div
                  className={`relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  } ${collapsed ? "justify-center px-2" : ""}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <div className="flex-1 min-w-0">
                      <div>{label}</div>
                      <div className="text-[10px] text-muted-foreground/70 tracking-wide">{sub}</div>
                    </div>
                  )}
                  {href === "/review" && pendingCount > 0 && !collapsed && (
                    <Badge variant="secondary" className="text-[10px]">
                      {pendingCount}
                    </Badge>
                  )}
                  {href === "/review" && pendingCount > 0 && collapsed && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
      )}
      {!activeSpace && <div className="flex-1" />}

      <Separator />

      {/* User row (static, no auth) */}
      <div className={`flex items-center gap-2.5 p-3.5 ${collapsed ? "justify-center" : ""}`}>
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-semibold text-sm text-muted-foreground shrink-0">
          관
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">설비 운영자</p>
            <p className="text-xs text-muted-foreground">admin@mes-ai</p>
          </div>
        )}
      </div>

      <CreateSpaceModal open={createOpen} onOpenChange={setCreateOpen} />
      <DeleteSpaceConfirmModal
        open={deleteSpaceOpen}
        onOpenChange={setDeleteSpaceOpen}
        space={spaceToDeleteInfo}
      />
    </aside>
  );
}
