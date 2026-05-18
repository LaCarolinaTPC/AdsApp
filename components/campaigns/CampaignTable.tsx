"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import {
  formatMoney,
  formatNumber,
  formatPercent,
  fromMetaBudget,
} from "@/lib/utils";

export interface CampaignRow {
  id: string;
  campaign_id: string;
  name: string | null;
  status: string | null;
  effective_status: string | null;
  objective: string | null;
  daily_budget: number | null;
  lifetime_budget: number | null;
  currency: string | null;
  insights: {
    impressions: number | null;
    reach: number | null;
    clicks: number | null;
    ctr: number | null;
    cpc: number | null;
    cpm: number | null;
    spend: number | null;
    conversions: number | null;
    frequency: number | null;
  } | null;
}

function statusTone(s?: string | null) {
  const v = (s ?? "").toUpperCase();
  if (v === "ACTIVE") return "success" as const;
  if (v === "PAUSED") return "warning" as const;
  return "neutral" as const;
}

type SortKey =
  | "name"
  | "status"
  | "daily_budget"
  | "spend"
  | "impressions"
  | "ctr"
  | "cpc"
  | "conversions";

const num = (v: number | null | undefined) => (v == null ? -1 : v);

function MiniBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="mt-1 h-1 w-full rounded-full bg-slate-100">
      <div
        className="h-1 rounded-full bg-brand-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function CampaignTable({ campaigns }: { campaigns: CampaignRow[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const statuses = useMemo(() => {
    const s = new Set<string>();
    campaigns.forEach((c) =>
      s.add((c.effective_status ?? c.status ?? "—").toUpperCase()),
    );
    return Array.from(s).sort();
  }, [campaigns]);

  const max = useMemo(
    () => ({
      spend: Math.max(1, ...campaigns.map((c) => c.insights?.spend ?? 0)),
      impressions: Math.max(
        1,
        ...campaigns.map((c) => c.insights?.impressions ?? 0),
      ),
      conversions: Math.max(
        1,
        ...campaigns.map((c) => c.insights?.conversions ?? 0),
      ),
    }),
    [campaigns],
  );

  const rows = useMemo(() => {
    let r = campaigns.filter((c) => {
      const matchesQuery =
        !query ||
        (c.name ?? "").toLowerCase().includes(query.toLowerCase()) ||
        c.campaign_id.includes(query);
      const st = (c.effective_status ?? c.status ?? "—").toUpperCase();
      const matchesStatus = statusFilter === "ALL" || st === statusFilter;
      return matchesQuery && matchesStatus;
    });

    r = [...r].sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      switch (sortKey) {
        case "name":
          av = (a.name ?? "").toLowerCase();
          bv = (b.name ?? "").toLowerCase();
          break;
        case "status":
          av = (a.effective_status ?? a.status ?? "").toLowerCase();
          bv = (b.effective_status ?? b.status ?? "").toLowerCase();
          break;
        case "daily_budget":
          av = num(a.daily_budget);
          bv = num(b.daily_budget);
          break;
        default:
          av = num(a.insights?.[sortKey] as number | null);
          bv = num(b.insights?.[sortKey] as number | null);
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return r;
  }, [campaigns, query, statusFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function Th({
    label,
    k,
    align = "left",
  }: {
    label: string;
    k: SortKey;
    align?: "left" | "right";
  }) {
    const active = sortKey === k;
    return (
      <th
        className={`px-4 py-3 ${align === "right" ? "text-right" : "text-left"}`}
      >
        <button
          onClick={() => toggleSort(k)}
          className={`inline-flex items-center gap-1 ${
            align === "right" ? "flex-row-reverse" : ""
          } ${active ? "text-brand-700" : "text-slate-500 hover:text-slate-700"}`}
        >
          {label}
          {active ? (
            sortDir === "asc" ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-40" />
          )}
        </button>
      </th>
    );
  }

  if (campaigns.length === 0) {
    return (
      <EmptyState
        title="Sin campañas"
        description="Sincroniza esta cuenta para traer sus campañas desde Meta Ads."
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar: búsqueda + filtro estado */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar campaña…"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
        >
          <option value="ALL">Todos los estados</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span className="text-sm text-slate-500">
          {rows.length} de {campaigns.length}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wide">
            <tr>
              <Th label="Campaña" k="name" />
              <Th label="Estado" k="status" />
              <th className="px-4 py-3 text-left text-slate-500">Objetivo</th>
              <Th label="Presup. diario" k="daily_budget" align="right" />
              <Th label="Gasto" k="spend" align="right" />
              <Th label="Impr." k="impressions" align="right" />
              <Th label="CTR" k="ctr" align="right" />
              <Th label="CPC" k="cpc" align="right" />
              <Th label="Conv." k="conversions" align="right" />
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="max-w-[260px] px-4 py-4 font-medium text-slate-900">
                  <span className="block truncate">
                    {c.name || c.campaign_id}
                  </span>
                  <span className="text-xs font-normal text-slate-400">
                    {c.campaign_id}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <Badge tone={statusTone(c.effective_status ?? c.status)}>
                    {(c.effective_status ?? c.status ?? "—").toString()}
                  </Badge>
                </td>
                <td className="px-4 py-4 text-slate-600">
                  {c.objective ?? "—"}
                </td>
                <td className="px-4 py-4 text-right text-slate-600">
                  {formatMoney(fromMetaBudget(c.daily_budget), c.currency)}
                </td>
                <td className="px-4 py-4 text-right text-slate-700">
                  {formatMoney(c.insights?.spend, c.currency)}
                  <MiniBar
                    value={c.insights?.spend ?? 0}
                    max={max.spend}
                  />
                </td>
                <td className="px-4 py-4 text-right text-slate-700">
                  {formatNumber(c.insights?.impressions)}
                  <MiniBar
                    value={c.insights?.impressions ?? 0}
                    max={max.impressions}
                  />
                </td>
                <td className="px-4 py-4 text-right text-slate-600">
                  {formatPercent(c.insights?.ctr)}
                </td>
                <td className="px-4 py-4 text-right text-slate-600">
                  {formatMoney(c.insights?.cpc, c.currency)}
                </td>
                <td className="px-4 py-4 text-right text-slate-700">
                  {formatNumber(c.insights?.conversions)}
                  <MiniBar
                    value={c.insights?.conversions ?? 0}
                    max={max.conversions}
                  />
                </td>
                <td className="px-4 py-4 text-right">
                  <Link
                    href={`/dashboard/campaigns/${c.id}`}
                    className="whitespace-nowrap font-medium text-brand-600 hover:underline"
                  >
                    Ver / Analizar
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  Ninguna campaña coincide con el filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
