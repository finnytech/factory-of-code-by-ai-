// CHEMICAL DIFFUSION GRID
class ChemicalGrid {
    constructor(width, height, cols, rows) {
        this.width = width;
        this.height = height;
        this.cols = cols;
        this.rows = rows;
        this.cellWidth = width / cols;
        this.cellHeight = height / rows;
        
        this.attractant = new Float32Array(cols * rows);
        this.repellent = new Float32Array(cols * rows);
        this.temp = new Float32Array(cols * rows);
        
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = cols;
        this.offscreenCanvas.height = rows;
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');
        this.imageData = this.offscreenCtx.createImageData(cols, rows);
    }
    
    update() {
        this.diffuse(this.attractant, 0.22, 0.94);
        this.diffuse(this.repellent, 0.22, 0.94);
    }
    
    diffuse(grid, rate, decay) {
        const cols = this.cols;
        const rows = this.rows;
        
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const idx = y * cols + x;
                let sum = 0;
                let count = 0;
                
                for (let dy = -1; dy <= 1; dy++) {
                    const ny = y + dy;
                    if (ny < 0 || ny >= rows) continue;
                    
                    const rowOffset = ny * cols;
                    for (let dx = -1; dx <= 1; dx++) {
                        const nx = x + dx;
                        if (nx >= 0 && nx < cols) {
                            sum += grid[rowOffset + nx];
                            count++;
                        }
                    }
                }
                
                this.temp[idx] = (grid[idx] * (1 - rate) + (sum / count) * rate) * decay;
            }
        }
        
        grid.set(this.temp);
    }
    
    addVal(x, y, type, amount) {
        const col = Math.floor(Math.max(0, Math.min(this.width - 1, x)) / this.cellWidth);
        const row = Math.floor(Math.max(0, Math.min(this.height - 1, y)) / this.cellHeight);
        const idx = row * this.cols + col;
        
        if (type === 'attractant') {
            this.attractant[idx] = Math.min(15.0, this.attractant[idx] + amount);
        } else {
            this.repellent[idx] = Math.min(15.0, this.repellent[idx] + amount);
        }
    }
    
    getVal(x, y, type) {
        const col = Math.floor(Math.max(0, Math.min(this.width - 1, x)) / this.cellWidth);
        const row = Math.floor(Math.max(0, Math.min(this.height - 1, y)) / this.cellHeight);
        const idx = row * this.cols + col;
        return type === 'attractant' ? this.attractant[idx] : this.repellent[idx];
    }
    
    clear() {
        this.attractant.fill(0);
        this.repellent.fill(0);
    }
    
    draw(ctx) {
        const data = this.imageData.data;
        const totalCells = this.cols * this.rows;
        
        for (let i = 0; i < totalCells; i++) {
            const attrVal = Math.floor(Math.min(255, this.attractant[i] * 90));
            const repVal = Math.floor(Math.min(255, this.repellent[i] * 90));
            
            const pxIdx = i * 4;
            data[pxIdx] = repVal;                      // Red = repellent
            data[pxIdx + 1] = Math.floor((attrVal + repVal) * 0.1); 
            data[pxIdx + 2] = attrVal;                 // Blue = attractant
            data[pxIdx + 3] = Math.max(attrVal, repVal) * 0.25; 
        }
        
        this.offscreenCtx.putImageData(this.imageData, 0, 0);
        
        const imageSmoothingEnabled = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(this.offscreenCanvas, 0, 0, this.width, this.height);
        ctx.imageSmoothingEnabled = imageSmoothingEnabled;
    }
}

// OBSTACLE COLLISION HELPER
function resolveObstacleCollision(entity, obstacles) {
    if (!obstacles || obstacles.length === 0) return;
    for (let obs of obstacles) {
        const d = Math.hypot(entity.x - obs.x, entity.y - obs.y);
        const minDist = entity.radius + obs.r;
        if (d < minDist) {
            const nx = (entity.x - obs.x) / (d || 1);
            const ny = (entity.y - obs.y) / (d || 1);
            
            entity.x = obs.x + nx * minDist;
            
            const dot = entity.vx * nx + entity.vy * ny;
            entity.vx = (entity.vx - 2 * dot * nx) * 0.75;
            entity.vy = (entity.vy - 2 * dot * ny) * 0.75;
        }
    }
}

