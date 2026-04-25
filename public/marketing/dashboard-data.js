/**
 * Dashboard-specific data wiring.
 * Listens for talush:session-ready (from auth-guard.js), then fetches
 * user's checks + analyses_purchases and updates DOM elements.
 *
 * DOM hooks (data-* attrs added below to source HTML):
 *   [data-tlush="user-name"]      → user's full name
 *   [data-tlush="plan-badge"]     → current/most-recent purchase tier
 *   [data-tlush="kpi-checks"]     → count of checks
 *   [data-tlush="kpi-total-gap"]  → sum of total_gap_nis
 *   [data-tlush="logout-btn"]     → click → signOut + /login
 *   [data-tlush="cta-upload"]     → href → /upload
 */
(function () {
  document.addEventListener('talush:session-ready', async () => {
    const user = window.TalushSession.user
    const profile = window.TalushSession.profile

    // 1. User name in sidebar
    const nameEls = document.querySelectorAll('[data-tlush="user-name"]')
    const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email || 'משתמש'
    nameEls.forEach(el => { el.textContent = displayName })

    // 2. Logout buttons
    const logoutBtns = document.querySelectorAll('[data-tlush="logout-btn"]')
    logoutBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault()
        await window.TalushAuth.signOut()
        window.location.replace('/login')
      })
    })

    // 3. Fetch checks + purchases (RLS-isolated to current user)
    try {
      const sb = await window.TalushAuth.getClient()

      const [checksRes, purchasesRes] = await Promise.all([
        sb.from('checks').select('id, total_gap_nis, created_at').order('created_at', { ascending: false }).limit(50),
        sb.from('analyses_purchases').select('depth_tier, status, paid_at').order('paid_at', { ascending: false, nullsFirst: false }).limit(1),
      ])

      const checks = checksRes.data || []
      const purchase = purchasesRes.data?.[0]

      // KPIs
      const kpiChecks = document.querySelectorAll('[data-tlush="kpi-checks"]')
      kpiChecks.forEach(el => { el.textContent = String(checks.length) })

      const kpiGap = document.querySelectorAll('[data-tlush="kpi-total-gap"]')
      const totalGap = checks.reduce((s, c) => s + Number(c.total_gap_nis || 0), 0)
      kpiGap.forEach(el => { el.textContent = `₪${Math.round(totalGap).toLocaleString('he-IL')}` })

      // Plan badge
      const planEls = document.querySelectorAll('[data-tlush="plan-badge"]')
      const tierLabel = purchase?.depth_tier
        ? { free: 'חינם', basic: 'Basic', pro: 'Pro', premium: 'Premium' }[purchase.depth_tier] || purchase.depth_tier
        : 'חינם'
      planEls.forEach(el => { el.textContent = tierLabel })
    } catch (err) {
      console.warn('[dashboard-data] fetch failed', err)
    }
  })
})()
