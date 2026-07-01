"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { WikiTree } from "@/components/llm-wiki/WikiTree";
import { fetchWikiTree } from "@/lib/mock-api";

export default function ExplorerPage() {
  const [search, setSearch] = useState("");

  const { data: nodes = [], isLoading } = useQuery({
    queryKey: ["wiki-tree"],
    queryFn: fetchWikiTree,
  });

  const filtered = search
    ? nodes.filter(
        (n) =>
          n.title.toLowerCase().includes(search.toLowerCase()) ||
          n.children?.some((c) => c.title.toLowerCase().includes(search.toLowerCase()))
      )
    : nodes;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Wiki 탐색</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          시스템, API, 화면, 테이블, 용어를 탐색하세요.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="노드 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-3">
          {isLoading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-8 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <WikiTree nodes={filtered} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
