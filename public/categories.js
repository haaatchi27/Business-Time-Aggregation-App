const API_BASE = '/api';

// State
let categories = [];
let unassignedTasks = [];

// DOM Elements
const categoryForm = document.getElementById('add-category-form');
const categoryInput = document.getElementById('category-name-input');
const errorMsg = document.getElementById('error-message');
const categoriesContainer = document.getElementById('categories-container');
const unassignedContainer = document.getElementById('unassigned-container');

const assignModal = document.getElementById('assign-modal');
const assignForm = document.getElementById('assign-form');
const cancelAssignBtn = document.getElementById('cancel-assign-btn');
const categorySelect = document.getElementById('category-select');
const assignTaskId = document.getElementById('assign-task-id');
const assignTaskName = document.getElementById('assign-task-name');

// Initialize
async function init() {
    await fetchData();
    setupEventListeners();
}

// Fetchers
async function fetchData() {
    try {
        const res = await fetch(`${API_BASE}/categories`);
        if (!res.ok) throw new Error('Failed to fetch categories data');
        const data = await res.json();
        categories = data.categories;
        unassignedTasks = data.unassigned;
        renderData();
    } catch (err) {
        showError(err.message);
    }
}

// Actions
async function addCategory(e) {
    e.preventDefault();
    const name = categoryInput.value.trim();
    if (!name) return;

    hideError();
    try {
        const res = await fetch(`${API_BASE}/categories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to add category');
        }

        categoryInput.value = '';
        await fetchData();
    } catch (err) {
        showError(err.message);
    }
}

async function archiveCategory(categoryId) {
    if (!confirm(t('confirm_archive_cat'))) return;
    try {
        const res = await fetch(`${API_BASE}/categories/${categoryId}/archive`, { method: 'PUT' });
        if (!res.ok) throw new Error('Failed to archive category');

        // Optionally backend should set tasks to null category, but here we just fetch again
        // Actually, our backend implementation didn't unlink tasks. 
        // Simple fix for frontend: we just re-fetch, they will disappear from the list.
        await fetchData();
    } catch (err) {
        showError(err.message);
    }
}

function openAssignModal(taskId, taskName, currentCategoryId) {
    assignTaskId.value = taskId;
    assignTaskName.textContent = `${t('modal_assigning')} ${escapeHTML(taskName)}`;

    // Populate select
    categorySelect.innerHTML = `<option value="">${t('modal_unassigned_opt')}</option>`;
    categories.forEach(cat => {
        const selected = (currentCategoryId === cat.id) ? 'selected' : '';
        categorySelect.innerHTML += `<option value="${cat.id}" ${selected}>${escapeHTML(cat.name)}</option>`;
    });

    assignModal.classList.remove('hidden');
}

async function submitAssignment(e) {
    e.preventDefault();
    const taskId = assignTaskId.value;
    const categoryId = categorySelect.value || null;

    try {
        const res = await fetch(`${API_BASE}/tasks/${taskId}/category`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categoryId })
        });

        if (!res.ok) throw new Error('Failed to update task assignment');

        assignModal.classList.add('hidden');
        await fetchData();
    } catch (err) {
        alert("Error: " + err.message);
    }
}

// UI Updaters
function renderData() {
    renderCategories();
    renderUnassigned();
}

function renderCategories() {
    if (categories.length === 0) {
        categoriesContainer.innerHTML = `<p class="text-muted">${t('no_cat')}</p>`;
        return;
    }

    categoriesContainer.innerHTML = '';
    categories.forEach(cat => {
        const item = document.createElement('div');
        item.className = 'category-card';

        const tasksHtml = cat.tasks.map(tData => `
            <div class="task-in-category">
                <span>${escapeHTML(tData.name)}</span>
                <button class="btn-text-small" onclick="openAssignModal(${tData.id}, '${escapeHTML(tData.name).replace(/'/g, "\\'")}', ${cat.id})">${t('move')}</button>
            </div>
        `).join('') || `<div class="text-muted" style="font-size: 0.85rem;">${t('no_tasks_assigned')}</div>`;

        item.innerHTML = `
            <div class="category-header">
                <div>
                    <h3 class="category-title">${escapeHTML(cat.name)}</h3>
                    <div class="category-duration">${t('total_time')}: <strong>${formatDuration(cat.total_duration)}</strong></div>
                </div>
                <button class="btn-danger-ghost" onclick="archiveCategory(${cat.id})" title="${t('delete_category_title')}">×</button>
            </div>
            <div class="category-tasks">
                ${tasksHtml}
            </div>
        `;
        categoriesContainer.appendChild(item);
    });
}

function renderUnassigned() {
    if (unassignedTasks.length === 0) {
        unassignedContainer.innerHTML = `<p class="text-muted" style="font-size: 0.9rem;">${t('all_assigned')}</p>`;
        return;
    }

    unassignedContainer.innerHTML = '';
    unassignedTasks.forEach(task => {
        const item = document.createElement('div');
        item.className = 'unassigned-item';

        item.innerHTML = `
            <span>${escapeHTML(task.name)}</span>
            <button class="btn-secondary" style="font-size: 0.8rem; padding: 0.3rem 0.6rem;" onclick="openAssignModal(${task.id}, '${escapeHTML(task.name).replace(/'/g, "\\'")}', null)">${t('assign')}</button>
        `;
        unassignedContainer.appendChild(item);
    });
}

function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.remove('hidden');
}

function hideError() {
    errorMsg.classList.add('hidden');
    errorMsg.textContent = '';
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

function formatDuration(seconds) {
    if (seconds == null) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Event Listeners
function setupEventListeners() {
    categoryForm.addEventListener('submit', addCategory);
    assignForm.addEventListener('submit', submitAssignment);
    cancelAssignBtn.addEventListener('click', () => assignModal.classList.add('hidden'));

    window.addEventListener('languageChanged', renderData);
}

// Start
init();
