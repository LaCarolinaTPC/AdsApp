import type { NormalizedInsights } from "@/lib/meta/client";

export interface CampaignSummaryInput {
  name: string;
  status: string | null;
  objective: string | null;
  daily_budget: number | null;
  lifetime_budget: number | null;
  currency: string | null;
  insights: NormalizedInsights | null;
}

export const SYSTEM_PROMPT = `Eres un experto senior en Meta Ads (Facebook/Instagram Ads) y media buying con 10+ años optimizando campañas de performance.
Analizas datos de campañas y devuelves diagnósticos accionables, concretos y priorizados.
Eres directo, evitas generalidades y basas cada conclusión en las métricas dadas.
SIEMPRE respondes en español y EXCLUSIVAMENTE con un objeto JSON válido que cumpla el esquema indicado. No incluyas texto fuera del JSON.`;

export function buildUserPrompt(input: CampaignSummaryInput): string {
  const m = input.insights;
  const fmt = (v: number | null | undefined, suffix = "") =>
    v == null ? "n/d" : `${v}${suffix}`;

  return `Analiza esta campaña de Meta Ads y devuelve recomendaciones.

DATOS DE LA CAMPAÑA
- Nombre: ${input.name}
- Estado: ${input.status ?? "n/d"}
- Objetivo: ${input.objective ?? "n/d"}
- Presupuesto diario: ${fmt(input.daily_budget)} ${input.currency ?? ""}
- Presupuesto total (lifetime): ${fmt(input.lifetime_budget)} ${input.currency ?? ""}

MÉTRICAS (últimos 30 días)
- Impresiones: ${fmt(m?.impressions)}
- Alcance: ${fmt(m?.reach)}
- Clics: ${fmt(m?.clicks)}
- CTR: ${fmt(m?.ctr, "%")}
- CPC: ${fmt(m?.cpc)}
- CPM: ${fmt(m?.cpm)}
- Gasto: ${fmt(m?.spend)} ${input.currency ?? ""}
- Frecuencia: ${fmt(m?.frequency)}
- Conversiones: ${fmt(m?.conversions)}
- Coste por resultado: ${fmt(m?.cost_per_result)}

Devuelve EXACTAMENTE este JSON:
{
  "diagnostico_general": "string — 2-4 frases con el estado real de la campaña",
  "problemas_detectados": ["string", "..."],
  "nivel_urgencia": "alta | media | baja",
  "posibles_causas": ["string", "..."],
  "recomendaciones": [
    {
      "recommendation_type": "budget | creative | audience | bidding | structure | pause | scale",
      "title": "string corto",
      "description": "string — qué hacer en detalle",
      "reason": "string — por qué, basado en las métricas",
      "suggested_action": "string — acción concreta y medible",
      "risk_level": "bajo | medio | alto",
      "expected_impact": "string — impacto esperado cuantificado si es posible",
      "priority": "alta | media | baja"
    }
  ]
}

Reglas:
- Entre 2 y 5 recomendaciones, ordenadas por prioridad.
- Si faltan datos (n/d), indícalo en posibles_causas y baja la urgencia.
- No inventes métricas que no se dieron.`;
}
