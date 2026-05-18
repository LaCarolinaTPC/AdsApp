import Link from "next/link";
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

export function CampaignTable({ campaigns }: { campaigns: CampaignRow[] }) {
  if (campaigns.length === 0) {
    return (
      <EmptyState
        title="Sin campañas"
        description="Sincroniza esta cuenta para traer sus campañas desde Meta Ads."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-100 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Campaña</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Objetivo</th>
            <th className="px-4 py-3 text-right">Presup. diario</th>
            <th className="px-4 py-3 text-right">Gasto</th>
            <th className="px-4 py-3 text-right">Impr.</th>
            <th className="px-4 py-3 text-right">CTR</th>
            <th className="px-4 py-3 text-right">CPC</th>
            <th className="px-4 py-3 text-right">Conv.</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {campaigns.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">
                {c.name || c.campaign_id}
              </td>
              <td className="px-4 py-3">
                <Badge tone={statusTone(c.effective_status ?? c.status)}>
                  {(c.effective_status ?? c.status ?? "—").toString()}
                </Badge>
              </td>
              <td className="px-4 py-3 text-slate-600">
                {c.objective ?? "—"}
              </td>
              <td className="px-4 py-3 text-right text-slate-600">
                {formatMoney(fromMetaBudget(c.daily_budget), c.currency)}
              </td>
              <td className="px-4 py-3 text-right text-slate-600">
                {formatMoney(c.insights?.spend, c.currency)}
              </td>
              <td className="px-4 py-3 text-right text-slate-600">
                {formatNumber(c.insights?.impressions)}
              </td>
              <td className="px-4 py-3 text-right text-slate-600">
                {formatPercent(c.insights?.ctr)}
              </td>
              <td className="px-4 py-3 text-right text-slate-600">
                {formatMoney(c.insights?.cpc, c.currency)}
              </td>
              <td className="px-4 py-3 text-right text-slate-600">
                {formatNumber(c.insights?.conversions)}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/dashboard/campaigns/${c.id}`}
                  className="font-medium text-brand-600 hover:underline"
                >
                  Ver / Analizar
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
