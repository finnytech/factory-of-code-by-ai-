/**
 * Astral Neural Cosmos - Automated Verification Test Suite
 * Executable under Node.js or in browser context.
 */

const path = require('path');

// Load module dependencies if in Node.js environment
const { Vector2D, Rectangle, QuadTree, ResourceNode, CelestialBody, PhysicsEngine } = require('../js/engine.js');
const { NeuralNetwork, Agent } = require('../js/genetics.js');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failCount++;
  }
}

console.log('==================================================');
console.log(' Running Astral Neural Cosmos Automated Test Suite');
console.log('==================================================\n');

// 1. Test Vector2D Math
console.log('1. Testing Vector2D Operations:');
const v1 = new Vector2D(3, 4);
assert(v1.mag() === 5, 'Vector magnitude calculation (3, 4 -> 5)');
v1.normalize();
assert(Math.abs(v1.mag() - 1.0) < 0.0001, 'Vector normalization (mag -> 1.0)');

// 2. Test QuadTree Spatial Query
console.log('\n2. Testing QuadTree Spatial Partitioning:');
const boundary = new Rectangle(500, 500, 500, 500);
const qt = new QuadTree(boundary, 4);
qt.insert(new Vector2D(100, 100));
qt.insert(new Vector2D(105, 105));
qt.insert(new Vector2D(900, 900));

const searchBox = new Rectangle(100, 100, 50, 50);
const results = qt.query(searchBox);
assert(results.length === 2, `QuadTree query returned ${results.length} points (expected 2)`);

// 3. Test Neural Network Feedforward & Mutation
console.log('\n3. Testing Neural Network AI Engine:');
const nn = new NeuralNetwork(8, 6, 3);
const dummyInputs = [0.5, -0.2, 0.8, 0.1, -0.5, 0.9, 0.0, 0.3];
const outputs = nn.predict(dummyInputs);
assert(outputs.length === 3, 'Neural network output dimension is 3');
assert(outputs.every(v => v >= -1 && v <= 1), 'Neural network output activations are bounded in [-1, 1]');

const originalWeight = nn.weightsIH[0][0];
nn.mutate(1.0, 0.5); // Force mutation
assert(nn.weightsIH[0][0] !== originalWeight, 'Neural network weight mutated successfully');

// 4. Test Agent Life Cycle & Reproduction
console.log('\n4. Testing Agent Life Cycle:');
const agent = new Agent(200, 200);
agent.energy = 180;
agent.age = 100;
assert(agent.canReproduce() === true, 'Agent can reproduce when energy >= 160 and age > 80');

const child = agent.reproduce();
assert(child.generation === 2, 'Offspring generation incremented to 2');
assert(agent.energy === 110, 'Reproduction deducted energy correctly');

// 5. Test Physics Engine Integration
console.log('\n5. Testing Physics Engine Integration:');
const phys = new PhysicsEngine(1000, 1000);
assert(phys.celestialBodies.length > 0, 'Celestial bodies initialized');
assert(phys.resources.length === 30, 'Initial resource nodes populated (30 nodes)');

phys.update([agent, child]);
assert(phys.quadTree !== null, 'QuadTree rebuilt successfully during engine update');

console.log('\n==================================================');
console.log(` Test Summary: ${passCount} Passed, ${failCount} Failed.`);
console.log('==================================================');

if (failCount > 0) {
  process.exit(1);
}
