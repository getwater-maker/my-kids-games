/* survivor_io main.js */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- Game Constants & Config ---
const CONFIG = {
    playerSpeed: 3.5,
    enemyBaseSpeed: 1.5,
    spawnRate: 1000, // ms
    gemExp: 10,
    maxHp: 100
};

const SKILLS = [
    { id: 'kunai', name: 'Kunai', icon: '🗡️', desc: 'Fast projectile to nearest enemy', level: 1 },
    { id: 'brick', name: 'Brick', icon: '🧱', desc: 'Falls from above to crush enemies', level: 0 },
    { id: 'fire', name: 'Fire Ring', icon: '🔥', desc: 'Circles around you dealing damage', level: 0 },
    { id: 'speed', name: 'Fitness', icon: '👟', desc: 'Increase movement speed', level: 0 },
    { id: 'atk', name: 'Power Bullet', icon: '💥', desc: 'Increase attack damage', level: 0 }
];

// --- State Variables ---
let player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    targetX: canvas.width / 2,
    targetY: canvas.height / 2,
    hp: CONFIG.maxHp,
    level: 1,
    exp: 0,
    expToNext: 100,
    speed: CONFIG.playerSpeed,
    radius: 15,
    lastKunai: 0,
    lastBrick: 0,
    lastFire: 0
};

let enemies = [];
let bullets = [];
let gems = [];
let particles = [];
let keys = {};
let kills = 0;
let startTime = 0;
let gameState = 'START'; // START, PLAYING, LEVEL_UP, OVER

// --- Initialization ---
function init() {
    setupEventListeners();
    requestAnimationFrame(gameLoop);
}

function setupEventListeners() {
    window.addEventListener('keydown', (e) => keys[e.code] = true);
    window.addEventListener('keyup', (e) => keys[e.code] = false);

    // Mouse/Touch movement
    canvas.addEventListener('mousemove', (e) => {
        if (gameState === 'PLAYING') {
            player.targetX = e.clientX;
            player.targetY = e.clientY;
        }
    });

    document.getElementById('start-btn').onclick = startGame;
    document.getElementById('restart-btn').onclick = () => location.reload();
}

function startGame() {
    document.getElementById('start-screen').classList.add('hidden');
    gameState = 'PLAYING';
    startTime = Date.now();
    player.lastKunai = Date.now();
}

// --- Main Loop ---
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function update() {
    if (gameState !== 'PLAYING') return;

    handleMovement();
    handleCombat();
    handleSpawning();
    updateEntities();
    checkCollisions();
    updateHUD();
}

function handleMovement() {
    let dx = 0;
    let dy = 0;

    if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) dx += 1;

    // Normalize
    if (dx !== 0 || dy !== 0) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        player.x += (dx / dist) * player.speed;
        player.y += (dy / dist) * player.speed;
    }

    // Keep on screen
    player.x = Math.max(0, Math.min(canvas.width, player.x));
    player.y = Math.max(0, Math.min(canvas.height, player.y));
}

function handleCombat() {
    const now = Date.now();

    // Kunai (Auto-aim)
    if (now - player.lastKunai > 1000 / (1 + getSkillLevel('kunai') * 0.5)) {
        fireKunai();
        player.lastKunai = now;
    }

    // Fire Ring
    if (getSkillLevel('fire') > 0) {
        // Handled in drawing/collision, it's permanent
    }
}

function fireKunai() {
    if (enemies.length === 0) return;

    // Find nearest enemy
    let nearest = null;
    let minDist = Infinity;
    enemies.forEach(e => {
        const d = Math.hypot(e.x - player.x, e.y - player.y);
        if (d < minDist) {
            minDist = d;
            nearest = e;
        }
    });

    if (nearest) {
        const angle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
        bullets.push({
            x: player.x,
            y: player.y,
            vx: Math.cos(angle) * 10,
            vy: Math.sin(angle) * 10,
            type: 'kunai',
            damage: 25 + getSkillLevel('atk') * 10,
            radius: 5
        });
    }
}

