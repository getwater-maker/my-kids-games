const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- Config ---
const PLAYER_SPEED = 4;
const NPC_COUNT = 6;
const KILL_RANGE = 80;
const VISION_RANGE = 250;
const KILL_COOLDOWN = 10; // seconds

// --- State ---
let player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 25,
    color: '#ff3838', // Red (Impostor)
    isVenting: false,
    killCooldown: 0
};

let crewmates = [];
let vents = [
    { x: 200, y: 200 },
    { x: canvas.width - 200, y: 200 },
    { x: 200, y: canvas.height - 200 },
    { x: canvas.width - 200, y: canvas.height - 200 }
];

let kills = 0;
let gameState = 'START'; // START, PLAYING, WIN, LOSE

const keys = {};

// --- Initialization ---
function init() {
    setupCrewmates();
    setupEventListeners();
    requestAnimationFrame(gameLoop);
}

function setupCrewmates() {
    crewmates = [];
    const colors = ['#0984e3', '#f1c40f', '#00cec9', '#6c5ce7', '#fab1a0', '#55efc4'];
    for (let i = 0; i < NPC_COUNT; i++) {
        crewmates.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: 25,
            color: colors[i % colors.length],
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            isDead: false,
            timer: 0
        });
    }
}

function setupEventListeners() {
    window.addEventListener('keydown', e => { keys[e.code] = true; });
    window.addEventListener('keyup', e => { keys[e.code] = false; });

    document.getElementById('start-btn').onclick = startGame;
    document.getElementById('win-restart-btn').onclick = () => location.reload();
    document.getElementById('lose-restart-btn').onclick = () => location.reload();

    window.addEventListener('keydown', e => {
        if (gameState !== 'PLAYING') return;
        if (e.code === 'KeyQ') attemptKill();
        if (e.code === 'KeyE') toggleVent();
    });

    document.getElementById('kill-btn').onclick = attemptKill;
    document.getElementById('vent-btn').onclick = toggleVent;
}

function startGame() {
    document.getElementById('overlay').classList.add('hidden');
    gameState = 'PLAYING';
}

function attemptKill() {
    if (player.isVenting || player.killCooldown > 0) return;

    let target = null;
    let minDist = KILL_RANGE;

    crewmates.forEach(c => {
        if (!c.isDead) {
            const d = Math.hypot(c.x - player.x, c.y - player.y);
            if (d < minDist) {
                minDist = d;
                target = c;
            }
        }
    });

    if (target) {
        target.isDead = true;
        kills++;
        player.killCooldown = KILL_COOLDOWN;
        checkWin();

        // Check if any OTHER crewmate saw the kill
        crewmates.forEach(c => {
            if (!c.isDead && c !== target) {
                const dist = Math.hypot(c.x - player.x, c.y - player.y);
                if (dist < VISION_RANGE) {
                    gameState = 'LOSE';
                    document.getElementById('lose-screen').classList.remove('hidden');
                }
            }
        });
    }
}

function toggleVent() {
    // Check if near a vent to enter
    let nearVent = false;
    vents.forEach(v => {
        if (Math.hypot(v.x - player.x, v.y - player.y) < 60) nearVent = true;
    });

    if (nearVent || player.isVenting) {
        player.isVenting = !player.isVenting;
    }
}

function update() {
    if (gameState !== 'PLAYING') return;

    // Player move
    if (!player.isVenting) {
        if (keys['KeyW'] || keys['ArrowUp']) player.y -= PLAYER_SPEED;
        if (keys['KeyS'] || keys['ArrowDown']) player.y += PLAYER_SPEED;
        if (keys['KeyA'] || keys['ArrowLeft']) player.x -= PLAYER_SPEED;
        if (keys['KeyD'] || keys['ArrowRight']) player.x += PLAYER_SPEED;
    }

    // Keep in bounds
    player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));

    // Cooldown
    if (player.killCooldown > 0) {
        player.killCooldown -= 1 / 60;
    } else {
        player.killCooldown = 0;
    }

    // Update Crewmates (NPCs)
    crewmates.forEach(c => {
        if (!c.isDead) {
            c.x += c.vx;
            c.y += c.vy;
            c.timer--;

            if (c.timer <= 0) {
                c.vx = (Math.random() - 0.5) * 3;
                c.vy = (Math.random() - 0.5) * 3;
                c.timer = 60 + Math.random() * 120;
            }

            // Wall bounce
            if (c.x < c.radius || c.x > canvas.width - c.radius) c.vx *= -1;
            if (c.y < c.radius || c.y > canvas.height - c.radius) c.vy *= -1;
        }
    });

    updateUI();
}

function updateUI() {
    document.getElementById('cooldown-val').textContent = Math.ceil(player.killCooldown);
    document.getElementById('kill-count').textContent = kills;
    document.getElementById('target-count').textContent = NPC_COUNT;

    const killBtn = document.getElementById('kill-btn');
    killBtn.disabled = player.killCooldown > 0 || player.isVenting;
}

function checkWin() {
    if (kills >= NPC_COUNT) {
        gameState = 'WIN';
        document.getElementById('win-screen').classList.remove('hidden');
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background (Ship details)
    ctx.fillStyle = '#1e272e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Vents
    vents.forEach(v => {
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(v.x, v.y, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#00ff00';
        ctx.stroke();
    });

    // Crewmates
    crewmates.forEach(c => {
        if (c.isDead) {
            // Draw bone/body
            ctx.fillStyle = c.color;
            ctx.fillRect(c.x - 20, c.y, 40, 20);
            ctx.fillStyle = '#fff';
            ctx.fillRect(c.x - 5, c.y - 15, 10, 15);
        } else {
            drawCharacter(c.x, c.y, c.color);
        }
    });

    // Player
    if (!player.isVenting) {
        drawCharacter(player.x, player.y, player.color, true);
    }
}

function drawCharacter(x, y, color, isPlayer = false) {
    // Suit
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x - 20, y - 25, 40, 50, 20);
    ctx.fill();

    // Visor
    ctx.fillStyle = '#81ecec';
    ctx.beginPath();
    ctx.roundRect(x - 10, y - 15, 30, 20, 10);
    ctx.fill();

    // Backpack
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x - 30, y - 10, 15, 30, 5);
    ctx.fill();

    if (isPlayer) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

init();
