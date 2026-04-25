// === Talush Mobile Drawer (shared) ===
// Usage: include after sidebar markup. Sidebar must have id="main-sidebar".
(function(){
  if(window.__talushDrawer) return;
  window.__talushDrawer = true;

  const css = `
    @media (max-width: 1023px) {
      #main-sidebar.talush-mobile-drawer { 
        position: fixed; top: 0; right: 0; bottom: 0; 
        width: 280px; z-index: 70; 
        transform: translateX(100%); 
        transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
        overflow-y: auto;
      }
      #main-sidebar.talush-mobile-drawer.open { transform: translateX(0); }
    }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  function getSidebar(){ return document.getElementById('main-sidebar'); }
  function getOverlay(){ 
    let ov = document.getElementById('mobile-drawer-overlay');
    if(!ov){
      ov = document.createElement('div');
      ov.id = 'mobile-drawer-overlay';
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:60;display:none;';
      ov.onclick = closeDrawer;
      document.body.appendChild(ov);
    }
    return ov;
  }
  function openDrawer(){
    const sb = getSidebar(); if(!sb) return;
    sb.classList.add('talush-mobile-drawer','open');
    getOverlay().style.display = 'block';
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer(){
    const sb = getSidebar(); if(!sb) return;
    sb.classList.remove('open');
    getOverlay().style.display = 'none';
    document.body.style.overflow = '';
  }
  window.openMobileDrawer = openDrawer;
  window.closeMobileDrawer = closeDrawer;

  document.addEventListener('keydown', e => {
    if(e.key === 'Escape') closeDrawer();
  });
  window.addEventListener('resize', () => {
    if(window.innerWidth >= 1024) closeDrawer();
  });
})();
