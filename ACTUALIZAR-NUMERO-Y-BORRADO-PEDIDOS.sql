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
