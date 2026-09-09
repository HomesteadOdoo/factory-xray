(() => {
  const API='https://ycdrdcawvvspzilmzgjy.supabase.co/functions/v1/factory-dashboard-api';
  const AUTH_KEY='factory_xray_basic_auth';
  const esc=(v='')=>String(v).replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  const fmt=new Intl.NumberFormat('tr-TR');

  function installStyle(){
    if(document.getElementById('fxSystemInsightsStyle')) return;
    const s=document.createElement('style'); s.id='fxSystemInsightsStyle';
    s.textContent=`
      .system-insights{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:0 0 18px}
      .system-insight{border:1px solid var(--line,#243344);border-radius:12px;padding:14px;background:rgba(255,255,255,.025)}
      .system-insight span{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;opacity:.68;margin-bottom:7px}
      .system-insight strong{font-size:22px;line-height:1.05}.system-insight small{display:block;margin-top:6px;opacity:.62}
      .system-insight.warn strong{color:#ffba6b}.system-insight.good strong{color:#7fe3af}
      @media(max-width:900px){.system-insights{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:560px){.system-insights{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  async function fetchView(view='overview'){
    const auth=sessionStorage.getItem(AUTH_KEY); if(!auth) return null;
    const url=new URL(API);
    if(view!=='overview') url.searchParams.set('view',view);
    const r=await fetch(url,{headers:{Authorization:`Basic ${auth}`},cache:'no-store'});
    if(!r.ok) throw new Error(`API ${r.status}`);
    return r.json();
  }

  function mount(html){
    const panel=document.querySelector('#dataView .panel.wide');
    const actions=document.getElementById('viewActions');
    if(!panel||!actions) return;
    let root=document.getElementById('fxSystemInsights');
    if(!root){root=document.createElement('section');root.id='fxSystemInsights';root.className='system-insights';actions.insertAdjacentElement('afterend',root)}
    root.innerHTML=html;
  }

  async function render(){
    const view=(location.hash||'#overview').slice(1).split('?')[0];
    const old=document.getElementById('fxSystemInsights');
    if(!['ingest','quality'].includes(view)){if(old)old.remove();return}
    installStyle();
    try{
      const d=await fetchView(); if(!d) return;
      if(view==='ingest'){
        const now=Date.now(), rows=d.ingest||[];
        const sum=(hours,key)=>rows.filter(x=>x.bucket&&now-new Date(x.bucket).getTime()<=hours*3600000).reduce((a,x)=>a+Number(x[key]||0),0);
        const a24=sum(24,'added'),u24=sum(24,'updated'),r24=sum(24,'rejected');
        const a7=sum(168,'added'),u7=sum(168,'updated'),r7=sum(168,'rejected');
        const latestMs=rows.reduce((m,x)=>x.bucket?Math.max(m,new Date(x.bucket).getTime()||0):m,0);
        const freshnessHours=latestMs?Math.max(0,(now-latestMs)/3600000):null;
        const freshnessText=freshnessHours==null?'Yok':freshnessHours<1?`${Math.max(1,Math.round(freshnessHours*60))} dk`:`${freshnessHours.toFixed(1)} sa`;
        const freshnessWarn=freshnessHours==null||freshnessHours>2;
        mount(`
          <div class="system-insight ${freshnessWarn?'warn':'good'}"><span>Veri tazeliği</span><strong>${esc(freshnessText)}</strong><small>${freshnessWarn?'Son ingest 2 saati aştı':'Saatlik ingest akışı güncel'}</small></div>
          <div class="system-insight good"><span>Son 24 saat · eklenen</span><strong>+${fmt.format(a24)}</strong><small>${fmt.format(u24)} güncelleme</small></div>
          <div class="system-insight ${r24?'warn':''}"><span>Son 24 saat · reddedilen</span><strong>${fmt.format(r24)}</strong><small>ingest kalite kontrolü</small></div>
          <div class="system-insight good"><span>Son 7 gün · eklenen</span><strong>+${fmt.format(a7)}</strong><small>${fmt.format(u7)} güncelleme</small></div>
          <div class="system-insight ${r7?'warn':''}"><span>Son 7 gün · reddedilen</span><strong>${fmt.format(r7)}</strong><small>${rows.length} saatlik bucket</small></div>`);
      } else {
        const q=d.quality||{}, total=Number(q.total||0);
        const pct=(n)=>total?`${((Number(n||0)/total)*100).toFixed(1)}%`:'—';
        const evidence=await fetchView('evidence');
        const erows=evidence?.rows||[];
        const classes=erows.reduce((acc,row)=>{
          const key=String(row.evidence_status||'UNCLASSIFIED').trim().toUpperCase();
          acc[key]=(acc[key]||0)+1;
          return acc;
        },{});
        const fact=classes.FACT||0;
        const inferred=classes.INFERRED||0;
        const ai=classes.AI_ESTIMATE||0;
        const classified=fact+inferred+ai;
        const other=Math.max(0,erows.length-classified);
        mount(`
          <div class="system-insight good"><span>Ortalama confidence</span><strong>${q.avg_confidence==null?'—':esc(q.avg_confidence)+'%'}</strong><small>${fmt.format(total)} tesis</small></div>
          <div class="system-insight ${q.missing_district?'warn':''}"><span>İlçe eksik</span><strong>${fmt.format(q.missing_district||0)}</strong><small>${pct(q.missing_district)} tesis</small></div>
          <div class="system-insight ${q.missing_osb?'warn':''}"><span>OSB / bölge eksik</span><strong>${fmt.format(q.missing_osb||0)}</strong><small>${pct(q.missing_osb)} tesis</small></div>
          <div class="system-insight ${q.missing_confidence?'warn':''}"><span>Confidence eksik</span><strong>${fmt.format(q.missing_confidence||0)}</strong><small>${pct(q.missing_confidence)} tesis</small></div>
          <div class="system-insight good"><span>FACT kanıt</span><strong>${fmt.format(fact)}</strong><small>doğrulanmış olgu</small></div>
          <div class="system-insight"><span>INFERRED kanıt</span><strong>${fmt.format(inferred)}</strong><small>çıkarımsal kayıt</small></div>
          <div class="system-insight"><span>AI_ESTIMATE</span><strong>${fmt.format(ai)}</strong><small>AI tahmini</small></div>
          <div class="system-insight ${other?'warn':''}"><span>Sınıflanmamış / diğer</span><strong>${fmt.format(other)}</strong><small>${fmt.format(erows.length)} evidence içinde</small></div>`);
      }
    }catch(e){
      mount(`<div class="system-insight warn"><span>Özet durumu</span><strong>Veri alınamadı</strong><small>${esc(e.message||e)}</small></div>`);
    }
  }
  window.addEventListener('hashchange',()=>setTimeout(render,240));
  window.addEventListener('load',()=>setTimeout(render,280));
  document.getElementById('refreshBtn')?.addEventListener('click',()=>setTimeout(render,500));
})();
