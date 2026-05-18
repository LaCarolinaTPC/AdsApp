// Diagnóstico de conexión Supabase. Uso: node scripts/test-supabase.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Carga simple de .env.local
const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const pub = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const sec = env.SUPABASE_SERVICE_ROLE_KEY;

const ok = (m) => console.log(`✅ ${m}`);
const bad = (m) => console.log(`❌ ${m}`);
const info = (m) => console.log(`ℹ️  ${m}`);

console.log("\n— Diagnóstico Supabase —\n");
console.log("URL:", url);

// 1) Conectividad + Auth (GoTrue)
try {
  const r = await fetch(`${url}/auth/v1/health`, { headers: { apikey: pub } });
  if (r.ok) ok(`Conectividad OK — Auth saludable (${r.status})`);
  else bad(`Auth respondió ${r.status}`);
} catch (e) {
  bad(`No se pudo conectar a ${url}: ${e.message}`);
  process.exit(1);
}

// 2) Publishable key (rol anon, limitado por RLS)
const anon = createClient(url, pub, { auth: { persistSession: false } });
{
  const { error } = await anon.from("users").select("id").limit(1);
  if (!error) ok("Publishable key válida (acceso anon a través de RLS)");
  else if (/does not exist|schema cache|relation/i.test(error.message)) {
    ok("Publishable key válida (autenticó correctamente)");
    info(`Tabla 'users' aún no existe → falta ejecutar database/schema.sql`);
  } else if (/Invalid API key|JWT/i.test(error.message)) {
    bad(`Publishable key inválida: ${error.message}`);
  } else {
    info(`Publishable key autenticó. Detalle: ${error.message}`);
  }
}

// 3) Secret key (service_role, ignora RLS) — validación independiente del esquema
const admin = createClient(url, sec, { auth: { persistSession: false } });
{
  const { data, error } = await admin.auth.admin.listUsers();
  if (!error) ok(`Secret key válida (service_role) — ${data.users.length} usuario(s) en Auth`);
  else bad(`Secret key inválida: ${error.message}`);
}

// 4) ¿Está aplicado el esquema?
{
  const { error } = await admin.from("users").select("id").limit(1);
  if (!error) ok("Esquema aplicado — tabla public.users accesible");
  else if (/does not exist|relation|schema cache/i.test(error.message))
    info("Esquema NO aplicado todavía → ejecuta database/schema.sql en el SQL Editor");
  else info(`Tabla users: ${error.message}`);
}

console.log("\n— Fin —\n");
