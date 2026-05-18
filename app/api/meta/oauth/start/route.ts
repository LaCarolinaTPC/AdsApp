import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { assertMetaConfigured } from "@/lib/env";
import { buildAuthorizationUrl } from "@/lib/meta/oauth";

export const dynamic = "force-dynamic";

/**
 * Inicia el flujo OAuth de Meta. Requiere usuario autenticado para
 * poder asociar la conexión a su cuenta SaaS. Guarda un `state`
 * anti-CSRF en cookie httpOnly.
 */
export async function GET() {
  try {
    assertMetaConfigured();
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(
      new URL("/login", process.env.NEXT_PUBLIC_APP_URL),
    );
  }

  const state = crypto.randomBytes(24).toString("hex");
  const authUrl = buildAuthorizationUrl(state);

  const res = NextResponse.redirect(authUrl);
  res.cookies.set("meta_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
