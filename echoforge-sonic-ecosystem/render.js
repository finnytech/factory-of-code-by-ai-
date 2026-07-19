// render.js - Canvas renderer for the ecosystem. Browser only.
(function (root) {
  'use strict';

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.pulses = []; // visual note pulses {x,y,r,max,hue,alpha}
    }

    resize(w, h) { this.canvas.width = w; this.canvas.height = h; }

    addPulse(x, y, hue) {
      this.pulses.push({ x, y, r: 2, max: 40, hue, alpha: 0.8 });
    }

    drawFood(food) {
      const ctx = this.ctx;
      const cell = food.cell;
      for (let r = 0; r < food.rows; r++) {
        for (let c = 0; c < food.cols; c++) {
          const v = food.grid[r * food.cols + c];
          if (v <= 0.02) continue;
          ctx.fillStyle = 'rgba(40,120,90,' + (v * 0.18).toFixed(3) + ')';
          ctx.fillRect(c * cell, r * cell, cell, cell);
        }
      }
    }

    frame(world) {
      const ctx = this.ctx;
      // Trailing fade background (bioluminescent dark).
      ctx.fillStyle = 'rgba(6, 10, 18, 0.35)';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      this.drawFood(world.food);

      // Organisms
      for (const o of world.organisms) {
        const g = o.genome.genes;
        const hue = Math.floor(g.hue * 360);
        const energyPct = Math.max(0, Math.min(1, o.energy / 200));
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'hsla(' + hue + ',80%,' + (40 + energyPct * 30) + '%,0.9)';
        ctx.shadowColor = 'hsla(' + hue + ',90%,60%,0.9)';
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;
        // core
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'hsla(' + hue + ',100%,85%,0.95)';
        ctx.fill();
      }

      // Note pulses
      for (let i = this.pulses.length - 1; i >= 0; i--) {
        const p = this.pulses[i];
        p.r += 1.6; p.alpha -= 0.03;
        if (p.alpha <= 0 || p.r >= p.max) { this.pulses.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.strokeStyle = 'hsla(' + p.hue + ',90%,70%,' + p.alpha.toFixed(2) + ')';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  root.Renderer = Renderer;
})(typeof window !== 'undefined' ? window : globalThis);
