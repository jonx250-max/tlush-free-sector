/**
 * Invite-token gate for Beta Lock mode.
 *
 * Blocks public access to all marketing pages. Friends with a valid invite
 * URL (`?invite=BETA-...`) get a one-time token saved to localStorage that
 * grants future visits.
 *
 * Token format: any string starting with `BETA-` (8+ chars total).
 * Soft security — sufficient to deter casual visitors. Real auth is
 * enforced server-side at Supabase + email whitelist.
 *
 * Loads sync as the first script in <head> so it can intercept render.
 */
(function () {
  var STORAGE_KEY = 'talush_beta_invite';
  var TOKEN_PREFIX = 'BETA-';
  var MIN_LENGTH = 8;

  function isValid(token) {
    return typeof token === 'string' &&
      token.indexOf(TOKEN_PREFIX) === 0 &&
      token.length >= MIN_LENGTH;
  }

  // Check URL for ?invite=<token> and store
  try {
    var url = new URL(window.location.href);
    var inviteParam = url.searchParams.get('invite');
    if (inviteParam && isValid(inviteParam)) {
      localStorage.setItem(STORAGE_KEY, inviteParam);
      url.searchParams.delete('invite');
      window.history.replaceState({}, '', url.toString());
    }
  } catch (e) {
    // Old browser or storage blocked — fall through to splash
  }

  // Verify stored token
  var stored;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    stored = null;
  }

  if (isValid(stored)) {
    return; // Allowed — page renders normally
  }

  // Block render and show splash using safe DOM methods (no innerHTML)
  document.documentElement.style.display = 'none';

  function buildSplash() {
    document.documentElement.style.display = '';
    while (document.body.firstChild) document.body.removeChild(document.body.firstChild);

    var wrap = document.createElement('div');
    wrap.dir = 'rtl';
    wrap.lang = 'he';
    wrap.style.cssText =
      'min-height:100vh;background:#0a0a0a;color:#FDFBF7;' +
      'font-family:Heebo,Arial,sans-serif;display:flex;align-items:center;' +
      'justify-content:center;padding:24px;text-align:center';

    var card = document.createElement('div');
    card.style.maxWidth = '480px';

    var brand = document.createElement('div');
    brand.style.cssText = "font-family:'Frank Ruhl Libre',serif;font-size:48px;color:#B89B5E;margin-bottom:16px;letter-spacing:.05em";
    brand.textContent = 'תלוש';

    var tag = document.createElement('div');
    tag.style.cssText = 'font-size:14px;letter-spacing:.3em;color:#B89B5E;text-transform:uppercase;margin-bottom:32px';
    tag.textContent = 'Private Beta';

    var heading = document.createElement('h1');
    heading.style.cssText = "font-family:'Frank Ruhl Libre',serif;font-size:32px;font-weight:300;margin:0 0 24px;line-height:1.3";
    heading.textContent = 'המערכת בבדיקה פנימית';

    var body = document.createElement('p');
    body.style.cssText = 'font-size:16px;line-height:1.7;color:#FDFBF7;opacity:.85;margin:0 0 32px';
    body.textContent = 'האפליקציה לא זמינה לציבור הרחב. גישה אך ורק עם הזמנה אישית.';

    var hint = document.createElement('p');
    hint.style.cssText = 'font-size:14px;color:#B89B5E;opacity:.7;margin:0';
    hint.textContent = 'אם קיבלת קישור הזמנה, ודא שלחצת עליו לפני שניסית להיכנס שוב.';

    card.appendChild(brand);
    card.appendChild(tag);
    card.appendChild(heading);
    card.appendChild(body);
    card.appendChild(hint);
    wrap.appendChild(card);
    document.body.appendChild(wrap);

    // Update title + remove any title meta tags
    document.title = 'Private Beta · תלוש';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildSplash);
  } else {
    buildSplash();
  }
})();