// FOOD / NUTRIENT CLASS
class Food {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 3;
        this.energy = 45;
        this.eaten = false;
    }
    
    update(grid) {
        grid.addVal(this.x, this.y, 'attractant', 0.2);
    }
    
    draw(ctx) {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#0055ff';
        ctx.fillStyle = '#00aeff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// PATHOGEN CLASS (With Standard vs Goliath specialization)
class Pathogen {
    constructor(x, y, dna = null, type = 'standard') {
        this.x = x;
        this.y = y;
        this.type = type;
        
        // Genes
        this.dna = dna ?? {
            maxSpeed: type === 'goliath' ? 0.95 : 1.6,
            radius: type === 'goliath' ? 14 : 6,
            mutationRate: 0.15
        };
        
        this.radius = this.dna.radius;
        this.maxSpeed = this.dna.maxSpeed;
        
        this.vx = (Math.random() - 0.5) * this.maxSpeed;
        this.vy = (Math.random() - 0.5) * this.maxSpeed;
        this.energy = type === 'goliath' ? 300 : 100;
        this.infectCooldown = 0;
    }
    
    update(grid, width, height, healthyCells, obstacles, triggerAudioCallback) {
        // Emit toxin chemical repellent (Goliaths emit much higher amounts)
        if (this.type === 'goliath') {
            grid.addVal(this.x, this.y, 'repellent', 0.85);
            this.energy -= 0.22; // higher metabolic cost
        } else {
            grid.addVal(this.x, this.y, 'repellent', 0.35);
            this.energy -= 0.14;
        }
        
        if (this.infectCooldown > 0) this.infectCooldown--;
        
        let target = null;
        let minDist = 180;
        
        for (let cell of healthyCells) {
            const d = Math.hypot(cell.x - this.x, cell.y - this.y);
            if (d < minDist) {
                minDist = d;
                target = cell;
            }
        }
        
        if (target) {
            let tx = target.x - this.x;
            let ty = target.y - this.y;
            const dist = Math.hypot(tx, ty);
            tx = (tx / dist) * this.maxSpeed;
            ty = (ty / dist) * this.maxSpeed;
            
            this.vx = this.vx * 0.93 + tx * 0.07;
            this.vy = this.vy * 0.93 + ty * 0.07;
        } else {
            this.vx += (Math.random() - 0.5) * 0.4;
            this.vy += (Math.random() - 0.5) * 0.4;
            const speed = Math.hypot(this.vx, this.vy);
            if (speed > this.maxSpeed) {
                this.vx = (this.vx / speed) * this.maxSpeed;
                this.vy = (this.vy / speed) * this.maxSpeed;
            }
        }
        
        this.x += this.vx;
        this.y += this.vy;
        
        resolveObstacleCollision(this, obstacles);
        
        // Boundaries
        if (this.x < this.radius) { this.x = this.radius; this.vx *= -1; }
        if (this.x > width - this.radius) { this.x = width - this.radius; this.vx *= -1; }
        if (this.y < this.radius) { this.y = this.radius; this.vy *= -1; }
        if (this.y > height - this.radius) { this.y = height - this.radius; this.vy *= -1; }
        
        if (this.infectCooldown === 0) {
            for (let cell of healthyCells) {
                if (Math.hypot(cell.x - this.x, cell.y - this.y) < (this.radius + cell.radius)) {
                    cell.energy -= this.type === 'goliath' ? 65 : 40;
                    this.energy += this.type === 'goliath' ? 50 : 35;
                    this.infectCooldown = this.type === 'goliath' ? 30 : 40;
                    if (triggerAudioCallback) triggerAudioCallback('infect');
                    break;
                }
            }
        }
    }
    
    reproduce() {
        const threshold = this.type === 'goliath' ? 480 : 200;
        if (this.energy > threshold) {
            this.energy *= 0.48; // split energy
            
            const mutateVal = (val, rate) => {
                const modifier = 1 + (Math.random() - 0.5) * 2 * rate;
                return val * modifier;
            };
            
            const mr = this.dna.mutationRate;
            // 6% chance of standard pathogen mutating into a Goliath
            const childType = (this.type === 'goliath' || Math.random() < 0.06) ? 'goliath' : 'standard';
            
            const childDna = {
                maxSpeed: childType === 'goliath' 
                    ? Math.max(0.6, Math.min(1.4, mutateVal(this.dna.maxSpeed, mr)))
                    : Math.max(0.8, Math.min(3.5, mutateVal(this.dna.maxSpeed, mr))),
                radius: childType === 'goliath'
                    ? Math.max(12, Math.min(17, mutateVal(this.dna.radius, mr)))
                    : Math.max(3.5, Math.min(11, mutateVal(this.dna.radius, mr))),
                mutationRate: this.dna.mutationRate
            };
            
            const offset = this.radius * 2.5;
            const angle = Math.random() * Math.PI * 2;
            const cx = this.x + Math.cos(angle) * offset;
            const cy = this.y + Math.sin(angle) * offset;
            
            const child = new Pathogen(cx, cy, childDna, childType);
            child.energy = this.energy;
            return child;
        }
        return null;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.shadowBlur = 12;
        
        if (this.type === 'goliath') {
            // Draw Goliath boss cell (Pulsing glowing violet/magenta structure)
            ctx.shadowColor = '#7f00ff';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.8;
            ctx.fillStyle = 'rgba(127, 0, 255, 0.7)';
            
            // Outer spike ring
            ctx.beginPath();
            const spikes = 9;
            for (let i = 0; i < spikes * 2; i++) {
                const angle = (i * Math.PI) / spikes;
                const dist = i % 2 === 0 ? this.radius : this.radius + 6;
                const sx = this.x + Math.cos(angle) * dist;
                const sy = this.y + Math.sin(angle) * dist;
                if (i === 0) ctx.moveTo(sx, sy);
                else ctx.lineTo(sx, sy);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Central radioactive core
            ctx.shadowColor = '#ff007f';
            ctx.fillStyle = '#ff007f';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 0.45, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            return;
        }
        
        // Standard Pathogen Drawing
        const speedRatio = Math.max(0, Math.min(1, (this.maxSpeed - 0.8) / 2.7));
        const r = Math.floor(255 - speedRatio * 150);
        const g = 0;
        const b = Math.floor(80 + speedRatio * 175);
        
        ctx.shadowColor = `rgb(${r}, ${g}, ${b})`;
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        const spikes = 6;
        for (let i = 0; i < spikes * 2; i++) {
            const angle = (i * Math.PI) / spikes;
            const dist = i % 2 === 0 ? this.radius : this.radius + 3;
            const sx = this.x + Math.cos(angle) * dist;
            const sy = this.y + Math.sin(angle) * dist;
            if (i === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}

// HEALTHY CELL CLASS
class HealthyCell {
    constructor(x, y, energy = 100) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 0.8;
        this.vy = (Math.random() - 0.5) * 0.8;
        this.radius = 7;
        this.energy = energy;
        this.maxSpeed = 0.9;
    }
    
    update(width, height, foodArray, obstacles) {
        this.energy -= 0.08;
        
        let closestFood = null;
        let minD = 130;
        for (let food of foodArray) {
            const d = Math.hypot(food.x - this.x, food.y - this.y);
            if (d < minD) {
                minD = d;
                closestFood = food;
            }
        }
        
        if (closestFood) {
            let fx = closestFood.x - this.x;
            let fy = closestFood.y - this.y;
            const dist = Math.hypot(fx, fy);
            fx = (fx / dist) * this.maxSpeed;
            fy = (fy / dist) * this.maxSpeed;
            this.vx = this.vx * 0.92 + fx * 0.08;
            this.vy = this.vy * 0.92 + fy * 0.08;
        } else {
            this.vx += (Math.random() - 0.5) * 0.15;
            this.vy += (Math.random() - 0.5) * 0.15;
            const speed = Math.hypot(this.vx, this.vy);
            if (speed > this.maxSpeed) {
                this.vx = (this.vx / speed) * this.maxSpeed;
                this.vy = (this.vy / speed) * this.maxSpeed;
            }
        }
        
        this.x += this.vx;
        this.y += this.vy;
        
        resolveObstacleCollision(this, obstacles);
        
        if (this.x < this.radius) { this.x = this.radius; this.vx *= -1; }
        if (this.x > width - this.radius) { this.x = width - this.radius; this.vx *= -1; }
        if (this.y < this.radius) { this.y = this.radius; this.vy *= -1; }
        if (this.y > height - this.radius) { this.y = height - this.radius; this.vy *= -1; }
        
        for (let food of foodArray) {
            if (!food.eaten && Math.hypot(food.x - this.x, food.y - this.y) < (this.radius + food.radius)) {
                food.eaten = true;
                this.energy = Math.min(200, this.energy + food.energy * 0.9);
            }
        }
    }
    
    mitosis() {
        if (this.energy > 175) {
            this.energy = 80; 
            
            const offset = this.radius * 2;
            const angle = Math.random() * Math.PI * 2;
            const cx = this.x + Math.cos(angle) * offset;
            const cy = this.y + Math.sin(angle) * offset;
            
            return new HealthyCell(cx, cy, 80);
        }
        return null;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#39ff14';
        
        const healthPercent = Math.max(0, this.energy / 100);
        ctx.fillStyle = `rgba(57, 255, 20, ${0.4 + healthPercent * 0.6})`;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}
