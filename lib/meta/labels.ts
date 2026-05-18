/**
 * Traduce los códigos técnicos de Meta a lenguaje humano en español.
 * Mejora la legibilidad para usuarios no técnicos.
 */

const OBJECTIVES: Record<string, string> = {
  // ODAX (nuevos)
  OUTCOME_AWARENESS: "Reconocimiento",
  OUTCOME_TRAFFIC: "Tráfico",
  OUTCOME_ENGAGEMENT: "Interacción",
  OUTCOME_LEADS: "Clientes potenciales",
  OUTCOME_SALES: "Ventas",
  OUTCOME_APP_PROMOTION: "Promoción de app",
  // Legacy
  LINK_CLICKS: "Clics en enlace",
  CONVERSIONS: "Conversiones",
  POST_ENGAGEMENT: "Interacción con publicación",
  PAGE_LIKES: "Me gusta de página",
  LEAD_GENERATION: "Generación de leads",
  REACH: "Alcance",
  BRAND_AWARENESS: "Reconocimiento de marca",
  VIDEO_VIEWS: "Reproducciones de video",
  MESSAGES: "Mensajes",
  PRODUCT_CATALOG_SALES: "Ventas de catálogo",
  APP_INSTALLS: "Instalaciones de app",
  STORE_VISITS: "Visitas a tienda",
  STORE_TRAFFIC: "Visitas a tienda",
};

const STATUSES: Record<string, string> = {
  ACTIVE: "Activa",
  PAUSED: "Pausada",
  DELETED: "Eliminada",
  ARCHIVED: "Archivada",
  IN_PROCESS: "En proceso",
  WITH_ISSUES: "Con problemas",
  CAMPAIGN_PAUSED: "Campaña pausada",
  ADSET_PAUSED: "Conjunto pausado",
  PENDING_REVIEW: "En revisión",
  DISAPPROVED: "Rechazada",
  PREAPPROVED: "Preaprobada",
  PENDING_BILLING_INFO: "Falta facturación",
};

export function objectiveLabel(code?: string | null): string {
  if (!code) return "—";
  return OBJECTIVES[code.toUpperCase()] ?? code;
}

export function statusLabelEs(code?: string | null): string {
  if (!code) return "—";
  return STATUSES[code.toUpperCase()] ?? code;
}
