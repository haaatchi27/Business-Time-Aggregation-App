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
                    <span class="report-category-time">${formatDuration(cat.total_duration)}</span>
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
                    <span class="report-category-time text-muted">${formatDuration(unassignedTotal)}</span>
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

// Re-render when language changes
window.addEventListener('languageChanged', renderReports);

// Start
init();
