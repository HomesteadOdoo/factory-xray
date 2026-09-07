// Persistent detail routing for GitHub Pages hash navigation.
// Keeps list/detail drill-downs reloadable without exposing private data in URLs.
(() => {
  if (typeof load !== 'function' || typeof loadDetail !== 'function' || typeof currentView !== 'function') return

  const baseLoad = load
  const baseLoadDetail = loadDetail

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

  load = async function routedLoad(view = currentView()) {
    const state = routeState()
    const parentView = view || state.view
    if (state.detail && state.id && state.view === parentView) {
      return baseLoadDetail(state.detail, state.id, parentView)
    }
    return baseLoad(parentView)
  }

  loadDetail = async function routedDetail(kind, id, parentView) {
    const target = detailHash(parentView, kind, id)
    if (location.hash !== target) {
      location.hash = target
      return
    }
    return baseLoadDetail(kind, id, parentView)
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
