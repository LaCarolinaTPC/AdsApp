import { NextResponse } from "next/server";
import { requireUserApi, apiError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { chatWithAI, type ChatMessage } from "@/lib/ai/provider";
import { objectiveLabel, statusLabelEs } from "@/lib/meta/labels";
import { logAction } from "@/lib/log";

export const dynamic = "force-dynamic";

const MAX_HISTORY = 20;

/** Verifica que la campaña es del usuario y devuelve sus datos + contexto. */
async function loadCampaign(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  campaignCacheId: string,
) {
  const { data: campaign } = await admin
    .from("campaigns_cache")
    .select(
      `id, campaign_id, name, status, effective_status, objective,
       daily_budget, lifetime_budget, ad_account_id,
       campaign_insights (
         impressions, reach, clicks, ctr, cpc, cpm, spend,
         conversions, cost_per_result, frequency, created_at
       )`,
    )
    .eq("id", campaignCacheId)
    .eq("user_id", userId)
    .maybeSingle();
  return campaign;
}

/** GET /api/ai/chat?campaignCacheId=... → historial del chat. */
export async function GET(request: Request) {
  const auth = await requireUserApi();
  if (auth.response) return auth.response;

  const id = new URL(request.url).searchParams.get("campaignCacheId");
  if (!id) return apiError("Falta campaignCacheId", 400);

  const admin = createAdminClient();
  const campaign = await loadCampaign(admin, auth.user.id, id);
  if (!campaign) return apiError("Campaña no encontrada", 404);

  const { data: messages } = await admin
    .from("ai_chat_messages")
    .select("id, role, content, created_at")
    .eq("user_id", auth.user.id)
    .eq("campaign_cache_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    messages: messages ?? [],
    campaignName: campaign.name,
  });
}

/** POST { campaignCacheId, message } → respuesta de la IA (solo de esa campaña). */
export async function POST(request: Request) {
  const auth = await requireUserApi();
  if (auth.response) return auth.response;

  let body: { campaignCacheId?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return apiError("Body inválido", 400);
  }
  const { campaignCacheId, message } = body;
  if (!campaignCacheId || !message?.trim()) {
    return apiError("Falta campaignCacheId o message", 400);
  }
  if (message.length > 2000) {
    return apiError("Mensaje demasiado largo (máx. 2000)", 400);
  }

  const admin = createAdminClient();
  const campaign = await loadCampaign(admin, auth.user.id, campaignCacheId);
  if (!campaign) return apiError("Campaña no encontrada", 404);

  // Contexto: métricas más recientes
  const insight = ((campaign as any).campaign_insights ?? []).sort(
    (a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];

  const { data: acct } = await admin
    .from("meta_ad_accounts")
    .select("currency")
    .eq("id", (campaign as any).ad_account_id)
    .maybeSingle();

  const { data: lastAnalysis } = await admin
    .from("ai_analysis")
    .select("diagnostico, nivel_urgencia")
    .eq("campaign_cache_id", campaignCacheId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: recs } = await admin
    .from("recommendations")
    .select("title, status")
    .eq("campaign_cache_id", campaignCacheId)
    .order("created_at", { ascending: false })
    .limit(8);

  const cur = acct?.currency ?? "";
  const m = insight;
  const contextBlock = `DATOS DE LA CAMPAÑA (única sobre la que puedes responder):
- Nombre: ${campaign.name ?? campaign.campaign_id}
- ID Meta: ${campaign.campaign_id}
- Estado: ${statusLabelEs(campaign.effective_status ?? campaign.status)}
- Objetivo: ${objectiveLabel(campaign.objective)}
- Presupuesto diario: ${campaign.daily_budget ? campaign.daily_budget / 100 : "n/d"} ${cur}
- Presupuesto total: ${campaign.lifetime_budget ? campaign.lifetime_budget / 100 : "n/d"} ${cur}
MÉTRICAS (últimos 30 días):
- Impresiones: ${m?.impressions ?? "n/d"} · Alcance: ${m?.reach ?? "n/d"} · Clics: ${m?.clicks ?? "n/d"}
- CTR: ${m?.ctr ?? "n/d"}% · CPC: ${m?.cpc ?? "n/d"} ${cur} · CPM: ${m?.cpm ?? "n/d"} ${cur}
- Gasto: ${m?.spend ?? "n/d"} ${cur} · Frecuencia: ${m?.frequency ?? "n/d"}
- Conversiones: ${m?.conversions ?? "n/d"} · Coste/resultado: ${m?.cost_per_result ?? "n/d"} ${cur}
${lastAnalysis ? `ÚLTIMO ANÁLISIS IA: ${lastAnalysis.diagnostico} (urgencia: ${lastAnalysis.nivel_urgencia})` : "Aún no se ha hecho análisis IA de esta campaña."}
${recs?.length ? `RECOMENDACIONES: ${recs.map((r) => `${r.title} [${r.status}]`).join("; ")}` : ""}`;

  const system = `Eres un consultor senior de Meta Ads (Facebook/Instagram Ads).
Respondes EXCLUSIVAMENTE sobre la campaña descrita abajo. Si el usuario
pregunta por otra campaña, por la cuenta en general, o por temas ajenos,
acláralo amablemente y reconduce a ESTA campaña. Usa los datos dados;
no inventes métricas. Responde en español, claro, concreto y accionable.
Si faltan datos, dilo y sugiere sincronizar o analizar la campaña.

${contextBlock}`;

  // Historial previo (para contexto conversacional)
  const { data: prior } = await admin
    .from("ai_chat_messages")
    .select("role, content, created_at")
    .eq("user_id", auth.user.id)
    .eq("campaign_cache_id", campaignCacheId)
    .order("created_at", { ascending: false })
    .limit(MAX_HISTORY);

  const history: ChatMessage[] = (prior ?? [])
    .reverse()
    .map((p) => ({ role: p.role as "user" | "assistant", content: p.content }));
  history.push({ role: "user", content: message.trim() });

  try {
    const { reply, model, mocked } = await chatWithAI(system, history);

    // Persiste pregunta + respuesta
    await admin.from("ai_chat_messages").insert([
      {
        user_id: auth.user.id,
        campaign_cache_id: campaignCacheId,
        role: "user",
        content: message.trim(),
      },
      {
        user_id: auth.user.id,
        campaign_cache_id: campaignCacheId,
        role: "assistant",
        content: reply,
      },
    ]);

    await logAction({
      userId: auth.user.id,
      action: "ai.chat",
      entityType: "campaign",
      entityId: campaignCacheId,
      payload: { model, mocked },
    });

    return NextResponse.json({ reply, mocked });
  } catch (e) {
    return apiError((e as Error).message, 502);
  }
}
