const API_BASE = '/api';

// State
let reportsData = [];
let currentMode = 'daily'; // 'daily', 'weekly', 'monthly', or 'by-category'
let openReportDates = new Set();

// DOM Elements
const reportsContainer = document.getElementById('reports-container');
const errorMsg = document.getElementById('error-message');
const template = document.getElementById('report-card-template');
const reportHeader = document.getElementById('report-header');
const btnDaily = document.getElementById('btn-daily');
const btnWeekly = document.getElementById('btn-weekly');
const btnMonthly = document.getElementById('btn-monthly');
const btnCategory = document.getElementById('btn-category');

// Edit Modal Elements
const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-record-form');
const cancelEditBtn = document.getElementById('cancel-edit-btn');

// Add Modal Elements
const addModal = document.getElementById('add-modal');
const addForm = document.getElementById('add-record-form');
const cancelAddBtn = document.getElementById('cancel-add-btn');
const addTaskInput = document.getElementById('add-task-input');
const addTaskId = document.getElementById('add-task-id');
const addTaskOptions = document.getElementById('add-task-options');
const addTaskDropdown = document.getElementById('add-task-dropdown');
let allTasks = [];

// Initialize
async function init() {
    setupModeToggle();
    setupEventListeners();
    await fetchReports();
}

// Fetchers
async function fetchReports() {
    try {
        let endpoint = 'daily';
        if (currentMode === 'weekly') endpoint = 'weekly';
        if (currentMode === 'monthly') endpoint = 'monthly';
        if (currentMode === 'by-category') endpoint = 'by-category';

        const res = await fetch(`${API_BASE}/reports/${endpoint}`);
        if (!res.ok) throw new Error('Failed to fetch reports');
        reportsData = await res.json();
        renderReports();
    } catch (err) {
        showError(err.message);
    }
}

function setActiveButton(activeBtn) {
    [btnDaily, btnWeekly, btnMonthly, btnCategory].forEach(btn => btn.classList.remove('active'));
    activeBtn.classList.add('active');
}

function setupModeToggle() {
    btnDaily.addEventListener('click', () => {
        if (currentMode === 'daily') return;
        currentMode = 'daily';
        setActiveButton(btnDaily);
        reportHeader.setAttribute('data-i18n', 'header_daily');
        applyTranslations();
        fetchReports();
    });

    btnWeekly.addEventListener('click', () => {
        if (currentMode === 'weekly') return;
        currentMode = 'weekly';
        setActiveButton(btnWeekly);
        reportHeader.setAttribute('data-i18n', 'header_weekly');
        applyTranslations();
        fetchReports();
    });

    btnMonthly.addEventListener('click', () => {
        if (currentMode === 'monthly') return;
        currentMode = 'monthly';
        setActiveButton(btnMonthly);
        reportHeader.setAttribute('data-i18n', 'header_monthly');
        applyTranslations();
        fetchReports();
    });

    btnCategory.addEventListener('click', () => {
        if (currentMode === 'by-category') return;
        currentMode = 'by-category';
        setActiveButton(btnCategory);
        reportHeader.setAttribute('data-i18n', 'header_category');
        applyTranslations();
        fetchReports();
    });
}

// UI Updaters
function renderReports() {
    if (reportsData.length === 0) {
        reportsContainer.innerHTML = `<p class="text-muted">${t('no_time_tracked')}</p>`;
        return;
    }

    reportsContainer.innerHTML = '';

    if (currentMode === 'by-category') {
        renderCategoryReports();
    } else {
        renderStandardReports();
    }
    applyTranslations();
}

