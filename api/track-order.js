const SUPABASE_URL=process.env.SUPABASE_URL||'https://kmbkkzhyzyyrjdphamru.supabase.co';
const SUPABASE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_PUBLISHABLE_KEY;
const headers={apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json'};
function send(res,status,payload){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(payload))}
const digits=value=>String(value||'').replace(/\D/g,'');
const LEGACY={nuevo:'pendiente_pago',esperando_pago:'pendiente_pago',pagado:'pago_confirmado',preparando:'preparando_pedido',listo:'preparando_pedido',en_camino:'enviado',pago_rechazado:'cancelado'};
function normalizeStatus(order){if(order?.status==='cancelado')return'cancelado';if(order?.payment_status==='approved'&&['nuevo','esperando_pago','pendiente_pago'].includes(order?.status))return'pago_confirmado';return LEGACY[order?.status]||order?.status||'pendiente_pago'}
module.exports=async function(req,res){
  if(req.method!=='POST'){res.setHeader('Allow','POST');return send(res,405,{error:'Método no permitido.'})}
  if(!SUPABASE_KEY)return send(res,500,{error:'El seguimiento no está disponible temporalmente.'});
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
    const code=String(body.code||'').trim().toUpperCase();
    const dni=digits(body.dni);
    if(!/^ATP-\d{4}-\d{5,}$/.test(code)||dni.length<7||dni.length>11)return send(res,400,{error:'Ingresá un número de pedido y DNI válidos.'});
    const url=`${SUPABASE_URL}/rest/v1/atp_orders?select=tracking_code,status,payment_status,total,created_at,customer,items&tracking_code=eq.${encodeURIComponent(code)}&limit=1`;
    const response=await fetch(url,{headers});
    if(!response.ok)throw new Error(`Supabase respondió ${response.status}`);
    const rows=await response.json();
    const order=rows[0];
    if(!order||digits(order.customer?.tax_id)!==dni)return send(res,404,{error:'No encontramos un pedido con ese número y DNI.'});
    return send(res,200,{order:{trackingCode:order.tracking_code,status:normalizeStatus(order),total:Number(order.total||0),createdAt:order.created_at,customerName:order.customer?.name||'Cliente ATP',items:(Array.isArray(order.items)?order.items:[]).map(item=>({name:item.name||'Producto',quantity:Number(item.quantity||0),price:Number(item.price||0)}))}});
  }catch(error){console.error(error);return send(res,500,{error:'No se pudo consultar el pedido. Intentá nuevamente.'})}
};
