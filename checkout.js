const COUPONS={AMIGOSATP:10,MESSIATP:5,SORTEOATP:20,BIENVENIDOATP:10};
const money=v=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(v);
const cart=JSON.parse(localStorage.getItem("atp_cart")||"{}");
let products=[];
let appliedCoupon="";

function showToast(message){toast.textContent=message;toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),1800)}
function entries(){return Object.entries(cart).filter(([id])=>products.some(p=>String(p.id)===String(id)))}
function totals(){
  const subtotalValue=entries().reduce((sum,[id,quantity])=>{const p=products.find(x=>String(x.id)===String(id));return sum+Number(p.price)*Number(quantity)},0);
  const percent=COUPONS[appliedCoupon]||0;
  const discountValue=Math.round(subtotalValue*percent)/100;
  return{subtotal:subtotalValue,discount:discountValue,total:Math.max(0,subtotalValue-discountValue)};
}
function renderSummary(){
  const list=entries();
  if(!list.length){location.replace("index.html");return}
  orderItems.innerHTML=list.map(([id,quantity])=>{const p=products.find(x=>String(x.id)===String(id));return `<div class="order-item"><div><h3>${quantity} × ${p.name}</h3><small>${p.brand||"ATP Suplementos"}</small></div><b>${money(Number(p.price)*Number(quantity))}</b></div>`}).join("");
  const t=totals();subtotal.textContent=money(t.subtotal);discount.textContent=`-${money(t.discount)}`;total.textContent=money(t.total);discountRow.classList.toggle("visible",t.discount>0);
}
function validCustomer(showErrors=false){
  const name=customerName.value.trim();
  const phone=customerPhone.value.replace(/\D/g,"");
  const validName=name.length>=3;
  const validPhone=phone.length>=8;
  customerName.classList.toggle("invalid",showErrors&&!validName);
  customerPhone.classList.toggle("invalid",showErrors&&!validPhone);
  customerError.textContent=showErrors&&(!validName||!validPhone)?"Completá un nombre válido y un teléfono de al menos 8 números.":"";
  const ok=validName&&validPhone;
  couponCard.classList.toggle("locked",!ok);
  couponInput.disabled=!ok;
  applyCouponBtn.disabled=!ok;
  mercadoPagoBtn.disabled=!ok;
  return ok;
}
function applyCoupon(){
  if(!validCustomer(true))return;
  const code=couponInput.value.trim().toUpperCase();
  if(!code){appliedCoupon="";couponMessage.textContent="";renderSummary();return}
  if(!COUPONS[code]){appliedCoupon="";couponMessage.textContent="Código inválido.";renderSummary();return}
  appliedCoupon=code;
  couponInput.value=code;
  couponMessage.textContent=`${code}: ${COUPONS[code]}% de descuento aplicado.`;
  renderSummary();
}
customerName.addEventListener("input",()=>validCustomer(false));
customerPhone.addEventListener("input",()=>validCustomer(false));
applyCouponBtn.addEventListener("click",applyCoupon);
couponInput.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();applyCoupon()}});
checkoutForm.addEventListener("submit",async e=>{
  e.preventDefault();
  if(!validCustomer(true))return;
  const list=entries();
  if(!list.length){showToast("El carrito está vacío");return}
  const original=mercadoPagoBtn.textContent;mercadoPagoBtn.disabled=true;mercadoPagoBtn.textContent="Preparando pago...";
  try{
    const deliveryMethod=document.querySelector('input[name="delivery"]:checked').value;
    const response=await fetch("/api/create-preference",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({items:list.map(([id,quantity])=>({id,quantity})),coupon:appliedCoupon,deliveryMethod,customer:{name:customerName.value.trim(),phone:customerPhone.value.trim()}})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||"No se pudo iniciar el pago.");
    window.location.assign(data.checkoutUrl);
  }catch(error){console.error(error);showToast(error.message||"No se pudo iniciar el pago.");mercadoPagoBtn.disabled=false;mercadoPagoBtn.textContent=original}
});

(async function init(){
  try{products=await ATPData.getProducts()}catch(error){console.error(error);showToast("No se pudo cargar tu compra.");return}
  renderSummary();
  validCustomer(false);
})();
