/* === Talush Personal Data Export ===
 * One-click GDPR-style export. Bundles everything the user has into a single ZIP:
 * profile, payslips, reports, action ledger, rights snapshot, README + DPO contact.
 *
 * Uses JSZip from CDN (loaded on-demand, ~100KB).
 */
(function(global) {

  function loadJSZip() {
    return new Promise((resolve, reject) => {
      if (window.JSZip) return resolve(window.JSZip);
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      s.integrity = 'sha512-XMVd28F1oH/O71fzwBnV7HucLxVwtxf26XV8P4wPk26EDxuGZ91N8bsOttmnomcCD3CS5ZMRL50H0GgOHvegtg==';
      s.crossOrigin = 'anonymous';
      s.referrerPolicy = 'no-referrer';
      s.onload = () => resolve(window.JSZip);
      s.onerror = () => reject(new Error('Failed to load JSZip'));
      document.head.appendChild(s);
    });
  }

  function readFromStorage(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  }

  function buildReadme(meta) {
    return `╔════════════════════════════════════════════════╗
║  Talush — תיק נתונים אישי                       ║
║  Personal Data Export                          ║
╚════════════════════════════════════════════════╝

תאריך הפקה: ${new Date().toLocaleString('he-IL')}
משתמש: ${meta.userName || 'אנונימי'}
מס' פעולות בהיסטוריה: ${meta.actionCount}

────────────────────────────────────────────────
מה יש בתיק הזה?
────────────────────────────────────────────────

📄 profile.json
   פרופיל המס שלך — תושבות, מצב משפחתי, ילדים,
   פנסיה, השכלה, מקום עבודה ועוד.
   (כל מה שמילאת ב-TaxProfile)

📋 actions-log.json
   רישום מלא של פעולות שביצעת באתר —
   העלאות, הפקת דוחות, בקשות עדכון.

⚖️  rights-snapshot.json
   צילום מצב הזכויות שלך נכון לרגע הייצוא —
   זכויות פתוחות, סכומים משוערים, סטטוס.

📁 payslips/
   תלושי השכר שהעלית. רק שמות הקבצים נשמרים
   באתר; הקבצים עצמם נשארים על המכשיר שלך.

📁 reports/
   דוחות שיצרת ושמרת.

📞 contact.txt
   פרטי קשר עם נציג הגנת הפרטיות (DPO)
   לפי תקנות הגנת הפרטיות בישראל.

────────────────────────────────────────────────
זכויות שלך
────────────────────────────────────────────────

לפי חוק הגנת הפרטיות, יש לך זכות:
• לעיין בנתונים שנשמרים עליך (זה הקובץ הזה!)
• לתקן נתונים שגויים
• למחוק את החשבון והנתונים
• להגביל עיבוד מסוים

לבירורים: dpo@talush.co.il

────────────────────────────────────────────────
שמירה ופרטיות
────────────────────────────────────────────────

• הקובץ הזה הופק במכשיר שלך — לא נשלח לשרת.
• כל הנתונים נשמרים ב-localStorage של הדפדפן.
• פתיחה מומלצת בעורך טקסט (לקבצי .json) או
  בכל תוכנת ZIP סטנדרטית.

תודה שאתה משתמש ב-Talush 🌿
`;
  }

  function buildContactTxt() {
    return `Talush — פרטי קשר להגנת הפרטיות

נציג הגנת פרטיות (DPO):
  אימייל:  dpo@talush.co.il
  טלפון:   *6789

מענה לפניות:    עד 30 ימי עסקים
שעות פעילות:    א'-ה' 9:00-17:00

מקור: סעיף 8(ה1) לחוק הגנת הפרטיות, התשמ"א-1981
תקנות הגנת הפרטיות (אבטחת מידע), התשע"ז-2017
`;
  }

  async function exportData() {
    const JSZip = await loadJSZip();
    const zip = new JSZip();

    // Collect data from localStorage
    const profile = readFromStorage('talush_profile', {}) || readFromStorage('tp_data', {}) || {};
    const ledger = readFromStorage('talush_ledger', []);
    const rights = readFromStorage('talush_rights_snapshot', null);
    const recovery = readFromStorage('talush_recovery', null);
    const orderRecovery = readFromStorage('talush_order_recovery', null);

    const meta = {
      userName: profile.firstName ? `${profile.firstName} ${profile.lastName || ''}`.trim() : null,
      actionCount: Array.isArray(ledger) ? ledger.length : 0
    };

    // README + Contact
    zip.file('README.txt', buildReadme(meta));
    zip.file('contact.txt', buildContactTxt());

    // Profile
    zip.file('profile.json', JSON.stringify({
      ...profile,
      _exportedAt: new Date().toISOString(),
      _exportVersion: '1.0'
    }, null, 2));

    // Actions log
    zip.file('actions-log.json', JSON.stringify({
      events: Array.isArray(ledger) ? ledger : [],
      total: Array.isArray(ledger) ? ledger.length : 0,
      _exportedAt: new Date().toISOString()
    }, null, 2));

    // Rights snapshot
    if (rights) {
      zip.file('rights-snapshot.json', JSON.stringify({
        ...rights,
        _exportedAt: new Date().toISOString()
      }, null, 2));
    }

    // Recovery state (auto-save snapshots)
    if (recovery || orderRecovery) {
      zip.file('recovery-state.json', JSON.stringify({
        autosave: recovery,
        lastOrder: orderRecovery,
        _exportedAt: new Date().toISOString()
      }, null, 2));
    }

    // Payslips folder (just filenames; actual files stay local)
    const payslipFolder = zip.folder('payslips');
    const uploadedFiles = readFromStorage('talush_uploads', []);
    if (Array.isArray(uploadedFiles) && uploadedFiles.length) {
      payslipFolder.file('_index.json', JSON.stringify(uploadedFiles, null, 2));
      payslipFolder.file('README.txt', 'תלושים שהועלו — שמירה על שם וגודל בלבד. הקבצים עצמם נשארים במכשיר שלך מטעמי פרטיות.');
    } else {
      payslipFolder.file('README.txt', 'אין תלושים שהועלו עדיין.');
    }

    // Reports folder placeholder
    const reportsFolder = zip.folder('reports');
    const reports = readFromStorage('talush_reports', []);
    if (Array.isArray(reports) && reports.length) {
      reportsFolder.file('_index.json', JSON.stringify(reports, null, 2));
    } else {
      reportsFolder.file('README.txt', 'לא יצרת דוחות עדיין.');
    }

    // Generate ZIP
    const blob = await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    // Download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.download = `talush-data-${stamp}.zip`;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 100);

    return { 
      filename: a.download, 
      size: blob.size,
      sizeKB: (blob.size / 1024).toFixed(1)
    };
  }

  global.talushExportData = exportData;

})(window);
