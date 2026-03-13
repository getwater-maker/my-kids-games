// star/realistic_warfare/js/main.js

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gameState = 'START';
let frameCount = 0;
let selectedMode = 'SOLO';

// Assets (Loaded later if needed, but we simulate realism with code)
const ASSETS = {
    soldier: new Image(),
    ground: new Image()
};
// Updated paths to local assets folder
ASSETS.soldier.src = 'assets/soldier.png';
ASSETS.ground.src = 'assets/ground.png';

const player = {
    x: 400,
    y: 300,
    angle: 0,
    hp: 100,
    speed: 2.5, // Heavier movement
    stamina: 100,
    ammo: 30,
    reserve: 210,
    isReloading: false,
    recoil: 0,
    lastShot: 0,
    inertia: { x: 0, y: 0 },
    team: 1
};

let bullets = [];
let shells = [];
let particles = [];
let enemies = [];
let splatters = [];
const keys = {};

function init() {
    resize();
    spawnEnemies(8);

    window.addEventListener('keydown', e => keys[e.code] = true);
    window.addEventListener('keyup', e => keys[e.code] = false);
    window.addEventListener('mousemove', handleAim);
    window.addEventListener('mousedown', shoot);
    window.addEventListener('keydown', e => {
        if (e.code === 'KeyR') reload();
    });

    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.onclick = (e) => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            selectedMode = e.target.dataset.mode;
        };
    });

    document.getElementById('start-btn').onclick = () => {
        document.getElementById('overlay').classList.add('hidden');
        resetGameWithMode();
        gameState = 'PLAYING';
        gameLoop();
    };

    window.addEventListener('resize', resize);
}

function resetGameWithMode() {
    enemies = [];
    bullets = [];
    splatters = [];
    particles = [];
    player.hp = 100;
    player.ammo = 30;
    player.reserve = 210;
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    spawnEnemies();
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function handleAim(e) {
    if (gameState === 'PLAYING') {
        const dx = e.clientX - player.x;
        const dy = e.clientY - player.y;
        player.angle = Math.atan2(dy, dx);
    }
}

function spawnEnemies() {
    if (selectedMode === 'SOLO') {
        // Player (Team 1) vs 8 Enemies (Team 2)
        for (let i = 0; i < 8; i++) {
            enemies.push(createAgent(Math.random() * canvas.width, Math.random() * canvas.height, 2));
        }
    } else if (selectedMode === 'DUO') {
        // Player + 1 Ally (Team 1) vs 8 Enemies (Team 2)
        enemies.push(createAgent(player.x + 50, player.y + 50, 1)); // Ally
        for (let i = 0; i < 8; i++) {
            enemies.push(createAgent(Math.random() * canvas.width, Math.random() * canvas.height, 2));
        }
    } else if (selectedMode === 'SQUAD') {
        // 4 Squads of 4 (Team 1, 2, 3, 4)
        // Squad 1 (Player's team)
        for (let i = 0; i < 3; i++) {
            enemies.push(createAgent(player.x + Math.random() * 100 - 50, player.y + Math.random() * 100 - 50, 1));
        }
        // Other Squads
        for (let t = 2; t <= 4; t++) {
            const startX = Math.random() * canvas.width;
            const startY = Math.random() * canvas.height;
            for (let i = 0; i < 4; i++) {
                enemies.push(createAgent(startX + Math.random() * 100 - 50, startY + Math.random() * 100 - 50, t));
            }
        }
    }
}

function createAgent(x, y, team) {
    return {
        x, y,
        hp: 100,
        angle: 0,
        state: 'IDLE',
        lastShot: 0,
        team: team,
        recoil: 0,
        target: null,
        lastTargetChange: 0,
        accuracy: 0.6 + Math.random() * 0.2 // Medium difficulty
    };
}

function shoot() {
    if (gameState !== 'PLAYING' || player.ammo <= 0 || player.isReloading) return;
    if (Date.now() - player.lastShot < 100) return; // Fire rate

    player.ammo--;
    player.lastShot = Date.now();
    player.recoil += 0.15; // Realistic kick back

    // M4A1 sound/visual pulse
    const kickX = Math.cos(player.angle) * -5;
    const kickY = Math.sin(player.angle) * -5;
    player.x += kickX;
    player.y += kickY;

    // Bullet with random spread from movement/recoil
    const finalAngle = player.angle + (Math.random() - 0.5) * (player.recoil * 0.5);
    bullets.push({
        x: player.x + Math.cos(player.angle) * 40,
        y: player.y + Math.sin(player.angle) * 40,
        vx: Math.cos(finalAngle) * 35,
        vy: Math.sin(finalAngle) * 35,
        owner: 'player'
    });

    // Shell Ejection
    shells.push({
        x: player.x,
        y: player.y,
        angle: player.angle - Math.PI / 2,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        rot: Math.random() * Math.PI,
        life: 500
    });

    document.getElementById('mag-val').textContent = player.ammo;
}

function reload() {
    if (player.isReloading || player.ammo === 30 || player.reserve <= 0) return;
    player.isReloading = true;
    setTimeout(() => {
        const missing = 30 - player.ammo;
        const add = Math.min(missing, player.reserve);
        player.ammo += add;
        player.reserve -= add;
        player.isReloading = false;
        document.getElementById('mag-val').textContent = player.ammo;
        document.getElementById('reserve-val').textContent = player.reserve;
    }, 2200);
}

function createParticle(x, y, color) {
    for (let i = 0; i < 5; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 1.0,
            color
        });
    }
}

