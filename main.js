const DATA_URL = 'civil-work-backup-2026-05-25.json';
function todos() {
  // Kanban-style todo view: columns = sections, quick inline add, persistent filters
  const cards = arr('todoCards').sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  const sections = arr('todoSections').sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  const items = arr('todoItems').sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  view.innerHTML = `<div class="workplace-shell task-list-shell">
    <section class="workplace-hero">
      <div>
        <p class="workspace-kicker">Operations Workspace</p>
        <h1>해야 할 일</h1>
        <p>칸반형 보기로 분류별 업무를 빠르게 확인하고 추가할 수 있습니다. (단축키: N = 빠른 추가)</p>
      </div>
      <div class="hero-actions">
        <button id="add-card" class="btn secondary">업무 묶음 추가</button>
        <button id="add-section" class="btn outline light-action">분류 추가</button>
        <button id="reset-filters" class="btn">필터 초기화</button>
      </div>
    </section>

    <section class="todo-commandbar">
      <div class="search enterprise-search"><input id="todo-query" placeholder="할 일 내용, 묶음, 분류로 검색"></div>
      <select id="todo-group" class="control-select"><option value="all">전체 묶음</option>${cards.map((card) => `<option value="${card.id}">${esc(card.title)}</option>`).join('')}</select>
      <div class="segmented" id="todo-filter">
        <button class="active" data-state="all">전체</button>
        <button data-state="open">진행중</button>
        <button data-state="done">완료</button>
      </div>
    </section>

    <section class="kanban" id="kanban-board">
      ${sections.length ? sections.map((s) => `<div class="kanban-column" data-section="${s.id}"><div class="column-head"><strong>${esc(s.title)}</strong><small>${esc(cards.find(c=>c.id===s.cardId)?.title||'묶음 없음')}</small></div><div class="column-body" id="col-${s.id}"></div><div class="column-footer"><button class="btn outline inline-add" data-add-item="${s.id}">+ 할 일 추가</button></div></div>`).join('') : `<div class="empty-state">분류가 없습니다. 분류를 추가해 주세요.</div>`}
    </section>
  </div>`;

  const editCard = (id) => { const old = id ? arr('todoCards').find((x) => x.id === id) : { id: nextId('todoCards'), title: '', displayOrder: arr('todoCards').length + 1 }; formModal(id ? '업무 묶음 수정' : '업무 묶음 추가', [{ name: 'title', label: '제목 *', required: true }], old, (out) => id ? Object.assign(old, out) : arr('todoCards').push({ ...out, createdAt: new Date().toISOString() })); };
  const editSection = (id, cardId) => { const old = id ? arr('todoSections').find((x) => x.id === id) : { id: nextId('todoSections'), cardId, title: '', displayOrder: 0 }; formModal(id ? '분류 수정' : '분류 추가', [{ name: 'cardId', label: '업무 묶음', type: 'select', options: cards.map((card) => [card.id, card.title]) }, { name: 'title', label: '제목 *', required: true }], old, (out) => { out.cardId = Number(out.cardId); id ? Object.assign(old, out) : arr('todoSections').push({ ...out, createdAt: new Date().toISOString() }); }); };
  const editItem = (id, sectionId) => { const old = id ? arr('todoItems').find((x) => x.id === id) : { id: nextId('todoItems'), sectionId, content: '', done: false, displayOrder: arr('todoItems').filter((item) => item.sectionId === sectionId).length + 1 }; formModal(id ? '할 일 수정' : '할 일 추가', [{ name: 'sectionId', label: '분류', type: 'select', options: arr('todoSections').map((section) => { const card = cards.find((entry) => entry.id === section.cardId); return [section.id, `${card?.title || '묶음 없음'} / ${section.title}`]; }) }, { name: 'content', label: '내용 *', required: true }, { name: 'done', label: '완료', type: 'checkbox' }], old, (out) => { out.sectionId = Number(out.sectionId); id ? Object.assign(old, out) : arr('todoItems').push({ ...out, createdAt: new Date().toISOString() }); }); };

  function renderKanban() {
    const q = $('#todo-query').value.trim().toLowerCase();
    const state = $('#todo-filter .active').dataset.state;
    const group = $('#todo-group').value;
    const pool = arr('todoItems');
    sections.forEach((s) => {
      const container = $(`#col-${s.id}`);
      if (!container) return;
      const rows = pool.filter((item) => item.sectionId === s.id)
        .filter((it) => state === 'all' || (state === 'open' ? !it.done : it.done))
        .filter((it) => group === 'all' || String((arr('todoSections').find(sec=>sec.id===it.sectionId)||{}).cardId) === group)
        .filter((it) => !q || `${it.content}`.toLowerCase().includes(q));
      container.innerHTML = rows.map((item) => `<div class="kanban-card ${item.done ? 'is-done' : ''}" data-item="${item.id}"><button class="task-check" data-toggle-item="${item.id}">${item.done ? '✓' : ''}</button><div class="card-body"><strong>${esc(item.content)}</strong><div class="card-meta">${esc(arr('todoSections').find(sec=>sec.id===item.sectionId)?.title||'분류 없음')}</div></div><div class="card-actions">${rowActions('todoItems', item.id)}</div></div>`).join('') || `<div class="empty-state mini">등록된 할 일이 없습니다.</div>`;
    });
    bindKanbanActions();
  }

  function bindKanbanActions() {
    // toggle done
    $$('[data-toggle-item]').forEach((b) => b.onclick = () => {
      const item = arr('todoItems').find((x) => x.id === Number(b.dataset.toggleItem));
      if (!item) return; item.done = !item.done; save(); renderKanban();
    });
    // inline add
    $$('[data-add-item]').forEach((b) => b.onclick = () => editItem(null, Number(b.dataset.addItem)));
    // row edit/delete
    bindCrud('todoItems', (id) => editItem(id));
    // refresh after modals
    bindRouteLinks(view);
  }

  $('#add-card').onclick = () => editCard();
  $('#add-section').onclick = () => editSection();
  $('#reset-filters').onclick = () => { $('#todo-query').value = ''; $('#todo-group').value = 'all'; $$('#todo-filter button').forEach((b) => b.classList.remove('active')); $$('#todo-filter button')[0].classList.add('active'); renderKanban(); };
  $('#todo-query').oninput = renderKanban;
  $('#todo-group').onchange = renderKanban;
  $$('#todo-filter button').forEach((button) => button.onclick = () => { $$('#todo-filter button').forEach((item) => item.classList.remove('active')); button.classList.add('active'); renderKanban(); });

  // keyboard shortcut: N for quick add (focus search or quick add modal)
  window.onkeydown = (e) => { if (e.key.toLowerCase() === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); const firstSection = arr('todoSections')[0]; if (firstSection) editItem(null, firstSection.id); else editSection(); } };

  renderKanban();
}
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
  const budgetRate = totalBudget ? Math.round(executed / totalBudget * 100) : 0;
  const projectTotal = arr('projects').length;
  const projectRate = projectTotal ? Math.round(active / projectTotal * 100) : 0;
  const todoTotal = arr('todoItems').length;
  const todoDone = arr('todoItems').filter((t) => t.done).length;
  const todoRate = todoTotal ? Math.round(todoDone / todoTotal * 100) : 0;
  const riskRate = Math.min(100, riskCount * 18);
  const summary = riskCount ? `${riskCount}건의 주의 항목을 먼저 확인하세요.` : '긴급 위험 없이 안정적으로 관리 중입니다.';
  view.innerHTML = `<div class="dashboard-wrap refreshed-dashboard">
    <section class="dashboard-hero">
      <div>
        <p class="workspace-kicker">Civil Operations</p>
        <h1>오늘의 업무 현황</h1>
        <p>${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })} · ${summary}</p>
      </div>
      <div class="hero-actions">
        <button class="btn secondary" data-go="/tips">사용팁</button>
        <button class="btn outline light-action" data-go="/schedules">일정 보기</button>
        <button id="print" class="btn">PDF 다운로드</button>
      </div>
    </section>
    <section class="quick-actions">
      <button data-go="/projects"><span>공사</span><strong>진행 현장 확인</strong></button>
      <button data-go="/complaints"><span>민원</span><strong>미처리 ${openComplaints.length}건</strong></button>
      <button data-go="/consultations"><span>협의</span><strong>회신 대기 ${openConsultations.length}건</strong></button>
      <button data-go="/backup"><span>데이터</span><strong>백업/복구</strong></button>
    </section>
    <section class="gauge-grid">
      ${gaugeCard('주의 필요', riskRate, riskCount, '지연·마감·예산 위험', '/complaints', 'danger')}
      ${gaugeCard('공사 가동률', projectRate, `${active}/${projectTotal}`, `지연 ${delayedProjects.length}건 포함`, '/projects', 'blue')}
      ${gaugeCard('할 일 완료율', todoRate, `${todoRate}%`, `미완료 ${undone}건`, '/todos', 'green')}
      ${gaugeCard('예산 집행률', budgetRate, `${budgetRate}%`, `${shortMoney(executed)} / ${shortMoney(totalBudget)}원`, '/executions', budgetRate >= 90 ? 'warning' : 'navy')}
    </section>
    <div class="grid dashboard-grid">
      <section class="civil-card dashboard-panel priority-panel"><div class="panel-head"><h3>우선 처리</h3><button class="link-btn" data-go="/complaints">민원 보기</button></div>${dueItems.length ? dueItems.slice(0, 7).map((x) => `<button class="work-row ${x.remain <= 0 ? 'hot' : ''}" data-go="${x.route}"><span class="work-kind">${x.kind}</span><span class="work-title">${esc(x.title)}</span><span class="work-meta">${dueLabel(x.remain)} · ${esc(x.status || '-')}</span></button>`).join('') : '<p class="mini strong-empty">7일 이내 마감 민원·협의가 없습니다.</p>'}</section>
      <section class="civil-card dashboard-panel"><div class="panel-head"><h3>공사 위험</h3><button class="link-btn" data-go="/projects">공사 보기</button></div>${delayedProjects.length ? delayedProjects.slice(0, 5).map((p) => `<button class="work-row hot" data-project="${p.id}"><span class="work-kind">지연</span><span class="work-title">${esc(p.name)}</span><span class="work-meta">${date(p.endDate)} · 공정률 ${p.actualProgress || 0}%</span></button>`).join('') : '<p class="mini strong-empty">준공일이 지난 진행중 공사가 없습니다.</p>'}</section>
      <section class="civil-card dashboard-panel"><div class="panel-head"><h3>이번 주 일정</h3><button class="link-btn" data-go="/schedules">일정 보기</button></div>${upcomingSchedules.length ? upcomingSchedules.map((s) => `<button class="work-row" data-go="/schedules"><span class="work-kind">${dueLabel(s.remain)}</span><span class="work-title">${esc(s.title)}</span><span class="work-meta">${date(s.date || s.startDate)} · ${esc(s.location || '-')}</span></button>`).join('') : '<p class="mini strong-empty">이번 주 등록된 일정이 없습니다.</p>'}</section>
      <section class="civil-card dashboard-panel"><div class="panel-head"><h3>예산 집행</h3><button class="link-btn" data-go="/budgets">예산 보기</button></div>${budgetRows.length ? budgetRows.slice(0, 6).map((b) => `<div class="budget-row"><div class="budget-top"><strong>${esc(b.name)}</strong><span class="${b.rate >= 100 ? 'rate danger' : b.rate >= 90 ? 'rate warn' : 'rate'}">${b.rate}%</span></div><div class="progress"><span style="width:${pct(b.rate)}%"></span></div><p class="mini">잔액 ${money(b.left)} · 집행 ${money(b.used)}</p></div>`).join('') : '<p class="mini strong-empty">등록된 예산이 없습니다.</p>'}</section>
    </div>
  </div>`;
  bindRouteLinks(view);
  $('#print').onclick = () => window.print();
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
  const statuses = ['전체', ...new Set(arr('projects').map((p) => p.status).filter(Boolean))];
  const categories = ['전체', ...new Set(arr('projects').map((p) => p.category || p.workKind).filter(Boolean))];
  const active = arr('projects').filter((p) => p.status === '진행중').length;
  const delayed = arr('projects').filter((p) => p.status === '진행중' && daysFromToday(p.endDate) !== null && daysFromToday(p.endDate) < 0).length;
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
      .filter((p) => !riskOnly || (p.status === '진행중' && daysFromToday(p.endDate) !== null && daysFromToday(p.endDate) < 0))
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
      const due = remain === null ? '기한 없음' : remain < 0 ? `${Math.abs(remain)}일 지연` : remain === 0 ? '오늘 준공' : `D-${remain}`;
      return `<button class="list-item project-list-item ${p.id === selectedProject ? 'active' : ''} ${remain !== null && remain < 0 && p.status === '진행중' ? 'is-risk' : ''}" data-id="${p.id}"><div class="item-top"><div class="item-name">${esc(p.name)}</div>${pill(p.status, statusColor(p.status))}</div><div class="project-list-meta"><span>${esc(p.category || p.workKind || '분류 없음')}</span><span>${esc(p.location || '-')}</span><span>${due}</span></div><div class="project-progress-row"><div class="progress"><span style="width:${pct(p.actualProgress)}%"></span></div><strong>${pct(p.actualProgress)}%</strong></div></button>`;
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
  view.innerHTML = `<div class="workplace-shell task-list-shell">
    <section class="workplace-hero">
      <div>
        <p class="workspace-kicker">Operations Workspace</p>
        <h1>해야 할 일</h1>
        <p>업무를 목록, 상태, 분류 기준으로 빠르게 정리합니다.</p>
      </div>
      <div class="hero-actions">
        <button id="add-card" class="btn secondary">업무 묶음 추가</button>
        <button id="add-section" class="btn outline light-action">분류 추가</button>
        <button id="quick-item" class="btn">빠른 할 일 추가</button>
      </div>
    </section>
    <section class="workspace-metrics">
      <article><span>전체 업무</span><strong>${items.length}</strong><small>${cards.length}개 묶음</small></article>
      <article><span>진행중</span><strong>${openItems.length}</strong><small>완료 전 항목</small></article>
      <article><span>완료</span><strong>${doneItems.length}</strong><small>${completion}% 처리</small></article>
      <article><span>분류</span><strong>${sections.length}</strong><small>업무 정리 단위</small></article>
    </section>
    <section class="todo-commandbar">
      <div class="search enterprise-search"><input id="todo-query" placeholder="할 일, 분류, 업무 묶음 검색"></div>
      <select id="todo-group" class="control-select"><option value="all">전체 묶음</option>${cards.map((card) => `<option value="${card.id}">${esc(card.title)}</option>`).join('')}</select>
      <div class="segmented" id="todo-filter">
        <button class="active" data-state="all">전체</button>
        <button data-state="open">진행중</button>
        <button data-state="done">완료</button>
      </div>
    </section>
    <section class="task-layout">
      <aside class="task-groups" id="task-groups"></aside>
      <section class="task-table-card">
        <div class="table-card"><table class="table task-table"><thead><tr><th>상태</th><th>업무</th><th>묶음 / 분류</th><th>관리</th></tr></thead><tbody id="todo-list"></tbody></table></div>
      </section>
    </section>
  </div>`;

  const editCard = (id) => {
    const old = id ? arr('todoCards').find((x) => x.id === id) : { id: nextId('todoCards'), title: '', displayOrder: arr('todoCards').length + 1 };
    formModal(id ? '업무 묶음 수정' : '업무 묶음 추가', [{ name: 'title', label: '제목 *', required: true }], old, (out) => id ? Object.assign(old, out) : arr('todoCards').push({ ...out, createdAt: new Date().toISOString() }));
  };
  const editSection = (id, cardId) => {
    const old = id ? arr('todoSections').find((x) => x.id === id) : { id: nextId('todoSections'), cardId, title: '', displayOrder: 0 };
    formModal(id ? '분류 수정' : '분류 추가', [{ name: 'cardId', label: '업무 묶음', type: 'select', options: cards.map((card) => [card.id, card.title]) }, { name: 'title', label: '제목 *', required: true }], old, (out) => { out.cardId = Number(out.cardId); id ? Object.assign(old, out) : arr('todoSections').push({ ...out, createdAt: new Date().toISOString() }); });
  };
  const editItem = (id, sectionId) => {
    const old = id ? arr('todoItems').find((x) => x.id === id) : { id: nextId('todoItems'), sectionId, content: '', done: false, displayOrder: arr('todoItems').filter((item) => item.sectionId === sectionId).length + 1 };
    formModal(id ? '할 일 수정' : '할 일 추가', [{ name: 'sectionId', label: '분류', type: 'select', options: sections.map((section) => { const card = cards.find((entry) => entry.id === section.cardId); return [section.id, `${card?.title || '묶음 없음'} / ${section.title}`]; }) }, { name: 'content', label: '내용 *', required: true }, { name: 'done', label: '완료', type: 'checkbox' }], old, (out) => { out.sectionId = Number(out.sectionId); id ? Object.assign(old, out) : arr('todoItems').push({ ...out, createdAt: new Date().toISOString() }); });
  };
  const addSection = () => {
    const card = cards[0];
    if (!card) return alert('먼저 업무 묶음을 추가하세요.');
    editSection(null, card.id);
  };
  const quickItem = () => {
    const firstSection = arr('todoSections')[0];
    if (!firstSection) return alert('먼저 분류를 추가하세요.');
    editItem(null, firstSection.id);
  };
  const drawList = () => {
    const query = $('#todo-query').value.trim().toLowerCase();
    const state = $('#todo-filter .active').dataset.state;
    const group = $('#todo-group').value;
    const rows = items.map((item) => {
      const section = sections.find((entry) => entry.id === item.sectionId);
      const card = section ? cards.find((entry) => entry.id === section.cardId) : null;
      return { item, section, card };
    }).filter(({ item, section, card }) => state === 'all' || (state === 'open' ? !item.done : item.done))
      .filter(({ section }) => group === 'all' || String(section?.cardId) === group)
      .filter(({ item, section, card }) => !query || `${item.content} ${section?.title || ''} ${card?.title || ''}`.toLowerCase().includes(query));
    $('#todo-list').innerHTML = rows.map(({ item, section, card }) => todoListRow(item, section, card)).join('') || '<tr><td colspan="4" class="muted">조건에 맞는 할 일이 없습니다.</td></tr>';
    $('#task-groups').innerHTML = sections.map((section) => {
      const card = cards.find((entry) => entry.id === section.cardId);
      const sectionItems = items.filter((item) => item.sectionId === section.id);
      const done = sectionItems.filter((item) => item.done).length;
      const rate = sectionItems.length ? Math.round(done / sectionItems.length * 100) : 0;
      return `<article class="task-group-row"><div><span>${esc(card?.title || '묶음 없음')}</span><strong>${esc(section.title)}</strong></div><small>${done}/${sectionItems.length}</small><div class="progress"><span style="width:${rate}%"></span></div><div class="stream-actions"><button class="link-btn" data-add-item="${section.id}">할 일</button>${rowActions('todoSections', section.id)}</div></article>`;
    }).join('') || '<div class="empty-state">분류가 없습니다.</div>';
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
  $('#add-section').onclick = addSection;
  $('#quick-item').onclick = quickItem;
  $('#todo-query').oninput = drawList;
  $('#todo-group').onchange = drawList;
  $$('#todo-filter button').forEach((button) => button.onclick = () => {
    $$('#todo-filter button').forEach((item) => item.classList.remove('active'));
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
function todoListRow(item, section, card) {
  return `<tr class="${item.done ? 'task-row-done' : ''}">
    <td><button class="task-check list-check" data-toggle-item="${item.id}">${item.done ? '✓' : ''}</button></td>
    <td><strong>${esc(item.content)}</strong></td>
    <td><span class="task-path">${esc(card?.title || '묶음 없음')} / ${esc(section?.title || '분류 없음')}</span></td>
    <td>${rowActions('todoItems', item.id)}</td>
  </tr>`;
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
  $('#settings-export').onclick = () => { const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `civil-work-backup-${today()}.json`; a.click(); URL.revokeObjectURL(a.href); };
  $('#settings-reset').onclick = async () => { if (!confirm('원본 백업으로 초기화할까요?')) return; localStorage.removeItem(STORE_KEY); data = await fetch(DATA_URL).then((r) => r.json()); save(); renderNav(); render(); };
}

async function init() { try { const stored = localStorage.getItem(STORE_KEY); data = stored ? JSON.parse(stored) : await fetch(DATA_URL).then((r) => r.json()); applySettings(); save(); renderNav(); render(); } catch (e) { view.innerHTML = '<div class="empty">로딩 중 오류가 발생했습니다.</div>'; console.error(e); } }
window.addEventListener('hashchange', () => { route = location.hash.replace('#', '') || '/'; renderNav(); render(); });
init();
