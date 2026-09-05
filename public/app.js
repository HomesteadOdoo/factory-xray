const API_URL = 'https://ycdrdcawvvspzilmzgjy.supabase.co/functions/v1/factory-dashboard-api'
const AUTH_KEY = 'factory_xray_basic_auth'

const $ = (id) => document.getElementById(id)
const fmt = new Intl.NumberFormat('tr-TR')
const eur = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const dtFmt = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' })

const views = [
  ['overview','Genel Bakış','EXECUTIVE','Canlı KPI, coverage ve pipeline özeti'],
  ['companies','Şirketler','ACCOUNTS','Şirket listesi ve tesis yoğunluğu'],
  ['facilities','Tesisler','FACILITIES','Fiziksel tesis, ilçe, OSB ve araştırma durumu'],
  ['geography','Coğrafya','GEOGRAPHY','İl bazında şirket / tesis / ilçe / OSB kapsamı'],
  ['sectors','Sektörler','SECTORS','Sektör ve alt sektör tesis yoğunluğu'],
  ['map','Harita','MAP','Koordinatı doğrulanmış tesis kayıtları'],
  ['opportunities','Fırsatlar','SALES','Fırsat skoru, değer, stage ve next action'],
  ['pipeline','Pipeline','CRM','Stage bazlı satış pipeline görünümü'],
  ['contacts','Kontaklar','CONTACTS','Kritik ve önerilen karar vericiler'],
  ['activities','Aktiviteler','CRM','Arama, e-posta, LinkedIn, toplantı ve not geçmişi'],
  ['tasks','Görevler','NEXT ACTIONS','Açık, geciken ve tamamlanan aksiyonlar'],
  ['proposals','Teklifler','QUOTES','Teklif metadata ve değer görünümü'],
  ['projects','Projeler','PROJECTS','Proje ve milestone takibi'],
  ['signals','Sinyaller','INTELLIGENCE','Yatırım, retrofit ve proje sinyalleri'],
  ['evidence','Kanıt','EVIDENCE','FACT / INFERRED / AI_ESTIMATE kanıt kayıtları'],
  ['sources','Kaynaklar','SOURCES','Doğrulanmış kaynak ve güvenilirlik kayıtları'],
  ['ingest','Ingest','SYSTEM','Son veri toplama koşuları ve sonuçları'],
  ['quality','Veri Kalitesi','QUALITY','Eksik alan, confidence ve araştırma durumu'],
]

const tableConfig = {
  companies: [['display_name','Şirket'],['legal_name','Hukuki ad'],['facilities','Tesis'],['active_status','Durum'],['source_confidence','Güven'],['website','Web'],['updated_at','Güncelleme']],
  facilities: [['name','Tesis'],['company','Şirket'],['province','İl'],['district','İlçe'],['osb','OSB'],['facility_kind','Tip'],['operational_status','Durum'],['confidence_pct','Güven'],['last_researched_at','Son araştırma']],
  geography: [['province','İl'],['companies','Şirket'],['facilities','Tesis'],['districts','İlçe'],['osbs','OSB']],
  sectors: [['name','Sektör'],['companies','Şirket'],['facilities','Tesis']],
  map: [['name','Tesis'],['company','Şirket'],['province','İl'],['district','İlçe'],['osb','OSB'],['latitude','Lat'],['longitude','Lng'],['confidence_pct','Güven']],
  opportunities: [['company','Şirket'],['facility','Tesis'],['opportunity_type','Fırsat'],['solution_family','Çözüm'],['opportunity_score','Skor'],['confidence_pct','Güven'],['priority','Öncelik'],['stage','Aşama'],['estimated_value_eur','Değer'],['probability_pct','Olasılık'],['target_close_date','Hedef'],['next_action','Sonraki aksiyon']],
  pipeline: [['stage_order','Sıra'],['name','Aşama'],['opportunities','Fırsat'],['value_eur','Değer'],['weighted_value_eur','Ağırlıklı değer'],['default_probability','Varsayılan %']],
  contacts: [['full_name','Kontak'],['title','Unvan'],['company','Şirket'],['facility','Tesis'],['contact_class','Sınıf'],['role_category','Rol'],['confidence_pct','Güven'],['linkedin_url','LinkedIn'],['why_contact','Neden'],['outreach_angle','Giriş açısı'],['verified_at','Doğrulama']],
  activities: [['activity_at','Tarih'],['activity_type','Tip'],['company','Şirket'],['facility','Tesis'],['contact','Kontak'],['notes','Not'],['next_action','Sonraki aksiyon'],['next_action_at','Aksiyon tarihi']],
  tasks: [['title','Görev'],['status','Durum'],['priority','Öncelik'],['due_at','Termin'],['facility','Tesis'],['opportunity_type','Fırsat'],['completed_at','Tamamlanma']],
  proposals: [['quote_ref','Teklif'],['version','Versiyon'],['amount_eur','Tutar'],['status','Durum'],['valid_until','Geçerlilik'],['opportunity_type','Fırsat'],['project','Proje'],['sync_status','Sync'],['created_at','Oluşturma']],
  projects: [['name','Proje'],['company','Şirket'],['facility','Tesis'],['status','Durum'],['estimated_value_eur','Değer'],['target_start_date','Başlangıç'],['target_finish_date','Bitiş'],['milestones','Milestone'],['sync_status','Sync']],
  signals: [['signal_date','Tarih'],['company','Şirket'],['facility','Tesis'],['signal_type','Sinyal'],['title','Başlık'],['score','Skor'],['confidence_pct','Güven'],['source_url','Kaynak']],
  evidence: [['observed_at','Tarih'],['company','Şirket'],['facility','Tesis'],['evidence_type','Tip'],['evidence_status','Sınıf'],['confidence_pct','Güven'],['evidence_text','Kanıt'],['source_url','Kaynak']],
  sources: [['title','Başlık'],['publisher','Yayıncı'],['source_type','Tip'],['published_at','Yayın'],['checked_at','Kontrol'],['reliability_score','Güvenilirlik'],['url','URL']],
  ingest: [['run_started_at','Başlangıç'],['run_finished_at','Bitiş'],['scope','Kapsam'],['source_family','Kaynak ailesi'],['records_seen','Görülen'],['records_added','Eklenen'],['records_updated','Güncellenen'],['records_rejected','Reddedilen'],['notes','Not']],
  quality: [['name','Tesis'],['company','Şirket'],['province','İl'],['confidence_pct','Güven'],['research_status','Araştırma'],['last_researched_at','Son araştırma'],['missing_district','İlçe eksik'],['missing_osb','OSB eksik'],['missing_coordinates','Koordinat eksik']],
}

