import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

type AuthOk = { user: User; response: null };
type AuthFail = { user: null; response: NextResponse };

/**
 * Auth para Route Handlers: devuelve 401 JSON (no redirige).
 * Garantiza que solo el dueño opere sobre sus propios datos.
 */
export async function requireUserApi(): Promise<AuthOk | AuthFail> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { error: "No autenticado" },
        { status: 401 },
      ),
    };
  }
  return { user, response: null };
}

export function apiError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}
