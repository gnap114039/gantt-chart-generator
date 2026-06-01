function openModal(taskId = null, parentId = null) {
  const overlay = document.getElementById('modal-overlay');
  const title = document.getElementById('modal-title');
  const form = document.getElementById('task-form');
  const deleteBtn = document.getElementById('btn-delete-task');
  const subTaskSection = document.getElementById('subtask-section');

  form.reset();
  document.getElementById('task-id').value = '';
  document.getElementById('task-parent-id').value = parentId || '';
  document.getElementById('progress-display').textContent = '0%';

  populateDependencyOptions(taskId);

  if (taskId) {
    const task = getTask(taskId);
    if (!task) return;
    title.textContent = t('modalEditTask');
    document.getElementById('task-id').value = task.id;
    document.getElementById('task-parent-id').value = task.parentId || '';
    document.getElementById('task-name').value = task.name;
    document.getElementById('task-start').value = task.start;
    document.getElementById('task-end').value = task.end;
    document.getElementById('task-color').value = task.color;
    document.getElementById('task-milestone').checked = task.isMilestone;
    document.getElementById('task-actual-start').value = task.actualStart || '';
    document.getElementById('task-actual-end').value = task.actualEnd || '';
    document.getElementById('task-progress').value = task.progress || 0;
    document.getElementById('progress-display').textContent = (task.progress || 0) + '%';
    deleteBtn.style.display = 'inline-block';

    Array.from(document.getElementById('task-dependencies').options).forEach(opt => {
      opt.selected = task.dependencies.includes(parseInt(opt.value));
    });

    renderSubTaskSection(task.id);
    subTaskSection.style.display = 'block';
  } else {
    title.textContent = t(parentId ? 'modalAddSubtask' : 'modalAddTask');
    deleteBtn.style.display = 'none';
    subTaskSection.style.display = 'none';
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 6);
    document.getElementById('task-start').value = todayStr;
    document.getElementById('task-end').value = endDate.toISOString().slice(0, 10);
    document.getElementById('task-actual-start').value = '';
    document.getElementById('task-actual-end').value = '';
    document.getElementById('task-progress').value = 0;
    if (parentId) {
      const parent = getTask(parseInt(parentId));
      if (parent) document.getElementById('task-color').value = parent.color;
    }
  }

  overlay.style.display = 'flex';
  document.getElementById('task-name').focus();
}

function renderSubTaskSection(parentId) {
  const list = document.getElementById('subtask-list');
  list.innerHTML = '';
  const children = getChildTasks(parentId);

  if (!children.length) {
    const empty = document.createElement('p');
    empty.className = 'subtask-empty';
    empty.textContent = t('subtaskEmpty');
    list.appendChild(empty);
    return;
  }

  children.forEach(child => {
    const item = document.createElement('div');
    item.className = 'subtask-item';

    const dot = document.createElement('span');
    dot.className = 'subtask-dot';
    dot.style.background = child.color;

    const name = document.createElement('span');
    name.className = 'subtask-name';
    name.textContent = child.name;

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn-subtask-edit';
    editBtn.textContent = t('subtaskEdit');
    editBtn.addEventListener('click', () => {
      returnStack.push(parentId);
      openModal(child.id);
    });

    item.appendChild(dot);
    item.appendChild(name);
    item.appendChild(editBtn);
    list.appendChild(item);
  });
}

const returnStack = [];

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  const ret = returnStack.pop();
  if (ret !== undefined) openModal(ret);
}

function getTaskDepth(task) {
  let depth = 0, cur = task;
  while (cur.parentId) {
    cur = getTask(cur.parentId);
    if (!cur) break;
    depth++;
  }
  return depth;
}

function populateDependencyOptions(excludeId) {
  const select = document.getElementById('task-dependencies');
  select.innerHTML = '';
  getTasks().forEach(task => {
    if (task.id === excludeId) return;
    const opt = document.createElement('option');
    opt.value = task.id;
    const depth = getTaskDepth(task);
    opt.textContent = depth > 0 ? '  '.repeat(depth) + '└ ' + task.name : task.name;
    select.appendChild(opt);
  });
}

function initModal() {
  const overlay = document.getElementById('modal-overlay');
  const form = document.getElementById('task-form');

  document.getElementById('task-progress').addEventListener('input', e => {
    document.getElementById('progress-display').textContent = e.target.value + '%';
  });

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.style.display !== 'none') closeModal();
  });

  document.getElementById('btn-cancel').addEventListener('click', closeModal);

  document.getElementById('btn-add-subtask').addEventListener('click', () => {
    const parentId = parseInt(document.getElementById('task-id').value);
    if (parentId) {
      returnStack.push(parentId);
      document.getElementById('modal-overlay').style.display = 'none';
      openModal(null, parentId);
    }
  });

  document.getElementById('btn-delete-task').addEventListener('click', () => {
    const id = parseInt(document.getElementById('task-id').value);
    if (!id) return;
    const childCount = getChildTasks(id).length;
    const msg = childCount > 0
      ? t('confirmDeleteWithChildren').replace('{name}', getTask(id)?.name).replace('{count}', childCount)
      : t('confirmDelete');
    if (confirm(msg)) {
      deleteTask(id);
      closeModal();
      render();
    }
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const id = document.getElementById('task-id').value;
    const parentId = document.getElementById('task-parent-id').value;
    const name = document.getElementById('task-name').value.trim();
    const start = document.getElementById('task-start').value;
    const end = document.getElementById('task-end').value;
    const color = document.getElementById('task-color').value;
    const isMilestone = document.getElementById('task-milestone').checked;
    const actualStart = document.getElementById('task-actual-start').value || null;
    const actualEnd = document.getElementById('task-actual-end').value || null;
    const progress = parseInt(document.getElementById('task-progress').value) || 0;
    const dependencies = Array.from(document.getElementById('task-dependencies').selectedOptions).map(o => parseInt(o.value));

    if (!name || !start || !end) return;
    if (start > end && !isMilestone) {
      alert(t('errorDateRange'));
      return;
    }

    const data = {
      name, start, end: isMilestone ? start : end, color, isMilestone,
      dependencies, actualStart, actualEnd, progress,
      parentId: parentId ? parseInt(parentId) : null,
    };

    if (id) {
      updateTask(parseInt(id), data);
    } else {
      addTask(data);
    }

    closeModal();
    render();
  });
}

window.openEditModal = id => { returnStack.length = 0; openModal(id); };
window.openAddModal = () => { returnStack.length = 0; openModal(null); };
window.openAddSubTaskModal = parentId => { returnStack.length = 0; openModal(null, parentId); };
