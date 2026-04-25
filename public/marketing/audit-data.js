/**
 * Audit page data wiring — fetches audit_log + verifies hash chain.
 * Requires data-require="admin".
 */
(function () {
  document.addEventListener('talush:session-ready', async () => {
    if (!window.TalushSession?.isAdmin) return

    const searchForm = document.querySelector('[data-tlush-audit="search-form"]')
    const resultsContainer = document.querySelector('[data-tlush-audit="results"]')
    const chainStatusEl = document.querySelector('[data-tlush-audit="chain-status"]')

    if (!searchForm) {
      // No explicit form found — fetch user's own most recent entries
      await loadAuditEntries()
    } else {
      searchForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        const formData = new FormData(searchForm)
        const caseId = formData.get('caseId')?.toString().trim()
        const userId = formData.get('userId')?.toString().trim()
        await loadAuditEntries(caseId || null, userId || null)
      })
    }

    async function loadAuditEntries(caseId = null, userId = null) {
      try {
        const cfgRes = await fetch('/api/public-config')
        const { supabaseUrl, supabaseAnonKey } = await cfgRes.json()
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.104.1')
        const sb = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: true, autoRefreshToken: true },
        })

        const { data: { session } } = await sb.auth.getSession()
        if (!session) return

        const params = new URLSearchParams()
        if (caseId) params.set('case_id', caseId)
        else if (userId) params.set('user_id', userId)

        const r = await fetch(`/api/audit/verify?${params.toString()}`, {
          headers: { authorization: `Bearer ${session.access_token}` },
        })
        const data = await r.json()

        if (chainStatusEl) {
          chainStatusEl.textContent = data.intact
            ? '✓ שרשרת תקינה'
            : `✗ שרשרת פגומה (אינדקס ${data.brokenAtIndex})`
          chainStatusEl.className = data.intact
            ? 'text-green-400 font-semibold'
            : 'text-red-400 font-semibold'
        }

        if (resultsContainer) {
          renderEntries(resultsContainer, data.entries || [])
        }
      } catch (err) {
        console.warn('[audit-data] failed', err)
      }
    }
  })

  function renderEntries(container, entries) {
    while (container.firstChild) container.removeChild(container.firstChild)
    if (entries.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'text-white/40 text-sm py-4'
      empty.textContent = 'לא נמצאו רשומות'
      container.appendChild(empty)
      return
    }
    for (const e of entries) {
      const row = document.createElement('div')
      row.className = 'border-b border-white/5 py-3 text-xs font-mono'
      const ts = document.createElement('span')
      ts.className = 'text-white/50 mr-2'
      ts.textContent = new Date(e.created_at).toLocaleString('he-IL')
      const action = document.createElement('span')
      action.className = 'text-gold font-semibold mr-2'
      action.textContent = e.action
      const hash = document.createElement('span')
      hash.className = 'text-white/30'
      hash.textContent = (e.hash || '').slice(0, 16) + '…'
      row.appendChild(ts)
      row.appendChild(action)
      row.appendChild(hash)
      container.appendChild(row)
    }
  }
})()
