let products=[],settings={},product=null,quantity=1,currentTab="description";
let cart=JSON.parse(localStorage.getItem("atp_cart")||"{}");
const money=v=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(v);
const params=new URLSearchParams(location.search),id=params.get("id");
const jarHTML=p=>`<div class="jar"><b>${(p.brand||'ATP').split(" ")[0]}</b><strong>${p.category==="Creatinas"?"CREATINE":p.category==="Proteínas"?"WHEY":"SPORT"}</strong><small>ATP SUPLEMENTOS</small></div>`;
const variantsOf=p=>Array.isArray(p.variants)&&p.variants.length?p.variants:[];
const cartKey=(productId,variantId='')=>variantId?`${productId}::${variantId}`:String(productId);
const splitCartKey=key=>{const pos=String(key).indexOf('::');return pos<0?{productId:String(key),variantId:''}:{productId:String(key).slice(0,pos),variantId:String(key).slice(pos+2)}};
const selectedVariant=()=>variantsOf(product).find(v=>String(v.id)===String(flavorSelect.value))||null;
const availableStock=()=>selectedVariant()?.stock??product?.stock??0;

function renderVisual(){
  mainVisual.innerHTML=product.image?`<img src="${product.image}" alt="${product.name}" onerror="this.outerHTML='${jarHTML(product).replaceAll("'","&apos;")}'">`:jarHTML(product);
  const gallery=[product.image,...(product.gallery||[])].filter(Boolean);
  thumbs.innerHTML=gallery.length?gallery.map((img,i)=>`<button class="thumb ${i===0?"active":""}" data-img="${img}">Imagen ${i+1}</button>`).join(""):`<button class="thumb active">Principal</button>`;
  thumbs.querySelectorAll("[data-img]").forEach(t=>t.onclick=()=>{mainVisual.innerHTML=`<img src="${t.dataset.img}" alt="${product.name}">`;thumbs.querySelectorAll(".thumb").forEach(x=>x.classList.remove("active"));t.classList.add("active")});
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

(async function init(){try{[products,settings]=await Promise.all([ATPData.getProducts(),ATPData.getSettings()]);product=products.find(p=>p.id===id)}catch(err){console.error(err)}if(!product){productPage.style.display="none";notFound.style.display="grid";return}renderProduct();updateCart()})();
