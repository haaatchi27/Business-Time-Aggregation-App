const translations = {
    en: {
        "title": "Activity Tracker",
        "subtitle_home": "Keep track of your time, effortlessly.",
        "subtitle_categories": "Manage categories and aggregate tracked time.",
        "subtitle_daily": "View your daily, weekly, or category-wise time aggregation.",
        "nav_home": "Home",
        "nav_categories": "Categories / Summary",
        "nav_daily": "Daily Report",

        // Home View (index.html & app.js)
        "task_placeholder": "What are you working on?",
        "start_btn": "Start",
        "no_activity": "No activity recorded today.",
        "active_record": "Active",
        "header_tasks": "Your Tasks",
        "header_today": "Today's Activity",
        "stop_tracking": "Stop Tracking",
        "confirm_delete_record": "Are you sure you want to delete this time record?",
        "sort_label": "Sort by:",
        "sort_created": "Creation Date",
        "sort_activity": "Activity",
        "sort_abc": "Alphabetical",
        "sort_reverse": "Reverse",
        "confirm_archive_task": "Are you sure you want to archive this task?",
        "no_tasks_added": "No tasks added yet.",
        "now_label": "Now",
        "edit": "Edit",
        "delete": "Delete",
        "nothing_to_stop": "Nothing to stop",

        // Categories View (categories.html & categories.js)
        "cat_placeholder": "Create a new aggregated category",
        "add_cat_btn": "Add Category",
        "header_categories": "Aggregated Categories",
        "header_unassigned": "Unassigned Tasks",
        "total_time": "Total Time",
        "move": "Move",
        "assign": "Assign",
        "no_cat": "No categories created yet.",
        "no_tasks_assigned": "No tasks assigned.",
        "all_assigned": "All tasks are assigned to a category.",
        "delete_category_title": "Delete Category",
        "confirm_archive_cat": "Are you sure you want to delete this category?\n(Assigned tasks will NOT be deleted, they will become unassigned.)",
        "modal_assign_title": "Assign Category",
        "modal_assigning": "Assigning:",
        "modal_unassigned_opt": "-- Unassigned --",
        "cancel": "Cancel",
        "save": "Save Assignment",
        "edit_modal_title": "Edit Record",
        "start_time_label": "Start Time",
        "end_time_label": "End Time",
        "save_changes": "Save Changes",
        "select_category": "Select Category",

        // Daily View (daily-report.html & daily-report.js)
        "header_daily": "Daily Aggregation",
        "header_weekly": "Weekly Aggregation",
        "header_category": "Category Aggregation",
        "header_timetable": "Timetable",
        "task_name_label": "Task Name",
        "start_time_label": "Start Time",
        "end_time_label": "End Time",
        "no_time_tracked": "No time tracked yet.",
        "unassigned_group": "Unassigned Tasks",
        "mode_daily": "Daily",
        "mode_weekly": "Weekly",
        "mode_category": "By Category",
        "year_label": "",
        "week_of": "Week of ",
        "loading": "Loading...",
        "active_rec": "● REC"
    },
    ja: {
        "title": "業務時間集計",
        "subtitle_home": "記録をつけて、時間を効率的に管理しましょう。",
        "subtitle_categories": "集計項目（カテゴリー）を作成し、タスクを紐付けます。",
        "subtitle_daily": "稼働時間の集計結果（日別・週別・カテゴリ別）を確認します。",
        "nav_home": "ホーム",
        "nav_categories": "集計・カテゴリー",
        "nav_daily": "日別レポート",

        // Home View
        "task_placeholder": "何に取り掛かりますか？",
        "start_btn": "開始",
        "no_activity": "今日の記録はまだありません。",
        "active_record": "計測中",
        "header_tasks": "タスク一覧",
        "header_today": "本日のアクティビティ",
        "stop_tracking": "計測ストップ",
        "confirm_delete_record": "この記録を本当に削除しますか？",
        "sort_label": "並び替え:",
        "sort_created": "作成日時順",
        "sort_activity": "アクティビティ順",
        "sort_abc": "50音順",
        "sort_reverse": "逆順",
        "confirm_archive_task": "本当にこの業務を非表示にしますか？",
        "no_tasks_added": "タスクはまだ追加されていません。",
        "now_label": "現在",
        "edit": "編集",
        "delete": "削除",
        "nothing_to_stop": "終了できるタスクはありません",

        // Categories View
        "cat_placeholder": "新しいカテゴリー名を入力",
        "add_cat_btn": "追加する",
        "header_categories": "カテゴリー一覧",
        "header_unassigned": "未割当のタスク",
        "total_time": "合計時間",
        "move": "移動",
        "assign": "割当",
        "no_cat": "カテゴリーはまだ作成されていません。",
        "no_tasks_assigned": "タスクが割り当てられていません。",
        "all_assigned": "すべてのタスクがカテゴリーに割り当てられています。",
        "delete_category_title": "カテゴリーを削除",
        "confirm_archive_cat": "本当にこのカテゴリーを削除しますか？\n（紐づいているタスク自体は削除されず未割当に戻ります）",
        "modal_assign_title": "カテゴリーの割当",
        "modal_assigning": "対象タスク:",
        "modal_unassigned_opt": "-- 未割当 --",
        "cancel": "キャンセル",
        "save": "保存する",
        "edit_modal_title": "記録の編集",
        "start_time_label": "開始時刻",
        "end_time_label": "終了時刻",
        "save_changes": "保存する",
        "select_category": "カテゴリーを選択",

        // Daily View
        "header_daily": "日別レポート",
        "header_weekly": "週別レポート",
        "header_category": "カテゴリ別レポート",
        "header_timetable": "タイムテーブル",
        "task_name_label": "業務名",
        "start_time_label": "開始",
        "end_time_label": "終了",
        "no_time_tracked": "記録された時間がありません。",
        "unassigned_group": "未割当タスク",
        "mode_daily": "日別",
        "mode_weekly": "週別",
        "mode_category": "カテゴリ別",
        "year_label": "年",
        "week_of": "週開始日: ",
        "loading": "読み込み中...",
        "active_rec": "● 計測中"
    }
};

