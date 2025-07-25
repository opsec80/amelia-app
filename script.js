// Client-side logic for app and portal
const API_URL = '/api'; // Adjust for Glitch URL
let userName = '';
const completionSound = document.getElementById('completion-sound');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('current-month')) {
        initUserApp();
    } else if (document.getElementById('task-form')) {
        initAdminPortal();
    }
    initThemeToggle();
});

// User App
function initUserApp() {
    userName = localStorage.getItem('userName') || '';
    if (!userName) {
        document.getElementById('name-input').style.display = 'block';
        document.getElementById('dashboard').style.display = 'none';
    } else {
        document.getElementById('name-input').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        loadTasks();
    }
    updateMonthDisplay();
}

function saveName() {
    userName = document.getElementById('user-name').value.trim();
    if (userName) {
        localStorage.setItem('userName', userName);
        document.getElementById('name-input').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        loadTasks();
    } else {
        alert('Please enter your name!');
    }
}

function updateMonthDisplay() {
    const now = new Date();
    document.getElementById('current-month').textContent = now.toLocaleString('default', { month: 'long', year: 'numeric' });
}

async function loadTasks() {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    try {
        const response = await fetch(`${API_URL}/tasks?month=${month}`);
        const tasks = await response.json();
        displayTasks(tasks);
        displayTodayTasks(tasks);
        updateProgress(tasks);
    } catch (error) {
        alert('Error loading tasks. Please try again.');
    }
}

function displayTasks(tasks) {
    const taskList = document.getElementById('task-list');
    taskList.innerHTML = '';
    tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        li.innerHTML = `
            <input type="checkbox" class="task-check" ${task.completed ? 'checked' : ''} onchange="toggleTask('${task.id}', this.checked)">
            <span>${task.name} ($${task.value})</span>
            ${task.streak ? `<img src="assets/gold-star.png" class="gold-star" alt="Gold Star">` : ''}
            <input type="file" accept="image/*" onchange="uploadPicture('${task.id}', this)">
            ${task.picture ? `<img src="${task.picture}" width="50" alt="Submission">` : ''}
            ${task.completed ? `<span>${new Date(task.completedDate).toLocaleDateString()}</span>` : ''}
        `;
        taskList.appendChild(li);
    });
}

function displayTodayTasks(tasks) {
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = tasks.filter(task => task.dueDate === today && !task.completed);
    const todayList = document.getElementById('today-tasks');
    todayList.innerHTML = todayTasks.length ? todayTasks.map(task => `<li>${task.name} (Due Today)</li>`).join('') : '<li>No tasks due today!</li>';
}

async function toggleTask(taskId, completed) {
    try {
        const response = await fetch(`${API_URL}/tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed, completedDate: completed ? new Date().toISOString() : null })
        });
        if (response.ok) {
            if (completed) completionSound.play();
            loadTasks();
        } else {
            alert('Error updating task.');
        }
    } catch (error) {
        alert('Error updating task.');
    }
}

async function uploadPicture(taskId, input) {
    if (!input.files[0]) return;
    const reader = new FileReader();
    reader.onload = async () => {
        try {
            const response = await fetch(`${API_URL}/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ picture: reader.result })
            });
            if (response.ok) {
                loadTasks();
            } else {
                alert('Error uploading picture.');
            }
        } catch (error) {
            alert('Error uploading picture.');
        }
    };
    reader.readAsDataURL(input.files[0]);
}

async function updateProgress(tasks) {
    const completed = tasks.filter(t => t.completed).length;
    const total = tasks.length;
    const earned = tasks.filter(t => t.completed).reduce((sum, t) => sum + t.value, 0);
    const progress = total ? (completed / total) * 100 : 0;
    document.getElementById('progress-fill').style.width = `${progress}%`;
    document.getElementById('progress-text').textContent = `Progress: ${Math.round(progress)}% ($${earned} / $3,000)`;
    document.getElementById('bonus-text').textContent = completed === total ? 'Bonus: $500 (Earned!)' : 'Bonus: $500 (Complete all tasks to earn!)';
    document.getElementById('payment-btn').disabled = completed !== total && new Date().getDate() < 28;
}

