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
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
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
        const { error } = await c.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        })
        if (error) return { ok: false, error: toHebrew(error) }
        return { ok: true }
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
  }
})()
