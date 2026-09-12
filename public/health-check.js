(() => {
  const API = 'https://ycdrdcawvvspzilmzgjy.supabase.co/functions/v1/factory-dashboard-api'
  const AUTH_KEY = 'factory_xray_basic_auth'
  const VIEWS = ['overview','companies','facilities','geography','sectors','map','opportunities','pipeline','contacts','activities','tasks','proposals','projects','signals','evidence','sources','coverage','ingest','quality','health']
  const DETAIL_VIEWS = [
    ['companies','company'],
    ['facilities','facility'],
    ['opportunities','opportunity'],
    ['contacts','contact'],
    ['projects','project'],
  ]
  let running = false

  const esc = (v='') => String(v).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]))

  function installStyle(){
    if(document.getElementById('fxHealthStyle')) return
    const style = document.createElement('style')
    style.id = 'fxHealthStyle'
    style.textContent = `
      .health-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:0 0 18px}
      .health-card{border:1px solid var(--line,#243344);border-radius:12px;padding:14px;background:rgba(255,255,255,.025)}
      .health-card span{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;opacity:.68;margin-bottom:7px}
      .health-card strong{font-size:20px}.health-card small{display:block;margin-top:6px;opacity:.65;line-height:1.35}
      .health-good strong{color:#7fe3af}.health-warn strong{color:#ffba6b}.health-bad strong{color:#ff7d7d}
      .health-routes{display:flex;flex-wrap:wrap;gap:7px;margin:0 0 18px}
      .health-chip{font-size:11px;padding:6px 8px;border-radius:999px;border:1px solid var(--line,#243344);background:rgba(255,255,255,.025)}
      .health-chip.good{border-color:rgba(127,227,175,.45)}.health-chip.warn{border-color:rgba(255,186,107,.5);color:#ffcf91}.health-chip.bad{border-color:rgba(255,125,125,.55);color:#ff9c9c}
      @media(max-width:900px){.health-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:560px){.health-grid{grid-template-columns:1fr}}
    `
    document.head.appendChild(style)
  }

  function currentView(){ return (location.hash || '#overview').slice(1).split('?')[0] }

  function mount(){
    const panel = document.querySelector('#dataView .panel.wide')
    const actions = document.getElementById('viewActions')
    if(!panel || !actions) return null
    let root = document.getElementById('fxHealthCheck')
    if(!root){
      root = document.createElement('section')
      root.id = 'fxHealthCheck'
      actions.insertAdjacentElement('afterend', root)
    }
    return root
  }

  async function requestJson(url, auth){
    const started = performance.now()
    const res = await fetch(url, {headers:{Authorization:`Basic ${auth}`}, cache:'no-store'})
    const elapsed = Math.round(performance.now() - started)
    let body = null
    try { body = await res.json() } catch {}
    return {res, body, elapsed}
  }

  async function requestView(view, auth){
    const url = new URL(API)
    if(view !== 'overview') url.searchParams.set('view', view)
    const {res, body, elapsed} = await requestJson(url, auth)
    return {
      view,
      ok: res.ok && body?.ok === true,
      status: res.status,
      elapsed,
      generatedAt: body?.generatedAt || null,
      healthRows: view === 'health' ? (body?.rows || []) : null,
    }
  }

  async function requestDetailSample(listView, kind, auth){
    const listUrl = new URL(API)
    listUrl.searchParams.set('view', listView)
    const list = await requestJson(listUrl, auth)
    if(!list.res.ok || list.body?.ok !== true) return {kind, ok:false, status:list.res.status, elapsed:list.elapsed, reason:'list_failed'}
    const id = list.body?.rows?.find(r => r?.id)?.id
    if(!id) return {kind, ok:true, skipped:true, status:list.res.status, elapsed:list.elapsed, reason:'no_sample'}

    const detailUrl = new URL(API)
    detailUrl.searchParams.set('detail', kind)
    detailUrl.searchParams.set('id', String(id))
    const detail = await requestJson(detailUrl, auth)
    return {
      kind,
      ok: detail.res.ok && detail.body?.ok === true && detail.body?.record?.id != null,
      status: detail.res.status,
      elapsed: list.elapsed + detail.elapsed,
      generatedAt: detail.body?.generatedAt || null,
    }
  }

  function ageMeta(timestamp){
    if(!timestamp) return {klass:'warn', ageHours:null, label:'Bilinmiyor', detail:'latest_update alınamadı'}
    const t = new Date(timestamp).getTime()
    if(Number.isNaN(t)) return {klass:'warn', ageHours:null, label:'Bilinmiyor', detail:String(timestamp)}
    const ageMs = Math.max(0, Date.now() - t)
    const ageHours = ageMs / 3600000
    const label = ageHours < 1 ? `${Math.max(1,Math.round(ageMs/60000))} dk` : ageHours < 48 ? `${Math.round(ageHours)} sa` : `${Math.round(ageHours/24)} gün`
    const klass = ageHours <= 24 ? 'good' : ageHours <= 72 ? 'warn' : 'bad'
    return {klass, ageHours, label, detail:new Date(t).toLocaleString('tr-TR')}
  }

  function freshnessSummary(rows){
    const populated = (rows || []).filter(r => Number(r?.records || 0) > 0)
    if(!populated.length) return {klass:'health-warn', label:'Bilinmiyor', detail:'Health bileşen kaydı yok', chips:[]}
    const chips = populated.map(row => ({row, meta:ageMeta(row.latest_update)}))
    const stale = chips.filter(x => x.meta.ageHours == null || x.meta.ageHours > 24)
    const critical = chips.filter(x => x.meta.ageHours == null || x.meta.ageHours > 72)
    const ranked = chips.filter(x => x.meta.ageHours != null).sort((a,b) => b.meta.ageHours - a.meta.ageHours)
    const worst = ranked[0]
    const klass = critical.length ? 'health-bad' : stale.length ? 'health-warn' : 'health-good'
    const label = critical.length ? `${critical.length} kritik` : stale.length ? `${stale.length} stale` : 'Tümü güncel'
    const detail = worst
      ? `En eski: ${worst.row.component} · ${worst.meta.label} (${worst.meta.detail})`
      : 'Güncelleme zamanı alınamadı'
    return {klass, label, detail, chips}
  }

  async function run(){
    if(currentView() !== 'health' || running) return
    const auth = sessionStorage.getItem(AUTH_KEY)
    const root = mount()
    if(!root) return
    installStyle()
    if(!auth){ root.innerHTML = '<div class="health-card health-warn"><strong>Giriş gerekli</strong><small>Health self-test authenticated API erişimi gerektirir.</small></div>'; return }

    running = true
    root.innerHTML = '<div class="health-card"><strong>Kontrol ediliyor…</strong><small>Tüm dashboard API view ve detay route’ları uçtan uca test ediliyor.</small></div>'
    try{
      const results = []
      for(const view of VIEWS){
        try { results.push(await requestView(view, auth)) }
        catch(e){ results.push({view,ok:false,status:0,elapsed:0,error:e?.message || String(e)}) }
      }

      const details = []
      for(const [listView, kind] of DETAIL_VIEWS){
        try { details.push(await requestDetailSample(listView, kind, auth)) }
        catch(e){ details.push({kind,ok:false,status:0,elapsed:0,error:e?.message || String(e)}) }
      }

      let build = '—'
      let assetOk = false
      try{
        const r = await fetch('./build-version.txt', {cache:'no-store'})
        assetOk = r.ok
        if(r.ok) build = (await r.text()).trim().split('\n')[0] || 'ok'
      }catch{}

      const failed = results.filter(r => !r.ok)
      const failedDetails = details.filter(r => !r.ok)
      const testedDetails = details.filter(r => !r.skipped)
      const allTimings = [...results, ...testedDetails]
      const avg = allTimings.length ? Math.round(allTimings.reduce((a,r)=>a+(r.elapsed||0),0)/allTimings.length) : 0
      const healthRows = results.find(r => r.view === 'health')?.healthRows || []
      const freshness = freshnessSummary(healthRows)
      const statusClass = failed.length ? 'health-bad' : 'health-good'
      const detailClass = failedDetails.length ? 'health-bad' : (testedDetails.length === DETAIL_VIEWS.length ? 'health-good' : 'health-warn')
      root.innerHTML = `
        <div class="health-grid">
          <div class="health-card ${statusClass}"><span>API route sağlığı</span><strong>${failed.length ? `${failed.length} hata` : '20/20 OK'}</strong><small>${failed.length ? 'Kırık endpoint aşağıda işaretli' : 'Tüm kayıtlı dashboard view’ları cevap veriyor'}</small></div>
          <div class="health-card ${detailClass}"><span>Detay drill-down</span><strong>${failedDetails.length ? `${failedDetails.length} hata` : `${testedDetails.length}/5 OK`}</strong><small>${testedDetails.length === DETAIL_VIEWS.length ? 'Company / facility / opportunity / contact / project detayları çalışıyor' : 'Kayıtsız detail tipi varsa atlandı'}</small></div>
          <div class="health-card ${assetOk?'health-good':'health-bad'}"><span>Frontend asset</span><strong>${assetOk?'OK':'Hata'}</strong><small>${esc(build)}</small></div>
          <div class="health-card"><span>Ort. API gecikmesi</span><strong>${avg} ms</strong><small>Tarayıcıdan Edge Function round-trip</small></div>
          <div class="health-card ${freshness.klass}"><span>Veri freshness</span><strong>${esc(freshness.label)}</strong><small>${esc(freshness.detail)}</small></div>
        </div>
        <div class="health-routes">${results.map(r=>`<span class="health-chip ${r.ok?'good':'bad'}" title="HTTP ${r.status}${r.error?` · ${esc(r.error)}`:''}">${esc(r.view)} · ${r.ok?'OK':`HTTP ${r.status||'ERR'}`}</span>`).join('')}</div>
        <div class="health-routes">${details.map(r=>`<span class="health-chip ${r.ok?(r.skipped?'warn':'good'):'bad'}" title="${r.skipped?'Örnek kayıt yok':`HTTP ${r.status}${r.error?` · ${esc(r.error)}`:''}`}">${esc(r.kind)} detail · ${r.ok?(r.skipped?'SKIP':'OK'):`HTTP ${r.status||'ERR'}`}</span>`).join('')}</div>
        <div class="health-routes">${freshness.chips.map(({row,meta})=>`<span class="health-chip ${meta.klass}" title="${esc(row.component)} · ${esc(meta.detail)}">${esc(row.component)} · ${esc(meta.label)}</span>`).join('')}</div>`
    } finally { running = false }
  }

  function sync(){
    const old = document.getElementById('fxHealthCheck')
    if(currentView() !== 'health'){ if(old) old.remove(); return }
    setTimeout(run, 260)
  }

  window.addEventListener('hashchange', sync)
  window.addEventListener('load', sync)
  document.getElementById('refreshBtn')?.addEventListener('click', () => setTimeout(run, 500))
})()
