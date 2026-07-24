-- ATP Suplementos: instalación online
-- Este script usa tablas nuevas (atp_...) y no toca tablas anteriores.

create extension if not exists pgcrypto;

create table if not exists public.atp_products (
  id text primary key,
  name text not null,
  brand text not null default '',
  category text not null default '',
  detail text not null default '',
  price numeric(12,2) not null default 0,
  stock integer not null default 0,
  featured boolean not null default true,
  active boolean not null default true,
  tag text not null default '',
  image text not null default '',
  gallery jsonb not null default '[]'::jsonb,
  flavors jsonb not null default '[]'::jsonb,
  presentation text not null default '',
  description text not null default '',
  ingredients text not null default '',
  nutrition text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.atp_settings (
  id integer primary key default 1 check (id = 1),
  "storeName" text not null default 'ATP Suplementos',
  whatsapp text not null default '5493518136003',
  instagram text not null default '_atpsuplementos',
  location text not null default 'Córdoba, Argentina',
  "heroTitle" text not null default 'Potenciá tu rendimiento.',
  "heroText" text not null default 'Las principales marcas de suplementación, con atención directa desde Córdoba.',
  updated_at timestamptz not null default now()
);

create table if not exists public.atp_orders (
  id uuid primary key default gen_random_uuid(),
  items jsonb not null default '[]'::jsonb,
  customer jsonb not null default '{}'::jsonb,
  total numeric(12,2) not null default 0,
  channel text not null default 'whatsapp',
  created_at timestamptz not null default now()
);

insert into public.atp_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.atp_products enable row level security;
alter table public.atp_settings enable row level security;
alter table public.atp_orders enable row level security;

drop policy if exists "ATP productos lectura pública" on public.atp_products;
create policy "ATP productos lectura pública"
on public.atp_products for select
to anon, authenticated
using (true);

drop policy if exists "ATP productos admin insertar" on public.atp_products;
create policy "ATP productos admin insertar"
on public.atp_products for insert
to authenticated
with check (true);

drop policy if exists "ATP productos admin actualizar" on public.atp_products;
create policy "ATP productos admin actualizar"
on public.atp_products for update
to authenticated
using (true)
with check (true);

drop policy if exists "ATP productos admin eliminar" on public.atp_products;
create policy "ATP productos admin eliminar"
on public.atp_products for delete
to authenticated
using (true);

drop policy if exists "ATP configuración lectura pública" on public.atp_settings;
create policy "ATP configuración lectura pública"
on public.atp_settings for select
to anon, authenticated
using (true);

drop policy if exists "ATP configuración admin insertar" on public.atp_settings;
create policy "ATP configuración admin insertar"
on public.atp_settings for insert
to authenticated
with check (true);

drop policy if exists "ATP configuración admin actualizar" on public.atp_settings;
create policy "ATP configuración admin actualizar"
on public.atp_settings for update
to authenticated
using (true)
with check (true);

drop policy if exists "ATP pedidos crear" on public.atp_orders;
create policy "ATP pedidos crear"
on public.atp_orders for insert
to anon, authenticated
with check (true);

drop policy if exists "ATP pedidos admin leer" on public.atp_orders;
create policy "ATP pedidos admin leer"
on public.atp_orders for select
to authenticated
using (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'atp-product-images',
  'atp-product-images',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "ATP imágenes lectura pública" on storage.objects;
create policy "ATP imágenes lectura pública"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'atp-product-images');

drop policy if exists "ATP imágenes admin subir" on storage.objects;
create policy "ATP imágenes admin subir"
on storage.objects for insert
to authenticated
with check (bucket_id = 'atp-product-images');

drop policy if exists "ATP imágenes admin actualizar" on storage.objects;
create policy "ATP imágenes admin actualizar"
on storage.objects for update
to authenticated
using (bucket_id = 'atp-product-images')
with check (bucket_id = 'atp-product-images');

drop policy if exists "ATP imágenes admin eliminar" on storage.objects;
create policy "ATP imágenes admin eliminar"
on storage.objects for delete
to authenticated
using (bucket_id = 'atp-product-images');

-- Actualización: cupones, entrega, pagos y gestión de pedidos
alter table public.atp_orders add column if not exists subtotal numeric(12,2) not null default 0;
alter table public.atp_orders add column if not exists discount numeric(12,2) not null default 0;
alter table public.atp_orders add column if not exists coupon text not null default '';
alter table public.atp_orders add column if not exists delivery_method text not null default 'retiro';
alter table public.atp_orders add column if not exists status text not null default 'nuevo';
alter table public.atp_orders add column if not exists payment_status text not null default 'pending';
alter table public.atp_orders add column if not exists external_reference text;
alter table public.atp_orders add column if not exists mp_preference_id text;
alter table public.atp_orders add column if not exists mp_payment_id text;
alter table public.atp_orders add column if not exists updated_at timestamptz not null default now();
create unique index if not exists atp_orders_external_reference_idx on public.atp_orders(external_reference) where external_reference is not null;

drop policy if exists "ATP pedidos admin actualizar" on public.atp_orders;
create policy "ATP pedidos admin actualizar"
on public.atp_orders for update
to authenticated
using (true)
with check (true);

-- ATP Gestión 2.0: clientes, cupones, puntos, seguimiento y stock automático
create table if not exists public.atp_customers (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  name text not null default '',
  email text not null default '',
  orders_count integer not null default 0,
  total_spent numeric(12,2) not null default 0,
  points_balance integer not null default 0,
  lifetime_points integer not null default 0,
  last_order_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.atp_coupons (
  code text primary key,
  discount_percent numeric(5,2) not null check(discount_percent > 0 and discount_percent <= 100),
  active boolean not null default true,
  max_uses integer,
  used_count integer not null default 0,
  expires_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.atp_coupons(code,discount_percent) values ('AMIGOSATP',10),('MESSIATP',5),('SORTEOATP',20),('BIENVENIDOATP',10) on conflict(code) do nothing;
alter table public.atp_orders add column if not exists tracking_code text;
alter table public.atp_orders add column if not exists stock_processed boolean not null default false;
alter table public.atp_orders add column if not exists points_awarded integer not null default 0;
alter table public.atp_orders add column if not exists customer_id uuid references public.atp_customers(id);
create unique index if not exists atp_orders_tracking_code_idx on public.atp_orders(tracking_code) where tracking_code is not null;

alter table public.atp_customers enable row level security;
alter table public.atp_coupons enable row level security;

drop policy if exists "ATP clientes admin leer" on public.atp_customers;
create policy "ATP clientes admin leer" on public.atp_customers for select to authenticated using(true);

drop policy if exists "ATP cupones lectura pública" on public.atp_coupons;
create policy "ATP cupones lectura pública" on public.atp_coupons for select to anon,authenticated using(true);

drop policy if exists "ATP cupones admin insertar" on public.atp_coupons;
create policy "ATP cupones admin insertar" on public.atp_coupons for insert to authenticated with check(true);

drop policy if exists "ATP cupones admin actualizar" on public.atp_coupons;
create policy "ATP cupones admin actualizar" on public.atp_coupons for update to authenticated using(true) with check(true);

drop policy if exists "ATP cupones admin eliminar" on public.atp_coupons;
create policy "ATP cupones admin eliminar" on public.atp_coupons for delete to authenticated using(true);

drop policy if exists "ATP seguimiento público" on public.atp_orders;
create policy "ATP seguimiento público" on public.atp_orders for select to anon using(tracking_code is not null);

create or replace function public.atp_process_approved_order(p_external_reference text, p_payment_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare o public.atp_orders; item jsonb; c public.atp_customers; pts integer; clean_phone text;
begin
 select * into o from public.atp_orders where external_reference=p_external_reference for update;
 if o.id is null then return jsonb_build_object('ok',false,'reason','not_found'); end if;
 if o.stock_processed then return jsonb_build_object('ok',true,'already_processed',true,'tracking_code',o.tracking_code); end if;
 for item in select value from jsonb_array_elements(o.items) loop
   update public.atp_products set stock=greatest(0,stock-(item->>'quantity')::integer),updated_at=now() where id=item->>'id';
 end loop;
 clean_phone:=regexp_replace(coalesce(o.customer->>'phone',''),'[^0-9]','','g'); pts:=floor(o.total/1000)::integer;
 insert into public.atp_customers(phone,name,email,orders_count,total_spent,points_balance,lifetime_points,last_order_at)
 values(clean_phone,coalesce(o.customer->>'name',''),coalesce(o.customer->>'email',''),1,o.total,pts,pts,now())
 on conflict(phone) do update set name=excluded.name,email=case when excluded.email<>'' then excluded.email else atp_customers.email end,orders_count=atp_customers.orders_count+1,total_spent=atp_customers.total_spent+excluded.total_spent,points_balance=atp_customers.points_balance+excluded.points_balance,lifetime_points=atp_customers.lifetime_points+excluded.lifetime_points,last_order_at=now(),updated_at=now()
 returning * into c;
 update public.atp_coupons set used_count=used_count+1,updated_at=now() where code=o.coupon and o.coupon<>'';
 update public.atp_orders set payment_status='approved',status='pagado',mp_payment_id=p_payment_id,stock_processed=true,points_awarded=pts,customer_id=c.id,tracking_code=coalesce(tracking_code,'ATP-'||upper(substr(replace(id::text,'-',''),1,8))),updated_at=now() where id=o.id;
 return jsonb_build_object('ok',true,'points',pts,'tracking_code',coalesce(o.tracking_code,'ATP-'||upper(substr(replace(o.id::text,'-',''),1,8))));
end $$;


-- ATP Suplementos: numeración correlativa de pedidos y eliminación desde Admin

create sequence if not exists public.atp_order_number_seq start 1;

alter table public.atp_orders
  add column if not exists order_number bigint;

-- Asigna números correlativos a pedidos existentes según su fecha.
with numbered as (
  select id, row_number() over (order by created_at, id) as rn
  from public.atp_orders
  where order_number is null
)
update public.atp_orders o
set order_number = n.rn
from numbered n
where o.id = n.id;

select setval(
  'public.atp_order_number_seq',
  greatest(coalesce((select max(order_number) from public.atp_orders), 0) + 1, 1),
  false
);

alter table public.atp_orders
  alter column order_number set default nextval('public.atp_order_number_seq');

alter sequence public.atp_order_number_seq owned by public.atp_orders.order_number;

create unique index if not exists atp_orders_order_number_idx
  on public.atp_orders(order_number);

drop policy if exists "ATP pedidos admin eliminar" on public.atp_orders;
create policy "ATP pedidos admin eliminar"
on public.atp_orders for delete
to authenticated
using (true);