function update() {
    if (gameState !== 'PLAYING') return;

    frameCount++;
    player.recoil *= 0.85; // Recoil recovery

    // Movement with weight
    let targetVX = 0;
    let targetVY = 0;
    if (keys['KeyW']) targetVY -= player.speed;
    if (keys['KeyS']) targetVY += player.speed;
    if (keys['KeyA']) targetVX -= player.speed;
    if (keys['KeyD']) targetVX += player.speed;

    player.inertia.x = player.inertia.x * 0.9 + targetVX * 0.1;
    player.inertia.y = player.inertia.y * 0.9 + targetVY * 0.1;
    player.x += player.inertia.x;
    player.y += player.inertia.y;

    // Bullets update
    bullets.forEach((b, i) => {
        b.x += b.vx;
        b.y += b.vy;

        // Collision with enemies
        if (b.owner === 'player') {
            enemies.forEach((en, ei) => {
                const dist = Math.sqrt((b.x - en.x) ** 2 + (b.y - en.y) ** 2);
                if (dist < 30) {
                    en.hp -= 35;
                    createParticle(b.x, b.y, '#c0392b'); // Blood
                    splatters.push({ x: b.x, y: b.y, size: 20 + Math.random() * 20, rot: Math.random() * Math.PI * 2 });
                    bullets.splice(i, 1);
                    if (en.hp <= 0) enemies.splice(ei, 1);
                }
            });
        } else {
            // Hit player
            const dist = Math.sqrt((b.x - player.x) ** 2 + (b.y - player.y) ** 2);
            if (dist < 25) {
                player.hp -= 15;
                createParticle(b.x, b.y, '#c0392b');
                bullets.splice(i, 1);
                document.getElementById('hp-bar').style.width = player.hp + '%';
                document.getElementById('hp-text').textContent = player.hp + '%';
                flashDamage();
            }
        }

        if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) bullets.splice(i, 1);
    });

    // AI Tactical AI
    enemies.forEach(en => {
        // AI Logic: Find nearest enemy team member
        if (!en.target || Date.now() - en.lastTargetChange > 2000) {
            let nearest = null;
            let minDist = 1000;

            // Check Player
            if (player.team !== en.team) {
                const d = Math.sqrt((player.x - en.x) ** 2 + (player.y - en.y) ** 2);
                if (d < minDist) {
                    minDist = d;
                    nearest = player;
                }
            }

            // Check other AI agents
            enemies.forEach(other => {
                if (other !== en && other.team !== en.team) {
                    const d = Math.sqrt((other.x - en.x) ** 2 + (other.y - en.y) ** 2);
                    if (d < minDist) {
                        minDist = d;
                        nearest = other;
                    }
                }
            });

            en.target = nearest;
            en.lastTargetChange = Date.now();
        }

        if (en.target) {
            const targetX = en.target.x;
            const targetY = en.target.y;
            const dist = Math.sqrt((targetX - en.x) ** 2 + (targetY - en.y) ** 2);

            // Look towards target
            const desiredAngle = Math.atan2(targetY - en.y, targetX - en.x);
            en.angle += (desiredAngle - en.angle) * 0.05; // Slow rotation for realism

            if (dist < 600) {
                // Move towards target if too far, or keep distance
                if (dist > 300) {
                    en.x += Math.cos(en.angle) * 1.5;
                    en.y += Math.sin(en.angle) * 1.5;
                } else if (dist < 150) {
                    en.x -= Math.cos(en.angle) * 1.0;
                    en.y -= Math.sin(en.angle) * 1.0;
                }

                // Medium Difficulty Shoot logic: Shoot in bursts with delay
                if (Date.now() - en.lastShot > 1200 + Math.random() * 800) {
                    // Accuracy check
                    const spread = (1 - en.accuracy) * 0.3;
                    const shootAngle = en.angle + (Math.random() - 0.5) * spread;

                    bullets.push({
                        x: en.x + Math.cos(en.angle) * 30,
                        y: en.y + Math.sin(en.angle) * 30,
                        vx: Math.cos(shootAngle) * 22,
                        vy: Math.sin(shootAngle) * 22,
                        owner: 'enemy',
                        team: en.team
                    });
                    en.lastShot = Date.now();
                }
            }
        } else {
            // Idle movement
            en.angle += 0.01;
        }
    });

    // FX updates
    particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy; p.life -= 0.05;
        if (p.life <= 0) particles.splice(i, 1);
    });
}

