const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const uiStageNum = document.getElementById('stage-num');
const uiGameOver = document.getElementById('game-over');
const uiGameClear = document.getElementById('game-clear');
const uiRetryBtn = document.getElementById('retry-btn');
const uiEndMsg = document.getElementById('end-message');

// Game State
let gameState = 'START'; // START, PLAYING, GAMEOVER, CLEAR
let currentStage = 1;
const MAX_STAGE = 10;
let cameraX = 0;
let animationId;

// Input
const keys = {
    w: false, a: false, s: false, d: false,
    ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false,
    Space: false
};

// --- Entities ---
const player = {
    x: 100,
    y: 300,
    width: 40,
    height: 40,
    vx: 0,
    vy: 0,
    speed: 5,
    jumpPower: -12,
    gravity: 0.6,
    isGrounded: false,
    jumpCount: 0,
    maxJumps: 3,
    color: '#ffb6c1' // Pink Thief
};

const police = {
    active: false,
    x: -100,
    y: 300,
    width: 40,
    height: 40,
    vx: 0,
    vy: 0,
    speed: 3.5, // Slightly slower than player so they have a chance
    gravity: 0.6,
    isGrounded: false,
    color: '#0277bd' // Blue Cop
};

// Level Data
let platforms = [];
let goal = null;

// --- Initialization ---

function init() {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    uiRetryBtn.addEventListener('click', resetGame);

    resetGame();
}

function resetGame() {
    // Checkpoint system: Do not reset currentStage to 1
    uiStageNum.textContent = currentStage;
    uiGameOver.classList.add('hidden');
    uiGameClear.classList.add('hidden');

    startStage(currentStage);
    gameState = 'PLAYING';

    if (animationId) cancelAnimationFrame(animationId);
    gameLoop();
}

function startStage(stageNum) {
    player.x = 100;
    player.y = 100;
    player.vx = 0;
    player.vy = 0;
    cameraX = 0;

    // Police gets faster and spawns closer as stages progress
    police.active = true;
    police.x = -150 + (stageNum * 10);
    police.y = 100;
    police.vx = 0;
    police.vy = 0;
    police.speed = 3.2 + (stageNum * 0.15);

    generateLevel(stageNum);
}

// --- Level Generation ---

function generateLevel(stageNum) {
    platforms = [];

    // Starting platform
    platforms.push({ x: 0, y: 500, w: 400, h: 100, color: '#27ae60' });

    let currentX = 400;
    const levelLength = 2000 + (stageNum * 500); // Levels get longer

    while (currentX < levelLength) {
        // Gap
        const gap = 50 + Math.random() * (50 + stageNum * 10);
        currentX += gap;

        // Platform
        const platW = 150 + Math.random() * 200;
        const platH = 40 + Math.random() * 300; // Varying heights
        const yPos = 600 - platH;

        platforms.push({ x: currentX, y: yPos, w: platW, h: platH, color: '#27ae60' });
        currentX += platW;
    }

    // Goal at the end
    goal = {
        x: currentX + 100,
        y: 400,
        w: 80,
        h: 100,
        isCar: stageNum === MAX_STAGE
    };

    // End platform under goal
    platforms.push({ x: currentX, y: 500, w: 500, h: 100, color: '#27ae60' });
}

// --- Input Handling ---

function onKeyDown(e) {
    if (gameState !== 'PLAYING') return;
    if (keys.hasOwnProperty(e.key) || e.key === ' ') {
        if (e.key === ' ') keys['Space'] = true;
        else keys[e.key] = true;

        // Trigger jump immediately on key down to prevent holding consuming multiple jumps
        if (e.key === 'w' || e.key === 'ArrowUp' || e.key === ' ') {
            if (player.jumpCount < player.maxJumps) {
                player.vy = player.jumpPower;
                player.isGrounded = false;
                player.jumpCount++;
            }
        }
    }
}

function onKeyUp(e) {
    if (keys.hasOwnProperty(e.key) || e.key === ' ') {
        if (e.key === ' ') keys['Space'] = false;
        else keys[e.key] = false;
    }
}

