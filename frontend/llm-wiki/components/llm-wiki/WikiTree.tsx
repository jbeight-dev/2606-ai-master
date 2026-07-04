"use client";

import Link from "next/link";
import { useState } from "react";
import { FileText, Database, Table, BookOpen, HelpCircle } from "lucide-react";
import type { DocumentType, WikiSummary } from "@/types/llm-wiki";

export interface WikiTreeItem extends WikiSummary {
  documentType: DocumentType;
}

const CATEGORY_CONFIG: Record<DocumentType, { icon: React.ElementType; color: string; label: string }> = {
  USER_MANUAL: { icon: FileText, color: "text-sky-500", label: "사용자 매뉴얼" },
  ERD: { icon: Database, color: "text-violet-500", label: "ERD" },
  DATA_CATALOG: { icon: Table, color: "text-emerald-500", label: "데이터 카탈로그" },
  GLOSSARY: { icon: BookOpen, color: "text-amber-500", label: "용어집" },
  UNKNOWN: { icon: HelpCircle, color: "text-slate-400", label: "기타" },
};

const CATEGORY_ORDER: DocumentType[] = ["USER_MANUAL", "ERD", "DATA_CATALOG", "GLOSSARY", "UNKNOWN"];

interface WikiTreeProps {
  items: WikiTreeItem[];
  activeWikiId?: number;
}

export function WikiTree({ items, activeWikiId }: WikiTreeProps) {
  const [openCategories, setOpenCategories] = useState<Record<DocumentType, boolean>>(
    Object.fromEntries(CATEGORY_ORDER.map((c) => [c, true])) as Record<DocumentType, boolean>
  );

  const grouped = Object.fromEntries(
    CATEGORY_ORDER.map((cat) => [cat, items.filter((i) => i.documentType === cat)])
  ) as Record<DocumentType, WikiTreeItem[]>;

  return (
    <div className="space-y-1 py-2">
      {CATEGORY_ORDER.map((category) => {
        const groupItems = grouped[category];
        if (!groupItems.length) return null;
        const { icon: Icon, color, label } = CATEGORY_CONFIG[category];
        const isOpen = openCategories[category];

        return (
          <div key={category}>
            <button
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setOpenCategories((prev) => ({ ...prev, [category]: !prev[category] }))}
            >
              <Icon className={`h-3.5 w-3.5 ${color}`} />
              <span className={color}>{label}</span>
              <span className="ml-auto opacity-50">{isOpen ? "▾" : "▸"}</span>
            </button>

            {isOpen && (
              <div className="mt-0.5">
                {groupItems.map((item) => {
                  const isActive = item.wiki_id === activeWikiId;
                  return (
                    <Link
                      key={item.wiki_id}
                      href={`/explorer/${item.wiki_id}`}
                      className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors ${
                        isActive
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      }`}
                      style={{ paddingLeft: "20px" }}
                    >
                      <span className="truncate flex-1">{item.title}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
