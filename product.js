let products=[],settings={},product=null,quantity=1,currentTab="description";
let galleryImages=[],currentImageIndex=0;
let cart=JSON.parse(localStorage.getItem("atp_cart")||"{}");
const money=v=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(v);
const params=new URLSearchParams(location.search),id=params.get("id");
const jarHTML=p=>`<div class="jar"><b>${(p.brand||'ATP').split(" ")[0]}</b><strong>${p.category==="Creatinas"?"CREATINE":p.category==="Proteínas"?"WHEY":"SPORT"}</strong><small>ATP SUPLEMENTOS</small></div>`;
const variantsOf=p=>Array.isArray(p.variants)&&p.variants.length?p.variants:[];
const cartKey=(productId,variantId='')=>variantId?`${productId}::${variantId}`:String(productId);
const splitCartKey=key=>{const pos=String(key).indexOf('::');return pos<0?{productId:String(key),variantId:''}:{productId:String(key).slice(0,pos),variantId:String(key).slice(pos+2)}};
const selectedVariant=()=>variantsOf(product).find(v=>String(v.id)===String(flavorSelect.value))||null;
const availableStock=()=>selectedVariant()?.stock??product?.stock??0;

function renderCurrentImage(){
  const src=galleryImages[currentImageIndex];
  if(!src){visualStage.innerHTML=jarHTML(product);return}
  visualStage.innerHTML=`<img src="${src}" alt="${product.name} - imagen ${currentImageIndex+1}" draggable="false">`;
  const image=visualStage.querySelector('img');
  image.onerror=()=>{visualStage.innerHTML=jarHTML(product)};
  thumbs.querySelectorAll('.thumb').forEach((thumb,index)=>{
    thumb.classList.toggle('active',index===currentImageIndex);
    thumb.setAttribute('aria-current',index===currentImageIndex?'true':'false');
  });
}
function setCurrentImage(index){
  if(!galleryImages.length)return;
  currentImageIndex=(index+galleryImages.length)%galleryImages.length;
  renderCurrentImage();
}
function setupZoom(){
  mainVisual.onmousemove=e=>{
    const image=visualStage.querySelector('img');
    if(!image||matchMedia('(hover: none)').matches)return;
    const rect=mainVisual.getBoundingClientRect();
    const x=Math.max(0,Math.min(100,((e.clientX-rect.left)/rect.width)*100));
    const y=Math.max(0,Math.min(100,((e.clientY-rect.top)/rect.height)*100));
    image.style.transformOrigin=`${x}% ${y}%`;
    image.classList.add('zoomed');
  };
  mainVisual.onmouseleave=()=>visualStage.querySelector('img')?.classList.remove('zoomed');
}
function renderVisual(){
  galleryImages=[product.image,...(Array.isArray(product.gallery)?product.gallery:[])].filter((src,index,array)=>src&&array.indexOf(src)===index);
  currentImageIndex=0;
  thumbs.innerHTML=galleryImages.map((img,index)=>`<button class="thumb ${index===0?'active':''}" type="button" data-index="${index}" aria-label="Ver imagen ${index+1}"><img src="${img}" alt="Miniatura ${index+1}" loading="lazy"></button>`).join('');
  thumbs.querySelectorAll('.thumb').forEach(thumb=>thumb.onclick=()=>setCurrentImage(Number(thumb.dataset.index)));
  const multiple=galleryImages.length>1;
  galleryPrev.hidden=!multiple;galleryNext.hidden=!multiple;thumbs.hidden=!multiple;
  galleryPrev.onclick=()=>setCurrentImage(currentImageIndex-1);
  galleryNext.onclick=()=>setCurrentImage(currentImageIndex+1);
  renderCurrentImage();
  setupZoom();
}
function updateVariantState(){const available=availableStock();stock.textContent=available>0?`${available} disponibles${selectedVariant()?` de ${selectedVariant().name}`:''}`:"Sin stock";stock.className=available>0?"":"out";addBtn.disabled=available<=0;quantity=Math.min(Math.max(1,quantity),Math.max(1,available));qtyValue.textContent=quantity;[...flavorSelect.options].forEach(o=>{const v=variantsOf(product).find(x=>String(x.id)===o.value);o.disabled=Boolean(v&&v.stock<=0);o.textContent=v?`${v.name}${v.stock<=0?' — agotado':` — ${v.stock} disponibles`}`:o.textContent})}
function renderProduct(){
  document.title=`${product.name} | ATP Suplementos`;brand.textContent=(product.brand||'ATP Suplementos').toUpperCase();name.textContent=product.name;detail.textContent=product.detail||product.presentation||"";price.textContent=money(product.price);
  const vs=variantsOf(product);flavorBlock.style.display=vs.length?"block":"none";flavorSelect.innerHTML=vs.map(v=>`<option value="${v.id}" ${v.stock<=0?'disabled':''}>${v.name}</option>`).join("");const firstAvailable=vs.find(v=>v.stock>0);if(firstAvailable)flavorSelect.value=firstAvailable.id;
  renderVisual();updateVariantState();renderTab();renderRelated();
}
function renderTab(){tabContent.textContent=product[currentTab]||"Información pendiente de carga."}
function renderRelated(){const related=products.filter(p=>p.id!==product.id&&(p.category===product.category||p.brand===product.brand)).slice(0,4);relatedGrid.innerHTML=related.map(p=>`<article class="related-card"><div class="visual">${p.image?`<img src="${p.image}" alt="${p.name}" style="width:100%;height:100%;object-fit:contain;padding:12px">`:jarHTML(p)}</div><div class="copy"><b>${p.name}</b><span>${p.brand} · ${money(p.price)}</span><a href="product.html?id=${encodeURIComponent(p.id)}">Ver producto</a></div></article>`).join("")}
function cartEntries(){return Object.entries(cart).map(([key,q])=>({...splitCartKey(key),key,q:Number(q)})).filter(e=>products.some(p=>String(p.id)===e.productId))}
function updateCart(){const entries=cartEntries();cartCount.textContent=entries.reduce((a,e)=>a+e.q,0);if(!entries.length){cartItems.innerHTML="";cartEmpty.style.display="flex";cartTotal.textContent="$0";return}cartEmpty.style.display="none";let total=0;cartItems.innerHTML=entries.map(e=>{const p=products.find(x=>String(x.id)===e.productId),v=variantsOf(p).find(x=>String(x.id)===e.variantId);total+=p.price*e.q;return`<div class="cart-item"><div class="cart-thumb">ATP</div><div><h4>${p.name}</h4><small>${v?`${v.name} · `:''}${money(p.price)} c/u</small></div><div class="qty"><button data-key="${e.key}" data-d="-1">−</button><b>${e.q}</b><button data-key="${e.key}" data-d="1">+</button></div></div>`}).join("");cartTotal.textContent=money(total);cartItems.querySelectorAll("button").forEach(b=>b.onclick=()=>{cart[b.dataset.key]=(cart[b.dataset.key]||0)+Number(b.dataset.d);if(cart[b.dataset.key]<=0)delete cart[b.dataset.key];localStorage.setItem("atp_cart",JSON.stringify(cart));updateCart()})}
function showToast(t){toast.textContent=t;toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),1600)}
qtyMinus.onclick=()=>{quantity=Math.max(1,quantity-1);qtyValue.textContent=quantity};
qtyPlus.onclick=()=>{quantity=Math.min(availableStock()||1,quantity+1);qtyValue.textContent=quantity};
flavorSelect.onchange=()=>{quantity=1;updateVariantState()};
addBtn.onclick=()=>{const v=selectedVariant();if(variantsOf(product).length&&!v)return showToast('Elegí una variante');const key=cartKey(product.id,v?.id||'');const current=Number(cart[key]||0);if(current+quantity>availableStock())return showToast('No hay stock suficiente');cart[key]=current+quantity;localStorage.setItem("atp_cart",JSON.stringify(cart));updateCart();showToast("Producto agregado")};
buyBtn.onclick=()=>{const v=selectedVariant();const variant=v?` Variante: ${v.name}.`:"";window.open(`https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(`Hola ATP Suplementos, quiero consultar por ${quantity} x ${product.name}.${variant}`)}`,"_blank")};
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");currentTab=b.dataset.tab;renderTab()});
cartOpen.onclick=()=>{cartDrawer.classList.add("open");overlay.classList.add("open");document.body.classList.add("locked")};
cartClose.onclick=overlay.onclick=()=>{cartDrawer.classList.remove("open");overlay.classList.remove("open");document.body.classList.remove("locked")};
continueCheckoutBtn.onclick=()=>{if(!cartEntries().length){showToast("El carrito está vacío");return}location.href="checkout.html"};
document.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')setCurrentImage(currentImageIndex-1);if(e.key==='ArrowRight')setCurrentImage(currentImageIndex+1)});

(async function init(){try{[products,settings]=await Promise.all([ATPData.getProducts(),ATPData.getSettings()]);product=products.find(p=>p.id===id)}catch(err){console.error(err)}if(!product){productPage.style.display="none";notFound.style.display="grid";return}renderProduct();updateCart()})();