// --- Physics & Logic ---

function update() {
    if (gameState !== 'PLAYING') return;

    // 1. Player Movement
    if (keys.a || keys.ArrowLeft) player.vx = -player.speed;
    else if (keys.d || keys.ArrowRight) player.vx = player.speed;
    else player.vx = 0;

    // Apply Gravity
    player.vy += player.gravity;

    // Apply Velocity
    player.x += player.vx;
    player.y += player.vy;

    // Boundary check (left)
    if (player.x < cameraX) player.x = cameraX;

    // Platform Collision (Player)
    player.isGrounded = false;
    handlePlatformCollision(player);

    // Fall death
    if (player.y > canvas.height + 100) {
        triggerGameOver("떨어져서 체포되었습니다!");
        return;
    }

    // Camera follow
    if (player.x > cameraX + 300) {
        cameraX = player.x - 300;
    }

    // 2. Police AI (Chaser)
    if (police.active) {
        // Move towards player
        if (police.x < player.x - 10) police.vx = police.speed;
        else if (police.x > player.x + 10) police.vx = -police.speed;
        else police.vx = 0;

        // Auto jump if blocked or player is higher
        if (police.isGrounded && (player.y < police.y - 20 || police.vx === 0 && Math.abs(player.x - police.x) > 50)) {
            police.vy = player.jumpPower * 0.9; // Slightly weaker jump
            police.isGrounded = false;
        }

        police.vy += police.gravity;
        police.x += police.vx;
        police.y += police.vy;

        police.isGrounded = false;
        handlePlatformCollision(police);

        // Fall handling for police (respawn behind player)
        if (police.y > canvas.height + 100) {
            police.y = player.y - 100;
            police.x = player.x - 400; // Teleport behind
            police.vy = 0;
        }

        // Catch logic
        if (checkRectCollision(player, police)) {
            triggerGameOver("경찰에 체포되었습니다!");
            return;
        }
    }

    // 3. Goal Collision
    if (checkRectCollision(player, goal)) {
        if (currentStage === MAX_STAGE) {
            triggerGameClear();
        } else {
            currentStage++;
            uiStageNum.textContent = currentStage;
            startStage(currentStage);
        }
    }
}

function handlePlatformCollision(entity) {
    for (let p of platforms) {
        // Simple AABB collision
        if (entity.x < p.x + p.w &&
            entity.x + entity.width > p.x &&
            entity.y < p.y + p.h &&
            entity.y + entity.height > p.y) {

            // Resolve collision (prioritize resolving Y axis for landing)
            const overlapX = Math.min(entity.x + entity.width - p.x, p.x + p.w - entity.x);
            const overlapY = Math.min(entity.y + entity.height - p.y, p.y + p.h - entity.y);

            if (overlapY < overlapX) {
                if (entity.vy > 0) { // Landing on top
                    entity.y = p.y - entity.height;
                    entity.vy = 0;
                    entity.isGrounded = true;
                    if (entity === player) {
                        player.jumpCount = 0; // Reset triple jump on land
                    }
                } else if (entity.vy < 0) { // Hitting head
                    entity.y = p.y + p.h;
                    entity.vy = 0;
                }
            } else {
                // Horizontal collision
                if (entity.vx > 0) { // Hitting right side
                    entity.x = p.x - entity.width;
                    entity.vx = 0;
                } else if (entity.vx < 0) { // Hitting left side
                    entity.x = p.x + p.w;
                    entity.vx = 0;
                }
            }
        }
    }
}

function checkRectCollision(r1, r2) {
    return r1.x < r2.x + r2.w &&
        r1.x + r1.width > r2.x &&
        r1.y < r2.y + r2.h &&
        r1.y + r1.height > r2.y;
}

// --- Drawing ---

