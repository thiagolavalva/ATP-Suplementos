(() => {
  const cfg=window.ATP_CONFIG||{}; const configured=typeof cfg.supabaseUrl==='string'&&cfg.supabaseUrl.startsWith('https://')&&typeof cfg.supabaseKey==='string'&&cfg.supabaseKey.length>20;
  const reject=async()=>{throw new Error('Falta configurar Supabase en config.js.')};
  if(!configured){window.ATPData={mode:'sin-configurar',getProducts:reject,getSettings:reject,signIn:reject,signOut:async()=>{},getSession:async()=>null,getOrders:async()=>[],getCustomers:async()=>[],getCoupons:async()=>[],saveCoupon:reject,deleteCoupon:reject,updateOrder:reject,deleteOrder:reject,updateCustomer:reject};return}
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const normalizeProduct=p=>({id:String(p.id),name:p.name||'',brand:p.brand||'',category:p.category||'',detail:p.detail||'',cost:Number(p.cost||0),price:Number(p.price||0),stock:Number(p.stock||0),featured:p.featured!==false,active:p.active!==false,tag:p.tag||'',image:p.image||'',gallery:Array.isArray(p.gallery)?p.gallery:[],flavors:Array.isArray(p.flavors)?p.flavors:[],presentation:p.presentation||'',description:p.description||'',ingredients:p.ingredients||'',nutrition:p.nutrition||''});
  async function getProducts({includeInactive=false}={}){let q=client.from('atp_products').select('*').order('created_at',{ascending:false});if(!includeInactive)q=q.eq('active',true);const{data,error}=await q;if(error)throw error;return(data||[]).map(normalizeProduct)}
  async function getSettings(){const{data,error}=await client.from('atp_settings').select('*').eq('id',1).maybeSingle();if(error)throw error;return data||{}}
  async function signIn(email,password){const{data,error}=await client.auth.signInWithPassword({email,password});if(error)throw new Error('Correo o contraseña incorrectos.');return data}
  async function signOut(){const{error}=await client.auth.signOut();if(error)throw error} async function getSession(){const{data,error}=await client.auth.getSession();if(error)throw error;return data.session}
  async function saveProduct(product){const clean=normalizeProduct(product);const{data,error}=await client.from('atp_products').upsert({...clean,updated_at:new Date().toISOString()},{onConflict:'id'}).select().single();if(error)throw error;return normalizeProduct(data)}
  async function deleteProduct(id){const{error}=await client.from('atp_products').delete().eq('id',String(id));if(error)throw error}
  async function saveSettings(v){const payload={id:1,storeName:v.storeName||'ATP Suplementos',whatsapp:v.whatsapp||'',instagram:v.instagram||'',location:v.location||'',heroTitle:v.heroTitle||'',heroText:v.heroText||'',updated_at:new Date().toISOString()};const{data,error}=await client.from('atp_settings').upsert(payload,{onConflict:'id'}).select().single();if(error)throw error;return data}
  const safe=n=>String(n||'imagen').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]/g,'-').replace(/-+/g,'-');
  async function uploadProductImage(file,id){if(!file)return'';if(!file.type.startsWith('image/'))throw new Error('El archivo debe ser una imagen.');if(file.size>5*1024*1024)throw new Error('La imagen no puede superar 5 MB.');const path=`${safe(id)}/${Date.now()}-${safe(file.name)}`;const{error}=await client.storage.from('atp-product-images').upload(path,file,{cacheControl:'3600'});if(error)throw error;return client.storage.from('atp-product-images').getPublicUrl(path).data.publicUrl}
  async function table(name,order='created_at'){const{data,error}=await client.from(name).select('*').order(order,{ascending:false});if(error)throw error;return data||[]}
  window.ATPData={mode:'supabase',client,getProducts,getSettings,signIn,signOut,getSession,saveProduct,deleteProduct,saveSettings,uploadProductImage,
    getOrders:()=>table('atp_orders'),getCustomers:()=>table('atp_customers','updated_at'),getCoupons:()=>table('atp_coupons','created_at'),
    async updateOrder(id,changes){const{data,error}=await client.from('atp_orders').update({...changes,updated_at:new Date().toISOString()}).eq('id',id).select().single();if(error)throw error;return data},
    async deleteOrder(id){const{error}=await client.from('atp_orders').delete().eq('id',id);if(error)throw error},
    async updateCustomer(id,changes){const{data,error}=await client.from('atp_customers').update({...changes,updated_at:new Date().toISOString()}).eq('id',id).select().single();if(error)throw error;return data},
    async saveCoupon(c){const payload={code:String(c.code).trim().toUpperCase(),discount_percent:Number(c.discount_percent),active:Boolean(c.active),max_uses:c.max_uses?Number(c.max_uses):null,expires_at:c.expires_at||null,updated_at:new Date().toISOString()};const{data,error}=await client.from('atp_coupons').upsert(payload,{onConflict:'code'}).select().single();if(error)throw error;return data},
    async deleteCoupon(code){const{error}=await client.from('atp_coupons').delete().eq('code',code);if(error)throw error},
    async getOrderByTracking(code){const{data,error}=await client.from('atp_orders').select('*').eq('tracking_code',code).maybeSingle();if(error)throw error;return data}

  };
})();