function renderStandardReports() {
    reportsData.forEach(item => {
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.daily-card');
        const header = clone.querySelector('.daily-header');
        const body = clone.querySelector('.daily-body');
        const toggleBtn = clone.querySelector('.btn-toggle-day');
        const canvas = clone.querySelector('.report-chart');

        let displayDate = item.date;
        if (currentMode === 'weekly') {
            displayDate = `${t('week_of')}${item.date}`;
        } else if (currentMode === 'monthly') {
            // Format YYYY-MM to a readable month display
            const [year, month] = item.date.split('-');
            if (t('year_label')) {
                displayDate = `${year}年${parseInt(month)}月`;
            } else {
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                displayDate = `${monthNames[parseInt(month) - 1]} ${year}`;
            }
        }

        clone.querySelector('.daily-date').textContent = displayDate;
        clone.querySelector('.daily-duration strong').textContent = formatDuration(item.total_duration);

        if (openReportDates.has(item.date)) {
            body.classList.remove('hidden');
            toggleBtn.textContent = '▲';
            // Render chart after the element is in the DOM
            setTimeout(() => renderChart(canvas, item), 0);
        }

        header.addEventListener('click', () => {
            const isHidden = body.classList.toggle('hidden');
            toggleBtn.textContent = isHidden ? '▼' : '▲';
            if (!isHidden) {
                openReportDates.add(item.date);
                renderChart(canvas, item);
            } else {
                openReportDates.delete(item.date);
            }
        });

        // CSV download button (daily mode only)
        const csvContainer = clone.querySelector('.csv-download-container');
        if (currentMode === 'daily') {
            csvContainer.classList.remove('hidden');
            const csvBtn = csvContainer.querySelector('.btn-csv-download');
            csvBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                downloadCSV(item);
            });
        }

        const addRecordBtn = clone.querySelector('.btn-add-record');
        if (addRecordBtn) {
            if (currentMode !== 'daily') {
                addRecordBtn.style.display = 'none';
            } else {
                addRecordBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openAddModal(item.date);
                });
            }
        }

        // Hide timetable for weekly/monthly modes (no timeline data)
        if (currentMode === 'weekly' || currentMode === 'monthly') {
            const ttSection = clone.querySelector('.timetable-section');
            if (ttSection) ttSection.style.display = 'none';
        }

        // Categories & Unassigned
        const catContainer = clone.querySelector('.categories-list');
        item.categories.forEach(cat => {
            const catEl = document.createElement('div');
            catEl.className = 'report-category-item';
            const tasksHtml = cat.tasks.map(tData => `
                <div class="report-task-item">
                    <span>${escapeHTML(tData.name)}</span>
                    <span class="report-task-time">${formatDuration(tData.total_duration)}</span>
                </div>
            `).join('');
            catEl.innerHTML = `
                <div class="report-category-header">
                    <span class="report-category-name">${escapeHTML(cat.name)}</span>
                    <span class="report-category-time">${formatDurationHuman(cat.total_duration, true)}</span >
                </div >
            <div class="report-category-tasks">${tasksHtml}</div>
            `;
            catContainer.appendChild(catEl);
        });

        if (item.unassigned_tasks.length > 0) {
            const unassignedTotal = item.unassigned_tasks.reduce((sum, uTask) => sum + uTask.total_duration, 0);
            const unEl = document.createElement('div');
            unEl.className = 'report-category-item unassigned-group';
            unEl.innerHTML = `
            < div class= "report-category-header" >
                    <span class="report-category-name text-muted">${t('unassigned_group')}</span>
                    <span class="report-category-time text-muted">${formatDurationHuman(unassignedTotal, true)}</span>
                </div >
            <div class="report-category-tasks">
                ${item.unassigned_tasks.map(uTask => `
                        <div class="report-task-item">
                            <span>${escapeHTML(uTask.name)}</span>
                            <span class="report-task-time">${formatDuration(uTask.total_duration)}</span>
                        </div>
                    `).join('')}
            </div>
            `;
            clone.querySelector('.unassigned-list').appendChild(unEl);
        }

        // Timetable
        const timetableContainer = clone.querySelector('.timetable-container');
        const table = document.createElement('table');
        table.className = 'timetable-table';

        // Ensure item.timeline exists
        const timeline = item.timeline || [];

        table.innerHTML = `
            <thead>
            <tr>
                <th data-i18n="task_name_label">Task</th>
                <th data-i18n="start_time_label">Start</th>
                <th data-i18n="end_time_label">End</th>
                <th style="text-align: right;" data-i18n="duration">Duration</th>
                <th style="text-align: right;">
                    <button class="btn-primary" style="font-size: 0.8rem; padding: 0.2rem 0.5rem;" onclick="openAddModal('${item.date}')" data-i18n="start_btn">Add</button>
                </th>
            </tr>
            </thead>
            <tbody>
                ${timeline.map(record => {
            const isRunning = !record.end_time;
            const endDisplay = isRunning ? t('now_label') : formatTimeOnly(record.end_time);
            const durationDisplay = isRunning ? '-' : formatDuration(record.duration_sec);
            return `
                    <tr>
                        <td class="timetable-task-col">${escapeHTML(record.task_name)}</td>
                        <td class="timetable-time-col">${formatTimeOnly(record.start_time)}</td>
                        <td class="timetable-time-col">${endDisplay}</td>
                        <td class="timetable-duration-col">${durationDisplay}</td>
                        <td style="text-align: right; white-space: nowrap;">
                            <button class="btn-danger-ghost" style="color: var(--text-main); font-size: 0.8rem; padding: 0.2rem 0.5rem;" onclick="openEditModal(${record.id}, '${record.start_time}', '${record.end_time || ''}', '${escapeHTML(record.task_name)}')">${t('edit')}</button>
                        </td>
                    </tr>
                `}).join('')}
                ${timeline.length === 0 ? `<tr><td colspan="5" class="text-muted" style="text-align: center; padding: 1rem;">${currentLang === 'ja' ? '記録がありません' : 'No records'}</td></tr>` : ''}
            </tbody>
        `;
        timetableContainer.appendChild(table);

        // Hide timetable section in weekly/monthly modes where timeline isn't applicable
        if (currentMode !== 'daily') {
            const ttSection = clone.querySelector('.timetable-section');
            if (ttSection) ttSection.style.display = 'none';
        }

        reportsContainer.appendChild(clone);
    });
}

