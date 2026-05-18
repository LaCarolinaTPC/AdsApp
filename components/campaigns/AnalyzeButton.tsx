"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Brain } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/States";

export function AnalyzeButton({
  campaignCacheId,
}: {
  campaignCacheId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignCacheId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Error analizando");
      startTransition(() => router.refresh());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button loading={loading || pending} onClick={analyze}>
        {!loading && !pending && <Brain className="h-4 w-4" />}
        Analizar con IA
      </Button>
      {error && <ErrorBanner message={error} />}
    </div>
  );
}
