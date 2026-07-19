/**
 * Helix DSD Visual Renderer
 * Performs canvas particle drawing, Brownian motion physics,
 * displacement animations, and SVG kinetic chart plotting.
 */

class DSDRenderer {
    constructor(canvas, svgChart, legendContainer) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.svg = svgChart;
        this.legendContainer = legendContainer;
        
        this.particles = [];
        this.selectedParticle = null;
        
        this.width = canvas.width;
        this.height = canvas.height;
        this.animationFrameId = null;
        this.isPlaying = false;
        
        // Colors corresponding to domain tags
        this.domainColors = {
            't1': '#06b6d4', 'd1': '#22d3ee',
            't2': '#a78bfa', 'd2': '#c084fc',
            't_int': '#fb923c', 'd_int': '#fdba74',
            't_y': '#10b981', 'd_y': '#34d399',
            't_trig': '#f472b6', 'd_trig': '#f9a8d4',
            't_c': '#e11d48', 'd_c': '#fb7185',
            't_s': '#10b981', 'd_s': '#34d399',
            't_inh': '#64748b', 'd_inh': '#94a3b8',
            'tx': '#06b6d4', 'dx': '#22d3ee',
            'ty': '#e11d48', 'dy': '#fb7185',
        };
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
    }

    // Populate particles based on chemical concentrations
    syncParticles(state, speciesList) {
        // Clear and rebuild matching approximate population sizes
        const targetCounts = {};
        speciesList.forEach(sp => {
            // Scale concentration to particle numbers (max ~30 per species to prevent clutter)
            const count = Math.min(30, Math.round(state[sp.id] / 4));
            targetCounts[sp.id] = count;
        });

        // Retain existing particles of same type to avoid flashes, remove extras
        const currentCounts = {};
        this.particles = this.particles.filter(p => {
            currentCounts[p.speciesId] = (currentCounts[p.speciesId] || 0) + 1;
            return currentCounts[p.speciesId] <= targetCounts[p.speciesId];
        });

        // Add new particles if count is below target
        speciesList.forEach(sp => {
            const current = currentCounts[sp.id] || 0;
            const target = targetCounts[sp.id] || 0;
            for (let i = current; i < target; i++) {
                this.particles.push(this.createParticle(sp));
            }
        });
    }

    createParticle(species) {
        const x = Math.random() * (this.width - 60) + 30;
        const y = Math.random() * (this.height - 60) + 30;
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.4 + Math.random() * 0.6;
        
        return {
            id: Math.random().toString(36).substr(2, 9),
            speciesId: species.id,
            name: species.name,
            type: species.type,
            color: species.color,
            domains: species.domains || [],
            structure: species.structure || '',
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: species.type === 'gate' ? 18 : 10,
            angle: Math.random() * Math.PI,
            rotationSpeed: (Math.random() - 0.5) * 0.02,
            isReacting: false,
            reactionPartner: null,
            reactionProgress: 0
        };
    }

    // Canvas Draw Frame loop
    draw(animateCollisions = true, onReactionTriggered = null) {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Physics and collisions
        this.updatePhysics(animateCollisions, onReactionTriggered);
        
        // Draw connection lines for reacting strands
        this.particles.forEach(p => {
            if (p.isReacting && p.reactionPartner) {
                this.ctx.beginPath();
                this.ctx.moveTo(p.x, p.y);
                this.ctx.lineTo(p.reactionPartner.x, p.reactionPartner.y);
                this.ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([4, 4]);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
        });

        // Draw individual particles
        this.particles.forEach(p => {
            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.angle);

            // Glow effect
            this.ctx.shadowBlur = p.isReacting ? 15 : 6;
            this.ctx.shadowColor = p.color;

            if (p.type === 'gate' || p.type === 'active') {
                // Draw Double Stranded Complex
                this.ctx.strokeStyle = p.color;
                this.ctx.lineWidth = 4;
                
                // Double stranded backbone
                this.ctx.beginPath();
                this.ctx.moveTo(-16, -3);
                this.ctx.lineTo(16, -3);
                this.ctx.moveTo(-16, 3);
                this.ctx.lineTo(16, 3);
                this.ctx.stroke();

                // Draw base pairing rungs
                this.ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                this.ctx.lineWidth = 1;
                for (let i = -12; i <= 12; i += 6) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(i, -3);
                    this.ctx.lineTo(i, 3);
                    this.ctx.stroke();
                }

                // Protruding Single Stranded Toehold (dashed/colored)
                this.ctx.strokeStyle = '#06b6d4'; // Cyan default toehold color
                this.ctx.lineWidth = 2.5;
                this.ctx.beginPath();
                this.ctx.arc(16, 3, 8, 1.5 * Math.PI, 0.5 * Math.PI);
                this.ctx.stroke();

                // Core shell
                this.ctx.fillStyle = 'rgba(17, 24, 39, 0.9)';
                this.ctx.beginPath();
                this.ctx.arc(0, 0, 10, 0, Math.PI * 2);
                this.ctx.fill();
                
            } else {
                // Draw Single Strand (Worm / Helix loop)
                this.ctx.strokeStyle = p.color;
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.moveTo(-12, 0);
                this.ctx.bezierCurveTo(-6, -8, 6, 8, 12, 0);
                this.ctx.stroke();

                // Draw small domain beads
                this.ctx.fillStyle = '#ffffff';
                this.ctx.beginPath();
                this.ctx.arc(-12, 0, 3, 0, Math.PI * 2);
                this.ctx.arc(12, 0, 3, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Draw selection outline
            if (this.selectedParticle && this.selectedParticle.id === p.id) {
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 1.5;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, p.radius + 6, 0, Math.PI * 2);
                this.ctx.stroke();
            }

            this.ctx.restore();
        });
    }

    updatePhysics(animateCollisions, onReactionTriggered) {
        const speedMultiplier = 1.0;

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            
            // Add slight random Brownian force
            p.vx += (Math.random() - 0.5) * 0.08;
            p.vy += (Math.random() - 0.5) * 0.08;

            // Damp speed
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (speed > 1.5) {
                p.vx = (p.vx / speed) * 1.5;
                p.vy = (p.vy / speed) * 1.5;
            }

            // Update position
            if (!p.isReacting) {
                p.x += p.vx * speedMultiplier;
                p.y += p.vy * speedMultiplier;
                p.angle += p.rotationSpeed;
            } else {
                // Reacting particles slowly zip together
                p.reactionProgress += 0.01;
                if (p.reactionProgress >= 1.0) {
                    // Trigger chemical transformation callback
                    if (onReactionTriggered) {
                        onReactionTriggered(p.speciesId, p.reactionPartner.speciesId);
                    }
                    p.isReacting = false;
                    p.reactionPartner.isReacting = false;
                }
            }

            // Wall Collisions
            if (p.x < p.radius) { p.x = p.radius; p.vx *= -1; }
            if (p.x > this.width - p.radius) { p.x = this.width - p.radius; p.vx *= -1; }
            if (p.y < p.radius) { p.y = p.radius; p.vy *= -1; }
            if (p.y > this.height - p.radius) { p.y = this.height - p.radius; p.vy *= -1; }

            // Collide particles together
            if (animateCollisions && !p.isReacting) {
                for (let j = i + 1; j < this.particles.length; j++) {
                    const p2 = this.particles[j];
                    if (p2.isReacting) continue;

                    const dx = p2.x - p.x;
                    const dy = p2.y - p.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const minDist = p.radius + p2.radius;

                    if (dist < minDist) {
                        // Collision check for DSD reaction compatibility
                        const canReact = this.checkReactionCompatibility(p, p2);
                        if (canReact) {
                            p.isReacting = true;
                            p.reactionPartner = p2;
                            p.reactionProgress = 0;
                            p2.isReacting = true;
                            p2.reactionPartner = p;
                            p2.reactionProgress = 0;
                        } else {
                            // Simple elastic collision bounce
                            const angle = Math.atan2(dy, dx);
                            const sin = Math.sin(angle);
                            const cos = Math.cos(angle);

                            // Rotate velocities
                            let vx1 = p.vx * cos + p.vy * sin;
                            let vy1 = p.vy * cos - p.vx * sin;
                            let vx2 = p2.vx * cos + p2.vy * sin;
                            let vy2 = p2.vy * cos - p2.vx * sin;

                            // Swap x velocities
                            const temp = vx1;
                            vx1 = vx2;
                            vx2 = temp;

                            // Rotate back
                            p.vx = vx1 * cos - vy1 * sin;
                            p.vy = vy1 * cos + vx1 * sin;
                            p2.vx = vx2 * cos - vy2 * sin;
                            p2.vy = vy2 * cos + vx2 * sin;

                            // Resolve overlap
                            const overlap = minDist - dist;
                            p.x -= Math.cos(angle) * (overlap / 2);
                            p.y -= Math.sin(angle) * (overlap / 2);
                            p2.x += Math.cos(angle) * (overlap / 2);
                            p2.y += Math.sin(angle) * (overlap / 2);
                        }
                    }
                }
            }
        }
    }

    checkReactionCompatibility(p1, p2) {
        // E.g. Single strand binds to matching Gate toehold
        if (p1.type === 'strand' && (p2.type === 'gate' || p2.type === 'gate_active')) {
            return this.isMatchingPairs(p1.speciesId, p2.speciesId);
        }
        if (p2.type === 'strand' && (p1.type === 'gate' || p1.type === 'gate_active')) {
            return this.isMatchingPairs(p2.speciesId, p1.speciesId);
        }
        return false;
    }

    isMatchingPairs(strandId, gateId) {
        // Quick rule mappings for visual reactions matching preset kinetics
        const matches = {
            'IA': 'G_AY', 'IB': 'G_BY',
            'IA': 'G1', 'Int': 'G2', 'IB': 'G2_active',
            'Trig': 'G_fuel', 'IA': 'G_thresh',
            'IA': 'G_carry1', 'Int_carry': 'G_carry2', 'IB': 'G_carry2_act',
            'IA': 'G_sumA', 'IB': 'G_sumB', 'IA': 'G_sumInh',
            'X': 'Fuel1', 'Y': 'Fuel2', 'Y': 'Fuel3'
        };
        return matches[strandId] === gateId;
    }

    // Find clicked particle to show details card
    handleCanvasClick(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = clientX - rect.left;
        const mouseY = clientY - rect.top;

        this.selectedParticle = null;
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            const dx = p.x - mouseX;
            const dy = p.y - mouseY;
            if (Math.sqrt(dx * dx + dy * dy) < p.radius + 5) {
                this.selectedParticle = p;
                break;
            }
        }
        return this.selectedParticle;
    }

    // Plots the simulation history dynamically inside the SVG
    plotChart(history, speciesList) {
        if (!history || history.length === 0) return;

        // Clear existing SVG
        this.svg.innerHTML = '';

        const width = 500;
        const height = 250;
        const padding = { top: 20, right: 30, bottom: 30, left: 45 };

        const maxTime = history[history.length - 1].time || 1.0;
        
        // Find maximum concentration to scale Y axis
        let maxVal = 0.1;
        history.forEach(h => {
            for (const val of Object.values(h.values)) {
                if (val > maxVal) maxVal = val;
            }
        });
        maxVal = Math.ceil(maxVal * 1.1); // add padding to top

        // Draw axes grid lines
        const drawGridLine = (x1, y1, x2, y2, color = 'rgba(255,255,255,0.06)') => {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x1);
            line.setAttribute('y1', y1);
            line.setAttribute('x2', x2);
            line.setAttribute('y2', y2);
            line.setAttribute('stroke', color);
            line.setAttribute('stroke-width', '1');
            this.svg.appendChild(line);
        };

        // Draw grid
        for (let i = 0; i <= 5; i++) {
            const yVal = padding.top + (i / 5) * (height - padding.top - padding.bottom);
            drawGridLine(padding.left, yVal, width - padding.right, yVal);
            
            const xVal = padding.left + (i / 5) * (width - padding.left - padding.right);
            drawGridLine(xVal, padding.top, xVal, height - padding.bottom);
        }

        // Draw Labels
        const drawText = (x, y, content, align = 'start', isAxis = true) => {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', x);
            text.setAttribute('y', y);
            text.setAttribute('text-anchor', align);
            text.setAttribute('fill', isAxis ? 'var(--text-muted)' : 'var(--text-secondary)');
            text.setAttribute('font-family', 'var(--font-mono)');
            text.setAttribute('font-size', '9');
            text.textContent = content;
            this.svg.appendChild(text);
        };

        // Y-axis labels
        drawText(padding.left - 8, padding.top + 4, `${Math.round(maxVal)}nM`, 'end');
        drawText(padding.left - 8, height - padding.bottom + 3, '0', 'end');
        drawText(padding.left - 8, (padding.top + height - padding.bottom) / 2 + 3, `${Math.round(maxVal / 2)}nM`, 'end');

        // X-axis labels
        drawText(padding.left, height - padding.bottom + 15, '0.0s', 'middle');
        drawText(width - padding.right, height - padding.bottom + 15, `${maxTime.toFixed(1)}s`, 'middle');
        
        // Draw axes lines
        drawGridLine(padding.left, padding.top, padding.left, height - padding.bottom, 'var(--border-color)');
        drawGridLine(padding.left, height - padding.bottom, width - padding.right, height - padding.bottom, 'var(--border-color)');

        // Draw curves for species that are selected (non-spent complexes usually)
        speciesList.forEach(sp => {
            if (sp.type === 'spent') return; // skip visual clutter of spent waste products

            const points = [];
            history.forEach(h => {
                const val = h.values[sp.id] !== undefined ? h.values[sp.id] : 0;
                
                // Map logical coordinate (time, val) to SVG coordinates (x, y)
                const x = padding.left + (h.time / maxTime) * (width - padding.left - padding.right);
                const y = height - padding.bottom - (val / maxVal) * (height - padding.top - padding.bottom);
                
                points.push(`${x},${y}`);
            });

            if (points.length > 1) {
                const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
                polyline.setAttribute('fill', 'none');
                polyline.setAttribute('stroke', sp.color);
                polyline.setAttribute('stroke-width', '2.5');
                polyline.setAttribute('points', points.join(' '));
                polyline.setAttribute('style', `filter: drop-shadow(0 0 2px ${sp.color}44)`);
                this.svg.appendChild(polyline);
            }
        });
    }

    // Build interactive legends in UI
    buildLegend(speciesList) {
        this.legendContainer.innerHTML = '';
        speciesList.forEach(sp => {
            if (sp.type === 'spent') return;
            
            const item = document.createElement('div');
            item.className = 'legend-item';
            item.innerHTML = `
                <span class="legend-color" style="background-color: ${sp.color}"></span>
                <span>${sp.name}</span>
            `;
            this.legendContainer.appendChild(item);
        });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DSDRenderer;
}
