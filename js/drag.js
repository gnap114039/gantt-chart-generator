let dragState = null;
let _dragSnapshotDone = false;

function initDrag() {
  const svg = document.getElementById('gantt-svg');
  if (!svg) return;

  svg.removeEventListener('mousedown', onMouseDown);
  svg.addEventListener('mousedown', onMouseDown);
}

function getSvgX(svg, clientX) {
  const rect = svg.getBoundingClientRect();
  return clientX - rect.left + (document.getElementById('gantt-right').scrollLeft || 0);
}

function onMouseDown(e) {
  const target = e.target;
  const svg = document.getElementById('gantt-svg');

  const idEl = target.dataset.id ? target : target.closest('[data-id]');
  if (!idEl) return;
  const taskId = parseInt(idEl.dataset.id);
  const barType = idEl.dataset.type || 'plan';

  const task = getTask(taskId);
  if (!task) return;

  const svgX = getSvgX(svg, e.clientX);

  const isActual = barType === 'actual';
  const origStart = isActual ? (task.actualStart || task.start) : task.start;
  const origEnd   = isActual ? (task.actualEnd   || task.end)   : task.end;

  let mode = 'move';
  if (target.classList.contains('drag-handle-left'))  mode = 'left';
  if (target.classList.contains('drag-handle-right')) mode = 'right';

  dragState = {
    taskId, mode, barType,
    startMouseX: svgX,
    origStart, origEnd,
  };

  _dragSnapshotDone = false;
  setSuspendHistory(true);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  e.preventDefault();
}

function onMouseMove(e) {
  if (!dragState) return;
  const svg = document.getElementById('gantt-svg');
  const svgX = getSvgX(svg, e.clientX);
  const daysDelta = Math.round((svgX - dragState.startMouseX) / DAY_WIDTH);

  if (daysDelta !== 0 && !_dragSnapshotDone) {
    captureUndoSnapshot();
    _dragSnapshotDone = true;
  }

  const task = getTask(dragState.taskId);
  if (!task) return;

  const isActual = dragState.barType === 'actual';
  const startKey = isActual ? 'actualStart' : 'start';
  const endKey   = isActual ? 'actualEnd'   : 'end';

  if (dragState.mode === 'move') {
    updateTask(task.id, {
      [startKey]: dateToStr(addDays(strToDate(dragState.origStart), daysDelta)),
      [endKey]:   dateToStr(addDays(strToDate(dragState.origEnd),   daysDelta)),
    });
  } else if (dragState.mode === 'left') {
    const newStart = addDays(strToDate(dragState.origStart), daysDelta);
    if (newStart < strToDate(isActual ? task.actualEnd || task.end : task.end)) {
      updateTask(task.id, { [startKey]: dateToStr(newStart) });
    }
  } else if (dragState.mode === 'right') {
    const newEnd = addDays(strToDate(dragState.origEnd), daysDelta);
    if (newEnd > strToDate(isActual ? task.actualStart || task.start : task.start)) {
      updateTask(task.id, { [endKey]: dateToStr(newEnd) });
    }
  }

  render();
}

function onMouseUp() {
  setSuspendHistory(false);
  _dragSnapshotDone = false;
  dragState = null;
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
}
