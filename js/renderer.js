// ── Constants ──────────────────────────────────────────────────────────────────
const ROW_HEIGHT = 52;
const SUB_ROW_HEIGHT = 38;
const PLAN_BAR_H = 18;
const ACTUAL_BAR_H = 10;
const BARS_GAP = 1;
const BARS_TOTAL_H = PLAN_BAR_H + BARS_GAP + ACTUAL_BAR_H;                         // 29
const SUB_BAR_OFFSET = Math.round((SUB_ROW_HEIGHT - BARS_TOTAL_H) / 2);             // 5  — top margin in sub-task rows
const PARENT_BOTTOM  = ROW_HEIGHT - Math.round((ROW_HEIGHT - BARS_TOTAL_H) / 2) - BARS_TOTAL_H; // 11 — bottom margin in parent rows
const LAST_CHILD_ROW_HEIGHT = SUB_BAR_OFFSET + BARS_TOTAL_H + PARENT_BOTTOM;        // 45 — last child gets equal gap to next parent
const MILESTONE_SIZE = 14;
const MIN_DAY_WIDTH = 16;
const MAX_DAY_WIDTH = 64;
const MIN_DAYS = 14;

// ── Main panel state (kept global for drag.js) ─────────────────────────────────
let DAY_WIDTH = 32;
let viewState = { startDate: null, totalDays: 0, svgWidth: 0, svgHeight: 0 };

// ── Hierarchy / sub-panel mode ─────────────────────────────────────────────────
let expandedSet = new Set();
let viewMode = localStorage.getItem('gantt_view_mode') || 'hierarchy';
let selectedParentId = null;

function setViewMode(mode) {
  viewMode = mode;
  localStorage.setItem('gantt_view_mode', mode);
  if (mode !== 'subpanel') selectedParentId = null;
}

// ── Utilities ──────────────────────────────────────────────────────────────────
function dateToStr(date) {
  return date.toISOString().slice(0, 10);
}
function strToDate(str) {
  return new Date(str + 'T00:00:00');
}
function daysBetween(a, b) {
  return Math.round((b - a) / 86400000);
}
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
function svgTheme(light, dark) {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? dark : light;
}
function effectiveColor(hex) {
  if (document.documentElement.getAttribute('data-theme') !== 'dark') return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (lum < 0.35) {
    const f = 0.55;
    const nr = Math.round(r + (255 - r) * f);
    const ng = Math.round(g + (255 - g) * f);
    const nb = Math.round(b + (255 - b) * f);
    return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
  }
  return hex;
}

function svgEl(tag, attrs = {}, text = null) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (text !== null) el.textContent = text;
  return el;
}

function getRowHeight(index, flatItems) {
  const item = flatItems[index];
  const next = flatItems[index + 1];
  if (item.level === 0) {
    return ROW_HEIGHT;
  } else {
    // Last child in group: full height so last child→next parent gap is normal
    return (!next || next.level === 0) ? LAST_CHILD_ROW_HEIGHT : SUB_ROW_HEIGHT;
  }
}
function getRowY(index, flatItems) {
  let y = 0;
  for (let i = 0; i < index; i++) y += getRowHeight(i, flatItems);
  return y;
}
function getTotalSvgHeight(flatItems) {
  return flatItems.reduce((sum, _, i) => sum + getRowHeight(i, flatItems), 0);
}

// ── Time range ─────────────────────────────────────────────────────────────────
function computeTimeRange(tasks) {
  if (!tasks.length) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return { start: today, totalDays: MIN_DAYS };
  }
  let minDate = null, maxDate = null;
  const consider = d => {
    if (!d) return;
    if (!minDate || d < minDate) minDate = d;
    if (!maxDate || d > maxDate) maxDate = d;
  };
  tasks.forEach(t => {
    consider(strToDate(t.start));
    consider(strToDate(t.end));
    if (t.actualStart) consider(strToDate(t.actualStart));
    if (t.actualEnd) consider(strToDate(t.actualEnd));
  });
  const paddedStart = addDays(minDate, -2);
  const paddedEnd = addDays(maxDate, 3);
  return { start: paddedStart, totalDays: Math.max(MIN_DAYS, daysBetween(paddedStart, paddedEnd)) };
}

