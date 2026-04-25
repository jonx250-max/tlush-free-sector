/**
 * freemium-guard.js
 * 
 * מנגנון anti-abuse של ה-freemium ב-Talush.
 * מזהה משתמשים שכבר ניצלו את הבדיקה החינמית — גם אם הם:
 *   • פתחו חשבון חדש
 *   • ניקו את ה-localStorage של האפליקציה
 *   • הציגו שם משתמש/מייל אחר
 * 
 * שלוש שכבות זיהוי:
 *   1. Device Fingerprint  — hash של מאפייני מכשיר (canvas + screen + timezone + UA)
 *   2. Email Fingerprint   — נורמליזציה של מייל (מסיר נקודות, +tags) ב-Gmail-like
 *   3. Persistent Flag     — דגל בstorage נפרד שלא יורד עם logout
 * 
 * הקובץ הזה הוא client-side. בפרודקשן יש להוסיף אכיפה גם server-side
 * (IP rate-limiting, hash matching ב-DB) — ראה Handoff guide.
 */

window.FreemiumGuard = (function() {
  'use strict';
  
  // Storage keys
  const FP_KEY      = 'talush_device_fp';      // device fingerprint
  const USED_KEY    = 'talush_freemium_used';  // persistent: { fp, emails:[], firstUseAt }
  const SESSION_KEY = 'talush_user_session';   // current user
  
  // ====== Device Fingerprint ======
  function getCanvasHash() {
    try {
      const c = document.createElement('canvas');
      c.width = 200; c.height = 50;
      const ctx = c.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(0, 0, 200, 50);
      ctx.fillStyle = '#069';
      ctx.fillText('Talush.fp.v1', 2, 15);
      ctx.fillStyle = 'rgba(102,204,0,0.7)';
      ctx.fillText('Talush.fp.v1', 4, 17);
      return c.toDataURL().slice(-64);
    } catch { return 'no-canvas'; }
  }
  
  async function sha256(str) {
    if (window.crypto?.subtle) {
      const buf = new TextEncoder().encode(str);
      const hash = await crypto.subtle.digest('SHA-256', buf);
      return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Fallback: simple djb2 hash
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i);
    return (h >>> 0).toString(16);
  }
  
  async function computeFingerprint() {
    const cached = localStorage.getItem(FP_KEY);
    if (cached) return cached;
    
    const parts = [
      navigator.userAgent,
      navigator.language,
      navigator.languages?.join(',') || '',
      screen.width + 'x' + screen.height + 'x' + screen.colorDepth,
      Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      navigator.hardwareConcurrency || '',
      navigator.deviceMemory || '',
      navigator.platform || '',
      getCanvasHash()
    ].join('||');
    
    const fp = await sha256(parts);
    localStorage.setItem(FP_KEY, fp);
    return fp;
  }
  
  // ====== Email Normalization ======
  function normalizeEmail(email) {
    if (!email || typeof email !== 'string') return '';
    email = email.trim().toLowerCase();
    const [local, domain] = email.split('@');
    if (!domain) return email;
    
    // Gmail / Googlemail: ignore dots in local part, ignore + tags
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
      const cleanLocal = local.replace(/\./g, '').split('+')[0];
      return cleanLocal + '@gmail.com';
    }
    // Outlook, Hotmail: ignore + tags
    if (['outlook.com','hotmail.com','live.com','yahoo.com'].includes(domain)) {
      return local.split('+')[0] + '@' + domain;
    }
    return email;
  }
  
  async function emailHash(email) {
    return await sha256('em:' + normalizeEmail(email));
  }
  
  // ====== Used State ======
  function getUsed() {
    try {
      const raw = localStorage.getItem(USED_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
  
  function setUsed(record) {
    localStorage.setItem(USED_KEY, JSON.stringify(record));
  }
  
  // ====== Public API ======
  
  /**
   * האם המשתמש הנוכחי כבר ניצל את ה-freemium?
   * מחזיר { used:bool, reason?:'fingerprint'|'email'|null, since?:date }
   */
  async function checkUsage(email) {
    const used = getUsed();
    if (!used) return { used: false };
    
    const currentFp = await computeFingerprint();
    
    // Match #1: device fingerprint
    if (used.fp && used.fp === currentFp) {
      return { used: true, reason: 'fingerprint', since: used.firstUseAt };
    }
    
    // Match #2: email hash
    if (email && used.emails && used.emails.length) {
      const hash = await emailHash(email);
      if (used.emails.includes(hash)) {
        return { used: true, reason: 'email', since: used.firstUseAt };
      }
    }
    
    return { used: false };
  }
  
  /**
   * מסמן שהמשתמש ניצל את ה-freemium (קריאה אחרי בדיקה ראשונה מוצלחת).
   */
  async function markUsed(email) {
    const fp = await computeFingerprint();
    const existing = getUsed() || { firstUseAt: new Date().toISOString(), emails: [] };
    
    existing.fp = fp;
    if (email) {
      const hash = await emailHash(email);
      if (!existing.emails.includes(hash)) existing.emails.push(hash);
    }
    
    setUsed(existing);
    return existing;
  }
  
  /**
   * Force-reset (admin only — לא חשוף ב-UI לרגיל).
   */
  function reset() {
    localStorage.removeItem(USED_KEY);
    // הערה: לא מוחקים FP_KEY כי זה זיהוי המכשיר ולא קשור לניצול.
    return true;
  }
  
  /**
   * Hook ידידותי: מציג modal/banner אם המשתמש כבר ניצל.
   * הקריאה: FreemiumGuard.guard({ email, onAllowed, onBlocked })
   */
  async function guard({ email, onAllowed, onBlocked }) {
    const result = await checkUsage(email);
    if (result.used) {
      if (typeof onBlocked === 'function') onBlocked(result);
      else showBlockedDialog(result);
    } else {
      if (typeof onAllowed === 'function') onAllowed();
    }
  }
  
  function showBlockedDialog(result) {
    const reasonText = result.reason === 'email'
      ? 'זיהינו שהמייל הזה כבר ניצל את הבדיקה החינמית בעבר.'
      : 'זיהינו שמהמכשיר הזה כבר נוצלה הבדיקה החינמית בעבר.';
    
    const since = result.since ? new Date(result.since).toLocaleDateString('he-IL') : '';
    
    if (window.Talush && window.Talush.confirm) {
      window.Talush.confirm(
        'הבדיקה החינמית כבר נוצלה',
        `${reasonText}${since ? ` (${since})` : ''}\n\nכדי להמשיך לבדוק תלושים, יש לבחור בחבילה. תלוש בודד ב-Pro מתחיל ב-₪10 בלבד.`,
        'בחר חבילה',
        'סגור'
      ).then(ok => {
        if (ok) {
          // Scroll to pricing section
          const pricing = document.querySelector('[data-pricing-section]') || document.getElementById('pricing');
          if (pricing) pricing.scrollIntoView({ behavior:'smooth', block:'start' });
        }
      });
    } else {
      alert(`הבדיקה החינמית כבר נוצלה.\n${reasonText}\n\nכדי להמשיך, יש לבחור בחבילה.`);
    }
  }
  
  return {
    checkUsage,
    markUsed,
    reset,
    guard,
    normalizeEmail,
    computeFingerprint,
    // Debug helpers
    _getUsed: getUsed,
    _showBlocked: showBlockedDialog
  };
})();
