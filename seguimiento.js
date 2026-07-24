const money=value=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(value||0);
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const STATES=[
  {key:'pendiente_pago',label:'Pendiente de pago'},
  {key:'pago_confirmado',label:'Pago confirmado'},
  {key:'preparando_pedido',label:'Preparando pedido'},
  {key:'enviado',label:'Enviado'},
  {key:'entregado',label:'Entregado'}
];
const form=document.getElementById('trackForm'),codeInput=document.getElementById('trackCode'),dniInput=document.getElementById('trackDni'),button=document.getElementById('trackButton'),errorBox=document.getElementById('trackError'),result=document.getElementById('result');
function renderSteps(status){
  if(status==='cancelado'){steps.innerHTML='<div class="cancelled">Pedido cancelado. Comunicate con ATP Suplementos si necesitás ayuda.</div>';return}
  const current=Math.max(0,STATES.findIndex(item=>item.key===status));
  steps.innerHTML=STATES.map((item,index)=>`<div class="step ${index<=current?'done':''}"><i>${index<current?'✓':index+1}</i><span>${item.label}</span></div>`).join('');
}
form.addEventListener('submit',async event=>{
  event.preventDefault();errorBox.textContent='';result.classList.add('hidden');
  const code=codeInput.value.trim().toUpperCase(),dni=dniInput.value.replace(/\D/g,'');
  if(!code||dni.length<7){errorBox.textContent='Completá correctamente el número de pedido y el DNI/CUIT.';return}
  const original=button.textContent;button.disabled=true;button.textContent='Consultando...';
  try{
    const response=await fetch('/api/track-order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,dni})});
    const data=await response.json();if(!response.ok)throw new Error(data.error||'No se pudo consultar el pedido.');
    const order=data.order,statusInfo=STATES.find(item=>item.key===order.status);
    orderCode.textContent=order.trackingCode;orderStatus.textContent=statusInfo?.label||(order.status==='cancelado'?'Cancelado':'Estado actualizado');
    orderStatus.className=order.status==='cancelado'?'cancel-status':'';orderCustomer.textContent=order.customerName;orderTotal.textContent=money(order.total);orderDate.textContent=new Date(order.createdAt).toLocaleString('es-AR');
    renderSteps(order.status);
    orderItems.innerHTML=(order.items||[]).map(item=>`<div class="item"><span>${Number(item.quantity)} × ${escapeHtml(item.name)}</span><b>${money(Number(item.price)*Number(item.quantity))}</b></div>`).join('');
    result.classList.remove('hidden');result.scrollIntoView({behavior:'smooth',block:'start'});
  }catch(error){errorBox.textContent=error.message||'No se pudo consultar el pedido.'}
  finally{button.disabled=false;button.textContent=original}
});
const preset=new URLSearchParams(location.search).get('code');if(preset)codeInput.value=preset.toUpperCase();
