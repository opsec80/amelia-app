const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '5mb' }));
app.use(express.static(__dirname));

const TASKS_FILE = path.join(__dirname, 'data', 'tasks.json');
const IMAGES_DIR = path.join(__dirname, 'data', 'images');

// Generate UUID v4
function generateUUID() {
    return crypto.randomUUID();
}

// Retry mechanism for file operations
async function retryOperation(operation, maxRetries = 3, delay = 100) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (error.code === 'ENOENT') {
                await fs.mkdir(path.dirname(TASKS_FILE), { recursive: true });
                await fs.writeFile(TASKS_FILE, JSON.stringify([], null, 2));
                return await operation();
            }
            if (attempt === maxRetries) throw error;
            console.warn(`Retrying operation (attempt ${attempt}/${maxRetries}):`, error.message);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

async function initTasksFile() {
    return retryOperation(async () => {
        try {
            await fs.access(TASKS_FILE);
            const content = await fs.readFile(TASKS_FILE, 'utf8');
            JSON.parse(content);
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
            try {
                const rootTasks = await fs.readFile(path.join(__dirname, 'tasks.json'), 'utf8').catch(() => null);
                if (rootTasks) {
                    await fs.writeFile(TASKS_FILE, rootTasks);
                } else {
                    await fs.mkdir(path.dirname(TASKS_FILE), { recursive: true });
                    await fs.mkdir(IMAGES_DIR, { recursive: true });
                    await fs.writeFile(TASKS_FILE, JSON.stringify([
                        {"id":"550e8400-e29b-41d4-a716-446655440001","name":"Pay Rent","size":"large","value":0,"month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-01"},
                        {"id":"550e8400-e29b-41d4-a716-446655440002","name":"Pay Phone Bill","size":"medium","value":0,"month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-05"},
                        {"id":"550e8400-e29b-41d4-a716-446655440003","name":"Pay Electricity Bill","size":"medium","value":0,"month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-10"},
                        {"id":"550e8400-e29b-41d4-a716-446655440004","name":"Laundry","size":"small","value":0,"month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-07"},
                        {"id":"550e8400-e29b-41d4-a716-446655440005","name":"Folding and Putting Away Laundry","size":"small","value":0,"month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-07"},
                        {"id":"550e8400-e29b-41d4-a716-446655440006","name":"Do Dishes","size":"small","value":0,"month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-15"},
                        {"id":"550e8400-e29b-41d4-a716-446655440007","name":"Feed Dogs Breakfast","size":"extra-small","value":0,"month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-25"},
                        {"id":"550e8400-e29b-41d4-a716-446655440008","name":"Feed Dogs Dinner","size":"extra-small","value":0,"month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-25"},
                        {"id":"550e8400-e29b-41d4-a716-446655440009","name":"Order Medicine","size":"medium","value":0,"month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-10"},
                        {"id":"550e8400-e29b-41d4-a716-446655440010","name":"Pick up Medicine","size":"medium","value":0,"month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-12"},
                        {"id":"550e8400-e29b-41d4-a716-446655440011","name":"Eat Breakfast","size":"extra-small","value":0,"month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-25"},
                        {"id":"550e8400-e29b-41d4-a716-446655440012","name":"Eat Dinner","size":"extra-small","value":0,"month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-25"},
                        {"id":"550e8400-e29b-41d4-a716-446655440013","name":"Sweep Floors","size":"small","value":0,"month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-20"},
                        {"id":"550e8400-e29b-41d4-a716-446655440014","name":"Vacuum","size":"medium","value":0,"month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-20"},
                        {"id":"550e8400-e29b-41d4-a716-446655440015","name":"Mop","size":"medium","value":0,"month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-20"},
                        {"id":"550e8400-e29b-41d4-a716-446655440016","name":"Shower or Bath","size":"small","value":0,"month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-25"},
                        {"id":"550e8400-e29b-41d4-a716-446655440017","name":"Grocery Shop","size":"medium","value":0,"month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-15"},
                        {"id":"550e8400-e29b-41d4-a716-446655440018","name":"Take Dogs for Morning Walk","size":"extra-small","value":0,"month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-25"},
                        {"id":"550e8400-e29b-41d4-a716-446655440019","name":"Take Dogs for Afternoon or Evening Walk","size":"extra-small","value":0,"month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-25"}
                    ], null, 2));
                }
                await calculateTaskValues();
            } catch (err) {
                console.error('Error initializing tasks file:', err);
                throw err;
            }
        }
    });
}

