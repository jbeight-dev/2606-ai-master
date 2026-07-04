"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { WikiTree, type WikiTreeItem } from "@/components/llm-wiki/WikiTree";
import { useDocuments, useWikiDetails, useWikis } from "@/lib/api";
import { useActiveSpace } from "@/lib/active-space";
import type { DocumentType } from "@/types/llm-wiki";

export default function ExplorerPage() {
  const [search, setSearch] = useState("");
  const { activeSpaceId } = useActiveSpace();
  const { data: wikis = [], isLoading: wikisLoading } = useWikis(activeSpaceId);
  const { data: documents = [] } = useDocuments(activeSpaceId);
  const wikiIds = wikis.map((w) => w.wiki_id);
  const detailQueries = useWikiDetails(wikiIds);
  const detailsLoading = detailQueries.some((q) => q.isLoading);
  const isLoading = wikisLoading || detailsLoading;

  const documentTypeById = new Map(documents.map((d) => [d.document_id, d.document_type]));
  const documentTypeByWikiId = new Map<number, DocumentType>();
  detailQueries.forEach((q) => {
    if (q.data) {
      documentTypeByWikiId.set(q.data.wiki_id, documentTypeById.get(q.data.document_id) ?? "UNKNOWN");
    }
  });

  const items: WikiTreeItem[] = wikis.map((wiki) => ({
    ...wiki,
    documentType: documentTypeByWikiId.get(wiki.wiki_id) ?? "UNKNOWN",
  }));

  const filtered = search
    ? items.filter(
        (i) =>
          i.title.toLowerCase().includes(search.toLowerCase()) ||
          i.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
      )
    : items;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Wiki 탐색</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          AI가 생성한 지식을 탐색하세요.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="위키 검색..."
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
          ) : items.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <p className="text-sm font-semibold text-foreground">아직 탐색할 Wiki가 없습니다</p>
              <p className="text-xs text-muted-foreground">
                문서를 등록하고 AI가 변환을 완료하면 이곳에서 지식을 탐색할 수 있습니다.
              </p>
            </div>
          ) : (
            <WikiTree items={filtered} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
