const state = {
  route: 'overview',
  overview: null,
  skillsState: null,
  runsState: null,
  skillQuery: '',
  runQuery: '',
  runTypeFilter: 'all',
  runSort: 'newest',
};

const navButtons = [...document.querySelectorAll('.nav-pill')];
const pageViews = {
  overview: document.getElementById('overview-view'),
  skills: document.getElementById('skills-view'),
  runs: document.getElementById('runs-view'),
};
const drawer = document.getElementById('detail-drawer');
const drawerContent = document.getElementById('drawer-content');

let monacoPromise = null;
let activeEditors = [];

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
            <h3>Most active tags</h3>
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
            <h3>Latest visible runs</h3>
          </div>
          <p>Open a run to compare input, output, and matched skills.</p>
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
          <h3>Skills, descriptions, and tags</h3>
          <p class="subtle-note">Show the meaningful shape of each skill first. Keep the page simple.</p>
        </div>
        <input class="search-input" id="skill-search" type="search" placeholder="Search by skill name, description, or tag" value="${escapeHtml(state.skillQuery)}" />
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
  let runs = state.runsState?.runs || [];
  const query = state.runQuery.trim().toLowerCase();
  if (state.runTypeFilter === 'prompt') {
    runs = runs.filter((run) => run.kind === 'Prompt Routing');
  } else if (state.runTypeFilter === 'plan') {
    runs = runs.filter((run) => run.kind === 'Plan Review');
  }

  if (query) {
    runs = runs.filter((run) => {
      const haystack = [
        run.kind,
        run.inputDisplayText || run.inputText,
        run.outputText,
        ...(run.matchedSkills || []).map((skill) => skill.name || skill.id),
      ].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }

  runs = runs.slice().sort((a, b) => {
    const left = String(a.timestamp || '');
    const right = String(b.timestamp || '');
    return state.runSort === 'oldest'
      ? left.localeCompare(right)
      : right.localeCompare(left);
  });

  return runs;
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
            ${run.outputPreview ? `<div class="subtle-note">${escapeHtml(run.outputPreview)}</div>` : ''}
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
          <p class="subtle-note">Grouped by betterPrompt and betterPlan. Newest first. Open one to compare input and output side by side.</p>
        </div>
        <div class="runs-toolbar-controls">
          <select class="filter-select" id="run-type-filter" aria-label="Run type filter">
            <option value="all" ${state.runTypeFilter === 'all' ? 'selected' : ''}>All runs</option>
            <option value="prompt" ${state.runTypeFilter === 'prompt' ? 'selected' : ''}>betterPrompt</option>
            <option value="plan" ${state.runTypeFilter === 'plan' ? 'selected' : ''}>betterPlan</option>
          </select>
          <select class="filter-select" id="run-sort" aria-label="Run sort order">
            <option value="newest" ${state.runSort === 'newest' ? 'selected' : ''}>Newest first</option>
            <option value="oldest" ${state.runSort === 'oldest' ? 'selected' : ''}>Oldest first</option>
          </select>
          <input class="search-input" id="run-search" type="search" placeholder="Search by input, output, or matched skill" value="${escapeHtml(state.runQuery)}" />
        </div>
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
  const typeFilter = document.getElementById('run-type-filter');
  typeFilter?.addEventListener('change', (event) => {
    state.runTypeFilter = event.target.value;
    renderRuns();
  });
  const sortSelect = document.getElementById('run-sort');
  sortSelect?.addEventListener('change', (event) => {
    state.runSort = event.target.value;
    renderRuns();
  });
}

function disposeEditors() {
  for (const editor of activeEditors) {
    try {
      editor.dispose();
    } catch {}
  }
  activeEditors = [];
}

function openDrawer(html, mode = 'default') {
  disposeEditors();
  drawer.dataset.mode = mode;
  drawerContent.innerHTML = html;
  drawer.hidden = false;
  document.body.classList.add('drawer-open');
}

function closeDrawer() {
  drawer.hidden = true;
  drawer.dataset.mode = 'default';
  disposeEditors();
  drawerContent.innerHTML = '';
  document.body.classList.remove('drawer-open');
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
      <h4>Description</h4>
      <p>${escapeHtml(skill.description || 'No description')}</p>
    </div>
    <div class="drawer-section">
      <h4>Tags</h4>
      <div class="skill-tags">
        ${(skill.tags || []).length ? skill.tags.map((tag) => tagChip(tag)).join('') : '<p class="subtle-note">No tags yet.</p>'}
      </div>
    </div>
    <div class="drawer-section">
      <h4>Excerpt</h4>
      <p>${escapeHtml(skill.excerpt || 'No excerpt')}</p>
    </div>
    <div class="drawer-section">
      <h4>Source</h4>
      <div class="path-pill">${escapeHtml(skill.sourcePath || 'Unknown source')}</div>
    </div>
  `, 'skill');
}

function parseJsonMaybe(text = '') {
  const trimmed = String(text || '').trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function editorLanguageFor(text = '') {
  const trimmed = String(text || '').trim();
  if (!trimmed) return 'plaintext';
  if (parseJsonMaybe(trimmed)) return 'json';
  if (/^#{1,6}\s|\n[-*]\s|\n\d+\.\s/m.test(trimmed)) return 'markdown';
  return 'plaintext';
}

function loadMonaco() {
  if (window.monaco?.editor) return Promise.resolve(window.monaco);
  if (monacoPromise) return monacoPromise;

  monacoPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('monaco-loader');
    const boot = () => {
      const req = window.require;
      if (!req) {
        reject(new Error('Monaco loader unavailable'));
        return;
      }
      req.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs' } });
      req(['vs/editor/editor.main'], () => resolve(window.monaco), reject);
    };

    if (existing) {
      if (window.require) boot();
      else existing.addEventListener('load', boot, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = 'monaco-loader';
    script.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/loader.js';
    script.onload = boot;
    script.onerror = () => reject(new Error('Failed to load Monaco editor'));
    document.head.appendChild(script);
  });

  return monacoPromise;
}

function renderCodeFallback(target, content) {
  target.innerHTML = `<pre class="editor-fallback">${escapeHtml(content || 'No content recorded')}</pre>`;
}

async function mountReadonlyEditor(targetId, content, language, label) {
  const target = document.getElementById(targetId);
  if (!target) return;
  const text = String(content || '');
  renderCodeFallback(target, text || 'No content recorded');
  try {
    const monaco = await loadMonaco();
    target.innerHTML = '';
    const editor = monaco.editor.create(target, {
      value: text,
      language,
      theme: 'vs',
      readOnly: true,
      minimap: { enabled: false },
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      fontSize: 14,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      wordWrap: 'on',
      automaticLayout: true,
      padding: { top: 12, bottom: 12 },
      scrollbar: {
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
      },
    });
    activeEditors.push(editor);
  } catch (error) {
    console.warn(`Failed to mount ${label} editor`, error);
  }
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
      ${run.duplicateCount > 1 ? `<span class="status-pill pending">${escapeHtml(`${run.duplicateCount} similar runs`)}</span>` : ''}
    </div>
    <div class="drawer-section">
      <h4>Matched skills</h4>
      <div class="run-skills">
        ${(run.matchedSkills || []).length ? run.matchedSkills.map((skill) => `<span class="tag-chip"><strong>${escapeHtml(skill.name || skill.id)}</strong></span>`).join('') : '<p class="subtle-note">No matched skills recorded.</p>'}
      </div>
    </div>
    <div class="drawer-section">
      <div class="compare-head">
        <div>
          <h4>Input / Output</h4>
          <p class="subtle-note">Left is the incoming request. Right is the final saved output.</p>
        </div>
      </div>
      <div class="editor-compare-grid">
        <section class="editor-panel">
          <div class="editor-panel-head">
            <span>Input</span>
            <span>${escapeHtml(editorLanguageFor(run.inputDisplayText || run.inputText))}</span>
          </div>
          <div id="run-input-editor" class="editor-surface"></div>
        </section>
        <section class="editor-panel">
          <div class="editor-panel-head">
            <span>Output</span>
            <span>${escapeHtml(editorLanguageFor(run.outputText))}</span>
          </div>
          <div id="run-output-editor" class="editor-surface"></div>
        </section>
      </div>
    </div>
    ${run.notes?.length ? `
      <div class="drawer-section">
        <h4>Notes</h4>
        <pre>${escapeHtml(run.notes.join('\n'))}</pre>
      </div>
    ` : ''}
  `, 'run');

  mountReadonlyEditor('run-input-editor', run.inputDisplayText || run.inputText || 'No input recorded', editorLanguageFor(run.inputDisplayText || run.inputText), 'input');
  mountReadonlyEditor('run-output-editor', run.outputText || 'No output recorded', editorLanguageFor(run.outputText), 'output');
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
      <h3>Console failed to load</h3>
      <p>${escapeHtml(error.message || 'Unknown error')}</p>
    </div>
  `;
});
