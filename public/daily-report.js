const API_BASE = '/api';

// State
let reportsData = [];
let currentMode = 'daily'; // 'daily' or 'weekly'

// DOM Elements
const reportsContainer = document.getElementById('reports-container');
const errorMsg = document.getElementById('error-message');
const template = document.getElementById('report-card-template');
const reportHeader = document.getElementById('report-header');
const btnDaily = document.getElementById('btn-daily');
const btnWeekly = document.getElementById('btn-weekly');
const btnCategory = document.getElementById('btn-category');

// Initialize
async function init() {
    setupModeToggle();
    await fetchReports();
}

// Fetchers
async function fetchReports() {
    try {
        let endpoint = 'daily';
        if (currentMode === 'weekly') endpoint = 'weekly';
        if (currentMode === 'by-category') endpoint = 'by-category';

        const res = await fetch(`${API_BASE}/reports/${endpoint}`);
        if (!res.ok) throw new Error('Failed to fetch reports');
        reportsData = await res.json();
        renderReports();
    } catch (err) {
        showError(err.message);
    }
}

function setupModeToggle() {
    btnDaily.addEventListener('click', () => {
        if (currentMode === 'daily') return;
        currentMode = 'daily';
        btnDaily.classList.add('active');
        btnWeekly.classList.remove('active');
        reportHeader.setAttribute('data-i18n', 'header_daily');
        applyTranslations();
        fetchReports();
    });

    btnWeekly.addEventListener('click', () => {
        if (currentMode === 'weekly') return;
        currentMode = 'weekly';
        btnWeekly.classList.add('active');
        btnDaily.classList.remove('active');
        btnCategory.classList.remove('active');
        reportHeader.setAttribute('data-i18n', 'header_weekly');
        applyTranslations();
        fetchReports();
    });

    btnCategory.addEventListener('click', () => {
        if (currentMode === 'by-category') return;
        currentMode = 'by-category';
        btnCategory.classList.add('active');
        btnDaily.classList.remove('active');
        btnWeekly.classList.remove('active');
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
        }

        clone.querySelector('.daily-date').textContent = displayDate;
        clone.querySelector('.daily-duration strong').textContent = formatDuration(item.total_duration);

        header.addEventListener('click', () => {
            const isHidden = body.classList.toggle('hidden');
            toggleBtn.textContent = isHidden ? '▼' : '▲';
            if (!isHidden) renderChart(canvas, item);
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
                    <span class="report-category-time">${formatDurationHuman(cat.total_duration, true)}</span>
                </div>
                <div class="report-category-tasks">${tasksHtml}</div>
            `;
            catContainer.appendChild(catEl);
        });

        if (item.unassigned_tasks.length > 0) {
            const unassignedTotal = item.unassigned_tasks.reduce((sum, uTask) => sum + uTask.total_duration, 0);
            const unEl = document.createElement('div');
            unEl.className = 'report-category-item unassigned-group';
            unEl.innerHTML = `
                <div class="report-category-header">
                    <span class="report-category-name text-muted">${t('unassigned_group')}</span>
                    <span class="report-category-time text-muted">${formatDurationHuman(unassignedTotal, true)}</span>
                </div>
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
        if (item.timeline && item.timeline.length > 0) {
            const table = document.createElement('table');
            table.className = 'timetable-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th data-i18n="start_time_label">Start</th>
                        <th data-i18n="end_time_label">End</th>
                        <th data-i18n="task_name_label">Task</th>
                        <th style="text-align: right;">Time</th>
                    </tr>
                </thead>
                <tbody>
                    ${item.timeline.map(record => `
                        <tr>
                            <td class="timetable-time-col">${formatTimeOnly(record.start_time)}</td>
                            <td class="timetable-time-col">${formatTimeOnly(record.end_time)}</td>
                            <td class="timetable-task-col">${escapeHTML(record.task_name)}</td>
                            <td class="timetable-duration-col">${formatDuration(record.duration_sec)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            `;
            timetableContainer.appendChild(table);
        } else {
            // Hide timetable section if no timeline data (e.g. in weekly mode if we don't fetch it, but here we do)
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

        const catName = cat.name || t('unassigned_group');
        const totalDuration = cat.weeks.reduce((sum, w) => sum + w.total_duration, 0);

        clone.querySelector('.daily-date').textContent = catName;
        // Apply rounding to category total
        clone.querySelector('.daily-duration strong').textContent = formatDurationHuman(totalDuration, true);

        header.addEventListener('click', () => {
            const isHidden = body.classList.toggle('hidden');
            toggleBtn.textContent = isHidden ? '▼' : '▲';
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
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatTimeOnly(dateStr) {
    if (!dateStr) return '--:--';
    const date = new Date(dateStr.replace(' ', 'T'));
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDurationHuman(seconds, roundTo30 = false) {
    if (seconds == null) return '0h 0m';

    let totalMinutes = Math.floor(seconds / 60);

    if (roundTo30) {
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        let roundedMins = 0;
        let extraHour = 0;

        if (mins >= 45) {
            extraHour = 1;
            roundedMins = 0;
        } else if (mins >= 15) {
            roundedMins = 30;
        } else {
            roundedMins = 0;
        }

        const finalHours = hours + extraHour;
        if (t('year_label')) { // Check if Japanese (has year_label)
            return `${finalHours}時間${roundedMins}分`;
        }
        return `${finalHours}h ${roundedMins}m`;
    }

    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    if (t('year_label')) {
        return `${h}時間${m}分`;
    }
    return `${h}h ${m}m`;
}

// CSV Download
function roundTo30MinHours(seconds) {
    const totalMinutes = Math.floor(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;

    if (mins >= 45) {
        return hours + 1;
    } else if (mins >= 15) {
        return hours + 0.5;
    } else {
        return hours;
    }
}

function downloadCSV(item) {
    const dateStr = item.date.replace(/-/g, '/');
    const lines = [dateStr];

    // Categories
    item.categories.forEach(cat => {
        const hours = roundTo30MinHours(cat.total_duration);
        lines.push(`${cat.name}, ${hours.toFixed(1)}`);
    });

    // Unassigned tasks
    if (item.unassigned_tasks && item.unassigned_tasks.length > 0) {
        const unassignedTotal = item.unassigned_tasks.reduce((sum, uTask) => sum + uTask.total_duration, 0);
        const hours = roundTo30MinHours(unassignedTotal);
        const label = t('unassigned_group');
        lines.push(`${label}, ${hours.toFixed(1)}`);
    }

    const csvContent = lines.join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report_${item.date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

// Re-render when language changes
window.addEventListener('languageChanged', renderReports);

// Start
init();
