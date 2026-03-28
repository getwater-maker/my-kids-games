const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- ASSETS ---
const playerImg = new Image();
playerImg.src = 'assets/player.png';
const ghostImg = new Image();
ghostImg.src = 'assets/ghost.png';
const bgImg = new Image();
bgImg.src = 'assets/bg.png';

// --- GAME STATE ---
const gameState = {
    running: false,
    hp: 100,
    mp: 100,
    score: 0,
    keys: {},
    mouse: { x: 0, y: 0 }
};

class Player {
    constructor() {
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.size = 50;
        this.speed = 4;
        this.angle = 0;
    }

    update() {
        if (gameState.keys['KeyW']) this.y -= this.speed;
        if (gameState.keys['KeyS']) this.y += this.speed;
        if (gameState.keys['KeyA']) this.x -= this.speed;
        if (gameState.keys['KeyD']) this.x += this.speed;

        this.x = Math.max(this.size, Math.min(canvas.width - this.size, this.x));
        this.y = Math.max(this.size, Math.min(canvas.height - this.size, this.y));

        // Rotate towards mouse
        const dx = gameState.mouse.x - this.x;
        const dy = gameState.mouse.y - this.y;
        this.angle = Math.atan2(dy, dx);
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle + Math.PI / 2);
        // Draw sprite or fallback circle
        if (playerImg.complete) {
            ctx.drawImage(playerImg, -25, -25, 50, 50);
        } else {
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath();
            ctx.arc(0, 0, 20, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

class Talisman {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 10;
        this.size = 15;
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = '#ffcc00';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffcc00';
        ctx.fillRect(-10, -5, 20, 10);
        ctx.restore();
    }
}

class Ghost {
    constructor() {
        this.spawn();
        this.speed = 1.5 + Math.random() * 1.5;
        this.hp = 2;
        this.size = 40;
    }

    spawn() {
        const side = Math.floor(Math.random() * 4);
        if (side === 0) { this.x = Math.random() * canvas.width; this.y = -50; }
        else if (side === 1) { this.x = Math.random() * canvas.width; this.y = canvas.height + 50; }
        else if (side === 2) { this.x = -50; this.y = Math.random() * canvas.height; }
        else { this.x = canvas.width + 50; this.y = Math.random() * canvas.height; }
    }

    update(player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.x += (dx / dist) * this.speed;
        this.y += (dy / dist) * this.speed;
    }

    draw() {
        ctx.save();
        if (ghostImg.complete) {
            ctx.drawImage(ghostImg, this.x - 20, this.y - 20, 40, 40);
        } else {
            ctx.fillStyle = 'rgba(0, 242, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 15, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

const player = new Player();
const talismans = [];
const ghosts = [];
let spawnTimer = 0;

function gameLoop() {
    if (!gameState.running) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    ctx.fillStyle = '#050510'; // Deep dark blue fallback
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (bgImg.complete && bgImg.width > 0) {
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    }

    player.update();
    player.draw();

    // Spawning
    spawnTimer++;
    if (spawnTimer > 60) {
        ghosts.push(new Ghost());
        spawnTimer = 0;
    }

    // Update Talismans
    talismans.forEach((t, ti) => {
        t.update();
        t.draw();
        if (t.x < 0 || t.x > canvas.width || t.y < 0 || t.y > canvas.height) {
            talismans.splice(ti, 1);
        }
    });

    // Update Ghosts
    ghosts.forEach((g, gi) => {
        g.update(player);
        g.draw();

        // Player collision
        const dist = Math.sqrt((player.x - g.x)**2 + (player.y - g.y)**2);
        if (dist < 40) {
            gameState.hp -= 0.5;
            updateHUD();
            if (gameState.hp <= 0) endGame();
        }

        // Talisman collision
        talismans.forEach((t, ti) => {
            const hDist = Math.sqrt((t.x - g.x)**2 + (t.y - g.y)**2);
            if (hDist < 30) {
                g.hp--;
                talismans.splice(ti, 1);
                if (g.hp <= 0) {
                    ghosts.splice(gi, 1);
                    gameState.score += 1;
                    gameState.mp = Math.min(100, gameState.mp + 2);
                    updateHUD();
                }
            }
        });
    });

    requestAnimationFrame(gameLoop);
}

function updateHUD() {
    document.getElementById('hp-bar').style.width = gameState.hp + '%';
    document.getElementById('mp-bar').style.width = gameState.mp + '%';
    document.getElementById('score').innerText = gameState.score;
}

function endGame() {
    gameState.running = false;
    document.getElementById('game-over').classList.remove('hidden');
    document.getElementById('final-score').innerText = gameState.score;
}

// EVENTS
window.addEventListener('keydown', e => gameState.keys[e.code] = true);
window.addEventListener('keyup', e => gameState.keys[e.code] = false);
window.addEventListener('mousemove', e => {
    gameState.mouse.x = e.clientX;
    gameState.mouse.y = e.clientY;
});
window.addEventListener('mousedown', e => {
    if (gameState.running && gameState.mp > 5) {
        talismans.push(new Talisman(player.x, player.y, player.angle));
        gameState.mp -= 2;
        updateHUD();
    }
});

document.getElementById('start-btn').addEventListener('click', () => {
    gameState.running = true;
    document.getElementById('start-screen').classList.add('hidden');
    gameLoop();
});

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
