import { NextResponse } from "next/server";
import { requireUserApi, apiError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveConnection, markConnectionExpired } from "@/lib/meta/connection";
import { getCampaignAds, MetaApiException } from "@/lib/meta/client";

export const dynamic = "force-dynamic";

/**
 * Anuncios + creativos de una campaña.
 *  GET /api/meta/campaign/<campaignCacheId>/ads
 *
 * Lee en vivo desde Meta (ads_read) los anuncios de la campaña con
 * su creativo (imagen/miniatura/título/copy), agrupados por ad set.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUserApi();
  if (auth.response) return auth.response;

  const { id } = await params;
  const admin = createAdminClient();

  // Verifica que la campaña pertenece al usuario
  const { data: campaign } = await admin
    .from("campaigns_cache")
    .select("campaign_id, name")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!campaign) return apiError("Campaña no encontrada", 404);

  const conn = await resolveConnection(auth.user.id);
  if (!conn) return apiError("Sin conexión activa de Meta", 409);
  if (conn.isExpired) {
    await markConnectionExpired(conn.id);
    return apiError("Token de Meta expirado. Reconecta tu cuenta.", 401);
  }

  try {
    const ads = await getCampaignAds(conn.accessToken, campaign.campaign_id);

    // Agrupa por ad set
    const groups = new Map<
      string,
      { adset_id: string; adset_name: string; ads: typeof ads }
    >();
    for (const ad of ads) {
      const key = ad.adset_id ?? "sin_adset";
      if (!groups.has(key)) {
        groups.set(key, {
          adset_id: key,
          adset_name:
            (ad as any).adset?.name ?? ad.adset_name ?? "Conjunto de anuncios",
          ads: [],
        });
      }
      groups.get(key)!.ads.push(ad);
    }

    return NextResponse.json({
      campaign: { id, name: campaign.name },
      adSets: Array.from(groups.values()),
      totalAds: ads.length,
    });
  } catch (e) {
    if (e instanceof MetaApiException && e.isTokenError) {
      await markConnectionExpired(conn.id);
      return apiError("Token de Meta inválido. Reconecta tu cuenta.", 401);
    }
    return apiError((e as Error).message, 502);
  }
}
