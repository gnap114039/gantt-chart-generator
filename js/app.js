const DATA_VERSION = 3;
let currentFileHandle = null;
let isDirty = false;

function isDarkMode() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('gantt_theme', theme);
  const btn = document.getElementById('btn-theme');
  if (btn) {
    btn.textContent = theme === 'dark' ? '☀' : '🌙';
    btn.title = theme === 'dark' ? '切換淺色模式' : '切換深色模式';
  }
}
function initTheme() {
  const saved = localStorage.getItem('gantt_theme');
  setTheme(saved || 'light');
}

// Called by data.js on every localStorage write
window._ganttDataChanged = () => {
  if (!currentFileHandle) return;
  isDirty = true;
  setFileIndicator(currentFileHandle.name, true);
};

function initApp() {
  const savedVersion = parseInt(localStorage.getItem('gantt_version') || '0');
  if (savedVersion < DATA_VERSION) {
    localStorage.removeItem('gantt_tasks');
    localStorage.setItem('gantt_version', DATA_VERSION);
  }

  loadTasks();
  if (!getTasks().length) seedSampleData();

  initTheme();
  initModal();
  applyLang();
  render();

  // Project name
  const nameEl = document.getElementById('project-name');
  nameEl.textContent = getProjectName();
  nameEl.addEventListener('blur', () => setProjectName(nameEl.textContent));
  nameEl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); nameEl.blur(); } });

  // Toolbar buttons
  document.getElementById('btn-add-task').addEventListener('click', () => window.openAddModal());
  document.getElementById('btn-open-csv').addEventListener('click', openCsvFile);
  document.getElementById('btn-save-csv').addEventListener('click', saveCsvFile);
  document.getElementById('btn-export-csv').addEventListener('click', exportCsv);
  document.getElementById('btn-export').addEventListener('click', downloadImage);
  document.getElementById('btn-copy').addEventListener('click', copyImage);
  document.getElementById('btn-export-html').addEventListener('click', exportHtmlPreview);
  document.getElementById('csv-input').addEventListener('change', handleCsvImport);

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveCsvFile();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      const tag = document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement.isContentEditable) return;
      if (document.getElementById('modal-overlay').style.display !== 'none') return;
      e.preventDefault();
      if (undoLastAction()) render();
    }
  });

  document.getElementById('btn-undo').addEventListener('click', () => {
    if (undoLastAction()) render();
  });

  // Mode toggle
  document.getElementById('btn-mode-hierarchy').addEventListener('click', () => { setViewMode('hierarchy'); render(); });
  document.getElementById('btn-mode-subpanel').addEventListener('click', () => { setViewMode('subpanel'); render(); });

  // Zoom controls
  document.getElementById('btn-zoom-in').addEventListener('click', () => {
    manualDayWidth = Math.min(128, Math.round((manualDayWidth !== null ? manualDayWidth : DAY_WIDTH) * 1.5));
    render();
  });
  document.getElementById('btn-zoom-out').addEventListener('click', () => {
    manualDayWidth = Math.max(1, Math.round((manualDayWidth !== null ? manualDayWidth : DAY_WIDTH) / 1.5));
    render();
  });
  document.getElementById('btn-zoom-reset').addEventListener('click', () => {
    manualDayWidth = null;
    render();
  });

  // Date filter
  document.getElementById('btn-toggle-filter').addEventListener('click', () => {
    const bar = document.getElementById('filter-bar');
    const showing = bar.style.display !== 'none';
    bar.style.display = showing ? 'none' : 'flex';
    document.getElementById('btn-toggle-filter').classList.toggle('active', !showing);
  });
  document.getElementById('filter-start').addEventListener('change', e => {
    dateFilterStart = e.target.value || null;
    render();
  });
  document.getElementById('filter-end').addEventListener('change', e => {
    dateFilterEnd = e.target.value || null;
    render();
  });
  document.getElementById('btn-filter-reset').addEventListener('click', () => {
    dateFilterStart = null;
    dateFilterEnd = null;
    document.getElementById('filter-start').value = '';
    document.getElementById('filter-end').value = '';
    render();
  });

  // Sub-panel
  document.getElementById('btn-close-subpanel').addEventListener('click', () => { selectedParentId = null; render(); });
  document.getElementById('btn-add-subtask-main').addEventListener('click', () => {
    if (selectedParentId) window.openAddSubTaskModal(selectedParentId);
  });

  // Click on main SVG bar
  document.getElementById('gantt-svg').addEventListener('click', e => {
    const cls = e.target.getAttribute('class') || '';
    if (cls.includes('drag-handle')) return;
    const el = e.target.closest('[data-id]');
    if (!el) return;
    const id = parseInt(el.getAttribute('data-id'));
    if (!id) return;
    if (el.getAttribute('data-type') === 'toggle') window.toggleExpand(id);
    else window.openEditModal(id);
  });

  // 重新整理或關閉頁面前，若有未儲存的檔案則警告
  window.addEventListener('beforeunload', e => {
    if (isDirty && currentFileHandle) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // Theme toggle
  document.getElementById('btn-theme').addEventListener('click', () => {
    setTheme(isDarkMode() ? 'light' : 'dark');
    render();
  });

  // Language toggle
  document.getElementById('btn-lang-zh').addEventListener('click', () => {
    setLang('zh'); applyLang(); render();
  });
  document.getElementById('btn-lang-en').addEventListener('click', () => {
    setLang('en'); applyLang(); render();
  });

  // Help modal
  document.getElementById('btn-help').addEventListener('click', () => {
    document.getElementById('help-overlay').style.display = 'flex';
  });
  document.getElementById('btn-close-help').addEventListener('click', () => {
    document.getElementById('help-overlay').style.display = 'none';
  });
  document.getElementById('help-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('help-overlay'))
      document.getElementById('help-overlay').style.display = 'none';
  });
  document.getElementById('help-lang-zh').addEventListener('click', () => {
    document.getElementById('help-content-zh').style.display = '';
    document.getElementById('help-content-en').style.display = 'none';
    document.getElementById('help-lang-zh').classList.add('active');
    document.getElementById('help-lang-en').classList.remove('active');
  });
  document.getElementById('help-lang-en').addEventListener('click', () => {
    document.getElementById('help-content-en').style.display = '';
    document.getElementById('help-content-zh').style.display = 'none';
    document.getElementById('help-lang-en').classList.add('active');
    document.getElementById('help-lang-zh').classList.remove('active');
  });

  // ResizeObserver
  const rightPanel = document.getElementById('gantt-right');
  if (typeof ResizeObserver !== 'undefined') {
    let resizeTimer;
    new ResizeObserver(() => { clearTimeout(resizeTimer); resizeTimer = setTimeout(render, 80); }).observe(rightPanel);
  }
}