// Global xForDate/dateForX use main panel globals (required by drag.js)
function xForDate(date) {
  return daysBetween(viewState.startDate, date) * DAY_WIDTH;
}
function dateForX(x) {
  return addDays(viewState.startDate, Math.round(x / DAY_WIDTH));
}
function xCtx(date, ctx) {
  return daysBetween(ctx.startDate, date) * ctx.dayWidth;
}

// ── Flat items ─────────────────────────────────────────────────────────────────
function getFlattenedItems() {
  const allTasks = getTasks();
  if (viewMode === 'subpanel') {
    return allTasks
      .filter(t => !t.parentId)
      .map(t => ({ task: t, level: 0, hasChildren: hasChildren(t.id) }));
  }
  const result = [];
  allTasks.filter(t => !t.parentId).forEach(t => {
    const hc = hasChildren(t.id);
    result.push({ task: t, level: 0, hasChildren: hc });
    if (hc && expandedSet.has(t.id)) {
      getChildTasks(t.id).forEach(c => {
        result.push({ task: c, level: 1, hasChildren: false });
      });
    }
  });
  return result;
}

// ── Generic: timeline header ───────────────────────────────────────────────────
function renderTimelineHeaderTo(containerId, ctx) {
  const header = document.getElementById(containerId);
  if (!header) return;
  header.innerHTML = '';
  header.style.width = ctx.svgWidth + 'px';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', ctx.svgWidth);
  svg.setAttribute('height', 48);
  svg.style.display = 'block';

  const monthRow = svgEl('g'), dayRow = svgEl('g');
  let curMonth = null, monthStartX = 0;

  for (let i = 0; i < ctx.totalDays; i++) {
    const d = addDays(ctx.startDate, i);
    const x = i * ctx.dayWidth;
    const month = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');

    if (month !== curMonth) {
      if (curMonth !== null) {
        const mw = x - monthStartX;
        monthRow.appendChild(svgEl('rect', { x: monthStartX, y: 0, width: mw, height: 22, fill: 'none', stroke: svgTheme('#d0d5dd', '#30363d'), 'stroke-width': 1 }));
        monthRow.appendChild(svgEl('text', { x: monthStartX + 6, y: 15, 'font-size': 11, fill: svgTheme('#667085', '#8b949e'), 'font-family': 'system-ui,sans-serif' }, curMonth));
      }
      curMonth = month;
      monthStartX = x;
    }
    const isWE = d.getDay() === 0 || d.getDay() === 6;
    dayRow.appendChild(svgEl('rect', { x, y: 22, width: ctx.dayWidth, height: 26, fill: isWE ? svgTheme('#f9fafb', '#161924') : 'none', stroke: svgTheme('#e4e7ec', '#30363d'), 'stroke-width': 0.5 }));
    dayRow.appendChild(svgEl('text', { x: x + ctx.dayWidth / 2, y: 37, 'text-anchor': 'middle', 'font-size': 10, fill: isWE ? svgTheme('#9aa5b4', '#6e7681') : svgTheme('#344054', '#c9d1d9'), 'font-family': 'system-ui,sans-serif' }, d.getDate()));
  }

  if (curMonth !== null) {
    const mw = ctx.totalDays * ctx.dayWidth - monthStartX;
    monthRow.appendChild(svgEl('rect', { x: monthStartX, y: 0, width: mw, height: 22, fill: 'none', stroke: svgTheme('#d0d5dd', '#30363d'), 'stroke-width': 1 }));
    monthRow.appendChild(svgEl('text', { x: monthStartX + 6, y: 15, 'font-size': 11, fill: svgTheme('#667085', '#8b949e'), 'font-family': 'system-ui,sans-serif' }, curMonth));
  }
  svg.appendChild(monthRow);
  svg.appendChild(dayRow);
  header.appendChild(svg);
}

