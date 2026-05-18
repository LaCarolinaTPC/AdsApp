import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  fetchMetaProfile,
  expiresAtFrom,
} from "@/lib/meta/oauth";
import { getAdAccounts } from "@/lib/meta/client";
import { encryptToken } from "@/lib/meta/crypto";
import { getScopes } from "@/lib/meta/config";
import { logAction } from "@/lib/log";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

function redirectTo(path: string) {
  return NextResponse.redirect(new URL(path, env.appUrl));
}

/**
 * Callback OAuth de Meta:
 *  1. Valida state anti-CSRF
 *  2. Intercambia code → token corto → token largo (~60d)
 *  3. Obtiene perfil y cuentas publicitarias
 *  4. Guarda el token CIFRADO + cuentas, aisladas por user_id
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    return redirectTo(
      `/dashboard/connections?error=${encodeURIComponent(errorParam)}`,
    );
  }

  const cookieState = request.cookies.get("meta_oauth_state")?.value;
  if (!code || !state || !cookieState || state !== cookieState) {
    return redirectTo("/dashboard/connections?error=invalid_state");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirectTo("/login");

  try {
    const shortToken = await exchangeCodeForToken(code);
    const longToken = await exchangeForLongLivedToken(
      shortToken.access_token,
    );
    const profile = await fetchMetaProfile(longToken.access_token);
    const adAccounts = await getAdAccounts(longToken.access_token);

    const admin = createAdminClient();

    // Una sola conexión activa por usuario: revoca las anteriores
    // (no se borran, quedan como histórico).
    await admin
      .from("meta_connections")
      .update({ status: "revoked" })
      .eq("user_id", user.id)
      .eq("status", "active");

    const { data: connection, error: connErr } = await admin
      .from("meta_connections")
      .insert({
        user_id: user.id,
        meta_user_id: profile.id,
        access_token: encryptToken(longToken.access_token),
        token_type: longToken.token_type ?? "bearer",
        token_expires_at: expiresAtFrom(longToken.expires_in),
        scopes: getScopes(),
        status: "active",
      })
      .select("id")
      .single();

    if (connErr || !connection) {
      throw new Error(connErr?.message ?? "No se pudo guardar la conexión");
    }

    // Deduplica por (user_id, account_id): si la cuenta ya existe se
    // ACTUALIZA la misma fila (conserva su id → no rompe
    // campaigns_cache); si no, se inserta. Evita cuentas duplicadas
    // al reconectar.
    for (const a of adAccounts) {
      const { data: existing } = await admin
        .from("meta_ad_accounts")
        .select("id")
        .eq("user_id", user.id)
        .eq("account_id", a.id)
        .maybeSingle();

      const row = {
        user_id: user.id,
        connection_id: connection.id,
        account_id: a.id,
        name: a.name,
        currency: a.currency,
        account_status: a.account_status,
        business_id: a.business?.id ?? null,
        timezone_name: a.timezone_name ?? null,
      };

      if (existing) {
        await admin
          .from("meta_ad_accounts")
          .update(row)
          .eq("id", existing.id);
      } else {
        await admin.from("meta_ad_accounts").insert(row);
      }
    }

    await logAction({
      userId: user.id,
      action: "meta.connect",
      entityType: "connection",
      entityId: connection.id,
      payload: { meta_user_id: profile.id, accounts: adAccounts.length },
    });

    const res = redirectTo("/dashboard/connections?connected=1");
    res.cookies.delete("meta_oauth_state");
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    await logAction({
      userId: user.id,
      action: "meta.connect",
      status: "error",
      payload: { message: msg },
    });
    return redirectTo(
      `/dashboard/connections?error=${encodeURIComponent(msg)}`,
    );
  }
}
