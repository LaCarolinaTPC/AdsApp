"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ErrorBanner } from "@/components/ui/States";

const OBJECTIVES = [
  { value: "OUTCOME_TRAFFIC", label: "Tráfico" },
  { value: "OUTCOME_ENGAGEMENT", label: "Interacción" },
  { value: "OUTCOME_LEADS", label: "Clientes potenciales" },
  { value: "OUTCOME_SALES", label: "Ventas" },
  { value: "OUTCOME_AWARENESS", label: "Reconocimiento" },
  { value: "OUTCOME_APP_PROMOTION", label: "Promoción de app" },
];

export function CreateCampaignButton({
  adAccountId,
  currency,
}: {
  adAccountId: string;
  currency: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [objective, setObjective] = useState(OBJECTIVES[0].value);
  const [dailyBudget, setDailyBudget] = useState("");

  async function create() {
    if (!name.trim()) {
      setError("Ponle un nombre a la campaña.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/meta/campaign/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adAccountId,
          name: name.trim(),
          objective,
          dailyBudget: dailyBudget ? Number(dailyBudget) : undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Error creando la campaña");
      setOpen(false);
      setName("");
      setDailyBudget("");
      startTransition(() => router.refresh());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Crear campaña
      </Button>

      <ConfirmModal
        open={open}
        title="Crear campaña nueva"
        confirmLabel="Crear (en PAUSED)"
        loading={loading || pending}
        onClose={() => setOpen(false)}
        onConfirm={create}
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Se creará <strong>pausada</strong>: no gastará nada hasta que
            añadas conjuntos/anuncios y la actives.
          </p>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Nombre
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Ventas - Verano 2026"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Objetivo
            </span>
            <select
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            >
              {OBJECTIVES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Presupuesto diario (opcional, {currency || "moneda"})
            </span>
            <input
              type="number"
              min="0"
              step="any"
              value={dailyBudget}
              onChange={(e) => setDailyBudget(e.target.value)}
              placeholder="Dejar vacío = sin presupuesto a nivel campaña"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            />
          </label>
          {error && <ErrorBanner message={error} />}
        </div>
      </ConfirmModal>
    </>
  );
}
