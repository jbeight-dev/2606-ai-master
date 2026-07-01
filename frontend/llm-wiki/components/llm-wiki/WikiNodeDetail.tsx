import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SourceTag } from "@/components/common/SourceTag";
import type { WikiNode } from "@/types/llm-wiki";

const METHOD_COLOR: Record<string, string> = {
  GET: "bg-sky-500",
  POST: "bg-green-500",
  PUT: "bg-amber-500",
  PATCH: "bg-orange-500",
  DELETE: "bg-red-500",
};

interface WikiNodeDetailProps {
  node: WikiNode;
}

export function WikiNodeDetail({ node }: WikiNodeDetailProps) {
  const { meta, content } = node;
  const hasApi = !!content?.apiSpec;
  const hasTable = !!content?.tableSpec;
  const hasFeatures = !!content?.features?.length;
  const hasFaq = !!content?.faqs?.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs">{node.category}</Badge>
          {meta && <StatusBadge status={meta.status} />}
        </div>
        <h1 className="text-2xl font-bold mt-2 text-foreground">{node.title}</h1>
        {meta && (
          <p className="text-sm text-muted-foreground mt-1">
            {meta.version} · 최종 수정 {meta.lastUpdated}
          </p>
        )}
      </div>

      {content?.summary && (
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm leading-relaxed text-foreground">{content.summary}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue={hasApi ? "api" : hasTable ? "table" : hasFeatures ? "features" : "faq"}>
        <TabsList className="flex-wrap h-auto gap-1">
          {hasFeatures && <TabsTrigger value="features">기능</TabsTrigger>}
          {hasApi && <TabsTrigger value="api">API 명세</TabsTrigger>}
          {hasTable && <TabsTrigger value="table">테이블 명세</TabsTrigger>}
          {hasFaq && <TabsTrigger value="faq">FAQ</TabsTrigger>}
          {content?.relatedNodes?.length && <TabsTrigger value="related">관련 노드</TabsTrigger>}
        </TabsList>

        {/* Features */}
        {hasFeatures && (
          <TabsContent value="features" className="mt-4 space-y-3">
            {content!.features!.map((f) => (
              <Card key={f.id}>
                <CardContent className="pt-4 pb-4">
                  <p className="text-sm font-semibold text-foreground mb-1">{f.title}</p>
                  <p className="text-sm text-muted-foreground">{f.description}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        )}

        {/* API Spec */}
        {hasApi && (
          <TabsContent value="api" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold text-white ${
                      METHOD_COLOR[content!.apiSpec!.method] ?? "bg-gray-500"
                    }`}
                  >
                    {content!.apiSpec!.method}
                  </span>
                  <code className="text-sm font-mono text-foreground">{content!.apiSpec!.path}</code>
                </div>
                <p className="text-sm text-muted-foreground">{content!.apiSpec!.description}</p>
              </CardHeader>

              {content!.apiSpec!.parameters?.length && (
                <CardContent className="pt-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                    Parameters
                  </p>
                  <div className="space-y-2">
                    {content!.apiSpec!.parameters!.map((param) => (
                      <div
                        key={param.name}
                        className="flex items-start gap-3 p-3 rounded-md bg-muted/50"
                      >
                        <code className="text-xs font-mono text-primary shrink-0">{param.name}</code>
                        <Badge variant="outline" className="text-xs shrink-0">{param.type}</Badge>
                        {param.required && (
                          <Badge className="text-xs shrink-0 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 border-none">
                            required
                          </Badge>
                        )}
                        <p className="text-xs text-muted-foreground">{param.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}

              {content!.apiSpec!.responseExample && (
                <CardContent className="pt-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                    Response Example
                  </p>
                  <pre className="text-xs bg-muted rounded-md p-4 overflow-x-auto text-foreground font-mono">
                    {content!.apiSpec!.responseExample}
                  </pre>
                </CardContent>
              )}
            </Card>
          </TabsContent>
        )}

        {/* Table Spec */}
        {hasTable && (
          <TabsContent value="table" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-mono">{content!.tableSpec!.tableName}</CardTitle>
                <p className="text-sm text-muted-foreground">{content!.tableSpec!.description}</p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Column</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Type</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Nullable</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {content!.tableSpec!.columns.map((col) => (
                        <tr key={col.name} className="hover:bg-muted/30">
                          <td className="px-3 py-2 font-mono text-xs text-primary">{col.name}</td>
                          <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{col.type}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {col.nullable ? "YES" : "NO"}
                          </td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{col.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* FAQ */}
        {hasFaq && (
          <TabsContent value="faq" className="mt-4 space-y-3">
            {content!.faqs!.map((faq, i) => (
              <Card key={i}>
                <CardContent className="pt-4 pb-4 space-y-2">
                  <p className="text-sm font-semibold text-foreground">Q. {faq.question}</p>
                  <Separator />
                  <p className="text-sm text-muted-foreground">A. {faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        )}

        {/* Related Nodes */}
        {content?.relatedNodes?.length && (
          <TabsContent value="related" className="mt-4">
            <div className="flex flex-wrap gap-2">
              {content.relatedNodes.map((rel) => (
                <SourceTag
                  key={rel.id}
                  type={
                    rel.category === "API"
                      ? "API"
                      : rel.category === "Tables"
                      ? "Table"
                      : rel.category === "Screens"
                      ? "Screen"
                      : "Glossary"
                  }
                  title={rel.title}
                  nodeId={rel.id}
                />
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Related documents */}
      {meta?.relatedDocuments?.length && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            참조 문서
          </p>
          <div className="flex flex-wrap gap-2">
            {meta.relatedDocuments.map((doc) => (
              <span
                key={doc}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-muted text-xs text-muted-foreground"
              >
                📄 {doc}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
