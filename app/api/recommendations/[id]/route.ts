import { NextResponse } from "next/server";
import { requireUserApi, apiError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAction } from "@/lib/log";
import type { RecommendationStatus } from "@/types";

export const dynamic = "force-dynamic";

const ALLOWED: RecommendationStatus[] = [
  "pending",
  "accepted_manual",
  "rejected",
  "applied_future",
];

/**
 * Cambia el estado de una recomendación.
 *  PATCH { status: "accepted_manual" | "rejected" | ... }
 *
 * En el MVP NO se aplica nada en Meta. Solo se actualiza el estado
 * y se guarda historial en action_logs.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUserApi();
  if (auth.response) return auth.response;

  const { id } = await params;
  let body: { status?: RecommendationStatus };
  try {
    body = await request.json();
  } catch {
    return apiError("Body inválido", 400);
  }

  if (!body.status || !ALLOWED.includes(body.status)) {
    return apiError("Estado inválido", 400);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("recommendations")
    .update({ status: body.status })
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .select("*")
    .maybeSingle();

  if (error) return apiError(error.message);
  if (!data) return apiError("Recomendación no encontrada", 404);

  await logAction({
    userId: auth.user.id,
    action: `recommendation.${body.status}`,
    entityType: "recommendation",
    entityId: id,
    payload: { title: data.title, campaign_id: data.campaign_id },
  });

  return NextResponse.json({ recommendation: data });
}
