const state = {
  route: 'overview',
  overview: null,
  skillsState: null,
  runsState: null,
  skillQuery: '',
  runQuery: '',
};

const navButtons = [...document.querySelectorAll('.nav-pill')];
const pageViews = {
  overview: document.getElementById('overview-view'),
  skills: document.getElementById('skills-view'),
  runs: document.getElementById('runs-view'),
};
const drawer = document.getElementById('detail-drawer');
const drawerContent = document.getElementById('drawer-content');

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTime(iso) {
  if (!iso) return 'Unknown time';
  const date = new Date(iso);
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function tagChip(tag, count = null) {
  return `
    <span class="tag-chip">
      <strong>${escapeHtml(tag.name)}</strong>
      <span>${escapeHtml(tag.type || '')}${count == null ? '' : ` · ${count}`}</span>
    </span>
  `;
}

function statusPill(run) {
  const status = run.status === 'failed' ? 'failed' : (run.status === 'success' ? 'success' : 'pending');
  const label = status === 'failed'
    ? `Failed${run.failureStage ? ` · ${run.failureStage}` : ''}`
    : (status === 'success' ? 'Success' : 'Pending');
  return `<span class="status-pill ${status}">${escapeHtml(label)}</span>`;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${url}`);
  return res.json();
}

function renderOverview() {
  const target = pageViews.overview;
  const overview = state.overview;
  if (!overview) return;

  const metrics = [
    { label: 'Skills', value: overview.counts.skills, note: `${overview.sourceLabel} currently available` },
    { label: 'Tags', value: overview.counts.tags, note: 'High-signal tags only' },
    { label: 'Runs', value: overview.counts.runs, note: 'Visible clean run records' },
    { label: 'Healthy', value: overview.counts.successfulRuns, note: 'Successful visible runs' },
  ];

  target.innerHTML = `
    <div class="grid-cards">
      ${metrics.map((metric) => `
        <article class="card metric-card">
          <p class="eyebrow">${escapeHtml(metric.label)}</p>
          <div class="metric-value">${escapeHtml(metric.value)}</div>
          <p class="metric-note">${escapeHtml(metric.note)}</p>
        </article>
      `).join('')}
    </div>

    <div class="content-grid">
      <section class="card">
        <div class="section-head">
          <div>
            <p class="eyebrow">Tag pulse</p>
            <h3>当前最常见的标签关联</h3>
          </div>
          <p>${escapeHtml(overview.sourceLabel)}</p>
        </div>
        <div class="tag-cloud">
          ${overview.topTags.length ? overview.topTags.map((tag) => tagChip(tag, tag.count)).join('') : document.getElementById('empty-state-template').innerHTML}
        </div>
      </section>

      <section class="card">
        <div class="section-head">
          <div>
            <p class="eyebrow">Recent runs</p>
            <h3>最近的运行状态</h3>
          </div>
          <p>直接点开看输入、输出与命中技能</p>
        </div>
        <div class="list-stack">
          ${overview.recentRuns.length ? overview.recentRuns.map((run) => `
            <button type="button" class="run-row" data-open-run="${escapeHtml(run.runId)}">
              <div class="row-topline">
                <span class="row-title">${escapeHtml(run.kind)}</span>
                ${statusPill(run)}
              </div>
              <div class="row-copy">${escapeHtml(run.inputPreview || 'No request text')}</div>
            </button>
          `).join('') : document.getElementById('empty-state-template').innerHTML}
        </div>
      </section>
    </div>
  `;
}

function filteredSkills() {
  const skills = state.skillsState?.skills || [];
  const query = state.skillQuery.trim().toLowerCase();
  if (!query) return skills;
  return skills.filter((skill) => {
    const haystack = [
      skill.name,
      skill.description,
      skill.skillKind,
      ...(skill.tags || []).map((tag) => tag.name),
    ].join(' ').toLowerCase();
    return haystack.includes(query);
  });
}

function renderSkills() {
  const target = pageViews.skills;
  const skillsState = state.skillsState;
  if (!skillsState) return;
  const skills = filteredSkills();

  target.innerHTML = `
    <section class="card">
      <div class="toolbar">
        <div>
          <p class="eyebrow">Skill library</p>
          <h3>所有技能、描述与标签</h3>
          <p class="subtle-note">这里优先显示容易判断价值的内容，不把页面塞满技术字段。</p>
        </div>
        <input class="search-input" id="skill-search" type="search" placeholder="按技能名、描述或 tag 搜索" value="${escapeHtml(state.skillQuery)}" />
      </div>
      <div class="list-stack">
        ${skills.length ? skills.map((skill) => `
          <button type="button" class="skill-row" data-open-skill="${escapeHtml(skill.id)}">
            <div class="row-topline">
              <span class="row-title">${escapeHtml(skill.name)}</span>
              <span class="status-pill pending">${escapeHtml(skill.scopeLabel)}</span>
            </div>
            <div class="row-copy">${escapeHtml(skill.description)}</div>
            <div class="skill-tags">
              ${(skill.tags || []).slice(0, 8).map((tag) => tagChip(tag)).join('')}
            </div>
          </button>
        `).join('') : document.getElementById('empty-state-template').innerHTML}
      </div>
    </section>
  `;

  const search = document.getElementById('skill-search');
  search?.addEventListener('input', (event) => {
    state.skillQuery = event.target.value;
    renderSkills();
  });
}

function filteredRuns() {
  const runs = state.runsState?.runs || [];
  const query = state.runQuery.trim().toLowerCase();
  if (!query) return runs;
  return runs.filter((run) => {
    const haystack = [
      run.kind,
      run.inputText,
      run.outputText,
      ...(run.matchedSkills || []).map((skill) => skill.name || skill.id),
    ].join(' ').toLowerCase();
    return haystack.includes(query);
  });
}

function renderRunSection(title, subtitle, runs, emptyText) {
  return `
    <section class="card">
      <div class="section-head">
        <div>
          <p class="eyebrow">${escapeHtml(subtitle)}</p>
          <h3>${escapeHtml(title)}</h3>
        </div>
        <p>${runs.length} runs</p>
      </div>
      <div class="list-stack">
        ${runs.length ? runs.map((run) => `
          <button type="button" class="run-row" data-open-run="${escapeHtml(run.runId)}">
            <div class="row-topline">
              <span class="row-title">${escapeHtml(formatTime(run.timestamp))}</span>
              ${statusPill(run)}
            </div>
            <div class="row-copy">${escapeHtml(run.inputPreview || 'No request text')}</div>
            <div class="run-skills">
              ${(run.matchedSkills || []).length
                ? run.matchedSkills.map((skill) => `<span class="tag-chip"><strong>${escapeHtml(skill.name || skill.id)}</strong></span>`).join('')
                : '<span class="subtle-note">No matched skills recorded</span>'}
            </div>
          </button>
        `).join('') : `<div class="empty-state"><p>${escapeHtml(emptyText)}</p></div>`}
      </div>
    </section>
  `;
}

function renderRuns() {
  const target = pageViews.runs;
  const runsState = state.runsState;
  if (!runsState) return;
  const runs = filteredRuns();
  const promptRuns = runs.filter((run) => run.kind === 'Prompt Routing');
  const planRuns = runs.filter((run) => run.kind === 'Plan Review');

  target.innerHTML = `
    <section class="card">
      <div class="toolbar">
        <div>
          <p class="eyebrow">Run archive</p>
          <h3>Runs</h3>
          <p class="subtle-note">Split betterPrompt and betterPlan, newest first.</p>
        </div>
        <input class="search-input" id="run-search" type="search" placeholder="Search by input, output, or matched skill" value="${escapeHtml(state.runQuery)}" />
      </div>
    </section>

    ${renderRunSection('betterPrompt', 'Prompt routing', promptRuns, 'No betterPrompt runs yet.')}
    ${renderRunSection('betterPlan', 'Plan review', planRuns, 'No betterPlan runs yet.')}
  `;

  const search = document.getElementById('run-search');
  search?.addEventListener('input', (event) => {
    state.runQuery = event.target.value;
    renderRuns();
  });
}

function openDrawer(html) {
  drawerContent.innerHTML = html;
  drawer.hidden = false;
}

function closeDrawer() {
  drawer.hidden = true;
  drawerContent.innerHTML = '';
}

function renderSkillDrawer(skill) {
  openDrawer(`
    <div class="drawer-heading">
      <p class="eyebrow">Skill detail</p>
      <h3>${escapeHtml(skill.name)}</h3>
    </div>
    <div class="drawer-meta">
      <span class="status-pill pending">${escapeHtml(skill.scopeLabel)}</span>
      <span class="status-pill pending">${escapeHtml(skill.skillKind || 'skill')}</span>
    </div>
    <div class="drawer-section">
      <h4>描述</h4>
      <p>${escapeHtml(skill.description || 'No description')}</p>
    </div>
    <div class="drawer-section">
      <h4>Tags</h4>
      <div class="skill-tags">
        ${(skill.tags || []).length ? skill.tags.map((tag) => tagChip(tag)).join('') : '<p class="subtle-note">暂时没有 tag。</p>'}
      </div>
    </div>
    <div class="drawer-section">
      <h4>简介片段</h4>
      <p>${escapeHtml(skill.excerpt || 'No excerpt')}</p>
    </div>
    <div class="drawer-section">
      <h4>来源</h4>
      <div class="path-pill">${escapeHtml(skill.sourcePath || 'Unknown source')}</div>
    </div>
  `);
}

function renderRunDrawer(run) {
  openDrawer(`
    <div class="drawer-heading">
      <p class="eyebrow">${escapeHtml(run.kind)}</p>
      <h3>${escapeHtml(run.runId)}</h3>
    </div>
    <div class="drawer-meta">
      ${statusPill(run)}
      <span class="status-pill pending">${escapeHtml(formatTime(run.timestamp))}</span>
    </div>
    <div class="drawer-section">
      <h4>输入</h4>
      <p>${escapeHtml(run.inputText || 'No input recorded')}</p>
    </div>
    <div class="drawer-section">
      <h4>命中的技能</h4>
      <div class="run-skills">
        ${(run.matchedSkills || []).length ? run.matchedSkills.map((skill) => `<span class="tag-chip"><strong>${escapeHtml(skill.name || skill.id)}</strong></span>`).join('') : '<p class="subtle-note">这次没有留下技能命中结果。</p>'}
      </div>
    </div>
    <div class="drawer-section">
      <h4>输出</h4>
      <pre>${escapeHtml(run.outputText || 'No output recorded')}</pre>
    </div>
    ${run.notes?.length ? `
      <div class="drawer-section">
        <h4>备注</h4>
        <pre>${escapeHtml(run.notes.join('\n'))}</pre>
      </div>
    ` : ''}
  `);
}

async function openSkill(id) {
  const skill = await fetchJson(`/api/skills/${encodeURIComponent(id)}`);
  renderSkillDrawer(skill);
}

async function openRun(runId) {
  const run = await fetchJson(`/api/runs/${encodeURIComponent(runId)}`);
  renderRunDrawer(run);
}

function bindEvents() {
  navButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const route = button.dataset.route;
      setRoute(route);
    });
  });

  document.body.addEventListener('click', (event) => {
    const skillButton = event.target.closest('[data-open-skill]');
    if (skillButton) {
      openSkill(skillButton.dataset.openSkill);
      return;
    }

    const runButton = event.target.closest('[data-open-run]');
    if (runButton) {
      openRun(runButton.dataset.openRun);
      return;
    }

    if (event.target.closest('[data-close-drawer]')) {
      closeDrawer();
    }
  });
}

function setRoute(route) {
  state.route = route;
  navButtons.forEach((button) => button.classList.toggle('is-active', button.dataset.route === route));
  Object.entries(pageViews).forEach(([key, node]) => node.classList.toggle('is-active', key === route));

  if (route === 'overview') renderOverview();
  if (route === 'skills') renderSkills();
  if (route === 'runs') renderRuns();
}

async function boot() {
  const [overview, skillsState, runsState] = await Promise.all([
    fetchJson('/api/overview'),
    fetchJson('/api/skills'),
    fetchJson('/api/runs'),
  ]);

  state.overview = overview;
  state.skillsState = skillsState;
  state.runsState = runsState;

  renderOverview();
  renderSkills();
  renderRuns();
  bindEvents();
  setRoute('overview');
}

boot().catch((error) => {
  pageViews.overview.innerHTML = `
    <div class="card empty-state">
      <h3>后台暂时没有成功启动</h3>
      <p>${escapeHtml(error.message || 'Unknown error')}</p>
    </div>
  `;
});
