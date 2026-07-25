-- ATP Suplementos: ficha individual y stock por sabor/variante
-- Ejecutar una sola vez en Supabase > SQL Editor.

alter table public.atp_products
  add column if not exists variants jsonb not null default '[]'::jsonb;

-- Procesa el pago confirmado y descuenta la variante elegida cuando corresponde.
create or replace function public.atp_process_approved_order(p_external_reference text, p_payment_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  o public.atp_orders;
  item jsonb;
  c public.atp_customers;
  pts integer;
  clean_phone text;
  p public.atp_products;
  qty integer;
  next_stock integer;
  variant_id text;
  variant_name text;
  variant_stock integer;
  updated_variants jsonb;
begin
  select * into o from public.atp_orders where external_reference=p_external_reference for update;
  if not found then raise exception 'Pedido no encontrado'; end if;
  if o.stock_processed then return jsonb_build_object('ok',true,'already_processed',true,'tracking_code',o.tracking_code); end if;

  for item in select * from jsonb_array_elements(coalesce(o.items,'[]'::jsonb)) loop
    qty:=greatest(1,coalesce((item->>'quantity')::integer,1));
    variant_id:=nullif(item->>'variant_id','');
    variant_name:=nullif(item->>'variant_name','');
    select * into p from public.atp_products where id=item->>'id' for update;
    if found then
      if variant_id is not null and jsonb_array_length(coalesce(p.variants,'[]'::jsonb))>0 then
        select coalesce((v->>'stock')::integer,0) into variant_stock
        from jsonb_array_elements(p.variants) v where v->>'id'=variant_id limit 1;
        if variant_stock is null then raise exception 'Variante no encontrada para %',p.name; end if;
        if variant_stock<qty then raise exception 'Stock insuficiente de % - %',p.name,coalesce(variant_name,variant_id); end if;
        select jsonb_agg(case when v->>'id'=variant_id then jsonb_set(v,'{stock}',to_jsonb(greatest(0,(v->>'stock')::integer-qty)),true) else v end)
          into updated_variants from jsonb_array_elements(p.variants) v;
        select coalesce(sum((v->>'stock')::integer),0) into next_stock from jsonb_array_elements(updated_variants) v;
        update public.atp_products set variants=updated_variants,stock=next_stock,updated_at=now() where id=p.id;
      else
        if p.stock<qty then raise exception 'Stock insuficiente de %',p.name; end if;
        next_stock:=p.stock-qty;
        update public.atp_products set stock=next_stock,updated_at=now() where id=p.id;
      end if;
      insert into public.atp_stock_movements(product_id,product_name,movement_type,quantity_change,stock_before,stock_after,reason,order_id,order_number)
      values(p.id,p.name,'sale',-qty,p.stock,next_stock,
        case when variant_name is not null then 'Venta confirmada · '||variant_name else 'Venta confirmada' end,
        o.id,coalesce(o.order_number::text,o.tracking_code));
    end if;
  end loop;

  clean_phone:=regexp_replace(coalesce(o.customer->>'phone',''),'[^0-9]','','g');
  insert into public.atp_customers(name,phone,email,tax_id,address,last_order_at,orders_count,total_spent,updated_at)
  values(coalesce(o.customer->>'name','Cliente ATP'),clean_phone,o.customer->>'email',o.customer->>'tax_id',coalesce(o.customer->'address','{}'::jsonb),now(),1,o.total,now())
  on conflict(phone) do update set name=excluded.name,email=excluded.email,tax_id=coalesce(excluded.tax_id,atp_customers.tax_id),address=excluded.address,last_order_at=now(),orders_count=atp_customers.orders_count+1,total_spent=atp_customers.total_spent+o.total,updated_at=now(),is_active=true,deleted_at=null
  returning * into c;
  pts:=greatest(0,floor(o.total/1000));
  update public.atp_customers set points_balance=points_balance+pts,points_earned=points_earned+pts where id=c.id;
  if coalesce(o.coupon,'')<>'' then update public.atp_coupons set used_count=used_count+1,updated_at=now() where code=o.coupon; end if;
  update public.atp_orders set payment_status='approved',status='pago_confirmado',mp_payment_id=p_payment_id,stock_processed=true,points_awarded=pts,customer_id=c.id,tracking_code=coalesce(tracking_code,'ATP-'||upper(substr(replace(id::text,'-',''),1,8))),updated_at=now() where id=o.id;
  return jsonb_build_object('ok',true,'tracking_code',o.tracking_code,'points',pts);
end $$;

grant execute on function public.atp_process_approved_order(text,text) to authenticated, anon, service_role;

-- Recalcula el stock total a partir de las variantes existentes.
update public.atp_products p
set stock=(select coalesce(sum((v->>'stock')::integer),0) from jsonb_array_elements(p.variants) v)
where jsonb_array_length(coalesce(p.variants,'[]'::jsonb))>0;
