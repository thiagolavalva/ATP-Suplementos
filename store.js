const CATEGORIES=["Proteínas","Creatinas","Pre-entrenos","Aminoácidos","Vitaminas","Quemadores","Ganadores","Shakers","Accesorios"];
const ICONS={Proteínas:`<svg viewBox="0 0 48 48"><path d="M15 12h18l3 8-4 19H16l-4-19 3-8Z"/><path d="M14 17h20M18 12V8h12v4M19 27h10"/></svg>`,Creatinas:`<svg viewBox="0 0 48 48"><path d="M17 10h14l2 6v23H15V16l2-6Z"/><path d="M16 17h16M20 10V6h8v4M20 28h8"/></svg>`,"Pre-entrenos":`<svg viewBox="0 0 48 48"><path d="m27 5-15 22h11l-2 16 15-23H25l2-15Z"/></svg>`,Aminoácidos:`<svg viewBox="0 0 48 48"><circle cx="16" cy="16" r="6"/><circle cx="33" cy="17" r="5"/><circle cx="25" cy="33" r="7"/><path d="m21 18 7-1M19 21l3 6M30 21l-2 6"/></svg>`,Vitaminas:`<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="16"/><path d="M24 8v32M8 24h32"/></svg>`,Quemadores:`<svg viewBox="0 0 48 48"><path d="M27 5c2 8-4 10-1 17 2-4 6-6 7-11 7 9 7 17 2 24-3 4-7 6-12 6-9 0-15-7-13-16 1-5 5-9 9-13-1 6 1 9 4 11 1-7 5-11 4-18Z"/></svg>`,Ganadores:`<svg viewBox="0 0 48 48"><path d="M8 35h32M13 35V21h22v14M17 21v-7h14v7M18 28h12"/></svg>`,Shakers:`<svg viewBox="0 0 48 48"><path d="M16 9h16l3 8-4 24H17l-4-24 3-8Z"/><path d="M14 17h20M19 9V5h10v4"/></svg>`,Accesorios:`<svg viewBox="0 0 48 48"><path d="M15 13h18l5 10-4 18H14l-4-18 5-10Z"/><path d="M18 13c0-5 12-5 12 0M15 29h18"/></svg>`};
const descriptions={Proteínas:"Recuperación y masa muscular",Creatinas:"Fuerza y rendimiento","Pre-entrenos":"Energía y enfoque",Aminoácidos:"Apoyo a la recuperación",Vitaminas:"Bienestar y micronutrientes",Quemadores:"Productos para definición",Ganadores:"Ganadores de peso",Shakers:"Prepará tus suplementos",Accesorios:"Complementos para entrenar"};
let products=[],settings={},filter="Todos",query="";
const normalizeText=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
let cart=JSON.parse(localStorage.getItem("atp_cart")||"{}");
const money=v=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(v);
const jar=p=>`<div class="jar"><b>${p.brand.split(" ")[0]}</b><strong>${p.category==="Creatinas"?"CREATINE":p.category==="Proteínas"?"WHEY":"SPORT"}</strong><small>ATP SUPLEMENTOS</small></div>`;

