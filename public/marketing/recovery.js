/**
 * 🛡️ TALUSH RECOVERY SYSTEM
 *
 * Multi-layer protection against data loss after payment / form completion.
 *
 * Layers:
 *  1. Auto-save: every form input saves to localStorage on blur+change
 *  2. Order ledger: every paid action recorded with status (pending/delivered/failed)
 *  3. Recovery banner: shows on top of every page if there's incomplete work
 *  4. Resume URL: links straight back to where user was
 *  5. beforeunload guard: warns if user tries to leave during form fill
 *  6. Backup cookie: 90-day cookie copy of critical order data
 *
 * Storage keys:
 *  - talushLedger          → array of all paid orders
 *  - talushDraftForms      → object: { [formId]: { data, savedAt, page } }
 *  - talushUser            → user account info
 *
 * Usage in any page:
 *  <script src="recovery.js"></script>
 *  <script>
 *    Recovery.attachAutoSave('my-form-id', '#my-form');
 *    Recovery.recordPayment({type: 'payslip-analysis', amount: 39});
 *  </script>
 */

window.Recovery = (function () {
  const LEDGER_KEY = 'talushLedger';
  const DRAFT_KEY  = 'talushDraftForms';
  const COOKIE_NAME = 'talush_recovery';

  // ============ LEDGER ============
  function getLedger() {
    try { return JSON.parse(localStorage.getItem(LEDGER_KEY) || '[]'); }
    catch { return []; }
  }

  function saveLedger(arr) {
    localStorage.setItem(LEDGER_KEY, JSON.stringify(arr));
    // Backup critical IDs to cookie (90 days)
    const pendingIds = arr.filter(o => o.status !== 'delivered').map(o => o.id);
    if (pendingIds.length) {
      const exp = new Date();
      exp.setDate(exp.getDate() + 90);
      document.cookie = `${COOKIE_NAME}=${pendingIds.join(',')}; expires=${exp.toUTCString()}; path=/; SameSite=Lax`;
    }
  }

  /**
   * Record a paid action.
   * @param {Object} order - { type, amount, deliverables: [...], context }
   * @returns {string} order id
   */
  function recordPayment(order) {
    const ledger = getLedger();
    const id = 'ord_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const entry = {
      id,
      type: order.type,
      amount: order.amount || 0,
      deliverables: order.deliverables || [],
      context: order.context || {},
      status: 'pending',         // pending / in-progress / delivered / failed
      paidAt: new Date().toISOString(),
      deliveredAt: null,
      lastPage: window.location.pathname
    };
    ledger.unshift(entry);
    saveLedger(ledger);
    return id;
  }

  function updateOrderStatus(orderId, status, extra = {}) {
    const ledger = getLedger();
    const idx = ledger.findIndex(o => o.id === orderId);
    if (idx === -1) return false;
    ledger[idx].status = status;
    if (status === 'delivered') ledger[idx].deliveredAt = new Date().toISOString();
    Object.assign(ledger[idx], extra);
    saveLedger(ledger);
    return true;
  }

  function getPendingOrders() {
    return getLedger().filter(o => o.status === 'pending' || o.status === 'in-progress');
  }

  // ============ AUTO-SAVE ============
  function getDrafts() {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}'); }
    catch { return {}; }
  }

  function saveDraft(formId, data) {
    const drafts = getDrafts();
    drafts[formId] = {
      data,
      savedAt: new Date().toISOString(),
      page: window.location.pathname
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
  }

  function getDraft(formId) {
    return getDrafts()[formId] || null;
  }

  function clearDraft(formId) {
    const drafts = getDrafts();
    delete drafts[formId];
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
  }

  /**
   * Attach auto-save to a form.
   * Saves all named inputs/selects/textareas to localStorage on change.
   */
  function attachAutoSave(formId, selector) {
    const form = document.querySelector(selector);
    if (!form) return null;

    const collect = () => {
      const data = {};
      form.querySelectorAll('input, select, textarea').forEach(el => {
        if (!el.name && !el.id) return;
        const key = el.name || el.id;
        if (el.type === 'checkbox') data[key] = el.checked;
        else if (el.type === 'radio') { if (el.checked) data[key] = el.value; }
        else data[key] = el.value;
      });
      return data;
    };

    const save = () => saveDraft(formId, collect());

    let timer;
    const debounced = () => { clearTimeout(timer); timer = setTimeout(save, 400); };

    form.addEventListener('input', debounced);
    form.addEventListener('change', debounced);

    // Restore on load
    const draft = getDraft(formId);
    if (draft && draft.data) {
      Object.entries(draft.data).forEach(([k, v]) => {
        const el = form.querySelector(`[name="${k}"], #${k}`);
        if (!el) return;
        if (el.type === 'checkbox') el.checked = !!v;
        else if (el.type === 'radio') {
          const r = form.querySelector(`[name="${k}"][value="${v}"]`);
          if (r) r.checked = true;
        }
        else el.value = v;
      });
    }

    return { save, clear: () => clearDraft(formId), draft };
  }

  // ============ RECOVERY BANNER ============
  function showRecoveryBanner() {
    const pending = getPendingOrders();
    const drafts = getDrafts();
    const draftKeys = Object.keys(drafts);

    if (!pending.length && !draftKeys.length) return;
    if (document.getElementById('talush-recovery-banner')) return; // already showing

    const banner = document.createElement('div');
    banner.id = 'talush-recovery-banner';
    banner.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0;
      background: linear-gradient(90deg, #B89B5E 0%, #C9AC6F 100%);
      color: #0a0a0a;
      padding: 12px 20px;
      font-family: 'Assistant', sans-serif;
      font-size: 14px;
      direction: rtl;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      box-shadow: 0 2px 12px rgba(184,155,94,0.3);
      animation: talushRecoveryIn 0.4s ease-out;
    `;

    const styleEl = document.createElement('style');
    styleEl.textContent = `
      @keyframes talushRecoveryIn { from { transform: translateY(-100%); } to { transform: translateY(0); } }
      #talush-recovery-banner button { background: #0a0a0a; color: #B89B5E; border: none; padding: 6px 16px; font-weight: 600; cursor: pointer; font-size: 13px; }
      #talush-recovery-banner button:hover { background: #1a1a1a; }
      #talush-recovery-banner .close-x { background: transparent; color: #0a0a0a; padding: 4px; font-size: 18px; }
      body { padding-top: 48px; }
    `;
    document.head.appendChild(styleEl);

    let msg = '';
    let action = '';

    if (pending.length) {
      const o = pending[0];
      msg = `🛡️ יש לך הזמנה פעילה (${typeLabel(o.type)}) שלא הושלמה — שילמת ${o.amount}₪`;
      action = `<button onclick="Recovery.resumeOrder('${o.id}')">המשך</button>`;
    } else if (draftKeys.length) {
      const fid = draftKeys[0];
      const d = drafts[fid];
      msg = `📝 יש לך טופס שלא נשמר במלואו (${formLabel(fid)})`;
      action = `<button onclick="window.location.href='${d.page}'">המשך מילוי</button>`;
    }

    banner.innerHTML = `
      <span>${msg}</span>
      ${action}
      <button class="close-x" onclick="document.getElementById('talush-recovery-banner').remove(); document.body.style.paddingTop='0';">✕</button>
    `;
    document.body.prepend(banner);
  }

  function typeLabel(type) {
    const labels = {
      'payslip-analysis': 'ניתוח תלוש',
      'demand-letter':    'מכתב דרישה',
      'tax-profile':      'פרופיל מס',
      'subscription':     'מנוי'
    };
    return labels[type] || type;
  }

  function formLabel(formId) {
    const labels = {
      'tax-profile':  'פרופיל מס',
      'signup':       'הרשמה',
      'contract':     'חוזה העסקה'
    };
    return labels[formId] || formId;
  }

  function resumeOrder(orderId) {
    const ord = getLedger().find(o => o.id === orderId);
    if (!ord) return;
    if (ord.lastPage) window.location.href = ord.lastPage + '?resume=' + orderId;
    else window.location.href = 'Dashboard.html?resume=' + orderId;
  }

  // ============ BEFORE UNLOAD GUARD ============
  let unloadGuardActive = false;
  function enableUnloadGuard(message) {
    if (unloadGuardActive) return;
    unloadGuardActive = true;
    window.addEventListener('beforeunload', (e) => {
      if (!unloadGuardActive) return;
      e.preventDefault();
      e.returnValue = message || 'יש לך שינויים שלא נשמרו. לעזוב את הדף?';
      return e.returnValue;
    });
  }

  function disableUnloadGuard() {
    unloadGuardActive = false;
  }

  // ============ AUTO-INIT ON PAGE LOAD ============
  function init() {
    // Check URL for ?resume=ord_xxx
    const params = new URLSearchParams(window.location.search);
    const resumeId = params.get('resume');
    if (resumeId) {
      const ord = getLedger().find(o => o.id === resumeId);
      if (ord) {
        console.log('[Recovery] Resuming order:', ord);
        window.dispatchEvent(new CustomEvent('talush:resume', { detail: ord }));
      }
    }

    // Show recovery banner if there's pending work (not on the home page)
    const isHome = /Landing/.test(window.location.pathname);
    if (!isHome && document.body) {
      // Wait a moment so banner doesn't flash before page renders
      setTimeout(showRecoveryBanner, 800);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ============ PUBLIC API ============
  return {
    // Ledger
    recordPayment,
    updateOrderStatus,
    getLedger,
    getPendingOrders,
    resumeOrder,

    // Drafts
    attachAutoSave,
    saveDraft,
    getDraft,
    clearDraft,
    getDrafts,

    // Banner
    showRecoveryBanner,
    hideBanner: () => {
      const b = document.getElementById('talush-recovery-banner');
      if (b) b.remove();
      document.body.style.paddingTop = '0';
    },

    // Unload guard
    enableUnloadGuard,
    disableUnloadGuard,

    // Utilities
    typeLabel,
    formLabel
  };
})();
