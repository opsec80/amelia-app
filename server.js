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
        const content = await fs.readFile(TASKS_FILE, 'utf8');
        JSON.parse(content); // Validate JSON
    } catch {
        try {
            const rootTasks = await fs.readFile(path.join(__dirname, 'tasks.json'), 'utf8');
            await fs.writeFile(TASKS_FILE, rootTasks);
        } catch {
            await fs.writeFile(TASKS_FILE, JSON.stringify([
                {"id":"1","name":"Pay Rent","size":"large","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-01"},
                {"id":"2","name":"Pay Phone Bill","size":"medium","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-05"},
                {"id":"3","name":"Pay Electricity Bill","size":"medium","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-10"},
                {"id":"4","name":"Laundry","size":"small","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-07"},
                {"id":"5","name":"Folding and Putting Away Laundry","size":"small","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-07"},
                {"id":"6","name":"Do Dishes","size":"small","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-15"},
                {"id":"7","name":"Feed Dogs Breakfast","size":"extra-small","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-01"},
                {"id":"8","name":"Feed Dogs Dinner","size":"extra-small","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-01"},
                {"id":"9","name":"Order Medicine","size":"medium","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-10"},
                {"id":"10","name":"Pick up Medicine","size":"medium","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-12"},
                {"id":"11","name":"Eat Breakfast","size":"extra-small","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-01"},
                {"id":"12","name":"Eat Dinner","size":"extra-small","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-01"},
                {"id":"13","name":"Sweep Floors","size":"small","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-20"},
                {"id":"14","name":"Vacuum","size":"medium","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-20"},
                {"id":"15","name":"Mop","size":"medium","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-20"},
                {"id":"16","name":"Shower or Bath","size":"small","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-25"},
                {"id":"17","name":"Grocery Shop","size":"medium","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-15"},
                {"id":"18","name":"Take Dogs for Morning Walk","size":"extra-small","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-01"},
                {"id":"19","name":"Take Dogs for Afternoon or Evening Walk","size":"extra-small","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-01"}
            ], null, 2));
        }
        await calculateTaskValues();
    }
}

// Calculate task values based on size
async function calculateTaskValues() {
    try {
        const tasks = JSON.parse(await fs.readFile(TASKS_FILE, 'utf8'));
        const weights = { 'extra-small': 1, 'small': 2, 'medium': 4, 'large': 8 };
        const totalWeight = tasks.reduce((sum, task) => sum + (weights[task.size] || 1), 0);
        const unitValue = totalWeight ? 3000 / totalWeight : 0;
        tasks.forEach(task => {
            task.value = Math.round(unitValue * (weights[task.size] || 1) * 100) / 100; // Round to 2 decimals
        });
        await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2));
    } catch (error) {
        console.error('Error calculating task values:', error);
    }
}

// Generate recurring tasks
async function generateRecurringTasks() {
    try {
        const tasks = JSON.parse(await fs.readFile(TASKS_FILE, 'utf8'));
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
                            size: task.size,
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
                            size: task.size,
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
                        size: task.size,
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
            await fs.writeFile(TASKS_FILE, JSON.stringify(newTasks, null, 2));
            await calculateTaskValues();
        }

        return updated;
    } catch (error) {
        console.error('Error generating recurring tasks:', error);
        return false;
    }
}

// API routes
app.get('/api/tasks', async (req, res) => {
    try {
        await generateRecurringTasks();
        const tasks = JSON.parse(await fs.readFile(TASKS_FILE, 'utf8'));
        const month = req.query.month;
        res.json(month ? tasks.filter(t => t.month === month) : tasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Failed to load tasks' });
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
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/tasks', async (req, res) => {
    try {
        const tasks = JSON.parse(await fs.readFile(TASKS_FILE, 'utf8'));
        const task = { id: Date.now().toString(), ...req.body, completed: false };
        tasks.push(task);
        await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2));
        await calculateTaskValues();
        res.status(201).send();
    } catch (error) {
        console.error('Error adding task:', error);
        res.status(500).json({ error: 'Failed to add task' });
    }
});

app.patch('/api/tasks/:id', async (req, res) => {
    try {
        const tasks = JSON.parse(await fs.readFile(TASKS_FILE, 'utf8'));
        const task = tasks.find(t => t.id === req.params.id);
        if (task) {
            Object.assign(task, req.body);
            await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2));
            await calculateTaskValues();
            res.status(200).send();
        } else {
            res.status(404).json({ error: 'Task not found' });
        }
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

app.delete('/api/tasks/:id', async (req, res) => {
    try {
        let tasks = JSON.parse(await fs.readFile(TASKS_FILE, 'utf8'));
        tasks = tasks.filter(task => task.id !== req.params.id);
        await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2));
        await calculateTaskValues();
        res.status(200).send();
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ error: 'Failed to delete task' });
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
                t.picture = null;
                t.completedDate = null;
                t.month = nextMonth;
            }
        });
        await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2));
        await calculateTaskValues();
        res.status(200).send();
    } catch (error) {
        console.error('Error resetting tasks:', error);
        res.status(500).json({ error: 'Failed to reset tasks' });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));