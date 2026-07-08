"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  MessageSquare,
  MessageSquareText,
  Search,
  ClipboardCheck,
  Sparkles,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useWikis } from "@/lib/api";
import { useActiveSpace } from "@/lib/active-space";

const NAV_ITEMS = [
  { href: "/assistant", icon: MessageSquare, label: "AI Assistant", sub: "Assistant" },
  { href: "/register", icon: FileText, label: "문서 등록", sub: "Documents" },
  { href: "/review", icon: ClipboardCheck, label: "AI 변환 결과", sub: "Review" },
  { href: "/explorer", icon: Search, label: "Wiki 탐색", sub: "Explorer" },
  { href: "/qa", icon: MessageSquareText, label: "답변관리", sub: "QA" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const { activeSpaceId, activeSpace } = useActiveSpace();
  const { data: wikis = [] } = useWikis(activeSpaceId);

  const pendingCount = wikis.filter((w) => w.status === "DRAFT").length;

  return (
    <aside
      className={`flex flex-col border-r border-border bg-card transition-all duration-300 relative ${
        collapsed ? "w-16" : "w-64"
      } min-h-screen`}
    >
      {/* Brand */}
      <div className={`flex items-center justify-between h-16 px-3.5 ${collapsed ? "justify-center px-2" : ""}`}>
        <div className={`flex items-center gap-2.5 p-1.5 ${collapsed ? "justify-center" : ""}`}>
          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-bold text-sm text-foreground leading-tight">LLM Wiki</p>
              <p className="text-[11px] text-muted-foreground truncate">AI 기반 Wiki 시스템</p>
            </div>
          )}
        </div>
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

      <Separator />

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          title="메뉴 펼치기"
          className="mx-auto my-2 w-8.5 h-7.5 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

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
    </aside>
  );
}
