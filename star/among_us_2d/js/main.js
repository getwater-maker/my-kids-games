const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// --- Config ---
const WORLD_WIDTH = 3000;
const WORLD_HEIGHT = 2000;
const PLAYER_SPEED = 6;
const IMPOSTOR_SPEED = 4.5;
const TOTAL_PLAYERS = 17; // Now 17 players total
const TASK_COUNT_GOAL = 15;
const KILL_COOLDOWN_MAX = 30; // Seconds between kills

// --- State ---
let camera = { x: 0, y: 0 };
let player = {
    x: 1500, // Center of Cafeteria
    y: 450,  // Inside Cafeteria
    radius: 25,
    color: '#0984e3', // Default Blue
    role: 'CREWMATE',
    tasksDone: 0,
    kills: 0,
    killCooldown: 0
};

let impostors = []; // AI Impostors
let crewmates = []; // AI Crewmates
let tasks = [];
let allNPCs = [];

let gameState = 'START'; 
const keys = {};

// --- Map Data (The Skeld) ---
const ROOMS = [
    { name: 'CAFETERIA', x: 1200, y: 200, w: 600, h: 500, color: '#34495e' },
    { name: 'UPPER ENGINE', x: 400, y: 200, w: 300, h: 300, color: '#34495e' },
    { name: 'MEDBAY', x: 800, y: 400, w: 300, h: 300, color: '#34495e' },
    { name: 'REACTOR', x: 100, y: 800, w: 250, h: 400, color: '#34495e' },
    { name: 'SECURITY', x: 500, y: 800, w: 200, h: 250, color: '#34495e' },
    { name: 'LOWER ENGINE', x: 400, y: 1500, w: 300, h: 300, color: '#34495e' },
    { name: 'ELECTRICAL', x: 800, y: 1200, w: 300, h: 400, color: '#34495e' },
    { name: 'STORAGE', x: 1250, y: 1400, w: 500, h: 500, color: '#1a1a1a' },
    { name: 'ADMIN', x: 1900, y: 1000, w: 300, h: 300, color: '#34495e' },
    { name: 'COMMUNICATIONS', x: 1800, y: 1600, w: 250, h: 200, color: '#34495e' },
    { name: 'O2', x: 1900, y: 550, w: 200, h: 200, color: '#34495e' },
    { name: 'WEAPONS', x: 2100, y: 200, w: 400, h: 300, color: '#34495e' },
    { name: 'SHIELDS', x: 2100, y: 1400, w: 400, h: 400, color: '#34495e' },
    { name: 'NAVIGATION', x: 2600, y: 700, w: 300, h: 500, color: '#34495e' }
];

// Corridors/Halls
const HALLS = [
    { x: 700, y: 300, w: 500, h: 100 }, // Top Left Hall
    { x: 1800, y: 300, w: 300, h: 100 }, // Top Right Hall
    { x: 500, y: 500, w: 100, h: 1000 }, // West Hall
    { x: 500, y: 950, w: 700, h: 100 }, // Reactor Hall
    { x: 1100, y: 1100, w: 150, h: 500 }, // Electrical Hall
    { x: 1700, y: 700, w: 900, h: 100 }, // East Hall
    { x: 1750, y: 1500, w: 350, h: 100 }, // South East Hall
    { x: 2250, y: 500, w: 100, h: 900 }, // East Vertical Hall
];

// --- Initialization ---
function init() {
    setupEntities();
    setupTasks();
    setupEventListeners();
    requestAnimationFrame(gameLoop);
}

