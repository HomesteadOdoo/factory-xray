(() => {
  const API='https://ycdrdcawvvspzilmzgjy.supabase.co/functions/v1/factory-dashboard-api'
  const AUTH_KEY='factory_xray_basic_auth'
  const fmt=new Intl.NumberFormat('tr-TR')

  function ensureCards(){
    const grid=document.querySelector('#overviewView .hero-grid')
    if(!grid) return
    const defs=[
      ['highScore','Yüksek Skor','70+ opportunity score'],
      ['untouched7d','7+ Gün Sessiz','temas/güncelleme bekleyen fırsat'],
      ['winRate','Win Rate','kazanılan / kapanan fırsat']
    ]
    defs.forEach(([id,label,small])=>{
      if(document.getElementById(id)) return
      const card=document.createElement('article')
      card.className='hero-card'
      card.innerHTML=`<span>${label}</span><strong id="${id}">—</strong><small>${small}</small>`
      grid.appendChild(card)
    })
  }

  async function refresh(){
    ensureCards()
    const auth=sessionStorage.getItem(AUTH_KEY)
    if(!auth) return
    try{
      const res=await fetch(API,{headers:{Authorization:`Basic ${auth}`},cache:'no-store'})
      if(!res.ok) return
      const data=await res.json()
      const high=Number(data.pipeline?.high_score||0)
      const stale=Number(data.pipeline?.untouched_7d||0)
      document.getElementById('highScore').textContent=fmt.format(high)
      document.getElementById('untouched7d').textContent=fmt.format(stale)
      const stages=Array.isArray(data.stages)?data.stages:[]
      let won=0,lost=0
      stages.forEach(s=>{
        const name=String(s.name||'').toLocaleLowerCase('tr-TR')
        const n=Number(s.opportunities||0)
        if(/kazan|won/.test(name)) won+=n
        if(/kaybed|lost/.test(name)) lost+=n
      })
      const closed=won+lost
      document.getElementById('winRate').textContent=closed?`%${Math.round((won/closed)*100)}`:'—'
    }catch(err){ console.warn('Executive KPI enrichment skipped',err) }
  }

  window.addEventListener('load',()=>setTimeout(refresh,180))
  window.addEventListener('hashchange',()=>{if((location.hash||'#overview').startsWith('#overview'))setTimeout(refresh,120)})
  document.addEventListener('click',e=>{if(e.target.closest?.('#refreshBtn'))setTimeout(refresh,250)})
  document.addEventListener('submit',e=>{if(e.target?.id==='loginForm')setTimeout(refresh,500)})
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&((location.hash||'#overview').startsWith('#overview')))refresh()})
  ensureCards()
})()
