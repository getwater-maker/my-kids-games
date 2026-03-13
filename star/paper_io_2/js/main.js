// Paper.io 2 Clone JS Implementation
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- Config & Engine ---
const GRID_SIZE = 2000;
const TILE_SIZE = 10;
const PLAYER_SPEED = 3;
const COLORS = ['#00d2ff', '#ff3e3e', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22'];

// Game State
let player = {
    x: 100,
    y: 100,
    vx: PLAYER_SPEED,
    vy: 0,
    color: COLORS[0],
    trail: [],
    captured: [], // List of [x, y] cells
    isDead: false
};

let bots = [];
let grid = []; // 2D array of owners (0 for neutral, 1 for player, etc.)
let gameState = 'START'; // START, PLAYING, OVER

// --- Initialization ---
function init() {
    setupGrid();
    setupPlayer();
    setupBots();
    setupEventListeners();
    requestAnimationFrame(gameLoop);
}

function setupGrid() {
    grid = [];
    for (let x = 0; x < GRID_SIZE; x += TILE_SIZE) {
        grid[x] = [];
        for (let y = 0; y < GRID_SIZE; y += TILE_SIZE) {
            grid[x][y] = 0; // Neutral
        }
    }
}

function setupPlayer() {
    player.x = 200;
    player.y = 200;
    player.vx = PLAYER_SPEED;
    player.vy = 0;
    player.trail = [];
    player.captured = [];

    // Initial territory
    for (let i = -3; i <= 3; i++) {
        for (let j = -3; j <= 3; j++) {
            captureCell(player.x + i * TILE_SIZE, player.y + j * TILE_SIZE, 1);
        }
    }
}

function setupBots() {
    bots = [];
    for (let i = 0; i < 5; i++) {
        const bx = 400 + Math.random() * (GRID_SIZE - 800);
        const by = 400 + Math.random() * (GRID_SIZE - 800);
        bots.push({
            id: i + 2,
            x: bx,
            y: by,
            vx: PLAYER_SPEED,
            vy: 0,
            color: COLORS[(i + 1) % COLORS.length],
            trail: [],
            captured: [],
            isDead: false
        });

        // Initial bot territory
        for (let x = -3; x <= 3; x++) {
            for (let y = -3; y <= 3; y++) {
                captureCell(bx + x * TILE_SIZE, by + y * TILE_SIZE, i + 2);
            }
        }
    }
}

function captureCell(x, y, ownerId) {
    const rx = Math.floor(x / TILE_SIZE) * TILE_SIZE;
    const ry = Math.floor(y / TILE_SIZE) * TILE_SIZE;
    if (grid[rx] && grid[rx][ry] !== undefined) {
        grid[rx][ry] = ownerId;
    }
}

function setupEventListeners() {
    window.addEventListener('keydown', (e) => {
        if (gameState !== 'PLAYING') return;
        if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && player.vx === 0) { player.vx = -PLAYER_SPEED; player.vy = 0; }
        if ((e.code === 'ArrowRight' || e.code === 'KeyD') && player.vx === 0) { player.vx = PLAYER_SPEED; player.vy = 0; }
        if ((e.code === 'ArrowUp' || e.code === 'KeyW') && player.vy === 0) { player.vy = -PLAYER_SPEED; player.vx = 0; }
        if ((e.code === 'ArrowDown' || e.code === 'KeyS') && player.vy === 0) { player.vy = PLAYER_SPEED; player.vx = 0; }
    });

    document.getElementById('start-btn').onclick = () => {
        document.getElementById('overlay').classList.add('hidden');
        gameState = 'PLAYING';
    };

    document.getElementById('restart-btn').onclick = () => location.reload();
}

// --- Loop ---
function update() {
    if (gameState !== 'PLAYING') return;

    moveEntity(player, 1);
    bots.forEach(bot => {
        if (!bot.isDead) {
            updateBotAI(bot);
            moveEntity(bot, bot.id);
        }
    });

    checkCollisions();
    updateUI();
}

function moveEntity(ent, id) {
    const prevX = ent.x;
    const prevY = ent.y;
    ent.x += ent.vx;
    ent.y += ent.vy;

    // Boundary check
    ent.x = Math.max(0, Math.min(GRID_SIZE - TILE_SIZE, ent.x));
    ent.y = Math.max(0, Math.min(GRID_SIZE - TILE_SIZE, ent.y));

    const rx = Math.floor(ent.x / TILE_SIZE) * TILE_SIZE;
    const ry = Math.floor(ent.y / TILE_SIZE) * TILE_SIZE;

    if (grid[rx] && grid[rx][ry] === id) {
        // Inside our territory, close trail if we have one
        if (ent.trail.length > 0) {
            fillArea(id, ent.trail);
            ent.trail = [];
        }
    } else {
        // Recording trail
        const last = ent.trail[ent.trail.length - 1];
        if (!last || last.x !== rx || last.y !== ry) {
            ent.trail.push({ x: rx, y: ry });
        }
    }
}

