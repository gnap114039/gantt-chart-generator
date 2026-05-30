const STORAGE_KEY = 'gantt_tasks';
const PROJECT_NAME_KEY = 'gantt_project_name';

let tasks = [];
let nextId = 1;

function getProjectName() {
  return localStorage.getItem(PROJECT_NAME_KEY) || '專案名稱';
}
function setProjectName(name) {
  localStorage.setItem(PROJECT_NAME_KEY, name.trim() || '專案名稱');
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      tasks = saved.tasks || [];
      nextId = saved.nextId || (tasks.length ? Math.max(...tasks.map(t => t.id)) + 1 : 1);
    }
  } catch (e) {
    tasks = [];
    nextId = 1;
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks, nextId }));
  if (typeof window._ganttDataChanged === 'function') window._ganttDataChanged();
}

function getTasks() { return tasks; }

function getTask(id) { return tasks.find(t => t.id === id) || null; }

function getChildTasks(parentId) {
  return tasks.filter(t => t.parentId === parentId);
}

function hasChildren(taskId) {
  return tasks.some(t => t.parentId === taskId);
}

function getTopLevelTasks() {
  return tasks.filter(t => !t.parentId);
}

function addTask(data) {
  const task = {
    id: nextId++,
    name: data.name || '新任務',
    start: data.start,
    end: data.end,
    color: data.color || '#4A90D9',
    dependencies: data.dependencies || [],
    isMilestone: !!data.isMilestone,
    actualStart: data.actualStart || null,
    actualEnd: data.actualEnd || null,
    progress: data.progress != null ? Number(data.progress) : 0,
    parentId: data.parentId || null,
  };
  tasks.push(task);
  saveTasks();
  return task;
}

function updateTask(id, data) {
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return null;
  tasks[idx] = { ...tasks[idx], ...data };
  saveTasks();
  return tasks[idx];
}

function deleteTask(id) {
  // Delete children first
  getChildTasks(id).forEach(c => deleteTask(c.id));
  tasks = tasks.filter(t => t.id !== id);
  tasks.forEach(t => {
    t.dependencies = t.dependencies.filter(dep => dep !== id);
  });
  saveTasks();
}

function clearTasks() {
  tasks = [];
  nextId = 1;
  saveTasks();
}
