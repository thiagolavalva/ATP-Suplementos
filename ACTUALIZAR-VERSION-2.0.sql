-- ATP Suplementos v2.0: costos, historial y notificaciones push
alter table public.atp_products add column if not exists cost numeric(12,2) not null default 0;
alter table public.atp_orders add column if not exists status_history jsonb not null default '[]'::jsonb;
update public.atp_orders set tracking_code='ATP-'||extract(year from created_at)::int||'-'||lpad(order_number::text,6,'0') where order_number is not null and (tracking_code is null or tracking_code not like 'ATP-%-%');
create table if not exists public.atp_push_tokens (
 token text primary key, user_id uuid references auth.users(id) on delete cascade, user_agent text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.atp_push_tokens enable row level security;
drop policy if exists "ATP push admin insertar" on public.atp_push_tokens;
create policy "ATP push admin insertar" on public.atp_push_tokens for insert to authenticated with check(auth.uid()=user_id);
drop policy if exists "ATP push admin actualizar" on public.atp_push_tokens;
create policy "ATP push admin actualizar" on public.atp_push_tokens for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