function renderCategoryReports() {
    reportsData.forEach(cat => {
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.daily-card');
        const header = clone.querySelector('.daily-header');
        const body = clone.querySelector('.daily-body');
        const toggleBtn = clone.querySelector('.btn-toggle-day');
        const chartWrapper = clone.querySelector('.chart-container');

        // Mode specific adjustments
        chartWrapper.style.display = 'none';

        // Hide timetable in category view
        const ttSection = clone.querySelector('.timetable-section');
        if (ttSection) ttSection.style.display = 'none';

        const catName = cat.name || t('unassigned_group');
        const totalDuration = cat.weeks.reduce((sum, w) => sum + w.total_duration, 0);

        clone.querySelector('.daily-date').textContent = catName;
        // Apply rounding to category total
        clone.querySelector('.daily-duration strong').textContent = formatDurationHuman(totalDuration, true);

        if (openReportDates.has(catName)) {
            body.classList.remove('hidden');
            toggleBtn.textContent = '▲';
        }

        header.addEventListener('click', () => {
            const isHidden = body.classList.toggle('hidden');
            toggleBtn.textContent = isHidden ? '▼' : '▲';
            if (!isHidden) {
                openReportDates.add(catName);
            } else {
                openReportDates.delete(catName);
            }
        });

        const listContainer = clone.querySelector('.categories-list');
        cat.weeks.forEach(week => {
            const weekEl = document.createElement('div');
            weekEl.className = 'report-category-item';

            // Simplified: No tasks, just date and human-readable duration
            const displayDate = week.date.replace(/-/g, '/');

            weekEl.innerHTML = `
            <div class="report-category-header" style="padding: 0.5rem 0; border: none;">
                    <span class="report-category-name" style="font-weight: 400;">${displayDate}</span>
                    <span class="report-category-time">${formatDurationHuman(week.total_duration, true)}</span>
                </div>
            `;
            listContainer.appendChild(weekEl);
        });

        reportsContainer.appendChild(clone);
    });
}

function renderChart(canvas, data) {
    // Check if chart already exists on this canvas
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
        existingChart.destroy();
    }

    const labels = data.categories.map(c => c.name);
    const durations = data.categories.map(c => c.total_duration);

    // Add unassigned if present
    const unassignedTotal = data.unassigned_tasks.reduce((sum, tTask) => sum + tTask.total_duration, 0);
    if (unassignedTotal > 0) {
        labels.push(t('unassigned_group'));
        durations.push(unassignedTotal);
    }

    // Modern color palette
    const colors = [
        '#58a6ff', '#3fb950', '#d29922', '#f85149', '#bc8cff',
        '#1f6feb', '#238636', '#9e6a03', '#da3633', '#8957e5'
    ];

    new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: durations,
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#8b949e',
                        font: { size: 11 },
                        padding: 15,
                        boxWidth: 12
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const label = context.label || '';
                            const value = formatDuration(context.parsed);
                            return `${label}: ${value}`;
                        }
                    }
                }
            },
            cutout: '70%'
        }
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

