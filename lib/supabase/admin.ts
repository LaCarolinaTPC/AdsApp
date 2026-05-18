import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Cliente con SERVICE ROLE — ignora RLS.
 * SOLO para uso en backend (route handlers / server actions) en
 * operaciones controladas: guardar tokens cifrados de Meta, escribir
 * caché de campañas, etc. NUNCA importar desde código de cliente.
 */
export function createAdminClient() {
  if (!env.supabase.serviceRoleKey) {
    throw new Error(
      "[supabase] Falta SUPABASE_SERVICE_ROLE_KEY para operaciones de servidor.",
    );
  }
  return createSupabaseClient(env.supabase.url, env.supabase.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
