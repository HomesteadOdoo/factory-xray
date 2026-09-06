(() => {
  const MAP_VIEW = 'map'
  const API = 'https://ycdrdcawvvspzilmzgjy.supabase.co/functions/v1/factory-dashboard-api'
  const AUTH_KEY_NAME = 'factory_xray_basic_auth'
  let mapInstance = null
  let markerLayer = null

  const esc=(v='')=>String(v).replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[s]))
  const fmtValue=(k,v)=>{
    if(v===null||v===undefined||v==='') return '—'
    if(k==='linkedin_url'||k==='source_url'||k==='website') return `<a href="${esc(v)}" target="_blank" rel="noopener">Aç</a>`
    if(k.endsWith('_at')||k.includes('date')) { const d=new Date(v); return Number.isNaN(d.getTime())?esc(v):new Intl.DateTimeFormat('tr-TR',{dateStyle:'short',timeStyle:'short'}).format(d) }
    if(k.includes('value_eur')||k==='amount_eur') return new Intl.NumberFormat('tr-TR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(v)||0)
    return esc(v)
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
        L.marker([lat,lng]).bindPopup(`<strong>${title}</strong><br>${company}<br>${esc(place || 'Konum doğrulandı')}<br>Güven: ${r.confidence_pct ?? '—'}`).addTo(markerLayer)
      })
      if(bounds.length) mapInstance.fitBounds(bounds,{padding:[20,20],maxZoom:9})
      setTimeout(()=>mapInstance.invalidateSize(),80)
    }catch(err){
      target.innerHTML = `<div class="map-fallback">Harita verisi yüklenemedi: ${esc(err.message || err)}. Altındaki tablo kullanılabilir durumda.</div>`
    }
  }

  function relatedSection(title,rows){
    if(!rows?.length) return `<section class="detail-section"><h3>${esc(title)}</h3><div class="empty">Kayıt yok</div></section>`
    const keys=Object.keys(rows[0]).filter(k=>k!=='id').slice(0,8)
    return `<section class="detail-section"><h3>${esc(title)}</h3><div class="table-wrap"><table><thead><tr>${keys.map(k=>`<th>${esc(k)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${keys.map(k=>`<td>${fmtValue(k,r[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`
  }

  function returnToList(parentView){
    const target = `#${parentView}`
    if(location.hash === target){
      history.replaceState(null,'','#overview')
      location.hash = target
      return
    }
    location.hash = target
  }

  async function showClientDetail(kind,row,parentView){
    document.getElementById('overviewView')?.classList.add('hidden')
    document.getElementById('dataView')?.classList.remove('hidden')
    const tag=document.getElementById('viewTag'), title=document.getElementById('viewTitle'), subtitle=document.getElementById('viewSubtitle'), head=document.getElementById('dataHead'), body=document.getElementById('dataRows'), actions=document.getElementById('viewActions')
    if(tag) tag.textContent='DETAIL'
    if(title) title.textContent=kind==='contact'?(row.full_name||'Kontak'):(row.name||'Proje')
    if(subtitle) subtitle.textContent=`${kind.toUpperCase()} · ilişkili kayıtlar`
    const entries=Object.entries(row).filter(([k])=>k!=='id')
    if(head) head.innerHTML='<tr><th>Alan</th><th>Değer</th></tr>'
    if(body) body.innerHTML=entries.map(([k,v])=>`<tr><td class="strong">${esc(k)}</td><td>${fmtValue(k,v)}</td></tr>`).join('')
    let related=''
    try{
      if(kind==='contact'){
        const acts=(await fetchView('activities')).rows||[]
        related=relatedSection('Aktiviteler',acts.filter(a=>a.contact===row.full_name))
      } else {
        const props=(await fetchView('proposals')).rows||[]
        related=relatedSection('Teklifler',props.filter(p=>p.project===row.name))
      }
    }catch(err){ related=`<section class="detail-section"><h3>İlişkili kayıtlar</h3><div class="empty">İlişkili veri alınamadı: ${esc(err.message||err)}</div></section>` }
    if(actions){
      actions.innerHTML=`<button id="fxClientBack" class="ghost">← Listeye dön</button><button class="ghost" disabled title="Güvenli authenticated write endpoint hazırlanıyor">+ Temas Ekle</button><button class="ghost" disabled>+ Fırsat Aç</button><button class="ghost" disabled>+ Proje Oluştur</button><button class="ghost" disabled>+ Teklif Kaydet</button><button class="ghost" disabled>+ Görev Ata</button>${related}`
      document.getElementById('fxClientBack')?.addEventListener('click',()=>returnToList(parentView))
    }
  }

  async function attachClientDrill(view){
    if(!['contacts','projects'].includes(view)) return
    try{
      const rows=(await fetchView(view)).rows||[]
      const trs=[...document.querySelectorAll('#dataRows tr')].filter(tr=>!tr.querySelector('.empty-cell'))
      trs.forEach((tr,i)=>{
        const row=rows[i]; if(!row?.id||tr.dataset.fxEnhanced) return
        tr.classList.add('drill-row'); tr.title='Detayı aç'; tr.dataset.fxEnhanced='1'
        tr.addEventListener('click',e=>{ if(e.target.closest('a,button')) return; showClientDetail(view==='contacts'?'contact':'project',row,view) })
      })
    }catch(err){ console.warn('Factory X-Ray drill enhancement failed',err) }
  }

  function sync(){
    const view=(location.hash||'#overview').slice(1).split('?')[0]
    if(view===MAP_VIEW) setTimeout(showMap,120)
    else hideMap()
    if(['contacts','projects'].includes(view)) setTimeout(()=>attachClientDrill(view),220)
  }

  window.addEventListener('hashchange',sync)
  window.addEventListener('load',sync)
  document.addEventListener('visibilitychange',()=>{if(!document.hidden) sync()})
})()
