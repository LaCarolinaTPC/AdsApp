import { env, isAiConfigured } from "@/lib/env";
import type { AiAnalysisResult } from "@/types";
import type { CampaignSummaryInput } from "./prompts";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompts";

/**
 * Proveedor de IA configurable vía variables de entorno.
 * Compatible con cualquier endpoint OpenAI-compatible
 * (OpenAI, Vercel AI Gateway, Azure OpenAI, Together, etc.)
 * mediante AI_BASE_URL, AI_MODEL y OPENAI_API_KEY.
 *
 * Si no hay API key configurada, devuelve un MOCK CONTROLADO
 * (claramente marcado) para poder probar el flujo end-to-end sin
 * credenciales — nunca datos quemados en producción real.
 */

export interface AiCallResult {
  result: AiAnalysisResult;
  model: string;
  raw: unknown;
  mocked: boolean;
}

export async function analyzeWithAI(
  input: CampaignSummaryInput,
): Promise<AiCallResult> {
  if (!isAiConfigured()) {
    return { ...buildMock(input), mocked: true };
  }

  const res = await fetch(`${env.ai.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.ai.apiKey}`,
    },
    body: JSON.stringify({
      model: env.ai.model,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(input) },
      ],
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      `[ai] Error del proveedor (${res.status}): ${
        json?.error?.message ?? "respuesta inválida"
      }`,
    );
  }

  const content: string = json?.choices?.[0]?.message?.content ?? "{}";
  let parsed: AiAnalysisResult;
  try {
    parsed = normalize(JSON.parse(content));
  } catch {
    throw new Error("[ai] La respuesta del modelo no es JSON válido.");
  }

  return {
    result: parsed,
    model: json?.model ?? env.ai.model,
    raw: json,
    mocked: false,
  };
}

/** Garantiza la forma esperada aunque el modelo varíe ligeramente. */
function normalize(obj: any): AiAnalysisResult {
  const arr = (v: any): string[] =>
    Array.isArray(v) ? v.map(String) : v ? [String(v)] : [];
  return {
    diagnostico_general: String(obj?.diagnostico_general ?? "Sin diagnóstico."),
    problemas_detectados: arr(obj?.problemas_detectados),
    nivel_urgencia: ["alta", "media", "baja"].includes(obj?.nivel_urgencia)
      ? obj.nivel_urgencia
      : "media",
    posibles_causas: arr(obj?.posibles_causas),
    recomendaciones: Array.isArray(obj?.recomendaciones)
      ? obj.recomendaciones.map((r: any) => ({
          recommendation_type: String(r?.recommendation_type ?? "general"),
          title: String(r?.title ?? "Recomendación"),
          description: String(r?.description ?? ""),
          reason: String(r?.reason ?? ""),
          suggested_action: String(r?.suggested_action ?? ""),
          risk_level: ["bajo", "medio", "alto"].includes(r?.risk_level)
            ? r.risk_level
            : "medio",
          expected_impact: String(r?.expected_impact ?? ""),
          priority: ["alta", "media", "baja"].includes(r?.priority)
            ? r.priority
            : "media",
        }))
      : [],
  };
}

/** Mock determinista basado en heurísticas reales sobre las métricas. */
function buildMock(input: CampaignSummaryInput): Omit<AiCallResult, "mocked"> {
  const m = input.insights;
  const problemas: string[] = [];
  const recomendaciones: AiAnalysisResult["recomendaciones"] = [];

  if (m) {
    if (m.frequency > 3) {
      problemas.push(
        `Frecuencia alta (${m.frequency.toFixed(1)}): riesgo de fatiga de audiencia.`,
      );
      recomendaciones.push({
        recommendation_type: "creative",
        title: "Renovar creativos por fatiga",
        description:
          "La frecuencia supera 3. Sube creativos nuevos y amplía la audiencia.",
        reason: `Frecuencia ${m.frequency.toFixed(1)} indica sobreexposición.`,
        suggested_action: "Añadir 2-3 creativos nuevos y duplicar el público.",
        risk_level: "bajo",
        expected_impact: "Reducción del CPM y recuperación del CTR.",
        priority: "alta",
      });
    }
    if (m.ctr < 1 && m.impressions > 1000) {
      problemas.push(`CTR bajo (${m.ctr.toFixed(2)}%) con volumen suficiente.`);
      recomendaciones.push({
        recommendation_type: "creative",
        title: "Mejorar gancho del creativo",
        description:
          "CTR por debajo del 1%. El mensaje/visual no conecta con la audiencia.",
        reason: "CTR bajo con impresiones suficientes para concluir.",
        suggested_action: "Probar nuevo ángulo + primeros 3s del video.",
        risk_level: "bajo",
        expected_impact: "CTR objetivo > 1.5%.",
        priority: "alta",
      });
    }
    if (m.conversions == null && m.spend > 0) {
      problemas.push("Gasto sin conversiones registradas.");
      recomendaciones.push({
        recommendation_type: "pause",
        title: "Revisar tracking / pausar si persiste",
        description:
          "Hay gasto pero no se registran conversiones. Verifica el Pixel/CAPI.",
        reason: "Gasto activo sin resultados atribuidos.",
        suggested_action:
          "Validar evento de conversión; si el tracking es correcto, pausar y reestructurar.",
        risk_level: "medio",
        expected_impact: "Evitar gasto improductivo.",
        priority: "alta",
      });
    }
  } else {
    problemas.push("Sin métricas recientes disponibles para esta campaña.");
  }

  if (recomendaciones.length === 0) {
    recomendaciones.push({
      recommendation_type: "scale",
      title: "Métricas estables: probar escalado controlado",
      description:
        "No se detectan problemas críticos. Considera subir presupuesto 20%.",
      reason: "Rendimiento dentro de rangos aceptables.",
      suggested_action: "Incrementar presupuesto diario un 20% y monitorizar 72h.",
      risk_level: "medio",
      expected_impact: "Mayor volumen manteniendo el CPA.",
      priority: "media",
    });
  }

  const urgencia =
    problemas.length >= 2 ? "alta" : problemas.length === 1 ? "media" : "baja";

  return {
    result: {
      diagnostico_general: `[ANÁLISIS HEURÍSTICO LOCAL — sin OPENAI_API_KEY] Campaña "${input.name}" (${input.objective ?? "objetivo n/d"}). Se evaluaron las métricas disponibles y se generaron ${recomendaciones.length} recomendaciones.`,
      problemas_detectados: problemas,
      nivel_urgencia: urgencia,
      posibles_causas: m
        ? ["Análisis basado en heurísticas; configura OPENAI_API_KEY para análisis con IA real."]
        : ["No hay insights; la campaña puede ser nueva o sin entrega."],
      recomendaciones,
    },
    model: "mock-heuristic-v1",
    raw: { mocked: true },
  };
}
