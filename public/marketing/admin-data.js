/**
 * Admin page data wiring — fetches pending laws + security events.
 * Requires data-require="admin" in auth-guard (only seeded admin can read).
 */
(function () {
  document.addEventListener('talush:session-ready', async () => {
    if (!window.TalushSession?.isAdmin) return

    try {
      const sb = await window.TalushAuth.getClient()

      // Fetch laws_corrections (auto-update queue)
      const { data: corrections } = await sb
        .from('laws_corrections')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      const lawsContainer = document.querySelector('[data-tlush-admin="pending-laws"]')
      if (lawsContainer && corrections) {
        renderLawsList(lawsContainer, corrections)
      }

      // Fetch security_events
      const { data: events } = await sb
        .from('security_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      const eventsContainer = document.querySelector('[data-tlush-admin="security-events"]')
      if (eventsContainer && events) {
        renderEventsList(eventsContainer, events)
      }

      // KPI counts
      const lawsCountEl = document.querySelector('[data-tlush-admin="laws-count"]')
      if (lawsCountEl) lawsCountEl.textContent = String(corrections?.length || 0)
      const eventsCountEl = document.querySelector('[data-tlush-admin="events-count"]')
      if (eventsCountEl) eventsCountEl.textContent = String(events?.length || 0)
    } catch (err) {
      console.warn('[admin-data] fetch failed', err)
    }
  })

  function renderLawsList(container, items) {
    while (container.firstChild) container.removeChild(container.firstChild)
    if (items.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'text-white/40 text-sm'
      empty.textContent = 'אין חוקים ממתינים לאישור'
      container.appendChild(empty)
      return
    }
    for (const item of items) {
      const row = document.createElement('div')
      row.className = 'border-b border-white/5 py-3'
      const title = document.createElement('div')
      title.className = 'font-semibold text-cream text-sm'
      title.textContent = item.law_id
      const meta = document.createElement('div')
      meta.className = 'text-xs text-white/50 mt-1'
      meta.textContent = `${item.effective_from || '—'} · ${item.affected_checks_count || 0} checks affected`
      row.appendChild(title)
      row.appendChild(meta)
      container.appendChild(row)
    }
  }

  function renderEventsList(container, items) {
    while (container.firstChild) container.removeChild(container.firstChild)
    if (items.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'text-white/40 text-sm'
      empty.textContent = 'אין אירועי אבטחה'
      container.appendChild(empty)
      return
    }
    for (const item of items) {
      const row = document.createElement('div')
      row.className = 'border-b border-white/5 py-2 text-xs'
      const type = document.createElement('span')
      type.className = 'text-gold font-semibold'
      type.textContent = item.event_type
      const ip = document.createElement('span')
      ip.className = 'text-white/50 mx-2'
      ip.textContent = item.ip || 'unknown'
      const country = document.createElement('span')
      country.className = 'text-white/40'
      country.textContent = item.country || ''
      row.appendChild(type)
      row.appendChild(ip)
      row.appendChild(country)
      container.appendChild(row)
    }
  }
})()
