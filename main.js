const DATA_URL = 'civil-work-backup-2026-05-25.json';
const STORE_KEY = 'civil-workmgr-data-v2';
const SETTINGS_KEY = 'civil-workmgr-settings-v1';
const routes = [
  ['/', '대시보드', '▦'], ['/todos', '해야 할 일', '☑'], ['/chatbot', 'AI 어시스턴트', '◇'],
  ['/projects', '공사관리', '□'], ['/complaints', '민원관리', '!'], ['/consultations', '협의관리', '↔'],
  ['/budgets', '예산관리', '₩'], ['/executions', '집행관리', '↧'], ['/schedules', '일정관리', '○'],
  ['/files', '자료실', '▤'], ['/contacts', '업체/연락처', '☎'], ['/backup', '백업 / 복구', '⇅'],
  ['/tips', '사용팁', 'ⓘ'], ['/settings', '설정', '⚙']
];
let data = null;
let route = location.hash.replace('#', '') || '/';
let selectedProject = null;
let currentMonth = new Date(2026, 4, 1);
let settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{"adminName":"관리자","density":"comfortable","theme":"light"}');
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const view = $('#view');
const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const money = (n) => new Intl.NumberFormat('ko-KR').format(Number(n || 0)) + '원';
const date = (v) => { if (!v) return '-'; const d = new Date(v); return Number.isNaN(d.getTime()) ? v : new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(d); };
const iso = (v) => v ? String(v).slice(0, 10) : '';
const today = () => new Date().toISOString().slice(0, 10);
const pct = (n) => Math.max(0, Math.min(100, Number(n || 0)));
const pill = (t, c = 'gray') => `<span class="pill ${c}">${esc(t || '-')}</span>`;
const statusColor = (s) => ['준공', '완료', '회신완료', '지출'].includes(s) ? 'green' : ['진행중', '접수', '검토중'].includes(s) ? 'orange' : ['처리중'].includes(s) ? 'blue' : 'gray';
const projectName = (id) => data.projects.find((p) => p.id === Number(id))?.name || '선택 안함';
const budgetName = (id) => data.budgets.find((b) => b.id === Number(id))?.name || '선택 안함';
const arr = (name) => data[name] || (data[name] = []);
const nullableNumber = (value) => value === '' || value === null || value === undefined || value === 'null' ? null : Number(value);
const dayMs = 24 * 60 * 60 * 1000;
const dateValue = (v) => { const d = new Date(iso(v)); return Number.isNaN(d.getTime()) ? null : d; };
const daysFromToday = (v) => { const d = dateValue(v); if (!d) return null; const now = dateValue(today()); return Math.round((d - now) / dayMs); };
const shortMoney = (n) => {
  const v = Number(n || 0);
  if (Math.abs(v) >= 100000000) return `${Math.round(v / 10000000) / 10}억`;
  if (Math.abs(v) >= 10000) return `${Math.round(v / 1000) / 10}만`;
  return new Intl.NumberFormat('ko-KR').format(v);
};
const projectStatuses = ['진행중', '준공', '보류', '예정', '중지'];
const projectBudgetIds = (p = {}) => [...new Set([p.budgetId, ...(Array.isArray(p.budgetIds) ? p.budgetIds : [])].map(nullableNumber).filter((id) => id !== null))];
const projectBudgetNames = (p = {}) => {
  const names = projectBudgetIds(p).map(budgetName).filter((name) => name !== '선택 안함');
  return names.length ? names.join(', ') : '선택 안함';
};
const isDelayedProject = (p) => p.status === '진행중' && pct(p.actualProgress) < 100 && daysFromToday(p.endDate) !== null && daysFromToday(p.endDate) < 0;
const relatedProjectIds = (projectId) => [...new Set(arr('linkedProjects')
  .filter((x) => x.projectId === projectId || x.linkedProjectId === projectId)
  .map((x) => x.projectId === projectId ? x.linkedProjectId : x.projectId))];