function handleSpawning() {
    if (Math.random() < 0.05) { // Adjusted frequency
        spawnEnemy();
    }
}

function spawnEnemy() {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    if (side === 0) { x = Math.random() * canvas.width; y = -50; }
    else if (side === 1) { x = canvas.width + 50; y = Math.random() * canvas.height; }
    else if (side === 2) { x = Math.random() * canvas.width; y = canvas.height + 50; }
    else { x = -50; y = Math.random() * canvas.height; }

    enemies.push({
        x, y,
        hp: 30 + (kills / 10),
        speed: CONFIG.enemyBaseSpeed + Math.random() * 0.5,
        radius: 12 + Math.random() * 5
    });
}

function updateEntities() {
    // Enemies follow player
    enemies.forEach(e => {
        const angle = Math.atan2(player.y - e.y, player.x - e.x);
        e.x += Math.cos(angle) * e.speed;
        e.y += Math.sin(angle) * e.speed;
    });

    // Bullets move
    bullets = bullets.filter(b => {
        b.x += b.vx;
        b.y += b.vy;
        return b.x > 0 && b.x < canvas.width && b.y > 0 && b.y < canvas.height;
    });

    // Particles fade
    particles = particles.filter(p => {
        p.alpha -= 0.02;
        p.x += p.vx;
        p.y += p.vy;
        return p.alpha > 0;
    });
}

function checkCollisions() {
    // Player vs Enemy
    enemies.forEach(e => {
        const dist = Math.hypot(e.x - player.x, e.y - player.y);
        if (dist < player.radius + e.radius) {
            player.hp -= 0.5;
            if (player.hp <= 0) gameOver();
        }
    });

    // Bullet vs Enemy
    bullets.forEach((b, bi) => {
        enemies.forEach((e, ei) => {
            const dist = Math.hypot(e.x - b.x, e.y - b.y);
            if (dist < b.radius + e.radius) {
                e.hp -= b.damage;
                b.toRemove = true;
                if (e.hp <= 0) {
                    killEnemy(ei, e.x, e.y);
                }
            }
        });
    });
    bullets = bullets.filter(b => !b.toRemove);

    // Fire Ring vs Enemy
    if (getSkillLevel('fire') > 0) {
        const angleOffset = Date.now() / 200;
        const numOrbs = getSkillLevel('fire');
        for (let i = 0; i < numOrbs; i++) {
            const orbX = player.x + Math.cos(angleOffset + (i * Math.PI * 2 / numOrbs)) * 100;
            const orbY = player.y + Math.sin(angleOffset + (i * Math.PI * 2 / numOrbs)) * 100;

            enemies.forEach((e, ei) => {
                const dist = Math.hypot(e.x - orbX, e.y - orbY);
                if (dist < 20 + e.radius) {
                    e.hp -= 2; // Tick damage
                    if (e.hp <= 0) killEnemy(ei, e.x, e.y);
                }
            });
        }
    }

    // Player vs Gem
    gems.forEach((g, gi) => {
        const dist = Math.hypot(g.x - player.x, g.y - player.y);
        if (dist < player.radius + 15) {
            collectGem(gi);
        } else if (dist < 150) { // Magnet effect
            const angle = Math.atan2(player.y - g.y, player.x - g.x);
            g.x += Math.cos(angle) * 5;
            g.y += Math.sin(angle) * 5;
        }
    });
}

function killEnemy(index, x, y) {
    createParticles(x, y, '#e74c3c');
    enemies.splice(index, 1);
    kills++;
    gems.push({ x, y });
}

function collectGem(index) {
    gems.splice(index, 1);
    player.exp += CONFIG.gemExp;
    if (player.exp >= player.expToNext) {
        levelUp();
    }
}

function levelUp() {
    player.exp -= player.expToNext;
    player.level++;
    player.expToNext = Math.floor(player.expToNext * 1.2);

    gameState = 'LEVEL_UP';
    showLevelUpScreen();
}

