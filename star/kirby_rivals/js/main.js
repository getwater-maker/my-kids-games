const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const ui = {
    startScreen: document.getElementById('start-screen'),
    roundOverScreen: document.getElementById('round-over-screen'),
    gameOverScreen: document.getElementById('game-over-screen'),
    playerHp: document.getElementById('player-hp-bar'),
    enemyHp: document.getElementById('enemy-hp-bar'),
    playerSuper: document.getElementById('player-super-bar'),
    enemySuper: document.getElementById('enemy-super-bar'),
    timer: document.getElementById('round-timer'),
    announcement: document.getElementById('announcement'),
    roundMsg: document.getElementById('round-result-msg'),
    finalMsg: document.getElementById('final-result-msg')
};

let gameState = 'START';
let animationId;
const FPS = 60;
let lastTime = 0;

let round = 1;
let playerWins = 0;
let enemyWins = 0;
let roundTimer = 99;
let timerInterval;
const GROUND_Y = 400;

const keys = { w: false, a: false, s: false, d: false, j: false, k: false, l: false, ' ': false };
window.addEventListener('keydown', (e) => { let key = e.key.toLowerCase(); if (keys.hasOwnProperty(key)) keys[key] = true; });
window.addEventListener('keyup', (e) => { let key = e.key.toLowerCase(); if (keys.hasOwnProperty(key)) keys[key] = false; });

// -- FX System --
let particles = [];
let screenShake = 0;

class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y; this.color = color;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10;
        this.life = 1.0;
        this.size = Math.random() * 5 + 2;
    }
    update() { this.x += this.vx; this.y += this.vy; this.life -= 0.05; }
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

class Fighter {
    constructor(isPlayer) {
        this.isPlayer = isPlayer;
        this.r = 35;
        this.w = this.r * 2; this.h = this.r * 2;
        this.color = isPlayer ? '#ff80ab' : '#7e57c2'; // Kirby Pink vs Dark Meta-style
        this.hp = 1000; this.maxHp = 1000;
        this.super = 0; this.maxSuper = 100;
        this.speed = 6; this.jumpPower = -14; this.gravity = 0.5;
        this.vx = 0; this.vy = 0; this.isGrounded = false;
        this.state = 'IDLE'; // IDLE, MOVE, JUMP, ATK_P, ATK_K, SUPER, HIT, DEAD
        this.stateTimer = 0;
        this.facingRight = isPlayer;
        this.isHovering = false;
        this.aiCooldown = 0;
    }

    reset(side) {
        this.hp = this.maxHp; this.super = 0;
        this.x = side === 'left' ? 150 : canvas.width - 150;
        this.y = GROUND_Y - this.h;
        this.vx = 0; this.vy = 0; this.state = 'IDLE'; this.stateTimer = 0;
        this.facingRight = side === 'left';
    }

    update() {
        if (gameState !== 'PLAYING') return;
        this.stateTimer--; if (this.stateTimer < 0) this.stateTimer = 0;
        if (this.state === 'HIT' && this.stateTimer === 0) this.state = 'IDLE';
        if (this.state === 'ATK_P' || this.state === 'ATK_K' || this.state === 'SUPER') {
            if (this.stateTimer === 0) this.state = 'IDLE';
        }

        // Apply Physics
        let currentGravity = this.isHovering ? 0.15 : this.gravity;
        this.vy += currentGravity;
        if (this.vy > 12) this.vy = 12;

        if (this.y + this.h + this.vy >= GROUND_Y) {
            this.y = GROUND_Y - this.h; this.vy = 0; this.isGrounded = true;
        } else { this.isGrounded = false; }

        if (this.state !== 'HIT' && this.state !== 'DEAD') {
            if (this.isPlayer) this.handleInput();
            else this.handleAI();
        }

        this.x += this.vx; this.y += this.vy;
        if (this.x < 0) this.x = 0; if (this.x + this.w > canvas.width) this.x = canvas.width - this.w;

        // Facing
        let enemy = this.isPlayer ? opponentBot : opponentPlayer;
        if (enemy && this.state !== 'SUPER') this.facingRight = (this.x < enemy.x);
    }

