import { env } from "@/lib/env";

export const META_GRAPH = "https://graph.facebook.com";
export const META_OAUTH_DIALOG = "https://www.facebook.com";

export function graphUrl(path: string): string {
  const version = env.meta.apiVersion;
  const clean = path.startsWith("/") ? path.slice(1) : path;
  return `${META_GRAPH}/${version}/${clean}`;
}

/**
 * Scopes por fase.
 *  - MVP (lectura):  ads_read
 *  - Fase 2 (escritura): ads_management, business_management
 *
 * Para activar Fase 2 basta con cambiar META_SCOPES en el entorno a:
 *   ads_read,ads_management,business_management
 * y volver a pasar el flujo OAuth (el usuario re-autoriza).
 */
export const PHASE_2_SCOPES = ["ads_management", "business_management"];

export function getScopes(): string[] {
  return env.meta.scopes
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function hasWriteScope(scopes: string[] | null | undefined): boolean {
  return Boolean(scopes?.includes("ads_management"));
}
