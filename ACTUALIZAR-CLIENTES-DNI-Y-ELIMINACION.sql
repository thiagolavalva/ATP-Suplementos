-- Ejecutar completo en Supabase > SQL Editor > New query
alter table public.atp_customers add column if not exists tax_id text not null default '';
alter table public.atp_customers add column if not exists is_active boolean not null default true;
alter table public.atp_customers add column if not exists deleted_at timestamptz;
create index if not exists atp_customers_tax_id_idx on public.atp_customers(tax_id);

drop policy if exists "ATP clientes admin actualizar" on public.atp_customers;
create policy "ATP clientes admin actualizar"
on public.atp_customers for update
to authenticated
using (true)
with check (true);

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
 insert into public.atp_customers(phone,name,email,tax_id,orders_count,total_spent,points_balance,lifetime_points,last_order_at,is_active,deleted_at)
 values(clean_phone,coalesce(o.customer->>'name',''),coalesce(o.customer->>'email',''),regexp_replace(coalesce(o.customer->>'tax_id',''),'[^0-9]','','g'),1,o.total,pts,pts,now(),true,null)
 on conflict(phone) do update set name=excluded.name,email=case when excluded.email<>'' then excluded.email else atp_customers.email end,tax_id=case when excluded.tax_id<>'' then excluded.tax_id else atp_customers.tax_id end,orders_count=atp_customers.orders_count+1,total_spent=atp_customers.total_spent+excluded.total_spent,points_balance=atp_customers.points_balance+excluded.points_balance,lifetime_points=atp_customers.lifetime_points+excluded.lifetime_points,last_order_at=now(),is_active=true,deleted_at=null,updated_at=now()
 returning * into c;
 update public.atp_coupons set used_count=used_count+1,updated_at=now() where code=o.coupon and o.coupon<>'';
 update public.atp_orders set payment_status='approved',status='pago_confirmado',mp_payment_id=p_payment_id,stock_processed=true,points_awarded=pts,customer_id=c.id,tracking_code=coalesce(tracking_code,'ATP-'||upper(substr(replace(id::text,'-',''),1,8))),updated_at=now() where id=o.id;
 return jsonb_build_object('ok',true,'points',pts,'tracking_code',coalesce(o.tracking_code,'ATP-'||upper(substr(replace(o.id::text,'-',''),1,8))));
end $$;
