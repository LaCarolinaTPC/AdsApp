import { NextResponse } from "next/server";
import { requireUserApi, apiError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveConnection, markConnectionExpired } from "@/lib/meta/connection";
import {
  getGrantedPermissions,
  canWrite,
  writeActionsEnabled,
} from "@/lib/meta/permissions";
import { createCampaign, WriteActionsDisabledError } from "@/lib/meta/actions";
import { MetaApiException } from "@/lib/meta/client";
import { logAction } from "@/lib/log";

export const dynamic = "force-dynamic";

const OBJECTIVES = [
  "OUTCOME_AWARENESS",
  "OUTCOME_TRAFFIC",
  "OUTCOME_ENGAGEMENT",
  "OUTCOME_LEADS",
  "OUTCOME_SALES",
  "OUTCOME_APP_PROMOTION",
];

/**
 * Crea una campaña nueva (FASE 2). Siempre en PAUSED: no gasta nada
 * hasta que el usuario añada conjuntos/anuncios en Meta.
 *  POST { adAccountId (uuid), name, objective, dailyBudget? }
 */
export async function POST(request: Request) {
  const auth = await requireUserApi();
  if (auth.response) return auth.response;

  let body: {
    adAccountId?: string;
    name?: string;
    objective?: string;
    dailyBudget?: number;
  };
  try {
    body = await request.json();
  } catch {
    return apiError("Body inválido", 400);
  }
  const { adAccountId, name, objective, dailyBudget } = body;
  if (!adAccountId || !name?.trim() || !objective) {
    return apiError("Faltan adAccountId, name u objective", 400);
  }
  if (!OBJECTIVES.includes(objective)) {
    return apiError("Objetivo inválido", 400);
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
    return apiError(
      "Tu conexión no tiene ads_management. Reconecta autorizando ese permiso.",
      403,
    );
  }

  try {
    const result: any = await createCampaign(
      { accessToken: conn.accessToken, permissions },
      account.account_id,
      {
        name: name.trim(),
        objective,
        dailyBudgetCents:
          dailyBudget && dailyBudget > 0
            ? Math.round(dailyBudget * 100)
            : undefined,
      },
    );

    // Refleja la campaña nueva en la caché para que aparezca ya
    if (result?.id) {
      await admin.from("campaigns_cache").upsert(
        {
          user_id: auth.user.id,
          ad_account_id: account.id,
          campaign_id: result.id,
          name: name.trim(),
          status: "PAUSED",
          effective_status: "PAUSED",
          objective,
          daily_budget:
            dailyBudget && dailyBudget > 0
              ? Math.round(dailyBudget * 100)
              : null,
          raw: result,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "ad_account_id,campaign_id" },
      );
    }

    await logAction({
      userId: auth.user.id,
      action: "meta.write.campaign.create",
      entityType: "campaign",
      entityId: result?.id ?? null,
      payload: { name: name.trim(), objective, dailyBudget },
    });

    return NextResponse.json({ ok: true, campaignId: result?.id ?? null });
  } catch (e) {
    if (e instanceof WriteActionsDisabledError)
      return apiError(e.message, 403);
    if (e instanceof MetaApiException && e.isTokenError) {
      await markConnectionExpired(conn.id);
      return apiError("Token de Meta inválido. Reconecta tu cuenta.", 401);
    }
    await logAction({
      userId: auth.user.id,
      action: "meta.write.campaign.create",
      status: "error",
      payload: { message: (e as Error).message },
    });
    return apiError((e as Error).message, 502);
  }
}
