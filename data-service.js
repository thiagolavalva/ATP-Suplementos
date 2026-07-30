(() => {
  const cfg=window.ATP_CONFIG||{}; const configured=typeof cfg.supabaseUrl==='string'&&cfg.supabaseUrl.startsWith('https://')&&typeof cfg.supabaseKey==='string'&&cfg.supabaseKey.length>20;
  const reject=async()=>{throw new Error('Falta configurar Supabase en config.js.')};
  if(!configured){window.ATPData={mode:'sin-configurar',getProducts:reject,getSettings:reject,signIn:reject,signOut:async()=>{},getSession:async()=>null,getOrders:async()=>[],getStockMovements:async()=>[],clearStockMovements:reject,deleteStockMovement:reject,adjustStock:reject,getCustomers:async()=>[],getCoupons:async()=>[],saveCoupon:reject,deleteCoupon:reject,updateOrder:reject,deleteOrder:reject,updateCustomer:reject};return}
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const normalizeProduct=p=>({id:String(p.id),name:p.name||'',brand:p.brand||'',category:p.category||'',detail:p.detail||'',cost:Number(p.cost||0),price:Number(p.price||0),stock:Number(p.stock||0),featured:p.featured!==false,active:p.active!==false,tag:p.tag||'',image:p.image||'',gallery:Array.isArray(p.gallery)?p.gallery:[],flavors:Array.isArray(p.flavors)?p.flavors:[],presentation:p.presentation||'',description:p.description||'',ingredients:p.ingredients||'',nutrition:p.nutrition||'',variants:Array.isArray(p.variants)?p.variants.map((v,i)=>({id:String(v.id||`var-${i+1}`),name:String(v.name||v.label||'Variante'),stock:Math.max(0,Number(v.stock||0))})):[]});
  async function getProducts({includeInactive=false}={}){let q=client.from('products').select('*').order('created_at',{ascending:false});if(!includeInactive)q=q.eq('active',true);const{data,error}=await q;if(error)throw error;return(data||[]).map(normalizeProduct)}
  async function getSettings(){const{data,error}=await client.from('store_settings').select('*').eq('id',1).maybeSingle();if(error)throw error;return data||{}}
  async function signIn(email,password){const{data,error}=await client.auth.signInWithPassword({email,password});if(error)throw new Error('Correo o contraseña incorrectos.');return data}
  async function signOut(){const{error}=await client.auth.signOut();if(error)throw error} async function getSession(){const{data,error}=await client.auth.getSession();if(error)throw error;return data.session}
  async function saveProduct(product){const clean=normalizeProduct(product);const{data,error}=await client.from('products').upsert({...clean,updated_at:new Date().toISOString()},{onConflict:'id'}).select().single();if(error)throw error;return normalizeProduct(data)}
  async function deleteProduct(id){const{error}=await client.from('products').delete().eq('id',String(id));if(error)throw error}
  async function saveSettings(v){const payload={id:1,storeName:v.storeName||'ATP Suplementos',whatsapp:v.whatsapp||'',instagram:v.instagram||'',location:v.location||'',heroTitle:v.heroTitle||'',heroText:v.heroText||'',maintenanceMode:Boolean(v.maintenanceMode),maintenanceMessage:v.maintenanceMessage||'Estamos agregando y actualizando productos. En breve la tienda volverá a estar disponible.',updated_at:new Date().toISOString()};const{data,error}=await client.from('store_settings').upsert(payload,{onConflict:'id'}).select().single();if(error)throw error;return data}
  const safe=n=>String(n||'imagen').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]/g,'-').replace(/-+/g,'-');
  async function uploadProductImage(file,id){if(!file)return'';if(!file.type.startsWith('image/'))throw new Error('El archivo debe ser una imagen.');if(file.size>5*1024*1024)throw new Error('La imagen no puede superar 5 MB.');const path=`${safe(id)}/${Date.now()}-${safe(file.name)}`;const{error}=await client.storage.from('atp-product-images').upload(path,file,{cacheControl:'3600'});if(error)throw error;return client.storage.from('atp-product-images').getPublicUrl(path).data.publicUrl}
  async function table(name,order='created_at'){const{data,error}=await client.from(name).select('*').order(order,{ascending:false});if(error)throw error;return data||[]}
  window.ATPData={mode:'supabase',client,getProducts,getSettings,signIn,signOut,getSession,saveProduct,deleteProduct,saveSettings,uploadProductImage,
    getOrders:()=>table('orders'),getStockMovements:()=>table('stock_movements','created_at'),
    async clearStockMovements(){
      const {error}=await client.from('stock_movements').delete().not('id','is',null);
      if(error){
        if(error.code==='42501'||/row-level security|permission denied/i.test(error.message||''))throw new Error('Supabase no permite borrar movimientos todavía. Ejecutá una sola vez CONFIGURAR-HISTORIAL-STOCK.sql.');
        throw error;
      }
      const {count,error:verifyError}=await client.from('stock_movements').select('id',{count:'exact',head:true});
      if(verifyError)throw verifyError;
      if(Number(count||0)>0)throw new Error('Supabase no confirmó el borrado. El historial sigue guardado; revisá la política DELETE de la tabla.');
      return true;
    },
    async deleteStockMovement(id){
      const movementId=String(id);
      const {error}=await client.from('stock_movements').delete().eq('id',movementId);
      if(error){
        if(error.code==='42501'||/row-level security|permission denied/i.test(error.message||''))throw new Error('Supabase no permite borrar movimientos todavía. Ejecutá una sola vez CONFIGURAR-HISTORIAL-STOCK.sql.');
        throw error;
      }
      const {data:remaining,error:verifyError}=await client.from('stock_movements').select('id').eq('id',movementId).maybeSingle();
      if(verifyError)throw verifyError;
      if(remaining)throw new Error('Supabase no confirmó la eliminación. El movimiento continúa guardado; revisá la política DELETE de la tabla.');
      return true;
    },getCustomers:async()=>{try{return await table('atp_customers','updated_at')}catch(e){if(e.code==='42P01'||e.code==='PGRST205'||/does not exist|schema cache/i.test(e.message||''))return[];throw e}},getCoupons:async()=>{try{return await table('atp_coupons','created_at')}catch(e){if(e.code==='42P01'||e.code==='PGRST205'||/does not exist|schema cache/i.test(e.message||''))return[];throw e}},
    async updateOrder(id,changes){const{data,error}=await client.from('orders').update({...changes,updated_at:new Date().toISOString()}).eq('id',id).select().single();if(error)throw error;return data},
    async deleteOrder(id){const{error}=await client.from('orders').delete().eq('id',id);if(error)throw error},
    async adjustStock(productId,newStock,movementType,reason){const id=String(productId),next=Math.max(0,Number(newStock)||0);const{data:product,error:readError}=await client.from('products').select('id,name,stock').eq('id',id).single();if(readError)throw readError;const before=Number(product.stock||0),delta=next-before;if(delta===0)return{ok:true,changed:false};const{error:updateError}=await client.from('products').update({stock:next,updated_at:new Date().toISOString()}).eq('id',id);if(updateError)throw updateError;const{error:movementError}=await client.from('stock_movements').insert({product_id:id,product_name:product.name||'',movement_type:movementType||'other',quantity_change:delta,stock_before:before,stock_after:next,reason:reason||''});if(movementError){await client.from('products').update({stock:before,updated_at:new Date().toISOString()}).eq('id',id);throw movementError}return{ok:true,changed:true,stock:next}},
    async updateCustomer(id,changes){const{data,error}=await client.from('atp_customers').update({...changes,updated_at:new Date().toISOString()}).eq('id',id).select().single();if(error)throw error;return data},
    async saveCoupon(c){const payload={code:String(c.code).trim().toUpperCase(),discount_percent:Number(c.discount_percent),active:Boolean(c.active),max_uses:c.max_uses?Number(c.max_uses):null,expires_at:c.expires_at||null,updated_at:new Date().toISOString()};const{data,error}=await client.from('atp_coupons').upsert(payload,{onConflict:'code'}).select().single();if(error)throw error;return data},
    async deleteCoupon(code){const{error}=await client.from('atp_coupons').delete().eq('code',code);if(error)throw error},
    async getOrderByTracking(code){const{data,error}=await client.from('orders').select('*').eq('tracking_code',code).maybeSingle();if(error)throw error;return data}

  };
})();
