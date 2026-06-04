const express = require('express');
const cors = require('cors');
const path = require('path');
const dbLoader = require('./db.js');
let db;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Helpers
const getLocalAnISOString = () => {
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzOffset).toISOString().slice(0, 19).replace('T', ' ');
};

const getMonday = (dateStr) => {
    const d = new Date(dateStr.replace(' ', 'T'));
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
};

const DEFAULT_USER_ID = 1;

// --- API Endpoints ---

// Tasks
app.get('/api/tasks', (req, res) => {
    try {
        const tasks = db.prepare(`
            SELECT 
                t.*, 
                c.name as category_name,
                (SELECT MAX(start_time) FROM records r WHERE r.task_id = t.id) as last_activity_at
            FROM tasks t 
            LEFT JOIN categories c ON t.category_id = c.id 
            WHERE t.is_deleted = 0 AND t.user_id = ?
        `).all(DEFAULT_USER_ID);
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/tasks', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    try {
        // Check for duplicates (both active and deleted)
        const existing = db.prepare('SELECT id, is_deleted FROM tasks WHERE name = ? AND user_id = ? ORDER BY is_deleted ASC').get(name, DEFAULT_USER_ID);

        if (existing) {
            if (existing.is_deleted === 0) {
                return res.status(400).json({ error: 'Task with this name already exists' });
            } else {
                // Restore the deleted task
                db.prepare('UPDATE tasks SET is_deleted = 0 WHERE id = ?').run(existing.id);
                return res.status(200).json({ id: existing.id, name });
            }
        }

        const info = db.prepare('INSERT INTO tasks (user_id, name) VALUES (?, ?)').run(DEFAULT_USER_ID, name);
        res.status(201).json({ id: info.lastInsertRowid, name });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/tasks/:id/archive', (req, res) => {
    const { id } = req.params;
    try {
        db.prepare('UPDATE tasks SET is_deleted = 1 WHERE id = ? AND user_id = ?').run(id, DEFAULT_USER_ID);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/tasks/:taskId/category', (req, res) => {
    const { taskId } = req.params;
    const { categoryId } = req.body;
    try {
        db.prepare('UPDATE tasks SET category_id = ? WHERE id = ? AND user_id = ?').run(categoryId || null, taskId, DEFAULT_USER_ID);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Categories
app.get('/api/categories', (req, res) => {
    try {
        const categories = db.prepare('SELECT * FROM categories WHERE is_deleted = 0 AND user_id = ?').all(DEFAULT_USER_ID);

        // Calculate total time for each category
        const totals = db.prepare(`
            SELECT t.category_id, SUM(r.duration_sec) as total_duration
            FROM records r
            JOIN tasks t ON r.task_id = t.id
            WHERE t.category_id IS NOT NULL AND r.user_id = ? AND r.duration_sec IS NOT NULL
            GROUP BY t.category_id
        `).all(DEFAULT_USER_ID);

        const totalMap = {};
        totals.forEach(t => totalMap[t.category_id] = t.total_duration);

        // Fetch unassigned tasks (Include archived ones if they have tracked time)
        const unassignedTasks = db.prepare('SELECT * FROM tasks WHERE category_id IS NULL AND user_id = ? AND (is_deleted = 0 OR EXISTS (SELECT 1 FROM records r WHERE r.task_id = tasks.id))').all(DEFAULT_USER_ID);

        // Fetch tasks for each category (Include archived ones if they have tracked time)
        const categoryTasks = db.prepare('SELECT id, name, category_id FROM tasks WHERE category_id IS NOT NULL AND user_id = ? AND (is_deleted = 0 OR EXISTS (SELECT 1 FROM records r WHERE r.task_id = tasks.id))').all(DEFAULT_USER_ID);
        const tasksByCategory = {};
        categoryTasks.forEach(task => {
            if (!tasksByCategory[task.category_id]) tasksByCategory[task.category_id] = [];
            tasksByCategory[task.category_id].push(task);
        });

        const result = categories.map(cat => ({
            ...cat,
            total_duration: totalMap[cat.id] || 0,
            tasks: tasksByCategory[cat.id] || []
        }));

        res.json({ categories: result, unassigned: unassignedTasks });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/categories', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    try {
        const existing = db.prepare('SELECT id, is_deleted FROM categories WHERE name = ? AND user_id = ? ORDER BY is_deleted ASC').get(name, DEFAULT_USER_ID);

        if (existing) {
            if (existing.is_deleted === 0) {
                return res.status(400).json({ error: 'Category with this name already exists' });
            } else {
                // Restore the deleted category
                db.prepare('UPDATE categories SET is_deleted = 0 WHERE id = ?').run(existing.id);
                return res.status(200).json({ id: existing.id, name });
            }
        }

        const info = db.prepare('INSERT INTO categories (user_id, name) VALUES (?, ?)').run(DEFAULT_USER_ID, name);
        res.status(201).json({ id: info.lastInsertRowid, name });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/categories/:id/archive', (req, res) => {
    const id = Number(req.params.id);
    try {
        // Unlink tasks first so they become unassigned
        db.prepare('UPDATE tasks SET category_id = NULL WHERE category_id = ? AND user_id = ?').run(id, DEFAULT_USER_ID);
        // Archive the category
        db.prepare('UPDATE categories SET is_deleted = 1 WHERE id = ? AND user_id = ?').run(id, DEFAULT_USER_ID);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/categories/:id/toggle-exclude', (req, res) => {
    const id = Number(req.params.id);
    try {
        const cat = db.prepare('SELECT is_excluded FROM categories WHERE id = ? AND user_id = ?').get(id, DEFAULT_USER_ID);
        if (!cat) return res.status(404).json({ error: 'Category not found' });
        const newVal = cat.is_excluded ? 0 : 1;
        db.prepare('UPDATE categories SET is_excluded = ? WHERE id = ? AND user_id = ?').run(newVal, id, DEFAULT_USER_ID);
        res.json({ success: true, is_excluded: newVal });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Reports
app.get('/api/reports/daily', (req, res) => {
    try {
        // Fetch all records with joined task and category information
        const recordsRaw = db.prepare(`
            SELECT 
                r.id as record_id, 
                r.start_time, 
                r.end_time,
                r.duration_sec,
                t.id as task_id,
                t.name as task_name,
                c.id as category_id,
                c.name as category_name,
                COALESCE(c.is_excluded, 0) as is_excluded
            FROM records r
            JOIN tasks t ON r.task_id = t.id
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE r.user_id = ? AND r.duration_sec IS NOT NULL
            ORDER BY r.start_time DESC
        `).all(DEFAULT_USER_ID);

        const dailyData = {};

        recordsRaw.forEach(record => {
            if (!record.start_time) return;
            // Extract YYYY-MM-DD
            const dateStr = record.start_time.split(' ')[0];

            if (!dailyData[dateStr]) {
                dailyData[dateStr] = {
                    date: dateStr,
                    total_duration: 0,
                    categories: {},
                    unassigned_tasks: {},
                    timeline: []
                };
            }

            const dayObj = dailyData[dateStr];
            const duration = record.duration_sec || 0;
            // Only add to total if not excluded
            if (!record.is_excluded) {
                dayObj.total_duration += duration;
            }

            // Add to timeline
            dayObj.timeline.push({
                id: record.record_id,
                task_id: record.task_id,
                task_name: record.task_name,
                start_time: record.start_time,
                end_time: record.end_time,
                duration_sec: record.duration_sec
            });

            if (record.category_id) {
                // Task has a category
                if (!dayObj.categories[record.category_id]) {
                    dayObj.categories[record.category_id] = {
                        id: record.category_id,
                        name: record.category_name,
                        is_excluded: record.is_excluded ? 1 : 0,
                        total_duration: 0,
                        tasks: {}
                    };
                }
                const catObj = dayObj.categories[record.category_id];
                catObj.total_duration += duration;

                if (!catObj.tasks[record.task_id]) {
                    catObj.tasks[record.task_id] = {
                        id: record.task_id,
                        name: record.task_name,
                        total_duration: 0
                    };
                }
                catObj.tasks[record.task_id].total_duration += duration;
            } else {
                // Unassigned task
                if (!dayObj.unassigned_tasks[record.task_id]) {
                    dayObj.unassigned_tasks[record.task_id] = {
                        id: record.task_id,
                        name: record.task_name,
                        total_duration: 0
                    };
                }
                dayObj.unassigned_tasks[record.task_id].total_duration += duration;
            }
        });

        // Convert the nested objects into arrays for easier frontend rendering
        const result = Object.values(dailyData).map(day => {
            return {
                date: day.date,
                total_duration: day.total_duration,
                timeline: day.timeline.sort((a, b) => a.start_time.localeCompare(b.start_time)), // Chronological order
                categories: Object.values(day.categories).map(cat => ({
                    ...cat,
                    tasks: Object.values(cat.tasks).sort((a, b) => b.total_duration - a.total_duration)
                })).sort((a, b) => b.total_duration - a.total_duration),
                unassigned_tasks: Object.values(day.unassigned_tasks).sort((a, b) => b.total_duration - a.total_duration)
            };
        }).sort((a, b) => b.date.localeCompare(a.date)); // Most recent dates first

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/reports/weekly', (req, res) => {
    try {
        const recordsRaw = db.prepare(`
            SELECT 
                r.start_time, 
                r.duration_sec,
                t.id as task_id,
                t.name as task_name,
                c.id as category_id,
                c.name as category_name,
                COALESCE(c.is_excluded, 0) as is_excluded
            FROM records r
            JOIN tasks t ON r.task_id = t.id
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE r.user_id = ? AND r.duration_sec IS NOT NULL
            ORDER BY r.start_time DESC
        `).all(DEFAULT_USER_ID);

        const weeklyData = {};

        recordsRaw.forEach(record => {
            if (!record.start_time) return;
            const weekStart = getMonday(record.start_time);

            if (!weeklyData[weekStart]) {
                weeklyData[weekStart] = {
                    date: weekStart, // Representing the week by its Monday
                    total_duration: 0,
                    categories: {},
                    unassigned_tasks: {}
                };
            }

            const weekObj = weeklyData[weekStart];
            const duration = record.duration_sec || 0;
            if (!record.is_excluded) {
                weekObj.total_duration += duration;
            }

            if (record.category_id) {
                if (!weekObj.categories[record.category_id]) {
                    weekObj.categories[record.category_id] = {
                        id: record.category_id,
                        name: record.category_name,
                        total_duration: 0,
                        tasks: {}
                    };
                }
                const catObj = weekObj.categories[record.category_id];
                catObj.total_duration += duration;

                if (!catObj.tasks[record.task_id]) {
                    catObj.tasks[record.task_id] = {
                        id: record.task_id,
                        name: record.task_name,
                        total_duration: 0
                    };
                }
                catObj.tasks[record.task_id].total_duration += duration;
            } else {
                if (!weekObj.unassigned_tasks[record.task_id]) {
                    weekObj.unassigned_tasks[record.task_id] = {
                        id: record.task_id,
                        name: record.task_name,
                        total_duration: 0
                    };
                }
                weekObj.unassigned_tasks[record.task_id].total_duration += duration;
            }
        });

        const result = Object.values(weeklyData).map(week => {
            return {
                date: week.date,
                total_duration: week.total_duration,
                categories: Object.values(week.categories).map(cat => ({
                    ...cat,
                    tasks: Object.values(cat.tasks).sort((a, b) => b.total_duration - a.total_duration)
                })).sort((a, b) => b.total_duration - a.total_duration),
                unassigned_tasks: Object.values(week.unassigned_tasks).sort((a, b) => b.total_duration - a.total_duration)
            };
        }).sort((a, b) => b.date.localeCompare(a.date));

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/reports/monthly', (req, res) => {
    try {
        const recordsRaw = db.prepare(`
            SELECT 
                r.start_time, 
                r.duration_sec,
                t.id as task_id,
                t.name as task_name,
                c.id as category_id,
                c.name as category_name,
                COALESCE(c.is_excluded, 0) as is_excluded
            FROM records r
            JOIN tasks t ON r.task_id = t.id
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE r.user_id = ? AND r.duration_sec IS NOT NULL
            ORDER BY r.start_time DESC
        `).all(DEFAULT_USER_ID);

        const monthlyData = {};

        recordsRaw.forEach(record => {
            if (!record.start_time) return;
            // Extract YYYY-MM
            const monthStr = record.start_time.split(' ')[0].substring(0, 7);

            if (!monthlyData[monthStr]) {
                monthlyData[monthStr] = {
                    date: monthStr,
                    total_duration: 0,
                    categories: {},
                    unassigned_tasks: {}
                };
            }

            const monthObj = monthlyData[monthStr];
            const duration = record.duration_sec || 0;
            if (!record.is_excluded) {
                monthObj.total_duration += duration;
            }

            if (record.category_id) {
                if (!monthObj.categories[record.category_id]) {
                    monthObj.categories[record.category_id] = {
                        id: record.category_id,
                        name: record.category_name,
                        total_duration: 0,
                        tasks: {}
                    };
                }
                const catObj = monthObj.categories[record.category_id];
                catObj.total_duration += duration;

                if (!catObj.tasks[record.task_id]) {
                    catObj.tasks[record.task_id] = {
                        id: record.task_id,
                        name: record.task_name,
                        total_duration: 0
                    };
                }
                catObj.tasks[record.task_id].total_duration += duration;
            } else {
                if (!monthObj.unassigned_tasks[record.task_id]) {
                    monthObj.unassigned_tasks[record.task_id] = {
                        id: record.task_id,
                        name: record.task_name,
                        total_duration: 0
                    };
                }
                monthObj.unassigned_tasks[record.task_id].total_duration += duration;
            }
        });

        const result = Object.values(monthlyData).map(month => {
            return {
                date: month.date,
                total_duration: month.total_duration,
                categories: Object.values(month.categories).map(cat => ({
                    ...cat,
                    tasks: Object.values(cat.tasks).sort((a, b) => b.total_duration - a.total_duration)
                })).sort((a, b) => b.total_duration - a.total_duration),
                unassigned_tasks: Object.values(month.unassigned_tasks).sort((a, b) => b.total_duration - a.total_duration)
            };
        }).sort((a, b) => b.date.localeCompare(a.date));

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/reports/by-category', (req, res) => {
    try {
        const recordsRaw = db.prepare(`
            SELECT 
                r.start_time, 
                r.duration_sec,
                t.id as task_id,
                t.name as task_name,
                c.id as category_id,
                c.name as category_name
            FROM records r
            JOIN tasks t ON r.task_id = t.id
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE r.user_id = ? AND r.duration_sec IS NOT NULL
            ORDER BY r.start_time DESC
        `).all(DEFAULT_USER_ID);

        const categoryData = {};

        recordsRaw.forEach(record => {
            if (!record.start_time) return;
            const weekStart = getMonday(record.start_time);
            const catId = record.category_id || 'unassigned';
            const catName = record.category_name || null;

            if (!categoryData[catId]) {
                categoryData[catId] = {
                    id: catId,
                    name: record.category_name || null, // null means unassigned
                    weeks: {}
                };
            }

            const catObj = categoryData[catId];
            if (!catObj.weeks[weekStart]) {
                catObj.weeks[weekStart] = {
                    date: weekStart,
                    total_duration: 0,
                    tasks: {}
                };
            }

            const weekObj = catObj.weeks[weekStart];
            const duration = record.duration_sec || 0;
            weekObj.total_duration += duration;

            if (!weekObj.tasks[record.task_id]) {
                weekObj.tasks[record.task_id] = {
                    id: record.task_id,
                    name: record.task_name,
                    total_duration: 0
                };
            }
            weekObj.tasks[record.task_id].total_duration += duration;
        });

        const result = Object.values(categoryData).map(cat => ({
            id: cat.id,
            name: cat.name,
            weeks: Object.values(cat.weeks).map(week => ({
                ...week,
                tasks: Object.values(week.tasks).sort((a, b) => b.total_duration - a.total_duration)
            })).sort((a, b) => b.date.localeCompare(a.date))
        })).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Records
app.get('/api/records/today', (req, res) => {
    try {
        const todayStr = getLocalAnISOString().split(' ')[0]; // YYYY-MM-DD
        const records = db.prepare(`
            SELECT r.*, t.name as task_name 
            FROM records r
            JOIN tasks t ON r.task_id = t.id
            WHERE r.user_id = ? 
              AND (r.start_time LIKE ? OR r.end_time IS NULL)
            ORDER BY r.start_time DESC
        `).all(DEFAULT_USER_ID, `${todayStr}%`);

        const activeRecord = db.prepare('SELECT id, task_id, start_time FROM records WHERE user_id = ? AND end_time IS NULL').get(DEFAULT_USER_ID);

        res.json({ records, activeRecord });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/records/start', (req, res) => {
    const { task_id } = req.body;
    if (!task_id) return res.status(400).json({ error: 'Task ID is required' });

    const now = getLocalAnISOString();

    try {
        // Stop any currently running task
        const activeRecord = db.prepare('SELECT id, task_id, start_time FROM records WHERE user_id = ? AND end_time IS NULL').get(DEFAULT_USER_ID);
        if (activeRecord) {
            if (activeRecord.task_id === task_id) {
                return res.status(200).json({ id: activeRecord.id, task_id, start_time: activeRecord.start_time });
            }

            const startTimestamp = new Date(activeRecord.start_time.replace(' ', 'T')).getTime();
            const endTimestamp = new Date(now.replace(' ', 'T')).getTime();
            const durationSec = Math.floor((endTimestamp - startTimestamp) / 1000);

            db.prepare('UPDATE records SET end_time = ?, duration_sec = ? WHERE id = ?').run(now, durationSec, activeRecord.id);
        } else {
            // No active record. Check if the most recent record matches the requested task_id
            const lastRecord = db.prepare('SELECT id, task_id, start_time FROM records WHERE user_id = ? ORDER BY start_time DESC LIMIT 1').get(DEFAULT_USER_ID);
            if (lastRecord && lastRecord.task_id === task_id) {
                // Resume the last record
                db.prepare('UPDATE records SET end_time = NULL, duration_sec = NULL WHERE id = ?').run(lastRecord.id);
                return res.status(200).json({ id: lastRecord.id, task_id, start_time: lastRecord.start_time });
            }
        }

        // Start new task
        db.prepare('INSERT INTO records (user_id, task_id, start_time) VALUES (?, ?, ?)').run(DEFAULT_USER_ID, task_id, now);
        const lastInsert = db.prepare('SELECT last_insert_rowid() as id').get();
        res.status(201).json({ id: lastInsert.id, task_id, start_time: now });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/records/stop', (req, res) => {
    const now = getLocalAnISOString();

    try {
        const activeRecord = db.prepare('SELECT id, start_time FROM records WHERE user_id = ? AND end_time IS NULL').get(DEFAULT_USER_ID);
        if (!activeRecord) {
            return res.status(400).json({ error: 'No active task found' });
        }

        const startTimestamp = new Date(activeRecord.start_time.replace(' ', 'T')).getTime();
        const endTimestamp = new Date(now.replace(' ', 'T')).getTime();
        const durationSec = Math.max(0, Math.floor((endTimestamp - startTimestamp) / 1000));

        db.prepare('UPDATE records SET end_time = ?, duration_sec = ? WHERE id = ?').run(now, durationSec, activeRecord.id);
        res.json({ success: true, id: activeRecord.id, duration_sec: durationSec });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/records/:id', (req, res) => {
    const { id } = req.params;
    try {
        db.prepare('DELETE FROM records WHERE id = ? AND user_id = ?').run(id, DEFAULT_USER_ID);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/records/manual', (req, res) => {
    const { task_id, start_time, end_time } = req.body;

    if (!task_id || !start_time || !end_time) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (new Date(start_time.replace(' ', 'T')) >= new Date(end_time.replace(' ', 'T'))) {
        return res.status(400).json({ error: 'Start time must be before end time' });
    }

    try {
        const s = new Date(start_time.replace(' ', 'T')).getTime();
        const e = new Date(end_time.replace(' ', 'T')).getTime();
        const durationSec = Math.max(0, Math.floor((e - s) / 1000));

        // Check for overlapping records
        const overlap = db.prepare(`
            SELECT id FROM records 
            WHERE user_id = ? 
              AND start_time < ? 
              AND (end_time IS NULL OR end_time > ?)
            LIMIT 1
        `).get(DEFAULT_USER_ID, end_time, start_time);

        if (overlap) {
            return res.status(400).json({ error: 'The specified time overlaps with an existing record.' });
        }

        db.prepare('INSERT INTO records (user_id, task_id, start_time, end_time, duration_sec) VALUES (?, ?, ?, ?, ?)').run(DEFAULT_USER_ID, task_id, start_time, end_time, durationSec);
        const lastInsert = db.prepare('SELECT last_insert_rowid() as id').get();
        const newId = lastInsert.id;

        res.status(201).json({ success: true, id: newId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/records/:id', (req, res) => {
    const { id } = req.params;
    const { start_time, end_time } = req.body;

    try {
        const record = db.prepare('SELECT * FROM records WHERE id = ? AND user_id = ?').get(id, DEFAULT_USER_ID);
        if (!record) return res.status(404).json({ error: 'Record not found' });

        const finalStart = start_time || record.start_time;
        const finalEnd = end_time || record.end_time;

        if (finalEnd && new Date(finalStart.replace(' ', 'T')) >= new Date(finalEnd.replace(' ', 'T'))) {
            return res.status(400).json({ error: 'Start time must be before end time' });
        }

        db.transaction(() => {
            // Adjust overlaps
            // 1. Delete records completely inside the new range
            if (finalEnd) {
                db.prepare(`
                    DELETE FROM records 
                    WHERE user_id = ? AND id != ?
                      AND start_time >= ? AND end_time <= ?
                `).run(DEFAULT_USER_ID, id, finalStart, finalEnd);
            }

            // 2. Truncate records that end after new_start but start before it
            db.prepare(`
                UPDATE records 
                SET end_time = ?, 
                    duration_sec = (STRFTIME('%s', REPLACE(?, ' ', 'T')) - STRFTIME('%s', REPLACE(start_time, ' ', 'T')))
                WHERE user_id = ? AND id != ?
                  AND start_time < ? AND end_time > ?
            `).run(finalStart, finalStart, DEFAULT_USER_ID, id, finalStart, finalStart);

            // 3. Truncate records that start before new_end but end after it
            if (finalEnd) {
                db.prepare(`
                    UPDATE records 
                    SET start_time = ?, 
                        duration_sec = (STRFTIME('%s', REPLACE(end_time, ' ', 'T')) - STRFTIME('%s', REPLACE(?, ' ', 'T')))
                WHERE user_id = ? AND id != ?
                  AND start_time < ? AND end_time > ?
                `).run(finalEnd, finalEnd, DEFAULT_USER_ID, id, finalEnd, finalEnd);
            }

            // 4. Update the target record
            let durationSec = null;
            if (finalStart && finalEnd) {
                const s = new Date(finalStart.replace(' ', 'T')).getTime();
                const e = new Date(finalEnd.replace(' ', 'T')).getTime();
                durationSec = Math.max(0, Math.floor((e - s) / 1000));
            }

            db.prepare(`
                UPDATE records 
                SET start_time = ?, 
                    end_time = ?,
                    duration_sec = ?
                WHERE id = ? AND user_id = ?
            `).run(finalStart, finalEnd || null, durationSec, id, DEFAULT_USER_ID);
        })();

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Start Server Function
async function startServer() {
    // Wait for sql.js and the db wrapper to initialize
    db = await dbLoader.init();

    // Handle Execution
    if (require.main === module) {
        // Run directly via 'node server.js' (e.g., Docker, CLI)
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    }

    return app;
}

if (require.main === module) {
    startServer();
} else {
    // Export async init function for Electron to await
    module.exports = startServer;
}
