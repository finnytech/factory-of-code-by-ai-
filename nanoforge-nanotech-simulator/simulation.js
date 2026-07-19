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
        
        // Offscreen canvas for fast hardware-accelerated rendering and blur
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = cols;
        this.offscreenCanvas.height = rows;
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');
        this.imageData = this.offscreenCtx.createImageData(cols, rows);
    }
    
    update() {
        // Diffuse and decay
        this.diffuse(this.attractant, 0.22, 0.94);
        this.diffuse(this.repellent, 0.22, 0.94);
    }
    
    diffuse(grid, rate, decay) {
        const cols = this.cols;
        const rows = this.rows;
        
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const idx = y * cols + x;
                
                // Box filter diffusion
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
        // Render chemical maps directly to imageData pixels
        const data = this.imageData.data;
        const totalCells = this.cols * this.rows;
        
        for (let i = 0; i < totalCells; i++) {
            const attrVal = Math.floor(Math.min(255, this.attractant[i] * 90));
            const repVal = Math.floor(Math.min(255, this.repellent[i] * 90));
            
            const pxIdx = i * 4;
            data[pxIdx] = repVal;                      // Red = repellent
            data[pxIdx + 1] = Math.floor((attrVal + repVal) * 0.1); // Green = faint overlap mix
            data[pxIdx + 2] = attrVal;                 // Blue = attractant
            data[pxIdx + 3] = Math.max(attrVal, repVal) * 0.25; // Alpha
        }
        
        this.offscreenCtx.putImageData(this.imageData, 0, 0);
        
        // Stretch offscreen canvas over main canvas using bilinear interpolation
        const imageSmoothingEnabled = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(this.offscreenCanvas, 0, 0, this.width, this.height);
        ctx.imageSmoothingEnabled = imageSmoothingEnabled;
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
        // Continually emit attractant chemical
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

// PATHOGEN CLASS
class Pathogen {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.radius = 6;
        this.energy = 100;
        this.maxSpeed = 1.6;
        this.infectCooldown = 0;
    }
    
    update(grid, width, height, healthyCells, triggerAudioCallback) {
        // Emit repellent chemical to indicate toxicity
        grid.addVal(this.x, this.y, 'repellent', 0.35);
        
        // Reduce energy over time
        this.energy -= 0.12;
        if (this.infectCooldown > 0) this.infectCooldown--;
        
        // Steering: find closest healthy cell to pursue
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
            // Seek healthy cell
            let tx = target.x - this.x;
            let ty = target.y - this.y;
            const dist = Math.hypot(tx, ty);
            tx = (tx / dist) * this.maxSpeed;
            ty = (ty / dist) * this.maxSpeed;
            
            // Steer towards target
            this.vx = this.vx * 0.93 + tx * 0.07;
            this.vy = this.vy * 0.93 + ty * 0.07;
        } else {
            // Wander
            this.vx += (Math.random() - 0.5) * 0.4;
            this.vy += (Math.random() - 0.5) * 0.4;
            const speed = Math.hypot(this.vx, this.vy);
            if (speed > this.maxSpeed) {
                this.vx = (this.vx / speed) * this.maxSpeed;
                this.vy = (this.vy / speed) * this.maxSpeed;
            }
        }
        
        // Physics update
        this.x += this.vx;
        this.y += this.vy;
        
        // Boundary checks
        if (this.x < this.radius) { this.x = this.radius; this.vx *= -1; }
        if (this.x > width - this.radius) { this.x = width - this.radius; this.vx *= -1; }
        if (this.y < this.radius) { this.y = this.radius; this.vy *= -1; }
        if (this.y > height - this.radius) { this.y = height - this.radius; this.vy *= -1; }
        
        // Infection collision checks
        if (this.infectCooldown === 0) {
            for (let cell of healthyCells) {
                if (Math.hypot(cell.x - this.x, cell.y - this.y) < (this.radius + cell.radius)) {
                    cell.energy -= 40; // Infect cell
                    this.energy += 30;
                    this.infectCooldown = 40; // Avoid double infection ticks
                    if (triggerAudioCallback) triggerAudioCallback('infect');
                    break;
                }
            }
        }
    }
    
    draw(ctx) {
        ctx.save();
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ff007f';
        ctx.fillStyle = '#ff0055';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        
        // Draw spiked shell
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
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 0.8;
        this.vy = (Math.random() - 0.5) * 0.8;
        this.radius = 7;
        this.energy = 100;
        this.maxSpeed = 0.8;
    }
    
    update(width, height) {
        // Slow random wander
        this.vx += (Math.random() - 0.5) * 0.15;
        this.vy += (Math.random() - 0.5) * 0.15;
        const speed = Math.hypot(this.vx, this.vy);
        if (speed > this.maxSpeed) {
            this.vx = (this.vx / speed) * this.maxSpeed;
            this.vy = (this.vy / speed) * this.maxSpeed;
        }
        
        this.x += this.vx;
        this.y += this.vy;
        
        // Boundaries
        if (this.x < this.radius) { this.x = this.radius; this.vx *= -1; }
        if (this.x > width - this.radius) { this.x = width - this.radius; this.vx *= -1; }
        if (this.y < this.radius) { this.y = this.radius; this.vy *= -1; }
        if (this.y > height - this.radius) { this.y = height - this.radius; this.vy *= -1; }
    }
    
    draw(ctx) {
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#39ff14';
        
        // Color shifts depending on health
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
