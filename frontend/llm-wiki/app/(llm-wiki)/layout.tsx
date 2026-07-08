"use client";

import { Sidebar } from "@/components/llm-wiki/Sidebar";
import { OnboardingSpaces } from "@/components/llm-wiki/OnboardingSpaces";
import { SpaceSwitcher } from "@/components/llm-wiki/SpaceSwitcher";
import { useActiveSpace } from "@/lib/active-space";

export default function LlmWikiLayout({ children }: { children: React.ReactNode }) {
  const { activeSpaceId } = useActiveSpace();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeSpaceId == null ? (
          <div className="flex-1 overflow-y-auto p-6">
            <OnboardingSpaces />
          </div>
        ) : (
          <>
            <SpaceSwitcher />
            <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
          </>
        )}
      </main>
    </div>
  );
}
