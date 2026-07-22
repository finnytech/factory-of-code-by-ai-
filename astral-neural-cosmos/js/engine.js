/**
 * Astral Neural Cosmos - Physics & Spatial Simulation Engine
 * High-performance 2D spatial partitioning (QuadTree), vector math, and cosmic environmental forces.
 */

class Vector2D {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  mult(n) {
    this.x *= n;
    this.y *= n;
    return this;
  }

  div(n) {
    if (n !== 0) {
      this.x /= n;
      this.y /= n;
    }
    return this;
  }

  magSq() {
    return this.x * this.x + this.y * this.y;
  }

  mag() {
    return Math.sqrt(this.magSq());
  }

  heading() {
    return Math.atan2(this.y, this.x);
  }

  normalize() {
    const m = this.mag();
    if (m !== 0) this.div(m);
    return this;
  }

  limit(max) {
    const mSq = this.magSq();
    if (mSq > max * max) {
      this.div(Math.sqrt(mSq)).mult(max);
    }
    return this;
  }

  dist(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  copy() {
    return new Vector2D(this.x, this.y);
  }
}

class Rectangle {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  contains(point) {
    return (
      point.x >= this.x - this.w &&
      point.x <= this.x + this.w &&
      point.y >= this.y - this.h &&
      point.y <= this.y + this.h
    );
  }

  intersects(range) {
    return !(
      range.x - range.w > this.x + this.w ||
      range.x + range.w < this.x - this.w ||
      range.y - range.h > this.y + this.h ||
      range.y + range.h < this.y - this.h
    );
  }
}

class QuadTree {
  constructor(boundary, capacity = 4) {
    this.boundary = boundary;
    this.capacity = capacity;
    this.points = [];
    this.divided = false;
  }

  subdivide() {
    const { x, y, w, h } = this.boundary;
    const nw = new Rectangle(x - w / 2, y - h / 2, w / 2, h / 2);
    const ne = new Rectangle(x + w / 2, y - h / 2, w / 2, h / 2);
    const sw = new Rectangle(x - w / 2, y + h / 2, w / 2, h / 2);
    const se = new Rectangle(x + w / 2, y + h / 2, w / 2, h / 2);

    this.northwest = new QuadTree(nw, this.capacity);
    this.northeast = new QuadTree(ne, this.capacity);
    this.southwest = new QuadTree(sw, this.capacity);
    this.southeast = new QuadTree(se, this.capacity);

    this.divided = true;
  }

  insert(point) {
    if (!this.boundary.contains(point.pos || point)) {
      return false;
    }

    if (this.points.length < this.capacity) {
      this.points.push(point);
      return true;
    }

    if (!this.divided) {
      this.subdivide();
    }

    return (
      this.northwest.insert(point) ||
      this.northeast.insert(point) ||
      this.southwest.insert(point) ||
      this.southeast.insert(point)
    );
  }

  query(range, found = []) {
    if (!this.boundary.intersects(range)) {
      return found;
    }

    for (const p of this.points) {
      const pos = p.pos || p;
      if (range.contains(pos)) {
        found.push(p);
      }
    }

    if (this.divided) {
      this.northwest.query(range, found);
      this.northeast.query(range, found);
      this.southwest.query(range, found);
      this.southeast.query(range, found);
    }

    return found;
  }
}

class ResourceNode {
  constructor(x, y, type = 'starlight_cluster') {
    this.pos = new Vector2D(x, y);
    this.type = type; // 'starlight_cluster', 'dark_matter', 'cosmic_crystal'
    this.energy = 100;
    this.maxEnergy = 100;
    this.radius = 12;
    this.pulsePhase = Math.random() * Math.PI * 2;
  }

  update() {
    this.pulsePhase += 0.05;
    // Slow natural regeneration
    if (this.energy < this.maxEnergy) {
      this.energy = Math.min(this.maxEnergy, this.energy + 0.1);
    }
  }
}

class CelestialBody {
  constructor(x, y, mass, type = 'star') {
    this.pos = new Vector2D(x, y);
    this.mass = mass;
    this.type = type; // 'star', 'black_hole', 'pulsar'
    this.radius = Math.max(15, Math.min(45, mass * 0.3));
    this.angle = 0;
  }

  update() {
    this.angle += 0.01;
  }

  calculateGravity(pos) {
    const d = this.pos.dist(pos);
    if (d < 5 || d > 600) return new Vector2D(0, 0);
    const force = (0.5 * this.mass) / (d * d);
    const dir = this.pos.copy().sub(pos).normalize();
    return dir.mult(force);
  }
}

class PhysicsEngine {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.gravityConstant = 0.8;
    this.friction = 0.99;
    this.celestialBodies = [];
    this.resources = [];
    this.quadTree = null;
    this.initEnvironment();
  }

  initEnvironment() {
    // Add central gravitational star
    this.celestialBodies.push(new CelestialBody(this.width / 2, this.height / 2, 80, 'star'));
    
    // Add planetary bodies
    this.celestialBodies.push(new CelestialBody(this.width * 0.25, this.height * 0.3, 40, 'pulsar'));
    this.celestialBodies.push(new CelestialBody(this.width * 0.75, this.height * 0.7, 40, 'pulsar'));

    // Populate initial resources
    this.spawnResources(30);
  }

  spawnResources(count) {
    const types = ['starlight_cluster', 'dark_matter', 'cosmic_crystal'];
    for (let i = 0; i < count; i++) {
      const x = Math.random() * (this.width - 100) + 50;
      const y = Math.random() * (this.height - 100) + 50;
      const type = types[Math.floor(Math.random() * types.length)];
      this.resources.push(new ResourceNode(x, y, type));
    }
  }

  buildQuadTree(agents = []) {
    const boundary = new Rectangle(this.width / 2, this.height / 2, this.width / 2, this.height / 2);
    this.quadTree = new QuadTree(boundary, 4);

    for (const res of this.resources) {
      this.quadTree.insert(res);
    }
    for (const agent of agents) {
      this.quadTree.insert(agent);
    }
  }

  update(agents = []) {
    this.buildQuadTree(agents);

    // Update resources
    for (let i = this.resources.length - 1; i >= 0; i--) {
      const res = this.resources[i];
      res.update();
      if (res.energy <= 0) {
        this.resources.splice(i, 1);
      }
    }

    // Maintain minimum resource density
    if (this.resources.length < 25) {
      this.spawnResources(5);
    }

    // Update celestial bodies
    for (const body of this.celestialBodies) {
      body.update();
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Vector2D, Rectangle, QuadTree, ResourceNode, CelestialBody, PhysicsEngine };
}
