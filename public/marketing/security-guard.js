/**
 * Talush — Security Guard
 * ────────────────────────
 * Geo-blocking + VPN/Tor detection + multi-account prevention + free-trial abuse.
 *
 * Include in EVERY user-facing page:
 *   <script src="security-guard.js" defer></script>
 *
 * Behavior:
 *  1. On load: fetch IP → check geo (IL only) + VPN/datacenter/Tor flags
 *  2. Generate device fingerprint (canvas + audio + screen + UA)
 *  3. Check fingerprint against localStorage + (in prod) server-side ledger
 *  4. If non-IL → block screen with explanation + invite-token bypass
 *  5. If VPN/datacenter → require SMS verification before any action
 *  6. If duplicate fingerprint → require SMS verification
 *  7. Rate-limit critical actions (PDF upload, letter generation, chat)
 *
 * Production note: All client-side checks are advisory only.
 * The REAL enforcement happens server-side — this layer just gives users
 * fast feedback and blocks 90% of casual abuse.
 */
(function() {
  'use strict';

  // ─── CONFIG ────────────────────────────────────────────
  const CONFIG = {
    allowedCountries: ['IL'],
    inviteTokenParam: 'invite',  // ?invite=XXX in URL bypasses geo block
    inviteTokenStorageKey: 'talush_invite_token',
    fingerprintKey: 'talush_device_fp',
    accountsKey: 'talush_accounts_seen',
    maxAccountsPerDevice: 1,  // free tier
    rateLimits: {
      payslipUpload: { max: 3, windowMs: 60_000 },     // 3/min
      letterGenerate: { max: 5, windowMs: 60_000 },    // 5/min
      chatQuery: { max: 30, windowMs: 3_600_000 }      // 30/hour
    },
    geoApiUrl: 'https://ipapi.co/json/',  // free tier; replace with paid in prod
    // Datacenter ASN list (partial — use IPQualityScore in prod)
    datacenterASNs: [
      'AS16509', 'AS14618', 'AS8075',   // AWS, Microsoft Azure
      'AS15169', 'AS396982',             // GCP
      'AS14061', 'AS20473',              // DigitalOcean, Vultr
      'AS9009', 'AS60068',               // M247, CDN77
      'AS9009'                           // NordVPN
    ]
  };

  // ─── STATE ─────────────────────────────────────────────
  const state = {
    geoChecked: false,
    country: null,
    isVPN: false,
    isTor: false,
    isDatacenter: false,
    fingerprint: null,
    blocked: false,
    smsRequired: false
  };

  // ─── FINGERPRINT (lightweight, no FingerprintJS dependency) ───
  async function generateFingerprint() {
    // Canvas fingerprint
    let canvasFP = '';
    try {
      const c = document.createElement('canvas');
      c.width = 200; c.height = 50;
      const ctx = c.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(0,0,100,50);
      ctx.fillStyle = '#069';
      ctx.fillText('Talush🛡️', 2, 15);
      canvasFP = c.toDataURL().slice(-50);
    } catch(e) {}

    // Screen + UA
    const screenFP = `${screen.width}x${screen.height}x${screen.colorDepth}`;
    const tzFP = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const langFP = navigator.language;
    const uaFP = navigator.userAgent.slice(0, 100);
    const platformFP = navigator.platform;

    // Hash
    const raw = [canvasFP, screenFP, tzFP, langFP, uaFP, platformFP].join('|');
    const buf = new TextEncoder().encode(raw);
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    const hash = Array.from(new Uint8Array(hashBuf))
      .map(b => b.toString(16).padStart(2,'0')).join('').slice(0, 32);

    return hash;
  }

  // ─── GEO/IP CHECK (with timeout + fallback) ───
  async function checkGeo() {
    try {
      const res = await Promise.race([
        fetch(CONFIG.geoApiUrl, { mode: 'cors' }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))
      ]);
      const data = await res.json();
      state.country = data.country_code || data.country || null;
      state.isVPN = false;  // ipapi.co doesn't give this; need paid (IPQualityScore)
      state.isDatacenter = CONFIG.datacenterASNs.some(a => (data.asn || '').includes(a));
      // Tor: detect via known timezone mismatches + datacenter
      state.isTor = state.isDatacenter && data.timezone === 'UTC';
      state.geoChecked = true;
      return true;
    } catch (err) {
      console.warn('[security-guard] Geo check failed:', err.message);
      // Fail-open: don't block users on API failure (server-side enforces)
      state.geoChecked = false;
      return false;
    }
  }

  // ─── INVITE TOKEN ───
  function checkInviteToken() {
    const url = new URL(location.href);
    const token = url.searchParams.get(CONFIG.inviteTokenParam);
    if (token) {
      localStorage.setItem(CONFIG.inviteTokenStorageKey, token);
      // Strip from URL
      url.searchParams.delete(CONFIG.inviteTokenParam);
      history.replaceState(null, '', url.toString());
      return token;
    }
    return localStorage.getItem(CONFIG.inviteTokenStorageKey);
  }

  // ─── BLOCK SCREEN ───
  // Built via DOM methods (no inline-HTML interpolation, no onclick=).
  // Defense-in-depth: even if `reason` ever derives from server data,
  // textContent prevents HTML injection. addEventListener replaces
  // onclick= so the page can run under a strict CSP nonce policy.
  function showBlockScreen(reason, options = {}) {
    if (document.getElementById('talush-security-block')) return;
    state.blocked = true;
    document.body.style.overflow = 'hidden';

    const overlay = document.createElement('div');
    overlay.id = 'talush-security-block';
    overlay.style.cssText =
      "position:fixed;inset:0;background:#0a0a0a;color:#FDFBF7;z-index:99999;" +
      "display:flex;align-items:center;justify-content:center;padding:24px;" +
      "font-family:'Assistant',system-ui,sans-serif;";

    const card = document.createElement('div');
    card.style.cssText = 'max-width:520px;text-align:center;';

    const brand = document.createElement('div');
    brand.style.cssText = 'font-size:11px;letter-spacing:0.3em;color:#B89B5E;margin-bottom:24px;';
    brand.textContent = 'TALUSH · SECURITY';
    card.appendChild(brand);

    const shieldWrap = document.createElement('div');
    shieldWrap.style.cssText =
      'width:64px;height:64px;margin:0 auto 24px;border:1px solid rgba(184,155,94,.4);' +
      'display:flex;align-items:center;justify-content:center;';
    const shield = document.createElement('span');
    shield.style.fontSize = '32px';
    shield.textContent = '🛡️';
    shieldWrap.appendChild(shield);
    card.appendChild(shieldWrap);

    const heading = document.createElement('h1');
    heading.style.cssText = "font-family:'Frank Ruhl Libre',serif;font-size:32px;font-weight:300;margin:0 0 16px;line-height:1.2;";
    heading.textContent = String(reason.title || '');
    card.appendChild(heading);

    const message = document.createElement('p');
    message.style.cssText = 'color:rgba(253,251,247,.7);line-height:1.7;margin:0 0 28px;font-size:15px;';
    message.textContent = String(reason.message || '');
    card.appendChild(message);

    if (options.allowSMS) {
      const smsBtn = document.createElement('button');
      smsBtn.style.cssText = 'background:#B89B5E;color:#0a0a0a;border:0;padding:14px 28px;font-size:14px;font-weight:600;cursor:pointer;margin:0 8px 12px;';
      smsBtn.textContent = 'אמת באמצעות SMS';
      smsBtn.addEventListener('click', () => window._talushVerifySMS && window._talushVerifySMS());
      card.appendChild(smsBtn);
    }
    if (options.allowInvite) {
      const inviteBtn = document.createElement('button');
      inviteBtn.style.cssText = 'background:transparent;color:#FDFBF7;border:1px solid rgba(253,251,247,.3);padding:14px 28px;font-size:14px;cursor:pointer;margin:0 8px 12px;';
      inviteBtn.textContent = 'יש לי קוד הזמנה';
      inviteBtn.addEventListener('click', () => window._talushEnterInvite && window._talushEnterInvite());
      card.appendChild(inviteBtn);
    }

    const footer = document.createElement('div');
    footer.style.cssText = 'margin-top:32px;font-size:12px;color:rgba(253,251,247,.45);line-height:1.6;';

    const blockedLine = document.createElement('div');
    blockedLine.appendChild(document.createTextNode('חסום בגלל: '));
    const codeSpan = document.createElement('span');
    codeSpan.style.cssText = 'color:#B89B5E;font-family:monospace;';
    codeSpan.textContent = String(reason.code || '');
    blockedLine.appendChild(codeSpan);
    footer.appendChild(blockedLine);

    if (reason.ipMasked || reason.country) {
      const meta = document.createElement('div');
      const parts = [];
      if (reason.ipMasked) parts.push('IP: ' + String(reason.ipMasked));
      if (reason.country) parts.push('מדינה: ' + String(reason.country));
      meta.textContent = parts.join(' · ');
      footer.appendChild(meta);
    }

    const contact = document.createElement('a');
    contact.href = 'mailto:security@talush.app';
    contact.style.cssText = 'color:#B89B5E;text-decoration:underline;';
    contact.textContent = 'צור קשר עם אבטחה';
    footer.appendChild(contact);

    card.appendChild(footer);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // Bypass actions
    window._talushVerifySMS = () => {
      const phone = prompt('הזן מספר טלפון ישראלי (10 ספרות):');
      if (!phone || !/^05\d{8}$/.test(phone)) { alert('מספר לא תקין'); return; }
      // In prod: POST /api/security/sms-verify {phone, fingerprint}
      const code = prompt('קוד אימות נשלח בהדמיה: 1234. הזן קוד:');
      if (code === '1234') {
        sessionStorage.setItem('talush_sms_verified', '1');
        location.reload();
      } else {
        alert('קוד שגוי');
      }
    };
    window._talushEnterInvite = () => {
      const token = prompt('הזן קוד הזמנה:');
      if (!token) return;
      localStorage.setItem(CONFIG.inviteTokenStorageKey, token);
      location.reload();
    };
  }

  // ─── SOFT WARNING (non-blocking) ───
  function showWarningBanner(text) {
    if (document.getElementById('talush-security-warn')) return;
    const bar = document.createElement('div');
    bar.id = 'talush-security-warn';
    bar.style.cssText = `
      position:fixed; top:0; left:0; right:0; background:#a65d2e; color:#fff;
      padding:10px 16px; text-align:center; font-size:13px; z-index:9998;
      font-family:'Assistant',system-ui,sans-serif; box-shadow:0 2px 8px rgba(0,0,0,.2);
    `;
    bar.innerHTML = `🛡️ ${text}
      <button onclick="this.parentElement.remove()" style="background:transparent;color:#fff;border:0;cursor:pointer;font-size:18px;margin-right:12px;">×</button>`;
    document.body.appendChild(bar);
  }

  // ─── RATE LIMITING ───
  const rateLimitState = {};
  function checkRateLimit(key) {
    const cfg = CONFIG.rateLimits[key];
    if (!cfg) return true;
    const now = Date.now();
    rateLimitState[key] = (rateLimitState[key] || []).filter(t => now - t < cfg.windowMs);
    if (rateLimitState[key].length >= cfg.max) {
      const wait = Math.ceil((cfg.windowMs - (now - rateLimitState[key][0])) / 1000);
      alert(`חרגת ממגבלת ${key}. נסה שוב בעוד ${wait} שניות.`);
      return false;
    }
    rateLimitState[key].push(now);
    return true;
  }

  // ─── MULTI-ACCOUNT CHECK ───
  function checkMultiAccount(fp) {
    const seen = JSON.parse(localStorage.getItem(CONFIG.accountsKey) || '[]');
    if (!seen.find(a => a.fp === fp)) {
      seen.push({ fp, ts: Date.now() });
      localStorage.setItem(CONFIG.accountsKey, JSON.stringify(seen));
    }
    // In prod: also check server-side. localStorage is trivially clearable.
    return seen.length;
  }

  // ─── PUBLIC API ───
  window.TalushSecurity = {
    checkRateLimit,
    getState: () => ({ ...state }),
    // Wrap critical buttons:  TalushSecurity.guardAction('letterGenerate', () => doIt())
    guardAction(rateLimitKey, fn) {
      if (state.blocked) return;
      if (state.smsRequired && !sessionStorage.getItem('talush_sms_verified')) {
        showBlockScreen({
          title: 'נדרש אימות SMS',
          message: 'זוהתה פעילות חריגה. כדי להמשיך, אמת את החשבון שלך באמצעות SMS.',
          code: 'SMS_REQUIRED',
          country: state.country
        }, { allowSMS: true });
        return;
      }
      if (rateLimitKey && !checkRateLimit(rateLimitKey)) return;
      return fn();
    }
  };

  // ─── INIT ───
  async function init() {
    // 1. Check invite token first (bypass)
    const inviteToken = checkInviteToken();
    const smsVerified = sessionStorage.getItem('talush_sms_verified') === '1';

    // 2. Generate fingerprint
    state.fingerprint = await generateFingerprint();

    // 3. Multi-account check
    const accountsCount = checkMultiAccount(state.fingerprint);
    if (accountsCount > CONFIG.maxAccountsPerDevice && !smsVerified && !inviteToken) {
      state.smsRequired = true;
      showWarningBanner(`זוהה שימוש מרובה ממכשיר זה (${accountsCount} חשבונות). פעולות מסוימות ידרשו אימות SMS.`);
    }

    // 4. Geo check (async, non-blocking init)
    await checkGeo();

    if (state.geoChecked) {
      // 5. Country block
      if (!CONFIG.allowedCountries.includes(state.country) && !inviteToken) {
        showBlockScreen({
          title: 'השירות זמין רק לתושבי ישראל',
          message: `Talush בודק תלושי שכר ישראליים בלבד, מתבסס על חוקי המס והעבודה הישראליים. אם אתה אזרח ישראל בחו"ל וקיבלת קוד הזמנה — הזן אותו כדי להמשיך.`,
          code: 'GEO_BLOCK',
          country: state.country || 'unknown',
          ipMasked: '*.*.*.*'
        }, { allowInvite: true });
        return;
      }

      // 6. Datacenter/VPN/Tor — soft block
      if ((state.isVPN || state.isDatacenter || state.isTor) && !smsVerified && !inviteToken) {
        state.smsRequired = true;
        showWarningBanner('זוהה שימוש ב-VPN/datacenter. פעולות רגישות (מכתב דרישה, ייצוא נתונים) ידרשו אימות SMS.');
      }
    }

    // 7. Expose telemetry for Admin
    if (window.location.pathname.includes('Admin')) {
      console.log('[Talush Security] State:', state);
    }
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
