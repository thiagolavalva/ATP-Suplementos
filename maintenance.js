(() => {
  const DEFAULT_MESSAGE='Estamos agregando y actualizando productos. En breve la tienda volverá a estar disponible.';
  const escapeHtml=value=>String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function showMaintenance(settings={}){
    if(document.getElementById('atpMaintenance'))return;
    const store=escapeHtml(settings.storeName||'ATP Suplementos');
    const message=escapeHtml(settings.maintenanceMessage||DEFAULT_MESSAGE);
    const location=escapeHtml(settings.location||'Córdoba, Argentina');
    const wrapper=document.createElement('div');
    wrapper.id='atpMaintenance';
    wrapper.innerHTML=`<style>
      #atpMaintenance{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:24px;background:#070907;color:#fff;font-family:Inter,Arial,sans-serif;overflow:auto}
      #atpMaintenance:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 50% 12%,rgba(141,252,57,.13),transparent 34%),linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:auto,38px 38px,38px 38px;pointer-events:none}
      #atpMaintenance .maintenance-card{position:relative;width:min(620px,100%);text-align:center;padding:clamp(34px,7vw,62px) clamp(22px,6vw,54px);border:1px solid #293028;border-radius:24px;background:rgba(13,16,13,.94);box-shadow:0 28px 90px rgba(0,0,0,.48)}
      #atpMaintenance img{width:104px;height:104px;object-fit:cover;border-radius:50%;border:2px solid #8dfc39;box-shadow:0 0 0 8px rgba(141,252,57,.08)}
      #atpMaintenance .eyebrow{margin-top:25px;color:#8dfc39;font-size:11px;font-weight:900;letter-spacing:.18em}
      #atpMaintenance h1{margin:11px 0 14px;font-size:clamp(30px,7vw,49px);line-height:1.04;letter-spacing:-.045em}
      #atpMaintenance p{max-width:480px;margin:0 auto;color:#aeb6aa;font-size:clamp(15px,3.7vw,18px);line-height:1.7}
      #atpMaintenance .pulse{display:inline-flex;align-items:center;gap:9px;margin-top:27px;padding:10px 14px;border:1px solid #333c30;border-radius:99px;color:#d9dfd6;font-size:12px;font-weight:700}
      #atpMaintenance .pulse i{width:9px;height:9px;border-radius:50%;background:#8dfc39;box-shadow:0 0 0 0 rgba(141,252,57,.5);animation:atpPulse 1.8s infinite}
      #atpMaintenance small{display:block;margin-top:24px;color:#71796e;font-size:11px}
      @keyframes atpPulse{70%{box-shadow:0 0 0 9px rgba(141,252,57,0)}100%{box-shadow:0 0 0 0 rgba(141,252,57,0)}}
    </style><section class="maintenance-card" role="status" aria-live="polite"><img src="logo-atp.jpg" alt="${store}"><div class="eyebrow">${store.toUpperCase()}</div><h1>Estamos mejorando la tienda.</h1><p>${message}</p><div class="pulse"><i></i> Volvemos en breve</div><small>${location}</small></section>`;
    document.body.appendChild(wrapper);
    document.documentElement.style.overflow='hidden';
    document.body.style.overflow='hidden';
  }
  async function check(){
    try{
      if(!window.ATPData?.getSettings)return;
      const settings=await ATPData.getSettings();
      if(settings?.maintenanceMode)showMaintenance(settings);
    }catch(error){console.warn('No se pudo comprobar el modo mantenimiento:',error)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',check,{once:true});else check();
})();