function draw() {
    // Clear screen (Sky)
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-cameraX, 0); // Apply camera offset

    // Draw Platforms
    for (let p of platforms) {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.w, p.h);
        // Dirt under grass
        ctx.fillStyle = '#8e44ad'; // Purple dirt for kirby feel
        ctx.fillRect(p.x, p.y + 20, p.w, p.h - 20);
    }

    // Draw Goal
    if (goal) {
        if (goal.isCar) {
            // Draw Getaway Car
            ctx.fillStyle = '#e74c3c'; // Red car
            ctx.fillRect(goal.x, goal.y + 40, goal.w, 60);
            ctx.fillStyle = '#c0392b';
            ctx.fillRect(goal.x + 10, goal.y, goal.w - 20, 40); // Roof
            // Windows
            ctx.fillStyle = '#ecf0f1';
            ctx.fillRect(goal.x + 15, goal.y + 5, 20, 30);
            ctx.fillRect(goal.x + 45, goal.y + 5, 20, 30);
            // Wheels
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(goal.x + 20, goal.y + 100, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(goal.x + 60, goal.y + 100, 15, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Draw Door
            ctx.fillStyle = '#8d6e63';
            ctx.fillRect(goal.x, goal.y, goal.w, goal.h);
            ctx.fillStyle = '#f1c40f'; // Doorknob
            ctx.beginPath();
            ctx.arc(goal.x + goal.w - 15, goal.y + goal.h / 2, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Draw Police Kirby
    if (police.active) {
        drawKirbyCop(police.x, police.y);
    }

    // Draw Player (Thief Kirby)
    drawKirbyThief(player.x, player.y);

    ctx.restore();
}

function drawKirbyThief(x, y) {
    const cx = x + player.width / 2;
    const cy = y + player.height / 2;
    const r = player.width / 2;

    // Body
    ctx.fillStyle = '#ffb6c1';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Thief Eye Mask
    ctx.fillStyle = '#333';
    ctx.fillRect(cx - 15, cy - 10, 30, 10);

    // Eyes
    ctx.fillStyle = 'white';
    ctx.fillRect(cx - 10, cy - 8, 4, 6);
    ctx.fillRect(cx + 6, cy - 8, 4, 6);

    // Thief Sack (on back)
    ctx.fillStyle = '#bdc3c7'; // Gray sack
    ctx.beginPath();
    ctx.arc(cx - 15, cy + 5, 12, 0, Math.PI * 2);
    ctx.fill();
    // Money sign
    ctx.fillStyle = '#2c3e50';
    ctx.font = '12px Arial';
    ctx.fillText('$', cx - 18, cy + 9);
}

function drawKirbyCop(x, y) {
    const cx = x + police.width / 2;
    const cy = y + police.height / 2;
    const r = police.width / 2;

    // Body
    ctx.fillStyle = '#81d4fa'; // Light blue body
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Eyes (Angry)
    ctx.fillStyle = 'black';
    ctx.fillRect(cx - 8, cy - 5, 4, 10);
    ctx.fillRect(cx + 4, cy - 5, 4, 10);
    // Angry eyebrows
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy - 10);
    ctx.lineTo(cx - 4, cy - 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 12, cy - 10);
    ctx.lineTo(cx + 4, cy - 5);
    ctx.stroke();

    // Police Hat
    ctx.fillStyle = '#1565c0'; // Dark blue hat
    ctx.fillRect(cx - 15, cy - r - 8, 30, 10);
    ctx.fillStyle = '#212121'; // Hat brim
    ctx.fillRect(cx - 20, cy - r + 2, 40, 4);
    // Badge
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.arc(cx, cy - r - 3, 4, 0, Math.PI * 2);
    ctx.fill();
}

// --- Game Loop ---

function gameLoop() {
    update();
    draw();
    animationId = requestAnimationFrame(gameLoop);
}

function triggerGameOver(msg) {
    gameState = 'GAMEOVER';
    uiEndMsg.textContent = msg;
    uiGameOver.classList.remove('hidden');
}

function triggerGameClear() {
    gameState = 'CLEAR';
    uiGameClear.classList.remove('hidden');
}

// Start immediately loading
window.onload = init;
