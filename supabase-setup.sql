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