function escapeHtml(value = '') {
  return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')
}
function getAuth(){ return sessionStorage.getItem(AUTH_KEY) }
function saveAuth(user,pass){ sessionStorage.setItem(AUTH_KEY,btoa(`${user}:${pass}`)) }
function clearAuth(){ sessionStorage.removeItem(AUTH_KEY) }
function showLogin(show=true){ $('loginOverlay').classList.toggle('hidden',!show) }
function setStatus(message,type='info'){
  const el=$('statusBanner'); if(!message){el.className='status hidden';el.textContent='';return}
  el.className=`status ${type}`; el.textContent=message
}
function formatValue(key,value){
  if(value===null||value===undefined||value==='') return '—'
  if(key.includes('value_eur')||key==='amount_eur'||key==='estimated_value_eur') return eur.format(Number(value)||0)
  if(key.endsWith('_at')||key.includes('date')) { const d=new Date(value); return Number.isNaN(d.getTime())?escapeHtml(value):dtFmt.format(d) }
  if(typeof value==='boolean') return value?'Evet':'Hayır'
  if(key==='website'||key.endsWith('_url')) return `<a href="${escapeHtml(value)}" target="_blank" rel="noopener">Aç</a>`
  if(typeof value==='number') return fmt.format(value)
  return escapeHtml(value)
}

function buildNav(){
  $('nav').innerHTML=views.map(([key,label])=>`<a href="#${key}" data-view="${key}">${escapeHtml(label)}</a>`).join('')
}
function currentView(){ return (location.hash||'#overview').slice(1) }
function setActiveNav(view){ document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('active',a.dataset.view===view)) }

async function api(view='overview'){
  const auth=getAuth(); if(!auth) throw new Error('NO_AUTH')
  const url=view==='overview'?API_URL:`${API_URL}?view=${encodeURIComponent(view)}`
  const res=await fetch(url,{headers:{Authorization:`Basic ${auth}`},cache:'no-store'})
  if(res.status===401){clearAuth();showLogin(true);throw new Error('UNAUTHORIZED')}
  if(!res.ok) throw new Error(`API ${res.status}`)
  return res.json()
}

function renderBars(targetId,rows,valueKey){
  const root=$(targetId); if(!rows?.length){root.innerHTML='<div class="empty">Henüz veri yok</div>';return}
  const max=Math.max(...rows.map(r=>Number(r[valueKey]||0)),1)
  root.innerHTML=rows.map((r,i)=>{const value=Number(r[valueKey]||0);const pct=Math.max(3,(value/max)*100);return `<div class="bar-row"><div class="bar-rank">${String(i+1).padStart(2,'0')}</div><div class="bar-name">${escapeHtml(r.name||'—')}</div><div class="bar-track"><span style="width:${pct}%"></span></div><div class="bar-value">${fmt.format(value)}</div></div>`}).join('')
}

