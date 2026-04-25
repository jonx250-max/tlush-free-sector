/* === Talush Error Boundary === 
 * Global error handler — catches uncaught errors and unhandled promise rejections,
 * shows a graceful banner, logs to localStorage for diagnostics, prevents white screen.
 */
(function() {
  if (window.__TALUSH_ERROR_BOUNDARY) return;
  window.__TALUSH_ERROR_BOUNDARY = true;

  const LOG_KEY = 'talush_errors';
  const MAX_LOG = 50;

  function logError(type, payload) {
    try {
      const log = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
      log.unshift({
        type, ...payload,
        ts: new Date().toISOString(),
        url: location.pathname,
        ua: navigator.userAgent.slice(0, 100)
      });
      if (log.length > MAX_LOG) log.length = MAX_LOG;
      localStorage.setItem(LOG_KEY, JSON.stringify(log));
    } catch (e) { /* localStorage may be full */ }
  }

  function showBanner(message, isPromise) {
    // Don't spam — only show one banner at a time
    if (document.getElementById('talush-error-banner')) return;
    
    const banner = document.createElement('div');
    banner.id = 'talush-error-banner';
    banner.setAttribute('role', 'alert');
    banner.setAttribute('aria-live', 'assertive');
    banner.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; z-index: 999999;
      background: #2D1B0E; color: #FDFBF7;
      border-bottom: 2px solid #D97757;
      padding: 12px 20px;
      font-family: 'Assistant', system-ui, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      transform: translateY(-100%);
      transition: transform .3s ease;
      direction: rtl;
    `;
    banner.innerHTML = `
      <div style="max-width: 1200px; margin: 0 auto; display: flex; align-items: center; gap: 12px;">
        <div style="font-size: 18px;">⚠️</div>
        <div style="flex: 1;">
          <div style="font-weight: 600; margin-bottom: 2px;">משהו השתבש זמנית</div>
          <div style="font-size: 12px; opacity: 0.75;">הנתונים שלך בטוחים. נסה לרענן את הדף או לחזור לפעולה. אם הבעיה נמשכת — פנה לתמיכה.</div>
        </div>
        <button onclick="location.reload()" style="background: #B89B5E; color: #0a0a0a; border: none; padding: 8px 16px; font-weight: 600; cursor: pointer; font-family: inherit; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase;">רענן</button>
        <button onclick="document.getElementById('talush-error-banner').remove()" aria-label="סגור" style="background: transparent; color: #FDFBF7; border: 1px solid rgba(253,251,247,0.3); padding: 8px 12px; cursor: pointer; font-family: inherit; font-size: 14px;">×</button>
      </div>
    `;
    document.body.appendChild(banner);
    
    // Trigger slide-in (after layout commits, so transition fires)
    setTimeout(() => {
      banner.style.transform = 'translateY(0)';
    }, 20);

    // Auto-dismiss after 12s
    setTimeout(() => {
      const b = document.getElementById('talush-error-banner');
      if (b) {
        b.style.transition = 'opacity .4s';
        b.style.opacity = '0';
        setTimeout(() => b.remove(), 400);
      }
    }, 12000);
  }

  window.addEventListener('error', function(e) {
    // Ignore asset loading errors (images, scripts) — those have their own fallbacks
    if (e.target && e.target !== window && (e.target.tagName === 'IMG' || e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK')) {
      console.warn('[Talush] Asset failed to load:', e.target.src || e.target.href);
      return;
    }
    
    logError('error', {
      message: e.message,
      file: e.filename,
      line: e.lineno,
      col: e.colno,
      stack: e.error && e.error.stack ? e.error.stack.slice(0, 500) : null
    });
    
    showBanner();
  }, true);

  window.addEventListener('unhandledrejection', function(e) {
    logError('promise', {
      reason: String(e.reason).slice(0, 300),
      stack: e.reason && e.reason.stack ? e.reason.stack.slice(0, 500) : null
    });
    showBanner(null, true);
  });

  // Expose dev helpers
  window.talushErrorLog = function() {
    return JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
  };
  window.talushClearErrorLog = function() {
    localStorage.removeItem(LOG_KEY);
    console.log('[Talush] Error log cleared');
  };

  console.log('[Talush] Error boundary active. Use talushErrorLog() to inspect.');
})();
