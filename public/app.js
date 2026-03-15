const API_BASE = '/api';

// State
let tasks = [];
let records = [];
let activeRecord = null;
let timerInterval = null;

// DOM Elements
const taskForm = document.getElementById('add-task-form');
const taskInput = document.getElementById('task-name-input');
const errorMsg = document.getElementById('error-message');
const tasksContainer = document.getElementById('tasks-container');
const timelineContainer = document.getElementById('timeline-container');
const stopBtn = document.getElementById('stop-button');
const taskSortSelect = document.getElementById('task-sort');
const taskSortReverse = document.getElementById('task-sort-reverse');
const taskSearchInput = document.getElementById('task-search-input');

const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-record-form');
const cancelEditBtn = document.getElementById('cancel-edit-btn');

// Initialize
async function init() {
    await fetchTasks();
    await fetchRecords();
    setupEventListeners();
    startLiveTimer();
}

// Fetchers
async function fetchTasks() {
    try {
        const res = await fetch(`${API_BASE}/tasks`);
        if (!res.ok) throw new Error('Failed to fetch tasks');
        tasks = await res.json();
        renderTasks();
    } catch (err) {
        showError(err.message);
    }
}

async function fetchRecords() {
    try {
        const res = await fetch(`${API_BASE}/records/today`);
        if (!res.ok) throw new Error('Failed to fetch records');
        const data = await res.json();
        records = data.records;
        activeRecord = data.activeRecord;
        renderTimeline();
        updateStopButtonState();
        renderTasks(); // To update active styles on tasks
    } catch (err) {
        showError(err.message);
    }
}

// Actions
async function addTask(e) {
    e.preventDefault();
    const name = taskInput.value.trim();
    if (!name) return;

    hideError();
    try {
        const res = await fetch(`${API_BASE}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to add task');
        }

        taskInput.value = '';
        await fetchTasks();
    } catch (err) {
        showError(err.message);
    }
}

async function startTask(taskId) {
    hideError();
    try {
        const res = await fetch(`${API_BASE}/records/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_id: taskId })
        });

        if (!res.ok) throw new Error('Failed to start task');
        await fetchRecords();
    } catch (err) {
        showError("通信エラー: " + err.message);
    }
}

async function stopTask() {
    if (!activeRecord) return;
    hideError();
    try {
        const res = await fetch(`${API_BASE}/records/stop`, {
            method: 'POST'
        });

        if (!res.ok) throw new Error('Failed to stop task');
        await fetchRecords();
    } catch (err) {
        showError("通信エラー: " + err.message);
    }
}

async function archiveTask(taskId) {
    if (!confirm(t('confirm_archive_task'))) return;

    try {
        const res = await fetch(`${API_BASE}/tasks/${taskId}/archive`, { method: 'PUT' });
        if (!res.ok) throw new Error('Failed to archive task');
        await fetchTasks();
    } catch (err) {
        showError(err.message);
    }
}

