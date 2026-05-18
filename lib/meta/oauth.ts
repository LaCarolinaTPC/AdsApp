import { env } from "@/lib/env";
import { META_OAUTH_DIALOG, graphUrl, getScopes } from "./config";
import type { MetaTokenResponse } from "@/types/meta";

/** URL del diálogo de autorización de Meta/Facebook Login for Business. */
export function buildAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.meta.appId,
    redirect_uri: env.meta.redirectUri,
    state,
    scope: getScopes().join(","),
    response_type: "code",
  });
  return `${META_OAUTH_DIALOG}/${env.meta.apiVersion}/dialog/oauth?${params}`;
}

/** Intercambia el `code` por un token de corta duración. */
export async function exchangeCodeForToken(
  code: string,
): Promise<MetaTokenResponse> {
  const params = new URLSearchParams({
    client_id: env.meta.appId,
    client_secret: env.meta.appSecret,
    redirect_uri: env.meta.redirectUri,
    code,
  });
  const res = await fetch(`${graphUrl("oauth/access_token")}?${params}`);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      `[meta-oauth] Error intercambiando code: ${
        json?.error?.message ?? res.statusText
      }`,
    );
  }
  return json as MetaTokenResponse;
}

/** Convierte un token de corta duración en uno de larga duración (~60 días). */
export async function exchangeForLongLivedToken(
  shortLivedToken: string,
): Promise<MetaTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: env.meta.appId,
    client_secret: env.meta.appSecret,
    fb_exchange_token: shortLivedToken,
  });
  const res = await fetch(`${graphUrl("oauth/access_token")}?${params}`);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      `[meta-oauth] Error obteniendo long-lived token: ${
        json?.error?.message ?? res.statusText
      }`,
    );
  }
  return json as MetaTokenResponse;
}

export interface MetaProfile {
  id: string;
  name?: string;
  email?: string;
}

/** Datos básicos del usuario de Meta autenticado. */
export async function fetchMetaProfile(
  accessToken: string,
): Promise<MetaProfile> {
  const params = new URLSearchParams({
    fields: "id,name,email",
    access_token: accessToken,
  });
  const res = await fetch(`${graphUrl("me")}?${params}`);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      `[meta-oauth] Error obteniendo perfil: ${
        json?.error?.message ?? res.statusText
      }`,
    );
  }
  return json as MetaProfile;
}

export function expiresAtFrom(expiresIn?: number): string | null {
  if (!expiresIn) return null;
  return new Date(Date.now() + expiresIn * 1000).toISOString();
}
