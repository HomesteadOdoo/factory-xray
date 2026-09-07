// Persistent detail routing for GitHub Pages hash navigation.
// Keeps list/detail drill-downs reloadable without exposing private data in URLs.
(() => {
  if (typeof load !== 'function' || typeof loadDetail !== 'function' || typeof currentView !== 'function') return

  const baseLoad = load
  const baseLoadDetail = loadDetail
  const inlineRelationKinds = {
    company_id: 'company',
    facility_id: 'facility',
    primary_contact_id: 'contact',
    opportunity_id: 'opportunity',
    project_id: 'project',
  }

  function routeState() {
    const raw = (location.hash || '#overview').slice(1)
    const [viewPart, query = ''] = raw.split('?')
    const params = new URLSearchParams(query)
    return {
      view: viewPart || 'overview',
      detail: params.get('detail'),
      id: params.get('id'),
    }
  }

  function detailHash(parentView, kind, id) {
    return `#${encodeURIComponent(parentView)}?detail=${encodeURIComponent(kind)}&id=${encodeURIComponent(id)}`
  }

  function installInlineRelationLinks(parentView) {
    document.querySelectorAll('#dataRows tr').forEach((row) => {
      const cells = row.querySelectorAll('td')
      if (cells.length < 2) return
      const field = cells[0].textContent?.trim() || ''
      const kind = inlineRelationKinds[field]
      if (!kind) return
      const id = cells[1].textContent?.trim() || ''
      if (!id || id === '—') return
      const href = detailHash(parentView, kind, id)
      cells[1].innerHTML = ''
      const link = document.createElement('a')
      link.href = href
      link.className = 'panel-link'
      link.textContent = `${id} →`
      link.title = `${kind} detayını aç`
      cells[1].appendChild(link)
    })
  }

  load = async function routedLoad(view = currentView()) {
    const state = routeState()
    const parentView = view || state.view
    if (state.detail && state.id && state.view === parentView) {
      const result = await baseLoadDetail(state.detail, state.id, parentView)
      installInlineRelationLinks(parentView)
      return result
    }
    return baseLoad(parentView)
  }

  loadDetail = async function routedDetail(kind, id, parentView) {
    const target = detailHash(parentView, kind, id)
    if (location.hash !== target) {
      location.hash = target
      return
    }
    const result = await baseLoadDetail(kind, id, parentView)
    installInlineRelationLinks(parentView)
    return result
  }

  // The original detail renderer binds a list-back handler directly. Capture
  // the click first so Back always clears the detail route instead of
  // re-opening the same record through the persisted hash.
  document.addEventListener('click', (event) => {
    const back = event.target.closest?.('#detailBack')
    if (!back) return
    event.preventDefault()
    event.stopImmediatePropagation()
    const { view } = routeState()
    location.hash = `#${encodeURIComponent(view || 'overview')}`
  }, true)
})()