async function deleteRecord(recordId) {
    if (!confirm(t('confirm_delete_record'))) return;
    try {
        const res = await fetch(`${API_BASE}/records/${recordId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete record');
        await fetchRecords();
    } catch (err) {
        showError(err.message);
    }
}

// UI Updaters
function renderTasks() {
    if (tasks.length === 0) {
        tasksContainer.innerHTML = `<p class="text-muted">${t('no_tasks_added')}</p>`;
        return;
    }

    // Filter tasks by search query
    const searchQuery = taskSearchInput ? taskSearchInput.value.toLowerCase() : '';
    const filteredTasks = searchQuery
        ? tasks.filter(task => task.name.toLowerCase().includes(searchQuery))
        : tasks;

    // Sort tasks based on criteria
    const sortBy = taskSortSelect.value;
    const sortedTasks = [...filteredTasks].sort((a, b) => {
        if (sortBy === 'created_at') {
            // Newest first (Descending)
            const timeA = a.created_at ? new Date(a.created_at.replace(' ', 'T')).getTime() : 0;
            const timeB = b.created_at ? new Date(b.created_at.replace(' ', 'T')).getTime() : 0;
            if (timeA === timeB) return b.id - a.id; // Fallback to ID DESC for stability
            return timeB - timeA;
        } else if (sortBy === 'activity') {
            // Most recent activity first (Descending)
            const timeA = a.last_activity_at ? new Date(a.last_activity_at.replace(' ', 'T')).getTime() : 0;
            const timeB = b.last_activity_at ? new Date(b.last_activity_at.replace(' ', 'T')).getTime() : 0;
            if (timeA === timeB) return b.id - a.id; // Fallback to ID DESC
            return timeB - timeA;
        } else if (sortBy === 'abc') {
            // Alphabetical (Ascending A-Z)
            return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        }
        return 0;
    });

    if (taskSortReverse.checked) {
        sortedTasks.reverse();
    }

    tasksContainer.innerHTML = '';

    if (sortedTasks.length === 0) {
        tasksContainer.innerHTML = `<p class="text-muted">${t('no_tasks_added')}</p>`;
        return;
    }

    sortedTasks.forEach(task => {
        const isActive = activeRecord && activeRecord.task_id === task.id;

        const item = document.createElement('div');
        item.className = 'task-item';

        item.innerHTML = `
            <button class="task-btn ${isActive ? 'active' : ''}" onclick="startTask(${task.id})">
                ${escapeHTML(task.name)}
                ${isActive ? `<span style="float:right; font-size: 0.8rem;">${t('active_rec')}</span>` : ''}
            </button>
            <div class="task-actions">
                <button class="btn-danger-ghost" onclick="archiveTask(${task.id})" title="Archive">×</button>
            </div>
        `;
        tasksContainer.appendChild(item);
    });
}

function renderTimeline() {
    if (records.length === 0) {
        timelineContainer.innerHTML = `<p class="text-muted">${t('no_activity')}</p>`;
        return;
    }

    // Sort records chronologically (oldest first)
    const sortedRecords = [...records].sort((a, b) => {
        const timeA = new Date(a.start_time.replace(' ', 'T')).getTime();
        const timeB = new Date(b.start_time.replace(' ', 'T')).getTime();
        return timeA - timeB;
    });

    timelineContainer.innerHTML = '';
    sortedRecords.forEach(record => {
        const isRunning = !record.end_time;
        const item = document.createElement('div');
        item.className = `timeline-item ${isRunning ? 'active-record' : ''}`;

        let displayDuration = '';
        if (isRunning) {
            displayDuration = `<span id="live-timer-${record.id}">00:00:00</span>`;
        } else {
            displayDuration = formatDuration(record.duration_sec);
        }

        const startDisplay = formatTime(record.start_time);
        const endDisplay = isRunning ? t('now_label') : formatTime(record.end_time);

        item.innerHTML = `
            <div class="timeline-header">
                <span class="timeline-task-name">${escapeHTML(record.task_name)}</span>
                <span class="timeline-duration">${displayDuration}</span>
            </div>
            <div class="timeline-time">${startDisplay} - ${endDisplay}</div>
            <div class="timeline-actions">
                <button class="btn-danger-ghost" style="color: var(--text-main);" onclick="openEditModal(${record.id}, '${record.start_time}', '${record.end_time || ''}')">${t('edit')}</button>
                <button class="btn-danger-ghost" onclick="deleteRecord(${record.id})">${t('delete')}</button>
            </div>
        `;
        timelineContainer.appendChild(item);
    });
}

function updateStopButtonState() {
    if (activeRecord) {
        stopBtn.disabled = false;
        stopBtn.textContent = t('stop_tracking');
    } else {
        stopBtn.disabled = true;
        stopBtn.textContent = t('nothing_to_stop');
    }
}

function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.remove('hidden');
}

function hideError() {
    errorMsg.classList.add('hidden');
    errorMsg.textContent = '';
}

// Modals
function openEditModal(id, startStr, endStr) {
    document.getElementById('edit-record-id').value = id;
    // Format YYYY-MM-DD HH:MM:SS to YYYY-MM-DDTHH:MM:SS for datetime-local
    document.getElementById('edit-start-time').value = startStr.replace(' ', 'T');
    document.getElementById('edit-end-time').value = endStr ? endStr.replace(' ', 'T') : '';
    editModal.classList.remove('hidden');
}

async function submitEdit(e) {
    e.preventDefault();
    const id = document.getElementById('edit-record-id').value;
    const startStr = document.getElementById('edit-start-time').value.replace('T', ' ');
    const endStr = document.getElementById('edit-end-time').value.replace('T', ' ');

    try {
        const res = await fetch(`${API_BASE}/records/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                start_time: startStr,
                end_time: endStr || null
            })
        });
        if (!res.ok) throw new Error('Failed to update record');

        editModal.classList.add('hidden');
        await fetchRecords();
    } catch (err) {
        alert("Error: " + err.message);
    }
}

// Utilities
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

function formatTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr.replace(' ', 'T'));
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(seconds) {
    if (seconds == null || seconds < 0) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Live timer updater
function startLiveTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!activeRecord) return;
        const liveSpan = document.getElementById(`live-timer-${activeRecord.id}`);
        if (!liveSpan) return;

        const startTimestamp = new Date(activeRecord.start_time.replace(' ', 'T')).getTime();
        const now = new Date().getTime();
        const diffSec = Math.floor((now - startTimestamp) / 1000);
        liveSpan.textContent = formatDuration(Math.max(0, diffSec));
    }, 1000);
}

// Event Listeners
function setupEventListeners() {
    taskForm.addEventListener('submit', addTask);
    stopBtn.addEventListener('click', stopTask);
    editForm.addEventListener('submit', submitEdit);
    cancelEditBtn.addEventListener('click', () => editModal.classList.add('hidden'));

    taskSortSelect.addEventListener('change', renderTasks);
    taskSortReverse.addEventListener('change', renderTasks);
    taskSearchInput.addEventListener('input', renderTasks);

    // Re-render strings when language changes
    window.addEventListener('languageChanged', () => {
        applyTranslations(); // Ensure static texts are updated first
        renderTasks();
        renderTimeline();
        updateStopButtonState();
    });
}

// Start
init();
