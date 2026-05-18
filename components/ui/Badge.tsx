import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "brand";

const tones: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-700",
  info: "bg-sky-100 text-sky-700",
  brand: "bg-brand-100 text-brand-700",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const URGENCY: Record<string, Tone> = { alta: "danger", media: "warning", baja: "success" };
const RISK: Record<string, Tone> = { alto: "danger", medio: "warning", bajo: "success" };
const PRIORITY: Record<string, Tone> = { alta: "danger", media: "warning", baja: "info" };
const STATUS: Record<string, Tone> = {
  pending: "neutral",
  accepted_manual: "success",
  rejected: "danger",
  applied_future: "brand",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  accepted_manual: "Aceptada (manual)",
  rejected: "Rechazada",
  applied_future: "Aplicar en futuro",
};

export const urgencyTone = (v?: string | null) => URGENCY[v ?? ""] ?? "neutral";
export const riskTone = (v?: string | null) => RISK[v ?? ""] ?? "neutral";
export const priorityTone = (v?: string | null) => PRIORITY[v ?? ""] ?? "neutral";
export const statusTone = (v?: string | null) => STATUS[v ?? ""] ?? "neutral";
export const statusLabel = (v?: string | null) =>
  STATUS_LABEL[v ?? ""] ?? v ?? "—";