function fillArea(ownerId, trail) {
    // 1. Mark trail as captured
    trail.forEach(cell => {
        captureCell(cell.x, cell.y, ownerId);
    });

    // 2. Flood fill from edges to find "outside" area
    const isOutside = {}; // Use object for sparse or fast 2D mapping
    const queue = [];

    // Add all edge tiles to queue if they are not owned by ownerId
    for (let x = 0; x < GRID_SIZE; x += TILE_SIZE) {
        // Top edge
        if (grid[x][0] !== ownerId) {
            if (!isOutside[x]) isOutside[x] = {};
            isOutside[x][0] = true;
            queue.push({ x, y: 0 });
        }
        // Bottom edge
        const bottom = GRID_SIZE - TILE_SIZE;
        if (grid[x][bottom] !== ownerId) {
            if (!isOutside[x]) isOutside[x] = {};
            isOutside[x][bottom] = true;
            queue.push({ x, y: bottom });
        }
    }
    for (let y = 0; y < GRID_SIZE; y += TILE_SIZE) {
        // Left edge
        if (grid[0][y] !== ownerId) {
            if (!isOutside[0]) isOutside[0] = {};
            if (!isOutside[0][y]) {
                isOutside[0][y] = true;
                queue.push({ x: 0, y });
            }
        }
        // Right edge
        const right = GRID_SIZE - TILE_SIZE;
        if (grid[right][y] !== ownerId) {
            if (!isOutside[right]) isOutside[right] = {};
            if (!isOutside[right][y]) {
                isOutside[right][y] = true;
                queue.push({ x: right, y });
            }
        }
    }

    // Standard BFS flood fill
    let head = 0;
    while (head < queue.length) {
        const { x, y } = queue[head++];
        const directions = [
            { dx: TILE_SIZE, dy: 0 },
            { dx: -TILE_SIZE, dy: 0 },
            { dx: 0, dy: TILE_SIZE },
            { dx: 0, dy: -TILE_SIZE }
        ];

        for (const dir of directions) {
            const nx = x + dir.dx;
            const ny = y + dir.dy;

            if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
                if (grid[nx][ny] !== ownerId && (!isOutside[nx] || !isOutside[nx][ny])) {
                    if (!isOutside[nx]) isOutside[nx] = {};
                    isOutside[nx][ny] = true;
                    queue.push({ x: nx, y: ny });
                }
            }
        }
    }

    // 3. Capture everything that is NOT outside and NOT already owned
    for (let x = 0; x < GRID_SIZE; x += TILE_SIZE) {
        for (let y = 0; y < GRID_SIZE; y += TILE_SIZE) {
            if (grid[x][y] !== ownerId && (!isOutside[x] || !isOutside[x][y])) {
                grid[x][y] = ownerId;
            }
        }
    }
}

function updateBotAI(bot) {
    // Random direction changes
    if (Math.random() < 0.02) {
        const vertical = Math.random() > 0.5;
        if (vertical && bot.vx !== 0) {
            bot.vy = Math.random() > 0.5 ? PLAYER_SPEED : -PLAYER_SPEED;
            bot.vx = 0;
        } else if (!vertical && bot.vy !== 0) {
            bot.vx = Math.random() > 0.5 ? PLAYER_SPEED : -PLAYER_SPEED;
            bot.vy = 0;
        }
    }
}

function checkCollisions() {
    // Collision with trails
    const allEnts = [player, ...bots];

    allEnts.forEach(ent => {
        if (ent.isDead) return;

        const headX = Math.floor(ent.x / TILE_SIZE) * TILE_SIZE;
        const headY = Math.floor(ent.y / TILE_SIZE) * TILE_SIZE;

        allEnts.forEach(other => {
            if (other.isDead) return;
            other.trail.forEach((tCell, idx) => {
                // If head hits trail
                if (headX === tCell.x && headY === tCell.y) {
                    // Self-collision 
                    if (ent === other && idx < other.trail.length - 5) {
                        die(ent);
                    } else if (ent !== other) {
                        die(other); // Hit other's trail
                    }
                }
            });
        });

        // Kill other by head-on is not implemented, just trail hits
    });
}

function die(ent) {
    ent.isDead = true;
    ent.trail = [];
    if (ent === player) {
        gameState = 'OVER';
        document.getElementById('game-over').classList.remove('hidden');
        document.getElementById('final-area').textContent = calculateArea(1);
    }
}

function calculateArea(id) {
    let count = 0;
    for (let x = 0; x < GRID_SIZE; x += TILE_SIZE) {
        for (let y = 0; y < GRID_SIZE; y += TILE_SIZE) {
            if (grid[x][y] === id) count++;
        }
    }
    const total = (GRID_SIZE / TILE_SIZE) ** 2;
    return ((count / total) * 100).toFixed(2);
}

function updateUI() {
    const playerArea = calculateArea(1);
    document.getElementById('area-val').textContent = playerArea;
}

// --- Drawing ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Camera follow (Centered on player)
    ctx.save();
    ctx.translate(canvas.width / 2 - player.x, canvas.height / 2 - player.y);

    // Draw Map Grid
    ctx.fillStyle = '#ddd';
    ctx.fillRect(0, 0, GRID_SIZE, GRID_SIZE);

    // Draw Captured Areas
    for (let x = 0; x < GRID_SIZE; x += TILE_SIZE) {
        for (let y = 0; y < GRID_SIZE; y += TILE_SIZE) {
            if (grid[x][y] !== 0) {
                const id = grid[x][y];
                ctx.fillStyle = id === 1 ? COLORS[0] : COLORS[(id - 1) % COLORS.length];
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    // Draw Entity Trails
    [player, ...bots].forEach(ent => {
        if (ent.isDead) return;
        ctx.fillStyle = ent.color + '44'; // Semi-transparent
        ent.trail.forEach(cell => {
            ctx.fillRect(cell.x, cell.y, TILE_SIZE, TILE_SIZE);
        });
    });

    // Draw Entities
    [player, ...bots].forEach(ent => {
        if (ent.isDead) return;
        ctx.fillStyle = ent.color;
        ctx.fillRect(ent.x - 2, ent.y - 2, TILE_SIZE + 4, TILE_SIZE + 4);
    });

    ctx.restore();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

init();
