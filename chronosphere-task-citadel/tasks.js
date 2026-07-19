class TaskManager {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('chronosphere_tasks')) || [];
        this.onTaskComplete = null; // Callback for when a task is finished
        this.onListUpdate = null;   // Callback for UI updates
    }

    save() {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('chronosphere_tasks', JSON.stringify(this.tasks));
        }
        if (this.onListUpdate) this.onListUpdate();
    }

    addTask(text) {
        if (!text.trim()) return;
        const task = {
            id: Date.now().toString(),
            text: text,
            completed: false,
            reward: Math.floor(Math.random() * 5) + 5 // 5 to 9 resources
        };
        this.tasks.push(task);
        this.save();
        return task;
    }

    completeTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task && !task.completed) {
            task.completed = true;
            this.save();
            if (this.onTaskComplete) {
                this.onTaskComplete(task.reward);
            }
            return task;
        }
        return null;
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.save();
    }

    getTasks() {
        return this.tasks;
    }
}

// Export for testing in Node environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TaskManager;
}
