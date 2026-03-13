/* Luck Defense (운빨존만겜) Main Logic */

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const bgCanvas = document.getElementById('bg-canvas');
const bgCtx = bgCanvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
bgCanvas.width = canvas.width;
bgCanvas.height = canvas.height;

// --- Configuration & Constants ---
const CELL_SIZE = 80;
const GRID_COLS = 6;
const GRID_ROWS = 4;
const BOARD_WIDTH = GRID_COLS * CELL_SIZE;
const BOARD_HEIGHT = GRID_ROWS * CELL_SIZE;
const BOARD_X = (canvas.width - BOARD_WIDTH) / 2;
const BOARD_Y = (canvas.height - BOARD_HEIGHT) / 2 + 50;

const COLORS = {
    Common: '#bdc3c7',
    Rare: '#2ecc71',
    Epic: '#3498db',
    Legendary: '#f1c40f',
    Mythic: '#9b59b6'
};

const UNIT_TEMPLATES = [
    { name: 'Common A', tier: 'Common', atk: 10, range: 200, icon: '🛡️' },
    { name: 'Common B', tier: 'Common', atk: 12, range: 150, icon: '⚔️' },
    { name: 'Rare A', tier: 'Rare', atk: 25, range: 250, icon: '🏹' },
    { name: 'Rare B', tier: 'Rare', atk: 30, range: 180, icon: '🪄' },
    { name: 'Epic A', tier: 'Epic', atk: 80, range: 300, icon: '🔥' },
    { name: 'Epic B', tier: 'Epic', atk: 100, range: 200, icon: '❄️' },
    { name: 'Legendary', tier: 'Legendary', atk: 300, range: 400, icon: '🐉' }
];

// --- Game State ---
let coins = 100;
let crystals = 0;
let wave = 1;
let lives = 50;
let units = []; // [{col, row, type, level}]
let enemies = [];
let projectiles = [];
let gameState = 'START'; // START, PLAYING, OVER
let spawnTimer = 0;
let waveInInterval = false;
let enemiesInWave = 0;
let killsInWave = 0;
let frameCount = 0;

// Path for enemies to follow
const PATH = [
    { x: BOARD_X - 100, y: BOARD_Y - 100 },
    { x: BOARD_X + BOARD_WIDTH + 100, y: BOARD_Y - 100 },
    { x: BOARD_X + BOARD_WIDTH + 100, y: BOARD_Y + BOARD_HEIGHT + 100 },
    { x: BOARD_X - 100, y: BOARD_Y + BOARD_HEIGHT + 100 },
    { x: BOARD_X - 100, y: BOARD_Y - 100 }
];

// --- Initialization ---
function init() {
    setupEventListeners();
    drawBoard();
    requestAnimationFrame(gameLoop);
}

function setupEventListeners() {
    document.getElementById('start-game-btn').onclick = startGame;
    document.getElementById('summon-btn').onclick = summonUnit;
    document.getElementById('restart-btn').onclick = () => location.reload();

    canvas.addEventListener('click', onCanvasClick);
}

function startGame() {
    document.getElementById('start-overlay').classList.add('hidden');
    gameState = 'PLAYING';
    startWave();
}

function startWave() {
    enemiesInWave = 10 + wave * 5;
    killsInWave = 0;
    waveInInterval = false;
}

// --- Core Mechanics ---
function summonUnit() {
    if (coins < 10) return;

    // Find empty slot
    let emptySlots = [];
    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            if (!units.find(u => u.col === c && u.row === r)) {
                emptySlots.push({ c, r });
            }
        }
    }

    if (emptySlots.length === 0) return;

    coins -= 10;
    const slot = emptySlots[Math.floor(Math.random() * emptySlots.length)];

    // Weighted spawn
    const rand = Math.random();
    let tierIndex = 0; // Default Common
    if (rand < 0.05) tierIndex = 3;      // Legendary
    else if (rand < 0.15) tierIndex = 2; // Epic
    else if (rand < 0.4) tierIndex = 1;  // Rare

    const possibleUnits = UNIT_TEMPLATES.filter(t => t.tier === Object.keys(COLORS)[tierIndex]);
    const template = possibleUnits[Math.floor(Math.random() * possibleUnits.length)];

    units.push({
        col: slot.c,
        row: slot.r,
        template: template,
        lastAttack: 0,
        level: 1
    });

    updateUI();
}

function onCanvasClick(e) {
    if (gameState !== 'PLAYING') return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const col = Math.floor((x - BOARD_X) / CELL_SIZE);
    const row = Math.floor((y - BOARD_Y) / CELL_SIZE);

    if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
        handleMerge(col, row);
    }
}

function handleMerge(col, row) {
    const unit = units.find(u => u.col === col && u.row === row);
    if (!unit) return;

    // Find same units for merging
    const matches = units.filter(u =>
        u.template.name === unit.template.name &&
        u.level === unit.level &&
        (u.col !== col || u.row !== row)
    );

    if (matches.length > 0) {
        // Simple merge: two same units -> one next tier unit (simplified)
        const match = matches[0];
        units = units.filter(u => u !== unit && u !== match);

        // Target random higher tier unit
        const nextTier = getNextTier(unit.template.tier);
        const nextTemplates = UNIT_TEMPLATES.filter(t => t.tier === nextTier);
        const newTemplate = nextTemplates[Math.floor(Math.random() * nextTemplates.length)] || unit.template;

        units.push({
            col: col,
            row: row,
            template: newTemplate,
            lastAttack: 0,
            level: 1
        });

        createParticles(BOARD_X + col * CELL_SIZE + CELL_SIZE / 2, BOARD_Y + row * CELL_SIZE + CELL_SIZE / 2, COLORS[newTemplate.tier]);
    }
}