async function startTask(taskId) {
    hideError();
    try {
        const res = await fetch(`${API_BASE}/records/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_id: taskId })
        });

        if (!res.ok) throw new Error('Failed to start task');

        // Navigate back to the home page to see the active timer
        window.location.href = 'index.html';
    } catch (err) {
        showError("Error: " + err.message);
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

function formatDuration(seconds) {
    if (seconds == null || seconds < 0) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}: ${m.toString().padStart(2, '0')}: ${s.toString().padStart(2, '0')}`;
}

function formatTimeOnly(dateStr) {
    if (!dateStr) return '--:--';
    const date = new Date(dateStr.replace(' ', 'T'));
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDurationHuman(seconds, roundTo15 = false) {
    if (seconds == null) return '0h 0m';

    if (roundTo15) {
        const totalMinutes = Math.ceil(seconds / 60);
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        let roundedMins = 0;
        let extraHour = 0;

        if (mins >= 53) {
            extraHour = 1;
            roundedMins = 0;
        } else if (mins >= 38) {
            roundedMins = 45;
        } else if (mins >= 23) {
            roundedMins = 30;
        } else if (mins >= 8) {
            roundedMins = 15;
        } else {
            roundedMins = 0;
        }

        const finalHours = hours + extraHour;
        if (t('year_label')) { // Check if Japanese (has year_label)
            return `${finalHours}時間${roundedMins}分`;
        }
        console.log("finalHours", finalHours);
        console.log("roundedMins", roundedMins);
        return `${finalHours}h ${roundedMins}m`;
    }

    const totalMinutes = Math.floor(seconds / 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    if (t('year_label')) {
        return `${h}時間${m}分`;
    }
    return `${h}h ${m}m`;
}

// CSV Download
function roundTo15MinHours(seconds) {
    const totalMinutes = Math.ceil(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;

    if (mins >= 53) {
        return hours + 1;
    } else if (mins >= 38) {
        return hours + 0.75;
    } else if (mins >= 23) {
        return hours + 0.5;
    } else if (mins >= 8) {
        return hours + 0.25;
    } else {
        return hours;
    }
}

async function downloadCSV(item) {
    const dateStr = item.date.replace(/-/g, '/');
    const totalHours = roundTo15MinHours(item.total_duration);
    const lines = [`${dateStr} ${String(totalHours)}`];

    // Categories (skip excluded)
    item.categories.forEach(cat => {
        if (cat.is_excluded) return;
        const hours = roundTo15MinHours(cat.total_duration);
        lines.push(`${cat.name}, ${String(hours)}`);
    });

    // Unassigned tasks
    if (item.unassigned_tasks && item.unassigned_tasks.length > 0) {
        const unassignedTotal = item.unassigned_tasks.reduce((sum, uTask) => sum + uTask.total_duration, 0);
        const hours = roundTo15MinHours(unassignedTotal);
        const label = t('unassigned_group');
        lines.push(`${label}, ${String(hours)}`);
    }

    const csvContent = lines.join('\n');
    const fileName = `report_${item.date}.csv`;

    // Use Electron's native save dialog when available
    if (window.electronAPI && window.electronAPI.isElectron) {
        try {
            const result = await window.electronAPI.saveCSV(fileName, csvContent);
            if (result.success) {
                console.log('CSV saved to:', result.filePath);
            } else if (result.error) {
                alert('CSV保存エラー: ' + result.error);
            }
        } catch (err) {
            alert('CSV保存エラー: ' + err.message);
        }
        return;
    }

    // Fallback for browser mode
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
}

// Edit Modal & Events
function setupEventListeners() {
    if (editForm) editForm.addEventListener('submit', submitEdit);
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', () => editModal.classList.add('hidden'));

    if (addForm) addForm.addEventListener('submit', submitAddRecord);
    if (cancelAddBtn) cancelAddBtn.addEventListener('click', () => addModal.classList.add('hidden'));

    // Searchable dropdown events
    if (addTaskInput) {
        addTaskInput.addEventListener('focus', () => {
            addTaskDropdown.classList.add('open');
            addTaskInput.select();
        });

        addTaskInput.addEventListener('input', () => {
            renderTaskOptions(addTaskInput.value);
            addTaskDropdown.classList.add('open');
            // Clear hidden ID if user is typing to force re-selection
            addTaskId.value = '';
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (addTaskDropdown && !addTaskDropdown.contains(e.target)) {
            addTaskDropdown.classList.remove('open');
        }
    });
}

function openEditModal(id, startStr, endStr, taskName) {
    document.getElementById('edit-record-id').value = id;
    const modalTitle = document.querySelector('#edit-modal h3');
    if (modalTitle) {
        modalTitle.textContent = `${taskName} - ${t('edit')}`;
    }
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

    if (endStr && new Date(startStr.replace(' ', 'T')) >= new Date(endStr.replace(' ', 'T'))) {
        alert(t('error_start_after_end'));
        return;
    }

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
        await fetchReports();
    } catch (err) {
        alert("Error: " + err.message);
    }
}

async function fetchAllTasks() {
    try {
        const res = await fetch(`${API_BASE}/tasks`);
        if (!res.ok) throw new Error('Failed to fetch tasks');
        allTasks = await res.json();
    } catch (err) {
        showError(err.message);
    }
}

async function openAddModal(dateStr) {
    document.getElementById('add-record-date').value = dateStr;
    addTaskId.value = '';
    addTaskInput.value = '';

    // Default times: set 09:00:00 to 10:00:00 as placeholder
    document.getElementById('add-start-time').value = `${dateStr}T09:00:00`;
    document.getElementById('add-end-time').value = `${dateStr}T10:00:00`;

    await fetchAllTasks();
    renderTaskOptions('');

    addModal.classList.remove('hidden');
}

function renderTaskOptions(filter) {
    addTaskOptions.innerHTML = '';
    const filterLower = filter.toLowerCase();
    let hasResults = false;

    const sortedTasks = [...allTasks].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    sortedTasks.forEach(task => {
        if (filterLower && !task.name.toLowerCase().includes(filterLower)) return;
        hasResults = true;

        const opt = document.createElement('div');
        opt.className = 'searchable-select-option';
        opt.textContent = task.name;
        opt.dataset.value = task.id;
        opt.addEventListener('click', () => {
            addTaskId.value = task.id;
            addTaskInput.value = task.name;
            addTaskDropdown.classList.remove('open');
        });
        addTaskOptions.appendChild(opt);
    });

    if (!hasResults) {
        const noResult = document.createElement('div');
        noResult.className = 'searchable-select-no-results';
        noResult.textContent = currentLang === 'ja' ? '該当なし' : 'No results';
        addTaskOptions.appendChild(noResult);
    }
}

async function submitAddRecord(e) {
    e.preventDefault();
    const taskId = addTaskId.value;
    let startStr = document.getElementById('add-start-time').value.replace('T', ' ');
    let endStr = document.getElementById('add-end-time').value.replace('T', ' ');

    // Ensure format is YYYY-MM-DD HH:MM:SS
    if (startStr.length === 16) startStr += ':00';
    if (endStr.length === 16) endStr += ':00';

    if (!taskId) {
        alert(currentLang === 'ja' ? 'タスクを一覧から選択してください' : 'Please select a task from the list');
        return;
    }

    if (new Date(startStr.replace(' ', 'T')) >= new Date(endStr.replace(' ', 'T'))) {
        alert(t('error_start_after_end'));
        return;
    }

    try {
        console.log("Submitting record:", { task_id: taskId, start_time: startStr, end_time: endStr });
        const res = await fetch(`${API_BASE}/records/manual`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                task_id: taskId,
                start_time: startStr,
                end_time: endStr
            })
        });

        if (!res.ok) {
            let errorText = 'Failed to add record';
            try {
                const data = await res.json();
                errorText = data.error || JSON.stringify(data);
            } catch (e) {
                errorText = await res.text();
            }
            throw new Error(`[${res.status}]${errorText}`);
        }

        addModal.classList.add('hidden');
        await fetchReports();
    } catch (err) {
        console.error("Submit Add Record Error:", err);
        alert("詳細エラー: " + err.message);
    }
}

// Re-render when language changes
window.addEventListener('languageChanged', renderReports);

// Start
init();
