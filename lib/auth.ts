import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Devuelve el usuario autenticado o redirige a /login. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

/** Devuelve el usuario o null (sin redirigir). */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