function showLevelUpScreen() {
    const screen = document.getElementById('level-up-screen');
    const container = document.getElementById('skill-options');
    container.innerHTML = '';

    // Pick 3 random skills
    const options = [...SKILLS].sort(() => 0.5 - Math.random()).slice(0, 3);

    options.forEach(skill => {
        const card = document.createElement('div');
        card.className = 'skill-card';
        card.innerHTML = `
            <div class="skill-icon">${skill.icon}</div>
            <div class="skill-info">
                <h4>${skill.name} (Lv.${skill.level + 1})</h4>
                <p>${skill.desc}</p>
            </div>
        `;
        card.onclick = () => selectSkill(skill.id);
        container.appendChild(card);
    });

    screen.classList.remove('hidden');
}

function selectSkill(id) {
    const skill = SKILLS.find(s => s.id === id);
    skill.level++;

    if (id === 'speed') player.speed += 0.5;
    if (id === 'atk') { } // Handled globally

    document.getElementById('level-up-screen').classList.add('hidden');
    gameState = 'PLAYING';
}

function getSkillLevel(id) {
    return SKILLS.find(s => s.id === id).level;
}

function gameOver() {
    gameState = 'OVER';
    document.getElementById('game-over-screen').classList.remove('hidden');
    const timeStr = document.getElementById('time').textContent;
    document.getElementById('final-stats').textContent = `Kills: ${kills} | Time: ${timeStr}`;
}

// --- Drawing ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid (Ground)
    drawGrid();

    // Gems
    gems.forEach(g => {
        ctx.fillStyle = '#00f2fe';
        ctx.beginPath();
        ctx.arc(g.x, g.y, 4, 0, Math.PI * 2);
        ctx.fill();
        // Glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00f2fe';
        ctx.stroke();
        ctx.shadowBlur = 0;
    });

    // Particles
    particles.forEach(p => {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Enemies
    enemies.forEach(e => {
        ctx.fillStyle = '#1e272e';
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
        // Red Eyes
        ctx.fillStyle = '#ff3131';
        ctx.beginPath();
        ctx.arc(e.x - 4, e.y - 2, 2, 0, Math.PI * 2);
        ctx.arc(e.x + 4, e.y - 2, 2, 0, Math.PI * 2);
        ctx.fill();
    });

    // Bullets
    bullets.forEach(b => {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    // Fire Ring
    if (getSkillLevel('fire') > 0) {
        const angleOffset = Date.now() / 200;
        const numOrbs = getSkillLevel('fire');
        for (let i = 0; i < numOrbs; i++) {
            const orbX = player.x + Math.cos(angleOffset + (i * Math.PI * 2 / numOrbs)) * 100;
            const orbY = player.y + Math.sin(angleOffset + (i * Math.PI * 2 / numOrbs)) * 100;

            ctx.fillStyle = '#ff9f43';
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ff3131';
            ctx.beginPath();
            ctx.arc(orbX, orbY, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    // Player
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();
    // Scarf/Detail
    ctx.fillStyle = '#eb4d4b';
    ctx.fillRect(player.x - 10, player.y + 5, 20, 10);
}

function drawGrid() {
    const size = 100;
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += size) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += size) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
}

// --- Helpers ---
function createParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            alpha: 1,
            color,
            size: Math.random() * 3 + 2
        });
    }
}

function updateHUD() {
    // Level Bar
    const expPercent = (player.exp / player.expToNext) * 100;
    document.getElementById('level-fill').style.width = expPercent + '%';
    document.getElementById('level-text').textContent = `Level ${player.level}`;

    // Stats
    document.getElementById('kills').textContent = `Kills: ${kills}`;

    // Time
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const s = (elapsed % 60).toString().padStart(2, '0');
    document.getElementById('time').textContent = `${m}:${s}`;

    // HP
    const hpPercent = (player.hp / CONFIG.maxHp) * 100;
    document.getElementById('hp-fill').style.width = hpPercent + '%';
}

init();
