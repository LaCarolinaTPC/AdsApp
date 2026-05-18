"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function DisconnectButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  async function handle() {
    if (!confirm("¿Revocar la conexión con Meta Ads?")) return;
    setLoading(true);
    await fetch("/api/meta/disconnect", { method: "POST" });
    setLoading(false);
    startTransition(() => router.refresh());
  }

  return (
    <Button
      variant="danger"
      size="sm"
      loading={loading || pending}
      onClick={handle}
    >
      Desconectar
    </Button>
  );
}
