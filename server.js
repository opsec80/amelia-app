const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Increase payload limit to 5MB for image uploads
app.use(express.json({ limit: '5mb' }));
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
                {"id":"1","name":"Pay Rent","value":0,"month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-01"},
                {"id":"2","name":"Pay Phone Bill","value":0,"month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-05"},
                {"id":"3","name":"Pay Electricity Bill","value":0,"month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-10"},
                {"id":"4","name":"Week 1 Laundry","value":0,"month":"2025-07","recurring":"weekly","completed":false,"dueDate":"2025-07-07"},
                {"id":"5","name":"Week 1 Folding and Putting Away Laundry","value":0,"month":"2025-07","recurring":"weekly","completed":false,"dueDate":"2025-07-07"},
                {"id":"6","name":"Week 2 Laundry","value":0,"month":"2025-07","recurring":"weekly","completed":false,"dueDate":"2025-07-14"},
                {"id":"7","name":"Week 2 Folding and Putting Away Laundry","value":0,"month":"2025-07","recurring":"weekly","completed":false,"dueDate":"2025-07-14"},
                {"id":"8","name":"Week 3 Laundry","value":0,"month":"2025-07","recurring":"weekly","completed":false,"dueDate":"2025-07-21"},
                {"id":"9","name":"Week 3 Folding and Putting Away Laundry","value":0,"month":"2025-07","recurring":"weekly","completed":false,"dueDate":"2025-07-21"},
                {"id":"10","name":"Week 4 Laundry","value":0,"month":"2025-07","recurring":"weekly","completed":false,"dueDate":"2025-07-28"},
                {"id":"11","name":"Week 4 Folding and Putting Away Laundry","value":0,"month":"2025-07","recurring":"weekly","completed":false,"dueDate":"2025-07-28"},
                {"id":"12","name":"Do Dishes","value":0,"month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-15"},
                {"id":"13","name":"Feed Dogs Breakfast","value":0,"month":"2025-07","recurring":"daily","completed":false,"dueDate":"2025-07-01"},
                {"id":"14","name":"Feed Dogs Dinner","value":0,"month":"2025-07","recurring":"daily","completed":false,"dueDate":"2025-07-01"},
                {"id":"15","name":"Order Medicine","value":0,"month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-10"},
                {"id":"16","name":"Pick up Medicine","value":0,"month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-12"},
                {"id":"17","name":"Eat Breakfast","value":0,"month":"2025-07","recurring":"daily","completed":false,"dueDate":"2025-07-01"},
                {"id":"18","name":"Eat Dinner","value":0,"month":"2025-07","recurring":"daily","completed":false,"dueDate":"2025-07-01"},
                {"id":"19","name":"Sweep Floors","value":0,"month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-20"},
                {"id":"20","name":"Vacuum","value":0,"month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-20"},
                {"id":"21","name":"Mop","value":0,"month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-20"},
                {"id":"22","name":"Shower or Bath","value":0,"month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-25"},
                {"id":"23","name":"Grocery Shop","value":0,"month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-15"},
                {"id":"24","name":"Take Dogs for Morning Walk","value":0,"month":"2025-07","recurring":"daily","completed":false,"dueDate":"2025-07-01"},
                {"id":"25","name":"Take Dogs for Afternoon or Evening Walk","value":0,"month":"2025-07","recurring":"daily","completed":false,"dueDate":"2025-07-01"}
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
    let updated = false;

    // Remove old generated tasks for the current month
    const nonGeneratedTasks = tasks.filter(task => !task.generated);
    const newTasks = [...nonGeneratedTasks];

    // Generate recurring tasks for the current month
    nonGeneratedTasks.forEach(task => {
        if (task.month === month && task.recurring !== 'none') {
            if (task.recurring === 'daily') {
                for (let i = 1; i <= daysInMonth; i++) {
                    const dueDate = `${month}-${String(i).padStart(2, '0')}`;
                    newTasks.push({
                        id: `${task.id}-${i}`,
                        name: `${task.name} (Day ${i})`,
                        value: task.value,
                        month,
                        recurring: 'none',
                        completed: false,
                        dueDate,
                        generated: true,
                        userName: task.userName
                    });
                }
            } else if (task.recurring === 'weekly') {
                for (let i = 1; i <= 4; i++) {
                    const dueDate = `${month}-${String(i * 7).padStart(2, '0')}`;
                    newTasks.push({
                        id: `${task.id}-${i}`,
                        name: `${task.name} (Week ${i})`,
                        value: task.value,
                        month,
                        recurring: 'none',
                        completed: false,
                        dueDate,
                        generated: true,
                        userName: task.userName
                    });
                }
            } else if (task.recurring === 'monthly') {
                const dueDate = `${month}-${String(task.dueDate.split('-')[2]).padStart(2, '0')}`;
                newTasks.push({
                    id: `${task.id}-monthly`,
                    name: `${task.name} (Monthly)`,
                    value: task.value,
                    month,
                    recurring: 'none',
                    completed: false,
                    dueDate,
                    generated: true,
                    userName: task.userName
                });
            }
        }
    });

    if (JSON.stringify(tasks) !== JSON.stringify(newTasks)) {
        updated = true;
        await fs.writeFile(TASKS_FILE, JSON.stringify(newTasks));
    }

    return updated;
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
        res.status(404).send('Error: Task not found');
    }
});

app.delete('/api/tasks/:id', async (req, res) => {
    let tasks = JSON.parse(await fs.readFile(TASKS_FILE));
    tasks = tasks.filter(task => task.id !== req.params.id);
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