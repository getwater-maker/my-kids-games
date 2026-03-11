// Level Devil - NOT A TROLL GAME
// Pure JS Platformer with Troll Mechanics

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- Config & State ---
const GRAVITY = 0.6;
const FRICTION = 0.85;
const PLAYER_SPEED = 5;
const JUMP_POWER = -13;

let player = {
    x: 100,
    y: 0,
    width: 32,
    height: 32,
    vx: 0,
    vy: 0,
    grounded: false,
    color: '#ff3e3e',
    isDead: false
};

let currentLevel = 0;
let deaths = 0;
let gameState = 'START'; // START, PLAYING, OVER, WIN

const keys = {};
let platforms = [];
let hazards = []; // Spikes, etc.
let goal = { x: 0, y: 0, width: 48, height: 60 };
let trollObjects = []; // Objects that move or react

// --- Level Data ---
const levels = [
    { // Level 1 - Introduction
        spawn: { x: 100, y: 300 },
        platforms: [
            { x: 0, y: 400, w: 300, h: 50 },
            { x: 400, y: 400, w: 200, h: 50 },
            { x: 700, y: 400, w: 300, h: 50 }
        ],
        hazards: [
            { x: 450, y: 380, w: 30, h: 20, type: 'spike' }
        ],
        goal: { x: 900, y: 340 }
    },
    { // Level 2 - Jumping Spikes
        spawn: { x: 100, y: 300 },
        platforms: [
            { x: 0, y: 500, w: 1000, h: 50 }
        ],
        hazards: [
            { x: 400, y: 480, w: 30, h: 20, type: 'jump_spike', triggerX: 300, jumpY: 150 },
            { x: 600, y: 480, w: 30, h: 20, type: 'jump_spike', triggerX: 500, jumpY: 150 }
        ],
        goal: { x: 900, y: 440 }
    },
    { // Level 3 - Falling Floors
        spawn: { x: 100, y: 300 },
        platforms: [
            { x: 0, y: 500, w: 200, h: 50 },
            { x: 250, y: 500, w: 150, h: 50, type: 'fall_floor', triggerX: 230 },
            { x: 450, y: 500, w: 150, h: 50, type: 'fall_floor', triggerX: 430 },
            { x: 650, y: 500, w: 200, h: 50 }
        ],
        hazards: [],
        goal: { x: 750, y: 440 }
    },
    { // Level 4 - Moving Goal
        spawn: { x: 100, y: 300 },
        platforms: [
            { x: 0, y: 500, w: 1000, h: 50 }
        ],
        hazards: [
            { x: 500, y: 480, w: 30, h: 20, type: 'spike' }
        ],
        goal: { x: 800, y: 440, type: 'troll_goal', moveX: 200 }
    },
    { // Level 5 - Falling Ceiling (New Challenge)
        spawn: { x: 100, y: 300 },
        platforms: [
            { x: 0, y: 500, w: 800, h: 50 },
            { x: 900, y: 500, w: 100, h: 50 }
        ],
        hazards: [
            { x: 400, y: -200, w: 50, h: 400, type: 'popup_wall', triggerX: 300 } // Falling from top
        ],
        goal: { x: 950, y: 440 }
    },
    { // Level 6 - Hidden Surprise (FINAL STAGE)
        spawn: { x: 100, y: 300 },
        platforms: [
            { x: 0, y: 500, w: 300, h: 50 },
            { x: 500, y: 500, w: 500, h: 50 }
        ],
        hazards: [
            { x: 450, y: 600, w: 40, h: 500, type: 'popup_wall', triggerX: 350 }
        ],
        goal: { x: 900, y: 440 }
    }
];

// --- Initialization ---
function init() {
    setupEventListeners();
    loadLevel(0);
    requestAnimationFrame(gameLoop);
}

function setupEventListeners() {
    window.addEventListener('keydown', e => keys[e.code] = true);
    window.addEventListener('keyup', e => keys[e.code] = false);

    document.getElementById('start-btn').onclick = () => {
        document.getElementById('overlay').classList.add('hidden');
        gameState = 'PLAYING';
    };

    document.getElementById('respawn-btn').onclick = () => {
        document.getElementById('game-over').classList.add('hidden');
        loadLevel(currentLevel);
        gameState = 'PLAYING';
    };

    document.getElementById('restart-btn').onclick = () => location.reload();
}

function loadLevel(idx) {
    if (idx >= levels.length) {
        victory();
        return;
    }

    const lvl = levels[idx];
    player.x = lvl.spawn.x;
    player.y = lvl.spawn.y;
    player.vx = 0;
    player.vy = 0;
    player.isDead = false;

    platforms = lvl.platforms.map(p => ({ ...p, originalY: p.y, falling: false }));
    hazards = lvl.hazards.map(h => ({ ...h, originalY: h.y, active: false }));
    goal = { ...lvl.goal, w: 48, h: 60, originalX: lvl.goal.x };

    currentLevel = idx;
    updateHUD();
}

function updateHUD() {
    document.getElementById('level-val').textContent = currentLevel + 1;
    document.getElementById('death-val').textContent = deaths;
}

