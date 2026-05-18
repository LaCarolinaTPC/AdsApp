import { NextResponse } from "next/server";
import { requireUserApi, apiError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeWithAI } from "@/lib/ai/provider";
import { logAction } from "@/lib/log";

export const dynamic = "force-dynamic";

/**
 * Analiza una campaña con IA.
 *  POST { campaignCacheId: string }
 *
 * Toma la campaña + su insight más reciente de la caché, los envía
 * al proveedor de IA y persiste el análisis + las recomendaciones
 * (status = pending). No modifica nada en Meta.
 */
export async function POST(request: Request) {
  const auth = await requireUserApi();
  if (auth.response) return auth.response;

  let body: { campaignCacheId?: string };
  try {
    body = await request.json();
  } catch {
    return apiError("Body inválido", 400);
  }
  if (!body.campaignCacheId) return apiError("Falta campaignCacheId", 400);

  const admin = createAdminClient();

  const { data: campaign } = await admin
    .from("campaigns_cache")
    .select(
      `id, campaign_id, name, status, objective, daily_budget, lifetime_budget,
       ad_account_id,
       campaign_insights (
         impressions, reach, clicks, ctr, cpc, cpm, spend,
         conversions, cost_per_result, frequency, date_start, date_stop, created_at
       )`,
    )
    .eq("id", body.campaignCacheId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!campaign) return apiError("Campaña no encontrada", 404);

  const { data: acct } = await admin
    .from("meta_ad_accounts")
    .select("currency")
    .eq("id", (campaign as any).ad_account_id)
    .maybeSingle();

  const insights = ((campaign as any).campaign_insights ?? []).sort(
    (a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];

  try {
    const { result, model, raw, mocked } = await analyzeWithAI({
      name: campaign.name ?? "Campaña",
      status: campaign.status,
      objective: campaign.objective,
      daily_budget: campaign.daily_budget,
      lifetime_budget: campaign.lifetime_budget,
      currency: acct?.currency ?? null,
      insights: insights
        ? {
            impressions: Number(insights.impressions ?? 0),
            reach: Number(insights.reach ?? 0),
            clicks: Number(insights.clicks ?? 0),
            ctr: Number(insights.ctr ?? 0),
            cpc: Number(insights.cpc ?? 0),
            cpm: Number(insights.cpm ?? 0),
            spend: Number(insights.spend ?? 0),
            frequency: Number(insights.frequency ?? 0),
            conversions:
              insights.conversions != null
                ? Number(insights.conversions)
                : null,
            cost_per_result:
              insights.cost_per_result != null
                ? Number(insights.cost_per_result)
                : null,
            objective: campaign.objective,
            date_start: insights.date_start,
            date_stop: insights.date_stop,
          }
        : null,
    });

    const { data: analysis, error: aErr } = await admin
      .from("ai_analysis")
      .insert({
        user_id: auth.user.id,
        campaign_cache_id: campaign.id,
        model,
        diagnostico: result.diagnostico_general,
        nivel_urgencia: result.nivel_urgencia,
        summary: result,
        raw_response: raw as any,
      })
      .select("id")
      .single();

    if (aErr || !analysis) throw new Error(aErr?.message ?? "Error guardando análisis");

    if (result.recomendaciones.length > 0) {
      await admin.from("recommendations").insert(
        result.recomendaciones.map((r) => ({
          user_id: auth.user.id,
          campaign_cache_id: campaign.id,
          ai_analysis_id: analysis.id,
          campaign_id: campaign.campaign_id,
          campaign_name: campaign.name,
          recommendation_type: r.recommendation_type,
          title: r.title,
          description: r.description,
          reason: r.reason,
          suggested_action: r.suggested_action,
          risk_level: r.risk_level,
          expected_impact: r.expected_impact,
          priority: r.priority,
          status: "pending",
        })),
      );
    }

    await logAction({
      userId: auth.user.id,
      action: "ai.analyze",
      entityType: "campaign",
      entityId: campaign.id,
      payload: { model, mocked, recs: result.recomendaciones.length },
    });

    return NextResponse.json({
      analysisId: analysis.id,
      result,
      model,
      mocked,
    });
  } catch (e) {
    await logAction({
      userId: auth.user.id,
      action: "ai.analyze",
      status: "error",
      entityId: campaign.id,
      payload: { message: (e as Error).message },
    });
    return apiError((e as Error).message, 502);
  }
}