// ── Generic: task list ─────────────────────────────────────────────────────────
function renderTaskListTo(listId, flatItems, opts = {}) {
  const list = document.getElementById(listId);
  if (!list) return;
  list.innerHTML = '';

  flatItems.forEach(({ task, level, hasChildren: hc }, i) => {
    const row = document.createElement('div');
    const isSelected = viewMode === 'subpanel' && task.id === selectedParentId;
    row.className = [
      'task-row',
      task.isMilestone ? 'milestone-row' : '',
      level > 0 ? 'sub-task-row' : '',
      isSelected ? 'task-row-selected' : '',
    ].filter(Boolean).join(' ');
    row.dataset.id = task.id;
    row.style.height = getRowHeight(i, flatItems) + 'px';
    row.style.paddingLeft = (8 + level * 18) + 'px';

    // Expand / select toggle
    const toggle = document.createElement('span');
    toggle.className = 'task-expand-toggle';
    if (hc) {
      const isExpanded = viewMode === 'hierarchy' ? expandedSet.has(task.id) : task.id === selectedParentId;
      toggle.textContent = isExpanded ? '▾' : '▸';
      toggle.addEventListener('click', e => {
        e.stopPropagation();
        if (opts.onToggle) opts.onToggle(task.id);
      });
    }
    row.appendChild(toggle);

    const icon = document.createElement('span');
    icon.className = 'task-icon';
    icon.textContent = task.isMilestone ? '◆' : '●';
    icon.style.color = task.color;
    row.appendChild(icon);

    const name = document.createElement('span');
    name.className = 'task-name';
    name.textContent = task.name;
    if (task.progress >= 100) name.style.textDecoration = 'line-through';
    row.appendChild(name);

    row.addEventListener('click', () => {
      if (opts.onTaskClick) opts.onTaskClick(task.id);
    });
    list.appendChild(row);
  });
}

