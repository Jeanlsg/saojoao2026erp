-- =============================================================
-- Push notifications — schema + trigger
-- =============================================================
-- 1. Tabela device_tokens: armazena tokens FCM/APNs por dispositivo
-- 2. RLS: usuário só mexe nos próprios tokens
-- 3. Trigger AFTER INSERT em orders → invoca a Edge Function
--    `send-push-notification` via http (extensão pg_net)
-- =============================================================

-- Garante que pg_net está disponível (já é padrão em projetos Supabase novos)
create extension if not exists pg_net with schema extensions;

-- ---------- 1. device_tokens ----------
create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('android', 'ios', 'web')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, token)
);

create index if not exists device_tokens_user_id_idx on public.device_tokens (user_id);
create index if not exists device_tokens_token_idx on public.device_tokens (token);

alter table public.device_tokens enable row level security;

-- Usuário só vê / escreve os próprios tokens
drop policy if exists "Users manage own device tokens" on public.device_tokens;
create policy "Users manage own device tokens"
  on public.device_tokens
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Service role (edge functions com privilégio) lê todos os tokens para enviar push
drop policy if exists "Service role reads all tokens" on public.device_tokens;
create policy "Service role reads all tokens"
  on public.device_tokens
  for select
  to service_role
  using (true);

-- ---------- 2. Função que invoca a Edge Function ----------
-- A função usa pg_net.http_post para chamar a Edge Function `send-push-notification`.
-- Os "settings" abaixo são lidos das GUCs do projeto — você precisa configurá-los
-- via SQL no Dashboard (instruções em PUSH_SETUP.md):
--   alter database postgres set "app.supabase_url" = 'https://<seu-projeto>.supabase.co';
--   alter database postgres set "app.service_role_key" = '<service_role_key>';

create or replace function public.notify_admins_of_new_order()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  supabase_url text := current_setting('app.supabase_url', true);
  service_key text  := current_setting('app.service_role_key', true);
  function_url text;
begin
  -- Se as GUCs não estão configuradas, não faz nada (trigger no-op).
  -- Isso evita quebrar inserts em ambientes que ainda não configuraram push.
  if supabase_url is null or service_key is null then
    return new;
  end if;

  function_url := supabase_url || '/functions/v1/send-push-notification';

  perform extensions.http_post(
    url := function_url,
    body := jsonb_build_object(
      'orderId',       new.id,
      'customerName',  new.customer_name,
      'total',         new.total,
      'status',        new.status
    )::text,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || service_key
    )::jsonb,
    timeout_milliseconds := 5000
  );

  return new;
end;
$$;

-- ---------- 3. Trigger ----------
drop trigger if exists trg_notify_admins_of_new_order on public.orders;
create trigger trg_notify_admins_of_new_order
  after insert on public.orders
  for each row
  execute function public.notify_admins_of_new_order();
