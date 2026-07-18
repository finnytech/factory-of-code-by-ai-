const canvas = document.getElementById('simulation-canvas');
const ctx = canvas.getContext('2d');
const uiGenCount = document.getElementById('gen-count');
const uiAliveCount = document.getElementById('alive-count');
const uiMaxFitness = document.getElementById('max-fitness');
const btnPause = document.getElementById('btn-pause');
const btnReset = document.getElementById('btn-reset');

let width, height;
let isPaused = false;
let animationId;

// Simulation parameters
const POPULATION_SIZE = 150;
const LIFESPAN = 400; // frames
const MUTATION_RATE = 0.01;

let population = [];
let generation = 1;
let lifeTimer = 0;
let maxFitnessOverall = 0;

// Target
let target = { x: 0, y: 0, radius: 20 };
let obstacles = [];

function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    target.x = width / 2;
    target.y = 50;

    // Create some obstacles
    obstacles = [
        { x: width/2 - 150, y: height/2, w: 300, h: 20 },
        { x: width/2 - 300, y: height/3, w: 200, h: 20 },
        { x: width/2 + 100, y: height/3 * 2, w: 200, h: 20 }
    ];
}

window.addEventListener('resize', resizeCanvas);

// Vector Math
class Vector {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    add(v) { this.x += v.x; this.y += v.y; }
    limit(max) {
        const mSq = this.magSq();
        if (mSq > max * max) {
            this.setMag(max);
        }
    }
    magSq() { return this.x * this.x + this.y * this.y; }
    setMag(n) {
        let m = Math.sqrt(this.magSq());
        if (m !== 0) {
            this.x = (this.x / m) * n;
            this.y = (this.y / m) * n;
        }
    }
    static random2D() {
        const angle = Math.random() * Math.PI * 2;
        return new Vector(Math.cos(angle), Math.sin(angle));
    }
}

// DNA
class DNA {
    constructor(genes) {
        if (genes) {
            this.genes = genes;
        } else {
            this.genes = [];
            for (let i = 0; i < LIFESPAN; i++) {
                let v = Vector.random2D();
                v.setMag(0.5); // max force
                this.genes.push(v);
            }
        }
    }

    crossover(partner) {
        let newgenes = [];
        let mid = Math.floor(Math.random() * this.genes.length);
        for (let i = 0; i < this.genes.length; i++) {
            if (i > mid) newgenes[i] = this.genes[i];
            else newgenes[i] = partner.genes[i];
        }
        return new DNA(newgenes);
    }

    mutate() {
        for (let i = 0; i < this.genes.length; i++) {
            if (Math.random() < MUTATION_RATE) {
                let v = Vector.random2D();
                v.setMag(0.5);
                this.genes[i] = v;
            }
        }
    }
}

// Organism
class Organism {
    constructor(dna) {
        this.pos = new Vector(width / 2, height - 50);
        this.vel = new Vector(0, 0);
        this.acc = new Vector(0, 0);
        this.dna = dna || new DNA();
        this.fitness = 0;
        this.dead = false;
        this.reachedTarget = false;
    }

    applyForce(force) {
        this.acc.add(force);
    }

    update() {
        if (!this.dead && !this.reachedTarget) {
            this.applyForce(this.dna.genes[lifeTimer]);
            this.vel.add(this.acc);
            this.vel.limit(5); // max speed
            this.pos.add(this.vel);
            this.acc = new Vector(0, 0); // reset acceleration

            // Check borders
            if (this.pos.x < 0 || this.pos.x > width || this.pos.y < 0 || this.pos.y > height) {
                this.dead = true;
            }

            // Check obstacles
            for (let obs of obstacles) {
                if (this.pos.x > obs.x && this.pos.x < obs.x + obs.w &&
                    this.pos.y > obs.y && this.pos.y < obs.y + obs.h) {
                    this.dead = true;
                }
            }

            // Check target
            let dx = this.pos.x - target.x;
            let dy = this.pos.y - target.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < target.radius) {
                this.reachedTarget = true;
            }
        }
    }

    calcFitness() {
        let dx = this.pos.x - target.x;
        let dy = this.pos.y - target.y;
        let dist = Math.sqrt(dx*dx + dy*dy);
        this.fitness = Math.pow(1 / (dist + 1), 2); // closer is better
        if (this.reachedTarget) this.fitness *= 10;
        if (this.dead) this.fitness *= 0.1;
    }

    draw() {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.fillStyle = this.reachedTarget ? '#0f0' : (this.dead ? '#f00' : '#0aa');
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function initPopulation() {
    population = [];
    for (let i = 0; i < POPULATION_SIZE; i++) {
        population.push(new Organism());
    }
}

function evaluate() {
    let maxFit = 0;
    for (let i = 0; i < POPULATION_SIZE; i++) {
        population[i].calcFitness();
        if (population[i].fitness > maxFit) {
            maxFit = population[i].fitness;
        }
    }
    if (maxFit > maxFitnessOverall) maxFitnessOverall = maxFit;

    uiMaxFitness.textContent = maxFit.toExponential(2);

    // Normalize
    for (let i = 0; i < POPULATION_SIZE; i++) {
        population[i].fitness /= maxFit;
    }

    // Mating pool
    let matingPool = [];
    for (let i = 0; i < POPULATION_SIZE; i++) {
        let n = population[i].fitness * 100;
        for (let j = 0; j < n; j++) {
            matingPool.push(population[i]);
        }
    }

    // New generation
    let newPopulation = [];
    for (let i = 0; i < POPULATION_SIZE; i++) {
        // Fallback if pool is empty
        if (matingPool.length === 0) {
           newPopulation.push(new Organism());
           continue;
        }
        let a = Math.floor(Math.random() * matingPool.length);
        let b = Math.floor(Math.random() * matingPool.length);
        let partnerA = matingPool[a].dna;
        let partnerB = matingPool[b].dna;

        let childDNA = partnerA.crossover(partnerB);
        childDNA.mutate();

        newPopulation.push(new Organism(childDNA));
    }
    population = newPopulation;
    generation++;
    uiGenCount.textContent = generation;
}

function drawScene() {
    ctx.clearRect(0, 0, width, height);

    // Draw Target
    ctx.fillStyle = '#0f0';
    ctx.beginPath();
    ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw Obstacles
    ctx.fillStyle = '#555';
    for (let obs of obstacles) {
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
    }
}

function loop() {
    if (isPaused) {
        animationId = requestAnimationFrame(loop);
        return;
    }

    drawScene();

    let alive = 0;
    for (let i = 0; i < POPULATION_SIZE; i++) {
        population[i].update();
        population[i].draw();
        if (!population[i].dead && !population[i].reachedTarget) alive++;
    }
    uiAliveCount.textContent = alive;

    lifeTimer++;
    if (lifeTimer >= LIFESPAN || alive === 0) {
        evaluate();
        lifeTimer = 0;
    }

    animationId = requestAnimationFrame(loop);
}

btnPause.addEventListener('click', () => {
    isPaused = !isPaused;
    btnPause.textContent = isPaused ? 'Resume' : 'Pause';
});

btnReset.addEventListener('click', () => {
    generation = 1;
    lifeTimer = 0;
    maxFitnessOverall = 0;
    uiGenCount.textContent = generation;
    uiMaxFitness.textContent = 0;
    initPopulation();
});

// Setup
resizeCanvas();
initPopulation();
loop();
