/**
 * Generic auth gate for static marketing pages.
 *
 * Usage in HTML:
 *   <script src="/marketing/auth-bridge.js"></script>
 *   <script src="/marketing/auth-guard.js" data-require="auth"></script>
 *
 * data-require options:
 *   - "auth"  → redirect to /login if not authenticated
 *   - "admin" → redirect to /dashboard if authenticated but not admin
 *
 * Once authenticated, exposes:
 *   - window.TalushSession.user (Supabase user)
 *   - window.TalushSession.profile (profiles row)
 *   - window.TalushSession.isAdmin (bool)
 *   - window.TalushSession.ready (Promise resolves when populated)
 */
(function () {
  const scriptTag = document.currentScript
  const requirement = scriptTag?.dataset.require || 'auth'

  window.TalushSession = window.TalushSession || {}

  const ready = (async () => {
    await window.TalushAuth.ready
    const user = await window.TalushAuth.getUser()

    if (!user) {
      window.location.replace('/login')
      return
    }

    window.TalushSession.user = user

    // Fetch profile + admin flag
    try {
      const cfgRes = await fetch('/api/public-config')
      const { supabaseUrl, supabaseAnonKey } = await cfgRes.json()
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.104.1')
      const session = await window.TalushAuth.ready.then(async () => {
        const sessionRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${(await getAccessToken())}` },
        })
        return sessionRes
      }).catch(() => null)

      const sb = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${await getAccessToken()}` } },
        auth: { persistSession: false },
      })

      const { data: profile } = await sb
        .from('profiles')
        .select('id, full_name, is_admin, case_id')
        .eq('id', user.id)
        .maybeSingle()

      window.TalushSession.profile = profile || null
      window.TalushSession.isAdmin = !!profile?.is_admin
    } catch (err) {
      console.warn('[TalushSession] profile fetch failed', err)
      window.TalushSession.profile = null
      window.TalushSession.isAdmin = false
    }

    if (requirement === 'admin' && !window.TalushSession.isAdmin) {
      window.location.replace('/dashboard')
      return
    }

    document.dispatchEvent(new CustomEvent('talush:session-ready', {
      detail: window.TalushSession,
    }))
  })().catch((err) => {
    console.error('[auth-guard] failed', err)
    if (requirement !== 'optional') {
      window.location.replace('/login')
    }
  })

  window.TalushSession.ready = ready

  async function getAccessToken() {
    const cfgRes = await fetch('/api/public-config')
    const { supabaseUrl, supabaseAnonKey } = await cfgRes.json()
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.104.1')
    const sb = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
    const { data } = await sb.auth.getSession()
    return data?.session?.access_token || ''
  }
})()