// ── 開啟 CSV 檔案（保留 file handle）────────────────────────────────────────
async function openCsvFile() {
  if (!window.showOpenFilePicker) {
    document.getElementById('csv-input').click();
    return;
  }
  try {
    const [handle] = await window.showOpenFilePicker({
      types: [{ description: 'CSV 檔案', accept: { 'text/csv': ['.csv'] } }],
    });
    const file = await handle.getFile();
    const text = await file.text();
    parseCsv(text);
    currentFileHandle = handle;
    isDirty = false;
    setFileIndicator(handle.name, false);
    document.getElementById('project-name').textContent = getProjectName();
    render();
  } catch (e) {
    if (e.name !== 'AbortError') alert(t('errorOpenFail') + e.message);
  }
}

// ── 儲存至目前開啟的 CSV（或另存新檔）──────────────────────────────────────
async function saveCsvFile() {
  const content = buildCsvContent();

  if (currentFileHandle) {
    try {
      const writable = await currentFileHandle.createWritable();
      await writable.write('﻿' + content);
      await writable.close();
      isDirty = false;
      setFileIndicator(currentFileHandle.name, false);
      showToast(t('toastSaved') + currentFileHandle.name);
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
      // Permission revoked — fall through to save-as
    }
  }

  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: `${getProjectName().replace(/[/\\:*?"<>|]/g, '_')}-gantt.csv`,
        types: [{ description: 'CSV 檔案', accept: { 'text/csv': ['.csv'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write('﻿' + content);
      await writable.close();
      currentFileHandle = handle;
      isDirty = false;
      setFileIndicator(handle.name, false);
      showToast(t('toastSaved') + handle.name);
    } catch (e) {
      if (e.name !== 'AbortError') downloadCsvBlob(content);
    }
  } else {
    downloadCsvBlob(content);
  }
}

// ── 匯出 CSV（另存新檔，不更新 handle）──────────────────────────────────────
function exportCsv() {
  downloadCsvBlob(buildCsvContent());
}

function downloadCsvBlob(content) {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${getProjectName().replace(/[/\\:*?"<>|]/g, '_')}-gantt.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function buildCsvContent() {
  const tasks = getTasks();
  const headers = ['id', 'name', 'start', 'end', 'color', 'milestone',
                   'actualStart', 'actualEnd', 'progress', 'dependencies', 'parentId'];
  const rows = tasks.map(t => [
    t.id,
    csvField(t.name),
    t.start,
    t.end,
    t.color,
    t.isMilestone ? 'true' : 'false',
    t.actualStart || '',
    t.actualEnd || '',
    t.progress || 0,
    t.dependencies.join(';'),
    t.parentId || '',
  ].join(','));
  return [`# ${getProjectName()}`, headers.join(','), ...rows].join('\n');
}

function csvField(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? '"' + s.replace(/"/g, '""') + '"' : s;
}

// ── 檔案指示器 ────────────────────────────────────────────────────────────────
function setFileIndicator(filename, dirty = false) {
  const el = document.getElementById('file-indicator');
  if (!el) return;
  el.textContent = filename;
  el.dataset.dirty = dirty ? '1' : '0';
  el.style.display = 'inline-flex';
  document.getElementById('btn-save-csv').disabled = false;
}

// ── CSV 匯入（舊式 file input fallback）──────────────────────────────────────
function handleCsvImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    parseCsv(ev.target.result);
    document.getElementById('project-name').textContent = getProjectName();
    render();
  };
  reader.readAsText(file);
  e.target.value = '';
}

function parseCsvLine(line) {
  const fields = [];
  let cur = '', inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuote = false;
      else cur += ch;
    } else {
      if (ch === '"') inQuote = true;
      else if (ch === ',') { fields.push(cur); cur = ''; }
      else cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

function parseCsv(text) {
  captureUndoSnapshot();
  setSuspendHistory(true);
  const lines = text.replace(/\r/g, '').replace(/^﻿/, '').split('\n').filter(l => l.trim());

  let startLine = 0;
  if (lines[0]?.startsWith('#')) {
    const name = lines[0].slice(1).trim();
    if (name) setProjectName(name);
    startLine = 1;
  }

  const header = parseCsvLine(lines[startLine].toLowerCase());
  const col = k => header.indexOf(k);

  if (col('name') === -1 || col('start') === -1 || col('end') === -1) {
    setSuspendHistory(false);
    alert(t('errorCsvFormat')); return;
  }

  const isFullFormat = col('id') !== -1;

  if (isFullFormat) {
    clearTasks();
    const idMap = {};
    const pending = [];

    for (let i = startLine + 1; i < lines.length; i++) {
      const c = parseCsvLine(lines[i]);
      if (c.length < 3) continue;
      const name = c[col('name')]?.trim();
      const start = c[col('start')]?.trim();
      const end = c[col('end')]?.trim();
      if (!name || !start || !end) continue;

      const oldId = parseInt(c[col('id')]);
      const task = addTask({
        name, start, end,
        color: col('color') !== -1 ? (c[col('color')]?.trim() || '#4A90D9') : '#4A90D9',
        isMilestone: col('milestone') !== -1 ? c[col('milestone')]?.trim() === 'true' : false,
        actualStart: col('actualstart') !== -1 ? (c[col('actualstart')]?.trim() || null) : null,
        actualEnd: col('actualend') !== -1 ? (c[col('actualend')]?.trim() || null) : null,
        progress: col('progress') !== -1 ? (parseInt(c[col('progress')]) || 0) : 0,
        dependencies: [], parentId: null,
      });

      if (oldId) idMap[oldId] = task.id;
      const rawDeps = col('dependencies') !== -1 ? c[col('dependencies')]?.trim() : '';
      const rawParent = col('parentid') !== -1 ? c[col('parentid')]?.trim() : '';
      if (rawDeps || rawParent) pending.push({ newId: task.id, rawDeps, rawParent });
    }

    pending.forEach(({ newId, rawDeps, rawParent }) => {
      updateTask(newId, {
        dependencies: rawDeps ? rawDeps.split(';').map(d => idMap[parseInt(d)]).filter(Boolean) : [],
        parentId: rawParent ? (idMap[parseInt(rawParent)] || null) : null,
      });
    });
  } else {
    for (let i = startLine + 1; i < lines.length; i++) {
      const c = parseCsvLine(lines[i]);
      if (c.length < 3) continue;
      const name = c[col('name')]?.trim();
      const start = c[col('start')]?.trim();
      const end = c[col('end')]?.trim();
      if (!name || !start || !end) continue;
      addTask({
        name, start, end,
        color: col('color') !== -1 ? (c[col('color')]?.trim() || '#4A90D9') : '#4A90D9',
        isMilestone: col('milestone') !== -1 ? c[col('milestone')]?.trim() === 'true' : false,
        dependencies: [],
      });
    }
  }
  setSuspendHistory(false);
}

function seedSampleData() {
  setSuspendHistory(true);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const fmt = d => d.toISOString().slice(0, 10);
  const off = n => { const d = new Date(today); d.setDate(d.getDate() + n); return fmt(d); };

  const t1 = addTask({ name: '需求分析', start: off(-14), end: off(-8), color: '#4A90D9', actualStart: off(-14), actualEnd: off(-7), progress: 100 });
  const t2 = addTask({ name: '設計階段', start: off(-9), end: off(-2), color: '#7B61FF', actualStart: off(-8), actualEnd: off(0), progress: 100, dependencies: [t1.id] });
  const t3 = addTask({ name: '開發實作', start: off(-1), end: off(12), color: '#16B364', actualStart: off(0), progress: 45, dependencies: [t2.id] });
  addTask({ name: '測試', start: off(11), end: off(18), color: '#F97066', dependencies: [t3.id] });
  addTask({ name: '上線', start: off(19), end: off(19), color: '#F79009', isMilestone: true, dependencies: [t3.id] });
  addTask({ name: '用戶訪談', start: off(-14), end: off(-11), color: '#4A90D9', actualStart: off(-14), actualEnd: off(-11), progress: 100, parentId: t1.id });
  addTask({ name: '文件撰寫', start: off(-11), end: off(-8), color: '#4A90D9', actualStart: off(-11), actualEnd: off(-8), progress: 100, parentId: t1.id });
  addTask({ name: '前端實作', start: off(-1), end: off(7), color: '#16B364', actualStart: off(0), progress: 60, parentId: t3.id });
  addTask({ name: '後端 API', start: off(0), end: off(10), color: '#16B364', actualStart: off(1), progress: 30, parentId: t3.id });
  addTask({ name: '整合測試', start: off(9), end: off(12), color: '#16B364', parentId: t3.id });
  setSuspendHistory(false);
}

document.addEventListener('DOMContentLoaded', initApp);