async function requestPayment() {
    try {
        const response = await fetch(`${API_URL}/tasks?month=${new Date().toISOString().slice(0, 7)}`);
        const tasks = await response.json();
        const earned = tasks.filter(t => t.completed).reduce((sum, t) => sum + t.value, 0);
        const bonus = tasks.every(t => t.completed) ? 500 : 0;
        const subject = `Payment Request for ${userName} - ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`;
        const body = `Tasks Completed:\n${tasks.filter(t => t.completed).map(t => `- ${t.name}: $${t.value}`).join('\n')}\nTotal: $${earned}\nBonus: $${bonus}`;
        window.location.href = `mailto:your-email@example.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        document.getElementById('payment-confirmation').style.display = 'block';
    } catch (error) {
        alert('Error preparing payment request.');
    }
}

async function confirmPayment() {
    try {
        await fetch(`${API_URL}/reset`, { method: 'POST' });
        alert('Payment confirmed. Tasks reset for next month.');
        document.getElementById('payment-confirmation').style.display = 'none';
        loadTasks();
    } catch (error) {
        alert('Error resetting tasks.');
    }
}

// Admin Portal
async function initAdminPortal() {
    loadAdminTasks();
    document.getElementById('task-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const task = {
            name: document.getElementById('task-name').value,
            value: parseFloat(document.getElementById('task-value').value),
            month: document.getElementById('task-month').value,
            recurring: document.getElementById('task-recurring').value
        };
        try {
            await fetch(`${API_URL}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(task)
            });
            loadAdminTasks();
            document.getElementById('task-form').reset();
        } catch (error) {
            alert('Error adding task.');
        }
    });
}

async function loadAdminTasks() {
    try {
        const response = await fetch(`${API_URL}/tasks`);
        const tasks = await response.json();
        const taskList = document.getElementById('admin-task-list');
        taskList.innerHTML = '';
        tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = 'task-item';
            li.innerHTML = `
                <span>${task.name} ($${task.value}, ${task.month}, ${task.recurring})</span>
                <button onclick="editTask('${task.id}')">Edit</button>
                <button onclick="deleteTask('${task.id}')">Delete</button>
                ${task.picture ? `<img src="${task.picture}" width="50" alt="Submission">` : ''}
                ${task.completed ? `<span>Completed: ${new Date(task.completedDate).toLocaleDateString()}</span>` : ''}
            `;
            taskList.appendChild(li);
        });
        displaySubmissions(tasks);
        displayReport(tasks);
    } catch (error) {
        alert('Error loading tasks.');
    }
}

async function editTask(taskId) {
    const response = await fetch(`${API_URL}/tasks/${taskId}`);
    const task = await response.json();
    document.getElementById('task-name').value = task.name;
    document.getElementById('task-value').value = task.value;
    document.getElementById('task-month').value = task.month;
    document.getElementById('task-recurring').value = task.recurring;
    await deleteTask(taskId);
}

async function deleteTask(taskId) {
    try {
        await fetch(`${API_URL}/tasks/${taskId}`, { method: 'DELETE' });
        loadAdminTasks();
    } catch (error) {
        alert('Error deleting task.');
    }
}

function displaySubmissions(tasks) {
    const submissionList = document.getElementById('submission-list');
    submissionList.innerHTML = tasks.filter(t => t.completed).map(t => `
        <li>${t.name} by ${t.userName} ($${t.value}, ${new Date(t.completedDate).toLocaleDateString()})
        ${t.picture ? `<img src="${t.picture}" width="50" alt="Submission">` : ''}
        </li>
    `).join('');
}

function displayReport(tasks) {
    const earned = tasks.filter(t => t.completed).reduce((sum, t) => sum + t.value, 0);
    const bonus = tasks.every(t => t.completed) ? 500 : 0;
    document.getElementById('report-text').textContent = `Total Earned: $${earned}, Bonus: $${bonus}`;
}

function downloadReport() {
    fetch(`${API_URL}/tasks`)
        .then(res => res.json())
        .then(tasks => {
            const csv = ['Name,Value,Completed,Date,Picture'];
            tasks.forEach(t => {
                csv.push(`${t.name},${t.value},${t.completed ? 'Yes' : 'No'},${t.completedDate || ''},${t.picture || ''}`);
            });
            const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'report.csv';
            a.click();
            URL.revokeObjectURL(url);
        });
}

// Theme Toggle
function initThemeToggle() {
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'theme-toggle';
    toggleBtn.textContent = 'Toggle Dark Mode';
    document.body.appendChild(toggleBtn);
    toggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    });
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
    }
}