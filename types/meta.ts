// ─── Formas de respuesta de la Meta Marketing API ───────────────

export interface MetaPaging {
  cursors?: { before?: string; after?: string };
  next?: string;
  previous?: string;
}

export interface MetaListResponse<T> {
  data: T[];
  paging?: MetaPaging;
}

export interface MetaAdAccountRaw {
  id: string; // act_XXXX
  account_id: string;
  name: string;
  currency: string;
  account_status: number;
  business?: { id: string; name: string };
  timezone_name?: string;
}

export interface MetaCampaignRaw {
  id: string;
  name: string;
  status: string;
  effective_status?: string;
  objective?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  stop_time?: string;
}

export interface MetaAdSetRaw {
  id: string;
  name: string;
  status: string;
  effective_status?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  optimization_goal?: string;
  campaign_id?: string;
}

export interface MetaAdRaw {
  id: string;
  name: string;
  status: string;
  effective_status?: string;
  adset_id?: string;
  campaign_id?: string;
}

export interface MetaInsightAction {
  action_type: string;
  value: string;
}

export interface MetaInsightRaw {
  date_start?: string;
  date_stop?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  spend?: string;
  frequency?: string;
  objective?: string;
  actions?: MetaInsightAction[];
  cost_per_action_type?: MetaInsightAction[];
}

export interface MetaTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

export interface MetaApiError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}
