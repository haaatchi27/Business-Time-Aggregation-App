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
const assignTaskId = document.getElementById('assign-task-id');
const assignTaskName = document.getElementById('assign-task-name');

// Searchable select elements
const searchableSelect = document.getElementById('searchable-category-select');
const categorySearchInput = document.getElementById('category-search-input');
const categorySelectValue = document.getElementById('category-select-value');
const categoryOptionsList = document.getElementById('category-options-list');

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

    // Sort categories by name
    const sortedCategories = [...categories].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );

    // Store sorted categories for filtering
    searchableSelect._categories = sortedCategories;
    searchableSelect._currentCategoryId = currentCategoryId;

    // Set initial display
    const currentCat = sortedCategories.find(c => c.id === currentCategoryId);
    if (currentCat) {
        categorySearchInput.value = currentCat.name;
        categorySelectValue.value = currentCat.id;
    } else {
        categorySearchInput.value = t('modal_unassigned_opt');
        categorySelectValue.value = '';
    }

    // Render filtered options
    renderCategoryOptions(sortedCategories, currentCategoryId, '');

    searchableSelect.classList.remove('open');
    assignModal.classList.remove('hidden');
}

function renderCategoryOptions(sortedCategories, selectedId, filter) {
    categoryOptionsList.innerHTML = '';

    // Unassigned option (always shown)
    const unassignedOpt = document.createElement('div');
    unassignedOpt.className = 'searchable-select-option unassigned-opt';
    if (!selectedId && selectedId !== 0) unassignedOpt.classList.add('selected');
    unassignedOpt.textContent = t('modal_unassigned_opt');
    unassignedOpt.dataset.value = '';
    unassignedOpt.addEventListener('click', () => selectCategoryOption('', t('modal_unassigned_opt')));
    categoryOptionsList.appendChild(unassignedOpt);

    const filterLower = filter.toLowerCase();
    let hasResults = false;

    sortedCategories.forEach(cat => {
        if (filterLower && !cat.name.toLowerCase().includes(filterLower)) return;
        hasResults = true;

        const opt = document.createElement('div');
        opt.className = 'searchable-select-option';
        if (selectedId === cat.id) opt.classList.add('selected');
        opt.textContent = cat.name;
        opt.dataset.value = cat.id;
        opt.addEventListener('click', () => selectCategoryOption(String(cat.id), cat.name));
        categoryOptionsList.appendChild(opt);
    });

    if (!hasResults && filterLower) {
        const noResult = document.createElement('div');
        noResult.className = 'searchable-select-no-results';
        noResult.textContent = currentLang === 'ja' ? '該当なし' : 'No results';
        categoryOptionsList.appendChild(noResult);
    }
}

function selectCategoryOption(value, label) {
    categorySelectValue.value = value;
    categorySearchInput.value = label;
    searchableSelect.classList.remove('open');
}

async function submitAssignment(e) {
    e.preventDefault();
    const taskId = assignTaskId.value;
    const categoryId = categorySelectValue.value || null;

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

    // Searchable dropdown events
    categorySearchInput.addEventListener('focus', () => {
        searchableSelect.classList.add('open');
        categorySearchInput.select();
    });

    categorySearchInput.addEventListener('input', () => {
        const filter = categorySearchInput.value;
        const cats = searchableSelect._categories || [];
        const currentId = searchableSelect._currentCategoryId;
        renderCategoryOptions(cats, categorySelectValue.value ? parseInt(categorySelectValue.value) : null, filter);
        searchableSelect.classList.add('open');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchableSelect.contains(e.target)) {
            searchableSelect.classList.remove('open');
        }
    });

    window.addEventListener('languageChanged', renderData);
}

// Start
init();