let currentLang = localStorage.getItem('appLang') || 'ja';

function t(key) {
    if (translations[currentLang] && translations[currentLang][key]) {
        return translations[currentLang][key];
    }
    // Fallback to English, then Key itself
    if (translations['en'][key]) return translations['en'][key];
    return key;
}

function switchLanguage(lang) {
    if (!['en', 'ja'].includes(lang)) return;
    currentLang = lang;
    localStorage.setItem('appLang', lang);
    applyTranslations();

    // Update active state of lang buttons if they exist
    document.querySelectorAll('.lang-btn').forEach(btn => {
        if (btn.dataset.lang === lang) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // We often need to trigger re-renders in specific modules when language changes.
    // Instead of tightly coupling, we can dispatch a custom event.
    window.dispatchEvent(new Event('languageChanged'));
}

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        // Handle placeholders vs textContent
        if (el.tagName === 'INPUT' && el.type === 'text') {
            el.placeholder = t(key);
        } else {
            el.textContent = t(key);
        }
    });
}

// Inject language toggle UI into header if header exists and it's not already there
function setupLanguageToggle() {
    const header = document.querySelector('.header');
    if (!header || document.querySelector('.lang-toggle-container')) return;

    const toggleContainer = document.createElement('div');
    toggleContainer.className = 'lang-toggle-container';
    toggleContainer.innerHTML = `
        <button class="lang-btn ${currentLang === 'en' ? 'active' : ''}" data-lang="en">EN</button>
        <span class="lang-sep">|</span>
        <button class="lang-btn ${currentLang === 'ja' ? 'active' : ''}" data-lang="ja">JA</button>
    `;

    header.appendChild(toggleContainer);

    toggleContainer.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchLanguage(e.target.dataset.lang);
        });
    });
}

// Ensure translation happens on load
document.addEventListener('DOMContentLoaded', () => {
    setupLanguageToggle();
    applyTranslations();
});
