const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const waveEl = document.getElementById('wave');
const gameOverScreen = document.getElementById('game-over');
const finalScoreEl = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');

let score = 0;
let lives = 3;
let wave = 1;
let gameActive = true;

class Player {
    constructor() {
        this.x = canvas.width / 2;
        this.y = canvas.height - 30;
        this.width = 40;
        this.height = 20;
        this.color = '#00ffcc';
        this.speed = 5;
        this.isMovingLeft = false;
        this.isMovingRight = false;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.height/2);
        ctx.lineTo(this.x + this.width/2, this.y + this.height/2);
        ctx.lineTo(this.x - this.width/2, this.y + this.height/2);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
    }

    update() {
        if (this.isMovingLeft && this.x - this.width/2 > 0) {
            this.x -= this.speed;
        }
        if (this.isMovingRight && this.x + this.width/2 < canvas.width) {
            this.x += this.speed;
        }
        this.draw();
        ctx.shadowBlur = 0;
    }
}

class Projectile {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 3;
        this.color = '#00ffcc';
        this.velocity = -7;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.shadowBlur = 5;
        ctx.shadowColor = this.color;
    }

    update() {
        this.y += this.velocity;
        this.draw();
        ctx.shadowBlur = 0;
    }
}

class Enemy {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.type = type; // 1 = basic, 2 = fast, 3 = tough

        switch(type) {
            case 1:
                this.color = '#ff0055';
                this.hp = 1;
                this.speed = 1;
                break;
            case 2:
                this.color = '#ffaa00';
                this.hp = 1;
                this.speed = 2.5;
                break;
            case 3:
                this.color = '#aa00ff';
                this.hp = 3;
                this.speed = 0.5;
                this.width = 40;
                this.height = 40;
                break;
        }

        this.direction = 1;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);

        // Inner grid logic based on HP
        if (this.type === 3) {
             ctx.strokeStyle = '#fff';
             ctx.strokeRect(this.x - this.width/2 + 5, this.y - this.height/2 + 5, this.width - 10, this.height - 10);
        }

        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
    }

    update(speedMultiplier) {
        this.x += this.speed * speedMultiplier * this.direction;
        this.draw();
        ctx.shadowBlur = 0;
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.radius = Math.random() * 2;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 5;
        this.vy = (Math.random() - 0.5) * 5;
        this.alpha = 1;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= 0.02;
        this.draw();
    }
}

let player = new Player();
let projectiles = [];
let enemies = [];
let particles = [];
let enemySpeedMultiplier = 1;
let enemyDirection = 1;

function initWave() {
    enemies = [];
    enemySpeedMultiplier = 1 + (wave * 0.2);

    const rows = Math.min(3 + Math.floor(wave / 2), 6);
    const cols = 8;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            let type = 1;
            if (wave > 2 && r === 0) type = 3;
            else if (wave > 1 && r === rows - 1) type = 2;

            enemies.push(new Enemy(
                c * 60 + 100,
                r * 50 + 50,
                type
            ));
        }
    }

    waveEl.innerText = `Wave: ${wave}`;
}

function createExplosion(x, y, color) {
    for(let i=0; i<15; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function updateHUD() {
    scoreEl.innerText = `Score: ${score}`;
    livesEl.innerText = `Lives: ${lives}`;
}

function gameOver() {
    gameActive = false;
    gameOverScreen.classList.remove('hidden');
    finalScoreEl.innerText = score;
}

function resetGame() {
    score = 0;
    lives = 3;
    wave = 1;
    player = new Player();
    projectiles = [];
    particles = [];
    updateHUD();
    initWave();
    gameOverScreen.classList.add('hidden');
    gameActive = true;
    animate();
}

// Controls
window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') player.isMovingLeft = true;
    if (e.key === 'ArrowRight' || e.key === 'd') player.isMovingRight = true;
    if (e.key === ' ' && gameActive) {
        projectiles.push(new Projectile(player.x, player.y - player.height/2));
    }
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') player.isMovingLeft = false;
    if (e.key === 'ArrowRight' || e.key === 'd') player.isMovingRight = false;
});

restartBtn.addEventListener('click', resetGame);

// Animation Loop
function animate() {
    if (!gameActive) return;

    requestAnimationFrame(animate);

    // Create trail effect
    ctx.fillStyle = 'rgba(5, 5, 16, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    player.update();

    // Handle particles
    particles.forEach((particle, index) => {
        if (particle.alpha <= 0) {
            particles.splice(index, 1);
        } else {
            particle.update();
        }
    });

    // Handle projectiles
    projectiles.forEach((projectile, pIndex) => {
        projectile.update();

        // Remove off-screen
        if (projectile.y + projectile.radius < 0) {
            projectiles.splice(pIndex, 1);
        }

        // Collision detection
        enemies.forEach((enemy, eIndex) => {
            const dist = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y);

            if (dist - enemy.width/2 - projectile.radius < 1) {
                // Hit!
                projectiles.splice(pIndex, 1);
                enemy.hp--;

                if (enemy.hp <= 0) {
                    createExplosion(enemy.x, enemy.y, enemy.color);
                    enemies.splice(eIndex, 1);
                    score += enemy.type * 100;
                    updateHUD();
                } else {
                    // Visual feedback for hitting tough enemy
                    enemy.color = '#ffffff';
                    setTimeout(() => enemy.color = '#aa00ff', 50);
                }
            }
        });
    });

    // Handle enemies
    let hitEdge = false;
    enemies.forEach((enemy) => {
        enemy.update(enemySpeedMultiplier);

        if (enemy.x + enemy.width/2 >= canvas.width || enemy.x - enemy.width/2 <= 0) {
            hitEdge = true;
        }

        // Check collision with player or reaching bottom
        if (enemy.y + enemy.height/2 >= player.y - player.height/2 || enemy.y > canvas.height) {
            lives--;
            updateHUD();
            if (lives <= 0) {
                gameOver();
            } else {
                initWave(); // Reset wave position
            }
        }
    });

    if (hitEdge) {
        enemies.forEach(enemy => {
            enemy.direction *= -1;
            enemy.y += 20;
        });
    }

    // Wave Complete
    if (enemies.length === 0) {
        wave++;
        score += 1000;
        updateHUD();
        initWave();
    }
}

// Start Game
initWave();
animate();
