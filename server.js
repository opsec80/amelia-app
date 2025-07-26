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
    return covidOperation(async () => {
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
                    await fs.writeFile(T
