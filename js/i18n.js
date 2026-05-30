const I18N = {
  zh: {
    appTitle: '甘特圖生成器',
    btnAddTask: '+ 新增任務',
    btnHierarchy: '☰ 層級',
    btnSubpanel: '⊞ 分頁',
    btnOpenCsv: '開啟 CSV',
    btnSaveCsv: '儲存',
    btnExportCsv: '匯出',
    btnExportImg: '匯出圖片',
    btnCopyImg: '複製圖片',
    btnExportHtml: '匯出 HTML',
    subpanelLabel: '子任務',
    subpanelSuffix: ' — 子任務',
    btnAddSubtaskMain: '+ 新增子任務',
    subpanelTaskHeader: '任務名稱',
    modalAddTask: '新增任務',
    modalEditTask: '編輯任務',
    modalAddSubtask: '新增子任務',
    labelName: '任務名稱',
    labelStart: '開始日期',
    labelEnd: '結束日期',
    labelColor: '顏色',
    labelMilestone: '里程碑',
    sectionActual: '實際執行',
    labelActualStart: '實際開始',
    labelActualEnd: '實際結束',
    labelProgress: '完成進度',
    labelDeps: '依賴任務（前置）',
    hintDeps: '按住 Ctrl/Cmd 可多選',
    sectionSubtasks: '子任務',
    btnAddSubtask: '+ 新增子任務',
    btnDelete: '刪除',
    btnCancel: '取消',
    btnSave: '儲存',
    subtaskEmpty: '尚無子任務',
    placeholderName: '輸入任務名稱',
    subtaskEdit: '編輯',
    tooltipExpand: ' 個子任務，點擊展開',
    tooltipCollapse: ' 個子任務，點擊收合',
    toastSaved: '已儲存 · ',
    toastExportHtml: '已匯出預覽 HTML',
    toastCopied: '已複製到剪貼簿！',
    confirmDeleteWithChildren: '確定要刪除「{name}」及其 {count} 個子任務嗎？',
    confirmDelete: '確定要刪除這個任務嗎？',
    errorDateRange: '結束日期必須在開始日期之後',
    errorCsvFormat: 'CSV 格式錯誤，必須包含 name, start, end 欄位',
    errorOpenFail: '開啟失敗：',
    errorExportHtmlFail: '匯出失敗，請確認使用 VS Code Live Preview 或 GitHub Pages 開啟（不支援直接雙擊 file:// 開啟）',
    errorClipboard: '此瀏覽器不支援複製圖片功能，請改用「匯出圖片」下載後手動複製。',
    errorClipboardFail: '複製失敗，請確認瀏覽器已授予剪貼簿權限。',
    errorHtml2canvas: '匯出功能需要 html2canvas，請確認網路連線後重試。',
    errorExportFail: '匯出失敗，請重試。',
  },
  en: {
    appTitle: 'Gantt Chart Generator',
    btnAddTask: '+ Add Task',
    btnHierarchy: '☰ Hierarchy',
    btnSubpanel: '⊞ Sub-panel',
    btnOpenCsv: 'Open CSV',
    btnSaveCsv: 'Save',
    btnExportCsv: 'Export',
    btnExportImg: 'Export Image',
    btnCopyImg: 'Copy Image',
    btnExportHtml: 'Export HTML',
    subpanelLabel: 'Sub-tasks',
    subpanelSuffix: ' — Sub-tasks',
    btnAddSubtaskMain: '+ Add Sub-task',
    subpanelTaskHeader: 'Task Name',
    modalAddTask: 'Add Task',
    modalEditTask: 'Edit Task',
    modalAddSubtask: 'Add Sub-task',
    labelName: 'Task Name',
    labelStart: 'Start Date',
    labelEnd: 'End Date',
    labelColor: 'Color',
    labelMilestone: 'Milestone',
    sectionActual: 'Actual',
    labelActualStart: 'Actual Start',
    labelActualEnd: 'Actual End',
    labelProgress: 'Progress',
    labelDeps: 'Dependencies (Predecessors)',
    hintDeps: 'Hold Ctrl/Cmd to select multiple',
    sectionSubtasks: 'Sub-tasks',
    btnAddSubtask: '+ Add Sub-task',
    btnDelete: 'Delete',
    btnCancel: 'Cancel',
    btnSave: 'Save',
    subtaskEmpty: 'No sub-tasks yet',
    placeholderName: 'Enter task name',
    subtaskEdit: 'Edit',
    tooltipExpand: ' sub-tasks — click to expand',
    tooltipCollapse: ' sub-tasks — click to collapse',
    toastSaved: 'Saved · ',
    toastExportHtml: 'Preview HTML exported',
    toastCopied: 'Copied to clipboard!',
    confirmDeleteWithChildren: 'Delete "{name}" and its {count} sub-tasks?',
    confirmDelete: 'Delete this task?',
    errorDateRange: 'End date must be after start date',
    errorCsvFormat: 'CSV format error: name, start, end columns are required',
    errorOpenFail: 'Open failed: ',
    errorExportHtmlFail: 'Export failed. Please use VS Code Live Preview or GitHub Pages (file:// not supported)',
    errorClipboard: 'This browser does not support image copy. Use Export Image instead.',
    errorClipboardFail: 'Copy failed. Please grant clipboard permission in your browser.',
    errorHtml2canvas: 'html2canvas is required. Please check your internet connection.',
    errorExportFail: 'Export failed. Please try again.',
  },
};

let currentLang = localStorage.getItem('gantt_lang') || 'zh';

function t(key) {
  return (I18N[currentLang] && I18N[currentLang][key]) || I18N.zh[key] || key;
}

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('gantt_lang', lang);
}

function applyLang() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });
  document.getElementById('btn-lang-zh')?.classList.toggle('active', currentLang === 'zh');
  document.getElementById('btn-lang-en')?.classList.toggle('active', currentLang === 'en');
}
