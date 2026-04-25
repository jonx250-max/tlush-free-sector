// === Talush UI: Loading States, Toasts, Confirms ===
(function(){
  if(window.Talush) return;

  // === Inject CSS ===
  const css = `
  /* Spinner */
  @keyframes talush-spin { to { transform: rotate(360deg); } }
  .talush-spinner {
    display:inline-block; width:14px; height:14px; 
    border:2px solid currentColor; border-top-color:transparent;
    border-radius:50%; animation:talush-spin 0.6s linear infinite;
    vertical-align:middle; margin-left:8px;
  }
  .talush-loading { pointer-events:none; opacity:0.7; cursor:wait; position:relative; }
  
  /* Skeleton shimmer */
  @keyframes talush-shimmer { 
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  .talush-skeleton {
    background: linear-gradient(90deg, rgba(0,0,0,0.04), rgba(0,0,0,0.08), rgba(0,0,0,0.04));
    background-size: 200% 100%;
    animation: talush-shimmer 1.4s ease-in-out infinite;
    border-radius: 4px;
  }
  .talush-skeleton-dark {
    background: linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.1), rgba(255,255,255,0.05));
    background-size: 200% 100%;
    animation: talush-shimmer 1.4s ease-in-out infinite;
  }
  
  /* Toast */
  #talush-toasts { 
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
    z-index: 99999; display: flex; flex-direction: column; gap: 10px;
    pointer-events: none; max-width: calc(100vw - 40px);
  }
  .talush-toast {
    background: #0a0a0a; color: #FDFBF7; padding: 14px 22px;
    border-right: 3px solid #B89B5E; font-size: 14px; font-weight: 500;
    box-shadow: 0 8px 32px rgba(0,0,0,0.25); pointer-events: auto;
    direction: rtl; text-align: right; min-width: 280px; max-width: 480px;
    animation: talush-toast-in 0.3s cubic-bezier(0.4,0,0.2,1);
    display: flex; align-items: center; gap: 12px;
  }
  .talush-toast.success { border-right-color: #3d7a3d; }
  .talush-toast.error { border-right-color: #b54545; }
  .talush-toast.warn { border-right-color: #d9a441; }
  .talush-toast .icon { font-size: 18px; flex-shrink: 0; }
  .talush-toast .close { 
    margin-right: auto; cursor: pointer; opacity: 0.5;
    background: none; border: none; color: inherit; font-size: 16px;
  }
  .talush-toast .close:hover { opacity: 1; }
  @keyframes talush-toast-in {
    from { transform: translateY(-20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  .talush-toast.exiting { 
    animation: talush-toast-out 0.25s cubic-bezier(0.4,0,0.2,1) forwards; 
  }
  @keyframes talush-toast-out {
    to { transform: translateY(-20px); opacity: 0; }
  }
  
  /* Confirm modal */
  #talush-confirm-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 99998;
    display: flex; align-items: center; justify-content: center; padding: 20px;
    animation: talush-fade-in 0.2s ease-out;
  }
  @keyframes talush-fade-in { from { opacity: 0; } to { opacity: 1; } }
  .talush-confirm-box {
    background: #FDFBF7; max-width: 440px; width: 100%; padding: 32px;
    border-top: 4px solid #B89B5E; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    direction: rtl; text-align: right;
    animation: talush-confirm-in 0.25s cubic-bezier(0.4,0,0.2,1);
  }
  @keyframes talush-confirm-in {
    from { transform: translateY(20px) scale(0.95); opacity: 0; }
    to { transform: translateY(0) scale(1); opacity: 1; }
  }
  .talush-confirm-box h3 { 
    font-family: 'Playfair Display', serif; font-size: 22px; 
    font-weight: 900; color: #0a0a0a; margin-bottom: 12px; line-height: 1.3;
  }
  .talush-confirm-box p { 
    color: rgba(10,10,10,0.7); font-size: 15px; line-height: 1.6; margin-bottom: 24px;
  }
  .talush-confirm-actions { 
    display: flex; gap: 10px; justify-content: flex-start;
  }
  .talush-confirm-actions button {
    padding: 12px 22px; font-size: 12px; letter-spacing: 0.2em; 
    text-transform: uppercase; font-weight: 600; cursor: pointer;
    border: none; transition: all 0.2s;
  }
  .talush-confirm-actions .ok {
    background: #B89B5E; color: #0a0a0a;
  }
  .talush-confirm-actions .ok:hover { background: #FDFBF7; outline: 1px solid #B89B5E; }
  .talush-confirm-actions .cancel {
    background: transparent; color: rgba(10,10,10,0.6); 
    border: 1px solid rgba(10,10,10,0.2);
  }
  .talush-confirm-actions .cancel:hover { color: #0a0a0a; border-color: rgba(10,10,10,0.5); }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // === Toast container ===
  let toastContainer;
  function getToastContainer(){
    if(!toastContainer || !document.body.contains(toastContainer)){
      toastContainer = document.createElement('div');
      toastContainer.id = 'talush-toasts';
      document.body.appendChild(toastContainer);
    }
    return toastContainer;
  }

  // === API ===
  const Talush = {
    /** 
     * Show loading state on a button. Returns a function to restore.
     * @example const stop = Talush.loading(btn, 'מעבד...'); ... stop();
     */
    loading(btn, msg = 'מעבד...'){
      if(!btn) return () => {};
      const original = btn.innerHTML;
      const wasDisabled = btn.disabled;
      btn.classList.add('talush-loading');
      btn.disabled = true;
      btn.innerHTML = `<span class="talush-spinner"></span><span style="margin-right:8px">${msg}</span>`;
      return () => {
        btn.innerHTML = original;
        btn.classList.remove('talush-loading');
        btn.disabled = wasDisabled;
      };
    },

    /** Show a toast message. Auto-dismisses after duration ms. */
    toast(msg, type = 'info', duration = 4000){
      const cont = getToastContainer();
      const t = document.createElement('div');
      t.className = 'talush-toast ' + type;
      const icons = {success:'✓', error:'✕', warn:'⚠', info:'ℹ'};
      t.innerHTML = `
        <span class="icon">${icons[type] || icons.info}</span>
        <span>${msg}</span>
        <button class="close" aria-label="סגור">✕</button>
      `;
      cont.appendChild(t);
      const dismiss = () => {
        t.classList.add('exiting');
        setTimeout(() => t.remove(), 250);
      };
      t.querySelector('.close').onclick = dismiss;
      if(duration > 0) setTimeout(dismiss, duration);
      return dismiss;
    },

    /** 
     * Show a confirm modal. Returns a Promise<boolean>.
     * @example if(await Talush.confirm('המשך?', 'פעולה זו לא ניתנת לביטול.')) doIt();
     */
    confirm(title, body = '', okText = 'המשך', cancelText = 'ביטול'){
      return new Promise(resolve => {
        const ov = document.createElement('div');
        ov.id = 'talush-confirm-overlay';
        ov.innerHTML = `
          <div class="talush-confirm-box" role="dialog" aria-modal="true">
            <h3>${title}</h3>
            ${body ? `<p>${body}</p>` : ''}
            <div class="talush-confirm-actions">
              <button class="ok">${okText}</button>
              <button class="cancel">${cancelText}</button>
            </div>
          </div>
        `;
        const close = (val) => { ov.remove(); resolve(val); };
        ov.querySelector('.ok').onclick = () => close(true);
        ov.querySelector('.cancel').onclick = () => close(false);
        ov.onclick = (e) => { if(e.target === ov) close(false); };
        document.addEventListener('keydown', function esc(e){
          if(e.key === 'Escape'){ close(false); document.removeEventListener('keydown', esc); }
        });
        document.body.appendChild(ov);
        setTimeout(() => ov.querySelector('.ok').focus(), 50);
      });
    },

    /** Async wrapper: shows loading, calls fn, shows success/error toast. */
    async withLoading(btn, msg, fn, successMsg){
      const stop = this.loading(btn, msg);
      try {
        const result = await fn();
        stop();
        if(successMsg) this.toast(successMsg, 'success');
        return result;
      } catch(err){
        stop();
        this.toast(err.message || 'שגיאה לא ידועה', 'error');
        throw err;
      }
    },
  };

  window.Talush = Talush;
})();