function renderOverview(data){
  const c=data.counts||{}
  ;['companies','facilities','opportunities','contacts','projects','sources','candidates'].forEach(k=>{if($(k))$(k).textContent=fmt.format(c[k]??0)})
  $('openTasks').textContent=fmt.format(c.open_tasks??0)
  $('overdueTasks').textContent=fmt.format(data.taskStats?.overdue_tasks??0)
  $('pipelineValue').textContent=eur.format(Number(data.pipeline?.total_value_eur||0))
  renderBars('provinceBars',data.provinces||[],'facilities')
  renderBars('sectorBars',data.sectors||[],'facilities')
  renderBars('stageBars',(data.stages||[]).map(x=>({...x,facilities:x.opportunities})),'facilities')
  const q=data.quality||{}
  $('qualityCards').innerHTML=[['Ort. güven',q.avg_confidence==null?'—':`${q.avg_confidence}%`],['İlçe eksik',q.missing_district||0],['OSB eksik',q.missing_osb||0],['Confidence eksik',q.missing_confidence||0]].map(([l,v])=>`<div class="queue-card"><span>${escapeHtml(l)}</span><strong>${escapeHtml(v)}</strong></div>`).join('')
  $('candidateMini').innerHTML=(data.recentCandidates||[]).slice(0,6).map(r=>`<div class="mini-row"><strong>${escapeHtml(r.name_guess||'—')}</strong><span>${escapeHtml(r.province||'—')} · ${r.relevance_score==null?'—':Number(r.relevance_score).toFixed(2)}</span></div>`).join('')||'<div class="empty">Yeni aday yok</div>'
  $('ingestMini').innerHTML=(data.ingest||[]).slice(-8).reverse().map(r=>`<div class="mini-row"><strong>+${fmt.format(r.added||0)} / Δ${fmt.format(r.updated||0)}</strong><span>${r.bucket?dtFmt.format(new Date(r.bucket)):'—'} · red ${fmt.format(r.rejected||0)}</span></div>`).join('')||'<div class="empty">Ingest kaydı yok</div>'
}

function renderTable(view,data){
  const meta=views.find(v=>v[0]===view)||[view,view.toUpperCase(),'DATA','']
  $('viewTag').textContent=meta[2]; $('viewTitle').textContent=meta[1]; $('viewSubtitle').textContent=meta[3]
  $('generatedAt').textContent=data.generatedAt?`Güncellendi: ${dtFmt.format(new Date(data.generatedAt))}`:''
  const cols=tableConfig[view]||[]
  $('dataHead').innerHTML=`<tr>${cols.map(([,label])=>`<th>${escapeHtml(label)}</th>`).join('')}</tr>`
  const rows=data.rows||[]
  $('dataRows').innerHTML=rows.length?rows.map(r=>`<tr>${cols.map(([key])=>`<td class="${['display_name','name','company','facility','full_name','title','quote_ref'].includes(key)?'strong':''}">${formatValue(key,r[key])}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${Math.max(cols.length,1)}" class="empty-cell">Henüz kayıt yok</td></tr>`
  const crmViews=['companies','facilities','opportunities']
  $('viewActions').innerHTML=crmViews.includes(view)?'<button class="ghost" disabled title="Güvenli write endpoint hazırlanıyor">+ Temas Ekle</button><button class="ghost" disabled>+ Fırsat Aç</button><button class="ghost" disabled>+ Proje Oluştur</button><button class="ghost" disabled>+ Teklif Kaydet</button><button class="ghost" disabled>+ Görev Ata</button>':''
}

async function load(view=currentView()){
  if(!views.some(v=>v[0]===view)){location.hash='#overview';return}
  if(!getAuth()){showLogin(true);return}
  setActiveNav(view); $('refreshBtn').disabled=true; $('refreshBtn').textContent='Yükleniyor…'; setStatus('Canlı veriler güncelleniyor…')
  try{
    const data=await api(view)
    if(view==='overview'){$('overviewView').classList.remove('hidden');$('dataView').classList.add('hidden');renderOverview(data)}
    else{$('overviewView').classList.add('hidden');$('dataView').classList.remove('hidden');renderTable(view,data)}
    showLogin(false); setStatus('')
  }catch(err){
    console.error(err); if(err.message!=='UNAUTHORIZED'&&err.message!=='NO_AUTH')setStatus('Dashboard verisi alınamadı. API veya bağlantı kontrol ediliyor.','error')
  }finally{$('refreshBtn').disabled=false;$('refreshBtn').textContent='Yenile'}
}

buildNav()
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();$('loginError').textContent='';saveAuth($('username').value.trim(),$('password').value);await load();if(getAuth())$('password').value='';else $('loginError').textContent='Kullanıcı adı veya şifre hatalı.'})
$('refreshBtn').addEventListener('click',()=>load())
$('logoutBtn').addEventListener('click',()=>{clearAuth();showLogin(true);$('password').value=''})
window.addEventListener('hashchange',()=>load())
if(getAuth())load();else showLogin(true)
setInterval(()=>{if(getAuth()&&document.visibilityState==='visible')load()},120000)
