/**
 * Shared auth bridge for static marketing pages (Login, Signup,
 * ForgotPassword). Wires forms to real Supabase auth using public
 * config from /api/public-config.
 *
 * Exposes window.TalushAuth = {
 *   ready: Promise<void>,           // resolves after Supabase init
 *   signIn(email, password): Promise<{ ok, error? }>,
 *   signUp(email, password, fullName): Promise<{ ok, error? }>,
 *   resetPassword(email): Promise<{ ok, error? }>,
 *   signOut(): Promise<void>,
 *   getUser(): Promise<User | null>,
 * }
 */
(function () {
  const SUPABASE_CDN = 'https://esm.sh/@supabase/supabase-js@2.104.1'
  const HEBREW_ERROR_MAP = {
    'Invalid login credentials': 'פרטי ההתחברות שגויים. נסה שנית.',
    'Email not confirmed': 'אימייל לא אומת. בדוק את תיבת הדואר.',
    'User already registered': 'משתמש קיים — נסה התחברות.',
    'Token has expired or is invalid': 'הקוד פג תוקף. בקש קוד חדש.',
    'Too many requests': 'יותר מדי ניסיונות. נסה שוב מאוחר יותר.',
    'Network request failed': 'בעיית תקשורת. בדוק את חיבור האינטרנט.',
  }

  function toHebrew(error) {
    if (!error) return 'שגיאה לא ידועה'
    const msg = error.message || String(error)
    for (const [en, he] of Object.entries(HEBREW_ERROR_MAP)) {
      if (msg.includes(en)) return he
    }
    return msg
  }

  let client = null
  const ready = (async () => {
    const cfgRes = await fetch('/api/public-config')
    if (!cfgRes.ok) throw new Error('Failed to load public config')
    const { supabaseUrl, supabaseAnonKey } = await cfgRes.json()
    const { createClient } = await import(SUPABASE_CDN)
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
    })
    // Force session detection from URL hash (#access_token=... after OAuth) —
    // Supabase v2 does this on createClient but await getSession() to ensure
    // we don't race with auth-guard's getUser() call.
    await client.auth.getSession()
  })().catch((err) => {
    console.error('[TalushAuth] init failed:', err)
    throw err
  })

  async function ensureClient() {
    await ready
    if (!client) throw new Error('Auth client not ready')
    return client
  }

  window.TalushAuth = {
    ready,
    /**
     * Expose the underlying Supabase client for callers that need direct
     * .from()/.rpc() access (auth-guard, dashboard-data, taxprofile-data,
     * admin-data, audit-data). Falls back to creating a new client only
     * if the bridge fails — same auth state shared via localStorage.
     */
    async getClient() {
      await ready
      return client
    },
    async signIn(email, password) {
      try {
        const c = await ensureClient()
        const { error } = await c.auth.signInWithPassword({ email, password })
        if (error) return { ok: false, error: toHebrew(error) }
        return { ok: true }
      } catch (err) {
        return { ok: false, error: toHebrew(err) }
      }
    },
    async signUp(email, password, fullName) {
      try {
        const c = await ensureClient()
        const { data, error } = await c.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        })
        if (error) return { ok: false, error: toHebrew(error) }
        // Returns hasSession=true if Supabase auto-creates session (no email
        // confirmation required), false if user must verify email first.
        return { ok: true, hasSession: !!data?.session, user: data?.user }
      } catch (err) {
        return { ok: false, error: toHebrew(err) }
      }
    },
    async resetPassword(email) {
      try {
        const c = await ensureClient()
        const { error } = await c.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`,
        })
        if (error) return { ok: false, error: toHebrew(error) }
        return { ok: true }
      } catch (err) {
        return { ok: false, error: toHebrew(err) }
      }
    },
    async signOut() {
      const c = await ensureClient()
      await c.auth.signOut()
    },
    async getUser() {
      const c = await ensureClient()
      const { data } = await c.auth.getUser()
      return data?.user || null
    },
    async signInWithOAuth(provider) {
      try {
        const c = await ensureClient()
        const { error } = await c.auth.signInWithOAuth({
          provider,
          options: { redirectTo: `${window.location.origin}/dashboard` },
        })
        if (error) return { ok: false, error: toHebrew(error) }
        return { ok: true }
      } catch (err) {
        return { ok: false, error: toHebrew(err) }
      }
    },
    async sendPhoneOtp(phone) {
      try {
        const c = await ensureClient()
        const normalized = phone.replace(/\s+/g, '').replace(/^0/, '+972')
        const { error } = await c.auth.signInWithOtp({ phone: normalized })
        if (error) return { ok: false, error: toHebrew(error) }
        return { ok: true, phone: normalized }
      } catch (err) {
        return { ok: false, error: toHebrew(err) }
      }
    },
    async verifyPhoneOtp(phone, token) {
      try {
        const c = await ensureClient()
        const { error } = await c.auth.verifyOtp({ phone, token, type: 'sms' })
        if (error) return { ok: false, error: toHebrew(error) }
        return { ok: true }
      } catch (err) {
        return { ok: false, error: toHebrew(err) }
      }
    },
  }

  // Auto-wire [data-tlush-oauth="<provider|otp-phone>"] buttons on every page
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-tlush-oauth]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault()
        const provider = btn.getAttribute('data-tlush-oauth')
        if (provider === 'otp-phone') {
          openOtpModal()
          return
        }
        const result = await window.TalushAuth.signInWithOAuth(provider)
        if (!result.ok && window.Talush?.toast) {
          window.Talush.toast(result.error || 'שגיאה לא ידועה', 'error')
        }
      })
    })
  })

  function openOtpModal() {
    if (document.getElementById('tlush-otp-modal')) return
    const overlay = document.createElement('div')
    overlay.id = 'tlush-otp-modal'
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;direction:rtl;'

    const card = document.createElement('div')
    card.style.cssText = 'background:#0a0a0a;border:1px solid rgba(184,155,94,0.4);padding:32px;max-width:420px;width:90%;color:#FDFBF7;font-family:Assistant,sans-serif;'

    const title = document.createElement('h2')
    title.style.cssText = 'font-family:"Frank Ruhl Libre",serif;font-size:24px;margin-bottom:8px;'
    title.textContent = 'כניסה עם SMS'
    card.appendChild(title)

    const subtitle = document.createElement('p')
    subtitle.style.cssText = 'font-size:13px;color:rgba(253,251,247,0.6);margin-bottom:24px;'
    subtitle.textContent = 'הזן את מספר הטלפון שלך — נשלח לך קוד'
    card.appendChild(subtitle)

    const phoneInput = document.createElement('input')
    phoneInput.type = 'tel'
    phoneInput.placeholder = '050-1234567'
    phoneInput.style.cssText = 'background:transparent;border:none;border-bottom:1.5px solid rgba(253,251,247,0.2);padding:12px 0;width:100%;font-size:18px;color:#FDFBF7;outline:none;direction:ltr;text-align:right;'
    card.appendChild(phoneInput)

    const codeInput = document.createElement('input')
    codeInput.type = 'text'
    codeInput.inputMode = 'numeric'
    codeInput.placeholder = 'קוד אימות (6 ספרות)'
    codeInput.style.cssText = 'background:transparent;border:none;border-bottom:1.5px solid rgba(253,251,247,0.2);padding:12px 0;width:100%;font-size:18px;color:#FDFBF7;outline:none;margin-top:16px;display:none;'
    card.appendChild(codeInput)

    const btnPrimary = document.createElement('button')
    btnPrimary.style.cssText = 'background:#B89B5E;color:#0a0a0a;padding:14px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;font-size:13px;border:none;width:100%;margin-top:24px;cursor:pointer;'
    btnPrimary.textContent = 'שלח קוד'
    card.appendChild(btnPrimary)

    const btnClose = document.createElement('button')
    btnClose.style.cssText = 'background:transparent;color:rgba(253,251,247,0.5);border:none;width:100%;padding:12px;font-size:12px;margin-top:8px;cursor:pointer;'
    btnClose.textContent = 'ביטול'
    card.appendChild(btnClose)

    overlay.appendChild(card)
    document.body.appendChild(overlay)

    let pendingPhone = null
    btnPrimary.addEventListener('click', async () => {
      if (!pendingPhone) {
        const phone = phoneInput.value?.trim()
        if (!phone) return
        btnPrimary.textContent = 'שולח...'
        btnPrimary.disabled = true
        const result = await window.TalushAuth.sendPhoneOtp(phone)
        btnPrimary.disabled = false
        if (!result.ok) {
          btnPrimary.textContent = 'שלח קוד'
          if (window.Talush?.toast) window.Talush.toast(result.error, 'error')
          return
        }
        pendingPhone = result.phone
        phoneInput.disabled = true
        codeInput.style.display = 'block'
        codeInput.focus()
        btnPrimary.textContent = 'אמת קוד'
      } else {
        const token = codeInput.value?.trim()
        if (!token) return
        btnPrimary.textContent = 'מאמת...'
        btnPrimary.disabled = true
        const result = await window.TalushAuth.verifyPhoneOtp(pendingPhone, token)
        btnPrimary.disabled = false
        if (!result.ok) {
          btnPrimary.textContent = 'אמת קוד'
          if (window.Talush?.toast) window.Talush.toast(result.error, 'error')
          return
        }
        overlay.remove()
        window.location.href = '/dashboard'
      }
    })

    btnClose.addEventListener('click', () => overlay.remove())
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove()
    })
  }
})()
