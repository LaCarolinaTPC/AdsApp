-- ════════════════════════════════════════════════════════════════
--  Migración 001 — Chat IA por campaña
--  Ejecuta este archivo en: Supabase → SQL Editor
--  (idempotente: se puede correr varias veces sin problema)
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
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
