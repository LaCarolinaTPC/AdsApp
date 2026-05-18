-- ════════════════════════════════════════════════════════════════
--  AI Meta Ads Optimizer — Esquema de base de datos (Supabase / Postgres)
--  Ejecuta este archivo completo en: Supabase → SQL Editor
--
--  Modelo multi-tenant: cada fila pertenece a un user_id (auth.uid()).
--  Row Level Security (RLS) garantiza que un usuario JAMÁS pueda
--  leer o escribir datos de otro usuario, incluso si la API fallara.
-- ════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ────────────────────────────────────────────────────────────────
-- Helper: actualizar updated_at automáticamente
-- ────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ════════════════════════════════════════════════════════════════
-- 1. users  (perfil espejo de auth.users)
-- ════════════════════════════════════════════════════════════════
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Inserta automáticamente un perfil cuando se registra un usuario en Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ════════════════════════════════════════════════════════════════
-- 2. meta_connections  (una conexión OAuth de Meta por autorización)
-- ════════════════════════════════════════════════════════════════
create table if not exists public.meta_connections (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users(id) on delete cascade,
  meta_user_id     text,
  -- ⚠ access_token se guarda CIFRADO (AES-256-GCM) desde lib/meta/crypto.ts
  access_token     text not null,
  token_type       text default 'bearer',
  token_expires_at timestamptz,
  scopes           text[] default array['ads_read'],
  status           text not null default 'active', -- active | expired | revoked
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════════
-- 3. meta_ad_accounts  (cuentas publicitarias de cada conexión)
-- ════════════════════════════════════════════════════════════════
create table if not exists public.meta_ad_accounts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  connection_id   uuid not null references public.meta_connections(id) on delete cascade,
  account_id      text not null,            -- ej: act_1234567890
  name            text,
  currency        text,
  account_status  int,
  business_id     text,
  timezone_name   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (connection_id, account_id)
);

-- ════════════════════════════════════════════════════════════════
-- 4. campaigns_cache  (snapshot de campañas para evitar rate limits)
-- ════════════════════════════════════════════════════════════════
create table if not exists public.campaigns_cache (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users(id) on delete cascade,
  ad_account_id    uuid not null references public.meta_ad_accounts(id) on delete cascade,
  campaign_id      text not null,
  name             text,
  status           text,
  effective_status text,
  objective        text,
  daily_budget     numeric,
  lifetime_budget  numeric,
  raw              jsonb,
  fetched_at       timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (ad_account_id, campaign_id)
);

