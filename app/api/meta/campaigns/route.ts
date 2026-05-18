import { NextResponse } from "next/server";
import { requireUserApi, apiError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveConnection, markConnectionExpired } from "@/lib/meta/connection";
import {
  getCampaigns,
  getCampaignInsights,
  normalizeInsights,
  MetaApiException,
} from "@/lib/meta/client";
import { logAction } from "@/lib/log";

export const dynamic = "force-dynamic";

/**
 * Campañas + métricas de una cuenta publicitaria.
 *  GET ?adAccountId=<uuid de meta_ad_accounts>&refresh=1
 *
 * Sin refresh: lee caché. Con refresh: consulta Meta, guarda
 * campaigns_cache + campaign_insights y devuelve datos frescos.
 */
export async function GET(request: Request) {
  const auth = await requireUserApi();
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const adAccountUuid = url.searchParams.get("adAccountId");
  const refresh = url.searchParams.get("refresh") === "1";
  if (!adAccountUuid) return apiError("Falta adAccountId", 400);

  const admin = createAdminClient();

  // Verifica pertenencia de la cuenta al usuario
  const { data: account } = await admin
    .from("meta_ad_accounts")
    .select("id, account_id, currency")
    .eq("id", adAccountUuid)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!account) return apiError("Cuenta no encontrada", 404);

  if (refresh) {
    const conn = await resolveConnection(auth.user.id);
    if (!conn) return apiError("Sin conexión activa de Meta", 409);
    if (conn.isExpired) {
      await markConnectionExpired(conn.id);
      return apiError("Token de Meta expirado. Reconecta tu cuenta.", 401);
    }

    try {
      const campaigns = await getCampaigns(
        conn.accessToken,
        account.account_id,
      );

      for (const c of campaigns) {
        const { data: cached } = await admin
          .from("campaigns_cache")
          .upsert(
            {
              user_id: auth.user.id,
              ad_account_id: account.id,
              campaign_id: c.id,
              name: c.name,
              status: c.status,
              effective_status: c.effective_status ?? c.status,
              objective: c.objective ?? null,
              daily_budget: c.daily_budget ? Number(c.daily_budget) : null,
              lifetime_budget: c.lifetime_budget
                ? Number(c.lifetime_budget)
                : null,
              raw: c,
              fetched_at: new Date().toISOString(),
            },
            { onConflict: "ad_account_id,campaign_id" },
          )
          .select("id")
          .single();

        if (!cached) continue;

        try {
          const rawInsights = await getCampaignInsights(
            conn.accessToken,
            c.id,
          );
          const m = normalizeInsights(rawInsights);
          if (m) {
            await admin.from("campaign_insights").insert({
              user_id: auth.user.id,
              campaign_cache_id: cached.id,
              date_start: m.date_start,
              date_stop: m.date_stop,
              impressions: m.impressions,
              reach: m.reach,
              clicks: m.clicks,
              ctr: m.ctr,
              cpc: m.cpc,
              cpm: m.cpm,
              spend: m.spend,
              conversions: m.conversions,
              cost_per_result: m.cost_per_result,
              frequency: m.frequency,
              raw: rawInsights,
            });
          }
        } catch (insErr) {
          // Insights por campaña pueden fallar individualmente; seguimos.
          console.error("[campaigns] insights error", c.id, insErr);
        }
      }

      await logAction({
        userId: auth.user.id,
        action: "meta.sync_campaigns",
        entityType: "ad_account",
        entityId: account.id,
        payload: { count: campaigns.length },
      });
    } catch (e) {
      if (e instanceof MetaApiException && e.isTokenError) {
        await markConnectionExpired(conn.id);
        return apiError("Token de Meta inválido. Reconecta tu cuenta.", 401);
      }
      return apiError((e as Error).message, 502);
    }
  }

  // Devuelve campañas con su insight más reciente
  const { data: campaigns, error } = await admin
    .from("campaigns_cache")
    .select(
      `id, campaign_id, name, status, effective_status, objective,
       daily_budget, lifetime_budget, fetched_at,
       campaign_insights (
         impressions, reach, clicks, ctr, cpc, cpm, spend,
         conversions, cost_per_result, frequency, date_start, date_stop, created_at
       )`,
    )
    .eq("user_id", auth.user.id)
    .eq("ad_account_id", account.id)
    .order("name");

  if (error) return apiError(error.message);

  const shaped = (campaigns ?? []).map((c: any) => {
    const insights = (c.campaign_insights ?? []).sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    const { campaign_insights, ...rest } = c;
    return { ...rest, currency: account.currency, insights: insights[0] ?? null };
  });

  return NextResponse.json({ campaigns: shaped });
}