function flashDamage() {
    const flash = document.getElementById('damage-flash');
    flash.style.animation = 'none';
    flash.offsetHeight;
    flash.style.animation = 'flash 0.5s forwards';
    if (player.hp <= 0) location.reload();
}

function draw() {
    // Fill base background color first (Lighter tactical grey)
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Ground Texture (Realistic Tile)
    if (ASSETS.ground.complete && ASSETS.ground.naturalWidth !== 0) {
        try {
            const pattern = ctx.createPattern(ASSETS.ground, 'repeat');
            ctx.fillStyle = pattern;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } catch (e) {
            console.error("Pattern creation failed", e);
        }
    }

    // Grid for orientation (Military feel)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 100) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 100) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Blood Splatters
    splatters.forEach(s => {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rot);
        ctx.fillStyle = 'rgba(192, 57, 43, 0.6)';
        ctx.beginPath();
        ctx.arc(0, 0, s.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });

    // Shells on ground
    shells.forEach(s => {
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(s.x, s.y, 4, 2);
    });

    // Draw Particles
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillRect(p.x, p.y, 3, 3);
        ctx.globalAlpha = 1.0;
    });

    // Draw Bullets
    ctx.fillStyle = '#f9bc02';
    bullets.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
        ctx.fill();
        // Bullet tracer
        ctx.strokeStyle = 'rgba(249, 188, 2, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - b.vx * 2, b.y - b.vy * 2);
        ctx.stroke();
    });

    // Draw Enemies
    enemies.forEach(en => {
        ctx.save();
        ctx.translate(en.x, en.y);
        ctx.rotate(en.angle);

        // Realistic Soldier Body (Team-based colors)
        if (en.team === 1) ctx.fillStyle = '#27ae60'; // Friendly Green
        else if (en.team === 2) ctx.fillStyle = '#c0392b'; // Enemy Red
        else if (en.team === 3) ctx.fillStyle = '#2980b9'; // Team Blue
        else ctx.fillStyle = '#f1c40f'; // Team Yellow

        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#2d3436';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Gear
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(-10, -12, 20, 24);

        // Head
        ctx.fillStyle = '#d7ccc8';
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    });

    // Draw Player
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    if (ASSETS.soldier.complete && ASSETS.soldier.naturalWidth !== 0) {
        // Draw the realistic generated sprite
        ctx.drawImage(ASSETS.soldier, -35, -35, 70, 70);
    } else {
        // Fallback realistic drawing
        ctx.fillStyle = '#2d3436'; // Tactical gear
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#4cd137'; // Green highlight for player
        ctx.lineWidth = 3;
        ctx.stroke();

        // Head
        ctx.fillStyle = '#d7ccc8';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();

        // Gun M4A1
        ctx.fillStyle = '#111';
        ctx.fillRect(15, -4, 45, 8);
    }

    ctx.restore();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

init();
