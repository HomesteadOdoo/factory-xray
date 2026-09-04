const API_URL = 'https://ycdrdcawvvspzilmzgjy.supabase.co/functions/v1/factory-dashboard-api'
const AUTH_KEY = 'factory_xray_basic_auth'

const $ = (id) => document.getElementById(id)
const fmt = new Intl.NumberFormat('tr-TR')
const dtFmt = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' })

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function setStatus(message, type = 'info') {
  const el = $('statusBanner')
  if (!message) {
    el.className = 'status hidden'
    el.textContent = ''
    return
  }
  el.className = `status ${type}`
  el.textContent = message
}

function showLogin(show = true) {
  $('loginOverlay').classList.toggle('hidden', !show)
}

function getAuth() {
  return sessionStorage.getItem(AUTH_KEY)
}

function saveAuth(user, pass) {
  sessionStorage.setItem(AUTH_KEY, btoa(`${user}:${pass}`))
}

function clearAuth() {
  sessionStorage.removeItem(AUTH_KEY)
}

async function fetchData() {
  const auth = getAuth()
  if (!auth) {
    showLogin(true)
    return
  }

  $('refreshBtn').disabled = true
  $('refreshBtn').textContent = 'Yükleniyor…'
  setStatus('Canlı veriler güncelleniyor…')

  try {
    const res = await fetch(API_URL, {
      headers: { Authorization: `Basic ${auth}` },
      cache: 'no-store',
    })

    if (res.status === 401) {
      clearAuth()
      showLogin(true)
      setStatus('Oturum doğrulanamadı. Lütfen tekrar giriş yap.', 'error')
      return
    }

    if (!res.ok) throw new Error(`API ${res.status}`)
    const data = await res.json()
    render(data)
    showLogin(false)
    setStatus('')
  } catch (err) {
    console.error(err)
    setStatus('Dashboard verisi alınamadı. Birkaç saniye sonra tekrar deneyin.', 'error')
  } finally {
    $('refreshBtn').disabled = false
    $('refreshBtn').textContent = 'Yenile'
  }
}

function render(data) {
  const counts = data.counts || {}
  ;['companies','facilities','provinces','districts','osbs','sources','candidates','contacts','signals','opportunities']
    .forEach((key) => { $(key).textContent = fmt.format(counts[key] ?? 0) })

  $('generatedAt').textContent = data.generatedAt
    ? `Güncellendi: ${dtFmt.format(new Date(data.generatedAt))}`
    : ''

  renderBars('provinceBars', data.provinces || [], 'facilities')
  renderBars('sectorBars', data.sectors || [], 'facilities')
  renderQueue(data.queue || [])
  renderCoverage(data.osbCoverage || {})
  renderCandidates(data.recentCandidates || [])
  renderSources(data.recentSources || [])
  renderCron(data.cron || [])
}

function renderBars(targetId, rows, valueKey) {
  const root = $(targetId)
  if (!rows.length) {
    root.innerHTML = '<div class="empty">Henüz veri yok</div>'
    return
  }
  const max = Math.max(...rows.map(r => Number(r[valueKey] || 0)), 1)
  root.innerHTML = rows.map((r, i) => {
    const value = Number(r[valueKey] || 0)
    const pct = Math.max(3, (value / max) * 100)
    return `<div class="bar-row">
      <div class="bar-rank">${String(i + 1).padStart(2, '0')}</div>
      <div class="bar-name">${escapeHtml(r.name || '—')}</div>
      <div class="bar-track"><span style="width:${pct}%"></span></div>
      <div class="bar-value">${fmt.format(value)}</div>
    </div>`
  }).join('')
}

function renderQueue(rows) {
  const wanted = [
    ['tavily','queued','Tavily bekleyen'],
    ['tavily','done','Tavily tamamlanan'],
    ['firecrawl','queued','Firecrawl bekleyen'],
    ['firecrawl','done','Firecrawl tamamlanan'],
  ]
  const map = new Map(rows.map(r => [`${r.provider}:${r.status}`, r.count]))
  $('queueCards').innerHTML = wanted.map(([provider,status,label]) => `
    <div class="queue-card">
      <span>${escapeHtml(label)}</span>
      <strong>${fmt.format(map.get(`${provider}:${status}`) || 0)}</strong>
    </div>`).join('')
}

