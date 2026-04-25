/**
 * TaxProfile data layer — Supabase persistence layer ON TOP of the
 * existing localStorage save (which provides immediate UX feedback).
 *
 * Flow:
 *   1. Auth-guard ready → fetch tax_profiles row from Supabase
 *   2. If exists → hydrate form (overrides localStorage if newer)
 *   3. Hook change/input events → debounced upsert to Supabase
 *
 * On final "Save" button → POST mark complete + redirect to /dashboard.
 */
(function () {
  const FIELD_IDS = [
    'firstName', 'lastName', 'birthDate', 'gender', 'city', 'moveDate',
    'workCity', 'eduEnd', 'eduField', 'donations', 'extraPension',
    'expectedSalary', 'employerName',
  ]
  const SAVE_DEBOUNCE_MS = 1200

  let supabase = null
  let saveTimer

  document.addEventListener('talush:session-ready', async () => {
    const user = window.TalushSession.user
    if (!user) return

    try {
      const cfgRes = await fetch('/api/public-config')
      const { supabaseUrl, supabaseAnonKey } = await cfgRes.json()
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.104.1')
      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true },
      })

      const { data: profile } = await supabase
        .from('tax_profiles')
        .select('data, updated_at')
        .eq('user_id', user.id)
        .maybeSingle()

      if (profile?.data) hydrateForm(profile.data)

      // Hook auto-save events
      ;['change', 'input'].forEach(evt => {
        document.addEventListener(evt, e => {
          if (e.target.closest('#step-1, #step-2, #step-3, #step-4, #step-5')) {
            scheduleSupabaseSave()
          }
        })
      })

      // Hook final save button
      const saveBtn = document.getElementById('saveBtn')
      if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
          await saveToSupabase(true)
          // Existing button handler runs separately and shows toast
        })
      }
    } catch (err) {
      console.warn('[taxprofile-data] init failed', err)
    }
  })

  function hydrateForm(data) {
    for (const id of FIELD_IDS) {
      const el = document.getElementById(id)
      if (el && data[id] != null && el.value === '') {
        el.value = data[id]
      }
    }
    // Restore visual selections (status/edu/special)
    if (data.status) {
      document.querySelectorAll('[data-status]').forEach(c =>
        c.classList.toggle('selected', c.dataset.status === data.status)
      )
    }
    if (data.edu) {
      document.querySelectorAll('[data-edu]').forEach(c =>
        c.classList.toggle('selected', c.dataset.edu === data.edu)
      )
    }
    if (Array.isArray(data.special)) {
      const set = new Set(data.special)
      document.querySelectorAll('[data-special]').forEach(c => {
        const on = set.has(c.dataset.special)
        c.classList.toggle('selected', on)
        const check = c.querySelector('.check')
        if (check) check.textContent = on ? '✓' : '+'
      })
    }
    if (typeof data.kidsYoung === 'number') {
      const el = document.getElementById('val-kids-young')
      if (el) el.textContent = String(data.kidsYoung)
    }
    if (typeof data.kidsOld === 'number') {
      const el = document.getElementById('val-kids-old')
      if (el) el.textContent = String(data.kidsOld)
    }
  }

  function scheduleSupabaseSave() {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => saveToSupabase(false), SAVE_DEBOUNCE_MS)
  }

  async function saveToSupabase(showToast) {
    if (!supabase) return
    const user = window.TalushSession?.user
    if (!user) return

    try {
      const data = collectFormData()
      const completeness = computeCompleteness(data)

      const { error } = await supabase.from('tax_profiles').upsert(
        {
          user_id: user.id,
          data,
          completeness_score: completeness,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

      if (error) {
        console.warn('[taxprofile-data] save failed', error)
        if (showToast && window.Talush?.toast) {
          window.Talush.toast('שמירה לשרת נכשלה — הנתונים נשמרו במכשיר', 'warn')
        }
        return
      }

      if (showToast && window.Talush?.toast) {
        window.Talush.toast('הפרופיל נשמר בהצלחה', 'success')
      }
    } catch (err) {
      console.warn('[taxprofile-data] save error', err)
    }
  }

  function collectFormData() {
    const data = {}
    for (const id of FIELD_IDS) {
      const el = document.getElementById(id)
      if (el) data[id] = el.value
    }
    // Visual selections (read from DOM state)
    data.status = document.querySelector('[data-status].selected')?.dataset.status || ''
    data.edu = document.querySelector('[data-edu].selected')?.dataset.edu || 'none'
    data.special = Array.from(document.querySelectorAll('[data-special].selected'))
      .map(c => c.dataset.special)
    data.kidsYoung = parseInt(document.getElementById('val-kids-young')?.textContent || '0', 10)
    data.kidsOld = parseInt(document.getElementById('val-kids-old')?.textContent || '0', 10)
    return data
  }

  function computeCompleteness(data) {
    const required = ['firstName', 'lastName', 'birthDate', 'gender', 'city', 'employerName']
    const filled = required.filter(k => data[k] && String(data[k]).trim().length > 0).length
    return Math.round((filled / required.length) * 100)
  }
})()
