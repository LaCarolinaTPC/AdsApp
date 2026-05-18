import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { AnalyzeButton } from "@/components/campaigns/AnalyzeButton";
import { AiAnalysisPanel } from "@/components/campaigns/AiAnalysisPanel";
import { AdsExplorer } from "@/components/campaigns/AdsExplorer";
import { CampaignChat } from "@/components/campaigns/CampaignChat";
import { objectiveLabel, statusLabelEs } from "@/lib/meta/labels";
import { RecommendationCard } from "@/components/recommendations/RecommendationCard";
import {
  formatMoney,
  formatNumber,
  formatPercent,
  fromMetaBudget,
} from "@/lib/utils";
import type { AiAnalysisResult, Recommendation } from "@/types";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: campaign } = await supabase
    .from("campaigns_cache")
    .select(
      `id, campaign_id, name, status, effective_status, objective,
       daily_budget, lifetime_budget, ad_account_id, fetched_at,
       campaign_insights (
         impressions, reach, clicks, ctr, cpc, cpm, spend, conversions,
         cost_per_result, frequency, date_start, date_stop, created_at
       )`,
    )
    .eq("id", id)
    .maybeSingle();

  if (!campaign) notFound();

  const { data: account } = await supabase
    .from("meta_ad_accounts")
    .select("currency")
    .eq("id", (campaign as any).ad_account_id)
    .maybeSingle();
  const currency = account?.currency ?? null;

  const insights = ((campaign as any).campaign_insights ?? []).sort(
    (a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];

  const [{ data: analyses }, { data: recs }] = await Promise.all([
    supabase
      .from("ai_analysis")
      .select("id, model, summary, created_at, nivel_urgencia")
      .eq("campaign_cache_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("recommendations")
      .select("*")
      .eq("campaign_cache_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const latestAnalysis = analyses?.[0];

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/campaigns?account=${(campaign as any).ad_account_id}`}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a campañas
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {campaign.name || campaign.campaign_id}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <Badge
              tone={
                (campaign.effective_status ?? campaign.status) === "ACTIVE"
                  ? "success"
                  : "warning"
              }
            >
              {statusLabelEs(campaign.effective_status ?? campaign.status)}
            </Badge>
            <span>· {objectiveLabel(campaign.objective)}</span>
          </div>
        </div>
        <AnalyzeButton campaignCacheId={campaign.id} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Gasto"
          value={formatMoney(insights?.spend, currency)}
        />
        <MetricCard
          label="Impresiones"
          value={formatNumber(insights?.impressions)}
        />
        <MetricCard
          label="Alcance"
          value={formatNumber(insights?.reach)}
        />
        <MetricCard label="Clics" value={formatNumber(insights?.clicks)} />
        <MetricCard label="CTR" value={formatPercent(insights?.ctr)} />
        <MetricCard
          label="CPC"
          value={formatMoney(insights?.cpc, currency)}
        />
        <MetricCard
          label="CPM"
          value={formatMoney(insights?.cpm, currency)}
        />
        <MetricCard
          label="Frecuencia"
          value={formatNumber(insights?.frequency, {
            maximumFractionDigits: 2,
          })}
        />
        <MetricCard
          label="Conversiones"
          value={formatNumber(insights?.conversions)}
        />
        <MetricCard
          label="Coste/resultado"
          value={formatMoney(insights?.cost_per_result, currency)}
        />
        <MetricCard
          label="Presup. diario"
          value={formatMoney(fromMetaBudget(campaign.daily_budget), currency)}
        />
        <MetricCard
          label="Presup. total"
          value={formatMoney(
            fromMetaBudget(campaign.lifetime_budget),
            currency,
          )}
        />
      </div>

      {!insights && (
        <EmptyState
          title="Sin métricas todavía"
          description="Sincroniza esta cuenta de campañas para traer insights y luego analiza con IA."
        />
      )}

      {latestAnalysis?.summary ? (
        <AiAnalysisPanel
          result={latestAnalysis.summary as AiAnalysisResult}
          model={latestAnalysis.model}
          createdAt={latestAnalysis.created_at}
        />
      ) : (
        <Card>
          <CardHeader title="Análisis de IA" />
          <CardBody>
            <EmptyState
              title="Aún no analizada"
              description="Pulsa «Analizar con IA» para obtener diagnóstico y recomendaciones."
            />
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader
          title="💬 Chat con IA sobre esta campaña"
          subtitle={`El asistente responde solo sobre «${
            campaign.name || campaign.campaign_id
          }». Al abrir otra campaña, el chat será el de esa.`}
        />
        <CardBody>
          <CampaignChat
            campaignCacheId={campaign.id}
            campaignName={campaign.name || campaign.campaign_id}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Anuncios y creativos"
          subtitle="Artes gráficos y preview real en Escritorio, Móvil e Instagram"
        />
        <CardBody>
          <AdsExplorer campaignCacheId={campaign.id} />
        </CardBody>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Recomendaciones de esta campaña
        </h2>
        {recs && recs.length > 0 ? (
          <div className="space-y-4">
            {(recs as Recommendation[]).map((r) => (
              <RecommendationCard key={r.id} rec={r} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Sin recomendaciones"
            description="Las recomendaciones aparecerán aquí tras analizar la campaña."
          />
        )}
      </div>
    </div>
  );
}
