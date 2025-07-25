// Client-side logic for app and portal
const API_URL = '/api';
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
        document.getElementById('user-name-display').textContent = userName;
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
        document.getElementById('user-name-display').textContent = userName;
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
        if (!response.ok) throw new Error('Failed to load tasks');
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
    const today = new Date().toISOString().split('T')[0];
    tasks.forEach(task => {
        if (task.completed) return; // Skip completed tasks
        const isOverdue = task.dueDate && task.dueDate < today && !task.completed;
        const li = document.createElement('li');
        li.className = `task-item ${isOverdue ? 'overdue' : ''}`;
        li.innerHTML = `
            <span>${task.name} ($${task.value}) ${task.dueDate ? 'Due: ' + task.dueDate : ''}</span>
            ${task.streak ? `<img src="assets/gold-star.png" class="gold-star" alt="Gold Star">` : ''}
            <div class="index-task-actions">
                ${task.picture ? `<img src="${task.picture}" class="preview-image" alt="Submission">` : ''}
                <label class="custom-file-upload">Proof<input type="file" accept="image/*" onchange="uploadPicture('${task.id}', this)"></label>
                <button class="completed-btn" onclick="toggleTask('${task.id}')" ${task.picture ? '' : 'disabled'}>Completed</button>
            </div>
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

async function toggleTask(taskId) {
    try {
        const response = await fetch(`${API_URL}/tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed: true, completedDate: new Date().toISOString(), userName })
        });
        if (response.ok) {
            completionSound.play();
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
    if (!['image/jpeg', 'image/png', 'image/heic'].includes(input.files[0].type)) {
        alert('Please upload a JPG, PNG, or HEIC image.');
        return;
    }
    if (input.files[0].size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB.');
        return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
        try {
            const response = await fetch(`${API_URL}/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ picture: reader.result })
            });
            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }
            loadTasks();
        } catch (error) {
            console.error('Upload error:', error);
            alert(`Error uploading picture: ${error.message}`);
        }
    };
    reader.onerror = () => alert('Error reading image file.');
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
        if (!response.ok) throw new Error('Failed to fetch tasks');
        const tasks = await response.json();
        const earned = tasks.filter(t => t.completed).reduce((sum, t) => sum + t.value, 0);
        const bonus = tasks.every(t => t.completed) ? 500 : 0;
        const subject = `Payment Request for ${userName} - ${new Date().toLocaleString('default', { month: 'long', year: '2025' })}`;
        const body = `Tasks Completed:\n${tasks.filter(t => t.completed).map(t => `- ${t.name}: $${t.value}`).join('\n')}\nTotal: $${earned}\nBonus: $${bonus}`;
        window.location.href = `mailto:your-email@example.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        document.getElementById('payment-confirmation').textContent = 'Payment sent! Please check your email to confirm the request.';
    } catch (error) {
        alert('Error preparing payment request.');
    }
}

async function confirmPayment() {
    try {
        const response = await fetch(`${API_URL}/reset`, { method: 'POST' });
        if (!response.ok) throw new Error('Failed to reset tasks');
        alert('Payment confirmed. Tasks reset for next month.');
        document.getElementById('payment-confirmation').textContent = 'Payment confirmed!';
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
        const taskId = document.getElementById('task-form').dataset.taskId;
        const task = {
            name: document.getElementById('task-name').value,
            value: parseFloat(document.getElementById('task-value').value),
            dueDate: document.getElementById('task-due-date').value,
            month: document.getElementById('task-month').value,
            recurring: document.getElementById('task-recurring').value
        };
        try {
            if (taskId) {
                const response = await fetch(`${API_URL}/tasks/${taskId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(task)
                });
                if (!response.ok) throw new Error('Failed to update task');
                document.getElementById('task-form').dataset.taskId = '';
            } else {
                const response = await fetch(`${API_URL}/tasks`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(task)
                });
                if (!response.ok) throw new Error('Failed to add task');
            }
            document.getElementById('task-form').reset();
            loadAdminTasks();
        } catch (error) {
            alert(`Error saving task: ${error.message}`);
        }
    });
}

async function loadAdminTasks() {
    try {
        const response = await fetch(`${API_URL}/tasks`);
        if (!response.ok) throw new Error('Failed to load tasks');
        const tasks = await response.json();
        const taskList = document.getElementById('admin-task-list');
        taskList.innerHTML = '';
        tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = 'task-item';
            li.innerHTML = `
                <span>${task.name} ($${task.value}, ${task.month}, ${task.recurring}, Due: ${task.dueDate || 'N/A'})</span>
                ${task.completed ? `<span>Completed: ${new Date(task.completedDate).toLocaleDateString()}</span>` : ''}
                <div class="admin-task-actions">
                    ${task.picture ? `<img src="${task.picture}" class="preview-image" alt="Submission">` : ''}
                    <button onclick="editTask('${task.id}')">Edit</button>
                    <button onclick="deleteTask('${task.id}')">Delete</button>
                </div>
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
    try {
        const response = await fetch(`${API_URL}/tasks/${taskId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch task: ${response.status} ${response.statusText}`);
        }
        const task = await response.json();
        if (task.error) {
            throw new Error(task.error);
        }
        document.getElementById('task-name').value = task.name;
        document.getElementById('task-value').value = task.value;
        document.getElementById('task-due-date').value = task.dueDate || '';
        document.getElementById('task-month').value = task.month;
        document.getElementById('task-recurring').value = task.recurring;
        document.getElementById('task-form').dataset.taskId = taskId;
    } catch (error) {
        console.error('Edit task error:', error);
        alert(`Error loading task for editing: ${error.message}`);
    }
}

async function deleteTask(taskId) {
    try {
        const response = await fetch(`${API_URL}/tasks/${taskId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete task');
        loadAdminTasks();
    } catch (error) {
        alert(`Error deleting task: ${error.message}`);
    }
}

function displaySubmissions(tasks) {
    const submissionList = document.getElementById('submission-list');
    submissionList.innerHTML = tasks.filter(t => t.completed).map(t => `
        <li>${t.name} by ${t.userName || 'Unknown'} ($${t.value}, ${new Date(t.completedDate).toLocaleDateString()})
        ${t.picture ? `<img src="${t.picture}" class="preview-image" alt="Submission">` : ''}
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
            const csv = ['Name,Value,Completed,Date,Picture,DueDate'];
            tasks.forEach(t => {
                csv.push(`${t.name},${t.value},${t.completed ? 'Yes' : 'No'},${t.completedDate || ''},${t.picture || ''},${t.dueDate || ''}`);
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