// ── Generic: SVG bars ──────────────────────────────────────────────────────────
function renderBarsGroup(flatItems, ctx, isDraggable) {
  const barGroup = svgEl('g', { class: 'bars' });

  flatItems.forEach(({ task }, i) => {
    const rh = getRowHeight(i, flatItems);
    const rowTop = getRowY(i, flatItems);
    const startX = xCtx(strToDate(task.start), ctx);
    const endX = xCtx(strToDate(task.end), ctx);

    if (task.isMilestone) {
      const cx = startX, cy = rowTop + rh / 2;
      const color = effectiveColor(task.color);
      const diamond = svgEl('polygon', {
        points: `${cx},${cy - MILESTONE_SIZE} ${cx + MILESTONE_SIZE},${cy} ${cx},${cy + MILESTONE_SIZE} ${cx - MILESTONE_SIZE},${cy}`,
        fill: color, stroke: 'none', class: 'task-bar milestone', 'data-id': task.id,
      });
      diamond.style.cursor = 'pointer';
      barGroup.appendChild(diamond);
      const label = svgEl('text', { x: cx + MILESTONE_SIZE + 4, y: cy + 4, 'font-size': 11, fill: svgTheme('#344054', '#c9d1d9'), 'font-family': 'system-ui,sans-serif', 'data-id': task.id }, task.name);
      label.style.pointerEvents = 'none';
      barGroup.appendChild(label);
    } else {
      const planWidth = Math.max(endX - startX, ctx.dayWidth);
      const g = svgEl('g', { class: 'task-group', 'data-id': task.id });
      const color = effectiveColor(task.color);
      const rgb = hexToRgb(color);
      const planY = rowTop + (flatItems[i].level > 0 ? SUB_BAR_OFFSET : Math.round((rh - BARS_TOTAL_H) / 2));

      // Plan bar
      g.appendChild(svgEl('rect', {
        x: startX, y: planY, width: planWidth, height: PLAN_BAR_H, rx: 3, ry: 3,
        fill: `rgba(${rgb},0.18)`, stroke: task.color, 'stroke-width': 1.5,
        class: 'task-bar plan-bar', 'data-id': task.id, 'data-type': 'plan',
      }));
      if (isDraggable) {
        g.appendChild(svgEl('rect', { x: startX, y: planY, width: 6, height: PLAN_BAR_H, rx: 3, ry: 3, fill: `rgba(${rgb},0.35)`, class: 'drag-handle drag-handle-left', 'data-id': task.id, 'data-type': 'plan', style: 'cursor: ew-resize' }));
        g.appendChild(svgEl('rect', { x: startX + planWidth - 6, y: planY, width: 6, height: PLAN_BAR_H, rx: 3, ry: 3, fill: `rgba(${rgb},0.35)`, class: 'drag-handle drag-handle-right', 'data-id': task.id, 'data-type': 'plan', style: 'cursor: ew-resize' }));
      }
      const planLabel = svgEl('text', { x: startX + 8, y: planY + PLAN_BAR_H / 2 + 4, 'font-size': 11, fill: task.color, 'font-family': 'system-ui,sans-serif', 'font-weight': '500' }, task.name);
      planLabel.style.pointerEvents = 'none';
      g.appendChild(planLabel);

      if (task.progress >= 100) {
        const bx = startX + planWidth - 8, by = planY;
        const badge = svgEl('circle', { cx: bx, cy: by, r: 7, fill: task.color });
        badge.style.pointerEvents = 'none';
        g.appendChild(badge);
        const check = svgEl('text', {
          x: bx, y: by,
          'text-anchor': 'middle', 'dominant-baseline': 'central',
          'font-size': 9, fill: '#fff',
          'font-family': 'system-ui,sans-serif', 'font-weight': '900',
        }, '✓');
        check.style.pointerEvents = 'none';
        g.appendChild(check);
      }

      if (hasChildren(task.id)) {
        const childCount = getChildTasks(task.id).length;
        const isExpanded = viewMode === 'hierarchy' ? expandedSet.has(task.id) : task.id === selectedParentId;
        const labelX = startX + planWidth + 6;
        const labelY = planY + PLAN_BAR_H / 2 + 4;

        // Transparent hit area so the label is clickable
        g.appendChild(svgEl('rect', {
          x: labelX - 4, y: planY - 1,
          width: 38, height: PLAN_BAR_H + 2,
          fill: 'transparent',
          'data-id': task.id, 'data-type': 'toggle', style: 'cursor: pointer',
        }));
        const countLabel = svgEl('text', {
          x: labelX, y: labelY,
          'font-size': 10, fill: task.color,
          'font-family': 'system-ui,sans-serif', 'font-weight': '600',
          'data-id': task.id, 'data-type': 'toggle', style: 'cursor: pointer',
        }, `${childCount} ${isExpanded ? '▾' : '▸'}`);
        g.appendChild(countLabel);

        const tip = svgEl('title');
        tip.textContent = `${childCount}${t(isExpanded ? 'tooltipCollapse' : 'tooltipExpand')}`;
        g.insertBefore(tip, g.firstChild);
      }

      // Actual bar
      const actualY = planY + PLAN_BAR_H + BARS_GAP;
      const hasActual = !!task.actualStart;
      const actualStartX = hasActual ? xCtx(strToDate(task.actualStart), ctx) : startX;
      const actualEndX = hasActual && task.actualEnd ? xCtx(strToDate(task.actualEnd), ctx) : endX;
      const actualWidth = Math.max(actualEndX - actualStartX, ctx.dayWidth);
      const progress = Math.max(0, Math.min(100, task.progress || 0));

      g.appendChild(svgEl('rect', {
        x: actualStartX, y: actualY, width: actualWidth, height: ACTUAL_BAR_H, rx: 3, ry: 3,
        fill: hasActual ? `rgba(${rgb},0.25)` : `rgba(${rgb},0.08)`,
        stroke: hasActual ? task.color : '#d0d5dd', 'stroke-width': hasActual ? 1 : 0.5,
        class: 'task-bar actual-bar', 'data-id': task.id, 'data-type': 'actual', style: 'cursor: pointer',
      }));

      if (progress > 0 && hasActual) {
        const progressWidth = Math.min(actualWidth * progress / 100, actualWidth);
        const clipId = `clip-${task.id}${isDraggable ? '' : '-s'}`;
        const clip = svgEl('clipPath', { id: clipId });
        clip.appendChild(svgEl('rect', { x: actualStartX, y: actualY, width: actualWidth, height: ACTUAL_BAR_H, rx: 3, ry: 3 }));
        g.appendChild(clip);
        const progressFill = svgEl('rect', { x: actualStartX, y: actualY, width: progressWidth, height: ACTUAL_BAR_H, rx: 3, ry: 3, fill: task.color, opacity: 0.85, 'clip-path': `url(#${clipId})` });
        progressFill.style.pointerEvents = 'none';
        g.appendChild(progressFill);
        if (actualWidth > 36) {
          const pct = svgEl('text', {
            x: actualStartX + Math.min(progressWidth + 4, actualWidth - 4), y: actualY + ACTUAL_BAR_H / 2 + 4,
            'font-size': 9, fill: progress > 60 ? '#fff' : '#344054', 'font-family': 'system-ui,sans-serif', 'font-weight': '600',
            'text-anchor': progress > 60 ? 'end' : 'start',
          }, `${progress}%`);
          pct.style.pointerEvents = 'none';
          g.appendChild(pct);
        }
      }

      if (isDraggable && hasActual) {
        g.appendChild(svgEl('rect', { x: actualStartX, y: actualY, width: 6, height: ACTUAL_BAR_H, rx: 3, ry: 3, fill: `rgba(${rgb},0.45)`, class: 'drag-handle drag-handle-left', 'data-id': task.id, 'data-type': 'actual', style: 'cursor: ew-resize' }));
        g.appendChild(svgEl('rect', { x: actualStartX + actualWidth - 6, y: actualY, width: 6, height: ACTUAL_BAR_H, rx: 3, ry: 3, fill: `rgba(${rgb},0.45)`, class: 'drag-handle drag-handle-right', 'data-id': task.id, 'data-type': 'actual', style: 'cursor: ew-resize' }));
      }
      barGroup.appendChild(g);
    }
  });
  return barGroup;
}

