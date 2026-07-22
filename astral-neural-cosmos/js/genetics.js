/**
 * Astral Neural Cosmos - Neuro-Genetic AI Engine
 * Multi-layer Perceptron (MLP) Neural Networks & Evolutionary Genetic Algorithms.
 */

if (typeof require !== 'undefined') {
  const engineModule = require('./engine.js');
  var Vector2D = Vector2D || engineModule.Vector2D;
  var Rectangle = Rectangle || engineModule.Rectangle;
  var ResourceNode = ResourceNode || engineModule.ResourceNode;
}

class NeuralNetwork {
  constructor(inputNodes, hiddenNodes, outputNodes, weights = null) {
    this.inputNodes = inputNodes;
    this.hiddenNodes = hiddenNodes;
    this.outputNodes = outputNodes;

    if (weights) {
      this.weightsIH = weights.ih;
      this.weightsHO = weights.ho;
      this.biasH = weights.bh;
      this.biasO = weights.bo;
    } else {
      this.weightsIH = this.randomMatrix(hiddenNodes, inputNodes);
      this.weightsHO = this.randomMatrix(outputNodes, hiddenNodes);
      this.biasH = this.randomArray(hiddenNodes);
      this.biasO = this.randomArray(outputNodes);
    }
  }

  randomMatrix(rows, cols) {
    const matrix = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        row.push((Math.random() * 2 - 1)); // -1 to 1
      }
      matrix.push(row);
    }
    return matrix;
  }

  randomArray(length) {
    const arr = [];
    for (let i = 0; i < length; i++) {
      arr.push(Math.random() * 2 - 1);
    }
    return arr;
  }

  sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
  }

  tanh(x) {
    return Math.tanh(x);
  }

  predict(inputs) {
    // Hidden layer activations
    const hidden = [];
    for (let h = 0; h < this.hiddenNodes; h++) {
      let sum = this.biasH[h];
      for (let i = 0; i < this.inputNodes; i++) {
        sum += inputs[i] * this.weightsIH[h][i];
      }
      hidden.push(this.tanh(sum));
    }

    // Output layer activations
    const outputs = [];
    for (let o = 0; o < this.outputNodes; o++) {
      let sum = this.biasO[o];
      for (let h = 0; h < this.hiddenNodes; h++) {
        sum += hidden[h] * this.weightsHO[o][h];
      }
      outputs.push(this.tanh(sum));
    }

    return outputs;
  }

  mutate(rate = 0.05, amount = 0.2) {
    const mutateVal = (v) => (Math.random() < rate ? v + (Math.random() * 2 - 1) * amount : v);

    for (let r = 0; r < this.hiddenNodes; r++) {
      for (let c = 0; c < this.inputNodes; c++) {
        this.weightsIH[r][c] = Math.max(-2, Math.min(2, mutateVal(this.weightsIH[r][c])));
      }
      this.biasH[r] = Math.max(-2, Math.min(2, mutateVal(this.biasH[r])));
    }

    for (let r = 0; r < this.outputNodes; r++) {
      for (let c = 0; c < this.hiddenNodes; c++) {
        this.weightsHO[r][c] = Math.max(-2, Math.min(2, mutateVal(this.weightsHO[r][c])));
      }
      this.biasO[r] = Math.max(-2, Math.min(2, mutateVal(this.biasO[r])));
    }
  }

  copy() {
    const copyWeights = {
      ih: this.weightsIH.map(row => [...row]),
      ho: this.weightsHO.map(row => [...row]),
      bh: [...this.biasH],
      bo: [...this.biasO]
    };
    return new NeuralNetwork(this.inputNodes, this.hiddenNodes, this.outputNodes, copyWeights);
  }
}

