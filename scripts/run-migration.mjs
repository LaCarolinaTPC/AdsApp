// Ejecuta una migración SQL vía Supabase Management API.
// Uso: SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/run-migration.mjs <archivo.sql>
import { readFileSync } from "node:fs";

const PROJECT_REF = "oiimthofeefntneqphhz";
const token = process.env.SUPABASE_ACCESS_TOKEN;
const file = process.argv[2] ?? "database/migrations/001_ai_chat.sql";

if (!token) {
  console.error("❌ Falta SUPABASE_ACCESS_TOKEN en el entorno.");
  process.exit(1);
}

const query = readFileSync(file, "utf8");
console.log(`▶ Ejecutando ${file} en proyecto ${PROJECT_REF}…`);

const res = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  },
);

const text = await res.text();
if (!res.ok) {
  console.error(`❌ Error ${res.status}: ${text}`);
  process.exit(1);
}
console.log("✅ Migración ejecutada correctamente.");
console.log(text && text !== "[]" ? text : "(sin filas devueltas — OK para DDL)");
