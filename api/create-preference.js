const crypto = require('crypto');
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kmbkkzhyzyyrjdphamru.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_bVgYzhkQd-ke4w5OvvlLhw_dfcUVqRV';
const COUPONS = { AMIGOSATP: 10, MESSIATP: 5, SORTEOATP: 20, BIENVENIDOATP: 10 };
const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
function send(res,status,payload){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(payload))}
function baseUrl(req){const protocol=String(req.headers['x-forwarded-proto']||'https').split(',')[0].trim();const host=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim();if(!host)throw new Error('URL inválida');return `${protocol}://${host}`}
module.exports=async function(req,res){
 if(req.method!=='POST'){res.setHeader('Allow','POST');return send(res,405,{error:'Método no permitido.'})}
 const accessToken=process.env.MP_ACCESS_TOKEN;if(!accessToken)return send(res,500,{error:'Falta configurar MP_ACCESS_TOKEN en Vercel.'});
 try{
  const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});const rawItems=Array.isArray(body.items)?body.items:[];
  if(!rawItems.length||rawItems.length>50)return send(res,400,{error:'El carrito está vacío o no es válido.'});
  const quantities=new Map();for(const item of rawItems){const id=String(item?.id||'').trim(),q=Number(item?.quantity);if(!id||!Number.isInteger(q)||q<1||q>20)return send(res,400,{error:'Producto o cantidad inválida.'});quantities.set(id,Math.min(20,(quantities.get(id)||0)+q))}
  const ids=[...quantities.keys()],inFilter=`(${ids.map(id=>`"${id.replaceAll('"','')}"`).join(',')})`;
  const pr=await fetch(`${SUPABASE_URL}/rest/v1/atp_products?select=id,name,brand,price,stock,active&id=in.${encodeURIComponent(inFilter)}`,{headers});if(!pr.ok)throw new Error(`Supabase respondió ${pr.status}`);
  const products=await pr.json(),byId=new Map(products.map(p=>[String(p.id),p]));let subtotal=0;const orderItems=[];
  for(const [id,quantity] of quantities){const p=byId.get(id);if(!p||p.active===false)return send(res,409,{error:'Un producto ya no está disponible.'});const price=Number(p.price),stock=Number(p.stock);if(!Number.isFinite(price)||price<=0||stock<quantity)return send(res,409,{error:`Revisá precio o stock de ${p.name||'un producto'}.`});subtotal+=price*quantity;orderItems.push({id,name:p.name,brand:p.brand,price,quantity})}
  const coupon=String(body.coupon||'').trim().toUpperCase(),percent=COUPONS[coupon]||0,discount=Math.round(subtotal*percent)/100,total=Math.round((subtotal-discount)*100)/100;
  const discountedItems=orderItems.map(x=>({...x,unit_price:Math.round(x.price*(1-percent/100)*100)/100}));
  const calculated=discountedItems.reduce((a,x)=>a+x.unit_price*x.quantity,0),difference=Math.round((total-calculated)*100)/100;if(discountedItems.length&&difference)discountedItems[0].unit_price=Math.round((discountedItems[0].unit_price+difference/discountedItems[0].quantity)*100)/100;
  const deliveryMethod=['retiro','coordinar'].includes(body.deliveryMethod)?body.deliveryMethod:'retiro';const customer={name:String(body.customer?.name||'').slice(0,120),phone:String(body.customer?.phone||'').slice(0,40)};
  const externalReference=`ATP-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const or=await fetch(`${SUPABASE_URL}/rest/v1/atp_orders`,{method:'POST',headers:{...headers,Prefer:'return=representation'},body:JSON.stringify({items:orderItems,customer,subtotal,discount,total,coupon,delivery_method:deliveryMethod,channel:'mercadopago',status:'esperando_pago',payment_status:'pending',external_reference:externalReference})});if(!or.ok)throw new Error(`No se pudo guardar el pedido (${or.status})`);const [order]=await or.json();
  const base=baseUrl(req);const preference={items:discountedItems.map(x=>({id:x.id,title:String(x.name).slice(0,120),description:String(x.brand||'ATP Suplementos').slice(0,256),quantity:x.quantity,currency_id:'ARS',unit_price:x.unit_price})),external_reference:externalReference,notification_url:`${base}/api/mercadopago-webhook`,back_urls:{success:`${base}/pago-exitoso.html?order=${order.id}`,failure:`${base}/pago-error.html?order=${order.id}`,pending:`${base}/pago-pendiente.html?order=${order.id}`},auto_return:'approved',statement_descriptor:'ATP SUPLEMENTOS',metadata:{order_id:order.id,coupon,discount,delivery_method:deliveryMethod}};
  const mr=await fetch('https://api.mercadopago.com/checkout/preferences',{method:'POST',headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json','X-Idempotency-Key':externalReference},body:JSON.stringify(preference)});const md=await mr.json();if(!mr.ok){await fetch(`${SUPABASE_URL}/rest/v1/atp_orders?id=eq.${order.id}`,{method:'PATCH',headers,body:JSON.stringify({status:'error_pago'})});return send(res,502,{error:md.message||'Mercado Pago no pudo crear el pago.'})}
  await fetch(`${SUPABASE_URL}/rest/v1/atp_orders?id=eq.${order.id}`,{method:'PATCH',headers,body:JSON.stringify({mp_preference_id:md.id,updated_at:new Date().toISOString()})});
  return send(res,200,{preferenceId:md.id,checkoutUrl:md.init_point||md.sandbox_init_point,externalReference,orderId:order.id,total,discount});
 }catch(e){console.error(e);return send(res,500,{error:'No se pudo iniciar el pago. Intentá nuevamente.'})}
};