function applySettings(){
  heroTitle.textContent=settings.heroTitle||"Potenciá tu rendimiento.";
  heroText.textContent=settings.heroText||"Suplementación deportiva desde Córdoba.";
  locationText.textContent=settings.location||"Córdoba, Argentina";
  const ig=(settings.instagram||"_atpsuplementos").replace("@","");
  instagramLink.href=`https://instagram.com/${ig}`;
  whatsappLink.href=`https://wa.me/${settings.whatsapp}`;
  contactButton.href=`https://wa.me/${settings.whatsapp}?text=${encodeURIComponent("Hola ATP Suplementos, quiero hacer una consulta.")}`;
}
function renderCategories(){
  categoryGrid.innerHTML=CATEGORIES.map(c=>`<article class="category-card" data-category="${c}">${ICONS[c]}<h3>${c}</h3><p>${descriptions[c]}</p></article>`).join("");
  document.querySelectorAll(".category-card").forEach(x=>x.onclick=()=>{filter=x.dataset.category;renderFilters();renderProducts();productos.scrollIntoView({behavior:"smooth"})});
}
function renderBrands(){
  brandGrid.innerHTML=[...new Set(products.map(p=>p.brand))].slice(0,6).map(b=>`<span>${b.toUpperCase()}</span>`).join("");
}
function renderFilters(){
  const cats=["Todos",...new Set(products.map(p=>p.category))];
  filters.innerHTML=cats.slice(0,6).map(c=>`<button data-filter="${c}" class="${filter===c?"active":""}">${c}</button>`).join("");
  filters.querySelectorAll("button").forEach(b=>b.onclick=()=>{filter=b.dataset.filter;renderFilters();renderProducts()});
}
function renderProducts(){
  const q=normalizeText(query.trim());
  const list=products.filter(p=>{
    const matchesCategory=filter==="Todos"||p.category===filter;
    const searchable=normalizeText(`${p.name} ${p.brand} ${p.category} ${p.detail||""} ${p.description||""} ${p.tag||""}`);
    return matchesCategory&&(!q||searchable.includes(q));
  });
  productGrid.innerHTML=list.map(p=>`<article class="product-card"><div class="product-image">${p.tag?`<span class="tag">${p.tag}</span>`:""}${p.image?`<img src="${p.image}" alt="${p.name}" onerror="this.outerHTML='${jar(p).replaceAll("'","&apos;")}'">`:jar(p)}</div><div class="product-info"><span class="product-brand">${p.brand}</span><h3><a href="product.html?id=${encodeURIComponent(p.id)}">${p.name}</a></h3><div class="product-detail">${p.detail||""}</div><span class="stock ${p.stock<=0?"out":""}">${p.stock>0?`${p.stock} disponibles`:"Sin stock"}</span><div class="product-bottom"><strong>${money(p.price)}</strong><button class="add-btn" data-id="${p.id}" ${p.stock<=0?"disabled":""}>+</button></div></div></article>`).join("");
  emptyState.style.display=list.length?"none":"block";
  resultsCount.textContent=list.length===1?"1 producto encontrado":`${list.length} productos encontrados`;
  const isFiltered=Boolean(q)||filter!=="Todos";
  document.querySelector(".catalog-status").classList.toggle("filtered",isFiltered);
  catalogSearchClear.parentElement.classList.toggle("has-value",Boolean(query));
  productGrid.querySelectorAll(".add-btn").forEach(b=>b.onclick=()=>addCart(b.dataset.id));
}
function addCart(id){cart[id]=(cart[id]||0)+1;localStorage.setItem("atp_cart",JSON.stringify(cart));updateCart();showToast("Producto agregado")}
function updateCart(){
  const entries=Object.entries(cart).filter(([id])=>products.some(p=>p.id===id));
  cartCount.textContent=entries.reduce((a,[,q])=>a+q,0);
  if(!entries.length){cartItems.innerHTML="";cartEmpty.style.display="flex";cartTotal.textContent="$0";return}
  cartEmpty.style.display="none";let total=0;
  cartItems.innerHTML=entries.map(([id,q])=>{const p=products.find(x=>x.id===id);total+=p.price*q;return`<div class="cart-item"><div class="cart-thumb">ATP</div><div><h4>${p.name}</h4><small>${money(p.price)} c/u</small></div><div class="qty"><button data-id="${id}" data-d="-1">−</button><b>${q}</b><button data-id="${id}" data-d="1">+</button></div></div>`}).join("");
  cartTotal.textContent=money(total);
  cartItems.querySelectorAll("button").forEach(b=>b.onclick=()=>{cart[b.dataset.id]=(cart[b.dataset.id]||0)+Number(b.dataset.d);if(cart[b.dataset.id]<=0)delete cart[b.dataset.id];localStorage.setItem("atp_cart",JSON.stringify(cart));updateCart()});
}
function suggestionsRender(){const q=normalizeText(searchInput.value.trim());if(!q){suggestions.innerHTML="";return}const list=products.filter(p=>normalizeText(`${p.name} ${p.brand} ${p.category}`).includes(q)).slice(0,6);suggestions.innerHTML=list.map(p=>`<div class="suggestion" data-id="${p.id}"><b>${p.name}</b><span>${p.brand} · ${money(p.price)}</span></div>`).join("");suggestions.querySelectorAll(".suggestion").forEach(s=>s.onclick=()=>location.href=`product.html?id=${encodeURIComponent(s.dataset.id)}`)}
function openSearch(){searchLayer.classList.add("open");document.body.classList.add("locked");setTimeout(()=>searchInput.focus(),150)}
function closeSearch(){searchLayer.classList.remove("open");document.body.classList.remove("locked")}
function openCart(){cartDrawer.classList.add("open");overlay.classList.add("open");document.body.classList.add("locked")}
function closeCart(){cartDrawer.classList.remove("open");overlay.classList.remove("open");document.body.classList.remove("locked")}
function showToast(t){toast.textContent=t;toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),1600)}

