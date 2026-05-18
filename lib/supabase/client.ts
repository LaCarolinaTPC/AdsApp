"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/** Cliente Supabase para componentes de navegador (sesión via cookies). */
export function createClient() {
  return createBrowserClient(env.supabase.url, env.supabase.anonKey);
}
