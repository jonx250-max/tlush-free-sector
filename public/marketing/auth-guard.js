/**
 * Generic auth gate for static marketing pages.
 *
 * Usage in HTML:
 *   <script src="/marketing/auth-bridge.js"></script>
 *   <script src="/marketing/auth-guard.js" data-require="auth"></script>
 *
 * data-require:
 *   - "auth"  → redirect to /login if not authenticated
 *   - "admin" → redirect to /dashboard if authenticated but not admin
 *
 * After auth ready, exposes:
 *   - window.TalushSession.user / profile / isAdmin / ready (Promise)
 *   - dispatches 'talush:session-ready' event
 */
(function () {
  const scriptTag = document.currentScript
  const requirement = scriptTag?.dataset.require || 'auth'

  window.TalushSession = window.TalushSession || {}

  const ready = (async () => {
    // auth-bridge.js initialized the client + processed any OAuth hash
    const client = await window.TalushAuth.getClient()

    // Use getSession() rather than getUser() for OAuth callbacks —
    // session is what matters (and is what triggers the URL-hash parse).
    const { data: { session } } = await client.auth.getSession()
    const user = session?.user || null

    if (!user) {
      window.location.replace('/login')
      return
    }

    window.TalushSession.user = user

    try {
      const { data: profile } = await client
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
})()