class Agent {
  constructor(x, y, brain = null, generation = 1) {
    this.pos = new Vector2D(x, y);
    this.vel = new Vector2D((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2);
    this.acc = new Vector2D(0, 0);

    this.maxSpeed = 4.0;
    this.maxForce = 0.2;
    this.size = 8;

    this.energy = 100;
    this.maxEnergy = 200;
    this.age = 0;
    this.generation = generation;
    this.fitness = 0;
    this.color = `hsl(${(generation * 40) % 360}, 85%, 60%)`;
    this.signal = 0;

    // Brain: 8 Inputs -> 6 Hidden -> 3 Outputs
    // Inputs: [vel.x, vel.y, dist_to_res, angle_to_res, dist_to_star, angle_to_star, current_energy, nearest_agent_dist]
    // Outputs: [thrust, steering, harvest_or_signal]
    this.brain = brain || new NeuralNetwork(8, 6, 3);
  }

  senseAndAct(engine, agents) {
    // Find nearest resource node via QuadTree query
    const sensorRange = 250;
    const searchArea = new Rectangle(this.pos.x, this.pos.y, sensorRange, sensorRange);
    const nearby = engine.quadTree ? engine.quadTree.query(searchArea) : [];

    let nearestRes = null;
    let minDistRes = Infinity;
    let nearestAgent = null;
    let minDistAgent = Infinity;

    for (const item of nearby) {
      if (item === this) continue;
      const d = this.pos.dist(item.pos || item);
      if (item instanceof ResourceNode || item.type?.includes('starlight')) {
        if (d < minDistRes) {
          minDistRes = d;
          nearestRes = item;
        }
      } else if (item instanceof Agent) {
        if (d < minDistAgent) {
          minDistAgent = d;
          nearestAgent = item;
        }
      }
    }

    // Nearest celestial body
    let nearestBody = engine.celestialBodies[0];
    let minDistBody = this.pos.dist(nearestBody.pos);

    // Normalize sensor values (-1 to 1)
    const inputs = [
      this.vel.x / this.maxSpeed,
      this.vel.y / this.maxSpeed,
      nearestRes ? Math.min(minDistRes / sensorRange, 1) : 1,
      nearestRes ? Math.atan2(nearestRes.pos.y - this.pos.y, nearestRes.pos.x - this.pos.x) / Math.PI : 0,
      Math.min(minDistBody / 500, 1),
      Math.atan2(nearestBody.pos.y - this.pos.y, nearestBody.pos.x - this.pos.x) / Math.PI,
      (this.energy / this.maxEnergy) * 2 - 1,
      nearestAgent ? Math.min(minDistAgent / sensorRange, 1) : 1
    ];

    const outputs = this.brain.predict(inputs);

    // Output 0: Thrust power
    const thrustVal = (outputs[0] + 1) / 2; // 0 to 1
    // Output 1: Steering angle change
    const steerAngle = outputs[1] * Math.PI; // -PI to PI
    // Output 2: Action / Signal
    this.signal = outputs[2]; // -1 to 1

    // Apply thrust & steering forces
    const heading = this.vel.heading() + steerAngle * 0.1;
    const force = new Vector2D(Math.cos(heading), Math.sin(heading)).mult(thrustVal * this.maxForce);
    this.acc.add(force);

    // Energy consumption
    this.energy -= 0.08 + thrustVal * 0.05;
    this.age += 1;
    this.fitness += 0.2 + (this.energy > 50 ? 0.1 : 0);

    // Check resource consumption
    if (nearestRes && minDistRes < this.size + nearestRes.radius) {
      const harvestAmount = Math.min(nearestRes.energy, 15);
      nearestRes.energy -= harvestAmount;
      this.energy = Math.min(this.maxEnergy, this.energy + harvestAmount * 1.2);
      this.fitness += harvestAmount * 2;
    }

    // Check collision/gravitational pull with celestial bodies
    for (const body of engine.celestialBodies) {
      const g = body.calculateGravity(this.pos);
      this.acc.add(g);

      if (this.pos.dist(body.pos) < body.radius) {
        this.energy -= 5; // Damage near star/black hole core
      }
    }
  }

  update(width, height) {
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.set(0, 0);

    // Screen wrap-around boundaries
    if (this.pos.x < 0) this.pos.x = width;
    if (this.pos.x > width) this.pos.x = 0;
    if (this.pos.y < 0) this.pos.y = height;
    if (this.pos.y > height) this.pos.y = 0;
  }

  canReproduce() {
    return this.energy >= 160 && this.age > 80;
  }

  reproduce() {
    this.energy -= 70;
    const childBrain = this.brain.copy();
    childBrain.mutate(0.08, 0.25);
    const child = new Agent(
      this.pos.x + (Math.random() * 20 - 10),
      this.pos.y + (Math.random() * 20 - 10),
      childBrain,
      this.generation + 1
    );
    return child;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NeuralNetwork, Agent };
}