-- ════════════════════════════════════════════════════════════════
-- 5. campaign_insights  (métricas por campaña y rango de fechas)
-- ════════════════════════════════════════════════════════════════
create table if not exists public.campaign_insights (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  campaign_cache_id uuid not null references public.campaigns_cache(id) on delete cascade,
  date_start        date,
  date_stop         date,
  impressions       numeric,
  reach             numeric,
  clicks            numeric,
  ctr               numeric,
  cpc               numeric,
  cpm               numeric,
  spend             numeric,
  conversions       numeric,
  cost_per_result   numeric,
  frequency         numeric,
  raw               jsonb,
  created_at        timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════════
-- 6. ai_analysis  (resultado crudo del análisis de IA por campaña)
-- ════════════════════════════════════════════════════════════════
create table if not exists public.ai_analysis (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  campaign_cache_id uuid not null references public.campaigns_cache(id) on delete cascade,
  model             text,
  diagnostico       text,
  nivel_urgencia    text,           -- alta | media | baja
  summary           jsonb,          -- objeto estructurado completo
  raw_response      jsonb,
  created_at        timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════════
-- 7. recommendations  (recomendaciones accionables derivadas de la IA)
-- ════════════════════════════════════════════════════════════════
create table if not exists public.recommendations (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users(id) on delete cascade,
  campaign_cache_id   uuid references public.campaigns_cache(id) on delete cascade,
  ai_analysis_id      uuid references public.ai_analysis(id) on delete set null,
  campaign_id         text,
  campaign_name       text,
  recommendation_type text,
  title               text not null,
  description         text,
  reason              text,
  suggested_action    text,
  risk_level          text,         -- bajo | medio | alto
  expected_impact     text,
  priority            text,         -- alta | media | baja
  -- pending | accepted_manual | rejected | applied_future
  status              text not null default 'pending',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════════
-- 8. action_logs  (auditoría de acciones; base para Fase 2 rollback)
-- ════════════════════════════════════════════════════════════════
create table if not exists public.action_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  action       text not null,        -- meta.connect | ai.analyze | recommendation.accept | ...
  entity_type  text,                 -- campaign | recommendation | connection
  entity_id    text,
  payload      jsonb,
  status       text default 'ok',    -- ok | error
  created_at   timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────
-- Triggers updated_at
-- ────────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'users','meta_connections','meta_ad_accounts',
    'campaigns_cache','recommendations'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on public.%I;', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at();', t);
  end loop;
end $$;

-- ────────────────────────────────────────────────────────────────
-- Índices
-- ────────────────────────────────────────────────────────────────
create index if not exists idx_meta_connections_user      on public.meta_connections(user_id);
create index if not exists idx_meta_ad_accounts_user       on public.meta_ad_accounts(user_id);
create index if not exists idx_meta_ad_accounts_conn       on public.meta_ad_accounts(connection_id);
create index if not exists idx_campaigns_cache_user        on public.campaigns_cache(user_id);
create index if not exists idx_campaigns_cache_account     on public.campaigns_cache(ad_account_id);
create index if not exists idx_campaign_insights_user      on public.campaign_insights(user_id);
create index if not exists idx_campaign_insights_campaign  on public.campaign_insights(campaign_cache_id);
create index if not exists idx_ai_analysis_user            on public.ai_analysis(user_id);
create index if not exists idx_ai_analysis_campaign        on public.ai_analysis(campaign_cache_id);
create index if not exists idx_recommendations_user        on public.recommendations(user_id);
create index if not exists idx_recommendations_status      on public.recommendations(user_id, status);
create index if not exists idx_action_logs_user            on public.action_logs(user_id);

-- ════════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY
--  Política única por tabla: el usuario solo opera sobre sus filas.
-- ════════════════════════════════════════════════════════════════
alter table public.users             enable row level security;
alter table public.meta_connections  enable row level security;
alter table public.meta_ad_accounts  enable row level security;
alter table public.campaigns_cache   enable row level security;
alter table public.campaign_insights enable row level security;
alter table public.ai_analysis       enable row level security;
alter table public.recommendations   enable row level security;
alter table public.action_logs       enable row level security;

-- users: el id ES el auth.uid()
drop policy if exists "users_self" on public.users;
create policy "users_self" on public.users
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Resto de tablas: filtran por user_id = auth.uid()
do $$
declare t text;
begin
  foreach t in array array[
    'meta_connections','meta_ad_accounts','campaigns_cache',
    'campaign_insights','ai_analysis','recommendations','action_logs'
  ]
  loop
    execute format('drop policy if exists "%s_owner" on public.%I;', t, t);
    execute format(
      'create policy "%s_owner" on public.%I
         for all
         using (auth.uid() = user_id)
         with check (auth.uid() = user_id);', t, t);
  end loop;
end $$;

-- Nota: el SUPABASE_SERVICE_ROLE_KEY (solo backend) ignora RLS por
-- diseño y se usa para escribir tokens cifrados con seguridad.

-- ════════════════════════════════════════════════════════════════
-- 9. ai_chat_messages  (chat IA por campaña — ver migración 001)
-- ════════════════════════════════════════════════════════════════
create table if not exists public.ai_chat_messages (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  campaign_cache_id uuid not null references public.campaigns_cache(id) on delete cascade,
  role              text not null check (role in ('user', 'assistant')),
  content           text not null,
  created_at        timestamptz not null default now()
);
create index if not exists idx_ai_chat_user
  on public.ai_chat_messages(user_id);
create index if not exists idx_ai_chat_campaign
  on public.ai_chat_messages(campaign_cache_id, created_at);
alter table public.ai_chat_messages enable row level security;
drop policy if exists "ai_chat_messages_owner" on public.ai_chat_messages;
create policy "ai_chat_messages_owner" on public.ai_chat_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
