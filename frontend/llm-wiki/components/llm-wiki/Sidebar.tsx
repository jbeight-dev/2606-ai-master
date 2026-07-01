"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileText,
  MessageSquare,
  Search,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const NAV_ITEMS = [
  { href: "/register", icon: FileText, label: "문서 등록" },
  { href: "/review", icon: ClipboardCheck, label: "AI 변환 검수" },
  { href: "/explorer", icon: Search, label: "Wiki 탐색" },
  { href: "/assistant", icon: MessageSquare, label: "AI Assistant" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`flex flex-col border-r border-border bg-card transition-all duration-300 ${
        collapsed ? "w-16" : "w-60"
      } min-h-screen`}
    >
      {/* Logo */}
      <div className={`flex items-center gap-2 px-4 py-5 ${collapsed ? "justify-center px-2" : ""}`}>
        <BookOpen className="h-6 w-6 shrink-0 text-primary" />
        {!collapsed && (
          <span className="font-bold text-base tracking-tight text-foreground">LLM Wiki</span>
        )}
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href}>
              <div
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                } ${collapsed ? "justify-center px-2" : ""}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{label}</span>}
              </div>
            </Link>
          );
        })}
      </nav>

      <Separator />

      {/* Collapse toggle */}
      <div className="p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}
