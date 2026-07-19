// NANOBOT AGENT CLASS
class Nanobot {
    constructor(x, y, dna, generation = 0) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.radius = 5;
        this.energy = 100;
        this.generation = generation;
        
        // DNA Genes
        this.dna = {
            attractionToFood: dna.attractionToFood ?? 1.5,
            attractionToPathogens: dna.attractionToPathogens ?? 2.0,
            attractionToAttractant: dna.attractionToAttractant ?? 0.8,
            repulsionToRepellent: dna.repulsionToRepellent ?? 1.2,
            sensorAngle: dna.sensorAngle ?? 35,         // degrees
            sensorLength: dna.sensorLength ?? 65,       // pixels
            maxSpeed: dna.maxSpeed ?? 2.2,
            mutationRate: dna.mutationRate ?? 0.15
        };
        
        // Sensor positions for rendering
        this.sensorPositions = {
            left: { x: 0, y: 0 },
            center: { x: 0, y: 0 },
            right: { x: 0, y: 0 }
        };
    }
    
    update(grid, width, height, foodArray, pathogens, healthyCells, triggerAudioCallback) {
        // Lose baseline energy over time + speed penalty
        const speed = Math.hypot(this.vx, this.vy);
        this.energy -= 0.05 + (speed * 0.02);
        
        // Determine current headings
        let angle = Math.atan2(this.vy, this.vx);
        if (isNaN(angle)) angle = 0;
        
        // Compute sensor coordinates
        const radAngle = (this.dna.sensorAngle * Math.PI) / 180;
        const len = this.dna.sensorLength;
        
        this.sensorPositions.center = {
            x: this.x + Math.cos(angle) * len,
            y: this.y + Math.sin(angle) * len
        };
        this.sensorPositions.left = {
            x: this.x + Math.cos(angle - radAngle) * len,
            y: this.y + Math.sin(angle - radAngle) * len
        };
        this.sensorPositions.right = {
            x: this.x + Math.cos(angle + radAngle) * len,
            y: this.y + Math.sin(angle + radAngle) * len
        };
        
        // COMBINE STEERING FORCES
        let steerX = 0;
        let steerY = 0;
        
        // 1. Seek Food
        let closestFood = null;
        let minFoodDist = Infinity;
        for (let food of foodArray) {
            const d = Math.hypot(food.x - this.x, food.y - this.y);
            if (d < minFoodDist) {
                minFoodDist = d;
                closestFood = food;
            }
        }
        if (closestFood && minFoodDist < 150) {
            // Seek force
            let fx = closestFood.x - this.x;
            let fy = closestFood.y - this.y;
            fx = (fx / minFoodDist) * this.dna.maxSpeed;
            fy = (fy / minFoodDist) * this.dna.maxSpeed;
            steerX += (fx - this.vx) * this.dna.attractionToFood;
            steerY += (fy - this.vy) * this.dna.attractionToFood;
        }
        
        // 2. Seek Pathogens to destroy them
        let closestPathogen = null;
        let minPathogenDist = Infinity;
        for (let path of pathogens) {
            const d = Math.hypot(path.x - this.x, path.y - this.y);
            if (d < minPathogenDist) {
                minPathogenDist = d;
                closestPathogen = path;
            }
        }
        if (closestPathogen && minPathogenDist < 180) {
            let px = closestPathogen.x - this.x;
            let py = closestPathogen.y - this.y;
            px = (px / minPathogenDist) * this.dna.maxSpeed;
            py = (py / minPathogenDist) * this.dna.maxSpeed;
            steerX += (px - this.vx) * this.dna.attractionToPathogens;
            steerY += (py - this.vy) * this.dna.attractionToPathogens;
        }
        
        // 3. Chemical Grid Sensors (Attractant & Repellent)
        const valLeftAttr = grid.getVal(this.sensorPositions.left.x, this.sensorPositions.left.y, 'attractant');
        const valRightAttr = grid.getVal(this.sensorPositions.right.x, this.sensorPositions.right.y, 'attractant');
        const valCenterAttr = grid.getVal(this.sensorPositions.center.x, this.sensorPositions.center.y, 'attractant');
        
        const valLeftRep = grid.getVal(this.sensorPositions.left.x, this.sensorPositions.left.y, 'repellent');
        const valRightRep = grid.getVal(this.sensorPositions.right.x, this.sensorPositions.right.y, 'repellent');
        const valCenterRep = grid.getVal(this.sensorPositions.center.x, this.sensorPositions.center.y, 'repellent');
        
        // Attractant steering logic: turn toward higher values
        if (valLeftAttr > valRightAttr && valLeftAttr > valCenterAttr) {
            // Turn left
            steerX += -Math.sin(angle) * this.dna.attractionToAttractant;
            steerY += Math.cos(angle) * this.dna.attractionToAttractant;
        } else if (valRightAttr > valLeftAttr && valRightAttr > valCenterAttr) {
            // Turn right
            steerX += Math.sin(angle) * this.dna.attractionToAttractant;
            steerY += -Math.cos(angle) * this.dna.attractionToAttractant;
        } else if (valCenterAttr > 0.1) {
            // Accelerate forward
            steerX += Math.cos(angle) * this.dna.attractionToAttractant * 0.5;
            steerY += Math.sin(angle) * this.dna.attractionToAttractant * 0.5;
        }
        
        // Repellent steering logic: turn AWAY from higher values
        if (valLeftRep > valRightRep && valLeftRep > valCenterRep) {
            // Turn right (away from left)
            steerX += Math.sin(angle) * this.dna.repulsionToRepellent;
            steerY += -Math.cos(angle) * this.dna.repulsionToRepellent;
        } else if (valRightRep > valLeftRep && valRightRep > valCenterRep) {
            // Turn left (away from right)
            steerX += -Math.sin(angle) * this.dna.repulsionToRepellent;
            steerY += Math.cos(angle) * this.dna.repulsionToRepellent;
        } else if (valCenterRep > 0.1) {
            // Slow down or turn back
            steerX += -Math.cos(angle) * this.dna.repulsionToRepellent;
            steerY += -Math.sin(angle) * this.dna.repulsionToRepellent;
        }
        
        // Apply steering force
        this.vx += steerX * 0.1;
        this.vy += steerY * 0.1;
        
        // Cap speed
        const speedMagnitude = Math.hypot(this.vx, this.vy);
        if (speedMagnitude > this.dna.maxSpeed) {
            this.vx = (this.vx / speedMagnitude) * this.dna.maxSpeed;
            this.vy = (this.vy / speedMagnitude) * this.dna.maxSpeed;
        }
        
        // Physics update
        this.x += this.vx;
        this.y += this.vy;
        
        // Soft boundary avoidance
        const pad = 25;
        if (this.x < pad) this.vx += 0.35;
        if (this.x > width - pad) this.vx -= 0.35;
        if (this.y < pad) this.vy += 0.35;
        if (this.y > height - pad) this.vy -= 0.35;
        
        // Hard boundary clamp
        this.x = Math.max(this.radius, Math.min(width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(height - this.radius, this.y));
        
        // Collision: consume food
        for (let food of foodArray) {
            if (!food.eaten && Math.hypot(food.x - this.x, food.y - this.y) < (this.radius + food.radius)) {
                food.eaten = true;
                this.energy += food.energy;
                if (triggerAudioCallback) triggerAudioCallback('consume');
            }
        }
        
        // Collision: neutralize pathogen
        for (let path of pathogens) {
            if (path.energy > 0 && Math.hypot(path.x - this.x, path.y - this.y) < (this.radius + path.radius)) {
                path.energy = 0; // kill pathogen
                this.energy += 40; // gain energy
                if (triggerAudioCallback) triggerAudioCallback('destroy');
            }
        }
        
        // Collision: heal infected healthy cell
        for (let cell of healthyCells) {
            if (cell.energy < 100 && Math.hypot(cell.x - this.x, cell.y - this.y) < (this.radius + cell.radius)) {
                const diff = 100 - cell.energy;
                const healAmount = Math.min(diff, 20);
                cell.energy += healAmount;
                this.energy -= healAmount * 0.3; // minor energy cost to heal
                if (triggerAudioCallback) triggerAudioCallback('heal');
            }
        }
    }
    
    reproduce() {
        if (this.energy > 220) {
            this.energy *= 0.48; // split energy
            
            // Mutate DNA
            const mutateVal = (val, rate) => {
                const modifier = 1 + (Math.random() - 0.5) * 2 * rate;
                return val * modifier;
            };
            
            const mr = this.dna.mutationRate;
            const childDna = {
                attractionToFood: Math.max(0.1, mutateVal(this.dna.attractionToFood, mr)),
                attractionToPathogens: Math.max(0.1, mutateVal(this.dna.attractionToPathogens, mr)),
                attractionToAttractant: Math.max(0.0, mutateVal(this.dna.attractionToAttractant, mr)),
                repulsionToRepellent: Math.max(0.0, mutateVal(this.dna.repulsionToRepellent, mr)),
                sensorAngle: Math.max(5, Math.min(90, mutateVal(this.dna.sensorAngle, mr))),
                sensorLength: Math.max(20, Math.min(150, mutateVal(this.dna.sensorLength, mr))),
                maxSpeed: Math.max(0.8, Math.min(5.5, mutateVal(this.dna.maxSpeed, mr))),
                mutationRate: Math.max(0.01, Math.min(0.5, mutateVal(this.dna.mutationRate, mr)))
            };
            
            // Spawn child nearby
            const offsetDist = this.radius * 2.5;
            const angle = Math.random() * Math.PI * 2;
            const cx = this.x + Math.cos(angle) * offsetDist;
            const cy = this.y + Math.sin(angle) * offsetDist;
            
            return new Nanobot(cx, cy, childDna, this.generation + 1);
        }
        return null;
    }
    
    draw(ctx, renderSensors = false) {
        // Draw sensors
        if (renderSensors) {
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
            ctx.lineWidth = 1;
            
            // draw lines to sensor positions
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.sensorPositions.left.x, this.sensorPositions.left.y);
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.sensorPositions.center.x, this.sensorPositions.center.y);
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.sensorPositions.right.x, this.sensorPositions.right.y);
            ctx.stroke();
            
            // Draw sensor terminal dots
            ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
            ctx.beginPath();
            ctx.arc(this.sensorPositions.left.x, this.sensorPositions.left.y, 2, 0, Math.PI * 2);
            ctx.arc(this.sensorPositions.center.x, this.sensorPositions.center.y, 2, 0, Math.PI * 2);
            ctx.arc(this.sensorPositions.right.x, this.sensorPositions.right.y, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        
        // Draw Nanobot body
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00f0ff';
        
        let heading = Math.atan2(this.vy, this.vx);
        if (isNaN(heading)) heading = 0;
        
        ctx.translate(this.x, this.y);
        ctx.rotate(heading);
        
        // Draw sleek chevron body shape
        ctx.fillStyle = '#00f0ff';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        
        ctx.beginPath();
        ctx.moveTo(this.radius * 1.5, 0); // nose
        ctx.lineTo(-this.radius, -this.radius); // left wing
        ctx.lineTo(-this.radius * 0.4, 0); // tail center indent
        ctx.lineTo(-this.radius, this.radius); // right wing
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
    }
}
