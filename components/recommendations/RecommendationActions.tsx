"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { RecommendationStatus } from "@/types";

/**
 * Acciones de una recomendación. En el MVP NO modifica Meta Ads:
 * solo marca el estado y guarda historial. El botón de aplicar en
 * Meta (Fase 2) queda deshabilitado y documentado.
 */
export function RecommendationActions({
  id,
  status,
}: {
  id: string;
  status: RecommendationStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState<string | null>(null);

  async function setStatus(next: RecommendationStatus) {
    setLoading(next);
    await fetch(`/api/recommendations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setLoading(null);
    startTransition(() => router.refresh());
  }

  if (status !== "pending") {
    return (
      <Button
        variant="ghost"
        size="sm"
        loading={pending && loading === "pending"}
        onClick={() => setStatus("pending")}
      >
        Reabrir
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="success"
        size="sm"
        loading={loading === "accepted_manual"}
        onClick={() => setStatus("accepted_manual")}
      >
        <Check className="h-4 w-4" />
        Aceptar (aplicada manual)
      </Button>
      <Button
        variant="danger"
        size="sm"
        loading={loading === "rejected"}
        onClick={() => setStatus("rejected")}
      >
        <X className="h-4 w-4" />
        Rechazar
      </Button>
      {/* FASE 2: botón "Aceptar y aplicar en Meta Ads" — deshabilitado en MVP */}
      <Button
        variant="secondary"
        size="sm"
        disabled
        title="Disponible en Fase 2 con permiso ads_management"
      >
        Aplicar en Meta Ads (Fase 2)
      </Button>
    </div>
  );
}