const projectLink = (id) => Number(id) ? `<button class="inline-route" data-project="${Number(id)}">${esc(projectName(id))}</button>` : '<span class="muted">-</span>';
function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); applySettings(); }
function applySettings() { document.body.classList.toggle('compact', settings.density === 'compact'); document.body.classList.toggle('dark', settings.theme === 'dark'); const label = document.querySelector('.brand-copy span'); if (label) label.textContent = settings.adminName || '관리자'; }
function save() { localStorage.setItem(STORE_KEY, JSON.stringify(data)); renderNav(); }
function nextId(name) { return Math.max(0, ...arr(name).map((x) => Number(x.id) || 0)) + 1; }
function removeById(name, id) {
  id = Number(id);
  if (name === 'projects') {
    data.projectCompanies = arr('projectCompanies').filter((x) => x.projectId !== id);
    data.projectMemos = arr('projectMemos').filter((x) => x.projectId !== id);
    data.linkedProjects = arr('linkedProjects').filter((x) => x.projectId !== id && x.linkedProjectId !== id);
    ['files', 'complaints', 'consultations', 'executions', 'schedules'].forEach((type) => {
      arr(type).forEach((x) => { if (x.projectId === id) x.projectId = null; });
    });
  }
  if (name === 'budgets') {
    data.budgetParts = arr('budgetParts').filter((x) => x.budgetId !== id);
    data.executions = arr('executions').filter((x) => x.budgetId !== id);
  }
  if (name === 'todoCards') {
    const sectionIds = arr('todoSections').filter((x) => x.cardId === id).map((x) => x.id);
    data.todoSections = arr('todoSections').filter((x) => x.cardId !== id);
    data.todoItems = arr('todoItems').filter((x) => !sectionIds.includes(x.sectionId));
  }
  if (name === 'todoSections') data.todoItems = arr('todoItems').filter((x) => x.sectionId !== id);
  if (name === 'todoItems') data.todoItems = arr('todoItems').filter((x) => x.id !== id && x.parentId !== id);
  data[name] = arr(name).filter((x) => x.id !== id);
  save(); render();
}
function pageHead(title, sub = '', button = '') { return `<div class="page-head"><div class="page-title"><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div><div class="head-actions">${button}</div></div>`; }
function setRoute(next) { route = next; location.hash = next; renderNav(); render(); }
function goProject(id) { selectedProject = Number(id); setRoute('/projects'); }
function bindRouteLinks(root = document) {
  $$('[data-go]', root).forEach((b) => b.onclick = () => setRoute(b.dataset.go));
  $$('[data-project]', root).forEach((b) => b.onclick = () => goProject(b.dataset.project));
}
function renderNav() {
  const dueComplaints = arr('complaints').filter((x) => x.processStatus !== '완료').length;
  const dueConsult = arr('consultations').filter((x) => x.status !== '회신완료').length;
  const groups = [
    ['업무 포탈', ['/', '/todos', '/projects']],
    ['대외 대응', ['/complaints', '/consultations', '/schedules']],
    ['재정·자료', ['/budgets', '/executions', '/files', '/contacts']],
    ['운영', ['/chatbot', '/backup', '/tips', '/settings']]
  ];
  const byPath = new Map(routes.map((item) => [item[0], item]));
  $('#nav').innerHTML = groups.map(([group, paths]) => `<div class="nav-group"><div class="nav-group-title">${group}</div>${paths.map((path) => {
    const [, label, icon] = byPath.get(path);
    const active = path === '/' ? route === '/' : route.startsWith(path);
    const count = path === '/complaints' ? dueComplaints : path === '/consultations' ? dueConsult : 0;
    return `<button class="nav-btn ${active ? 'active' : ''}" data-path="${path}"><span class="nav-ico">${icon}</span><span class="nav-label">${label}</span>${count ? `<span class="badge">${count}</span>` : ''}</button>`;
  }).join('')}</div>`).join('');
  $$('.nav-btn').forEach((b) => b.onclick = () => setRoute(b.dataset.path));
}
function render() {
  if (!data) return;
  const map = { '/': dashboard, '/todos': todos, '/chatbot': chatbot, '/projects': projects, '/complaints': complaints, '/consultations': consultations, '/budgets': budgets, '/executions': executions, '/schedules': schedules, '/files': files, '/contacts': contacts, '/backup': backup, '/tips': tipsPage, '/settings': settingsPage };
  (map[route] || (() => view.innerHTML = '<div class="empty">Page Not Found</div>'))();
}
function formModal(title, fields, values, onSubmit) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `<form class="modal"><div class="modal-head"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-close>✕</button></div><div class="modal-body">${fields.map((f) => fieldHtml(f, values[f.name])).join('')}</div><div class="modal-actions"><button type="button" class="btn outline" data-close>취소</button><button class="btn">저장</button></div></form>`;
  document.body.appendChild(wrap);
  $$('[data-close]', wrap).forEach((b) => b.onclick = () => wrap.remove());
  $('form', wrap).onsubmit = async (e) => {
    e.preventDefault();
    const out = { ...values };
    for (const f of fields) {
      const el = `[name="${f.name}"]`;
      if (f.type === 'checkbox') out[f.name] = $(el, wrap).checked;
      else if (f.type === 'file') out[f.name] = await readFile($(el, wrap).files[0], values[f.name], `${STORE_KEY}-file-${values.id || nextId('files')}-${Date.now()}`);
      else if (f.multiple) out[f.name] = [...$(el, wrap).selectedOptions].map((o) => o.value).filter(Boolean);
      else if (f.type === 'number') {
        const raw = Number($(el, wrap).value || 0);
        out[f.name] = Math.max(Number(f.min ?? -Infinity), Math.min(Number(f.max ?? Infinity), raw));
      }
      else out[f.name] = $(el, wrap).value;
    }
    if (onSubmit(out) === false) return;
    save(); wrap.remove(); render();
  };
}
function fieldHtml(f, value) {
  const v = value ?? f.default ?? '';
  const req = f.required ? 'required' : '';
  if (f.type === 'textarea') return `<label class="form-field"><span>${f.label}</span><textarea name="${f.name}" rows="${f.rows || 3}" ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ''} ${req}>${esc(v)}</textarea></label>`;
  if (f.type === 'select') {
    const values = Array.isArray(v) ? v.map((x) => String(x ?? '')) : [String(v ?? '')];
    return `<label class="form-field"><span>${f.label}</span><select name="${f.name}" ${f.multiple ? 'multiple' : ''} ${req}>${(f.options || []).map(([val, text]) => `<option value="${esc(val ?? '')}" ${values.includes(String(val ?? '')) ? 'selected' : ''}>${esc(text ?? val)}</option>`).join('')}</select></label>`;
  }
  if (f.type === 'checkbox') return `<label class="form-check"><input type="checkbox" name="${f.name}" ${v ? 'checked' : ''}> ${f.label}</label>`;
  if (f.type === 'file') return `<label class="form-field"><span>${f.label}</span><input name="${f.name}" type="file" ${req}></label>`;
  return `<label class="form-field"><span>${f.label}</span><input name="${f.name}" type="${f.type || 'text'}" value="${esc(v)}" ${f.min !== undefined ? `min="${esc(f.min)}"` : ''} ${f.max !== undefined ? `max="${esc(f.max)}"` : ''} ${f.step !== undefined ? `step="${esc(f.step)}"` : ''} ${f.list ? `list="${esc(f.list)}"` : ''} ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ''} ${req}></label>`;
}
function fileDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('civil-workmgr-files-v1', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('files');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function putStoredFile(key, payload) {
  const db = await fileDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    tx.objectStore('files').put(payload, key);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
async function getStoredFile(key) {
  const db = await fileDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction('files').objectStore('files').get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}
async function readFile(file, fallback, storageKey) {
  if (!file) return Promise.resolve(fallback || null);
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = async () => {
      const payload = { name: file.name, type: file.type, size: file.size, dataUrl: r.result };
      try {
        await putStoredFile(storageKey, payload);
        resolve({ name: file.name, type: file.type, size: file.size, storageKey });
      } catch {
        resolve(payload);
      }
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
function rowActions(type, id) { return `<button type="button" class="link-btn" data-edit="${type}:${id}">수정</button> <button type="button" class="link-btn danger" data-del="${type}:${id}">삭제</button>`; }
function bindCrud(type, editFn) {
  $$(`[data-edit^="${type}:"]`).forEach((b) => {
    const [, id] = b.dataset.edit.split(':');
    b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); editFn(Number(id)); };
  });
  $$(`[data-del^="${type}:"]`).forEach((b) => {
    const [, id] = b.dataset.del.split(':');
    b.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (confirm('삭제하시겠습니까?')) removeById(type, Number(id));
    };
  });
}
function dashboard() {
  const active = arr('projects').filter((p) => p.status === '진행중').length;
  const undone = arr('todoItems').filter((t) => !t.done).length;
  const totalBudget = arr('budgetParts').reduce((a, b) => a + Number(b.amount || 0), 0);
  const executed = arr('executions').reduce((a, b) => a + Number(b.amount || 0), 0);
  const openComplaints = arr('complaints').filter((x) => x.processStatus !== '완료');
  const openConsultations = arr('consultations').filter((x) => x.status !== '회신완료');
  const dueItems = [
    ...openComplaints.map((x) => ({ ...x, kind: '민원', route: '/complaints', remain: daysFromToday(x.dueDate), status: x.processStatus })),
    ...openConsultations.map((x) => ({ ...x, kind: '협의', route: '/consultations', remain: daysFromToday(x.dueDate), status: x.status }))
  ].filter((x) => x.remain !== null && x.remain <= 7).sort((a, b) => a.remain - b.remain);
  const delayedProjects = arr('projects').filter(isDelayedProject).sort((a, b) => daysFromToday(a.endDate) - daysFromToday(b.endDate));
  const upcomingSchedules = arr('schedules').map((x) => ({ ...x, remain: daysFromToday(x.date || x.startDate) })).filter((x) => x.remain !== null && x.remain >= 0 && x.remain <= 7).sort((a, b) => a.remain - b.remain).slice(0, 5);
  const budgetRows = arr('budgets').map((b) => {
    const total = arr('budgetParts').filter((p) => p.budgetId === b.id).reduce((a, p) => a + Number(p.amount || 0), 0);
    const used = arr('executions').filter((e) => e.budgetId === b.id).reduce((a, e) => a + Number(e.amount || 0), 0);
    const rate = total ? Math.round(used / total * 100) : 0;
    return { ...b, total, used, rate, left: total - used };
  }).sort((a, b) => b.rate - a.rate);
  const riskCount = dueItems.filter((x) => x.remain <= 0).length + delayedProjects.length + budgetRows.filter((b) => b.rate >= 90).length;
  const dueLabel = (n) => n < 0 ? `${Math.abs(n)}일 지연` : n === 0 ? '오늘 마감' : `D-${n}`;
  const budgetRate = totalBudget ? Math.round(executed / totalBudget * 100) : 0;
  const projectTotal = arr('projects').length;
  const projectRate = projectTotal ? Math.round(active / projectTotal * 100) : 0;
  const todoTotal = arr('todoItems').length;
  const todoDone = arr('todoItems').filter((t) => t.done).length;
  const todoRate = todoTotal ? Math.round(todoDone / todoTotal * 100) : 0;
  const riskRate = Math.min(100, riskCount * 18);
  const todayLabel = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  const primaryAction = dueItems[0] || delayedProjects[0] || upcomingSchedules[0];
  const actionText = primaryAction ? `${primaryAction.kind || '현장'} · ${primaryAction.title || primaryAction.name}` : '긴급 처리 항목 없음';
  const focusProjects = [...delayedProjects, ...arr('projects').filter((p) => p.status === '진행중' && !delayedProjects.includes(p)).sort((a, b) => Number(a.actualProgress || 0) - Number(b.actualProgress || 0))].slice(0, 5);
  view.innerHTML = `<div class="portal-shell refreshed-dashboard">
    <section class="portal-hero">
      <div class="portal-hero-copy">
        <p class="workspace-kicker">Civil Works Portal</p>
        <h1>오늘의 토목 업무 포탈</h1>
        <p>${todayLabel} · ${riskCount ? `${riskCount}건의 주의 항목` : '안정 운영 중'} · ${actionText}</p>
        <div class="portal-search">
          <input id="portal-search" autocomplete="off" placeholder="공사명, 위치, 민원, 협의, 일정, 자료 검색">
          <div id="portal-results" class="portal-results"></div>
        </div>
      </div>
      <div class="civil-visual" aria-hidden="true">
        <div class="scan-line"></div>
        <div class="crane mast"></div><div class="crane jib"></div><div class="crane cable"></div><div class="crane load"></div>
        <div class="site-grid"></div>
        <div class="road"><span></span><span></span><span></span></div>
        <div class="signal"><i></i><i></i><i></i></div>
      </div>
    </section>
    <section class="command-strip">
      <button data-go="/todos"><span>오늘 업무</span><strong>${undone}건 대기</strong></button>
      <button data-go="/projects"><span>현장</span><strong>${active}/${projectTotal} 진행</strong></button>
      <button data-go="/complaints"><span>민원</span><strong>${openComplaints.length}건 미처리</strong></button>
      <button data-go="/consultations"><span>협의</span><strong>${openConsultations.length}건 회신 대기</strong></button>
      <button data-go="/executions"><span>집행률</span><strong>${budgetRate}%</strong></button>
    </section>
    <section class="portal-metrics">
      ${metricCard('주의 필요', riskCount, '지연·마감·예산 위험', riskRate, 'danger', '/complaints')}
      ${metricCard('공사 가동률', `${active}/${projectTotal}`, `지연 ${delayedProjects.length}건`, projectRate, 'blue', '/projects')}
      ${metricCard('할 일 완료율', `${todoRate}%`, `미완료 ${undone}건`, todoRate, 'green', '/todos')}
      ${metricCard('예산 집행률', `${budgetRate}%`, `${shortMoney(executed)} / ${shortMoney(totalBudget)}원`, budgetRate, budgetRate >= 90 ? 'warning' : 'navy', '/executions')}
    </section>
    <div class="portal-grid">
      <section class="portal-panel priority-panel"><div class="panel-head"><div><span>Priority</span><h3>우선 처리</h3></div><button class="link-btn" data-go="/todos">업무 보기</button></div>${dueItems.length ? dueItems.slice(0, 7).map((x) => `<button class="portal-row ${x.remain <= 0 ? 'hot' : ''}" data-go="${x.route}"><span>${x.kind}</span><strong>${esc(x.title)}</strong><small>${dueLabel(x.remain)} · ${esc(x.status || '-')}</small></button>`).join('') : '<p class="mini strong-empty">7일 이내 마감 민원·협의가 없습니다.</p>'}</section>
      <section class="portal-panel"><div class="panel-head"><div><span>Sites</span><h3>현장 포커스</h3></div><button class="link-btn" data-go="/projects">공사 보기</button></div>${focusProjects.length ? focusProjects.map((p) => `<button class="site-row ${isDelayedProject(p) ? 'hot' : ''}" data-project="${p.id}"><div><strong>${esc(p.name)}</strong><small>${esc(p.location || '-')} · ${date(p.endDate)}</small></div><span>${pct(p.actualProgress)}%</span><div class="progress"><span style="width:${pct(p.actualProgress)}%"></span></div></button>`).join('') : '<p class="mini strong-empty">진행중 현장이 없습니다.</p>'}</section>
      <section class="portal-panel"><div class="panel-head"><div><span>Calendar</span><h3>이번 주 일정</h3></div><button class="link-btn" data-go="/schedules">일정 보기</button></div>${upcomingSchedules.length ? upcomingSchedules.map((s) => `<button class="portal-row" data-go="/schedules"><span>${dueLabel(s.remain)}</span><strong>${esc(s.title)}</strong><small>${date(s.date || s.startDate)} · ${esc(s.location || '-')}</small></button>`).join('') : '<p class="mini strong-empty">이번 주 등록된 일정이 없습니다.</p>'}</section>
      <section class="portal-panel"><div class="panel-head"><div><span>Budget</span><h3>예산 집행</h3></div><button class="link-btn" data-go="/budgets">예산 보기</button></div>${budgetRows.length ? budgetRows.slice(0, 6).map((b) => `<div class="budget-row"><div class="budget-top"><strong>${esc(b.name)}</strong><span class="${b.rate >= 100 ? 'rate danger' : b.rate >= 90 ? 'rate warn' : 'rate'}">${b.rate}%</span></div><div class="progress"><span style="width:${pct(b.rate)}%"></span></div><p class="mini">잔액 ${money(b.left)} · 집행 ${money(b.used)}</p></div>`).join('') : '<p class="mini strong-empty">등록된 예산이 없습니다.</p>'}</section>
    </div>
  </div>`;
  bindRouteLinks(view);
  bindPortalSearch();
}
function metricCard(label, main, sub, value, tone, target) {
  return `<button class="metric-card ${tone}" data-go="${target}"><span>${esc(label)}</span><strong>${esc(main)}</strong><small>${esc(sub)}</small><div class="metric-bar"><i style="width:${pct(value)}%"></i></div></button>`;
}
function portalSearchRows(q) {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  const rows = [
    ...arr('projects').map((p) => ({ type: '공사', title: p.name, meta: `${p.location || '-'} · ${p.status || '-'}`, projectId: p.id, text: `${p.name} ${p.location} ${p.contractor} ${p.category}` })),
    ...arr('complaints').map((x) => ({ type: '민원', title: x.title, meta: `${x.complainant || '-'} · ${date(x.dueDate)}`, route: '/complaints', text: `${x.title} ${x.complainant} ${x.address} ${x.content}` })),
    ...arr('consultations').map((x) => ({ type: '협의', title: x.title, meta: `${x.department || '-'} · ${date(x.dueDate)}`, route: '/consultations', text: `${x.title} ${x.department} ${x.content} ${x.result}` })),
    ...arr('schedules').map((x) => ({ type: '일정', title: x.title, meta: `${date(x.date || x.startDate)} · ${x.location || '-'}`, route: '/schedules', text: `${x.title} ${x.location} ${x.memo}` })),
    ...arr('files').map((x) => ({ type: '자료', title: x.file?.name || x.fileName || x.name, meta: `${x.category || '기타'} · ${projectName(x.projectId)}`, route: '/files', text: `${x.file?.name || x.fileName || x.name} ${x.description} ${x.category}` }))
  ];
  return rows.filter((row) => `${row.text} ${row.title} ${row.meta}`.toLowerCase().includes(s)).slice(0, 8);
}
function bindPortalSearch() {
  const input = $('#portal-search');
  const results = $('#portal-results');
  const draw = () => {
    const rows = portalSearchRows(input.value);
    results.innerHTML = input.value.trim() ? (rows.length ? rows.map((row) => `<button ${row.projectId ? `data-project="${row.projectId}"` : `data-go="${row.route}"`}><span>${esc(row.type)}</span><strong>${esc(row.title || '-')}</strong><small>${esc(row.meta || '')}</small></button>`).join('') : '<p>검색 결과가 없습니다.</p>') : '';
    bindRouteLinks(results);
  };
  input.oninput = draw;
}
function gaugeCard(label, value, main, sub, target, tone = 'blue') {
  const safe = pct(value);
  return `<button class="gauge-card ${tone}" data-go="${target}" style="--value:${safe}%">
    <span class="gauge-label">${esc(label)}</span>
    <span class="gauge">
      <span class="gauge-center"><strong>${esc(main)}</strong><small>${safe}%</small></span>
    </span>
    <span class="gauge-sub">${esc(sub)}</span>
  </button>`;
}
function projectFields(v = {}) { return [
  { name: 'workKind', label: '업무 구분', type: 'select', options: ['공사', '용역'].map((x) => [x, x]), default: '공사' },
  { name: 'category', label: '분류' }, { name: 'name', label: '공사명 *', required: true }, { name: 'location', label: '위치' }, { name: 'contractor', label: '시공사' },
  { name: 'supervisor', label: '감독자' }, { name: 'contractorContact', label: '현장 연락처' },
  { name: 'status', label: '상태', type: 'select', options: projectStatuses.map((x) => [x, x]), default: '진행중' },
  { name: 'projectCost', label: '공사비 (원)', type: 'number' }, { name: 'govMaterialCost', label: '관급자재비 (원)', type: 'number' },
  { name: 'contractDate', label: '계약일', type: 'date' }, { name: 'startDate', label: '착공일', type: 'date' }, { name: 'endDate', label: '예정 준공일', type: 'date' }, { name: 'actualEndDate', label: '실제 준공일', type: 'date' },
  { name: 'actualProgress', label: '실제 공정률 (%)', type: 'number', min: 0, max: 100 },
  { name: 'paymentStatus', label: '대금 상태' }, { name: 'permitStatus', label: '인허가 상태' }, { name: 'safetyCheckDate', label: '최근 안전점검일', type: 'date' }, { name: 'defectBondEndDate', label: '하자담보 만료일', type: 'date' },
  { name: 'budgetId', label: '주 예산', type: 'select', options: [[null, '선택 안함'], ...arr('budgets').map((b) => [b.id, b.name])] },
  { name: 'budgetIds', label: '보조 예산', type: 'select', multiple: true, options: arr('budgets').map((b) => [b.id, b.name]) },
  { name: 'designChangeMemo', label: '설계변경 / 특이사항', type: 'textarea' }, { name: 'memo', label: '관리 메모', type: 'textarea' }
]; }
function editProject(id) {
  const old = id ? arr('projects').find((x) => x.id === id) : { id: nextId('projects'), actualProgress: 0, status: '진행중', startDate: today(), endDate: today(), displayOrder: arr('projects').length + 1 };
  formModal(id ? '공사 수정' : '공사 등록', projectFields(old), old, (out) => {
    out.budgetId = nullableNumber(out.budgetId);
    out.budgetIds = [...new Set((out.budgetIds || []).map(nullableNumber).filter((x) => x !== null && x !== out.budgetId))];
    out.actualProgress = pct(out.actualProgress);
    if (out.startDate && out.endDate && dateValue(out.startDate) > dateValue(out.endDate)) { alert('준공일은 착공일보다 빠를 수 없습니다.'); return false; }
    if (out.status === '준공' && !out.actualEndDate) out.actualEndDate = out.endDate || today();
    if (id) Object.assign(old, out, { updatedAt: new Date().toISOString() });
    else arr('projects').push({ ...out, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    selectedProject = out.id;
  });
}
function projects() {
  selectedProject = selectedProject || arr('projects')[0]?.id;
  const statuses = ['전체', ...new Set(arr('projects').map((p) => p.status).filter(Boolean))];
  const categories = ['전체', ...new Set(arr('projects').map((p) => p.category || p.workKind).filter(Boolean))];
  const active = arr('projects').filter((p) => p.status === '진행중').length;
  const delayed = arr('projects').filter(isDelayedProject).length;
  view.innerHTML = `<div class="split project-organizer"><aside class="list-pane project-list-pane"><div class="list-head project-head"><div class="list-title"><h2>공사관리</h2><button id="add-project" class="btn">등록</button></div><div class="project-summary"><article><span>전체</span><strong>${arr('projects').length}</strong></article><article><span>진행중</span><strong>${active}</strong></article><article><span>지연</span><strong>${delayed}</strong></article></div><div class="search"><input id="q" placeholder="공사명, 위치, 시공사 검색"></div><div class="project-controls"><select id="project-sort"><option value="order">기본순</option><option value="endDate">준공일 빠른순</option><option value="progress">공정률 낮은순</option><option value="cost">공사비 높은순</option><option value="name">공사명순</option></select><button id="risk-only" class="chip" type="button">지연만</button></div><div class="filters status-filters">${statuses.map((c, i) => `<button class="chip ${i === 0 ? 'active' : ''}" data-status="${esc(c)}">${esc(c)}</button>`).join('')}</div><div class="filters category-filters">${categories.map((c, i) => `<button class="chip ${i === 0 ? 'active' : ''}" data-category="${esc(c)}">${esc(c)}</button>`).join('')}</div></div><div class="items organized-items" id="project-list"></div></aside><section class="detail-pane" id="project-detail"></section></div>`;
  const renderList = () => {
    const status = $('.status-filters .chip.active')?.dataset.status || '전체';
    const category = $('.category-filters .chip.active')?.dataset.category || '전체';
    const q = $('#q').value.trim().toLowerCase();
    const sort = $('#project-sort').value;
    const riskOnly = $('#risk-only').classList.contains('active');
    const rows = arr('projects')
      .filter((p) => status === '전체' || p.status === status)
      .filter((p) => category === '전체' || (p.category || p.workKind) === category)
      .filter((p) => !riskOnly || isDelayedProject(p))
      .filter((p) => `${p.name} ${p.location} ${p.contractor} ${p.category} ${p.workKind}`.toLowerCase().includes(q))
      .sort((a, b) => {
        if (sort === 'endDate') return (dateValue(a.endDate)?.getTime() || Infinity) - (dateValue(b.endDate)?.getTime() || Infinity);
        if (sort === 'progress') return Number(a.actualProgress || 0) - Number(b.actualProgress || 0);
        if (sort === 'cost') return Number(b.projectCost || 0) - Number(a.projectCost || 0);
        if (sort === 'name') return String(a.name || '').localeCompare(String(b.name || ''), 'ko');
        return (a.displayOrder || 0) - (b.displayOrder || 0);
      });
    $('#project-list').innerHTML = rows.map((p) => {
      const remain = daysFromToday(p.endDate);
      const due = remain === null ? '기한 없음' : isDelayedProject(p) ? `${Math.abs(remain)}일 지연` : remain < 0 ? '기한 경과' : remain === 0 ? '오늘 준공' : `D-${remain}`;
      return `<button class="list-item project-list-item ${p.id === selectedProject ? 'active' : ''} ${isDelayedProject(p) ? 'is-risk' : ''}" data-id="${p.id}"><div class="item-top"><div class="item-name">${esc(p.name)}</div>${pill(p.status, statusColor(p.status))}</div><div class="project-list-meta"><span>${esc(p.category || p.workKind || '분류 없음')}</span><span>${esc(p.location || '-')}</span><span>${due}</span></div><div class="project-progress-row"><div class="progress"><span style="width:${pct(p.actualProgress)}%"></span></div><strong>${pct(p.actualProgress)}%</strong></div></button>`;
    }).join('') || '<div class="empty-state">조건에 맞는 공사가 없습니다.</div>';
    $$('.list-item').forEach((b) => b.onclick = () => { selectedProject = Number(b.dataset.id); renderList(); renderProjectDetail(); });
  };
  $('#add-project').onclick = () => editProject();
  $('#q').oninput = renderList;
  $('#project-sort').onchange = renderList;
  $('#risk-only').onclick = () => { $('#risk-only').classList.toggle('active'); renderList(); };
  $$('.status-filters .chip').forEach((c) => c.onclick = () => { $$('.status-filters .chip').forEach((x) => x.classList.remove('active')); c.classList.add('active'); renderList(); });
  $$('.category-filters .chip').forEach((c) => c.onclick = () => { $$('.category-filters .chip').forEach((x) => x.classList.remove('active')); c.classList.add('active'); renderList(); });
  renderList(); renderProjectDetail();
}
function renderProjectDetail() {
  const p = arr('projects').find((x) => x.id === selectedProject);
  if (!p) { $('#project-detail').innerHTML = '<div class="empty">공사를 선택하면 상세 정보가 표시됩니다</div>'; return; }
  const companies = arr('projectCompanies').filter((x) => x.projectId === p.id);
  const memos = arr('projectMemos').filter((x) => x.projectId === p.id);
  const links = relatedProjectIds(p.id);
  const files = arr('files').filter((x) => x.projectId === p.id);
  $('#project-detail').innerHTML = `<div class="page-head"><div class="page-title"><h1>${esc(p.name)}</h1><p>${esc(p.location || '-')}</p></div><div class="head-actions"><button class="btn outline" id="edit-project">수정</button><button class="btn danger" id="del-project">삭제</button></div></div><section class="civil-card"><h3>공정 현황</h3><div class="progress"><span style="width:${pct(p.actualProgress)}%"></span></div><p class="mini">공정률 ${pct(p.actualProgress)}% · ${isDelayedProject(p) ? '준공 지연' : esc(p.status || '-')}</p></section><section class="section"><h3>기본 정보</h3><div class="detail-grid">${[['업무 구분', p.workKind], ['분류', p.category], ['공사 위치', p.location], ['감독자', p.supervisor], ['시공사', p.contractor], ['현장 연락처', p.contractorContact], ['공사비', money(p.projectCost)], ['관급자재비', money(p.govMaterialCost)], ['계약일', date(p.contractDate)], ['착공일', date(p.startDate)], ['예정 준공일', date(p.endDate)], ['실제 준공일', date(p.actualEndDate)], ['예산', projectBudgetNames(p)], ['대금 상태', p.paymentStatus], ['인허가 상태', p.permitStatus], ['최근 안전점검일', date(p.safetyCheckDate)], ['하자담보 만료일', date(p.defectBondEndDate)]].map(([a, b]) => `<div class="field"><span>${a}</span><strong>${esc(b || '-')}</strong></div>`).join('')}</div>${p.designChangeMemo || p.memo ? `<div class="civil-card mini pre">${esc([p.designChangeMemo, p.memo].filter(Boolean).join('\n\n'))}</div>` : ''}</section><section class="section"><div class="section-title"><h3>업체</h3><button class="btn outline" id="add-company">추가</button></div><div class="table-card"><table class="table"><thead><tr><th>구분</th><th>업체명</th><th>담당자</th><th>연락처</th><th>관리</th></tr></thead><tbody>${companies.map((c) => `<tr><td>${esc(c.type)}</td><td>${esc(c.name)}</td><td>${esc(c.manager)}</td><td>${esc(c.phone)}</td><td>${rowActions('projectCompanies', c.id)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">등록된 업체가 없습니다</td></tr>'}</tbody></table></div></section><section class="section"><div class="section-title"><h3>메모</h3><button class="btn outline" id="add-memo">추가</button></div>${memos.map((m) => `<div class="civil-card mini pre">${esc(m.content)}<br>${date(m.createdAt)}<div>${rowActions('projectMemos', m.id)}</div></div>`).join('') || '<p class="mini">메모가 없습니다</p>'}</section><section class="section"><div class="section-title"><h3>연계 공사</h3><button class="btn outline" id="add-link">추가</button></div>${links.map((id) => `<div class="civil-card mini">${projectLink(id)} <button class="link-btn danger" data-unlink="${id}">삭제</button></div>`).join('') || '<p class="mini">연계할 수 있는 공사가 없습니다</p>'}</section><section class="section"><div class="section-title"><h3>자료</h3><button class="btn outline" id="add-project-file">추가</button></div>${files.map((f) => `<div class="civil-card mini">${esc(f.file?.name || f.name || f.fileName)} <button class="link-btn" data-download-file="${f.id}">다운로드</button></div>`).join('') || '<p class="mini">등록된 자료가 없습니다</p>'}</section>`;
  $('#edit-project').onclick = () => editProject(p.id);
  $('#del-project').onclick = () => { if (confirm('이 공사를 삭제하시겠습니까?')) { removeById('projects', p.id); selectedProject = arr('projects')[0]?.id || null; } };
  $('#add-company').onclick = () => editCompany(null, p.id);
  $('#add-memo').onclick = () => editMemo(null, p.id);
  $('#add-link').onclick = () => addLink(p.id);
  $('#add-project-file').onclick = () => editFile(null, p.id);
  bindCrud('projectCompanies', (id) => editCompany(id, p.id)); bindCrud('projectMemos', (id) => editMemo(id, p.id));
  $$('[data-unlink]').forEach((b) => b.onclick = () => { data.linkedProjects = arr('linkedProjects').filter((x) => !(x.projectId === p.id && x.linkedProjectId === Number(b.dataset.unlink)) && !(x.linkedProjectId === p.id && x.projectId === Number(b.dataset.unlink))); save(); renderProjectDetail(); });
  $$('[data-download-file]').forEach((b) => b.onclick = () => downloadFile(Number(b.dataset.downloadFile)));
  bindRouteLinks($('#project-detail'));
}
function editCompany(id, projectId) { const old = id ? arr('projectCompanies').find((x) => x.id === id) : { id: nextId('projectCompanies'), projectId, type: '시공사' }; formModal(id ? '업체 수정' : '업체 추가', [{ name: 'type', label: '구분' }, { name: 'name', label: '업체명 *', required: true }, { name: 'manager', label: '담당자' }, { name: 'phone', label: '연락처' }, { name: 'email', label: '이메일' }], old, (out) => id ? Object.assign(old, out) : arr('projectCompanies').push({ ...out, createdAt: new Date().toISOString() })); }
function editMemo(id, projectId) { const old = id ? arr('projectMemos').find((x) => x.id === id) : { id: nextId('projectMemos'), projectId, content: '' }; formModal(id ? '메모 수정' : '메모 추가', [{ name: 'content', label: '메모', type: 'textarea', rows: 5, required: true }], old, (out) => id ? Object.assign(old, out) : arr('projectMemos').push({ ...out, createdAt: new Date().toISOString() })); }
function addLink(projectId) {
  const linked = new Set(relatedProjectIds(projectId));
  const options = arr('projects').filter((p) => p.id !== projectId && !linked.has(p.id)).map((p) => [p.id, p.name]);
  if (!options.length) return alert('연계할 수 있는 공사가 없습니다.');
  formModal('연계할 공사 선택', [{ name: 'linkedProjectId', label: '공사', type: 'select', options }], {}, (out) => {
    const linkedProjectId = Number(out.linkedProjectId);
    if (relatedProjectIds(projectId).includes(linkedProjectId)) return false;
    arr('linkedProjects').push({ id: nextId('linkedProjects'), projectId, linkedProjectId, isRepresentative: false });
  });
}
function simpleTable({ type, title, addText, placeholder, heads, fields, row, formFields, defaults = {} }) {
  view.innerHTML = `<div class="narrow">${pageHead(title, '', `<button class="btn" id="add-row">${addText}</button>`)}<div class="toolbar"><div class="search"><input id="q" placeholder="${placeholder}"></div></div><div class="table-card"><table class="table"><thead><tr>${heads.map((h) => `<th>${h}</th>`).join('')}<th>관리</th></tr></thead><tbody id="tbody"></tbody></table></div></div>`;
  const edit = (id) => { const old = id ? arr(type).find((x) => x.id === id) : { id: nextId(type), ...defaults }; formModal(id ? `${title.replace('관리', '')} 수정` : addText, formFields(), old, (out) => { if (out.projectId !== undefined) out.projectId = nullableNumber(out.projectId); if (out.budgetId !== undefined) out.budgetId = nullableNumber(out.budgetId); if (id) Object.assign(old, out, { updatedAt: new Date().toISOString() }); else arr(type).push({ ...out, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); }); };
  const draw = (q = '') => { $('#tbody').innerHTML = arr(type).filter((x) => fields.some((f) => String(x[f] || '').toLowerCase().includes(q.toLowerCase()))).map((x) => `<tr>${row(x).map((c) => `<td>${c}</td>`).join('')}<td>${rowActions(type, x.id)}</td></tr>`).join('') || `<tr><td colspan="${heads.length + 1}" class="muted">등록된 항목이 없습니다</td></tr>`; bindCrud(type, edit); bindRouteLinks($('#tbody')); };
  $('#add-row').onclick = () => edit(); $('#q').oninput = (e) => draw(e.target.value); draw();
}
const projectOptions = () => [[null, '선택 안함'], ...arr('projects').map((p) => [p.id, p.name])];
function complaints() { simpleTable({ type: 'complaints', title: '민원관리', addText: '민원 등록', placeholder: '민원 제목, 민원인 검색...', heads: ['구분', '제목', '관련 공사', '민원인', '접수일', '처리기한', '처리상태'], fields: ['title', 'complainant', 'phone', 'address', 'content'], row: (x) => [esc(x.type), esc(x.title), projectLink(x.projectId), esc(x.complainant), date(x.receivedDate), date(x.dueDate), pill(x.processStatus, statusColor(x.processStatus))], defaults: { type: '전화민원', processStatus: '접수', receivedDate: today() }, formFields: () => [{ name: 'type', label: '민원 유형' }, { name: 'processStatus', label: '처리 상태', type: 'select', options: ['접수', '처리중', '완료'].map((x) => [x, x]) }, { name: 'title', label: '민원 제목 *', required: true }, { name: 'complainant', label: '민원인' }, { name: 'phone', label: '연락처' }, { name: 'address', label: '주소' }, { name: 'receivedDate', label: '접수일', type: 'date' }, { name: 'dueDate', label: '처리기한', type: 'date' }, { name: 'projectId', label: '관련 공사', type: 'select', options: projectOptions() }, { name: 'content', label: '민원 내용', type: 'textarea' }, { name: 'memo', label: '처리 메모', type: 'textarea' }] }); }
function consultations() { simpleTable({ type: 'consultations', title: '협의관리', addText: '협의 등록', placeholder: '협의 제목, 기관명 검색...', heads: ['구분', '협의 제목', '관련 공사', '협의 기관', '요청일', '처리기한', '회신일', '상태'], fields: ['title', 'department', 'manager', 'phone', 'content', 'result', 'memo'], row: (x) => [esc(x.type), esc(x.title), projectLink(x.projectId), esc(x.department), date(x.requestDate), date(x.dueDate), date(x.replyDate), pill(x.status, statusColor(x.status))], defaults: { type: '내부협의', status: '검토중', requestDate: today() }, formFields: () => [{ name: 'type', label: '협의 유형' }, { name: 'status', label: '상태', type: 'select', options: ['검토중', '회신완료', '보류'].map((x) => [x, x]) }, { name: 'title', label: '협의 제목 *', required: true }, { name: 'department', label: '협의 기관' }, { name: 'manager', label: '담당자' }, { name: 'phone', label: '연락처' }, { name: 'requestDate', label: '요청일', type: 'date' }, { name: 'dueDate', label: '처리기한', type: 'date' }, { name: 'replyDate', label: '회신일', type: 'date' }, { name: 'projectId', label: '관련 공사', type: 'select', options: projectOptions() }, { name: 'content', label: '협의 내용', type: 'textarea' }, { name: 'result', label: '협의 결과', type: 'textarea' }, { name: 'memo', label: '메모', type: 'textarea' }] }); }
function budgets() {
  view.innerHTML = `<div class="narrow">${pageHead('예산관리', '', '<button id="add-budget" class="btn">예산 등록</button>')}<div class="cards">${arr('budgets').map((b) => { const parts = arr('budgetParts').filter((p) => p.budgetId === b.id); const total = parts.reduce((a, p) => a + Number(p.amount || 0), 0); const used = arr('executions').filter((e) => e.budgetId === b.id).reduce((a, e) => a + Number(e.amount || 0), 0); return `<article class="civil-card"><div class="item-top"><h3>${esc(b.name)}</h3><div>${rowActions('budgets', b.id)}</div></div><p class="mini">${esc(b.year || b.fiscalYear || '')} · ${esc(b.department || '')}</p><div class="field"><span>합계</span><strong>${money(total)}</strong></div><div class="field"><span>집행</span><strong>${money(used)}</strong></div><div class="progress"><span style="width:${total ? Math.round(used / total * 100) : 0}%"></span></div><div class="mini">${parts.map((p) => `${esc(p.source)} ${esc(p.carryover)} ${money(p.amount)} ${rowActions('budgetParts', p.id)}`).join('<br>') || '재원이 없습니다.'}</div><button class="btn outline" data-add-part="${b.id}">재원 추가</button></article>`; }).join('')}</div></div>`;
  const editBudget = (id) => { const old = id ? arr('budgets').find((x) => x.id === id) : { id: nextId('budgets'), year: '2026', department: '교통정책과' }; formModal(id ? '예산 수정' : '예산 등록', [{ name: 'name', label: '예산 이름 *', required: true }, { name: 'year', label: '회계연도' }, { name: 'department', label: '부서' }, { name: 'memo', label: '메모', type: 'textarea' }], old, (out) => id ? Object.assign(old, out) : arr('budgets').push({ ...out, createdAt: new Date().toISOString() })); };
  const editPart = (id, budgetId) => { const old = id ? arr('budgetParts').find((x) => x.id === id) : { id: nextId('budgetParts'), budgetId, source: '구비', carryover: '당해', amount: 0 }; formModal(id ? '재원 수정' : '재원 추가', [{ name: 'source', label: '재원' }, { name: 'carryover', label: '구분' }, { name: 'amount', label: '금액', type: 'number' }], old, (out) => id ? Object.assign(old, out) : arr('budgetParts').push(out)); };
  $('#add-budget').onclick = () => editBudget(); bindCrud('budgets', editBudget); bindCrud('budgetParts', editPart); $$('[data-add-part]').forEach((b) => b.onclick = () => editPart(null, Number(b.dataset.addPart)));
}
function executions() { simpleTable({ type: 'executions', title: '집행관리', addText: '집행 등록', placeholder: '집행명, 업체 검색...', heads: ['구분', '집행명', '관련 공사', '예산', '지출재원', '금액', '집행일', '업체', '상태'], fields: ['title', 'vendor', 'payee', 'memo'], row: (x) => [esc(x.type || x.execType), esc(x.title), projectLink(x.projectId), esc(budgetName(x.budgetId)), esc(x.source || x.carryover || '-'), money(x.amount), date(x.date || x.execDate), esc(x.vendor || x.payee || '-'), pill(x.status, statusColor(x.status))], defaults: { type: '지출', execType: '지출', status: '지출', date: today() }, formFields: () => [{ name: 'type', label: '집행 유형' }, { name: 'status', label: '상태' }, { name: 'title', label: '집행명 *', required: true }, { name: 'budgetId', label: '예산', type: 'select', options: [[null, '선택 안함'], ...arr('budgets').map((b) => [b.id, b.name])] }, { name: 'projectId', label: '관련 공사', type: 'select', options: projectOptions() }, { name: 'date', label: '집행일', type: 'date' }, { name: 'vendor', label: '업체/수취인' }, { name: 'source', label: '지출재원' }, { name: 'carryover', label: '이월구분' }, { name: 'amount', label: '총 금액 (원)', type: 'number' }, { name: 'memo', label: '메모', type: 'textarea' }] }); }
function schedules() {
  const y = currentMonth.getFullYear(), m = currentMonth.getMonth(); const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate(); let cells = []; for (let i = 0; i < first; i++) cells.push(''); for (let d = 1; d <= days; d++) cells.push(d); while (cells.length % 7) cells.push('');
  view.innerHTML = `<div class="narrow">${pageHead('일정관리', '', '<button id="add-schedule" class="btn">일정 등록</button>')}<div class="toolbar"><button id="prev-month" class="btn outline">‹</button><h2>${y}년 ${m + 1}월</h2><button id="next-month" class="btn outline">›</button><button id="this-month" class="btn ghost">오늘</button></div><div class="calendar"><div class="cal-head">${['일', '월', '화', '수', '목', '금', '토'].map((x) => `<div>${x}</div>`).join('')}</div><div class="cal-row">${cells.map((d) => { const ev = d ? arr('schedules').filter((s) => new Date(s.date || s.startDate).getMonth() === m && new Date(s.date || s.startDate).getDate() === d && new Date(s.date || s.startDate).getFullYear() === y) : []; return `<div class="day">${d ? `<div class="day-num">${d}</div>${ev.map((e) => `<button class="event" data-schedule="${e.id}">${esc(e.title)}</button>`).join('')}` : ''}</div>`; }).join('')}</div></div><div class="section table-card"><table class="table"><thead><tr><th>일자</th><th>유형</th><th>일정 제목</th><th>장소</th><th>관리</th></tr></thead><tbody>${arr('schedules').filter((x) => new Date(x.date || x.startDate).getFullYear() === y && new Date(x.date || x.startDate).getMonth() === m).map((x) => `<tr><td>${date(x.date || x.startDate)}</td><td>${esc(x.type || '')}</td><td>${esc(x.title)}</td><td>${esc(x.location || '')}</td><td>${rowActions('schedules', x.id)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">이번 달 등록된 일정이 없습니다</td></tr>'}</tbody></table></div></div>`;
  const editSchedule = (id) => { const old = id ? arr('schedules').find((x) => x.id === id) : { id: nextId('schedules'), date: today(), startDate: today(), endDate: today(), color: 'blue', type: '회의' }; formModal(id ? '일정 수정' : '일정 등록', [{ name: 'type', label: '유형' }, { name: 'color', label: '색상' }, { name: 'title', label: '일정 제목 *', required: true }, { name: 'date', label: '날짜', type: 'date' }, { name: 'startTime', label: '시작시간', type: 'time' }, { name: 'endTime', label: '종료시간', type: 'time' }, { name: 'location', label: '장소' }, { name: 'projectId', label: '관련 공사', type: 'select', options: projectOptions() }, { name: 'memo', label: '메모', type: 'textarea' }], old, (out) => { out.startDate = out.date; out.endDate = out.date; id ? Object.assign(old, out) : arr('schedules').push(out); }); };
  $('#add-schedule').onclick = () => editSchedule(); $('#prev-month').onclick = () => { currentMonth = new Date(y, m - 1, 1); render(); }; $('#next-month').onclick = () => { currentMonth = new Date(y, m + 1, 1); render(); }; $('#this-month').onclick = () => { currentMonth = new Date(); render(); }; $$('[data-schedule]').forEach((b) => b.onclick = () => editSchedule(Number(b.dataset.schedule))); bindCrud('schedules', editSchedule);
}
function todoMonthValue(card) {
  if (card.month) return card.month;
  const raw = `${card.title || ''} ${card.createdAt || ''}`;
  const explicit = raw.match(/(20\d{2})[.\-/년\s]+(\d{1,2})/);
  if (explicit) return `${explicit[1]}-${String(explicit[2]).padStart(2, '0')}`;
  const short = raw.match(/(^|\D)(\d{1,2})월/);
  const year = (card.createdAt || '').slice(0, 4) || String(new Date().getFullYear());
  return short ? `${year}-${String(short[2]).padStart(2, '0')}` : today().slice(0, 7);
}
function todoMonthLabel(card) {
  const month = todoMonthValue(card);
  return card.title?.includes('월') ? card.title : `${month.replace('-', '년 ')}월`;
}
function todoLevel(item) {
  if (item.parentId) return 'detail';
  if (item.level) return item.level;
  if (item.dueDate) return item.dueDate === today() ? 'day' : 'week';
  return 'month';
}
function todoLevelLabel(level) {
  return ({ month: '월간', week: '주간', day: '일간', detail: '하위' })[level] || '월간';
}
function todoPriorityLabel(priority) {
  return ({ high: '높음', normal: '보통', low: '낮음' })[priority || 'normal'] || '보통';
}
function todoPriorityTone(priority) {
  return ({ high: 'red', normal: 'blue', low: 'gray' })[priority || 'normal'] || 'blue';
}
function todoPriorityWeight(priority) {
  return ({ high: 3, normal: 2, low: 1 })[priority || 'normal'] || 2;
}
function todoDueState(item) {
  if (item.done || !item.dueDate) return '';
  const remain = daysFromToday(item.dueDate);
  if (remain === null) return '';
  if (remain < 0) return 'overdue';
  if (remain === 0) return 'today';
  if (remain <= 3) return 'soon';
  return '';
}
function todoDueSortValue(value) {
  const d = dateValue(value);
  return d ? d.getTime() : Number.MAX_SAFE_INTEGER;
}
function weekRangeLabel(base = today()) {
  const d = dateValue(base) || new Date();
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: monday.toISOString().slice(0, 10), end: sunday.toISOString().slice(0, 10), label: `${monday.getMonth() + 1}.${monday.getDate()}. ~ ${sunday.getMonth() + 1}.${sunday.getDate()}.` };
}
function todoRows() {
  const cards = arr('todoCards').sort((a, b) => todoMonthValue(b).localeCompare(todoMonthValue(a)) || (a.displayOrder || 0) - (b.displayOrder || 0));
  const sections = arr('todoSections').sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  const items = arr('todoItems').sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const sectionById = new Map(sections.map((section) => [section.id, section]));
  const childrenByParent = new Map();
  items.forEach((item) => {
    if (!item.parentId) return;
    const children = childrenByParent.get(item.parentId) || [];
    children.push(item);
    childrenByParent.set(item.parentId, children);
  });
  return items.map((item) => {
    const section = sectionById.get(item.sectionId);
    const card = section ? cardById.get(section.cardId) : null;
    const children = childrenByParent.get(item.id) || [];
    return { item, section, card, children, level: todoLevel(item), month: card ? todoMonthValue(card) : today().slice(0, 7), dueState: todoDueState(item) };
  });
}
function todos() {
  const rows = todoRows();
  const cards = arr('todoCards').sort((a, b) => todoMonthValue(b).localeCompare(todoMonthValue(a)) || (a.displayOrder || 0) - (b.displayOrder || 0));
  const sections = arr('todoSections').sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  const topRows = rows.filter((row) => !row.item.parentId);
  const todayRows = topRows.filter((row) => row.item.dueDate === today() && !row.item.done);
  const week = weekRangeLabel();
  const weekRows = topRows.filter((row) => row.item.dueDate >= week.start && row.item.dueDate <= week.end && !row.item.done);
  const overdueRows = topRows.filter((row) => row.dueState === 'overdue');
  const openItems = rows.filter((row) => !row.item.done);
  const completion = rows.length ? Math.round((rows.length - openItems.length) / rows.length * 100) : 0;
  const monthOptions = [...new Set(cards.map(todoMonthValue))];
  const currentMonthValue = monthOptions.includes(today().slice(0, 7)) ? today().slice(0, 7) : monthOptions[0] || today().slice(0, 7);
  view.innerHTML = `<div class="workplace-shell task-list-shell">
    <section class="workplace-hero">
      <div>
        <p class="workspace-kicker">Monthly Execution Planner</p>
        <h1>해야 할 일</h1>
        <p>월간 계획과 공사·업무 묶음은 자동으로 정리하고, 실제 실행 항목은 빠르게 추가합니다.</p>
      </div>
      <div class="hero-actions">
        <button id="quick-plan" class="btn">업무 묶음 추가</button>
      </div>
    </section>
    <section class="workspace-metrics">
      <article><span>오늘 할 일</span><strong>${todayRows.length}</strong><small>${date(today())}</small></article>
      <article><span>이번 주</span><strong>${weekRows.length}</strong><small>${week.label}</small></article>
      <article class="${overdueRows.length ? 'metric-alert' : ''}"><span>기한 초과</span><strong>${overdueRows.length}</strong><small>먼저 처리할 항목</small></article>
      <article><span>완료율</span><strong>${completion}%</strong><small>${rows.length}개 항목 기준</small></article>
    </section>
    <section class="todo-commandbar">
      <div class="search enterprise-search"><input id="todo-query" placeholder="월, 공사명, 할 일 검색"></div>
      <select id="todo-month" class="control-select">${monthOptions.map((m) => `<option value="${m}" ${m === currentMonthValue ? 'selected' : ''}>${m.replace('-', '년 ')}월</option>`).join('') || `<option value="${today().slice(0, 7)}">${today().slice(0, 7).replace('-', '년 ')}월</option>`}</select>
      <div class="segmented" id="todo-scope">
        <button class="active" data-scope="all">전체</button>
        <button data-scope="overdue">초과</button>
        <button data-scope="week">이번 주</button>
        <button data-scope="today">오늘</button>
        <button data-scope="open">진행중</button>
      </div>
    </section>
    <section class="task-layout planner-layout">
      <aside class="task-groups" id="task-groups"></aside>
      <section class="task-table-card">
        <div class="list-panel-head">
          <div><strong id="todo-list-title"></strong><span id="todo-list-sub"></span></div>
        </div>
        <div class="table-card"><table class="table task-table planner-table"><thead><tr><th>상태</th><th>할 일</th><th>기한</th><th>관리</th></tr></thead><tbody id="todo-list"></tbody></table></div>
      </section>
    </section>
  </div>`;

  const sectionTitles = [...new Set(sections.map((section) => section.title).filter(Boolean))];
  const monthCardOptions = () => cards.map((card) => [card.id, todoMonthLabel(card)]);
  const sectionOptions = () => sections.map((section) => {
    const card = cards.find((entry) => entry.id === section.cardId);
    return [section.id, `${todoMonthLabel(card || {})} / ${section.title}`];
  });
  const editMonth = (id) => {
    const ym = today().slice(0, 7);
    const old = id ? arr('todoCards').find((x) => x.id === id) : { id: nextId('todoCards'), title: `${ym.replace('-', '년 ')}월`, month: ym, displayOrder: arr('todoCards').length + 1 };
    formModal(id ? '월 수정' : '월 추가', [{ name: 'month', label: '월', type: 'month', required: true }, { name: 'title', label: '월간 큰 계획 이름 *', required: true }], old, (out) => id ? Object.assign(old, out) : arr('todoCards').push({ ...out, createdAt: new Date().toISOString() }));
  };
  const ensureMonth = (month, title) => {
    const selectedMonth = month || $('#todo-month')?.value || today().slice(0, 7);
    let card = arr('todoCards').find((entry) => todoMonthValue(entry) === selectedMonth);
    if (!card) {
      card = { id: nextId('todoCards'), month: selectedMonth, title: title || `${selectedMonth.replace('-', '년 ')}월 해야 할 일`, displayOrder: arr('todoCards').length + 1, createdAt: new Date().toISOString() };
      arr('todoCards').push(card);
    } else if (title && !card.title) {
      card.title = title;
    }
    return card;
  };
  const ensureSection = (cardId, title) => {
    const cleanTitle = (title || '기타 해야 할 일').trim();
    let section = arr('todoSections').find((entry) => entry.cardId === cardId && entry.title.trim() === cleanTitle);
    if (!section) {
      section = { id: nextId('todoSections'), cardId, title: cleanTitle, displayOrder: arr('todoSections').filter((entry) => entry.cardId === cardId).length, createdAt: new Date().toISOString() };
      arr('todoSections').push(section);
    }
    return section;
  };
  const quickPlan = (defaults = {}) => {
    const selectedMonth = $('#todo-month')?.value || today().slice(0, 7);
    const old = { month: selectedMonth, sectionTitle: '', dueDate: today(), content: '', ...defaults };
    formModal('업무 묶음 추가', [
      { name: 'month', label: '월', type: 'month', required: true },
      { name: 'sectionTitle', label: '업무 묶음 *', list: 'todo-section-suggestions', required: true },
      { name: 'dueDate', label: '첫 할 일 기한', type: 'date' },
      { name: 'content', label: '첫 할 일', type: 'textarea', rows: 3 }
    ], old, (out) => {
      const card = ensureMonth(out.month, `${out.month.replace('-', '년 ')}월 해야 할 일`);
      const section = ensureSection(card.id, out.sectionTitle);
      if (out.content.trim()) {
        arr('todoItems').push({ id: nextId('todoItems'), sectionId: section.id, level: out.dueDate === today() ? 'day' : 'week', priority: 'normal', dueDate: out.dueDate, content: out.content.trim(), done: false, parentId: null, displayOrder: arr('todoItems').length + 1, createdAt: new Date().toISOString() });
      }
    });
    document.querySelector('.modal-body')?.insertAdjacentHTML('beforeend', `<datalist id="todo-section-suggestions">${sectionTitles.map((title) => `<option value="${esc(title)}"></option>`).join('')}</datalist>`);
  };
  const editTitle = (id, cardId) => {
    const old = id ? arr('todoSections').find((x) => x.id === id) : { id: nextId('todoSections'), cardId: cardId || Number($('#todo-month').selectedOptions[0]?.dataset.card || cards.find((card) => todoMonthValue(card) === $('#todo-month').value)?.id), title: '', displayOrder: 0 };
    if (!cards.length) return quickPlan({ content: '', level: 'month', dueDate: '' });
    formModal(id ? '업무 묶음 수정' : '업무 묶음 추가', [{ name: 'cardId', label: '월간 계획', type: 'select', options: monthCardOptions() }, { name: 'title', label: '공사 또는 업무 묶음 *', required: true }], old, (out) => { out.cardId = Number(out.cardId); id ? Object.assign(old, out) : arr('todoSections').push({ ...out, createdAt: new Date().toISOString() }); });
  };
  const editItem = (id, sectionId, defaults = {}) => {
    if (!sections.length) return alert('먼저 업무 묶음을 추가하세요.');
    const old = id ? arr('todoItems').find((x) => x.id === id) : { id: nextId('todoItems'), sectionId: sectionId || sections[0].id, level: 'day', priority: 'normal', dueDate: today(), content: '', done: false, parentId: null, displayOrder: arr('todoItems').length + 1, ...defaults };
    formModal(id ? '할 일 수정' : '할 일 추가', [
      { name: 'sectionId', label: '업무 묶음', type: 'select', options: sectionOptions() },
      { name: 'dueDate', label: '실행일/기한', type: 'date' },
      { name: 'content', label: '내용 *', required: true },
      { name: 'done', label: '완료', type: 'checkbox' }
    ], old, (out) => {
      out.sectionId = Number(out.sectionId);
      out.parentId = null;
      out.level = out.dueDate === today() ? 'day' : 'week';
      out.priority = old.priority || 'normal';
      id ? Object.assign(old, out, { updatedAt: new Date().toISOString() }) : arr('todoItems').push({ ...out, createdAt: new Date().toISOString() });
    });
  };
  const drawList = () => {
    const query = $('#todo-query').value.trim().toLowerCase();
    const month = $('#todo-month').value;
    const scope = $('#todo-scope .active').dataset.scope;
    const filtered = todoRows().filter((row) => !row.item.parentId)
      .filter((row) => row.month === month)
      .filter((row) => scope === 'all' || (scope === 'open' ? !row.item.done : scope === 'today' ? row.item.dueDate === today() : scope === 'overdue' ? row.dueState === 'overdue' : row.item.dueDate >= week.start && row.item.dueDate <= week.end))
      .filter((row) => !query || `${row.item.content} ${row.section?.title || ''} ${row.card?.title || ''} ${row.month} ${todoPriorityLabel(row.item.priority)}`.toLowerCase().includes(query))
      .sort((a, b) => Number(a.item.done) - Number(b.item.done) || todoDueSortValue(a.item.dueDate) - todoDueSortValue(b.item.dueDate) || todoPriorityWeight(b.item.priority) - todoPriorityWeight(a.item.priority) || (a.item.displayOrder || 0) - (b.item.displayOrder || 0));
    $('#todo-list-title').textContent = `${month.replace('-', '년 ')}월 실행 목록`;
    $('#todo-list-sub').textContent = scope === 'today' ? '오늘 해야 할 일만 표시' : scope === 'week' ? '이번 주 실행 항목만 표시' : scope === 'overdue' ? '기한이 지난 미완료 항목만 표시' : '월간, 주간, 일간 항목을 한 목록으로 표시';
    $('#todo-list').innerHTML = filtered.map(todoListRow).join('') || '<tr><td colspan="4" class="muted">조건에 맞는 할 일이 없습니다.</td></tr>';
    $('#task-groups').innerHTML = cards.filter((card) => todoMonthValue(card) === month).map((card) => {
      const cardSections = sections.filter((section) => section.cardId === card.id);
      return `<section class="month-list-block">
        <div class="month-list-head"><strong>${esc(todoMonthLabel(card))}</strong>${rowActions('todoCards', card.id)}</div>
        ${cardSections.map((section) => {
          const sectionRows = todoRows().filter((row) => row.section?.id === section.id && !row.item.parentId);
          const done = sectionRows.filter((row) => row.item.done).length;
          return `<article class="task-group-row"><div><span>업무 묶음</span><strong>${esc(section.title)}</strong></div><small>${done}/${sectionRows.length}</small><div class="progress"><span style="width:${sectionRows.length ? Math.round(done / sectionRows.length * 100) : 0}%"></span></div><div class="stream-actions"><button class="link-btn" data-add-item="${section.id}">할 일 추가</button>${rowActions('todoSections', section.id)}</div></article>`;
        }).join('') || '<div class="empty-state mini">업무 묶음이 없습니다.</div>'}
      </section>`;
    }).join('') || '<div class="empty-state">월간 계획이 없습니다.</div>';
    bindTodoActions();
  };
  const bindTodoActions = () => {
    bindCrud('todoCards', editMonth);
    bindCrud('todoSections', editTitle);
    bindCrud('todoItems', editItem);
    $$('[data-add-item]').forEach((b) => b.onclick = () => editItem(null, Number(b.dataset.addItem)));
    $$('[data-add-detail]').forEach((b) => {
      b.onclick = () => {
        const parent = arr('todoItems').find((x) => x.id === Number(b.dataset.addDetail));
        editItem(null, parent?.sectionId, { parentId: parent?.id, level: 'detail', dueDate: parent?.dueDate || today() });
      };
    });
    $$('[data-toggle-item]').forEach((b) => b.onclick = () => {
      const item = arr('todoItems').find((x) => x.id === Number(b.dataset.toggleItem));
      if (!item) return;
      item.done = !item.done;
      save();
      drawList();
    });
  };
  $('#quick-plan').onclick = () => quickPlan();
  $('#todo-query').oninput = drawList;
  $('#todo-month').onchange = drawList;
  $$('#todo-scope button').forEach((button) => button.onclick = () => {
    $$('#todo-scope button').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    drawList();
  });
  drawList();
}
function todoFocusItem(item) {
  const section = arr('todoSections').find((entry) => entry.id === item.sectionId);
  const card = section ? arr('todoCards').find((entry) => entry.id === section.cardId) : null;
  return `<button class="focus-item" data-toggle-item="${item.id}"><span></span><div><strong>${esc(item.content)}</strong><small>${esc(card?.title || '묶음 없음')} · ${esc(section?.title || '분류 없음')}</small></div></button>`;
}
function todoCardItem(item) {
  const section = arr('todoSections').find((entry) => entry.id === item.sectionId);
  return `<div class="enterprise-task ${item.done ? 'is-done' : ''}">
    <button class="task-check" data-toggle-item="${item.id}">${item.done ? '✓' : ''}</button>
    <div class="task-copy"><strong>${esc(item.content)}</strong><small>${esc(section?.title || '')}</small></div>
    <div class="task-actions">${rowActions('todoItems', item.id)}</div>
  </div>`;
}
function todoListRow(row) {
  const { item, section, card, children, level, dueState } = row;
  const dueText = item.dueDate ? `${date(item.dueDate)}${dueState === 'overdue' ? ' · 초과' : dueState === 'today' ? ' · 오늘' : dueState === 'soon' ? ' · 임박' : ''}` : '<span class="muted">미정</span>';
  return `<tr class="${item.done ? 'task-row-done' : ''} ${dueState ? `due-${dueState}` : ''}">
    <td><button class="task-check list-check" data-toggle-item="${item.id}">${item.done ? '✓' : ''}</button></td>
    <td><div class="todo-main"><div class="todo-badges">${pill(todoPriorityLabel(item.priority), todoPriorityTone(item.priority))}${pill(todoLevelLabel(level), level === 'day' ? 'blue' : level === 'week' ? 'orange' : 'gray')}</div><strong>${esc(item.content)}</strong><span class="task-path">${esc(todoMonthLabel(card || {}))} / ${esc(section?.title || '업무 묶음 없음')}</span>${children.length ? `<ul class="detail-todos">${children.map((child) => `<li class="${child.done ? 'done' : ''}"><button class="mini-check" data-toggle-item="${child.id}">${child.done ? '✓' : ''}</button><span>${esc(child.content)}</span>${rowActions('todoItems', child.id)}</li>`).join('')}</ul>` : ''}</div></td>
    <td><span class="due-label">${dueText}</span></td>
    <td>${rowActions('todoItems', item.id)}</td>
  </tr>`;
}
function editFile(id, defaultProjectId = null) {
  const old = id ? arr('files').find((x) => x.id === id) : { id: nextId('files'), category: '기타', projectId: defaultProjectId };
  formModal(id ? '파일 수정' : '파일 업로드', [{ name: 'file', label: '파일 선택', type: 'file', required: !id }, { name: 'category', label: '분류' }, { name: 'projectId', label: '관련 공사', type: 'select', options: projectOptions() }, { name: 'description', label: '설명', type: 'textarea' }], old, (out) => {
    out.projectId = nullableNumber(out.projectId);
    out.fileName = out.file?.name || old.fileName;
    out.size = out.file?.size || old.size;
    if (id) Object.assign(old, out, { updatedAt: new Date().toISOString() });
    else arr('files').push({ ...out, createdAt: new Date().toISOString() });
  });
}
function files() {
  view.innerHTML = `<div class="narrow">${pageHead('자료실', `총 ${arr('files').length}개 파일`, '<button id="add-file" class="btn">파일 업로드</button>')}<div class="cards">${arr('files').map((f) => `<article class="civil-card"><h3>${esc(f.file?.name || f.fileName || f.name)}</h3><p class="mini">${esc(f.category || '기타')} · ${projectLink(f.projectId)}<br>${esc(f.description || '')}<br>${date(f.createdAt || f.uploadedAt)}</p><button class="link-btn" data-download-file="${f.id}">다운로드</button> ${rowActions('files', f.id)}</article>`).join('') || '<div class="empty civil-card">파일이 없습니다.</div>'}</div></div>`;
  $('#add-file').onclick = () => editFile(); bindCrud('files', editFile); $$('[data-download-file]').forEach((b) => b.onclick = () => downloadFile(Number(b.dataset.downloadFile))); bindRouteLinks(view);
}
async function downloadFile(id) {
  const f = arr('files').find((x) => x.id === id);
  const stored = f?.file?.dataUrl ? f.file : f?.file?.storageKey ? await getStoredFile(f.file.storageKey) : null;
  if (!stored?.dataUrl) return alert('저장된 파일 데이터가 없습니다.');
  const a = document.createElement('a');
  a.href = stored.dataUrl;
  a.download = stored.name || f.fileName || 'download';
  a.click();
}
function contacts() { simpleTable({ type: 'contacts', title: '업체/연락처', addText: '연락처 추가', placeholder: '업체명, 담당자, 전화번호 검색...', heads: ['구분', '업체명', '담당자', '전화번호', '이메일', '메모'], fields: ['type', 'name', 'manager', 'phone', 'email', 'note'], row: (x) => [pill(x.type || '기타', 'blue'), esc(x.name), esc(x.manager), esc(x.phone), esc(x.email), esc(x.note)], defaults: { type: '기타' }, formFields: () => [{ name: 'type', label: '구분 *', required: true }, { name: 'name', label: '업체명 *', required: true }, { name: 'manager', label: '담당자' }, { name: 'phone', label: '전화번호' }, { name: 'email', label: '이메일', type: 'email' }, { name: 'department', label: '부서/주소' }, { name: 'note', label: '메모', type: 'textarea' }] }); }
function chatbot() {
  view.innerHTML = `<div class="narrow">${pageHead('AI 어시스턴트', '공사 관련 질문에 답변하는 AI 챗봇')}<div class="chat civil-card"><div id="chat-log" class="chat-log"><div class="bot">백업 데이터 기준으로 검색하고 요약합니다. 예: 진행중 공사, 예산, 못골시장, 오늘 일정</div></div><form id="chat-form" class="chat-form"><input id="chat-input" placeholder="질문을 입력하세요"><button class="btn">전송</button></form></div></div>`;
  $('#chat-form').onsubmit = (e) => { e.preventDefault(); const q = $('#chat-input').value.trim(); if (!q) return; $('#chat-input').value = ''; const log = $('#chat-log'); log.insertAdjacentHTML('beforeend', `<div class="user">${esc(q)}</div><div class="bot">${esc(answer(q))}</div>`); log.scrollTop = log.scrollHeight; };
}
function answer(q) {
  const s = q.toLowerCase();
  const wantsTodo = s.includes('해야') || s.includes('할 일') || s.includes('todo') || s.includes('투두');
  if (wantsTodo && s.includes('오늘')) {
    const rows = todoRows().filter((row) => !row.item.parentId && !row.item.done && row.item.dueDate === today());
    return rows.length ? rows.map((row, i) => `${i + 1}. [${row.section?.title || '업무 묶음 없음'}] ${row.item.content}${row.children.length ? `\n   - ${row.children.filter((x) => !x.done).map((x) => x.content).join('\n   - ')}` : ''}`).join('\n') : '오늘 날짜로 지정된 미완료 할 일이 없습니다.';
  }
  if (wantsTodo && (s.includes('밀린') || s.includes('초과') || s.includes('지난'))) {
    const rows = todoRows().filter((row) => !row.item.parentId && !row.item.done && row.dueState === 'overdue');
    return rows.length ? rows.map((row, i) => `${i + 1}. ${date(row.item.dueDate)} [${todoPriorityLabel(row.item.priority)}] ${row.section?.title || '업무 묶음 없음'} - ${row.item.content}`).join('\n') : '기한이 지난 미완료 할 일이 없습니다.';
  }
  if (wantsTodo && (s.includes('이번주') || s.includes('이번 주') || s.includes('주간'))) {
    const week = weekRangeLabel();
    const rows = todoRows().filter((row) => !row.item.parentId && !row.item.done && row.item.dueDate >= week.start && row.item.dueDate <= week.end);
    return rows.length ? rows.map((row, i) => `${i + 1}. ${date(row.item.dueDate)} [${row.section?.title || '업무 묶음 없음'}] ${row.item.content}`).join('\n') : '이번 주 날짜로 지정된 미완료 할 일이 없습니다.';
  }
  if (s.includes('진행')) return arr('projects').filter((p) => p.status === '진행중').map((p) => `${p.name} (${p.actualProgress || 0}%)`).join('\n') || '진행중 공사가 없습니다.';
  if (s.includes('예산')) return arr('budgets').map((b) => `${b.name}: ${money(arr('budgetParts').filter((p) => p.budgetId === b.id).reduce((a, p) => a + Number(p.amount || 0), 0))}`).join('\n');
  if (s.includes('일정') || s.includes('오늘')) return arr('schedules').filter((x) => !s.includes('오늘') || iso(x.date || x.startDate) === today()).map((x) => `${date(x.date || x.startDate)} ${x.title}`).join('\n') || '일정이 없습니다.';
  const found = arr('projects').filter((p) => `${p.name} ${p.location} ${p.contractor}`.toLowerCase().includes(s));
  return found.length ? found.map((p) => `${p.name}\n위치: ${p.location || '-'}\n업체: ${p.contractor || '-'}\n상태: ${p.status || '-'}\n공정률: ${p.actualProgress || 0}%`).join('\n\n') : '관련 데이터를 찾지 못했습니다.';
}
function backup() {
  view.innerHTML = `<div class="backup-card">${pageHead('백업 / 복구', '데이터를 JSON 파일로 백업하거나 복구합니다.')}<div class="civil-card section"><h3>데이터 백업</h3><p class="mini">현재 저장된 모든 데이터를 JSON 파일로 내보냅니다.</p><button id="export" class="btn">백업 파일 다운로드</button></div><div class="civil-card section"><h3>데이터 복구</h3><p class="mini">백업 JSON 파일을 업로드하여 데이터를 복구합니다.</p><div class="warning"><b>주의:</b> 복구 시 현재 브라우저 저장 데이터가 백업 파일의 데이터로 대체됩니다.</div><input id="import-file" type="file" accept=".json" hidden><button id="import" class="btn outline">백업 파일 선택</button></div><div class="civil-card section"><h3>초기화</h3><p class="mini">첨부된 원본 JSON 백업 상태로 되돌립니다.</p><button id="reset" class="btn danger">원본 백업으로 초기화</button></div></div>`;
  $('#export').onclick = exportBackup;
  $('#import').onclick = () => $('#import-file').click(); $('#import-file').onchange = async (e) => { const file = e.target.files[0]; if (!file || !confirm('현재 데이터를 덮어씁니다. 계속하시겠습니까?')) return; data = await normalizeData(JSON.parse(await file.text())); save(); renderNav(); render(); };
  $('#reset').onclick = async () => { if (!confirm('원본 백업으로 초기화할까요?')) return; localStorage.removeItem(STORE_KEY); data = await normalizeData(await fetch(DATA_URL).then((r) => r.json())); save(); renderNav(); render(); };
}

function tipsPage() {
  const panels = {
    start: {
      title: '빠른 시작',
      items: ['대시보드의 게이지를 눌러 위험 항목, 공사, 할 일, 예산 화면으로 바로 이동합니다.', '먼저 민원·협의의 처리기한을 입력하면 우선 처리 목록이 자동으로 정렬됩니다.', '자주 확인하는 공사는 공사관리 목록에서 검색어로 바로 좁혀 보세요.']
    },
    projects: {
      title: '공사관리',
      items: ['공정률과 준공일을 함께 관리하면 대시보드에서 지연 공사를 자동으로 표시합니다.', '공사 상세에서 업체, 메모, 연계 공사, 자료를 한 화면에 묶어 현장별 이력을 유지합니다.', '예산을 연결해두면 집행관리와 함께 잔액 흐름을 추적하기 쉽습니다.']
    },
    civil: {
      title: '민원·협의',
      items: ['처리상태를 완료 또는 회신완료로 바꾸면 사이드바 알림 수가 줄어듭니다.', '처리기한이 7일 이내이면 대시보드 우선 처리 영역에 자동 노출됩니다.', '관련 공사를 선택해두면 민원·협의 이력을 공사 맥락에서 다시 찾을 수 있습니다.']
    },
    data: {
      title: '자료·백업',
      items: ['자료실에 파일을 올릴 때 관련 공사를 지정하면 상세 화면에서도 바로 확인할 수 있습니다.', '큰 수정 전에는 백업 / 복구 화면에서 JSON 백업 파일을 내려받아 보관하세요.', '설정에서 화면 밀도를 촘촘하게 바꾸면 표 중심 업무를 더 빠르게 훑을 수 있습니다.']
    }
  };
  const drawPanel = (key) => {
    const panel = panels[key] || panels.start;
    $('#tips-panel').innerHTML = `<section class="tip-panel active">
      <div class="tip-panel-head"><span>Guide</span><h2>${panel.title}</h2></div>
      <div class="tip-list">${panel.items.map((item, i) => `<article class="tip-card"><strong>${String(i + 1).padStart(2, '0')}</strong><p>${esc(item)}</p></article>`).join('')}</div>
    </section>`;
  };
  view.innerHTML = `<div class="tips-shell">
    <section class="tips-hero">
      <div>
        <p class="workspace-kicker">Workflow Guide</p>
        <h1>사용팁</h1>
        <p>업무 흐름별로 필요한 화면을 빠르게 찾고, 데이터가 대시보드에 잘 반영되도록 입력하는 요령입니다.</p>
      </div>
      <button class="btn outline light-action" data-go="/">대시보드로 이동</button>
    </section>
    <div class="tips-tabs" id="tips-tabs">
      <button class="active" data-tip="start">빠른 시작</button>
      <button data-tip="projects">공사관리</button>
      <button data-tip="civil">민원·협의</button>
      <button data-tip="data">자료·백업</button>
    </div>
    <div id="tips-panel"></div>
    <section class="shortcut-grid">
      <button data-go="/projects"><span>공사 등록</span><strong>현장 정보부터 정리</strong></button>
      <button data-go="/todos"><span>해야 할 일</span><strong>오늘 업무 체크</strong></button>
      <button data-go="/budgets"><span>예산관리</span><strong>집행률 확인</strong></button>
    </section>
  </div>`;
  drawPanel('start');
  $$('#tips-tabs button').forEach((button) => button.onclick = () => {
    $$('#tips-tabs button').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    drawPanel(button.dataset.tip);
  });
  bindRouteLinks(view);
}

function settingsPage() {
  const storageSize = new Blob([JSON.stringify(data)]).size;
  view.innerHTML = `<div class="backup-card">${pageHead('설정', '화면 표시와 로컬 저장 데이터를 관리합니다.')}<div class="civil-card section"><h3>사용자 설정</h3><div class="settings-grid"><label class="form-field"><span>표시 이름</span><input id="setting-name" value="${esc(settings.adminName || '관리자')}"></label><label class="form-field"><span>화면 밀도</span><select id="setting-density"><option value="comfortable" ${settings.density !== 'compact' ? 'selected' : ''}>기본</option><option value="compact" ${settings.density === 'compact' ? 'selected' : ''}>촘촘하게</option></select></label><label class="form-field"><span>테마</span><select id="setting-theme"><option value="light" ${settings.theme !== 'dark' ? 'selected' : ''}>밝게</option><option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>어둡게</option></select></label></div><button id="save-settings" class="btn">설정 저장</button></div><div class="civil-card section"><h3>저장소 상태</h3><p class="mini">브라우저 로컬 저장소 사용량: ${Math.round(storageSize / 1024)}KB<br>프로젝트 ${arr('projects').length}건, 민원 ${arr('complaints').length}건, 협의 ${arr('consultations').length}건, 일정 ${arr('schedules').length}건</p><button id="settings-export" class="btn outline">현재 데이터 백업</button> <button id="settings-reset" class="btn danger">원본 백업으로 초기화</button></div></div>`;
  $('#save-settings').onclick = () => { settings = { adminName: $('#setting-name').value.trim() || '관리자', density: $('#setting-density').value, theme: $('#setting-theme').value }; saveSettings(); renderNav(); render(); };
  $('#settings-export').onclick = exportBackup;
  $('#settings-reset').onclick = async () => { if (!confirm('원본 백업으로 초기화할까요?')) return; localStorage.removeItem(STORE_KEY); data = await normalizeData(await fetch(DATA_URL).then((r) => r.json())); save(); renderNav(); render(); };
}

async function exportBackup() {
  const backup = JSON.parse(JSON.stringify(data));
  for (const f of backup.files || []) {
    if (f.file?.storageKey && !f.file.dataUrl) {
      const stored = await getStoredFile(f.file.storageKey).catch(() => null);
      if (stored) f.file = stored;
    }
  }
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `civil-work-backup-${today()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
async function normalizeData(source) {
  data = source || {};
  arr('projects').forEach((p) => {
    p.actualProgress = pct(p.actualProgress);
    p.budgetId = nullableNumber(p.budgetId);
    p.budgetIds = [...new Set((p.budgetIds || []).map(nullableNumber).filter((id) => id !== null && id !== p.budgetId))];
  });
  const projectIds = new Set(arr('projects').map((p) => p.id));
  ['files', 'complaints', 'consultations', 'executions', 'schedules'].forEach((type) => arr(type).forEach((x) => { if (x.projectId != null && !projectIds.has(x.projectId)) x.projectId = null; }));
  const pairs = new Set();
  data.linkedProjects = arr('linkedProjects').filter((x) => {
    if (!projectIds.has(x.projectId) || !projectIds.has(x.linkedProjectId) || x.projectId === x.linkedProjectId) return false;
    const key = [x.projectId, x.linkedProjectId].sort((a, b) => a - b).join(':');
    if (pairs.has(key)) return false;
    pairs.add(key);
    return true;
  });
  for (const f of arr('files')) {
    if (f.file?.dataUrl && !f.file.storageKey) {
      const storageKey = `${STORE_KEY}-file-${f.id || nextId('files')}`;
      try {
        await putStoredFile(storageKey, f.file);
        f.fileName = f.file.name || f.fileName;
        f.size = f.file.size || f.size;
        f.file = { name: f.file.name, type: f.file.type, size: f.file.size, storageKey };
      } catch {}
    }
  }
  return data;
}
async function init() { try { const stored = localStorage.getItem(STORE_KEY); data = await normalizeData(stored ? JSON.parse(stored) : await fetch(DATA_URL).then((r) => r.json())); applySettings(); save(); renderNav(); render(); } catch (e) { view.innerHTML = '<div class="empty">로딩 중 오류가 발생했습니다.</div>'; console.error(e); } }
window.addEventListener('hashchange', () => { route = location.hash.replace('#', '') || '/'; renderNav(); render(); });
init();
