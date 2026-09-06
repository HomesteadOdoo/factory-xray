(() => {
  const MAP_VIEW = 'map'
  const API = 'https://ycdrdcawvvspzilmzgjy.supabase.co/functions/v1/factory-dashboard-api'
  const AUTH_KEY_NAME = 'factory_xray_basic_auth'
  let mapInstance = null
  let markerLayer = null

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

  async function getRows(){
    const auth = sessionStorage.getItem(AUTH_KEY_NAME)
    if(!auth) return []
    const url = new URL(API)
    url.searchParams.set('view','map')
    const res = await fetch(url,{headers:{Authorization:`Basic ${auth}`},cache:'no-store'})
    if(!res.ok) throw new Error(`API ${res.status}`)
    const data = await res.json()
    return data.rows || []
  }

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
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
          maxZoom:18,
          attribution:'&copy; OpenStreetMap contributors'
        }).addTo(mapInstance)
        markerLayer = L.layerGroup().addTo(mapInstance)
      }
      markerLayer.clearLayers()
      const bounds=[]
      valid.forEach(r=>{
        const lat=Number(r.latitude), lng=Number(r.longitude)
        bounds.push([lat,lng])
        const title = String(r.name || 'Tesis').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]))
        const company = String(r.company || '—').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]))
        const place = [r.province,r.district,r.osb].filter(Boolean).join(' · ')
        L.marker([lat,lng]).bindPopup(`<strong>${title}</strong><br>${company}<br>${place || 'Konum doğrulandı'}<br>Güven: ${r.confidence_pct ?? '—'}`).addTo(markerLayer)
      })
      if(bounds.length) mapInstance.fitBounds(bounds,{padding:[20,20],maxZoom:9})
      setTimeout(()=>mapInstance.invalidateSize(),80)
    }catch(err){
      target.innerHTML = `<div class="map-fallback">Harita verisi yüklenemedi: ${String(err.message || err)}. Altındaki tablo kullanılabilir durumda.</div>`
    }
  }

  function sync(){
    const view=(location.hash||'#overview').slice(1).split('?')[0]
    if(view===MAP_VIEW) setTimeout(showMap,120)
    else hideMap()
  }

  window.addEventListener('hashchange',sync)
  window.addEventListener('load',sync)
  document.addEventListener('visibilitychange',()=>{if(!document.hidden) sync()})
})()
