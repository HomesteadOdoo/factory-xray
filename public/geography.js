(() => {
  const API='https://ycdrdcawvvspzilmzgjy.supabase.co/functions/v1/factory-dashboard-api';
  const AUTH_KEY='factory_xray_basic_auth';
  const regions={
    'Marmara':['Balıkesir','Bilecik','Bursa','Çanakkale','Edirne','İstanbul','Kırklareli','Kocaeli','Sakarya','Tekirdağ','Yalova'],
    'Ege':['Afyonkarahisar','Aydın','Denizli','İzmir','Kütahya','Manisa','Muğla','Uşak'],
    'Akdeniz':['Adana','Antalya','Burdur','Hatay','Isparta','Kahramanmaraş','Mersin','Osmaniye'],
    'İç Anadolu':['Aksaray','Ankara','Çankırı','Eskişehir','Karaman','Kayseri','Kırıkkale','Kırşehir','Konya','Nevşehir','Niğde','Sivas','Yozgat'],
    'Karadeniz':['Amasya','Artvin','Bartın','Bayburt','Bolu','Çorum','Düzce','Giresun','Gümüşhane','Karabük','Kastamonu','Ordu','Rize','Samsun','Sinop','Tokat','Trabzon','Zonguldak'],
    'Doğu Anadolu':['Ağrı','Ardahan','Bingöl','Bitlis','Elazığ','Erzincan','Erzurum','Hakkari','Iğdır','Kars','Malatya','Muş','Tunceli','Van'],
    'Güneydoğu Anadolu':['Adıyaman','Batman','Diyarbakır','Gaziantep','Kilis','Mardin','Siirt','Şanlıurfa','Şırnak']
  };
  const p2r=Object.fromEntries(Object.entries(regions).flatMap(([r,ps])=>ps.map(p=>[p,r])));
  const esc=(v='')=>String(v).replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  async function rows(){const auth=sessionStorage.getItem(AUTH_KEY);if(!auth)return[];const u=new URL(API);u.searchParams.set('view','facilities');const r=await fetch(u,{headers:{Authorization:`Basic ${auth}`},cache:'no-store'});if(!r.ok)throw new Error(`API ${r.status}`);return (await r.json()).rows||[]}
  const count=n=>Array.isArray(n)?n.length:Object.values(n).reduce((s,v)=>s+count(v),0);
  async function render(){
    if((location.hash||'#overview').slice(1).split('?')[0]!=='geography')return;
    const wrap=document.querySelector('#dataView .table-wrap'); if(!wrap)return;
    let panel=document.getElementById('fxGeoPanel'); if(!panel){panel=document.createElement('section');panel.id='fxGeoPanel';panel.className='geo-panel';wrap.parentNode.insertBefore(panel,wrap)}
    panel.innerHTML='<div class="geo-head"><strong>Bölge → İl → İlçe → OSB / Sanayi Bölgesi</strong><span>Canlı tesis kayıtları yükleniyor…</span></div>';
    try{
      const rs=await rows(),tree={};
      rs.forEach(x=>{const p=x.province||'İl bilgisi eksik',r=p2r[p]||'Bölge eşleşmemiş',d=x.district||'İlçe bilgisi eksik',o=x.osb||'OSB / bölge bilgisi eksik';tree[r]??={};tree[r][p]??={};tree[r][p][d]??={};tree[r][p][d][o]??=[];tree[r][p][d][o].push(x)});
      const html=Object.entries(tree).sort((a,b)=>count(b[1])-count(a[1])).map(([r,ps],i)=>`<details class="geo-region" ${i<2?'open':''}><summary><span>${esc(r)}</span><b>${count(ps)} tesis</b></summary>${Object.entries(ps).sort((a,b)=>count(b[1])-count(a[1])).map(([p,ds])=>`<details class="geo-province"><summary><span>${esc(p)}</span><b>${count(ds)}</b></summary>${Object.entries(ds).sort((a,b)=>count(b[1])-count(a[1])).map(([d,os])=>`<details class="geo-district"><summary><span>${esc(d)}</span><b>${count(os)}</b></summary>${Object.entries(os).sort((a,b)=>b[1].length-a[1].length).map(([o,fs])=>`<div class="geo-osb"><div class="geo-osb-title"><span>${esc(o)}</span><b>${fs.length}</b></div><div class="geo-facilities">${fs.map(f=>`<div><strong>${esc(f.name||'Tesis')}</strong><small>${esc(f.company||'—')}</small></div>`).join('')}</div></div>`).join('')}</details>`).join('')}</details>`).join('')}</details>`).join('');
      panel.innerHTML=`<div class="geo-head"><strong>Bölge → İl → İlçe → OSB / Sanayi Bölgesi</strong><span>${rs.length} tesis · ${Object.keys(tree).length} bölge</span></div><div class="geo-tree">${html||'<div class="empty">Coğrafi kayıt yok</div>'}</div>`;
    }catch(e){panel.innerHTML=`<div class="geo-error">Coğrafi hiyerarşi yüklenemedi: ${esc(e.message||e)}. İl bazlı özet aşağıda kullanılabilir.</div>`}
  }
  window.addEventListener('hashchange',()=>setTimeout(render,160));window.addEventListener('load',()=>setTimeout(render,180));
})();