function setupEntities() {
    const colors = [
        '#0984e3', '#ff3838', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', 
        '#1abc9c', '#7f8c8d', '#fab1a0', '#55efc4', '#fd79a8', '#e84393', 
        '#1dd1a1', '#5f27cd', '#00d2ff', '#ffaf40', '#32ff7e'
    ];
    
    // Pick 2 random indices from 0 to 16 to be Impostors
    let pool = Array.from({length: TOTAL_PLAYERS}, (_, i) => i);
    let impIndices = [];
    for(let i=0; i<2; i++) {
        const r = Math.floor(Math.random() * pool.length);
        impIndices.push(pool.splice(r, 1)[0]);
    }

    // Set Player Role
    player.color = colors[0];
    player.role = impIndices.includes(0) ? 'IMPOSTOR' : 'CREWMATE';
    updateRoleUI();

    // Create NPCs
    crewmates = [];
    impostors = [];
    for (let i = 1; i < TOTAL_PLAYERS; i++) {
        let npc = {
            id: i,
            x: 1300 + Math.random() * 400, // All spawn in Cafeteria
            y: 300 + Math.random() * 300,
            color: colors[i],
            vx: 0, vy: 0, timer: 0, isDead: false,
            role: impIndices.includes(i) ? 'IMPOSTOR' : 'CREWMATE'
        };
        if (npc.role === 'IMPOSTOR') impostors.push(npc);
        else crewmates.push(npc);
    }
}

function updateRoleUI() {
    const tag = document.getElementById('role-tag');
    if (player.role === 'IMPOSTOR') {
        tag.innerText = "IMPOSTOR";
        tag.className = "imposter";
        document.querySelector('#target-count').innerText = "CREWMATES KILLED";
        document.querySelector('.t-btn .scary-eye').innerText = "🔪";
        document.querySelector('.t-btn span').innerText = "KILL";
    } else {
        tag.innerText = "CREWMATE";
        tag.className = "crewmate";
    }
}

function setupTasks() {
    tasks = [];
    // Distribute 15 tasks across rooms
    ROOMS.forEach((room, idx) => {
        tasks.push({
            id: idx,
            x: room.x + 50 + Math.random() * (room.w - 100),
            y: room.y + 50 + Math.random() * (room.h - 100),
            completed: false
        });
    });
    // Add one more in Cafeteria
    tasks.push({
        id: 14,
        x: ROOMS[0].x + ROOMS[0].w / 2,
        y: ROOMS[0].y + ROOMS[0].h / 2,
        completed: false
    });
}

function setupEventListeners() {
    window.addEventListener('keydown', e => { keys[e.code] = true; });
    window.addEventListener('keyup', e => { keys[e.code] = false; });

    document.getElementById('start-btn').onclick = startGame;
    document.getElementById('win-restart-btn').onclick = () => location.reload();
    document.getElementById('lose-restart-btn').onclick = () => location.reload();

    // UI Button Click Listeners
    document.getElementById('btn-m').onclick = attemptEmergency;
    document.getElementById('btn-t').onclick = attemptTask;

    window.addEventListener('keydown', e => {
        if (gameState !== 'PLAYING') return;
        if (e.code === 'KeyT') attemptTask();
        if (e.code === 'KeyM') attemptEmergency();
    });
}

function startGame() {
    document.getElementById('overlay').classList.add('hidden');
    gameState = 'PLAYING';
}

function attemptTask() {
    if (player.role === 'IMPOSTOR') {
        attemptKill();
        return;
    }
    let taskDoneThisFrame = false;
    tasks.forEach(task => {
        if (!task.completed && !taskDoneThisFrame) {
            const d = Math.hypot(player.x - task.x, player.y - task.y);
            if (d < 60) {
                task.completed = true;
                player.tasksDone++;
                taskDoneThisFrame = true;
                checkWin();
            }
        }
    });
}

function attemptEmergency() {
    if (gameState !== 'PLAYING') return;
    // Only if not moving
    const isMoving = keys['KeyW'] || keys['KeyS'] || keys['KeyA'] || keys['KeyD'] || 
                     keys['ArrowUp'] || keys['ArrowDown'] || keys['ArrowLeft'] || keys['ArrowRight'];
    
    if (isMoving) return;

    // Must be in Cafeteria (Room 0) area to press button
    const caf = ROOMS[0];
    const inCaf = player.x >= caf.x && player.x <= caf.x + caf.w && 
                  player.y >= caf.y && player.y <= caf.y + caf.h;

    if (inCaf && impostors.length > 0) {
        startMeeting();
    }
}

