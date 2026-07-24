-- ATP Suplementos v2.0: costos, historial y códigos profesionales de pedido
alter table public.atp_products add column if not exists cost numeric(12,2) not null default 0;
alter table public.atp_orders add column if not exists status_history jsonb not null default '[]'::jsonb;
update public.atp_orders set tracking_code='ATP-'||extract(year from created_at)::int||'-'||lpad(order_number::text,6,'0') where order_number is not null and (tracking_code is null or tracking_code not like 'ATP-%-%');
