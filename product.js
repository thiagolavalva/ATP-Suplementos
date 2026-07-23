let products=[],settings={},product=null,quantity=1,currentTab="description";
let cart=JSON.parse(localStorage.getItem("atp_cart")||"{}");
const money=v=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(v);
const params=new URLSearchParams(location.search),id=params.get("id");
const jarHTML=p=>`<div class="jar"><b>${p.brand.split(" ")[0]}</b><strong>${p.category==="Creatinas"?"CREATINE":p.category==="Proteínas"?"WHEY":"SPORT"}</strong><small>ATP SUPLEMENTOS</small></div>`;

function renderVisual(){
  mainVisual.innerHTML=product.image?`<img src="${product.image}" alt="${product.name}" onerror="this.outerHTML='${jarHTML(product).replaceAll("'","&apos;")}'">`:jarHTML(product);
  const gallery=[product.image,...(product.gallery||[])].filter(Boolean);
  thumbs.innerHTML=gallery.length?gallery.map((img,i)=>`<button class="thumb ${i===0?"active":""}" data-img="${img}">Imagen ${i+1}</button>`).join(""):`<button class="thumb active">Principal</button>`;
  thumbs.querySelectorAll("[data-img]").forEach(t=>t.onclick=()=>{mainVisual.innerHTML=`<img src="${t.dataset.img}" alt="${product.name}">`;thumbs.querySelectorAll(".thumb").forEach(x=>x.classList.remove("active"));t.classList.add("active")});
}
function renderProduct(){
  document.title=`${product.name} | ATP Suplementos`;brand.textContent=product.brand.toUpperCase();name.textContent=product.name;detail.textContent=product.detail||product.presentation||"";price.textContent=money(product.price);stock.textContent=product.stock>0?`${product.stock} disponibles`:"Sin stock";stock.className=product.stock>0?"":"out";addBtn.disabled=product.stock<=0;
  const fs=product.flavors||[];flavorBlock.style.display=fs.length?"block":"none";flavorSelect.innerHTML=fs.map(f=>`<option>${f}</option>`).join("");
  renderVisual();renderTab();renderRelated()
}
function renderTab(){tabContent.textContent=product[currentTab]||"Información pendiente de carga."}
function renderRelated(){const related=products.filter(p=>p.id!==product.id&&(p.category===product.category||p.brand===product.brand)).slice(0,4);relatedGrid.innerHTML=related.map(p=>`<article class="related-card"><div class="visual">${p.image?`<img src="${p.image}" alt="${p.name}" style="width:100%;height:100%;object-fit:contain;padding:12px">`:jarHTML(p)}</div><div class="copy"><b>${p.name}</b><span>${p.brand} · ${money(p.price)}</span><a href="product.html?id=${encodeURIComponent(p.id)}">Ver producto</a></div></article>`).join("")}
function updateCart(){const e=Object.entries(cart).filter(([pid])=>products.some(p=>p.id===pid));cartCount.textContent=e.reduce((a,[,q])=>a+q,0);if(!e.length){cartItems.innerHTML="";cartEmpty.style.display="flex";cartTotal.textContent="$0";return}cartEmpty.style.display="none";let total=0;cartItems.innerHTML=e.map(([pid,q])=>{const p=products.find(x=>x.id===pid);total+=p.price*q;return`<div class="cart-item"><div class="cart-thumb">ATP</div><div><h4>${p.name}</h4><small>${money(p.price)} c/u</small></div><div class="qty"><button data-id="${pid}" data-d="-1">−</button><b>${q}</b><button data-id="${pid}" data-d="1">+</button></div></div>`}).join("");cartTotal.textContent=money(total);cartItems.querySelectorAll("button").forEach(b=>b.onclick=()=>{cart[b.dataset.id]=(cart[b.dataset.id]||0)+Number(b.dataset.d);if(cart[b.dataset.id]<=0)delete cart[b.dataset.id];localStorage.setItem("atp_cart",JSON.stringify(cart));updateCart()})}
function showToast(t){toast.textContent=t;toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),1600)}
qtyMinus.onclick=()=>{quantity=Math.max(1,quantity-1);qtyValue.textContent=quantity};
qtyPlus.onclick=()=>{quantity=Math.min(product?.stock||99,quantity+1);qtyValue.textContent=quantity};
addBtn.onclick=()=>{cart[product.id]=(cart[product.id]||0)+quantity;localStorage.setItem("atp_cart",JSON.stringify(cart));updateCart();showToast("Producto agregado")};
buyBtn.onclick=()=>{const flavor=flavorSelect.value?` Sabor: ${flavorSelect.value}.`:"";window.open(`https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(`Hola ATP Suplementos, quiero consultar por ${quantity} x ${product.name}.${flavor}`)}`,"_blank")};
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");currentTab=b.dataset.tab;renderTab()});
cartOpen.onclick=()=>{cartDrawer.classList.add("open");overlay.classList.add("open");document.body.classList.add("locked")};
cartClose.onclick=overlay.onclick=()=>{cartDrawer.classList.remove("open");overlay.classList.remove("open");document.body.classList.remove("locked")};
checkoutBtn.onclick=async()=>{const e=Object.entries(cart);if(!e.length)return;let total=0;const orderItems=e.map(([pid,q])=>{const product=products.find(x=>x.id===pid);total+=product.price*q;return{product,quantity:q}});try{await ATPData.createOrder({items:orderItems,total,channel:"whatsapp"})}catch(err){console.warn(err)}const lines=orderItems.map(x=>`• ${x.quantity} x ${x.product.name} - ${money(x.product.price*x.quantity)}`);window.open(`https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(`Hola ATP Suplementos, quiero consultar por este pedido:\n\n${lines.join("\n")}\n\nTotal estimado: ${money(total)}`)}`,"_blank")};

(async function init(){
  try{
    [products,settings]=await Promise.all([ATPData.getProducts(),ATPData.getSettings()]);
    product=products.find(p=>p.id===id);
  }catch(err){console.error(err)}
  if(!product){productPage.style.display="none";notFound.style.display="grid";return}
  renderProduct();updateCart();
})();