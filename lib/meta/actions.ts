/**
 * ═════════════════════════════════════════════════════════════════
 *  ACCIONES DE ESCRITURA SOBRE META ADS — FASE 2 (BLOQUEADAS EN MVP)
 * ═════════════════════════════════════════════════════════════════
 *
 *  Estas funciones modificarían campañas reales vía Meta Marketing
 *  API. En el MVP están IMPLEMENTADAS pero protegidas por un guard
 *  que las impide ejecutarse hasta que:
 *
 *    1. META_SCOPES incluya `ads_management`
 *    2. La conexión del usuario tenga ese scope concedido
 *    3. WRITE_ACTIONS_ENABLED === true (flag explícito)
 *
 *  ─── Cómo activar Fase 2 ────────────────────────────────────────
 *   a) Cambiar META_SCOPES=ads_read,ads_management,business_management
 *   b) El usuario vuelve a pasar el flujo OAuth (re-autoriza permisos)
 *   c) Poner WRITE_ACTIONS_ENABLED=true
 *   d) Mostrar botón "Aceptar y aplicar en Meta Ads" en el frontend
 *   e) Antes de cada cambio sensible: confirmación explícita del user
 *   f) Registrar en action_logs payload "antes" y "después" (rollback)
 * ═════════════════════════════════════════════════════════════════
 */

import { graphUrl } from "./config";
import { MetaApiException } from "./client";

/** Flag global de seguridad. En MVP NUNCA debe ser true. */
const WRITE_ACTIONS_ENABLED = process.env.WRITE_ACTIONS_ENABLED === "true";

export class WriteActionsDisabledError extends Error {
  constructor() {
    super(
      "Las acciones de escritura están deshabilitadas en esta versión (MVP solo lectura). " +
        "Se requiere el permiso ads_management y activar WRITE_ACTIONS_ENABLED. Ver lib/meta/actions.ts",
    );
    this.name = "WriteActionsDisabledError";
  }
}

function guard(scopes: string[]) {
  if (!WRITE_ACTIONS_ENABLED) throw new WriteActionsDisabledError();
  if (!scopes.includes("ads_management")) {
    throw new WriteActionsDisabledError();
  }
}

interface ActionCtx {
  accessToken: string;
  scopes: string[];
}

async function metaPost(
  path: string,
  accessToken: string,
  body: Record<string, string>,
) {
  const res = await fetch(graphUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...body, access_token: accessToken }),
  });
  const json = await res.json();
  if (!res.ok || json?.error) {
    const err = json?.error ?? {};
    throw new MetaApiException(
      err.message ?? "Meta write error",
      err.code ?? res.status,
      err.error_subcode,
    );
  }
  return json;
}

// ─── API pública (protegida) ─────────────────────────────────────

export async function pauseCampaign(ctx: ActionCtx, campaignId: string) {
  guard(ctx.scopes);
  return metaPost(campaignId, ctx.accessToken, { status: "PAUSED" });
}

export async function updateCampaignStatus(
  ctx: ActionCtx,
  campaignId: string,
  status: "ACTIVE" | "PAUSED",
) {
  guard(ctx.scopes);
  return metaPost(campaignId, ctx.accessToken, { status });
}

export async function updateCampaignBudget(
  ctx: ActionCtx,
  campaignId: string,
  dailyBudgetCents: number,
) {
  guard(ctx.scopes);
  return metaPost(campaignId, ctx.accessToken, {
    daily_budget: String(dailyBudgetCents),
  });
}

export async function pauseAdSet(ctx: ActionCtx, adSetId: string) {
  guard(ctx.scopes);
  return metaPost(adSetId, ctx.accessToken, { status: "PAUSED" });
}

export async function updateAdSetBudget(
  ctx: ActionCtx,
  adSetId: string,
  dailyBudgetCents: number,
) {
  guard(ctx.scopes);
  return metaPost(adSetId, ctx.accessToken, {
    daily_budget: String(dailyBudgetCents),
  });
}

export async function pauseAd(ctx: ActionCtx, adId: string) {
  guard(ctx.scopes);
  return metaPost(adId, ctx.accessToken, { status: "PAUSED" });
}

export async function duplicateCampaign(ctx: ActionCtx, campaignId: string) {
  guard(ctx.scopes);
  return metaPost(`${campaignId}/copies`, ctx.accessToken, {
    deep_copy: "true",
    status_option: "PAUSED",
  });
}

export const WRITE_ACTIONS = {
  pauseCampaign,
  updateCampaignStatus,
  updateCampaignBudget,
  pauseAdSet,
  updateAdSetBudget,
  pauseAd,
  duplicateCampaign,
};
