const assert = require('assert');

// Mock localStorage for Node environment
global.localStorage = {
    store: {},
    getItem(key) { return this.store[key] || null; },
    setItem(key, value) { this.store[key] = value; },
    removeItem(key) { delete this.store[key]; }
};

const TaskManager = require('./tasks.js');

console.log("Starting Chronosphere Task Citadel Logic Tests...");

const tm = new TaskManager();

// Test 1: Add a task
const newTask = tm.addTask("Defeat the Dragon");
assert(newTask, "Task should be returned");
assert.strictEqual(newTask.text, "Defeat the Dragon");
assert.strictEqual(newTask.completed, false);
assert(newTask.reward >= 5 && newTask.reward <= 9, "Reward should be between 5 and 9");
assert.strictEqual(tm.getTasks().length, 1);
console.log("✓ Add Task passed");

// Test 2: Complete a task
let rewardReceived = 0;
tm.onTaskComplete = (r) => { rewardReceived = r; };
const completedTask = tm.completeTask(newTask.id);
assert.strictEqual(completedTask.completed, true);
assert.strictEqual(rewardReceived, newTask.reward, "Reward should be passed to callback");
console.log("✓ Complete Task passed");

// Test 3: Delete a task
tm.deleteTask(newTask.id);
assert.strictEqual(tm.getTasks().length, 0);
console.log("✓ Delete Task passed");

console.log("All logic tests passed successfully!");
