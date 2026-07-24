const CUSTOMER_STORAGE_KEY='atp_customer_data_v2';
const fields=['customerFirstName','customerLastName','customerTaxId','customerPhone','customerEmail','customerCountry','customerProvince','customerCity','customerPostalCode','customerStreet','customerStreetNumber','customerFloor','customerApartment'];
const el=id=>document.getElementById(id); const money=v=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(v);
const cart=JSON.parse(localStorage.getItem('atp_cart')||'{}');let products=[],coupons={},appliedCoupon='';
function showToast(m){toast.textContent=m;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2600)}
function loadSavedCustomer(){try{const saved=JSON.parse(localStorage.getItem(CUSTOMER_STORAGE_KEY)||'{}');fields.forEach(id=>{if(saved[id]!==undefined)el(id).value=saved[id]})}catch(_){}}
function saveCustomerData(){const data={};fields.forEach(id=>data[id]=el(id).value.trim());localStorage.setItem(CUSTOMER_STORAGE_KEY,JSON.stringify(data))}
function entries(){return Object.entries(cart).filter(([id])=>products.some(p=>String(p.id)===String(id)))}
function totals(){const subtotalValue=entries().reduce((sum,[id,q])=>{const p=products.find(x=>String(x.id)===String(id));return sum+Number(p.price)*Number(q)},0),percent=Number(coupons[appliedCoupon]||0),discountValue=Math.round(subtotalValue*percent)/100;return{subtotal:subtotalValue,discount:discountValue,total:Math.max(0,subtotalValue-discountValue)}}
function renderSummary(){const list=entries();if(!list.length){location.replace('index.html');return}orderItems.innerHTML=list.map(([id,q])=>{const p=products.find(x=>String(x.id)===String(id));return`<div class="order-item"><div><h3>${q} × ${p.name}</h3><small>${p.brand||'ATP Suplementos'}</small></div><b>${money(Number(p.price)*Number(q))}</b></div>`}).join('');const t=totals();subtotal.textContent=money(t.subtotal);discount.textContent=`-${money(t.discount)}`;total.textContent=money(t.total);if(window.totalHighlight)totalHighlight.textContent=money(t.total);discountRow.classList.toggle('visible',t.discount>0)}
function emailValid(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
const requiredRules={
  customerFirstName:{valid:v=>v.trim().length>=2,message:'Ingresá tu nombre.'},
  customerLastName:{valid:v=>v.trim().length>=2,message:'Ingresá tu apellido.'},
  customerTaxId:{valid:v=>v.replace(/\D/g,'').length>=7,message:'Ingresá un DNI o CUIT válido.'},
  customerPhone:{valid:v=>v.replace(/\D/g,'').length>=8,message:'Ingresá un teléfono válido.'},
  customerEmail:{valid:v=>emailValid(v.trim()),message:'Ingresá un email válido.'},
  customerCountry:{valid:v=>v.trim().length>=3,message:'Ingresá el país.'},
  customerProvince:{valid:v=>v.trim().length>=2,message:'Ingresá la provincia.'},
  customerCity:{valid:v=>v.trim().length>=2,message:'Ingresá la ciudad.'},
  customerPostalCode:{valid:v=>v.trim().length>=3,message:'Ingresá el código postal.'},
  customerStreet:{valid:v=>v.trim().length>=2,message:'Ingresá la calle.'},
  customerStreetNumber:{valid:v=>v.trim().length>=1,message:'Ingresá el número.'}
};
function setFieldState(id,show){
  const input=el(id),rule=requiredRules[id],isValid=rule.valid(input.value);
  input.classList.toggle('invalid',show&&!isValid);
  input.setAttribute('aria-invalid',show&&!isValid?'true':'false');
  const label=input.closest('label');
  let message=label&&label.querySelector('.field-error');
  if(label&&!message){message=document.createElement('small');message.className='field-error';label.appendChild(message)}
  if(message)message.textContent=show&&!isValid?rule.message:'';
  return isValid;
}
function validCustomer(show=false){
  const ids=Object.keys(requiredRules),invalidIds=ids.filter(id=>!setFieldState(id,show));
  const basicIds=['customerFirstName','customerLastName','customerTaxId','customerPhone','customerEmail'];
  const addressIds=['customerCountry','customerProvince','customerCity','customerPostalCode','customerStreet','customerStreetNumber'];
  const basic=basicIds.every(id=>requiredRules[id].valid(el(id).value));
  const address=addressIds.every(id=>requiredRules[id].valid(el(id).value));
  customerError.textContent=show&&!basic?'Revisá los campos marcados en rojo.':'';
  addressError.textContent=show&&!address?'Revisá los campos marcados en rojo.':'';
  const ok=basic&&address;
  couponCard.classList.toggle('locked',!ok);paymentCard.classList.toggle('locked',!ok);
  couponInput.disabled=!ok;applyCouponBtn.disabled=!ok;
  // El botón queda disponible para que, al tocarlo, se indiquen los campos faltantes.
  submitOrderBtn.disabled=false;
  if(show&&!ok&&invalidIds.length){
    const first=el(invalidIds[0]);
    first.focus({preventScroll:true});
    first.scrollIntoView({behavior:'smooth',block:'center'});
    showToast('Completá los campos marcados en rojo para realizar el pedido.');
  }
  return ok
}
function applyCoupon(){if(!validCustomer(true))return;const code=couponInput.value.trim().toUpperCase();if(!code){appliedCoupon='';couponMessage.textContent='';renderSummary();return}if(!coupons[code]){appliedCoupon='';couponMessage.textContent='Código inválido, vencido o sin usos disponibles.';renderSummary();return}appliedCoupon=code;couponInput.value=code;couponMessage.textContent=`${code}: ${coupons[code]}% de descuento aplicado.`;renderSummary()}
function customerPayload(){return{name:`${customerFirstName.value.trim()} ${customerLastName.value.trim()}`.trim(),first_name:customerFirstName.value.trim(),last_name:customerLastName.value.trim(),tax_id:customerTaxId.value.replace(/\D/g,''),phone:customerPhone.value.trim(),email:customerEmail.value.trim(),address:{country:customerCountry.value.trim(),province:customerProvince.value.trim(),city:customerCity.value.trim(),postal_code:customerPostalCode.value.trim(),street:customerStreet.value.trim(),street_number:customerStreetNumber.value.trim(),floor:customerFloor.value.trim(),apartment:customerApartment.value.trim()}}}
fields.forEach(id=>el(id).addEventListener('input',()=>{saveCustomerData();if(requiredRules[id])setFieldState(id,true);validCustomer(false)}));applyCouponBtn.onclick=applyCoupon;couponInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();applyCoupon()}});
checkoutForm.addEventListener('submit',async e=>{e.preventDefault();if(!validCustomer(true))return;const list=entries();if(!list.length)return showToast('El carrito está vacío');const method='transferencia',original=submitOrderBtn.textContent;submitOrderBtn.disabled=true;submitOrderBtn.textContent='Guardando pedido...';try{const deliveryMethod=document.querySelector('input[name="delivery"]:checked').value,payload={items:list.map(([id,quantity])=>({id,quantity})),coupon:appliedCoupon,deliveryMethod,customer:customerPayload()};const response=await fetch('/api/create-transfer-order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),data=await response.json();if(!response.ok)throw new Error(data.error||'No se pudo crear el pedido.');sessionStorage.setItem('atp_last_order',JSON.stringify({orderId:data.orderId,trackingCode:data.trackingCode,paymentMethod:method,total:data.total}));location.href=`transferencia-pendiente.html?order=${encodeURIComponent(data.orderId)}&tracking=${encodeURIComponent(data.trackingCode)}`}catch(err){showToast(err.message);submitOrderBtn.disabled=false;submitOrderBtn.textContent=original}});
(async()=>{try{products=await ATPData.getProducts();const{data,error}=await ATPData.client.from('atp_coupons').select('code,discount_percent,max_uses,used_count,expires_at').eq('active',true);if(error)throw error;const today=new Date().toISOString().slice(0,10);(data||[]).filter(c=>(!c.expires_at||c.expires_at>=today)&&(!c.max_uses||c.used_count<c.max_uses)).forEach(c=>coupons[c.code]=Number(c.discount_percent));loadSavedCustomer();renderSummary();validCustomer(false)}catch(err){console.error(err);showToast('No se pudo cargar el checkout.')}})();