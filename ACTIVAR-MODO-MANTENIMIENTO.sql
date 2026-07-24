-- Ejecutar una sola vez en Supabase > SQL Editor
alter table public.atp_settings
  add column if not exists "maintenanceMode" boolean not null default false,
  add column if not exists "maintenanceMessage" text not null default 'Estamos agregando y actualizando productos. En breve la tienda volverá a estar disponible.';

update public.atp_settings
set "maintenanceMode" = coalesce("maintenanceMode", false),
    "maintenanceMessage" = coalesce(nullif("maintenanceMessage", ''), 'Estamos agregando y actualizando productos. En breve la tienda volverá a estar disponible.')
where id = 1;
