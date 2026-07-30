-- ATP Suplementos: habilitar el borrado seguro del historial de stock
-- Ejecutar UNA VEZ en Supabase > SQL Editor.
-- Borra únicamente los registros del historial. No cambia el stock de los productos.

create or replace function public.atp_clear_stock_movements()
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  deleted_count integer;
begin
  if auth.uid() is null then
    raise exception 'No autorizado';
  end if;

  delete from public.atp_stock_movements;
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.atp_clear_stock_movements() from public;
grant execute on function public.atp_clear_stock_movements() to authenticated;