function renderCoverage(c) {
  const total = Number(c.total || 0)
  const items = [
    ['İlçe eşleşmesi', Number(c.with_district || 0)],
    ['Telefon', Number(c.with_phone || 0)],
    ['E-posta', Number(c.with_email || 0)],
    ['Web sitesi', Number(c.with_website || 0)],
  ]
  $('osbCoverage').innerHTML = items.map(([label,value]) => {
    const pct = total ? Math.round((value / total) * 100) : 0
    return `<div class="coverage-row"><span>${escapeHtml(label)}</span><b>${fmt.format(value)} / ${fmt.format(total)}</b><em>${pct}%</em></div>`
  }).join('')
}

function pillClass(type = '') {
  const t = type.toLowerCase()
  if (t.includes('oem')) return 'purple'
  if (t.includes('facility') || t.includes('plant')) return 'green'
  if (t.includes('signal') || t.includes('investment')) return 'amber'
  if (t.includes('contact')) return 'blue'
  return ''
}

function renderCandidates(rows) {
  $('candidateRows').innerHTML = rows.length ? rows.map(r => `
    <tr>
      <td><span class="pill ${pillClass(r.candidate_type)}">${escapeHtml(r.candidate_type || '—')}</span></td>
      <td class="strong">${escapeHtml(r.name_guess || '—')}</td>
      <td>${escapeHtml(r.province || '—')}</td>
      <td>${escapeHtml(r.query_group || '—')}</td>
      <td>${r.domain ? `<a href="https://${escapeHtml(r.domain)}" target="_blank" rel="noopener">${escapeHtml(r.domain)}</a>` : '—'}</td>
      <td>${r.relevance_score == null ? '—' : Number(r.relevance_score).toFixed(2)}</td>
    </tr>`).join('') : '<tr><td colspan="6" class="empty-cell">Henüz yeni aday yok</td></tr>'
}

function renderSources(rows) {
  $('sourceRows').innerHTML = rows.length ? rows.map(r => `
    <tr>
      <td class="strong">${r.url ? `<a href="${escapeHtml(r.url)}" target="_blank" rel="noopener">${escapeHtml(r.title || r.url)}</a>` : escapeHtml(r.title || '—')}</td>
      <td>${escapeHtml(r.publisher || '—')}</td>
      <td><span class="pill">${escapeHtml(r.source_type || '—')}</span></td>
      <td>${r.checked_at ? dtFmt.format(new Date(r.checked_at)) : '—'}</td>
    </tr>`).join('') : '<tr><td colspan="4" class="empty-cell">Henüz kaynak yok</td></tr>'
}

function renderCron(rows) {
  $('cronRows').innerHTML = rows.length ? rows.map(r => `
    <div class="cron-row">
      <span class="cron-dot ${r.active ? 'on' : ''}"></span>
      <strong>${escapeHtml(r.jobname)}</strong>
      <code>${escapeHtml(r.schedule)}</code>
      <span>${r.active ? 'aktif' : 'pasif'}</span>
    </div>`).join('') : '<div class="empty">Cron görevi bulunamadı</div>'
}

$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  $('loginError').textContent = ''
  const user = $('username').value.trim()
  const pass = $('password').value
  saveAuth(user, pass)
  await fetchData()
  if (getAuth()) $('password').value = ''
  else $('loginError').textContent = 'Kullanıcı adı veya şifre hatalı.'
})

$('refreshBtn').addEventListener('click', fetchData)
$('logoutBtn').addEventListener('click', () => {
  clearAuth()
  showLogin(true)
  $('password').value = ''
})

if (getAuth()) fetchData()
else showLogin(true)

setInterval(() => {
  if (getAuth() && document.visibilityState === 'visible') fetchData()
}, 120000)