function victory() {
    gameState = 'WIN';
    document.getElementById('victory-screen').classList.remove('hidden');
    document.getElementById('final-deaths').textContent = deaths;
}

function die() {
    if (player.isDead) return;
    player.isDead = true;
    deaths++;
    updateHUD();

    document.body.classList.add('shake');
    setTimeout(() => document.body.classList.remove('shake'), 500);

    gameState = 'OVER';
    document.getElementById('game-over').classList.remove('hidden');
}

// --- Game Logic ---
function update() {
    if (gameState !== 'PLAYING') return;

    // Movement
    if (keys['ArrowLeft'] || keys['KeyA']) {
        if (player.vx > -PLAYER_SPEED) player.vx--;
    }
    if (keys['ArrowRight'] || keys['KeyD']) {
        if (player.vx < PLAYER_SPEED) player.vx++;
    }
    if (keys['ArrowUp'] || keys['KeyW'] || keys['Space']) {
        if (player.grounded) {
            player.vy = JUMP_POWER;
            player.grounded = false;
        }
    }

    player.vx *= FRICTION;
    player.vy += GRAVITY;

    player.x += player.vx;
    player.y += player.vy;

    // Floor collision & Level death
    if (player.y > canvas.height) {
        die();
    }

    checkCollisions();
    updateTrolls();
}

function checkCollisions() {
    player.grounded = false;

    // Platform collision
    platforms.forEach(p => {
        if (player.x < p.x + p.w &&
            player.x + player.width > p.x &&
            player.y < p.y + p.h &&
            player.y + player.height > p.y) {

            // Resolve collision (Top down)
            if (player.vy > 0 && player.y + player.height - player.vy <= p.y) {
                player.y = p.y - player.height;
                player.vy = 0;
                player.grounded = true;

                // Trigger falling floor
                if (p.type === 'fall_floor') p.falling = true;
            }
        }
    });

    // Hazard collision
    hazards.forEach(h => {
        if (player.x < h.x + h.w &&
            player.x + player.width > h.x &&
            player.y < h.y + h.h &&
            player.y + player.height > h.y) {
            die();
        }
    });

    // Goal collision
    if (player.x < goal.x + goal.w &&
        player.x + player.width > goal.x &&
        player.y < goal.y + goal.h &&
        player.y + player.height > goal.y) {
        loadLevel(currentLevel + 1);
    }
}

function updateTrolls() {
    // Jumping Spikes
    hazards.forEach(h => {
        if (h.type === 'jump_spike') {
            if (player.x > h.triggerX && !h.active) {
                h.active = true;
            }
            if (h.active && h.y > h.originalY - 100) {
                h.y -= 10;
            }
        }
        if (h.type === 'popup_wall') {
            if (player.x > h.triggerX) {
                // If it starts below the platform, it pops up. If it's above, it falls down.
                if (h.originalY > 500) {
                    h.y -= 20;
                    if (h.y < 500 - h.h) h.y = 500 - h.h;
                } else if (h.originalY < 0) {
                    h.y += 20;
                    if (h.y > 500 - h.h) h.y = 500 - h.h;
                }
            }
        }
    });

    // Falling Floors
    platforms.forEach(p => {
        if (p.falling) {
            p.y += 10;
        }
    });

    // Moving Goal
    if (goal.type === 'troll_goal') {
        const dist = Math.abs(player.x - goal.x);
        if (dist < 150) {
            goal.x += 5;
        }
    }
}

// --- Drawing ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#1a1a1a');
    grad.addColorStop(1, '#000');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Platforms
    platforms.forEach(p => {
        ctx.fillStyle = '#444';
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x, p.y, p.w, p.h);
    });

    // Draw Hazards (Spikes)
    hazards.forEach(h => {
        ctx.fillStyle = h.type === 'popup_wall' ? '#444' : '#ff3e3e';
        if (h.type === 'spike' || h.type === 'jump_spike') {
            ctx.beginPath();
            ctx.moveTo(h.x, h.y + h.h);
            ctx.lineTo(h.x + h.w / 2, h.y);
            ctx.lineTo(h.x + h.w, h.y + h.h);
            ctx.fill();
        } else {
            ctx.fillRect(h.x, h.y, h.w, h.h);
        }
    });

    // Draw Goal
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(goal.x, goal.y, goal.w, goal.h);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(goal.x, goal.y, goal.w, goal.h);
    ctx.font = '20px Arial';
    ctx.fillText('GOAL', goal.x + 5, goal.y - 10);

    // Draw Player
    if (!player.isDead) {
        ctx.fillStyle = player.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = player.color;
        ctx.fillRect(player.x, player.y, player.width, player.height);
        ctx.shadowBlur = 0;

        // Eyes
        ctx.fillStyle = '#fff';
        ctx.fillRect(player.x + 5, player.y + 5, 8, 8);
        ctx.fillRect(player.x + 18, player.y + 5, 8, 8);
        ctx.fillStyle = '#000';
        ctx.fillRect(player.x + 8, player.y + 8, 3, 3);
        ctx.fillRect(player.x + 21, player.y + 8, 3, 3);
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

window.onresize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
};

init();