function startMeeting() {
    gameState = 'MEETING';
    const meetingOverlay = document.getElementById('meeting-overlay');
    meetingOverlay.classList.remove('hidden');
    
    // Logic: Vote out one random impostor
    const ejected = impostors.pop();
    
    const statusText = document.getElementById('meeting-status');
    statusText.innerText = "비상 소집! 누군가 임포스터를 목격했습니다...";

    setTimeout(() => {
        statusText.innerText = `${ejected.color === '#ff3838' ? 'Red' : 'Black'}... 그는 임포스터였습니다.`;
        setTimeout(() => {
            meetingOverlay.classList.add('hidden');
            gameState = 'PLAYING';
            if (impostors.length === 0) {
                // All impostors gone - Victory via ejection
                triggerVictory("모든 임포스터를 추방했습니다!");
            }
        }, 2000);
    }, 2000);
}

function triggerVictory(msg) {
    gameState = 'WIN';
    document.getElementById('win-screen').classList.remove('hidden');
    document.querySelector('#win-screen p').innerText = msg;
}

function attemptKill() {
    if (player.killCooldown > 0) return;
    
    let target = null;
    let minDist = 100;

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
        player.kills++;
        player.killCooldown = KILL_COOLDOWN_MAX;
        if (player.kills >= TOTAL_PLAYERS - 2) {
            triggerVictory("모든 시민을 처치했습니다! 임포스터 승리!");
        }
    }
}

function update() {
    if (gameState !== 'PLAYING') return;

    // Player Move
    let nextX = player.x;
    let nextY = player.y;
    if (keys['KeyW'] || keys['ArrowUp']) nextY -= PLAYER_SPEED;
    if (keys['KeyS'] || keys['ArrowDown']) nextY += PLAYER_SPEED;
    if (keys['KeyA'] || keys['ArrowLeft']) nextX -= PLAYER_SPEED;
    if (keys['KeyD'] || keys['ArrowRight']) nextX += PLAYER_SPEED;

    // Wall/Boundary Check
    if (isInsideMap(nextX, nextY)) {
        player.x = nextX;
        player.y = nextY;
    } else {
        // Slide along walls if possible
        if (isInsideMap(nextX, player.y)) player.x = nextX;
        else if (isInsideMap(player.x, nextY)) player.y = nextY;
    }

    // Camera follow
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;
    camera.x = Math.max(0, Math.min(WORLD_WIDTH - canvas.width, camera.x));
    camera.y = Math.max(0, Math.min(WORLD_HEIGHT - canvas.height, camera.y));

    // Cooldown
    if (player.killCooldown > 0) player.killCooldown -= 1/60;

    // Update NPCs
    [...crewmates, ...impostors].forEach(npc => {
        if (npc.isDead) return;
        
        npc.timer--;
        if (npc.timer <= 0) {
            const angle = Math.random() * Math.PI * 2;
            npc.vx = Math.cos(angle) * (npc.name ? IMPOSTOR_SPEED : 2);
            npc.vy = Math.sin(angle) * (npc.name ? IMPOSTOR_SPEED : 2);
            npc.timer = 60 + Math.random() * 120;
        }

        let nx = npc.x + npc.vx;
        let ny = npc.y + npc.vy;

        if (isInsideMap(nx, ny)) {
            npc.x = nx;
            npc.y = ny;
        } else {
            npc.timer = 0; // Redirect next frame
        }

        // Impostor Kill Logic
        if (npc.name && gameState === 'PLAYING') {
            const dist = Math.hypot(player.x - npc.x, player.y - npc.y);
            if (dist < 50) {
                gameState = 'LOSE';
                document.getElementById('lose-screen').classList.remove('hidden');
            }
        }
    });

    updateUI();
}

