const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '5mb' }));
app.use(express.static(__dirname));
app.use('/images', express.static('/data/images')); // Serve images from persistent disk

const TASKS_FILE = '/data/tasks.json';
const IMAGES_DIR = '/data/images';

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
                        {"id":"550e8400-e29b-41d4-a716-446655440001","name":"Pay Rent","size":"large","value":0,"month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-01"},
                        {"id":"550e8400-e29b-41d4-a716-446655440002","name":"Pay Phone Bill","size":"medium","value":0,"month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-05"},
                        {"id":"550e8400-e29b-41d4-a716-446655440003","name":"Pay Electricity Bill","size":"medium","value":0,"month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-10"},
                        {"id":"550e8400-e29b-41d4-a716-446655440004","name":"Laundry","size":"small","value":0,"month":"2025-07","recurring":"none","completed":false,"dueDate":"2025-07-07"},
                        {"id":"550e8400-e29b-41d4-a716-446655440005","name":"Folding and Putting Away Laundry","size":"small","value":0,"month":"2025-07","recurring":"none","completed":false,"