    handleInput() {
        if (['ATK_P', 'ATK_K', 'SUPER'].includes(this.state)) { this.vx = 0; return; }
        if (keys.l) { this.state = 'GUARD'; this.vx = 0; return; }

        if (keys[' '] && this.super >= 100) { this.useSuper(); return; }
        if (keys.j && this.stateTimer === 0) { this.attack('PUNCH'); return; }
        if (keys.k && this.stateTimer === 0) { this.attack('KICK'); return; }

        if (keys.a) { this.vx = -this.speed; this.state = this.isGrounded ? 'MOVE' : 'JUMP'; }
        else if (keys.d) { this.vx = this.speed; this.state = this.isGrounded ? 'MOVE' : 'JUMP'; }
        else { this.vx = 0; if (this.isGrounded) this.state = 'IDLE'; }

        if (keys.w) {
            if (this.isGrounded) { this.vy = this.jumpPower; this.isGrounded = false; }
            else if (this.vy > -4) { this.vy = -4; this.isHovering = true; }
        } else { this.isHovering = false; }
    }

    handleAI() {
        if (['ATK_P', 'ATK_K', 'SUPER'].includes(this.state)) { this.vx = 0; return; }
        if (this.aiCooldown > 0) this.aiCooldown--;
        let dist = Math.abs(this.x - opponentPlayer.x);

        if (dist > 100) {
            this.vx = (this.x < opponentPlayer.x) ? this.speed * 0.7 : -this.speed * 0.7;
            this.state = 'MOVE';
            if (Math.random() < 0.01 && this.isGrounded) this.vy = this.jumpPower;
        } else {
            this.vx = 0; this.state = 'IDLE';
            if (this.aiCooldown <= 0) {
                if (this.super >= 100) this.useSuper();
                else if (Math.random() < 0.5) this.attack('PUNCH');
                else this.attack('KICK');
                this.aiCooldown = 40 + Math.random() * 40;
            }
        }
    }

    attack(type) {
        this.state = type === 'PUNCH' ? 'ATK_P' : 'ATK_K';
        this.stateTimer = type === 'PUNCH' ? 15 : 25;
        this.checkHit(type === 'PUNCH' ? 40 : 70, type === 'PUNCH' ? 50 : 70, type === 'PUNCH' ? 20 : 120);
    }

    useSuper() {
        this.super = 0; this.state = 'SUPER'; this.stateTimer = 60; screenShake = 20;
        this.checkHit(300, 200, 250);
        for (let i = 0; i < 30; i++) particles.push(new Particle(this.x + 35, this.y + 35, '#ffd600'));
        updateHUD();
    }

    checkHit(dmg, reach, kb) {
        let opponent = this.isPlayer ? opponentBot : opponentPlayer;
        let hx = this.facingRight ? this.x + this.w : this.x - reach;
        if (hx < opponent.x + opponent.w && hx + reach > opponent.x &&
            this.y < opponent.y + opponent.h && this.y + this.h > opponent.y) {
            opponent.takeDamage(dmg, this.facingRight ? kb : -kb);
            this.super = Math.min(100, this.super + 15); updateHUD();
        }
    }

    takeDamage(dmg, kb) {
        if (this.state === 'DEAD') return;
        if (this.state === 'GUARD') { this.hp -= dmg * 0.2; this.vx = kb * 0.1; }
        else {
            this.hp -= dmg; this.state = 'HIT'; this.stateTimer = 15;
            this.vx = kb * 0.2; this.vy = -4; screenShake = 10;
            for (let i = 0; i < 10; i++) particles.push(new Particle(this.x + 35, this.y + 35, this.color));
        }
        if (this.hp <= 0) { this.hp = 0; this.state = 'DEAD'; checkRound(); }
        updateHUD();
    }

