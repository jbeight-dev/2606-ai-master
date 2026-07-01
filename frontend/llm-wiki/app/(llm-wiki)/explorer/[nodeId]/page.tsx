"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WikiNodeDetail } from "@/components/llm-wiki/WikiNodeDetail";
import { WikiTree } from "@/components/llm-wiki/WikiTree";
import { Card, CardContent } from "@/components/ui/card";
import { fetchWikiNode, fetchWikiTree } from "@/lib/mock-api";

interface PageProps {
  params: Promise<{ nodeId: string }>;
}

export default function WikiNodePage({ params }: PageProps) {
  const { nodeId } = use(params);

  const { data: node, isLoading } = useQuery({
    queryKey: ["wiki-node", nodeId],
    queryFn: () => fetchWikiNode(nodeId),
  });

  const { data: tree = [] } = useQuery({
    queryKey: ["wiki-tree"],
    queryFn: fetchWikiTree,
  });

  return (
    <div className="flex h-full">
      {/* Left: Tree panel */}
      <div className="hidden lg:flex w-72 shrink-0 border-r border-border flex-col overflow-y-auto">
        <div className="p-3 border-b border-border">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Wiki 트리</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <WikiTree nodes={tree} activeNodeId={nodeId} />
        </div>
      </div>

      {/* Right: Detail */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/explorer" className="inline-flex items-center mb-4 -ml-2 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Wiki 탐색으로
          </Link>

          {isLoading && (
            <div className="space-y-4">
              <div className="h-10 w-48 bg-muted rounded animate-pulse" />
              <div className="h-32 bg-muted rounded-xl animate-pulse" />
              <div className="h-64 bg-muted rounded-xl animate-pulse" />
            </div>
          )}

          {!isLoading && !node && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">노드를 찾을 수 없습니다.</p>
                <p className="text-sm text-muted-foreground mt-1">ID: {nodeId}</p>
              </CardContent>
            </Card>
          )}

          {node && <WikiNodeDetail node={node} />}
        </div>
      </div>
    </div>
  );
}
