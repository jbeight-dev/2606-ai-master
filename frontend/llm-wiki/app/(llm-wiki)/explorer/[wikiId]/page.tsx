"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { WikiDetail } from "@/components/llm-wiki/WikiDetail";
import { WikiTree, type WikiTreeItem } from "@/components/llm-wiki/WikiTree";
import { useDocuments, useWiki, useWikis } from "@/lib/api";
import { useActiveSpace } from "@/lib/active-space";

interface PageProps {
  params: Promise<{ wikiId: string }>;
}

export default function WikiDetailPage({ params }: PageProps) {
  const { wikiId } = use(params);
  const id = Number(wikiId);
  const { activeSpaceId, activeSpace } = useActiveSpace();

  const { data: wiki, isLoading } = useWiki(id);
  const { data: wikis = [] } = useWikis(activeSpaceId);
  const { data: documents = [] } = useDocuments(activeSpaceId);

  const documentTypeById = new Map(documents.map((d) => [d.document_id, d.document_type]));

  // The left rail only needs the current wiki's group resolved precisely;
  // siblings default to UNKNOWN until visited (avoids an N+1 fetch here).
  const items: WikiTreeItem[] = wikis.map((w) => ({
    ...w,
    documentType: w.wiki_id === id && wiki ? documentTypeById.get(wiki.document_id) ?? "UNKNOWN" : "UNKNOWN",
  }));

  const groupLabel = wiki ? documentTypeById.get(wiki.document_id) ?? "UNKNOWN" : "";
  const crumb = wiki ? `${activeSpace?.name ?? ""} / ${groupLabel} / ${wiki.title}` : "";

  return (
    <div className="flex h-full">
      <div className="hidden lg:flex w-72 shrink-0 border-r border-border flex-col overflow-y-auto">
        <div className="p-3 border-b border-border">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Wiki 트리</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <WikiTree items={items} activeWikiId={id} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/explorer"
            className="inline-flex items-center mb-4 -ml-2 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
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

          {!isLoading && !wiki && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Wiki를 찾을 수 없습니다.</p>
                <p className="text-sm text-muted-foreground mt-1">ID: {wikiId}</p>
              </CardContent>
            </Card>
          )}

          {wiki && <WikiDetail wiki={wiki} crumb={crumb} />}
        </div>
      </div>
    </div>
  );
}
