(() => {
  const MAP_VIEW = 'map'
  const API = 'https://ycdrdcawvvspzilmzgjy.supabase.co/functions/v1/factory-dashboard-api'
  const AUTH_KEY_NAME = 'factory_xray_basic_auth'
  let mapInstance = null
  let markerLayer = null
  let originalLoadDetail = null
  let routingDetail = false

  const esc=(v='')=>String(v).replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]))

  function parseRoute(){
    const raw=(location.hash||'#overview').slice(1)
    const [viewPart,query='']=raw.split('?')
    const params=new URLSearchParams(query)
    return {view:viewPart||'overview',detail:params.get('detail'),id:params.get('id')}
  }

  function detailHash(parentView,kind,id){
    return `#${encodeURIComponent(parentView||'overview')}?detail=${encodeURIComponent(kind)}&id=${encodeURIComponent(id)}`
  }

  function installDetailRouting(){
    if(originalLoadDetail || typeof window.loadDetail!=='function') return
    originalLoadDetail=window.loadDetail
    window.loadDetail=(kind,id,parentView='overview')=>{
      if(!kind||!id) return
      const next=detailHash(parentView,kind,id)
      if(location.hash===next){
        routingDetail=true
        Promise.resolve(originalLoadDetail(kind,id,parentView)).finally(()=>{routingDetail=false})
      }else{
        location.hash=next
      }
    }
  }

  function routeDetail(){
    installDetailRouting()
    const {view,detail,id}=parseRoute()
    if(!detail||!id||!originalLoadDetail||routingDetail) return
    routingDetail=true
    setTimeout(()=>{
      Promise.resolve(originalLoadDetail(detail,id,view)).finally(()=>{routingDetail=false})
    },90)
  }

  async function fetchView(view){
    const auth=sessionStorage.getItem(AUTH_KEY_NAME)
    if(!auth) return {rows:[]}
    const url=new URL(API); if(view!=='overview') url.searchParams.set('view',view)
    const res=await fetch(url,{headers:{Authorization:`Basic ${auth}`},cache:'no-store'})
    if(!res.ok) throw new Error(`API ${res.status}`)
    return res.json()
  }

  function ensurePanel(){
    const wrap = document.querySelector('#dataView .table-wrap')
    if(!wrap) return null
    let panel = document.getElementById('fxMapPanel')
    if(!panel){
      panel = document.createElement('section')
      panel.id = 'fxMapPanel'
      panel.className = 'map-panel hidden'
      panel.innerHTML = '<div class="map-toolbar"><strong>Türkiye Endüstriyel Tesis Haritası</strong><span id="fxMapMeta">Koordinatı doğrulanmış tesisler</span></div><div id="fxMap" class="fx-map"></div>'
      wrap.parentNode.insertBefore(panel, wrap)
    }
    return panel
  }

  async function getRows(){ return (await fetchView('map')).rows || [] }

  function hideMap(){
    const panel = document.getElementById('fxMapPanel')
    if(panel) panel.classList.add('hidden')
  }

  async function showMap(){
    const panel = ensurePanel(); if(!panel) return
    panel.classList.remove('hidden')
    const target = document.getElementById('fxMap')
    const meta = document.getElementById('fxMapMeta')
    if(!target) return
    if(typeof L === 'undefined'){
      target.innerHTML = '<div class="map-fallback">Harita kütüphanesi yüklenemedi. Altındaki koordinat tablosu kullanılabilir durumda.</div>'
      return
    }
    try{
      const rows = await getRows()
      const valid = rows.filter(r => Number.isFinite(Number(r.latitude)) && Number.isFinite(Number(r.longitude)))
      meta.textContent = `${valid.length} koordinatı doğrulanmış tesis`
      if(!mapInstance){
        mapInstance = L.map(target,{scrollWheelZoom:true}).setView([39.0,35.0],6)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; OpenStreetMap contributors'}).addTo(mapInstance)
        markerLayer = L.layerGroup().addTo(mapInstance)
      }
      markerLayer.clearLayers()
      const bounds=[]
      valid.forEach(r=>{
        const lat=Number(r.latitude), lng=Number(r.longitude)
        bounds.push([lat,lng])
        const title = esc(r.name || 'Tesis')
        const company = esc(r.company || '—')
        const place = [r.province,r.district,r.osb].filter(Boolean).join(' · ')
        const drill = r.id ? `<br><button type="button" class="ghost fx-map-open" data-id="${esc(r.id)}">Tesis detayını aç →</button>` : ''
        L.marker([lat,lng]).bindPopup(`<strong>${title}</strong><br>${company}<br>${esc(place || 'Konum doğrulandı')}<br>Güven: ${r.confidence_pct ?? '—'}${drill}`).addTo(markerLayer)
      })
      if(bounds.length) mapInstance.fitBounds(bounds,{padding:[20,20],maxZoom:9})
      setTimeout(()=>mapInstance.invalidateSize(),80)
    }catch(err){
      target.innerHTML = `<div class="map-fallback">Harita verisi yüklenemedi: ${esc(err.message || err)}. Altındaki tablo kullanılabilir durumda.</div>`
    }
  }

  function sync(){
    installDetailRouting()
    const {view}=parseRoute()
    if(view===MAP_VIEW) setTimeout(showMap,120)
    else hideMap()
    routeDetail()
  }

  document.addEventListener('click',e=>{
    const back=e.target.closest?.('#detailBack')
    if(back){
      const {view}=parseRoute()
      if(location.hash.includes('?detail=')) location.hash=`#${view}`
      return
    }
    const btn=e.target.closest?.('.fx-map-open')
    if(!btn) return
    const id=btn.dataset.id
    if(id && typeof window.loadDetail==='function'){
      window.loadDetail('facility',id,'map')
      mapInstance?.closePopup()
    }
  },true)
  window.addEventListener('hashchange',sync)
  window.addEventListener('load',sync)
  document.addEventListener('visibilitychange',()=>{if(!document.hidden) sync()})
  installDetailRouting()
})()