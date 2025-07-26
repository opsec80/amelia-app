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
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to load tasks: ${response.status}`);
        }
        const tasks = await response.json();
        displayTasks(tasks);
        displayTodayTasks(tasks);
        updateProgress(tasks);
    } catch (error) {
        console.error('Load tasks error:', error);
        alert(`Error loading tasks: ${error.message}. Please try again or contact support.`);
    }
}

function displayTasks(tasks) {
    const taskList = document.getElementById('task-list');
    taskList.innerHTML = '';
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const sortedTasks = [...tasks].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    sortedTasks.forEach(task => {
        if (task.completed) return; // Skip completed tasks
        const isOverdue = task.dueDate && task.dueDate < todayString && !task.completed;
        const li = document.createElement('li');
        li.className = `task-item ${isOverdue ? 'overdue' : ''}`;
        const taskValue = typeof task.value === 'number' ? task.value.toFixed(2) : '0.00';
        li.innerHTML = `
            <span>${task.name} ($${taskValue}) ${task.dueDate ? 'Due: ' + task.dueDate : ''}</span>
            ${task.streak ? `<img src="assets/gold-star.png" class="gold-star" alt="Gold Star">` : ''}
            <div class="index-task-actions">
                ${task.picture ? `<img src="${task.picture}" class="preview-image" alt="Submission">` : ''}
                <label class="custom-file-upload">Proof<input type="file" accept="image/jpeg,image/png,image/heic,image/heif,capture=camera" onchange="uploadPicture('${task.id}', this)"></label>
                <button class="completed-btn" onclick="toggleTask('${task.id}')" ${task.picture ? '' : 'disabled'}>Completed</button>
            </div>
        `;
        taskList.appendChild(li);
    });
}

function displayTodayTasks(tasks) {
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const todayTasks = tasks.filter(task => task.dueDate === todayString && !task.completed);
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
            const errorData = await response.json().catch(() => ({}));
            alert(`Error updating task: ${errorData.error || response.status}`);
        }
    } catch (error) {
        console.error('Toggle task error:', error);
        alert(`Error updating task: ${error.message}`);
    }
}

async function uploadPicture(taskId, input) {
    if (!input.files[0]) return;
    console.log('Task ID for upload:', taskId); // Added for debugging
    if (!['image/jpeg', 'image/png', 'image/heic', 'image/heif'].includes(input.files[0].type)) {
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
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
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
    const earned = tasks.filter(t => t.completed).reduce((sum, t) => sum + (t.value || 0), 0);
    const progress = total ? (completed / total) * 100 : 0;
    document.getElementById('progress-fill').style.width = `${progress}%`;
    document.getElementById('progress-text').textContent = `Progress: ${Math.round(progress)}% ($${earned.toFixed(2)} / $3,000)`;
    document.getElementById('bonus-text').textContent = completed === total ? 'Bonus: $500 (Earned!)' : 'Bonus: $500 (Complete all tasks to earn!)';
    document.getElementById('payment-btn').disabled = completed !== total && new Date().getDate() < 28;
}

async function requestPayment() {
    try {
        const response = await fetch(`${API_URL}/tasks?month=${new Date().toISOString().slice(0, 7)}`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to fetch tasks');
        }
        const tasks = await response.json();
        const earned = tasks.filter(t => t.completed).reduce((sum, t) => sum + (t.value || 0), 0);
        const bonus = tasks.every(t => t.completed) ? 500 : 0;
        const subject = `Payment Request for ${userName} - ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`;
        const body = `Tasks Completed:\n${tasks.filter(t => t.completed).map(t => `- ${t.name}: $${(t.value || 0).toFixed(2)}`).join('\n')}\nTotal: $${earned.toFixed(2)}\nBonus: $${bonus}`;
        window.location.href = `mailto:your-email@example.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        document.getElementById('payment-confirmation').style.display = 'block';
    } catch (error) {
        alert('Error preparing payment request.');
    }
}

async function confirmPayment() {
    try {
        const response = await fetch(`${API_URL}/reset`, { method: 'POST' });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to reset tasks');
        }
        alert('Payment confirmed. Tasks reset for next month.');
        document.getElementById('payment-confirmation').style.display = 'none';
        loadTasks();
    } catch (error) {
        alert(`Error resetting tasks: ${error.message}`);
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
            size: document.getElementById('task-size').value,
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
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Failed to update task');
                }
                document.getElementById('task-form').dataset.taskId = '';
            } else {
                const response = await fetch(`${API_URL}/tasks`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(task)
                });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Failed to add task');
                }
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
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to load tasks: ${response.status}`);
        }
        const tasks = await response.json();
        const sortedTasks = [...tasks].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        const taskList = document.getElementById('admin-task-list');
        taskList.innerHTML = '';
        sortedTasks.forEach(task => {
            const li = document.createElement('li');
            li.className = 'task-item';
            const taskValue = typeof task.value === 'number' ? task.value.toFixed(2) : '0.00';
            li.innerHTML = `
                <span>${task.name} ($${taskValue}, ${task.size}, ${task.month}, ${task.recurring}, Due: ${task.dueDate || 'N/A'})</span>
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
        console.error('Load admin tasks error:', error);
        alert(`Error loading tasks: ${error.message}. Please try again or contact support.`);
    }
}

async function editTask(taskId) {
    try {
        const response = await fetch(`${API_URL}/tasks/${taskId}`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to fetch task: ${response.status}`);
        }
        const task = await response.json();
        if (task.error) {
            throw new Error(task.error);
        }
        document.getElementById('task-name').value = task.name;
        document.getElementById('task-size').value = task.size;
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
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to delete task');
        }
        loadAdminTasks();
    } catch (error) {
        alert(`Error deleting task: ${error.message}`);
    }
}

function displaySubmissions(tasks) {
    const submissionList = document.getElementById('submission-list');
    submissionList.innerHTML = tasks.filter(t => t.completed).map(t => `
        <li>${t.name} by ${t.userName || 'Unknown'} ($${typeof t.value === 'number' ? t.value.toFixed(2) : '0.00'}, ${new Date(t.completedDate).toLocaleDateString()})
        ${t.picture ? `<img src="${task.picture}" class="preview-image" alt="Submission">` : ''}
        </li>
    `).join('');
}

function displayReport(tasks) {
    const earned = tasks.filter(t => t.completed).reduce((sum, t) => sum + (t.value || 0), 0);
    const bonus = tasks.every(t => t.completed) ? 500 : 0;
    document.getElementById('report-text').textContent = `Total Earned: $${earned.toFixed(2)}, Bonus: $${bonus}`;
}

function downloadReport() {
    fetch(`${API_URL}/tasks`)
        .then(res => res.json())
        .then(tasks => {
            const csv = ['Name,Size,Value,Completed,Date,Picture,DueDate'];
            tasks.forEach(t => {
                csv.push(`${t.name},${t.size},${typeof t.value === 'number' ? t.value.toFixed(2) : '0.00'},${t.completed ? 'Yes' : 'No'},${t.completedDate || ''},${t.picture || ''},${t.dueDate || ''}`);
            });
            const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'report.csv';
            a.click();
            URL.revokeObjectURL(url);
        })
        .catch(error => alert(`Error downloading report: ${error.message}`));
}

// Theme Toggle
function initThemeToggle() {
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'theme-toggle';
    toggleBtn.textContent = 'Toggle Dark Mode';
    if (document.body.classList.contains('index-page')) {
        const dashboard = document.getElementById('dashboard');
        dashboard.appendChild(toggleBtn);
    } else {
        document.body.appendChild(toggleBtn);
    }
    toggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    });
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
    }
}