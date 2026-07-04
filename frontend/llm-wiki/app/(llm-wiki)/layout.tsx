"use client";

import { Sidebar } from "@/components/llm-wiki/Sidebar";
import { OnboardingSpaces } from "@/components/llm-wiki/OnboardingSpaces";
import { useActiveSpace } from "@/lib/active-space";

export default function LlmWikiLayout({ children }: { children: React.ReactNode }) {
  const { activeSpaceId } = useActiveSpace();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {activeSpaceId == null ? (
          <div className="p-6">
            <OnboardingSpaces />
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
