import { NextResponse } from "next/server";
import { requireUserApi, apiError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveConnection, markConnectionExpired } from "@/lib/meta/connection";
import { graphUrl } from "@/lib/meta/config";
import {
  getGrantedPermissions,
  canWrite,
  writeActionsEnabled,
} from "@/lib/meta/permissions";
import {
  updateCampaignStatus,
  updateCampaignBudget,
  setAdSetStatus,
  setAdStatus,
  duplicateCampaign,
  WriteActionsDisabledError,
} from "@/lib/meta/actions";
import { MetaApiException } from "@/lib/meta/client";
import { logAction } from "@/lib/log";

export const dynamic = "force-dynamic";

type EntityType = "campaign" | "adset" | "ad";
type Action = "pause" | "resume" | "set_daily_budget" | "duplicate";

/** Lee el estado actual de la entidad (para registrar el "antes"). */
async function readEntity(token: string, id: string, fields: string) {
  const r = await fetch(
    `${graphUrl(id)}?fields=${fields}&access_token=${token}`,
    { cache: "no-store" },
  );
  const j = await r.json();
  return r.ok && !j.error ? j : null;
}

/**
 * Acciones de escritura sobre Meta (FASE 2).
 *  POST { entityType, entityId, action, value?, campaignCacheId? }
 *
 * Doble seguro: WRITE_ACTIONS_ENABLED (env) + permiso real
 * ads_management (consultado en vivo). Registra antes/después en
 * action_logs para auditoría y rollback manual.
 */
export async function POST(request: Request) {
  const auth = await requireUserApi();
  if (auth.response) return auth.response;

  let body: {
    entityType?: EntityType;
    entityId?: string;
    action?: Action;
    value?: number;
    campaignCacheId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return apiError("Body inválido", 400);
  }
  const { entityType, entityId, action, value, campaignCacheId } = body;
  if (!entityType || !entityId || !action) {
    return apiError("Faltan entityType, entityId o action", 400);
  }

  if (!writeActionsEnabled()) {
    return apiError(
      "Las acciones de escritura están desactivadas. Configura WRITE_ACTIONS_ENABLED=true en Vercel y haz Redeploy.",
      403,
    );
  }

  const conn = await resolveConnection(auth.user.id);
  if (!conn) return apiError("Sin conexión activa de Meta", 409);
  if (conn.isExpired) {
    await markConnectionExpired(conn.id);
    return apiError("Token de Meta expirado. Reconecta tu cuenta.", 401);
  }

  // Permiso REAL (no el env)
  const permissions = await getGrantedPermissions(conn.accessToken);
  if (!canWrite(permissions)) {
    return apiError(
      "Tu conexión no tiene el permiso ads_management. Reconecta Meta autorizando ese permiso.",
      403,
    );
  }

  const ctx = { accessToken: conn.accessToken, permissions };

  try {
    let before: unknown = null;
    let result: unknown = null;

    if (entityType === "campaign") {
      // Verifica pertenencia por caché
      const admin = createAdminClient();
      const { data: owned } = await admin
        .from("campaigns_cache")
        .select("id")
        .eq("user_id", auth.user.id)
        .eq("campaign_id", entityId)
        .maybeSingle();
      if (!owned) return apiError("Campaña no encontrada", 404);

      before = await readEntity(
        conn.accessToken,
        entityId,
        "status,daily_budget,name",
      );

      if (action === "pause") {
        result = await updateCampaignStatus(ctx, entityId, "PAUSED");
      } else if (action === "resume") {
        result = await updateCampaignStatus(ctx, entityId, "ACTIVE");
      } else if (action === "set_daily_budget") {
        if (!value || value <= 0)
          return apiError("Importe de presupuesto inválido", 400);
        result = await updateCampaignBudget(
          ctx,
          entityId,
          Math.round(value * 100), // a unidad mínima (céntimos)
        );
      } else if (action === "duplicate") {
        result = await duplicateCampaign(ctx, entityId);
      } else {
        return apiError("Acción no soportada para campaña", 400);
      }
    } else if (entityType === "adset") {
      before = await readEntity(conn.accessToken, entityId, "status,name");
      if (action === "pause")
        result = await setAdSetStatus(ctx, entityId, "PAUSED");
      else if (action === "resume")
        result = await setAdSetStatus(ctx, entityId, "ACTIVE");
      else return apiError("Acción no soportada para conjunto", 400);
    } else if (entityType === "ad") {
      before = await readEntity(conn.accessToken, entityId, "status,name");
      if (action === "pause")
        result = await setAdStatus(ctx, entityId, "PAUSED");
      else if (action === "resume")
        result = await setAdStatus(ctx, entityId, "ACTIVE");
      else return apiError("Acción no soportada para anuncio", 400);
    } else {
      return apiError("entityType inválido", 400);
    }

    await logAction({
      userId: auth.user.id,
      action: `meta.write.${entityType}.${action}`,
      entityType,
      entityId,
      payload: { before, value: value ?? null, result, campaignCacheId },
    });

    return NextResponse.json({ ok: true, before, result });
  } catch (e) {
    if (e instanceof WriteActionsDisabledError) {
      return apiError(e.message, 403);
    }
    if (e instanceof MetaApiException && e.isTokenError) {
      await markConnectionExpired(conn.id);
      return apiError("Token de Meta inválido. Reconecta tu cuenta.", 401);
    }
    await logAction({
      userId: auth.user.id,
      action: `meta.write.${entityType}.${action}`,
      entityType,
      entityId,
      status: "error",
      payload: { message: (e as Error).message },
    });
    return apiError((e as Error).message, 502);
  }
}
