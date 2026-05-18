import { createAdminClient } from "@/lib/supabase/admin";

interface LogInput {
  userId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  status?: "ok" | "error";
}

/**
 * Registro básico de acciones (auditoría). Base para el rollback /
 * historial de cambios de la Fase 2. No lanza si falla el log.
 */
export async function logAction(input: LogInput): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("action_logs").insert({
      user_id: input.userId,
      action: input.action,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      payload: input.payload ?? null,
      status: input.status ?? "ok",
    });
  } catch (e) {
    console.error("[log] No se pudo registrar la acción:", e);
  }
}
