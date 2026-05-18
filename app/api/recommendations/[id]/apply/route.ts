import { requireUserApi, apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * ─── FASE 2 (DESHABILITADO EN MVP) ──────────────────────────────
 *
 * Aquí irá "Aceptar y aplicar en Meta Ads": tomará la recomendación,
 * ejecutará la acción correspondiente de lib/meta/actions.ts
 * (pauseCampaign, updateCampaignBudget, ...) y registrará en
 * action_logs el estado "antes/después" para permitir rollback.
 *
 * Requisitos para activarlo:
 *   1. META_SCOPES con ads_management
 *   2. WRITE_ACTIONS_ENABLED=true
 *   3. Confirmación explícita del usuario antes de cambios sensibles
 *
 * En el MVP responde 403 a propósito.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUserApi();
  if (auth.response) return auth.response;
  await params;

  return apiError(
    "Aplicación automática deshabilitada en el MVP. Esta versión solo lee y recomienda. " +
      "Ver lib/meta/actions.ts y README (Fase 2) para activarla.",
    403,
  );
}