async function calculateTaskValues() {
    return retryOperation(async () => {
        const tasks = JSON.parse(await fs.readFile(TASKS_FILE, 'utf8'));
        const weights = { 'extra-small': 1, 'small': 2, 'medium': 4, 'large': 8 };
        const totalWeight = tasks.reduce((sum, task) => sum + (weights[task.size] || 1), 0);
        const unitValue = totalWeight ? 3000 / totalWeight : 0;
        tasks.forEach(task => {
            task.value = Math.round(unitValue * (weights[task.size] || 1) * 100) / 100;
            task.size = task.size || 'small';
            task.completed = task.completed || false;
            task.completedDate = task.completedDate && !isNaN(new Date(task.completedDate)) ? task.completedDate : null;
            task.picture = task.picture && typeof task.picture === 'string' ? task.picture : null;
            task.userName = task.userName || null;
        });
        await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2));
    });
}

async function generateRecurringTasks() {
    return retryOperation(async () => {
        const tasks = JSON.parse(await fs.readFile(TASKS_FILE, 'utf8'));
        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        let updated = false;
        const nonGeneratedTasks = tasks.filter(task => !task.generated);
        const newTasks = [...nonGeneratedTasks];
        nonGeneratedTasks.forEach(task => {
            if (task.month === month && task.recurring !== 'none') {
                if (task.recurring === 'daily') {
                    for (let i = 1; i <= daysInMonth; i++) {
                        const dueDate = `${month}-${String(i).padStart(2, '0')}`;
                        newTasks.push({
                            id: generateUUID(),
                            name: `${task.name} (Day ${i})`,
                            size: task.size || 'small',
                            value: task.value || 0,
                            month,
                            recurring: 'none',
                            completed: false,
                            dueDate,
                            generated: true,
                            userName: task.userName || null
                        });
                    }
                } else if (task.recurring === 'weekly') {
                    for (let i = 1; i <= 4; i++) {
                        const dueDate = `${month}-${String(i * 7).padStart(2, '0')}`;
                        newTasks.push({
                            id: generateUUID(),
                            name: `${task.name} (Week ${i})`,
                            size: task.size || 'small',
                            value: task.value || 0,
                            month,
                            recurring: 'none',
                            completed: false,
                            dueDate,
                            generated: true,
                            userName: task.userName || null
                        });
                    }
                } else if (task.recurring === 'monthly') {
                    const dueDate = task.dueDate ? `${month}-${String(task.dueDate.split('-')[2]).padStart(2, '0')}` : `${month}-01`;
                    newTasks.push({
                        id: generateUUID(),
                        name: `${task.name} (Monthly)`,
                        size: task.size || 'small',
                        value: task.value || 0,
                        month,
                        recurring: 'none',
                        completed: false,
                        dueDate,
                        generated: true,
                        userName: task.userName || null
                    });
                }
            }
        });
        if (JSON.stringify(tasks) !== JSON.stringify(newTasks)) {
            updated = true;
            await fs.writeFile(TASKS_FILE, JSON.stringify(newTasks, null, 2));
            await calculateTaskValues();
        }
        return updated;
    });
}

app.get('/api/tasks', async (req, res) => {
    try {
        await generateRecurringTasks();
        const tasks = JSON.parse(await fs.readFile(TASKS_FILE, 'utf8'));
        const month = req.query.month;
        res.json(month ? tasks.filter(t => t.month === month) : tasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: `Failed to load tasks: ${error.message}` });
    }
});

app.get('/api/tasks/:id', async (req, res) => {
    try {
        const tasks = JSON.parse(await fs.readFile(TASKS_FILE, 'utf8'));
        const task = tasks.find(t => t.id === req.params.id);
        if (task) {
            res.json(task);
        } else {
            res.status(404).json({ error: 'Task not found' });
        }
    } catch (error) {
        console.error('Error fetching task:', error);
        res.status(500).json({ error: `Server error: ${error.message}` });
    }
});

