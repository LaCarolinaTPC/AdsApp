import { NextResponse } from "next/server";
import { requireUserApi, apiError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Lista las recomendaciones del usuario. ?status= y ?campaignCacheId= opcionales. */
export async function GET(request: Request) {
  const auth = await requireUserApi();
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const campaignCacheId = url.searchParams.get("campaignCacheId");

  const admin = createAdminClient();
  let query = admin
    .from("recommendations")
    .select("*")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (campaignCacheId) query = query.eq("campaign_cache_id", campaignCacheId);

  const { data, error } = await query;
  if (error) return apiError(error.message);
  return NextResponse.json({ recommendations: data ?? [] });
}
