import { graphUrl } from "./config";

/**
 * Permisos REALES concedidos por Meta para un token.
 * Fuente de verdad para Fase 2 (en Login for Business los permisos
 * vienen de la Configuración, no de META_SCOPES).
 */
export async function getGrantedPermissions(
  accessToken: string,
): Promise<string[]> {
  const params = new URLSearchParams({ access_token: accessToken });
  const res = await fetch(`${graphUrl("me/permissions")}?${params}`, {
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || json?.error) {
    return [];
  }
  return (json.data ?? [])
    .filter((p: { status: string }) => p.status === "granted")
    .map((p: { permission: string }) => p.permission);
}

export function canWrite(permissions: string[]): boolean {
  return permissions.includes("ads_management");
}

/** Master switch del servidor (env). En Fase 2 debe ser "true". */
export function writeActionsEnabled(): boolean {
  return process.env.WRITE_ACTIONS_ENABLED === "true";
}
