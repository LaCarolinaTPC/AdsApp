// ─── Dominio de la aplicación ────────────────────────────────────

export type UrgencyLevel = "alta" | "media" | "baja";
export type RiskLevel = "bajo" | "medio" | "alto";
export type Priority = "alta" | "media" | "baja";

export type RecommendationStatus =
  | "pending"
  | "accepted_manual"
  | "rejected"
  | "applied_future";

export interface AppUser {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

export interface MetaConnection {
  id: string;
  user_id: string;
  meta_user_id: string | null;
  token_type: string | null;
  token_expires_at: string | null;
  scopes: string[];
  status: "active" | "expired" | "revoked";
  created_at: string;
  updated_at: string;
  // access_token NUNCA se serializa hacia el cliente
}

export interface MetaAdAccount {
  id: string;
  user_id: string;
  connection_id: string;
  account_id: string;
  name: string | null;
  currency: string | null;
  account_status: number | null;
  business_id: string | null;
  timezone_name: string | null;
}

export interface CampaignCache {
  id: string;
  user_id: string;
  ad_account_id: string;
  campaign_id: string;
  name: string | null;
  status: string | null;
  effective_status: string | null;
  objective: string | null;
  daily_budget: number | null;
  lifetime_budget: number | null;
  fetched_at: string;
}

export interface CampaignInsight {
  id: string;
  campaign_cache_id: string;
  date_start: string | null;
  date_stop: string | null;
  impressions: number | null;
  reach: number | null;
  clicks: number | null;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  spend: number | null;
  conversions: number | null;
  cost_per_result: number | null;
  frequency: number | null;
}

export interface AiRecommendation {
  recommendation_type: string;
  title: string;
  description: string;
  reason: string;
  suggested_action: string;
  risk_level: RiskLevel;
  expected_impact: string;
  priority: Priority;
}

export interface AiAnalysisResult {
  diagnostico_general: string;
  problemas_detectados: string[];
  nivel_urgencia: UrgencyLevel;
  posibles_causas: string[];
  recomendaciones: AiRecommendation[];
}

export interface Recommendation {
  id: string;
  user_id: string;
  campaign_cache_id: string | null;
  ai_analysis_id: string | null;
  campaign_id: string | null;
  campaign_name: string | null;
  recommendation_type: string | null;
  title: string;
  description: string | null;
  reason: string | null;
  suggested_action: string | null;
  risk_level: string | null;
  expected_impact: string | null;
  priority: string | null;
  status: RecommendationStatus;
  created_at: string;
  updated_at: string;
}

export interface AiAnalysis {
  id: string;
  user_id: string;
  campaign_cache_id: string;
  model: string | null;
  diagnostico: string | null;
  nivel_urgencia: string | null;
  summary: AiAnalysisResult | null;
  created_at: string;
}
