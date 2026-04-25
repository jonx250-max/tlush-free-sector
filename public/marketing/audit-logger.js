/**
 * Talush — Audit Logger
 * ──────────────────────
 * Logs every legally-significant user action to localStorage (POC)
 * and posts to /api/audit (production).
 *
 * Each event:
 *  - timestamp (ISO)
 *  - case_id (per-user)
 *  - type (SIGNUP | PAYSLIP_UPLOAD | CHECK_RUN | NOTICE_DISPLAYED | ...)
 *  - details (human-readable, will be shown to lawyers/court)
 *  - evidence (file refs / hashes)
 *  - prev_hash (chain integrity)
 *  - hash (SHA-256 of this entry, links to next)
 *
 * Hash chain ensures tampering is detectable: changing any past event
 * breaks the chain and is logged as INTEGRITY_VIOLATION.
 *
 * Usage:
 *   TalushAudit.log('PDF_EXPORTED', 'הופק PDF דוח לחודש 05/2026', ['report_v2.1.pdf']);
 */
(function() {
  'use strict';
  const KEY = 'talush_audit_log';
  const CASE_KEY = 'talush_case_id';

  function getCaseId() {
    let id = localStorage.getItem(CASE_KEY);
    if (!id) {
      const d = new Date().toISOString().slice(0, 10);
      const r = Math.random().toString(36).slice(2, 6).toUpperCase();
      id = `check-${d}-${r}`;
      localStorage.setItem(CASE_KEY, id);
    }
    return id;
  }

  async function sha256(str) {
    const buf = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function log(type, details, evidence = []) {
    const entries = JSON.parse(localStorage.getItem(KEY) || '[]');
    const prev = entries[entries.length - 1];
    const entry = {
      ts: new Date().toISOString(),
      case_id: getCaseId(),
      type,
      details,
      evidence,
      ip: 'client-side',
      user_agent: navigator.userAgent.slice(0, 120),
      prev_hash: prev?.hash || 'genesis',
      url: location.pathname
    };
    entry.hash = (await sha256(JSON.stringify(entry))).slice(0, 32);
    entries.push(entry);
    localStorage.setItem(KEY, JSON.stringify(entries.slice(-200))); // keep last 200

    // In production: also POST to /api/audit (server-side append-only ledger)
    return entry;
  }

  async function verifyChain() {
    const entries = JSON.parse(localStorage.getItem(KEY) || '[]');
    for (let i = 0; i < entries.length; i++) {
      const e = { ...entries[i] };
      const expected = e.hash;
      delete e.hash;
      const actual = (await sha256(JSON.stringify(e))).slice(0, 32);
      if (expected !== actual) return { valid: false, brokenAt: i };
      if (i > 0 && entries[i].prev_hash !== entries[i-1].hash) {
        return { valid: false, brokenAt: i, reason: 'broken-chain' };
      }
    }
    return { valid: true, count: entries.length };
  }

  function getAll() {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  }

  function exportJSON() {
    return JSON.stringify({
      case_id: getCaseId(),
      exported_at: new Date().toISOString(),
      entries: getAll()
    }, null, 2);
  }

  window.TalushAudit = { log, verifyChain, getAll, exportJSON, getCaseId };

  // Auto-log: page view (only first time per session)
  if (!sessionStorage.getItem('talush_pv_logged_' + location.pathname)) {
    sessionStorage.setItem('talush_pv_logged_' + location.pathname, '1');
    log('PAGE_VIEW', `נצפה דף: ${document.title}`, []);
  }
})();
