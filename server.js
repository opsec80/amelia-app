const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname)); // Serve static files

const TASKS_FILE = path.join(__dirname, 'data', 'tasks.json'); // Render disk path

// Initialize tasks.json if it doesn't exist
async function initTasksFile() {
    try {
        await fs.access(TASKS_FILE);
    } catch {
        try {
            // Try copying from root tasks.json
            const rootTasks = await fs.readFile(path.join(__dirname, 'tasks.json'));
            await fs.writeFile(TASKS_FILE, rootTasks);
        } catch {
            // Fallback to default tasks
            await fs.writeFile(TASKS_FILE, JSON.stringify([
                {"id":"1","name":"Pay Rent","value":0,"month":"2025-07","recurring":"none","completed":false},
                {"id":"2","name":"Pay Phone Bill","value":0,"month":"2025-07","recurring":"none","completed":false},
                // ... other tasks (same as your tasks.json)
            ]));
        }
    }
}

initTasksFile();

// Generate recurring tasks
async function generateRecurringTasks() {
    const tasks = JSON.parse(await fs.readFile(TASKS_FILE));
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    tasks.forEach(task => {
        if (task.month !== month && task.recurring !== 'none') {
            if (task.recurring === 'daily') {
                for (let i = 1; i <= daysInMonth; i++) {
                    tasks.push({
                        id: `${task.id}-${i}`,
                        name: `${task.name} (Day ${i})`,
                        value: task.value,
                        month,
                        recurring: 'none',
                        completed: false,
                        dueDate: `${month}-${String(i).padStart(2, '0')}`
                    });
                }
            } else if (task.recurring === 'weekly') {
                for (let i = 1; i <= 4; i++) {
                    tasks.push({
                        id: `${task.id}-${i}`,
                        name: `${task.name} (Week ${i})`,
                        value: task.value,
                        month,
                        recurring: 'none',
                        completed: false,
                        dueDate: `${month}-${String(i * 7).padStart(2, '0')}`
                    });
                }
            }
        }
    });
    await fs.writeFile(TASKS_FILE, JSON.stringify(tasks));
}

// API routes
app.get('/api/tasks', async (req, res) => {
    await generateRecurringTasks();
    const tasks = JSON.parse(await fs.readFile(TASKS_FILE));
    const month = req.query.month;
    res.json(month ? tasks.filter(t => t.month === month) : tasks);
});

app.get('/api/tasks/:id', async (req, res) => {
    try {
        const tasks = JSON.parse(await fs.readFile(TASKS_FILE));
        const task = tasks.find(t => t.id === req.params.id);
        if (task) {
            res.json(task);
        } else {
            res.status(404).json({ error: 'Task not found' });
        }
    } catch (error) {
        console.error('Error fetching task:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/tasks', async (req, res) => {
    const tasks = JSON.parse(await fs.readFile(TASKS_FILE));
    const task = { id: Date.now().toString(), ...req.body, completed: false };
    tasks.push(task);
    await fs.writeFile(TASKS_FILE, JSON.stringify(tasks));
    res.status(201).send();
});

app.patch('/api/tasks/:id', async (req, res) => {
    const tasks = JSON.parse(await fs.readFile(TASKS_FILE));
    const task = tasks.find(t => t.id === req.params.id);
    if (task) {
        Object.assign(task, req.body);
        await fs.writeFile(TASKS_FILE, JSON.stringify(tasks));
        res.status(200).send();
    } else {
        res.status(404).send();
    }
});

app.delete('/api/tasks/:id', async (req, res) => {
    let tasks = JSON.parse(await fs.readFile(TASKS_FILE));
    tasks = tasks.filter(t => t.id !== req.params.id);
    await fs.writeFile(TASKS_FILE, JSON.stringify(tasks));
    res.status(200).send();
});

app.post('/api/reset', async (req, res) => {
    const tasks = JSON.parse(await fs.readFile(TASKS_FILE));
    const now = new Date();
    const nextMonth = `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}`;
    tasks.forEach(t => {
        if (t.recurring === 'none') {
            t.completed = false;
            t.picture = null;
            t.completedDate = null;
            t.month = nextMonth;
        }
    });
    await fs.writeFile(TASKS_FILE, JSON.stringify(tasks));
    res.status(200).send();
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));