// ── Generic: full SVG ──────────────────────────────────────────────────────────
function renderGanttSVGTo(svgId, flatItems, ctx, isDraggable) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  svg.innerHTML = '';
  svg.setAttribute('width', ctx.svgWidth);
  svg.setAttribute('height', ctx.svgHeight);

  const defs = svgEl('defs');
  const marker = svgEl('marker', { id: `arrow-${svgId}`, markerWidth: 8, markerHeight: 8, refX: 6, refY: 3, orient: 'auto' });
  marker.appendChild(svgEl('path', { d: 'M0,0 L0,6 L8,3 z', fill: svgTheme('#94a3b8', '#4a5580') }));
  defs.appendChild(marker);
  svg.appendChild(defs);

  // Grid
  const grid = svgEl('g', { class: 'grid' });
  for (let i = 0; i < ctx.totalDays; i++) {
    const d = addDays(ctx.startDate, i);
    const x = i * ctx.dayWidth;
    const isWE = d.getDay() === 0 || d.getDay() === 6;
    if (isWE) grid.appendChild(svgEl('rect', { x, y: 0, width: ctx.dayWidth, height: ctx.svgHeight, fill: svgTheme('#f9fafb', '#161924'), opacity: 0.6 }));
    grid.appendChild(svgEl('line', { x1: x, y1: 0, x2: x, y2: ctx.svgHeight, stroke: svgTheme('#e4e7ec', '#21262d'), 'stroke-width': 0.5 }));
  }
  svg.appendChild(grid);

  // Today line
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (today >= ctx.startDate && daysBetween(ctx.startDate, today) < ctx.totalDays) {
    const tx = xCtx(today, ctx) + ctx.dayWidth / 2;
    svg.appendChild(svgEl('line', { x1: tx, y1: 0, x2: tx, y2: ctx.svgHeight, stroke: '#f97316', 'stroke-width': 1.5, 'stroke-dasharray': '4,3', opacity: 0.7 }));
  }

  // Dependencies
  const allTasks = getTasks();
  const depGroup = svgEl('g', { class: 'dependencies' });
  flatItems.forEach(({ task }, i) => {
    task.dependencies.forEach(depId => {
      const dep = allTasks.find(t => t.id === depId);
      if (!dep) return;
      const depIdx = flatItems.findIndex(fi => fi.task.id === depId);
      if (depIdx === -1) return;
      const depEndX = xCtx(strToDate(dep.isMilestone ? dep.start : dep.end), ctx);
      const depAX = dep.isMilestone ? depEndX + MILESTONE_SIZE : depEndX;
      const depY = getRowY(depIdx, flatItems) + getRowHeight(depIdx, flatItems) / 2;
      const taskStartX = xCtx(strToDate(task.start), ctx);
      const taskY = getRowY(i, flatItems) + getRowHeight(i, flatItems) / 2;
      depGroup.appendChild(svgEl('path', {
        d: `M ${depAX} ${depY} C ${depAX + 20} ${depY} ${taskStartX - 20} ${taskY} ${taskStartX} ${taskY}`,
        stroke: svgTheme('#94a3b8', '#4a5580'), 'stroke-width': 1.5, fill: 'none', 'marker-end': `url(#arrow-${svgId})`,
      }));
    });
  });
  svg.appendChild(depGroup);

  // Hierarchy connector lines (only in expanded hierarchy mode)
  if (viewMode === 'hierarchy') {
    const connGroup = svgEl('g', { class: 'connectors', style: 'pointer-events: none' });
    flatItems.forEach(({ task, hasChildren: hc }, i) => {
      if (!hc || !expandedSet.has(task.id)) return;
      const children = [];
      let j = i + 1;
      while (j < flatItems.length && flatItems[j].level === 1) {
        children.push(j);
        j++;
      }
      if (!children.length) return;

      const connX = xCtx(strToDate(task.start), ctx) + 6;
      const parentRh = getRowHeight(i, flatItems);
      const parentPlanY = Math.round((parentRh - BARS_TOTAL_H) / 2);
      const topY = getRowY(i, flatItems) + parentPlanY + PLAN_BAR_H + 1;
      const lastChildIdx = children[children.length - 1];
      const botY = getRowY(lastChildIdx, flatItems) + getRowHeight(lastChildIdx, flatItems) / 2;

      // Vertical line
      connGroup.appendChild(svgEl('line', {
        x1: connX, y1: topY, x2: connX, y2: botY,
        stroke: task.color, 'stroke-width': 1.2, opacity: 0.35,
      }));

      children.forEach((ci, idx) => {
        const childTask = flatItems[ci].task;
        const childMidY = getRowY(ci, flatItems) + getRowHeight(ci, flatItems) / 2;
        const childStartX = xCtx(strToDate(childTask.start), ctx);
        const isLast = idx === children.length - 1;

        // Horizontal branch
        connGroup.appendChild(svgEl('line', {
          x1: connX, y1: childMidY,
          x2: Math.max(connX + 8, childStartX),
          y2: childMidY,
          stroke: task.color, 'stroke-width': 1.2, opacity: 0.35,
        }));

        // Small dot at junction
        connGroup.appendChild(svgEl('circle', {
          cx: connX, cy: childMidY, r: 2.5,
          fill: task.color, opacity: isLast ? 0.5 : 0.35,
        }));
      });
    });
    svg.appendChild(connGroup);
  }

  svg.appendChild(renderBarsGroup(flatItems, ctx, isDraggable));
}

