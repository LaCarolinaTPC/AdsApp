import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken } from "./crypto";

export interface ResolvedConnection {
  id: string;
  metaUserId: string | null;
  accessToken: string; // descifrado, solo en memoria de backend
  scopes: string[];
  status: string;
  expiresAt: string | null;
  isExpired: boolean;
}

/**
 * Recupera la conexión activa de Meta de un usuario, descifra el
 * token y detecta si está expirado. Si no hay conexión, devuelve null.
 *
 * Usa el admin client porque el access_token está cifrado y solo el
 * backend debe poder leerlo. La pertenencia se valida por user_id.
 */
export async function resolveConnection(
  userId: string,
): Promise<ResolvedConnection | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("meta_connections")
    .select(
      "id, meta_user_id, access_token, scopes, status, token_expires_at",
    )
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const isExpired = data.token_expires_at
    ? new Date(data.token_expires_at).getTime() < Date.now()
    : false;

  let accessToken = "";
  try {
    accessToken = decryptToken(data.access_token);
  } catch (e) {
    console.error("[connection] Error descifrando token:", e);
    return null;
  }

  return {
    id: data.id,
    metaUserId: data.meta_user_id,
    accessToken,
    scopes: data.scopes ?? [],
    status: data.status,
    expiresAt: data.token_expires_at,
    isExpired,
  };
}

/** Marca una conexión como expirada (para forzar reconexión). */
export async function markConnectionExpired(connectionId: string) {
  const admin = createAdminClient();
  await admin
    .from("meta_connections")
    .update({ status: "expired" })
    .eq("id", connectionId);
}
