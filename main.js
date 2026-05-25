const DATA_URL = 'civil-work-backup-2026-05-25.json';
const STORE_KEY = 'civil-workmgr-data-v2';
const SETTINGS_KEY = 'civil-workmgr-settings-v1';
const routes = [
  ['/', '대시보드', '▦'], ['/todos', '해야 할 일', '☑'], ['/chatbot', 'AI 어시스턴트', '◇'],
  ['/projects', '공사관리', '□'], ['/complaints', '민원관리', '!'], ['/consultations', '협의관리', '↔'],
  ['/budgets', '예산관리', '₩'], ['/executions', '집행관리', '↧'], ['/schedules', '일정관리', '○'],
  ['/files', '자료실', '▤'], ['/contacts', '업체/연락처', '☎'], ['/backup', '백업 / 복구', '⇅'],
  ['/settings', '설정', '⚙']
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
    data.files = arr('files').filter((x) => x.projectId !== id);
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
  $('#nav').innerHTML = routes.map(([path, label, icon]) => {
    const active = path === '/' ? route === '/' : route.startsWith(path);
    const count = path === '/complaints' ? dueComplaints : path === '/consultations' ? dueConsult : 0;
    return `<button class="nav-btn ${active ? 'active' : ''}" data-path="${path}"><span class="nav-ico">${icon}</span><span class="nav-label">${label}</span>${count ? `<span class="badge">${count}</span>` : ''}</button>`;
  }).join('');
  $$('.nav-btn').forEach((b) => b.onclick = () => setRoute(b.dataset.path));
}
function render() {
  if (!data) return;
  const map = { '/': dashboard, '/todos': todos, '/chatbot': chatbot, '/projects': projects, '/complaints': complaints, '/consultations': consultations, '/budgets': budgets, '/executions': executions, '/schedules': schedules, '/files': files, '/contacts': contacts, '/backup': backup, '/settings': settingsPage };
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
      else if (f.type === 'file') out[f.name] = await readFile($(el, wrap).files[0], values[f.name]);
      else if (f.type === 'number') out[f.name] = Number($(el, wrap).value || 0);
      else out[f.name] = $(el, wrap).value;
    }
    onSubmit(out); save(); wrap.remove(); render();
  };
}
function fieldHtml(f, value) {
  const v = value ?? f.default ?? '';
  const req = f.required ? 'required' : '';
  if (f.type === 'textarea') return `<label class="form-field"><span>${f.label}</span><textarea name="${f.name}" rows="${f.rows || 3}" ${req}>${esc(v)}</textarea></label>`;
  if (f.type === 'select') return `<label class="form-field"><span>${f.label}</span><select name="${f.name}" ${req}>${(f.options || []).map(([val, text]) => `<option value="${esc(val ?? '')}" ${String(val ?? '') === String(v ?? '') ? 'selected' : ''}>${esc(text ?? val)}</option>`).join('')}</select></label>`;
  if (f.type === 'checkbox') return `<label class="form-check"><input type="checkbox" name="${f.name}" ${v ? 'checked' : ''}> ${f.label}</label>`;
  if (f.type === 'file') return `<label class="form-field"><span>${f.label}</span><input name="${f.name}" type="file" ${req}></label>`;
  return `<label class="form-field"><span>${f.label}</span><input name="${f.name}" type="${f.type || 'text'}" value="${esc(v)}" ${req}></label>`;
}
function readFile(file, fallback) {
  if (!file) return Promise.resolve(fallback || null);
  return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve({ name: file.name, type: file.type, size: file.size, dataUrl: r.result }); r.onerror = reject; r.readAsDataURL(file); });
}
function rowActions(type, id) { return `<button class="link-btn" data-edit="${type}:${id}">수정</button> <button class="link-btn danger" data-del="${type}:${id}">삭제</button>`; }
function bindCrud(type, editFn) {
  $$('[data-edit]').forEach((b) => b.onclick = () => { const [t, id] = b.dataset.edit.split(':'); if (t === type) editFn(Number(id)); });
  $$('[data-del]').forEach((b) => b.onclick = () => { const [t, id] = b.dataset.del.split(':'); if (t === type && confirm('삭제하시겠습니까?')) removeById(type, Number(id)); });
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
  const delayedProjects = arr('projects').filter((p) => p.status === '진행중' && daysFromToday(p.endDate) !== null && daysFromToday(p.endDate) < 0).sort((a, b) => daysFromToday(a.endDate) - daysFromToday(b.endDate));
  const upcomingSchedules = arr('schedules').map((x) => ({ ...x, remain: daysFromToday(x.date || x.startDate) })).filter((x) => x.remain !== null && x.remain >= 0 && x.remain <= 7).sort((a, b) => a.remain - b.remain).slice(0, 5);
  const budgetRows = arr('budgets').map((b) => {
    const total = arr('budgetParts').filter((p) => p.budgetId === b.id).reduce((a, p) => a + Number(p.amount || 0), 0);
    const used = arr('executions').filter((e) => e.budgetId === b.id).reduce((a, e) => a + Number(e.amount || 0), 0);
    const rate = total ? Math.round(used / total * 100) : 0;
    return { ...b, total, used, rate, left: total - used };
  }).sort((a, b) => b.rate - a.rate);
  const riskCount = dueItems.filter((x) => x.remain <= 0).length + delayedProjects.length + budgetRows.filter((b) => b.rate >= 90).length;
  const dueLabel = (n) => n < 0 ? `${Math.abs(n)}일 지연` : n === 0 ? '오늘 마감' : `D-${n}`;
  view.innerHTML = `<div class="dashboard-wrap">${pageHead('대시보드', new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }), '<button id="print" class="btn">PDF 다운로드</button>')}<div class="grid stats"><button class="civil-card stat danger-stat" data-go="/complaints"><div class="stat-label">주의 필요</div><strong>${riskCount}</strong><p>지연·마감·예산 위험</p></button><button class="civil-card stat" data-go="/projects"><div class="stat-label">진행중 공사</div><strong>${active}</strong><p>지연 ${delayedProjects.length}건 포함</p></button><button class="civil-card stat" data-go="/todos"><div class="stat-label">미완료 할 일</div><strong>${undone}</strong><p>처리 대기 업무</p></button><button class="civil-card stat" data-go="/executions"><div class="stat-label">집행률</div><strong>${totalBudget ? Math.round(executed / totalBudget * 100) : 0}%</strong><p>${shortMoney(executed)} / ${shortMoney(totalBudget)}원</p></button></div><div class="grid dashboard-grid"><section class="civil-card dashboard-panel priority-panel"><div class="panel-head"><h3>우선 처리</h3><button class="link-btn" data-go="/complaints">민원 보기</button></div>${dueItems.length ? dueItems.slice(0, 7).map((x) => `<button class="work-row ${x.remain <= 0 ? 'hot' : ''}" data-go="${x.route}"><span class="work-kind">${x.kind}</span><span class="work-title">${esc(x.title)}</span><span class="work-meta">${dueLabel(x.remain)} · ${esc(x.status || '-')}</span></button>`).join('') : '<p class="mini strong-empty">7일 이내 마감 민원·협의가 없습니다.</p>'}</section><section class="civil-card dashboard-panel"><div class="panel-head"><h3>공사 위험</h3><button class="link-btn" data-go="/projects">공사 보기</button></div>${delayedProjects.length ? delayedProjects.slice(0, 5).map((p) => `<button class="work-row hot" data-project="${p.id}"><span class="work-kind">지연</span><span class="work-title">${esc(p.name)}</span><span class="work-meta">${date(p.endDate)} · 공정률 ${p.actualProgress || 0}%</span></button>`).join('') : '<p class="mini strong-empty">준공일이 지난 진행중 공사가 없습니다.</p>'}</section><section class="civil-card dashboard-panel"><div class="panel-head"><h3>이번 주 일정</h3><button class="link-btn" data-go="/schedules">일정 보기</button></div>${upcomingSchedules.length ? upcomingSchedules.map((s) => `<button class="work-row" data-go="/schedules"><span class="work-kind">${dueLabel(s.remain)}</span><span class="work-title">${esc(s.title)}</span><span class="work-meta">${date(s.date || s.startDate)} · ${esc(s.location || '-')}</span></button>`).join('') : '<p class="mini strong-empty">이번 주 등록된 일정이 없습니다.</p>'}</section><section class="civil-card dashboard-panel"><div class="panel-head"><h3>예산 집행</h3><button class="link-btn" data-go="/budgets">예산 보기</button></div>${budgetRows.length ? budgetRows.slice(0, 6).map((b) => `<div class="budget-row"><div class="budget-top"><strong>${esc(b.name)}</strong><span class="${b.rate >= 100 ? 'rate danger' : b.rate >= 90 ? 'rate warn' : 'rate'}">${b.rate}%</span></div><div class="progress"><span style="width:${pct(b.rate)}%"></span></div><p class="mini">잔액 ${money(b.left)} · 집행 ${money(b.used)}</p></div>`).join('') : '<p class="mini strong-empty">등록된 예산이 없습니다.</p>'}</section></div></div>`;
  bindRouteLinks(view);
  $('#print').onclick = () => window.print();
}
function projectFields(v = {}) { return [
  { name: 'workKind', label: '업무 구분', type: 'select', options: ['공사', '용역'].map((x) => [x, x]), default: '공사' },
  { name: 'category', label: '분류' }, { name: 'name', label: '공사명 *', required: true }, { name: 'location', label: '위치' }, { name: 'contractor', label: '시공사' },
  { name: 'status', label: '상태', type: 'select', options: ['진행중', '준공', '보류', '예정'].map((x) => [x, x]), default: '진행중' },
  { name: 'projectCost', label: '공사비 (원)', type: 'number' }, { name: 'govMaterialCost', label: '관급자재비 (원)', type: 'number' },
  { name: 'startDate', label: '착공일', type: 'date' }, { name: 'endDate', label: '준공일', type: 'date' }, { name: 'actualProgress', label: '실제 공정률 (%)', type: 'number' },
  { name: 'budgetId', label: '예산', type: 'select', options: [[null, '선택 안함'], ...arr('budgets').map((b) => [b.id, b.name])] }
]; }
function editProject(id) {
  const old = id ? arr('projects').find((x) => x.id === id) : { id: nextId('projects'), actualProgress: 0, status: '진행중', startDate: today(), endDate: today(), displayOrder: arr('projects').length + 1 };
  formModal(id ? '공사 수정' : '공사 등록', projectFields(old), old, (out) => { out.budgetId = nullableNumber(out.budgetId); if (id) Object.assign(old, out, { updatedAt: new Date().toISOString() }); else arr('projects').push({ ...out, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); selectedProject = out.id; });
}
function projects() {
  selectedProject = selectedProject || arr('projects')[0]?.id;
  const cats = ['전체', ...new Set(arr('projects').map((p) => p.status).filter(Boolean))];
  view.innerHTML = `<div class="split"><aside class="list-pane"><div class="list-head"><div class="list-title"><h2>공사관리</h2><button id="add-project" class="btn">등록</button></div><div class="search"><input id="q" placeholder="공사명 검색..."></div><div class="filters">${cats.map((c, i) => `<button class="chip ${i === 0 ? 'active' : ''}" data-filter="${esc(c)}">${esc(c)}</button>`).join('')}</div></div><div class="items" id="project-list"></div></aside><section class="detail-pane" id="project-detail"></section></div>`;
  const renderList = (filter = '전체', q = '') => {
    const rows = arr('projects').filter((p) => (filter === '전체' || p.status === filter) && `${p.name} ${p.location} ${p.contractor}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    $('#project-list').innerHTML = rows.map((p) => `<button class="list-item ${p.id === selectedProject ? 'active' : ''}" data-id="${p.id}"><div class="item-top"><div class="item-name">${esc(p.name)}</div>${pill(p.status, statusColor(p.status))}</div><div class="muted">${esc(p.location || '-')} · ${esc(p.contractor || '-')}</div><div class="progress"><span style="width:${pct(p.actualProgress)}%"></span></div></button>`).join('') || '<div class="empty">등록된 공사가 없습니다</div>';
    $$('.list-item').forEach((b) => b.onclick = () => { selectedProject = Number(b.dataset.id); renderList(filter, $('#q').value); renderProjectDetail(); });
  };
  $('#add-project').onclick = () => editProject();
  $('#q').oninput = (e) => renderList($('.chip.active').dataset.filter, e.target.value);
  $$('.chip').forEach((c) => c.onclick = () => { $$('.chip').forEach((x) => x.classList.remove('active')); c.classList.add('active'); renderList(c.dataset.filter, $('#q').value); });
  renderList(); renderProjectDetail();
}
function renderProjectDetail() {
  const p = arr('projects').find((x) => x.id === selectedProject);
  if (!p) { $('#project-detail').innerHTML = '<div class="empty">공사를 선택하면 상세 정보가 표시됩니다</div>'; return; }
  const companies = arr('projectCompanies').filter((x) => x.projectId === p.id);
  const memos = arr('projectMemos').filter((x) => x.projectId === p.id);
  const links = arr('linkedProjects').filter((x) => x.projectId === p.id || x.linkedProjectId === p.id).map((x) => x.projectId === p.id ? x.linkedProjectId : x.projectId);
  const files = arr('files').filter((x) => x.projectId === p.id);
  $('#project-detail').innerHTML = `<div class="page-head"><div class="page-title"><h1>${esc(p.name)}</h1><p>${esc(p.location || '-')}</p></div><div class="head-actions"><button class="btn outline" id="edit-project">수정</button><button class="btn danger" id="del-project">삭제</button></div></div><section class="civil-card"><h3>공정 현황</h3><div class="progress"><span style="width:${pct(p.actualProgress)}%"></span></div><p class="mini">공정률 ${p.actualProgress || 0}%</p></section><section class="section"><h3>기본 정보</h3><div class="detail-grid">${[['업무 구분', p.workKind], ['분류', p.category], ['공사 위치', p.location], ['시공사', p.contractor], ['공사비', money(p.projectCost)], ['관급자재비', money(p.govMaterialCost)], ['착공일', date(p.startDate)], ['준공일', date(p.endDate)], ['예산', budgetName(p.budgetId)]].map(([a, b]) => `<div class="field"><span>${a}</span><strong>${esc(b)}</strong></div>`).join('')}</div></section><section class="section"><div class="section-title"><h3>업체</h3><button class="btn outline" id="add-company">추가</button></div><div class="table-card"><table class="table"><thead><tr><th>구분</th><th>업체명</th><th>담당자</th><th>연락처</th><th>관리</th></tr></thead><tbody>${companies.map((c) => `<tr><td>${esc(c.type)}</td><td>${esc(c.name)}</td><td>${esc(c.manager)}</td><td>${esc(c.phone)}</td><td>${rowActions('projectCompanies', c.id)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">등록된 업체가 없습니다</td></tr>'}</tbody></table></div></section><section class="section"><div class="section-title"><h3>메모</h3><button class="btn outline" id="add-memo">추가</button></div>${memos.map((m) => `<div class="civil-card mini pre">${esc(m.content)}<br>${date(m.createdAt)}<div>${rowActions('projectMemos', m.id)}</div></div>`).join('') || '<p class="mini">메모가 없습니다</p>'}</section><section class="section"><div class="section-title"><h3>연계 공사</h3><button class="btn outline" id="add-link">추가</button></div>${links.map((id) => `<div class="civil-card mini">${projectLink(id)} <button class="link-btn danger" data-unlink="${id}">삭제</button></div>`).join('') || '<p class="mini">연계할 수 있는 공사가 없습니다</p>'}</section><section class="section"><h3>자료</h3>${files.map((f) => `<div class="civil-card mini">${esc(f.file?.name || f.name || f.fileName)} <button class="link-btn" data-download-file="${f.id}">다운로드</button></div>`).join('') || '<p class="mini">등록된 자료가 없습니다</p>'}</section>`;
  $('#edit-project').onclick = () => editProject(p.id);
  $('#del-project').onclick = () => { if (confirm('이 공사를 삭제하시겠습니까?')) { removeById('projects', p.id); selectedProject = arr('projects')[0]?.id || null; } };
  $('#add-company').onclick = () => editCompany(null, p.id);
  $('#add-memo').onclick = () => editMemo(null, p.id);
  $('#add-link').onclick = () => addLink(p.id);
  bindCrud('projectCompanies', (id) => editCompany(id, p.id)); bindCrud('projectMemos', (id) => editMemo(id, p.id));
  $$('[data-unlink]').forEach((b) => b.onclick = () => { data.linkedProjects = arr('linkedProjects').filter((x) => !(x.projectId === p.id && x.linkedProjectId === Number(b.dataset.unlink)) && !(x.linkedProjectId === p.id && x.projectId === Number(b.dataset.unlink))); save(); renderProjectDetail(); });
  $$('[data-download-file]').forEach((b) => b.onclick = () => downloadFile(Number(b.dataset.downloadFile)));
  bindRouteLinks($('#project-detail'));
}
function editCompany(id, projectId) { const old = id ? arr('projectCompanies').find((x) => x.id === id) : { id: nextId('projectCompanies'), projectId, type: '시공사' }; formModal(id ? '업체 수정' : '업체 추가', [{ name: 'type', label: '구분' }, { name: 'name', label: '업체명 *', required: true }, { name: 'manager', label: '담당자' }, { name: 'phone', label: '연락처' }, { name: 'email', label: '이메일' }], old, (out) => id ? Object.assign(old, out) : arr('projectCompanies').push({ ...out, createdAt: new Date().toISOString() })); }
function editMemo(id, projectId) { const old = id ? arr('projectMemos').find((x) => x.id === id) : { id: nextId('projectMemos'), projectId, content: '' }; formModal(id ? '메모 수정' : '메모 추가', [{ name: 'content', label: '메모', type: 'textarea', rows: 5, required: true }], old, (out) => id ? Object.assign(old, out) : arr('projectMemos').push({ ...out, createdAt: new Date().toISOString() })); }
function addLink(projectId) { const options = arr('projects').filter((p) => p.id !== projectId).map((p) => [p.id, p.name]); if (!options.length) return alert('연계할 수 있는 공사가 없습니다.'); formModal('연계할 공사 선택', [{ name: 'linkedProjectId', label: '공사', type: 'select', options }], {}, (out) => arr('linkedProjects').push({ id: nextId('linkedProjects'), projectId, linkedProjectId: Number(out.linkedProjectId), isRepresentative: false })); }
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
function todos() {
  const cards = arr('todoCards').sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  const sections = arr('todoSections');
  const items = arr('todoItems').sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  const openItems = items.filter((item) => !item.done);
  const doneItems = items.filter((item) => item.done);
  const completion = items.length ? Math.round(doneItems.length / items.length * 100) : 0;
  const recentOpen = openItems.slice(0, 6);
  view.innerHTML = `<div class="workplace-shell">
    <section class="workplace-hero">
      <div>
        <p class="workspace-kicker">Operations Workspace</p>
        <h1>해야 할 일</h1>
        <p>카드와 섹션을 유지하면서 오늘 처리할 항목을 빠르게 찾고 완료 상태를 관리합니다.</p>
      </div>
      <div class="hero-actions">
        <button id="add-card" class="btn secondary">카드 추가</button>
        <button id="quick-item" class="btn">빠른 할 일 추가</button>
      </div>
    </section>
    <section class="workspace-metrics">
      <article><span>전체 업무</span><strong>${items.length}</strong><small>${cards.length}개 카드</small></article>
      <article><span>진행중</span><strong>${openItems.length}</strong><small>완료 전 항목</small></article>
      <article><span>완료</span><strong>${doneItems.length}</strong><small>${completion}% 처리</small></article>
      <article><span>섹션</span><strong>${sections.length}</strong><small>업무 흐름 단위</small></article>
    </section>
    <section class="todo-commandbar">
      <div class="search enterprise-search"><input id="todo-query" placeholder="할 일, 섹션, 카드명 검색"></div>
      <div class="segmented" id="todo-filter">
        <button class="active" data-state="all">전체</button>
        <button data-state="open">진행중</button>
        <button data-state="done">완료</button>
      </div>
    </section>
    <section class="focus-strip">
      <div class="focus-head"><span>지금 볼 항목</span><strong>${recentOpen.length ? '진행중 업무' : '대기 업무 없음'}</strong></div>
      <div class="focus-list">${recentOpen.map((item) => todoFocusItem(item)).join('') || '<p class="muted">모든 할 일이 완료되었습니다.</p>'}</div>
    </section>
    <section id="todo-board" class="enterprise-board"></section>
  </div>`;

  const editCard = (id) => {
    const old = id ? arr('todoCards').find((x) => x.id === id) : { id: nextId('todoCards'), title: '', displayOrder: arr('todoCards').length + 1 };
    formModal(id ? '카드 수정' : '카드 추가', [{ name: 'title', label: '제목 *', required: true }], old, (out) => id ? Object.assign(old, out) : arr('todoCards').push({ ...out, createdAt: new Date().toISOString() }));
  };
  const editSection = (id, cardId) => {
    const old = id ? arr('todoSections').find((x) => x.id === id) : { id: nextId('todoSections'), cardId, title: '', displayOrder: 0 };
    formModal(id ? '섹션 수정' : '섹션 추가', [{ name: 'title', label: '제목 *', required: true }], old, (out) => id ? Object.assign(old, out) : arr('todoSections').push({ ...out, createdAt: new Date().toISOString() }));
  };
  const editItem = (id, sectionId) => {
    const old = id ? arr('todoItems').find((x) => x.id === id) : { id: nextId('todoItems'), sectionId, content: '', done: false, displayOrder: arr('todoItems').filter((item) => item.sectionId === sectionId).length + 1 };
    formModal(id ? '할 일 수정' : '할 일 추가', [{ name: 'content', label: '내용 *', required: true }, { name: 'done', label: '완료', type: 'checkbox' }], old, (out) => id ? Object.assign(old, out) : arr('todoItems').push({ ...out, createdAt: new Date().toISOString() }));
  };
  const quickItem = () => {
    const firstSection = arr('todoSections')[0];
    if (!firstSection) return alert('먼저 섹션을 추가하세요.');
    editItem(null, firstSection.id);
  };
  const drawBoard = () => {
    const query = $('#todo-query').value.trim().toLowerCase();
    const state = $('#todo-filter .active').dataset.state;
    $('#todo-board').innerHTML = cards.map((card) => {
      const cardSections = sections.filter((section) => section.cardId === card.id).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      const renderedSections = cardSections.map((section) => {
        const sectionItems = items.filter((item) => item.sectionId === section.id)
          .filter((item) => state === 'all' || (state === 'open' ? !item.done : item.done))
          .filter((item) => !query || `${card.title} ${section.title} ${item.content}`.toLowerCase().includes(query));
        if (!sectionItems.length && query) return '';
        const doneCount = sectionItems.filter((item) => item.done).length;
        return `<article class="workstream">
          <header><div><span>${esc(card.title)}</span><h3>${esc(section.title)}</h3></div><div class="stream-actions"><small>${doneCount}/${sectionItems.length}</small><button class="link-btn" data-add-section="${card.id}">섹션</button>${rowActions('todoSections', section.id)}${rowActions('todoCards', card.id)}</div></header>
          <div class="work-items">${sectionItems.map((item) => todoCardItem(item)).join('') || '<p class="muted">표시할 항목이 없습니다.</p>'}</div>
          <button class="add-inline" data-add-item="${section.id}">+ 할 일 추가</button>
        </article>`;
      }).join('');
      if (!renderedSections.trim() && query) return '';
      return renderedSections || `<article class="workstream empty-stream"><header><div><span>${esc(card.title)}</span><h3>섹션 없음</h3></div><div class="stream-actions">${rowActions('todoCards', card.id)}</div></header><button class="add-inline" data-add-section="${card.id}">+ 섹션 추가</button></article>`;
    }).join('') || '<div class="empty-state">검색 결과가 없습니다.</div>';
    bindTodoActions(editCard, editSection, editItem);
  };
  const bindTodoActions = (editCardFn, editSectionFn, editItemFn) => {
    bindCrud('todoCards', editCardFn);
    bindCrud('todoSections', editSectionFn);
    bindCrud('todoItems', editItemFn);
    $$('[data-add-section]').forEach((b) => b.onclick = () => editSectionFn(null, Number(b.dataset.addSection)));
    $$('[data-add-item]').forEach((b) => b.onclick = () => editItemFn(null, Number(b.dataset.addItem)));
    $$('[data-toggle-item]').forEach((b) => b.onclick = () => {
      const item = arr('todoItems').find((x) => x.id === Number(b.dataset.toggleItem));
      item.done = !item.done;
      save();
      todos();
    });
  };
  $('#add-card').onclick = () => editCard();
  $('#quick-item').onclick = quickItem;
  $('#todo-query').oninput = drawBoard;
  $$('#todo-filter button').forEach((button) => button.onclick = () => {
    $$('#todo-filter button').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    drawBoard();
  });
  drawBoard();
}
function todoFocusItem(item) {
  const section = arr('todoSections').find((entry) => entry.id === item.sectionId);
  const card = section ? arr('todoCards').find((entry) => entry.id === section.cardId) : null;
  return `<button class="focus-item" data-toggle-item="${item.id}"><span></span><div><strong>${esc(item.content)}</strong><small>${esc(card?.title || '카드 없음')} · ${esc(section?.title || '섹션 없음')}</small></div></button>`;
}
function todoCardItem(item) {
  const section = arr('todoSections').find((entry) => entry.id === item.sectionId);
  return `<div class="enterprise-task ${item.done ? 'is-done' : ''}">
    <button class="task-check" data-toggle-item="${item.id}">${item.done ? '✓' : ''}</button>
    <div class="task-copy"><strong>${esc(item.content)}</strong><small>${esc(section?.title || '')}</small></div>
    <div class="task-actions">${rowActions('todoItems', item.id)}</div>
  </div>`;
}
function files() {
  view.innerHTML = `<div class="narrow">${pageHead('자료실', `총 ${arr('files').length}개 파일`, '<button id="add-file" class="btn">파일 업로드</button>')}<div class="cards">${arr('files').map((f) => `<article class="civil-card"><h3>${esc(f.file?.name || f.fileName || f.name)}</h3><p class="mini">${esc(f.category || '기타')} · ${projectLink(f.projectId)}<br>${esc(f.description || '')}<br>${date(f.createdAt || f.uploadedAt)}</p><button class="link-btn" data-download-file="${f.id}">다운로드</button> ${rowActions('files', f.id)}</article>`).join('') || '<div class="empty civil-card">파일이 없습니다.</div>'}</div></div>`;
  const editFile = (id) => { const old = id ? arr('files').find((x) => x.id === id) : { id: nextId('files'), category: '기타', projectId: null }; formModal(id ? '파일 수정' : '파일 업로드', [{ name: 'file', label: '파일 선택', type: 'file', required: !id }, { name: 'category', label: '분류' }, { name: 'projectId', label: '관련 공사', type: 'select', options: projectOptions() }, { name: 'description', label: '설명', type: 'textarea' }], old, (out) => { out.projectId = nullableNumber(out.projectId); out.fileName = out.file?.name || old.fileName; out.size = out.file?.size || old.size; id ? Object.assign(old, out) : arr('files').push({ ...out, createdAt: new Date().toISOString() }); }); };
  $('#add-file').onclick = () => editFile(); bindCrud('files', editFile); $$('[data-download-file]').forEach((b) => b.onclick = () => downloadFile(Number(b.dataset.downloadFile))); bindRouteLinks(view);
}
function downloadFile(id) { const f = arr('files').find((x) => x.id === id); if (!f?.file?.dataUrl) return alert('저장된 파일 데이터가 없습니다.'); const a = document.createElement('a'); a.href = f.file.dataUrl; a.download = f.file.name || f.fileName || 'download'; a.click(); }
function contacts() { simpleTable({ type: 'contacts', title: '업체/연락처', addText: '연락처 추가', placeholder: '업체명, 담당자, 전화번호 검색...', heads: ['구분', '업체명', '담당자', '전화번호', '이메일', '메모'], fields: ['type', 'name', 'manager', 'phone', 'email', 'note'], row: (x) => [pill(x.type || '기타', 'blue'), esc(x.name), esc(x.manager), esc(x.phone), esc(x.email), esc(x.note)], defaults: { type: '기타' }, formFields: () => [{ name: 'type', label: '구분 *', required: true }, { name: 'name', label: '업체명 *', required: true }, { name: 'manager', label: '담당자' }, { name: 'phone', label: '전화번호' }, { name: 'email', label: '이메일', type: 'email' }, { name: 'department', label: '부서/주소' }, { name: 'note', label: '메모', type: 'textarea' }] }); }
function chatbot() {
  view.innerHTML = `<div class="narrow">${pageHead('AI 어시스턴트', '공사 관련 질문에 답변하는 AI 챗봇')}<div class="chat civil-card"><div id="chat-log" class="chat-log"><div class="bot">백업 데이터 기준으로 검색하고 요약합니다. 예: 진행중 공사, 예산, 못골시장, 오늘 일정</div></div><form id="chat-form" class="chat-form"><input id="chat-input" placeholder="질문을 입력하세요"><button class="btn">전송</button></form></div></div>`;
  $('#chat-form').onsubmit = (e) => { e.preventDefault(); const q = $('#chat-input').value.trim(); if (!q) return; $('#chat-input').value = ''; const log = $('#chat-log'); log.insertAdjacentHTML('beforeend', `<div class="user">${esc(q)}</div><div class="bot">${esc(answer(q))}</div>`); log.scrollTop = log.scrollHeight; };
}
function answer(q) { const s = q.toLowerCase(); if (s.includes('진행')) return arr('projects').filter((p) => p.status === '진행중').map((p) => `${p.name} (${p.actualProgress || 0}%)`).join('\n') || '진행중 공사가 없습니다.'; if (s.includes('예산')) return arr('budgets').map((b) => `${b.name}: ${money(arr('budgetParts').filter((p) => p.budgetId === b.id).reduce((a, p) => a + Number(p.amount || 0), 0))}`).join('\n'); if (s.includes('일정') || s.includes('오늘')) return arr('schedules').map((x) => `${date(x.date)} ${x.title}`).join('\n') || '일정이 없습니다.'; const found = arr('projects').filter((p) => `${p.name} ${p.location} ${p.contractor}`.toLowerCase().includes(s)); return found.length ? found.map((p) => `${p.name}\n위치: ${p.location || '-'}\n업체: ${p.contractor || '-'}\n상태: ${p.status || '-'}\n공정률: ${p.actualProgress || 0}%`).join('\n\n') : '관련 데이터를 찾지 못했습니다.'; }
function backup() {
  view.innerHTML = `<div class="backup-card">${pageHead('백업 / 복구', '데이터를 JSON 파일로 백업하거나 복구합니다.')}<div class="civil-card section"><h3>데이터 백업</h3><p class="mini">현재 저장된 모든 데이터를 JSON 파일로 내보냅니다.</p><button id="export" class="btn">백업 파일 다운로드</button></div><div class="civil-card section"><h3>데이터 복구</h3><p class="mini">백업 JSON 파일을 업로드하여 데이터를 복구합니다.</p><div class="warning"><b>주의:</b> 복구 시 현재 브라우저 저장 데이터가 백업 파일의 데이터로 대체됩니다.</div><input id="import-file" type="file" accept=".json" hidden><button id="import" class="btn outline">백업 파일 선택</button></div><div class="civil-card section"><h3>초기화</h3><p class="mini">첨부된 원본 JSON 백업 상태로 되돌립니다.</p><button id="reset" class="btn danger">원본 백업으로 초기화</button></div></div>`;
  $('#export').onclick = () => { const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `civil-work-backup-${today()}.json`; a.click(); URL.revokeObjectURL(a.href); };
  $('#import').onclick = () => $('#import-file').click(); $('#import-file').onchange = async (e) => { const file = e.target.files[0]; if (!file || !confirm('현재 데이터를 덮어씁니다. 계속하시겠습니까?')) return; data = JSON.parse(await file.text()); save(); renderNav(); render(); };
  $('#reset').onclick = async () => { if (!confirm('원본 백업으로 초기화할까요?')) return; localStorage.removeItem(STORE_KEY); data = await fetch(DATA_URL).then((r) => r.json()); save(); renderNav(); render(); };
}

function settingsPage() {
  const storageSize = new Blob([JSON.stringify(data)]).size;
  view.innerHTML = `<div class="backup-card">${pageHead('설정', '화면 표시와 로컬 저장 데이터를 관리합니다.')}<div class="civil-card section"><h3>사용자 설정</h3><div class="settings-grid"><label class="form-field"><span>표시 이름</span><input id="setting-name" value="${esc(settings.adminName || '관리자')}"></label><label class="form-field"><span>화면 밀도</span><select id="setting-density"><option value="comfortable" ${settings.density !== 'compact' ? 'selected' : ''}>기본</option><option value="compact" ${settings.density === 'compact' ? 'selected' : ''}>촘촘하게</option></select></label><label class="form-field"><span>테마</span><select id="setting-theme"><option value="light" ${settings.theme !== 'dark' ? 'selected' : ''}>밝게</option><option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>어둡게</option></select></label></div><button id="save-settings" class="btn">설정 저장</button></div><div class="civil-card section"><h3>저장소 상태</h3><p class="mini">브라우저 로컬 저장소 사용량: ${Math.round(storageSize / 1024)}KB<br>프로젝트 ${arr('projects').length}건, 민원 ${arr('complaints').length}건, 협의 ${arr('consultations').length}건, 일정 ${arr('schedules').length}건</p><button id="settings-export" class="btn outline">현재 데이터 백업</button> <button id="settings-reset" class="btn danger">원본 백업으로 초기화</button></div></div>`;
  $('#save-settings').onclick = () => { settings = { adminName: $('#setting-name').value.trim() || '관리자', density: $('#setting-density').value, theme: $('#setting-theme').value }; saveSettings(); renderNav(); render(); };
  $('#settings-export').onclick = () => { const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `civil-work-backup-${today()}.json`; a.click(); URL.revokeObjectURL(a.href); };
  $('#settings-reset').onclick = async () => { if (!confirm('원본 백업으로 초기화할까요?')) return; localStorage.removeItem(STORE_KEY); data = await fetch(DATA_URL).then((r) => r.json()); save(); renderNav(); render(); };
}

async function init() { try { const stored = localStorage.getItem(STORE_KEY); data = stored ? JSON.parse(stored) : await fetch(DATA_URL).then((r) => r.json()); applySettings(); save(); renderNav(); render(); } catch (e) { view.innerHTML = '<div class="empty">로딩 중 오류가 발생했습니다.</div>'; console.error(e); } }
window.addEventListener('hashchange', () => { route = location.hash.replace('#', '') || '/'; renderNav(); render(); });
init();