// ── Sub-panel ──────────────────────────────────────────────────────────────────
function setSplitHeight(show) {
  document.querySelector('.main-area')?.classList.toggle('split-view', show);
}

function renderSubPanel() {
  const panel = document.getElementById('sub-panel');
  if (!panel) return;

  if (viewMode !== 'subpanel' || !selectedParentId) {
    panel.style.display = 'none';
    setSplitHeight(false);
    return;
  }
  const parentTask = getTask(selectedParentId);
  const children = getChildTasks(selectedParentId);
  if (!parentTask || !children.length) {
    panel.style.display = 'none';
    setSplitHeight(false);
    return;
  }

  const childFlatItems = children.map(c => ({ task: c, level: 0, hasChildren: false }));
  const { start, totalDays } = computeTimeRange(children);

  panel.style.display = 'flex';
  setSplitHeight(true);

  const rightEl = document.getElementById('sub-gantt-right');
  const availW = rightEl ? rightEl.clientWidth : 600;
  const dw = Math.min(Math.max(Math.floor(availW / totalDays), MIN_DAY_WIDTH), MAX_DAY_WIDTH);
  const ctx = { startDate: start, totalDays, dayWidth: dw, svgWidth: totalDays * dw, svgHeight: Math.max(children.length * ROW_HEIGHT, 120) };
  document.getElementById('sub-panel-title').textContent = parentTask.name + t('subpanelSuffix');

  renderTimelineHeaderTo('sub-timeline-header', ctx);
  renderTaskListTo('sub-task-list', childFlatItems, {
    onTaskClick: id => window.openEditModal(id),
  });
  renderGanttSVGTo('sub-gantt-svg', childFlatItems, ctx, false);

  const subRight = document.getElementById('sub-gantt-right');
  const subHeader = document.getElementById('sub-timeline-header');
  subRight.onscroll = () => { subHeader.style.transform = `translateX(-${subRight.scrollLeft}px)`; };

  // Click on sub SVG opens edit modal
  const subSvg = document.getElementById('sub-gantt-svg');
  subSvg.onclick = e => {
    const bar = e.target.closest('[data-id]');
    if (!bar) return;
    const id = parseInt(bar.dataset.id);
    if (id) window.openEditModal(id);
  };
}

