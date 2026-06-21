-- =============================================================
-- Push notification para CLIENTE quando status do pedido muda
-- =============================================================
-- Trigger AFTER UPDATE em orders: se status mudou, invoca a
-- Edge Function `notify-order-status` via pg_net.
-- =============================================================

create or replace function public.notify_customer_order_status()
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
  -- Só dispara se o status realmente mudou
  if old.status = new.status then
    return new;
  end if;

  -- Se as GUCs não estão configuradas, não faz nada
  if supabase_url is null or service_key is null then
    return new;
  end if;

  function_url := supabase_url || '/functions/v1/notify-order-status';

  perform extensions.http_post(
    url := function_url,
    body := jsonb_build_object(
      'orderId',       new.id,
      'userId',        new.user_id,
      'customerName',  new.customer_name,
      'status',        new.status,
      'oldStatus',     old.status
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

drop trigger if exists trg_notify_customer_order_status on public.orders;
create trigger trg_notify_customer_order_status
  after update on public.orders
  for each row
  execute function public.notify_customer_order_status();
