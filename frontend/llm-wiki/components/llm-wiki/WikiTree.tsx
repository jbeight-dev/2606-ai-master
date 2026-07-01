"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Server,
  Monitor,
  Zap,
  Database,
  BookOpen,
  Tag,
} from "lucide-react";
import type { WikiCategory, WikiNode } from "@/types/llm-wiki";

const CATEGORY_CONFIG: Record<WikiCategory, { icon: React.ElementType; color: string; label: string }> = {
  Systems: { icon: Server, color: "text-violet-500", label: "Systems" },
  Screens: { icon: Monitor, color: "text-sky-500", label: "Screens" },
  API: { icon: Zap, color: "text-blue-500", label: "API" },
  Tables: { icon: Database, color: "text-emerald-500", label: "Tables" },
  Glossary: { icon: BookOpen, color: "text-amber-500", label: "Glossary" },
  Release: { icon: Tag, color: "text-rose-500", label: "Release" },
};

const CATEGORY_ORDER: WikiCategory[] = ["Systems", "Screens", "API", "Tables", "Glossary", "Release"];

interface TreeNodeProps {
  node: WikiNode;
  depth?: number;
  activeNodeId?: string;
}

function TreeNode({ node, depth = 0, activeNodeId }: TreeNodeProps) {
  const [open, setOpen] = useState(depth === 0 && !!node.children?.length);
  const hasChildren = !!node.children?.length;
  const isActive = node.id === activeNodeId;

  return (
    <div>
      <div
        className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors ${
          isActive
            ? "bg-accent text-accent-foreground font-medium"
            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <button
          onClick={() => hasChildren && setOpen(!open)}
          className="flex items-center gap-1 flex-1 min-w-0"
        >
          {hasChildren ? (
            open ? (
              <ChevronDown className="h-3 w-3 shrink-0" />
            ) : (
              <ChevronRight className="h-3 w-3 shrink-0" />
            )
          ) : (
            <span className="w-3" />
          )}
          <Link
            href={`/explorer/${node.id}`}
            onClick={(e) => e.stopPropagation()}
            className="truncate flex-1 text-left"
          >
            {node.title}
          </Link>
        </button>
      </div>

      {hasChildren && open && (
        <div>
          {node.children!.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} activeNodeId={activeNodeId} />
          ))}
        </div>
      )}
    </div>
  );
}

interface WikiTreeProps {
  nodes: WikiNode[];
  activeNodeId?: string;
}

export function WikiTree({ nodes, activeNodeId }: WikiTreeProps) {
  const [openCategories, setOpenCategories] = useState<Record<WikiCategory, boolean>>(
    Object.fromEntries(CATEGORY_ORDER.map((c) => [c, true])) as Record<WikiCategory, boolean>
  );

  const grouped = Object.fromEntries(
    CATEGORY_ORDER.map((cat) => [cat, nodes.filter((n) => n.category === cat)])
  ) as Record<WikiCategory, WikiNode[]>;

  return (
    <div className="space-y-1 py-2">
      {CATEGORY_ORDER.map((category) => {
        const items = grouped[category];
        if (!items.length) return null;
        const { icon: Icon, color, label } = CATEGORY_CONFIG[category];
        const isOpen = openCategories[category];

        return (
          <div key={category}>
            <button
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              onClick={() =>
                setOpenCategories((prev) => ({ ...prev, [category]: !prev[category] }))
              }
            >
              <Icon className={`h-3.5 w-3.5 ${color}`} />
              <span className={color}>{label}</span>
              <span className="ml-auto opacity-50">{isOpen ? "▾" : "▸"}</span>
            </button>

            {isOpen && (
              <div className="mt-0.5">
                {items.map((node) => (
                  <TreeNode key={node.id} node={node} depth={0} activeNodeId={activeNodeId} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
