import { NextResponse } from "next/server";
import { requireUserApi, apiError } from "@/lib/api";
import { resolveConnection, markConnectionExpired } from "@/lib/meta/connection";
import {
  getAdPreview,
  MetaApiException,
  type AdPreviewFormat,
} from "@/lib/meta/client";

export const dynamic = "force-dynamic";

const ALLOWED: AdPreviewFormat[] = [
  "DESKTOP_FEED_STANDARD",
  "MOBILE_FEED_STANDARD",
  "INSTAGRAM_STANDARD",
  "INSTAGRAM_STORY",
  "FACEBOOK_STORY_MOBILE",
];

/**
 * Preview real del anuncio renderizado por Meta para un dispositivo.
 *  GET /api/meta/ad/<adId>/preview?format=DESKTOP_FEED_STANDARD
 *
 * Meta solo devuelve previews de anuncios que el token del usuario
 * posee → el aislamiento lo garantiza el propio token + ads_read.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ adId: string }> },
) {
  const auth = await requireUserApi();
  if (auth.response) return auth.response;

  const { adId } = await params;
  const format = new URL(request.url).searchParams.get(
    "format",
  ) as AdPreviewFormat | null;

  if (!format || !ALLOWED.includes(format)) {
    return apiError("Formato de preview inválido", 400);
  }

  const conn = await resolveConnection(auth.user.id);
  if (!conn) return apiError("Sin conexión activa de Meta", 409);
  if (conn.isExpired) {
    await markConnectionExpired(conn.id);
    return apiError("Token de Meta expirado. Reconecta tu cuenta.", 401);
  }

  try {
    const html = await getAdPreview(conn.accessToken, adId, format);
    if (!html) return apiError("Sin preview disponible para este anuncio", 404);
    return NextResponse.json({ html, format });
  } catch (e) {
    if (e instanceof MetaApiException && e.isTokenError) {
      await markConnectionExpired(conn.id);
      return apiError("Token de Meta inválido. Reconecta tu cuenta.", 401);
    }
    return apiError((e as Error).message, 502);
  }
}
