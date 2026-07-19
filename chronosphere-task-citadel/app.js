document.addEventListener('DOMContentLoaded', () => {
    const taskManager = new TaskManager();
    const engine = new CitadelEngine('citadel-canvas');

    // UI Elements
    const taskInput = document.getElementById('task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskList = document.getElementById('task-list');

    const resourceCountEl = document.getElementById('resource-count');
    const citadelLevelEl = document.getElementById('citadel-level');
    const upgradeBtn = document.getElementById('upgrade-btn');
    const upgradeCostEl = document.getElementById('upgrade-cost');

    // Link Systems
    taskManager.onTaskComplete = (reward) => {
        engine.addResources(reward);
        updateHUD();
    };

    taskManager.onListUpdate = renderTasks;

    // Initialization
    updateHUD();
    renderTasks();

    // Event Listeners
    addTaskBtn.addEventListener('click', () => {
        taskManager.addTask(taskInput.value);
        taskInput.value = '';
    });

    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            taskManager.addTask(taskInput.value);
            taskInput.value = '';
        }
    });

    upgradeBtn.addEventListener('click', () => {
        if (engine.upgrade()) {
            updateHUD();
        }
    });

    // Functions
    function updateHUD() {
        resourceCountEl.textContent = engine.resources;
        citadelLevelEl.textContent = engine.level;

        const cost = engine.getUpgradeCost();
        upgradeCostEl.textContent = cost;

        if (engine.resources >= cost) {
            upgradeBtn.disabled = false;
        } else {
            upgradeBtn.disabled = true;
        }
    }

    function renderTasks() {
        taskList.innerHTML = '';
        const tasks = taskManager.getTasks();

        tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''}`;

            const textSpan = document.createElement('span');
            textSpan.textContent = `${task.text} [Reward: ${task.reward}]`;

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'task-actions';

            if (!task.completed) {
                const completeBtn = document.createElement('button');
                completeBtn.className = 'complete-btn';
                completeBtn.textContent = 'Complete';
                completeBtn.onclick = () => taskManager.completeTask(task.id);
                actionsDiv.appendChild(completeBtn);
            }

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = 'Delete';
            deleteBtn.onclick = () => taskManager.deleteTask(task.id);
            actionsDiv.appendChild(deleteBtn);

            li.appendChild(textSpan);
            li.appendChild(actionsDiv);
            taskList.appendChild(li);
        });
    }
});
