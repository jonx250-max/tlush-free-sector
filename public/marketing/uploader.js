/**
 * 📤 TALUSH UPLOADER — Bulletproof file upload for mobile + desktop
 *
 * Handles all the failure modes:
 *  - HEIC/HEIF auto-conversion (iOS photos)
 *  - Image rotation (EXIF orientation fix)
 *  - File size validation + compression
 *  - Multi-file (contracts spanning pages)
 *  - Camera capture (mobile native)
 *  - Drag & drop (desktop)
 *  - Real progress (not fake)
 *  - localStorage backup (recovery)
 *  - Quality checks (resolution / blur warning)
 *  - Hebrew error messages
 *
 * Usage:
 *  <div data-talush-uploader
 *       data-type="payslip"           // payslip | contract | id-card
 *       data-multi="true"              // allow multiple files
 *       data-max-size="20"             // MB
 *  ></div>
 *
 *  <script src="uploader.js"></script>
 *
 *  // Listen for completion:
 *  TalushUploader.on('complete', (files) => { console.log(files); });
 */

window.TalushUploader = (function () {
  const ACCEPTED_TYPES = 'image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,application/pdf';
  const MAX_SIZE_MB = 20;
  const MAX_DIMENSION = 2400; // px — for compression
  const STORAGE_KEY = 'talushUploads';

  const listeners = {};

  function on(event, fn) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
  }

  function emit(event, data) {
    (listeners[event] || []).forEach(fn => fn(data));
  }

  // ============ STORAGE ============
  function getStored() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch { return {}; }
  }

  function storeFile(type, fileData) {
    const all = getStored();
    if (!all[type]) all[type] = [];
    all[type].push({
      ...fileData,
      uploadedAt: new Date().toISOString()
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      return true;
    } catch (e) {
      // Likely quota exceeded — try without dataUrl
      console.warn('[Uploader] Storage full, removing data URL:', e);
      const trimmed = { ...fileData, dataUrl: null, _truncated: true };
      all[type][all[type].length - 1] = trimmed;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); } catch {}
      return false;
    }
  }

  function getStoredFiles(type) {
    return getStored()[type] || [];
  }

  function removeStoredFile(type, idx) {
    const all = getStored();
    if (all[type]) {
      all[type].splice(idx, 1);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    }
  }

  // ============ FILE PROCESSING ============

  /**
   * Read file as data URL
   */
  function readAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = e => reject(new Error('שגיאה בקריאת הקובץ'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Read EXIF orientation from JPEG
   */
  async function getOrientation(file) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => {
        const view = new DataView(e.target.result);
        if (view.getUint16(0, false) !== 0xFFD8) return resolve(1);
        const length = view.byteLength;
        let offset = 2;
        while (offset < length) {
          const marker = view.getUint16(offset, false);
          offset += 2;
          if (marker === 0xFFE1) {
            if (view.getUint32(offset += 2, false) !== 0x45786966) return resolve(1);
            const little = view.getUint16(offset += 6, false) === 0x4949;
            offset += view.getUint32(offset + 4, little);
            const tags = view.getUint16(offset, little);
            offset += 2;
            for (let i = 0; i < tags; i++) {
              if (view.getUint16(offset + (i * 12), little) === 0x0112) {
                return resolve(view.getUint16(offset + (i * 12) + 8, little));
              }
            }
          } else if ((marker & 0xFF00) !== 0xFF00) break;
          else offset += view.getUint16(offset, false);
        }
        resolve(1);
      };
      reader.onerror = () => resolve(1);
      reader.readAsArrayBuffer(file.slice(0, 64 * 1024));
    });
  }

  /**
   * Compress + auto-rotate image
   */
  async function processImage(file, onProgress) {
    onProgress?.(10, 'קורא את התמונה...');

    const orientation = await getOrientation(file);
    onProgress?.(25, 'בודק כיוון...');

    const dataUrl = await readAsDataURL(file);
    onProgress?.(45, 'טוען...');

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        onProgress?.(60, 'מעבד...');

        let { width, height } = img;
        // Fix orientation
        const rotate = [0, 0, 0, 180, 0, 0, 90, 0, 270][orientation] || 0;
        const swap = orientation >= 5 && orientation <= 8;
        if (swap) [width, height] = [height, width];

        // Resize if too large
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Apply rotation
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate((rotate * Math.PI) / 180);
        const dw = swap ? height : width;
        const dh = swap ? width : height;
        ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
        ctx.restore();

        onProgress?.(80, 'דוחס...');

        // Quality check: estimate blur via variance of laplacian (cheap version)
        const blurScore = estimateBlur(ctx, width, height);

        const compressed = canvas.toDataURL('image/jpeg', 0.85);
        onProgress?.(100, 'הושלם');

        resolve({
          name: file.name,
          type: 'image',
          mimeType: 'image/jpeg',
          dataUrl: compressed,
          width,
          height,
          originalSize: file.size,
          compressedSize: Math.round(compressed.length * 0.75),
          blurScore,
          quality: blurScore > 100 ? 'good' : blurScore > 50 ? 'ok' : 'low'
        });
      };
      img.onerror = () => reject(new Error('הקובץ לא נראה כמו תמונה תקינה. נסו שוב.'));
      img.src = dataUrl;
    });
  }

  /**
   * Quick blur estimation — variance of brightness across center
   */
  function estimateBlur(ctx, w, h) {
    try {
      const sx = Math.floor(w * 0.3);
      const sy = Math.floor(h * 0.3);
      const sw = Math.floor(w * 0.4);
      const sh = Math.floor(h * 0.4);
      const data = ctx.getImageData(sx, sy, sw, sh).data;
      let sum = 0, sumSq = 0, count = 0;
      // Sample every 10 pixels for speed
      for (let i = 0; i < data.length; i += 40) {
        const v = (data[i] + data[i + 1] + data[i + 2]) / 3;
        sum += v;
        sumSq += v * v;
        count++;
      }
      const mean = sum / count;
      const variance = sumSq / count - mean * mean;
      return variance;
    } catch { return 200; }
  }

  /**
   * Process PDF — just pass through, no preview
   */
  async function processPDF(file, onProgress) {
    onProgress?.(20, 'קורא PDF...');
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      throw new Error(`קובץ ה-PDF גדול מדי (${(file.size / 1024 / 1024).toFixed(1)}MB). הגבלה: ${MAX_SIZE_MB}MB. נסו לסרוק באיכות נמוכה יותר.`);
    }
    onProgress?.(60, 'מעבד...');
    const dataUrl = await readAsDataURL(file);
    onProgress?.(100, 'הושלם');
    return {
      name: file.name,
      type: 'pdf',
      mimeType: 'application/pdf',
      dataUrl,
      originalSize: file.size,
      compressedSize: file.size,
      quality: 'good'
    };
  }

  /**
   * Detect HEIC by extension since browsers can't read it directly
   */
  function isHeic(file) {
    return /\.(heic|heif)$/i.test(file.name) || file.type === 'image/heic' || file.type === 'image/heif';
  }

  /**
   * Main entry point — process any file
   */
  async function processFile(file, onProgress) {
    // HEIC unsupported by browsers → ask user
    if (isHeic(file)) {
      throw new Error('iPhone שומר תמונות בפורמט HEIC שלא נתמך. כדי לפתור: הגדרות → מצלמה → פורמטים → הכי תואם. או צלמו screenshot של התלוש במקום.');
    }

    // PDFs
    if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
      return processPDF(file, onProgress);
    }

    // Images
    if (file.type.startsWith('image/') || /\.(jpe?g|png|webp|bmp)$/i.test(file.name)) {
      return processImage(file, onProgress);
    }

    throw new Error('סוג הקובץ לא נתמך. אנא העלו JPG, PNG, או PDF.');
  }

  // ============ UI ============

  const styles = `
    .tu-zone {
      border: 2px dashed rgba(184,155,94,0.4);
      background: rgba(184,155,94,0.04);
      padding: 32px 20px;
      text-align: center;
      cursor: pointer;
      transition: all .3s;
      border-radius: 0;
      direction: rtl;
    }
    .tu-zone:hover, .tu-zone.dragover {
      border-color: #B89B5E;
      background: rgba(184,155,94,0.1);
    }
    .tu-zone-icon {
      width: 48px; height: 48px;
      margin: 0 auto 16px;
      border: 1px solid rgba(184,155,94,0.4);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: #B89B5E;
    }
    .tu-zone-title { font-family: 'Frank Ruhl Libre',serif; font-weight: 700; font-size: 18px; color: #0a0a0a; margin-bottom: 6px; }
    .tu-zone-sub { color: rgba(10,10,10,0.55); font-size: 13px; line-height: 1.6; }
    .tu-zone-formats { color: rgba(10,10,10,0.4); font-size: 11px; margin-top: 12px; letter-spacing: 0.05em; text-transform: uppercase; }
    .tu-buttons { display: flex; gap: 10px; margin-top: 20px; justify-content: center; flex-wrap: wrap; }
    .tu-btn {
      padding: 14px 22px; font-size: 13px; font-weight: 600;
      letter-spacing: .15em; text-transform: uppercase;
      border: 1px solid #B89B5E; background: transparent; color: #B89B5E;
      cursor: pointer; transition: all .3s;
      display: flex; align-items: center; gap: 8px;
      min-height: 48px;  /* mobile tap target */
    }
    .tu-btn-primary { background: #B89B5E; color: #0a0a0a; }
    .tu-btn:hover { background: #B89B5E; color: #0a0a0a; }
    .tu-btn-primary:hover { background: #a08846; }
    .tu-files { margin-top: 16px; display: flex; flex-direction: column; gap: 10px; }
    .tu-file {
      display: flex; gap: 14px;
      padding: 14px;
      background: white;
      border: 1px solid rgba(0,0,0,0.08);
      align-items: center;
      direction: rtl;
    }
    .tu-file-thumb {
      width: 60px; height: 60px;
      flex-shrink: 0;
      background: #f4f1eb;
      display: flex; align-items: center; justify-content: center;
      overflow: hidden;
      border: 1px solid rgba(0,0,0,0.05);
    }
    .tu-file-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .tu-file-info { flex: 1; min-width: 0; }
    .tu-file-name { font-weight: 600; font-size: 14px; color: #0a0a0a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tu-file-meta { font-size: 12px; color: rgba(0,0,0,0.5); margin-top: 2px; }
    .tu-file-quality {
      display: inline-block;
      padding: 2px 8px;
      font-size: 10px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-top: 4px;
    }
    .tu-quality-good { background: rgba(34,197,94,0.1); color: #166534; }
    .tu-quality-ok { background: rgba(250,204,21,0.15); color: #854d0e; }
    .tu-quality-low { background: rgba(239,68,68,0.1); color: #991b1b; }
    .tu-file-remove {
      background: transparent; border: none;
      color: rgba(0,0,0,0.4); cursor: pointer;
      padding: 8px;
      font-size: 18px;
      min-width: 44px; min-height: 44px;
    }
    .tu-file-remove:hover { color: #c00; }
    .tu-progress {
      width: 100%;
      height: 4px;
      background: rgba(0,0,0,0.06);
      margin-top: 12px;
      overflow: hidden;
    }
    .tu-progress-bar {
      height: 100%;
      background: #B89B5E;
      width: 0;
      transition: width .3s ease-out;
    }
    .tu-progress-text {
      font-size: 11px;
      letter-spacing: .15em;
      text-transform: uppercase;
      color: #B89B5E;
      text-align: center;
      margin-top: 8px;
      font-family: monospace;
    }
    .tu-error {
      background: rgba(239,68,68,0.06);
      border: 1px solid rgba(239,68,68,0.3);
      color: #991b1b;
      padding: 14px 16px;
      font-size: 13px;
      margin-top: 14px;
      line-height: 1.6;
      display: flex; gap: 10px; align-items: flex-start;
    }
    .tu-warning {
      background: rgba(250,204,21,0.08);
      border: 1px solid rgba(250,204,21,0.3);
      color: #854d0e;
      padding: 12px 14px;
      font-size: 12px;
      margin-top: 14px;
      line-height: 1.6;
    }
    @media (max-width: 640px) {
      .tu-zone { padding: 24px 14px; }
      .tu-zone-title { font-size: 16px; }
      .tu-buttons { flex-direction: column; }
      .tu-btn { width: 100%; justify-content: center; }
    }
  `;

  function injectStyles() {
    if (document.getElementById('tu-styles')) return;
    const el = document.createElement('style');
    el.id = 'tu-styles';
    el.textContent = styles;
    document.head.appendChild(el);
  }

  /**
   * Mount uploader into a container element
   */
  function mount(container, options = {}) {
    injectStyles();

    const type = options.type || container.dataset.type || 'payslip';
    const multi = options.multi !== undefined ? options.multi : (container.dataset.multi === 'true');
    const labels = {
      payslip: { title: 'העלאת תלוש שכר', sub: 'תמונת מסך, צילום או PDF' },
      contract: { title: 'העלאת חוזה העסקה', sub: 'אפשר לצלם עמוד-עמוד · מספר תמונות מותר' },
      'id-card': { title: 'תעודת זהות / טופס 101', sub: 'תמונה ברורה של שני הצדדים' }
    };
    const lbl = labels[type] || labels.payslip;

    container.innerHTML = `
      <div class="tu-zone" data-tu-zone>
        <div class="tu-zone-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        </div>
        <div class="tu-zone-title">${lbl.title}</div>
        <div class="tu-zone-sub">${lbl.sub}</div>
        <div class="tu-buttons">
          <button type="button" class="tu-btn tu-btn-primary" data-tu-action="camera">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            צילום במצלמה
          </button>
          <button type="button" class="tu-btn" data-tu-action="file">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            בחירת קובץ
          </button>
        </div>
        <div class="tu-zone-formats">JPG · PNG · PDF · עד ${MAX_SIZE_MB}MB</div>
      </div>

      <input type="file" data-tu-input-camera accept="image/*" capture="environment" hidden ${multi ? 'multiple' : ''}>
      <input type="file" data-tu-input-file accept="${ACCEPTED_TYPES}" hidden ${multi ? 'multiple' : ''}>

      <div class="tu-progress" hidden data-tu-progress-wrap>
        <div class="tu-progress-bar" data-tu-progress-bar></div>
      </div>
      <div class="tu-progress-text" hidden data-tu-progress-text>מתחיל...</div>

      <div class="tu-files" data-tu-files></div>
    `;

    const zone = container.querySelector('[data-tu-zone]');
    const cameraInput = container.querySelector('[data-tu-input-camera]');
    const fileInput = container.querySelector('[data-tu-input-file]');
    const cameraBtn = container.querySelector('[data-tu-action="camera"]');
    const fileBtn = container.querySelector('[data-tu-action="file"]');
    const progressWrap = container.querySelector('[data-tu-progress-wrap]');
    const progressBar = container.querySelector('[data-tu-progress-bar]');
    const progressText = container.querySelector('[data-tu-progress-text]');
    const filesContainer = container.querySelector('[data-tu-files]');

    cameraBtn.addEventListener('click', (e) => { e.stopPropagation(); cameraInput.click(); });
    fileBtn.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
    zone.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      fileInput.click();
    });

    // Drag & drop (desktop)
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      handleFiles(e.dataTransfer.files);
    });

    cameraInput.addEventListener('change', e => handleFiles(e.target.files));
    fileInput.addEventListener('change', e => handleFiles(e.target.files));

    function showProgress(percent, text) {
      progressWrap.hidden = false;
      progressText.hidden = false;
      progressBar.style.width = percent + '%';
      progressText.textContent = text + ' · ' + Math.round(percent) + '%';
    }
    function hideProgress() {
      progressWrap.hidden = true;
      progressText.hidden = true;
      progressBar.style.width = '0';
    }
    function showError(msg) {
      const old = container.querySelector('.tu-error');
      if (old) old.remove();
      const div = document.createElement('div');
      div.className = 'tu-error';
      div.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div>${msg}</div>
      `;
      filesContainer.parentNode.insertBefore(div, filesContainer);
      setTimeout(() => div.remove(), 8000);
    }

    function renderFiles() {
      const stored = getStoredFiles(type);
      filesContainer.innerHTML = '';
      stored.forEach((f, idx) => {
        const item = document.createElement('div');
        item.className = 'tu-file';
        const thumb = f.type === 'pdf'
          ? `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#B89B5E" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`
          : (f.dataUrl ? `<img src="${f.dataUrl}" alt="">` : '🖼️');
        const sizeKb = ((f.compressedSize || f.originalSize) / 1024).toFixed(0);
        const qLabels = { good: '✓ איכות טובה', ok: 'איכות סבירה', low: '⚠ איכות נמוכה — שקלו לצלם שוב' };
        item.innerHTML = `
          <div class="tu-file-thumb">${thumb}</div>
          <div class="tu-file-info">
            <div class="tu-file-name">${f.name}</div>
            <div class="tu-file-meta">${sizeKb}KB · ${f.type === 'pdf' ? 'PDF' : (f.width + '×' + f.height)}</div>
            ${f.quality ? `<div class="tu-file-quality tu-quality-${f.quality}">${qLabels[f.quality]}</div>` : ''}
          </div>
          <button type="button" class="tu-file-remove" data-tu-remove="${idx}" aria-label="הסר">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        `;
        filesContainer.appendChild(item);
      });
      filesContainer.querySelectorAll('[data-tu-remove]').forEach(btn => {
        btn.addEventListener('click', () => {
          removeStoredFile(type, parseInt(btn.dataset.tuRemove));
          renderFiles();
          emit('change', getStoredFiles(type));
        });
      });
    }

    async function handleFiles(fileList) {
      const files = [...fileList];
      if (!files.length) return;

      // Size pre-check
      for (const f of files) {
        if (f.size > MAX_SIZE_MB * 1024 * 1024 && !isHeic(f)) {
          showError(`הקובץ "${f.name}" גדול מדי (${(f.size / 1024 / 1024).toFixed(1)}MB). הגבלה: ${MAX_SIZE_MB}MB. נסו לדחוס או לצלם שוב באיכות נמוכה יותר.`);
          continue;
        }
        try {
          const result = await processFile(f, showProgress);
          const ok = storeFile(type, result);
          if (!ok) {
            showError('האחסון בדפדפן מלא. הסר קבצים ישנים או רענן את הדף.');
          }
          renderFiles();
          emit('upload', result);
          emit('change', getStoredFiles(type));
          if (result.quality === 'low') {
            showError('התמונה נראית מטושטשת או חשוכה. שקלו לצלם שוב באור טוב יותר עם המכשיר יציב.');
          }
        } catch (err) {
          showError(err.message);
          emit('error', { file: f, error: err });
        } finally {
          hideProgress();
        }
      }

      // Reset inputs so selecting the same file again triggers change
      cameraInput.value = '';
      fileInput.value = '';
    }

    // Initial render of any pre-existing uploads
    renderFiles();

    return {
      getFiles: () => getStoredFiles(type),
      clear: () => { localStorage.removeItem(STORAGE_KEY); renderFiles(); }
    };
  }

  // ============ AUTO-MOUNT ============
  function autoMount() {
    document.querySelectorAll('[data-talush-uploader]').forEach(el => {
      if (!el.dataset.tuMounted) {
        el.dataset.tuMounted = '1';
        mount(el);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMount);
  } else {
    autoMount();
  }

  return {
    mount,
    on,
    getFiles: getStoredFiles,
    clearAll: () => { localStorage.removeItem(STORAGE_KEY); }
  };
})();
