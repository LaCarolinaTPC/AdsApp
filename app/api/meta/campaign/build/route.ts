import { NextResponse } from "next/server";
import { requireUserApi, apiError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveConnection, markConnectionExpired } from "@/lib/meta/connection";
import {
  getGrantedPermissions,
  canWrite,
  writeActionsEnabled,
} from "@/lib/meta/permissions";
import {
  createCampaign,
  createAdSet,
  createAdCreative,
  createAd,
  WriteActionsDisabledError,
} from "@/lib/meta/actions";
import { MetaApiException } from "@/lib/meta/client";
import { logAction } from "@/lib/log";

export const dynamic = "force-dynamic";

/**
 * Asistente: crea Campaña → Conjunto → (Anuncio si hay página).
 * Objetivo soportado en esta versión: OUTCOME_TRAFFIC.
 * TODO se crea en PAUSED (no gasta nada hasta activarlo en Meta).
 *
 * Meta no es transaccional: si un paso falla, se devuelve lo ya
 * creado (todo PAUSED, sin riesgo de gasto) para poder continuar.
 */
export async function POST(request: Request) {
  const auth = await requireUserApi();
  if (auth.response) return auth.response;

  let b: any;
  try {
    b = await request.json();
  } catch {
    return apiError("Body inválido", 400);
  }

  const { adAccountId, campaign, adset, ad } = b ?? {};
  if (!adAccountId || !campaign?.name || !adset?.name) {
    return apiError("Faltan datos de campaña o conjunto", 400);
  }
  if (!adset.countries?.length) {
    return apiError("Selecciona al menos un país de segmentación", 400);
  }

  if (!writeActionsEnabled()) {
    return apiError(
      "Acciones de escritura desactivadas. Configura WRITE_ACTIONS_ENABLED=true en Vercel y Redeploy.",
      403,
    );
  }

  const admin = createAdminClient();
  const { data: account } = await admin
    .from("meta_ad_accounts")
    .select("id, account_id")
    .eq("id", adAccountId)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!account) return apiError("Cuenta publicitaria no encontrada", 404);

  const conn = await resolveConnection(auth.user.id);
  if (!conn) return apiError("Sin conexión activa de Meta", 409);
  if (conn.isExpired) {
    await markConnectionExpired(conn.id);
    return apiError("Token de Meta expirado. Reconecta tu cuenta.", 401);
  }

  const permissions = await getGrantedPermissions(conn.accessToken);
  if (!canWrite(permissions)) {
    return apiError("Tu conexión no tiene ads_management.", 403);
  }

  const ctx = { accessToken: conn.accessToken, permissions };
  const created: {
    campaignId?: string;
    adSetId?: string;
    creativeId?: string;
    adId?: string;
  } = {};

  try {
    // 1) Campaña (Tráfico, PAUSED)
    const campRes: any = await createCampaign(ctx, account.account_id, {
      name: campaign.name,
      objective: "OUTCOME_TRAFFIC",
      dailyBudgetCents: campaign.dailyBudget
        ? Math.round(campaign.dailyBudget * 100)
        : undefined,
    });
    created.campaignId = campRes?.id;

    // 2) Conjunto de anuncios (PAUSED)
    const adSetRes: any = await createAdSet(ctx, account.account_id, {
      campaignId: created.campaignId!,
      name: adset.name,
      optimizationGoal: "LINK_CLICKS",
      billingEvent: "IMPRESSIONS",
      dailyBudgetCents:
        !campaign.dailyBudget && adset.dailyBudget
          ? Math.round(adset.dailyBudget * 100)
          : undefined,
      countries: adset.countries,
      ageMin: adset.ageMin,
      ageMax: adset.ageMax,
      genders: adset.genders,
      startTime: adset.startTime || undefined,
      endTime: adset.endTime || undefined,
    });
    created.adSetId = adSetRes?.id;

    // 3) Anuncio (solo si hay página + permiso)
    if (ad?.pageId && ad?.link) {
      const creativeRes: any = await createAdCreative(
        ctx,
        account.account_id,
        {
          pageId: ad.pageId,
          link: ad.link,
          message: ad.message ?? "",
          headline: ad.headline,
          description: ad.description,
          imageUrl: ad.imageUrl,
          ctaType: ad.cta || "LEARN_MORE",
          name: `${campaign.name} - creativo`,
        },
      );
      created.creativeId = creativeRes?.id;

      const adRes: any = await createAd(ctx, account.account_id, {
        name: ad.name || `${campaign.name} - anuncio`,
        adSetId: created.adSetId!,
        creativeId: created.creativeId!,
      });
      created.adId = adRes?.id;
    }

    // Refleja la campaña en la caché
    if (created.campaignId) {
      await admin.from("campaigns_cache").upsert(
        {
          user_id: auth.user.id,
          ad_account_id: account.id,
          campaign_id: created.campaignId,
          name: campaign.name,
          status: "PAUSED",
          effective_status: "PAUSED",
          objective: "OUTCOME_TRAFFIC",
          daily_budget: campaign.dailyBudget
            ? Math.round(campaign.dailyBudget * 100)
            : null,
          raw: { built: true, created },
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "ad_account_id,campaign_id" },
      );
    }

    await logAction({
      userId: auth.user.id,
      action: "meta.write.campaign.build",
      entityType: "campaign",
      entityId: created.campaignId,
      payload: { created, objective: "OUTCOME_TRAFFIC" },
    });

    return NextResponse.json({ ok: true, created });
  } catch (e) {
    if (e instanceof WriteActionsDisabledError)
      return apiError(e.message, 403);
    if (e instanceof MetaApiException && e.isTokenError) {
      await markConnectionExpired(conn.id);
      return apiError("Token de Meta inválido. Reconecta tu cuenta.", 401);
    }
    await logAction({
      userId: auth.user.id,
      action: "meta.write.campaign.build",
      status: "error",
      payload: { created, message: (e as Error).message },
    });
    // Devuelve lo creado (todo PAUSED) + el error del paso que falló
    return NextResponse.json(
      {
        ok: false,
        created,
        error: `Se creó hasta: ${
          Object.keys(created).join(", ") || "nada"
        }. Falló: ${(e as Error).message}`,
      },
      { status: 502 },
    );
  }
}
