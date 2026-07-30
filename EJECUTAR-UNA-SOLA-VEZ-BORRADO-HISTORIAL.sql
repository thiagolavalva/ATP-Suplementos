-- ATP SUPLEMENTOS
-- Activa únicamente el borrado permanente del historial de stock.
-- NO borra productos, pedidos, configuraciones ni movimientos existentes.

begin;

-- Comprobar que esta es la base correcta antes de hacer cambios.
do $$
begin
  if to_regclass('public.atp_stock_movements') is null then
    raise exception 'No existe public.atp_stock_movements. Estás en el proyecto de Supabase incorrecto o todavía no activaste el historial.';
  end if;
end $$;

alter table public.atp_stock_movements enable row level security;

drop policy if exists "ATP stock admin eliminar" on public.atp_stock_movements;
create policy "ATP stock admin eliminar"
on public.atp_stock_movements
for delete
to authenticated
using (true);

grant select, delete on table public.atp_stock_movements to authenticated;

commit;