// ── Expand toggle (called from bar click in app.js) ───────────────────────────
window.toggleExpand = function(taskId) {
  if (viewMode === 'hierarchy') {
    if (expandedSet.has(taskId)) expandedSet.delete(taskId);
    else expandedSet.add(taskId);
  } else {
    selectedParentId = selectedParentId === taskId ? null : taskId;
  }
  render();
};

// ── Main render ────────────────────────────────────────────────────────────────
function render() {
  const flatItems = getFlattenedItems();
  const visibleTasks = flatItems.map(fi => fi.task);

  const { start, totalDays } = computeTimeRange(visibleTasks);
  const rightPanel = document.getElementById('gantt-right');
  const availW = rightPanel ? rightPanel.clientWidth : 800;
  DAY_WIDTH = Math.min(Math.max(Math.floor(availW / totalDays), MIN_DAY_WIDTH), MAX_DAY_WIDTH);

  viewState.startDate = start;
  viewState.totalDays = totalDays;
  viewState.svgWidth = totalDays * DAY_WIDTH;
  viewState.svgHeight = Math.max(getTotalSvgHeight(flatItems), 200);

  const mainCtx = { startDate: start, totalDays, dayWidth: DAY_WIDTH, svgWidth: viewState.svgWidth, svgHeight: viewState.svgHeight };

  renderTimelineHeaderTo('timeline-header', mainCtx);
  renderTaskListTo('task-list', flatItems, {
    onToggle: taskId => {
      if (viewMode === 'hierarchy') {
        if (expandedSet.has(taskId)) expandedSet.delete(taskId);
        else expandedSet.add(taskId);
      } else {
        selectedParentId = selectedParentId === taskId ? null : taskId;
      }
      render();
    },
    onTaskClick: id => window.openEditModal(id),
  });
  renderGanttSVGTo('gantt-svg', flatItems, mainCtx, true);
  renderSubPanel();
  syncScroll();
  if (typeof initDrag === 'function') initDrag();

  // Sync mode toggle button state
  document.getElementById('btn-mode-hierarchy')?.classList.toggle('active', viewMode === 'hierarchy');
  document.getElementById('btn-mode-subpanel')?.classList.toggle('active', viewMode === 'subpanel');
}

function syncScroll() {
  const right = document.getElementById('gantt-right');
  const header = document.getElementById('timeline-header');
  if (right && header) {
    right.onscroll = () => { header.style.transform = `translateX(-${right.scrollLeft}px)`; };
  }
}
