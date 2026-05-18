import { graphUrl } from "./config";
import type {
  MetaAdAccountRaw,
  MetaAdRaw,
  MetaAdSetRaw,
  MetaCampaignRaw,
  MetaInsightRaw,
  MetaListResponse,
} from "@/types/meta";

/** Error tipado para distinguir token expirado / revocado. */
export class MetaApiException extends Error {
  code: number;
  subcode?: number;
  isTokenError: boolean;

  constructor(message: string, code: number, subcode?: number) {
    super(message);
    this.name = "MetaApiException";
    this.code = code;
    this.subcode = subcode;
    // 190 = token inválido/expirado; 102 = sesión; 10/200 = permisos
    this.isTokenError = code === 190 || code === 102 || subcode === 463;
  }
}

async function metaGet<T>(
  path: string,
  accessToken: string,
  params: Record<string, string> = {},
): Promise<T> {
  const search = new URLSearchParams({ ...params, access_token: accessToken });
  const res = await fetch(`${graphUrl(path)}?${search}`, {
    // Datos sensibles: nunca cachear en disco/CDN.
    cache: "no-store",
  });
  const json = await res.json();

  if (!res.ok || json?.error) {
    const err = json?.error ?? {};
    throw new MetaApiException(
      err.message ?? `Meta API error (${res.status})`,
      err.code ?? res.status,
      err.error_subcode,
    );
  }
  return json as T;
}

/** Pagina automáticamente siguiendo `paging.next`. */
async function metaGetAll<T>(
  path: string,
  accessToken: string,
  params: Record<string, string> = {},
  maxPages = 5,
): Promise<T[]> {
  const out: T[] = [];
  let page = await metaGet<MetaListResponse<T>>(path, accessToken, params);
  out.push(...(page.data ?? []));

  let pages = 1;
  while (page.paging?.next && pages < maxPages) {
    const res = await fetch(page.paging.next, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok || json?.error) break;
    page = json as MetaListResponse<T>;
    out.push(...(page.data ?? []));
    pages += 1;
  }
  return out;
}

// ─── Lecturas (MVP) ──────────────────────────────────────────────

export async function getAdAccounts(
  accessToken: string,
): Promise<MetaAdAccountRaw[]> {
  return metaGetAll<MetaAdAccountRaw>("me/adaccounts", accessToken, {
    fields:
      // 'business{id,name}' se omite a propósito: requiere el permiso
      // business_management (Fase 2). En el MVP basta con ads_read.
      "account_id,name,currency,account_status,timezone_name",
    limit: "100",
  });
}

export async function getCampaigns(
  accessToken: string,
  adAccountId: string,
): Promise<MetaCampaignRaw[]> {
  return metaGetAll<MetaCampaignRaw>(`${adAccountId}/campaigns`, accessToken, {
    fields:
      "id,name,status,effective_status,objective,daily_budget,lifetime_budget,start_time,stop_time",
    limit: "100",
  });
}

export async function getAdSets(
  accessToken: string,
  campaignId: string,
): Promise<MetaAdSetRaw[]> {
  return metaGetAll<MetaAdSetRaw>(`${campaignId}/adsets`, accessToken, {
    fields:
      "id,name,status,effective_status,daily_budget,lifetime_budget,optimization_goal,campaign_id",
    limit: "100",
  });
}

export async function getAds(
  accessToken: string,
  adSetId: string,
): Promise<MetaAdRaw[]> {
  return metaGetAll<MetaAdRaw>(`${adSetId}/ads`, accessToken, {
    fields: "id,name,status,effective_status,adset_id,campaign_id",
    limit: "100",
  });
}

export async function getCampaignInsights(
  accessToken: string,
  campaignId: string,
  datePreset = "last_30d",
): Promise<MetaInsightRaw | null> {
  const rows = await metaGetAll<MetaInsightRaw>(
    `${campaignId}/insights`,
    accessToken,
    {
      date_preset: datePreset,
      fields:
        "impressions,reach,clicks,ctr,cpc,cpm,spend,frequency,objective,actions,cost_per_action_type",
    },
    1,
  );
  return rows[0] ?? null;
}

// ─── Normalización de insights → métricas del dominio ────────────

export interface NormalizedInsights {
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  spend: number;
  frequency: number;
  conversions: number | null;
  cost_per_result: number | null;
  objective: string | null;
  date_start: string | null;
  date_stop: string | null;
}

const CONVERSION_ACTION_TYPES = [
  "purchase",
  "offsite_conversion.fb_pixel_purchase",
  "lead",
  "complete_registration",
  "onsite_conversion.lead_grouped",
];

export function normalizeInsights(
  raw: MetaInsightRaw | null,
): NormalizedInsights | null {
  if (!raw) return null;
  const num = (v?: string) => (v != null ? Number(v) : 0);

  let conversions: number | null = null;
  if (raw.actions?.length) {
    const conv = raw.actions
      .filter((a) => CONVERSION_ACTION_TYPES.includes(a.action_type))
      .reduce((acc, a) => acc + Number(a.value || 0), 0);
    conversions = conv > 0 ? conv : null;
  }

  let costPerResult: number | null = null;
  if (raw.cost_per_action_type?.length) {
    const cpr = raw.cost_per_action_type.find((a) =>
      CONVERSION_ACTION_TYPES.includes(a.action_type),
    );
    if (cpr) costPerResult = Number(cpr.value);
  }

  return {
    impressions: num(raw.impressions),
    reach: num(raw.reach),
    clicks: num(raw.clicks),
    ctr: num(raw.ctr),
    cpc: num(raw.cpc),
    cpm: num(raw.cpm),
    spend: num(raw.spend),
    frequency: num(raw.frequency),
    conversions,
    cost_per_result: costPerResult,
    objective: raw.objective ?? null,
    date_start: raw.date_start ?? null,
    date_stop: raw.date_stop ?? null,
  };
}
