class CitadelEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return; // for test environment
        this.ctx = this.canvas.getContext('2d');

        this.level = parseInt(localStorage.getItem('chronosphere_level')) || 1;
        this.resources = parseInt(localStorage.getItem('chronosphere_resources')) || 0;

        this.buildings = [];
        this.particles = [];
        this.time = 0;

        this.generateCitadel();
        this.resize();

        window.addEventListener('resize', () => this.resize());
        this.loop();
    }

    saveState() {
        localStorage.setItem('chronosphere_level', this.level);
        localStorage.setItem('chronosphere_resources', this.resources);
    }

    resize() {
        const parent = this.canvas.parentElement;
        this.canvas.width = parent.clientWidth;
        this.canvas.height = parent.clientHeight;
        this.generateCitadel(); // Regenerate based on new dimensions
    }

    addResources(amount) {
        this.resources += amount;
        this.saveState();
        this.spawnParticles(amount);
    }

    getUpgradeCost() {
        return this.level * 10;
    }

    upgrade() {
        const cost = this.getUpgradeCost();
        if (this.resources >= cost) {
            this.resources -= cost;
            this.level++;
            this.saveState();
            this.generateCitadel();
            this.spawnParticles(20, true);
            return true;
        }
        return false;
    }

    generateCitadel() {
        this.buildings = [];
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height;

        // Base spire
        this.buildings.push({
            x: cx - 40,
            y: cy - 100 - (this.level * 20),
            w: 80,
            h: 100 + (this.level * 20),
            color: '#34495e',
            glow: '#2ecc71'
        });

        // Generate surrounding structures based on level
        for (let i = 1; i < this.level; i++) {
            const offset = (i * 40);
            const height = 50 + (i * 10);

            // Left structure
            this.buildings.push({
                x: cx - 40 - offset,
                y: cy - height,
                w: 30,
                h: height,
                color: '#2c3e50',
                glow: '#3498db'
            });

            // Right structure
            this.buildings.push({
                x: cx + 40 + offset - 30,
                y: cy - height,
                w: 30,
                h: height,
                color: '#2c3e50',
                glow: '#3498db'
            });
        }
    }

    spawnParticles(count, isUpgrade = false) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: 0,
                vx: (Math.random() - 0.5) * 2,
                vy: Math.random() * 2 + 1,
                life: 1.0,
                color: isUpgrade ? '#f1c40f' : '#2ecc71'
            });
        }
    }

    update() {
        this.time += 0.05;

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.01;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw ambient glow
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width/2, this.canvas.height, 0,
            this.canvas.width/2, this.canvas.height, this.canvas.height
        );
        gradient.addColorStop(0, 'rgba(46, 204, 113, 0.1)');
        gradient.addColorStop(1, 'rgba(26, 26, 46, 0)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw buildings
        this.buildings.forEach(b => {
            // Main structure
            this.ctx.fillStyle = b.color;
            this.ctx.fillRect(b.x, b.y, b.w, b.h);

            // Tech lines/glow
            this.ctx.strokeStyle = b.glow;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(b.x + b.w/2, b.y);
            this.ctx.lineTo(b.x + b.w/2, b.y + b.h);
            this.ctx.stroke();

            // Pulsing node at top
            this.ctx.fillStyle = b.glow;
            this.ctx.beginPath();
            this.ctx.arc(b.x + b.w/2, b.y, 4 + Math.sin(this.time) * 2, 0, Math.PI*2);
            this.ctx.fill();
        });

        // Draw particles
        this.particles.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 3, 0, Math.PI*2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1.0;
        });
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}