function setCatalogQuery(value,{scroll=false}={}){
  query=value;
  catalogSearchInput.value=value;
  searchInput.value=value;
  suggestionsRender();
  renderProducts();
  if(scroll)productos.scrollIntoView({behavior:"smooth",block:"start"});
}
function resetCatalog(){filter="Todos";setCatalogQuery("");renderFilters();}
searchOpen.onclick=openSearch;searchClose.onclick=closeSearch;
searchInput.oninput=()=>setCatalogQuery(searchInput.value);
searchInput.onkeydown=e=>{if(e.key==="Enter"){closeSearch();productos.scrollIntoView({behavior:"smooth"})}if(e.key==="Escape")closeSearch()};
catalogSearchInput.oninput=()=>setCatalogQuery(catalogSearchInput.value);
catalogSearchClear.onclick=()=>{setCatalogQuery("");catalogSearchInput.focus()};
resetCatalog.onclick=resetCatalog;emptyReset.onclick=resetCatalog;
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeSearch();closeCart()}});
cartOpen.onclick=openCart;cartClose.onclick=closeCart;overlay.onclick=closeCart;
menuBtn.onclick=()=>mobileMenu.classList.toggle("open");
document.querySelectorAll("#mobileMenu a").forEach(a=>a.onclick=()=>mobileMenu.classList.remove("open"));
mercadoPagoBtn.onclick=async()=>{
  const entries=Object.entries(cart).filter(([id])=>products.some(p=>p.id===id));
  if(!entries.length){showToast("El carrito está vacío");return}
  const originalText=mercadoPagoBtn.textContent;
  mercadoPagoBtn.disabled=true;
  mercadoPagoBtn.textContent="Preparando pago...";
  try{
    const response=await fetch("/api/create-preference",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({items:entries.map(([id,quantity])=>({id,quantity}))})
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||"No se pudo iniciar el pago.");
    window.location.assign(data.checkoutUrl);
  }catch(err){
    console.error(err);
    showToast(err.message||"No se pudo iniciar el pago.");
    mercadoPagoBtn.disabled=false;
    mercadoPagoBtn.textContent=originalText;
  }
};
checkoutBtn.onclick=async()=>{
  const e=Object.entries(cart);
  if(!e.length){showToast("El carrito está vacío");return}
  let total=0;
  const orderItems=e.map(([id,q])=>{const product=products.find(x=>x.id===id);total+=product.price*q;return{product,quantity:q}});
  try{await ATPData.createOrder({items:orderItems,total,channel:"whatsapp"})}catch(err){console.warn("No se pudo guardar el pedido:",err)}
  const lines=orderItems.map(x=>`• ${x.quantity} x ${x.product.name} (${x.product.brand}) - ${money(x.product.price*x.quantity)}`);
  window.open(`https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(`Hola ATP Suplementos, quiero consultar por este pedido:\n\n${lines.join("\n")}\n\nTotal estimado: ${money(total)}\n\n¿Me confirman stock y precio final?`)}`,"_blank");
};

(async function init(){
  year.textContent=new Date().getFullYear();
  try{
    [products,settings]=await Promise.all([ATPData.getProducts(),ATPData.getSettings()]);
  }catch(err){
    console.error(err);
    showToast("No se pudo conectar con la tienda online.");
    products=[];
    settings={};
  }
  applySettings();renderCategories();renderBrands();renderFilters();renderProducts();updateCart();
})();