    draw(ctx) {
        let px = this.x; let py = this.y;
        if (this.state === 'HIT' && Math.floor(Date.now() / 50) % 2 === 0) return;

        // Draw Feet
        ctx.fillStyle = '#ff1744';
        ctx.beginPath(); ctx.ellipse(px + 10, py + this.h - 5, 15, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(px + this.w - 10, py + this.h - 5, 15, 8, 0, 0, Math.PI * 2); ctx.fill();

        // Draw Body
        ctx.fillStyle = this.color;
        if (this.state === 'GUARD') ctx.fillStyle = '#90a4ae';
        ctx.beginPath(); ctx.arc(px + 35, py + 35, 35, 0, Math.PI * 2); ctx.fill();

        // Draw Face
        let eyeX = this.facingRight ? px + 45 : px + 15;
        ctx.fillStyle = 'black';
        ctx.beginPath(); ctx.ellipse(eyeX, py + 30, 3, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(eyeX + 10, py + 30, 3, 8, 0, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#ff80ab'; // Blush
        ctx.beginPath(); ctx.arc(eyeX - 5, py + 42, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(eyeX + 15, py + 42, 5, 0, Math.PI * 2); ctx.fill();

        // Effects
        if (this.state === 'SUPER') {
            ctx.strokeStyle = '#ffd600'; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.arc(px + 35, py + 35, 50, 0, Math.PI * 2); ctx.stroke();
        }
    }
}

let opponentPlayer, opponentBot;
function init() {
    opponentPlayer = new Fighter(true); opponentBot = new Fighter(false);
    opponentPlayer.reset('left'); opponentBot.reset('right');
    round = 1; playerWins = 0; enemyWins = 0;
    ui.startScreen.classList.remove('active'); ui.gameOverScreen.classList.remove('active');
    startRound(); loop();
}

function startRound() {
    opponentPlayer.reset('left'); opponentBot.reset('right');
    roundTimer = 99; ui.timer.textContent = roundTimer; updateHUD();
    ui.roundOverScreen.classList.remove('active');
    gameState = 'COUNTDOWN'; announce(`ROUND ${round}`, 1500);
    setTimeout(() => { if (gameState === 'COUNTDOWN') { announce('FIGHT!', 1000); gameState = 'PLAYING'; startTimer(); } }, 1500);
}

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => { if (gameState === 'PLAYING') { roundTimer--; ui.timer.textContent = roundTimer; if (roundTimer <= 0) handleTime(); } }, 1000);
}

function checkRound() {
    if (gameState !== 'PLAYING') return;
    gameState = 'FINISHED'; clearInterval(timerInterval);
    if (opponentPlayer.hp <= 0) { enemyWins++; announce('K.O. - CPU WINS', 2000); }
    else { playerWins++; announce('K.O. - PLAYER 1 WINS', 2000); }
    setTimeout(() => {
        if (playerWins >= 2 || enemyWins >= 2) {
            ui.gameOverScreen.classList.add('active');
            ui.finalMsg.textContent = playerWins > enemyWins ? "VICTORY!" : "DEFEAT...";
        } else { ui.roundOverScreen.classList.add('active'); round++; }
    }, 2500);
}

function handleTime() {
    gameState = 'FINISHED'; clearInterval(timerInterval); announce('TIME UP', 2000);
    if (opponentPlayer.hp > opponentBot.hp) playerWins++; else if (opponentBot.hp > opponentPlayer.hp) enemyWins++;
    setTimeout(() => { if (playerWins >= 2 || enemyWins >= 2) ui.gameOverScreen.classList.add('active'); else { ui.roundOverScreen.classList.add('active'); round++; } }, 2500);
}

function updateHUD() {
    ui.playerHp.style.width = `${(opponentPlayer.hp / opponentPlayer.maxHp) * 100}%`;
    ui.enemyHp.style.width = `${(opponentBot.hp / opponentBot.maxHp) * 100}%`;
    ui.playerSuper.style.width = `${opponentPlayer.super}%`;
    ui.enemySuper.style.width = `${opponentBot.super}%`;
}

function announce(msg, duration) { ui.announcement.textContent = msg; ui.announcement.style.opacity = 1; setTimeout(() => ui.announcement.style.opacity = 0, duration); }

function drawBackground() {
    // Sky
    let grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    grad.addColorStop(0, '#00d2ff'); grad.addColorStop(1, '#92fe9d');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, GROUND_Y);

    // Mountains
    ctx.fillStyle = '#455a64';
    ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(150, 150); ctx.lineTo(300, GROUND_Y); ctx.fill();
    ctx.beginPath(); ctx.moveTo(400, GROUND_Y); ctx.lineTo(600, 200); ctx.lineTo(800, GROUND_Y); ctx.fill();

    // Ground
    ctx.fillStyle = '#689f38'; ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);
}

function loop() {
    ctx.save();
    if (screenShake > 0) { ctx.translate(Math.random() * screenShake - screenShake / 2, Math.random() * screenShake - screenShake / 2); screenShake *= 0.9; if (screenShake < 0.1) screenShake = 0; }

    drawBackground();
    if (opponentPlayer && opponentBot) {
        opponentPlayer.update(); opponentBot.update();
        opponentBot.draw(ctx); opponentPlayer.draw(ctx);
    }

    particles.forEach((p, i) => { p.update(); p.draw(ctx); if (p.life <= 0) particles.splice(i, 1); });
    ctx.restore();
    requestAnimationFrame(loop);
}

document.getElementById('start-btn').onclick = init;
document.getElementById('restart-btn').onclick = init;
document.getElementById('next-round-btn').onclick = startRound;