function isInsideMap(x, y) {
    if (x < 0 || x > WORLD_WIDTH || y < 0 || y > WORLD_HEIGHT) return false;
    
    // Check if within any Room or Hall
    let inside = false;
    ROOMS.forEach(r => {
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) inside = true;
    });
    HALLS.forEach(h => {
        if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) inside = true;
    });
    return inside;
}

function updateUI() {
    if (player.role === 'CREWMATE') {
        document.getElementById('task-completed').textContent = player.tasksDone;
        const progress = (player.tasksDone / TASK_COUNT_GOAL) * 100;
        document.getElementById('mission-fill').style.width = progress + '%';
    } else {
        document.getElementById('task-completed').textContent = player.kills;
        document.getElementById('total-tasks').textContent = (TOTAL_PLAYERS - 2);
        document.getElementById('mission-fill').style.width = (player.kills / (TOTAL_PLAYERS - 2)) * 100 + '%';
    }

    // Interaction prompt
    let canInteract = false;
    tasks.forEach(t => {
        if (!t.completed && Math.hypot(player.x - t.x, player.y - t.y) < 60) canInteract = true;
    });
    document.getElementById('interaction-prompt').classList.toggle('hidden', !canInteract);
}

function checkWin() {
    if (player.tasksDone >= TASK_COUNT_GOAL) {
        gameState = 'WIN';
        document.getElementById('win-screen').classList.remove('hidden');
    }
}

function draw() {
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    
    ctx.clearRect(camera.x, camera.y, canvas.width, canvas.height);

    // Background (Deep Space)
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Halls (Blue-ish gray corridors)
    ctx.fillStyle = '#2c3e50';
    HALLS.forEach(h => ctx.fillRect(h.x, h.y, h.w, h.h));

    // Rooms (Dark boxes)
    ROOMS.forEach(r => {
        ctx.fillStyle = r.color;
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 10;
        ctx.strokeRect(r.x, r.y, r.w, r.h);

        // Room Labels
        ctx.fillStyle = '#7f8c8d';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(r.name, r.x + r.w / 2, r.y + 40);
    });

    // Tasks (Yellow pads)
    tasks.forEach(t => {
        if (!t.completed) {
            ctx.fillStyle = '#f1c40f';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#f1c40f';
            ctx.beginPath();
            ctx.rect(t.x - 15, t.y - 15, 30, 30);
            ctx.fill();
            ctx.shadowBlur = 0;
            
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px Arial';
            ctx.fillText("MISSION", t.x, t.y - 25);
        }
    });

    // Crewmates NPCs
    crewmates.forEach(c => {
        if (c.isDead) {
            ctx.fillStyle = c.color;
            ctx.fillRect(c.x - 20, c.y, 40, 10);
        } else {
            drawCharacter(c.x, c.y, c.color);
        }
    });

    // Impostors NPCs
    impostors.forEach(imp => {
        drawCharacter(imp.x, imp.y, imp.color, false, true);
    });

    // Player
    drawCharacter(player.x, player.y, player.color, true);

    ctx.restore();
}

function drawCharacter(x, y, color, isPlayer = false, isImpostor = false) {
    // Suit
    ctx.fillStyle = color;
    ctx.beginPath();
    // Suit body
    roundRect(ctx, x - 20, y - 25, 40, 50, 15);
    ctx.fill();

    // Visor
    ctx.fillStyle = '#81ecec';
    ctx.beginPath();
    roundRect(ctx, x - 10, y - 17, 28, 18, 8);
    ctx.fill();

    // Backpack
    ctx.fillStyle = color;
    ctx.beginPath();
    roundRect(ctx, x - 32, y - 10, 15, 30, 5);
    ctx.fill();

    if (isPlayer) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();
    }
}

// Helper for round rectangles since some browsers need it polyfilled or manual
function roundRect(ctx, x, y, width, height, radius) {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

init();
