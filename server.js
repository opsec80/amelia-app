const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '5mb' }));
app.use(express.static(__dirname));
app.use('/images', express.static('/app/data/images')); // Serve images from persistent disk

const TASKS_FILE = '/app/data/tasks.json';
const IMAGES_DIR = '/app/data/images';

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
            console.warn(`Retrying operation (attempt ${attempt}/${maxRetries}): ${error.message}`);
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
                        {"id":"550e8400-e29b-41d4-a716-446655440001","name":"Pay Rent","size":"large","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-01"},
                        {"id":"550e8400-e29b-41d4-a716-446655440002","name":"Pay Phone Bill","size":"medium","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-05"},
                        {"id":"550e8400-e29b-41d4-a716-446655440003","name":"Pay Electricity Bill","size":"medium","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-10"},
                        {"id":"550e8400-e29b-41d4-a716-446655440004","name":"Laundry","size":"small","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-07"},
                        {"id":"550e8400-e29b-41d4-a716-446655440005","name":"Folding and Putting Away Laundry","size":"small","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-07"},
                        {"id":"550e8400-e29b-41d4-a716-446655440006","name":"Do Dishes","size":"small","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-15"},
                        {"id":"550e8400-e29b-41d4-a716-446655440007","name":"Feed Dogs Breakfast","size":"extra-small","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-25"},
                        {"id":"550e8400-e29b-41d4-a716-446655440008","name":"Feed Dogs Dinner","size":"extra-small","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-25"},
                        {"id":"550e8400-e29b-41d4-a716-446655440009","name":"Order Medicine","size":"medium","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-10"},
                        {"id":"550e8400-e29b-41d4-a716-446655440010","name":"Pick up Medicine","size":"medium","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-12"},
                        {"id":"550e8400-e29b-41d4-a716-446655440011","name":"Eat Breakfast","size":"extra-small","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-25"},
                        {"id":"550e8400-e29b-41d4-a716-446655440012","name":"Eat Dinner","size":"extra-small","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-25"},
                        {"id":"550e8400-e29b-41d4-a716-446655440013","name":"Sweep Floors","size":"small","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-20"},
                        {"id":"550e8400-e29b-41d4-a716-446655440014","name":"Vacuum","size":"medium","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-20"},
                        {"id":"550e8400-e29b-41d4-a716-446655440015","name":"Mop","size":"medium","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-20"},
                        {"id":"550e8400-e29b-41d4-a716-446655440016","name":"Shower or Bath","size":"small","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-25"},
                        {"id":"550e8400-e29b-41d4-a716-446655440017","name":"Grocery Shop","size":"medium","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-15"},
                        {"id":"550e8400-e29b-41d4-a716-446655440018","name":"Take Dogs for Morning Walk","size":"extra-small","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-25"},
                        {"id":"550e8400-e29b-41d4-a716-446655440019","name":"Take Dogs for Afternoon or Evening Walk","size":"extra-small","month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-25"}
                    ], null, 2));
                }
                await calculateTaskValues();
            } catch (err) {
                console.error(`Error initializing tasks file: ${err.message}`);
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
                            generated...