app.post('/api/tasks', async (req, res) => {
    try {
        const tasks = JSON.parse(await fs.readFile(TASKS_FILE, 'utf8'));
        const newId = generateUUID();
        const task = { 
            id: newId, 
            name: req.body.name || 'Unnamed Task',
            size: req.body.size || 'small',
            value: 0,
            month: req.body.month || null,
            recurring: req.body.recurring || 'none',
            completed: false,
            dueDate: req.body.dueDate || null,
            userName: req.body.userName || null
        };
        tasks.push(task);
        await retryOperation(async () => {
            await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2));
            await calculateTaskValues();
        });
        res.status(201).send();
    } catch (error) {
        console.error('Error adding task:', error);
        res.status(500).json({ error: `Failed to add task: ${error.message}` });
    }
});

app.patch('/api/tasks/:id', async (req, res) => {
    try {
        const tasks = JSON.parse(await fs.readFile(TASKS_FILE, 'utf8'));
        const task = tasks.find(t => t.id === req.params.id);
        if (task) {
            if (req.body.picture) {
                const matches = req.body.picture.match(/^data:image\/(jpeg|png|heic|heif);base64,(.+)$/);
                if (!matches || matches[2].length > 500 * 1024) {
                    return res.status(400).json({ error: 'Invalid or oversized image (max 500KB)' });
                }
                const buffer = Buffer.from(matches[2], 'base64');
                const filePath = path.join(IMAGES_DIR, `task_${task.id}.${matches[1]}`);
                await fs.writeFile(filePath, buffer);
                task.picture = `/data/images/task_${task.id}.${matches[1]}`;
            }
            Object.assign(task, {
                name: req.body.name !== undefined ? req.body.name : task.name,
                size: req.body.size || task.size || 'small',
                month: req.body.month !== undefined ? req.body.month : task.month,
                recurring: req.body.recurring !== undefined ? req.body.recurring : task.recurring,
                completed: req.body.completed !== undefined ? req.body.completed : task.completed,
                completedDate: req.body.completedDate && !isNaN(new Date(req.body.completedDate)) ? req.body.completedDate : task.completed ? new Date().toISOString() : task.completedDate,
                userName: req.body.userName !== undefined ? req.body.userName : task.userName
            });
            task.value = task.value || 0;
            await retryOperation(async () => {
                await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2));
                await calculateTaskValues();
            });
            res.status(200).send();
        } else {
            res.status(404).json({ error: 'Task not found' });
        }
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: `Failed to update task: ${error.message}` });
    }
});

app.delete('/api/tasks/:id', async (req, res) => {
    try {
        let tasks = JSON.parse(await fs.readFile(TASKS_FILE, 'utf8'));
        const task = tasks.find(t => t.id === req.params.id);
        if (task) {
            if (task.picture) {
                try {
                    await fs.unlink(path.join(__dirname, task.picture));
                } catch (err) {
                    console.warn('Failed to delete image file:', err);
                }
            }
            tasks = tasks.filter(t => t.id !== req.params.id);
            await retryOperation(async () => {
                await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2));
                await calculateTaskValues();
            });
            res.status(200).send();
        } else {
            res.status(404).json({ error: 'Task not found' });
        }
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ error: `Failed to delete task: ${error.message}` });
    }
});

app.post('/api/reset', async (req, res) => {
    try {
        const tasks = JSON.parse(await fs.readFile(TASKS_FILE, 'utf8'));
        const now = new Date();
        const nextMonth = `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}`;
        tasks.forEach(t => {
            if (t.recurring === 'none') {
                t.completed = false;
                if (t.picture) {
                    try {
                        fs.unlink(path.join(__dirname, t.picture)).catch(err => console.warn('Failed to delete image file:', err));
                    }
                    t.picture = null;
                }
                t.completedDate = null;
                t.month = nextMonth;
                t.value = 0;
                t.size = t.size || 'small';
            }
        });
        await retryOperation(async () => {
            await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2));
            await calculateTaskValues();
        });
        res.status(200).send();
    } catch (error) {
        console.error('Error resetting tasks:', error);
        res.status(500).json({ error: `Failed to reset tasks: ${error.message}` });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    initTasksFile();
});
