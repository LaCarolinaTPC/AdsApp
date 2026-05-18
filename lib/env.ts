/**
 * Acceso centralizado y validado a variables de entorno.
 * Lanza errores claros en arranque si falta algo crítico.
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(
      `[env] Falta la variable de entorno requerida: ${name}. Revisa tu .env.local`,
    );
  }
  return value;
}

function optional(value: string | undefined, fallback = ""): string {
  return value && value.trim() !== "" ? value : fallback;
}

/**
 * URL pública de la app. Prioridad:
 *  1. NEXT_PUBLIC_APP_URL (explícita — recomendada en producción)
 *  2. URL de producción que Vercel inyecta automáticamente
 *  3. URL del deployment de Vercel (preview)
 *  4. localhost (desarrollo)
 * Así, aunque olvides configurar NEXT_PUBLIC_APP_URL en Vercel, NO
 * redirige a localhost.
 */
function resolveAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    return process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/$/, "");
  }
  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export const env = {
  appUrl: resolveAppUrl(),

  supabase: {
    url: optional(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL,
    ),
    anonKey: optional(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY,
    ),
    serviceRoleKey: optional(process.env.SUPABASE_SERVICE_ROLE_KEY),
  },

  meta: {
    appId: optional(process.env.META_APP_ID),
    appSecret: optional(process.env.META_APP_SECRET),
    // Si no se define explícitamente, se deriva de la URL pública
    // real (Vercel en prod, localhost en dev). Debe coincidir EXACTO
    // con el "Valid OAuth Redirect URI" registrado en Meta.
    redirectUri: optional(
      process.env.META_REDIRECT_URI,
      `${resolveAppUrl()}/api/meta/oauth/callback`,
    ),
    apiVersion: optional(process.env.META_API_VERSION, "v21.0"),
    // MVP solo lectura. Fase 2: añadir ads_management,business_management
    scopes: optional(process.env.META_SCOPES, "ads_read"),
  },

  ai: {
    provider: optional(process.env.AI_PROVIDER, "openai"),
    apiKey: optional(process.env.OPENAI_API_KEY),
    baseUrl: optional(process.env.AI_BASE_URL, "https://api.openai.com/v1"),
    model: optional(process.env.AI_MODEL, "gpt-4o-mini"),
  },

  tokenEncryptionKey: optional(process.env.TOKEN_ENCRYPTION_KEY),
};

/** Lanza error si faltan envs críticas para el flujo de Meta. */
export function assertMetaConfigured() {
  required("META_APP_ID", env.meta.appId);
  required("META_APP_SECRET", env.meta.appSecret);
}

/** Lanza error si faltan envs críticas de Supabase. */
export function assertSupabaseConfigured() {
  required("NEXT_PUBLIC_SUPABASE_URL", env.supabase.url);
  required("NEXT_PUBLIC_SUPABASE_ANON_KEY", env.supabase.anonKey);
}

export function isAiConfigured() {
  return Boolean(env.ai.apiKey);
}
