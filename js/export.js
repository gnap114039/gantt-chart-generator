function getExportCanvas(callback) {
  const container = document.getElementById('gantt-container');
  const scale = window.devicePixelRatio || 2;

  // Inline all SVG styles before export so html2canvas captures them correctly
  const svg = document.getElementById('gantt-svg');
  const svgClone = svg.cloneNode(true);

  // Use html2canvas to capture the full gantt container
  const options = {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  };

  if (typeof html2canvas === 'undefined') {
    alert(t('errorHtml2canvas'));
    return;
  }

  html2canvas(container, options).then(canvas => {
    callback(canvas);
  }).catch(err => {
    console.error('html2canvas error:', err);
    alert(t('errorExportFail'));
  });
}

function downloadImage() {
  getExportCanvas(canvas => {
    const link = document.createElement('a');
    link.download = 'gantt-chart.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  });
}

function copyImage() {
  if (!navigator.clipboard || !window.ClipboardItem) {
    alert(t('errorClipboard'));
    return;
  }

  getExportCanvas(canvas => {
    canvas.toBlob(blob => {
      if (!blob) {
        alert(t('errorExportFail'));
        return;
      }
      const item = new ClipboardItem({ 'image/png': blob });
      navigator.clipboard.write([item]).then(() => {
        showToast(t('toastCopied'));
      }).catch(() => {
        alert(t('errorClipboardFail'));
      });
    }, 'image/png');
  });
}

async function exportHtmlPreview() {
  try {
    const [css, dataJs, i18nJs, rendererJs] = await Promise.all([
      fetch('css/style.css').then(r => r.text()),
      fetch('js/data.js').then(r => r.text()),
      fetch('js/i18n.js').then(r => r.text()),
      fetch('js/renderer.js').then(r => r.text()),
    ]);

    const exportedTasks = getTasks();
    const exportedProjectName = getProjectName();
    const exportedViewMode = localStorage.getItem('gantt_view_mode') || 'hierarchy';
    const maxId = exportedTasks.length ? Math.max(...exportedTasks.map(t => t.id)) : 0;
    const safeTitle = exportedProjectName.replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

    const initScript = `
window.openEditModal = function() {};
window.openAddModal = function() {};
window.openAddSubTaskModal = function() {};

(function() {
  var _tasks   = ${JSON.stringify(exportedTasks)};
  var _nextId  = ${maxId + 1};
  var _mode    = ${JSON.stringify(exportedViewMode)};

  document.addEventListener('DOMContentLoaded', function() {
    tasks   = _tasks;
    nextId  = _nextId;
    document.getElementById('project-name').textContent = ${JSON.stringify(exportedProjectName)};
    setViewMode(_mode);

    document.getElementById('btn-mode-hierarchy').addEventListener('click', function() { setViewMode('hierarchy'); render(); });
    document.getElementById('btn-mode-subpanel').addEventListener('click', function() { setViewMode('subpanel'); render(); });
    document.getElementById('btn-close-subpanel').addEventListener('click', function() { selectedParentId = null; render(); });

    document.getElementById('gantt-svg').addEventListener('click', function(e) {
      if ((e.target.getAttribute('class') || '').includes('drag-handle')) return;
      var el = e.target.closest('[data-id]');
      if (!el) return;
      var id = parseInt(el.getAttribute('data-id'));
      if (id && hasChildren(id)) window.toggleExpand(id);
    });

    var rightPanel = document.getElementById('gantt-right');
    if (typeof ResizeObserver !== 'undefined') {
      var t;
      new ResizeObserver(function() { clearTimeout(t); t = setTimeout(render, 80); }).observe(rightPanel);
    }
    render();
  });
})();`;

    const html = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle} — 甘特圖</title>
  <style>${css}</style>
</head>
<body>
  <div id="app">
    <header class="toolbar">
      <span class="toolbar-title">${safeTitle}</span>
      <div class="toolbar-actions">
        <div class="btn-group">
          <button id="btn-mode-hierarchy" class="btn btn-secondary${exportedViewMode === 'hierarchy' ? ' active' : ''}">☰ 層級</button>
          <button id="btn-mode-subpanel" class="btn btn-secondary${exportedViewMode === 'subpanel' ? ' active' : ''}">⊞ 分頁</button>
        </div>
      </div>
    </header>
    <div class="main-area">
      <div class="gantt-container" id="gantt-container">
        <div class="gantt-left" id="gantt-left">
          <div class="gantt-left-header">
            <span id="project-name"></span>
          </div>
          <div class="task-list" id="task-list"></div>
        </div>
        <div class="gantt-right" id="gantt-right">
          <div class="timeline-header" id="timeline-header"></div>
          <div class="chart-area" id="chart-area">
            <svg id="gantt-svg" xmlns="http://www.w3.org/2000/svg"></svg>
          </div>
        </div>
      </div>
      <div id="sub-panel" style="display:none">
        <div class="sub-panel-header">
          <span class="sub-panel-label">子任務</span>
          <span id="sub-panel-title"></span>
          <button id="btn-close-subpanel" class="btn-icon" title="關閉">✕</button>
        </div>
        <div class="gantt-container sub-gantt-container">
          <div class="gantt-left">
            <div class="gantt-left-header" style="font-size:11px;color:#667085;">任務名稱</div>
            <div class="task-list" id="sub-task-list"></div>
          </div>
          <div class="gantt-right" id="sub-gantt-right">
            <div class="timeline-header" id="sub-timeline-header"></div>
            <div class="chart-area" id="sub-chart-area">
              <svg id="sub-gantt-svg" xmlns="http://www.w3.org/2000/svg"></svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div id="toast"></div>
  <script>${dataJs}<\/script>
  <script>${i18nJs}<\/script>
  <script>${rendererJs}<\/script>
  <script>${initScript}<\/script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${exportedProjectName.replace(/[/\\:*?"<>|]/g, '_')}-preview.html`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast(t('toastExportHtml'));
  } catch (e) {
    alert(t('errorExportHtmlFail'));
  }
}

function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}