function getNextTier(tier) {
    const tiers = Object.keys(COLORS);
    const idx = tiers.indexOf(tier);
    return tiers[Math.min(tiers.length - 1, idx + 1)];
}

// --- Game Loop ---
function gameLoop() {
    frameCount++;
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function update() {
    if (gameState !== 'PLAYING') return;

    // Enemy Spawning
    if (enemiesInWave > 0 && spawnTimer <= 0) {
        spawnEnemy();
        spawnTimer = Math.max(20, 60 - wave * 2);
        enemiesInWave--;
    }
    spawnTimer--;

    // Update Enemies
    enemies.forEach((en, index) => {
        const target = PATH[en.pathIndex];
        const angle = Math.atan2(target.y - en.y, target.x - en.x);
        en.x += Math.cos(angle) * en.speed;
        en.y += Math.sin(angle) * en.speed;

        if (Math.hypot(target.x - en.x, target.y - en.y) < 5) {
            en.pathIndex++;
            if (en.pathIndex >= PATH.length) {
                lives--;
                enemies.splice(index, 1);
                if (lives <= 0) gameOver();
            }
        }
    });

    // Update Units (Attack)
    units.forEach(u => {
        if (frameCount - u.lastAttack > 40) { // Attack speed
            const target = findNearestEnemy(u);
            if (target) {
                fireProjectile(u, target);
                u.lastAttack = frameCount;
            }
        }
    });

    // Update Projectiles
    projectiles.forEach((p, pIndex) => {
        const angle = Math.atan2(p.target.y - p.y, p.target.x - p.x);
        p.x += Math.cos(angle) * 12;
        p.y += Math.sin(angle) * 12;

        if (Math.hypot(p.target.x - p.x, p.target.y - p.y) < 10) {
            p.target.hp -= p.damage;
            projectiles.splice(pIndex, 1);
            if (p.target.hp <= 0) {
                const enIndex = enemies.indexOf(p.target);
                if (enIndex !== -1) {
                    enemies.splice(enIndex, 1);
                    coins += 2;
                    killsInWave++;
                }
            }
        }
    });

    // Next Wave Check
    if (enemiesInWave === 0 && enemies.length === 0) {
        wave++;
        startWave();
        updateUI();
    }

    updateUI();
}

function spawnEnemy() {
    enemies.push({
        x: PATH[0].x,
        y: PATH[0].y,
        hp: 50 + wave * 30,
        maxHp: 50 + wave * 30,
        speed: 2 + Math.random() * 0.5,
        pathIndex: 1,
        radius: 15
    });
}

function findNearestEnemy(unit) {
    const ux = BOARD_X + unit.col * CELL_SIZE + CELL_SIZE / 2;
    const uy = BOARD_Y + unit.row * CELL_SIZE + CELL_SIZE / 2;

    let nearest = null;
    let minDist = unit.template.range;

    enemies.forEach(en => {
        const d = Math.hypot(en.x - ux, en.y - uy);
        if (d < minDist) {
            minDist = d;
            nearest = en;
        }
    });
    return nearest;
}

function fireProjectile(unit, target) {
    const ux = BOARD_X + unit.col * CELL_SIZE + CELL_SIZE / 2;
    const uy = BOARD_Y + unit.row * CELL_SIZE + CELL_SIZE / 2;
    projectiles.push({
        x: ux, y: uy,
        target: target,
        damage: unit.template.atk,
        color: COLORS[unit.template.tier]
    });
}

// --- Drawing ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid (Cells)
    ctx.lineWidth = 2;
    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.strokeRect(BOARD_X + c * CELL_SIZE, BOARD_Y + r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
    }

    // Path
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 20;
    PATH.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    // Enemies
    enemies.forEach(en => {
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(en.x, en.y, en.radius, 0, Math.PI * 2);
        ctx.fill();

        // HP Bar
        ctx.fillStyle = '#000';
        ctx.fillRect(en.x - 15, en.y - 25, 30, 4);
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(en.x - 15, en.y - 25, (en.hp / en.maxHp) * 30, 4);
    });

    // Projectiles
    projectiles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
        // Glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.stroke();
        ctx.shadowBlur = 0;
    });

    // Units
    units.forEach(u => {
        const ux = BOARD_X + u.col * CELL_SIZE + CELL_SIZE / 2;
        const uy = BOARD_Y + u.row * CELL_SIZE + CELL_SIZE / 2;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Tier Glow
        ctx.fillStyle = COLORS[u.template.tier];
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.arc(ux, uy, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        ctx.font = '30px Fredoka';
        ctx.fillText(u.template.icon, ux, uy);
    });
}

function drawBoard() {
    bgCtx.fillStyle = '#0a0a1a';
    bgCtx.fillRect(0, 0, canvas.width, canvas.height);
}

// --- UI & Utility ---
function updateUI() {
    document.getElementById('coin-count').textContent = coins;
    document.getElementById('diamond-count').textContent = crystals;
    document.getElementById('current-wave').textContent = wave;
    document.getElementById('lives-count').textContent = lives;

    const progress = (enemies.length / 100) * 100;
    document.getElementById('progress-fill').style.width = progress + '%';
    document.getElementById('enemy-count').textContent = enemies.length;
}

function createParticles(x, y, color) {
    // simplified particles in code or visual effect
}

function gameOver() {
    gameState = 'OVER';
    document.getElementById('game-over-overlay').classList.remove('hidden');
    document.getElementById('final-wave').textContent = wave;
}

init();
