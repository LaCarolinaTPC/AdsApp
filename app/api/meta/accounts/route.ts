import { NextResponse } from "next/server";
import { requireUserApi, apiError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveConnection, markConnectionExpired } from "@/lib/meta/connection";
import { getAdAccounts, MetaApiException } from "@/lib/meta/client";

export const dynamic = "force-dynamic";

/**
 * Lista las cuentas publicitarias del usuario.
 * - ?refresh=1 → vuelve a consultar la Meta API y refresca la caché.
 * - por defecto → lee de la base de datos (rápido, sin rate limit).
 */
export async function GET(request: Request) {
  const auth = await requireUserApi();
  if (auth.response) return auth.response;

  const refresh = new URL(request.url).searchParams.get("refresh") === "1";
  const admin = createAdminClient();

  if (refresh) {
    const conn = await resolveConnection(auth.user.id);
    if (!conn) return apiError("Sin conexión activa de Meta", 409);
    if (conn.isExpired) {
      await markConnectionExpired(conn.id);
      return apiError("Token de Meta expirado. Reconecta tu cuenta.", 401);
    }
    try {
      const accounts = await getAdAccounts(conn.accessToken);
      if (accounts.length > 0) {
        await admin.from("meta_ad_accounts").upsert(
          accounts.map((a) => ({
            user_id: auth.user.id,
            connection_id: conn.id,
            account_id: a.id,
            name: a.name,
            currency: a.currency,
            account_status: a.account_status,
            business_id: a.business?.id ?? null,
            timezone_name: a.timezone_name ?? null,
          })),
          { onConflict: "connection_id,account_id" },
        );
      }
    } catch (e) {
      if (e instanceof MetaApiException && e.isTokenError) {
        await markConnectionExpired(conn.id);
        return apiError("Token de Meta inválido. Reconecta tu cuenta.", 401);
      }
      return apiError((e as Error).message, 502);
    }
  }

  const { data, error } = await admin
    .from("meta_ad_accounts")
    .select(
      "id, account_id, name, currency, account_status, business_id, timezone_name",
    )
    .eq("user_id", auth.user.id)
    .order("name");

  if (error) return apiError(error.message);
  return NextResponse.json({ accounts: data ?? [] });
}
