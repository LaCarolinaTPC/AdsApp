"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/States";

/** Botón genérico que llama a un endpoint de sincronización y refresca. */
export function SyncButton({
  endpoint,
  label = "Sincronizar",
}: {
  endpoint: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, { method: "GET" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Error sincronizando");
      startTransition(() => router.refresh());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        variant="secondary"
        size="sm"
        loading={loading || pending}
        onClick={handle}
      >
        {!loading && !pending && <RefreshCw className="h-4 w-4" />}
        {label}
      </Button>
      {error && <ErrorBanner message={error} />}
    </div>
  );
}
