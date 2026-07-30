-- ATP Suplementos: permitir eliminar movimientos desde el administrador
-- Ejecutar una sola vez en Supabase > SQL Editor.
-- No borra movimientos al ejecutarse y no modifica el stock.

alter table public.atp_stock_movements enable row level security;

drop policy if exists "ATP stock admin eliminar" on public.atp_stock_movements;
create policy "ATP stock admin eliminar"
on public.atp_stock_movements
for delete
to authenticated
using (true);

grant delete on table public.atp_stock_movements to authenticated;
