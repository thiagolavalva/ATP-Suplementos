-- ATP Suplementos: borrado del historial de stock (versión corregida)
-- Ejecutar TODO este archivo una sola vez en Supabase > SQL Editor > Run.
-- Estas funciones borran registros del historial, pero NUNCA cambian el stock actual.

-- Eliminar versiones anteriores para evitar conflictos de firma o retorno.
drop function if exists public.atp_clear_stock_movements();
drop function if exists public.atp_delete_stock_movement(bigint);

create function public.atp_clear_stock_movements()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_count integer := 0;
begin
  delete from public.atp_stock_movements;
  get diagnostics v_deleted_count = row_count;
  return v_deleted_count;
end;
$$;

create function public.atp_delete_stock_movement(p_movement_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_count integer := 0;
begin
  delete from public.atp_stock_movements
  where id = p_movement_id;

  get diagnostics v_deleted_count = row_count;
  return v_deleted_count > 0;
end;
$$;

revoke all on function public.atp_clear_stock_movements() from public;
revoke all on function public.atp_delete_stock_movement(bigint) from public;
grant execute on function public.atp_clear_stock_movements() to authenticated;
grant execute on function public.atp_delete_stock_movement(bigint) to authenticated;
