import { createClient } from "@/lib/supabase/server";
import { AccountSelector } from "@/components/campaigns/AccountSelector";
import { CampaignTable, type CampaignRow } from "@/components/campaigns/CampaignTable";
import { SyncButton } from "@/components/dashboard/SyncButton";
import { CampaignBuilder } from "@/components/campaigns/CampaignBuilder";
import { EmptyState } from "@/components/ui/States";
import { ConnectMetaButton } from "@/components/dashboard/ConnectMetaButton";

export const dynamic = "force-dynamic";

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: accounts } = await supabase
    .from("meta_ad_accounts")
    .select("id, account_id, name, currency")
    .order("name");

  if (!accounts || accounts.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Campañas</h1>
        <EmptyState
          title="Sin cuentas publicitarias"
          description="Conecta Meta y sincroniza tus cuentas para ver campañas."
          action={<ConnectMetaButton />}
        />
      </div>
    );
  }

  const selectedId = sp.account ?? accounts[0].id;
  const selected = accounts.find((a) => a.id === selectedId) ?? accounts[0];

  const { data: rows } = await supabase
    .from("campaigns_cache")
    .select(
      `id, campaign_id, name, status, effective_status, objective,
       daily_budget, lifetime_budget,
       campaign_insights (
         impressions, reach, clicks, ctr, cpc, cpm, spend,
         conversions, frequency, created_at
       )`,
    )
    .eq("ad_account_id", selected.id)
    .order("name");

  const campaigns: CampaignRow[] = (rows ?? []).map((c: any) => {
    const ins = (c.campaign_insights ?? []).sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0];
    return {
      id: c.id,
      campaign_id: c.campaign_id,
      name: c.name,
      status: c.status,
      effective_status: c.effective_status,
      objective: c.objective,
      daily_budget: c.daily_budget,
      lifetime_budget: c.lifetime_budget,
      currency: selected.currency,
      insights: ins ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campañas</h1>
          <p className="text-sm text-slate-500">
            Selecciona una cuenta y analiza sus campañas con IA.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <AccountSelector accounts={accounts} selected={selected.id} />
          <SyncButton
            endpoint={`/api/meta/campaigns?adAccountId=${selected.id}&refresh=1`}
            label="Sincronizar campañas"
          />
          <CampaignBuilder
            adAccountId={selected.id}
            currency={selected.currency}
          />
        </div>
      </div>

      <CampaignTable campaigns={campaigns} />
    </div>
  );
}
