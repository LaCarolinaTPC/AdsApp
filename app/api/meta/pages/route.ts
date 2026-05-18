import { NextResponse } from "next/server";
import { requireUserApi, apiError } from "@/lib/api";
import { resolveConnection, markConnectionExpired } from "@/lib/meta/connection";
import { graphUrl } from "@/lib/meta/config";

export const dynamic = "force-dynamic";

/**
 * Páginas de Facebook del usuario (necesarias para crear anuncios).
 * Requiere el permiso pages_show_list en la Configuración de
 * Facebook Login for Business + reconectar.
 */
export async function GET() {
  const auth = await requireUserApi();
  if (auth.response) return auth.response;

  const conn = await resolveConnection(auth.user.id);
  if (!conn) return apiError("Sin conexión activa de Meta", 409);
  if (conn.isExpired) {
    await markConnectionExpired(conn.id);
    return apiError("Token de Meta expirado. Reconecta tu cuenta.", 401);
  }

  const params = new URLSearchParams({
    fields: "id,name",
    limit: "100",
    access_token: conn.accessToken,
  });
  const res = await fetch(`${graphUrl("me/accounts")}?${params}`, {
    cache: "no-store",
  });
  const json = await res.json();

  if (json?.error) {
    // Falta permiso de páginas
    return NextResponse.json({
      pages: [],
      needsPermission: true,
      message: json.error.message,
    });
  }

  const pages = (json.data ?? []).map((p: { id: string; name: string }) => ({
    id: p.id,
    name: p.name,
  }));
  return NextResponse.json({ pages, needsPermission: pages.length === 0 });
}
