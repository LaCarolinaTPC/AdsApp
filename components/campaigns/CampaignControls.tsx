"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, DollarSign, Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ErrorBanner } from "@/components/ui/States";

type Modal = null | "pause" | "resume" | "budget" | "duplicate";

export function CampaignControls({
  campaignId,
  campaignCacheId,
  campaignName,
  status,
  currency,
  currentDailyBudget,
}: {
  campaignId: string;
  campaignCacheId: string;
  campaignName: string;
  status: string | null;
  currency: string | null;
  currentDailyBudget: number | null; // en unidad mínima (céntimos)
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [modal, setModal] = useState<Modal>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [budget, setBudget] = useState(
    currentDailyBudget ? String(currentDailyBudget / 100) : "",
  );

  const isActive = (status ?? "").toUpperCase() === "ACTIVE";

  async function run(
    action: "pause" | "resume" | "set_daily_budget" | "duplicate",
    value?: number,
  ) {
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch("/api/meta/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: "campaign",
          entityId: campaignId,
          action,
          value,
          campaignCacheId,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Error aplicando el cambio");
      setModal(null);
      setOk(
        action === "duplicate"
          ? "Campaña duplicada (en PAUSED)."
          : "Cambio aplicado en Meta Ads correctamente.",
      );
      startTransition(() => router.refresh());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {isActive ? (
          <Button variant="danger" onClick={() => setModal("pause")}>
            <Pause className="h-4 w-4" />
            Pausar campaña
          </Button>
        ) : (
          <Button variant="success" onClick={() => setModal("resume")}>
            <Play className="h-4 w-4" />
            Reanudar campaña
          </Button>
        )}
        <Button variant="secondary" onClick={() => setModal("budget")}>
          <DollarSign className="h-4 w-4" />
          Cambiar presupuesto diario
        </Button>
        <Button variant="secondary" onClick={() => setModal("duplicate")}>
          <Copy className="h-4 w-4" />
          Duplicar
        </Button>
      </div>

      {ok && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✅ {ok}
        </div>
      )}
      {error && <ErrorBanner message={error} />}

      <ConfirmModal
        open={modal === "pause"}
        title="Pausar campaña"
        danger
        confirmLabel="Sí, pausar"
        loading={loading || pending}
        onClose={() => setModal(null)}
        onConfirm={() => run("pause")}
      >
        Vas a <strong>pausar</strong> «{campaignName}» en Meta Ads. Dejará de
        gastar y entregar. Podrás reanudarla después.
      </ConfirmModal>

      <ConfirmModal
        open={modal === "resume"}
        title="Reanudar campaña"
        confirmLabel="Sí, reanudar"
        loading={loading || pending}
        onClose={() => setModal(null)}
        onConfirm={() => run("resume")}
      >
        Vas a <strong>reactivar</strong> «{campaignName}». Volverá a entregar
        y <strong>gastar presupuesto real</strong>.
      </ConfirmModal>

      <ConfirmModal
        open={modal === "budget"}
        title="Cambiar presupuesto diario"
        confirmLabel="Aplicar nuevo presupuesto"
        danger
        loading={loading || pending}
        onClose={() => setModal(null)}
        onConfirm={() => {
          const v = Number(budget);
          if (!v || v <= 0) {
            setError("Introduce un importe válido mayor que 0.");
            return;
          }
          run("set_daily_budget", v);
        }}
      >
        <p className="mb-3">
          Presupuesto diario nuevo para «{campaignName}» (afecta el gasto
          real):
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            step="any"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          />
          <span className="text-sm font-medium text-slate-500">
            {currency || ""} / día
          </span>
        </div>
        {currentDailyBudget != null && (
          <p className="mt-2 text-xs text-slate-400">
            Actual: {currentDailyBudget / 100} {currency}
          </p>
        )}
      </ConfirmModal>

      <ConfirmModal
        open={modal === "duplicate"}
        title="Duplicar campaña"
        confirmLabel="Sí, duplicar"
        loading={loading || pending}
        onClose={() => setModal(null)}
        onConfirm={() => run("duplicate")}
      >
        Se creará una <strong>copia en PAUSED</strong> de «{campaignName}». La
        original no se modifica. La copia no gastará hasta que la actives.
      </ConfirmModal>
    </div>
  );
}
