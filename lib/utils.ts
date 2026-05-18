import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatNumber(n: number | null | undefined, opts?: Intl.NumberFormatOptions) {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-ES", opts).format(n);
}

export function formatMoney(
  n: number | null | undefined,
  currency: string | null | undefined,
) {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatPercent(n: number | null | undefined) {
  if (n == null) return "—";
  return `${n.toFixed(2)}%`;
}

/** Meta entrega presupuestos en céntimos de la moneda. */
export function fromMetaBudget(cents: number | null | undefined) {
  if (cents == null) return null;
  return cents / 100;
}
