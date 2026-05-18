import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAction } from "@/lib/log";

export const dynamic = "force-dynamic";

/** Revoca todas las conexiones de Meta del usuario actual. */
export async function POST() {
  const auth = await requireUserApi();
  if (auth.response) return auth.response;

  const admin = createAdminClient();
  await admin
    .from("meta_connections")
    .update({ status: "revoked" })
    .eq("user_id", auth.user.id);

  await logAction({
    userId: auth.user.id,
    action: "meta.disconnect",
    entityType: "connection",
  });

  return NextResponse.json({ ok: true });
}
