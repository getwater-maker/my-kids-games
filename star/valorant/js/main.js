// star/valorant/js/main.js

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const crosshair = document.getElementById('crosshair');

let gameState = 'START';
let player = {
    x: 400,
    y: 300,
    radius: 20,
    speed: 4,
    angle: 0,
    hp: 100,
    ammo: 25,
    reserve: 75,
    isReloading: false,
    abilities: { e: { ready: true, cd: 2000 } }
};

let bullets = [];
let enemies = [];
let walls = [];
let spike = { x: 1000, y: 500, status: 'IDLE', progress: 0 };
let frameCount = 0;
const keys = {};

function init() {
    resize();
    createLevel();
    spawnEnemies(5);

    window.addEventListener('keydown', e => keys[e.code] = true);
    window.addEventListener('keyup', e => keys[e.code] = false);
    window.addEventListener('mousemove', handleAim);
    window.addEventListener('mousedown', shoot);
    window.addEventListener('keydown', e => {
        if (e.code === 'KeyR') reload();
        if (e.code === 'KeyE') useAbility();
    });

    document.getElementById('start-btn').onclick = () => {
        document.getElementById('overlay').classList.add('hidden');
        gameState = 'PLAYING';
        gameLoop();
    };

    window.addEventListener('resize', resize);
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function createLevel() {
    // Basic Tactical Layout (Boxes as walls)
    walls.push({ x: 100, y: 100, w: 200, h: 50 });
    walls.push({ x: 500, y: 200, w: 50, h: 300 });
    walls.push({ x: 800, y: 400, w: 300, h: 50 });
    walls.push({ x: 200, y: 600, w: 400, h: 50 });
}

function spawnEnemies(count) {
    for (let i = 0; i < count; i++) {
        enemies.push({
            x: 600 + Math.random() * 500,
            y: 100 + Math.random() * 500,
            hp: 100,
            radius: 20,
            color: '#ff4655'
        });
    }
}

function handleAim(e) {
    crosshair.style.left = e.clientX + 'px';
    crosshair.style.top = e.clientY + 'px';

    if (gameState === 'PLAYING') {
        player.angle = Math.atan2(e.clientY - player.y, e.clientX - player.x);
    }
}

function shoot() {
    if (gameState !== 'PLAYING' || player.ammo <= 0 || player.isReloading) return;

    player.ammo--;
    document.getElementById('ammo-val').textContent = player.ammo;

    const spread = (Math.random() - 0.5) * 0.05;
    bullets.push({
        x: player.x + Math.cos(player.angle) * 30,
        y: player.y + Math.sin(player.angle) * 30,
        vx: Math.cos(player.angle + spread) * 15,
        vy: Math.sin(player.angle + spread) * 15,
        owner: 'player'
    });
}

function reload() {
    if (player.isReloading || player.ammo === 25 || player.reserve <= 0) return;

    player.isReloading = true;
    setTimeout(() => {
        const needed = 25 - player.ammo;
        const take = Math.min(needed, player.reserve);
        player.ammo += take;
        player.reserve -= take;
        player.isReloading = false;
        document.getElementById('ammo-val').textContent = player.ammo;
        document.getElementById('reserve-val').textContent = player.reserve;
    }, 1500);
}

function useAbility() {
    if (player.abilities.e.ready) {
        // Jett Dash simulation
        const dashDist = 150;
        player.x += Math.cos(player.angle) * dashDist;
        player.y += Math.sin(player.angle) * dashDist;

        player.abilities.e.ready = false;
        document.getElementById('abi-e').classList.remove('active');
        setTimeout(() => {
            player.abilities.e.ready = true;
            document.getElementById('abi-e').classList.add('active');
        }, player.abilities.e.cd);
    }
}

function update() {
    if (gameState !== 'PLAYING') return;

    // Movement
    let nextX = player.x;
    let nextY = player.y;

    if (keys['KeyW']) nextY -= player.speed;
    if (keys['KeyS']) nextY += player.speed;
    if (keys['KeyA']) nextX -= player.speed;
    if (keys['KeyD']) nextX += player.speed;

    // Wall Collision
    let canMoveX = true;
    let canMoveY = true;
    walls.forEach(w => {
        if (nextX > w.x - player.radius && nextX < w.x + w.w + player.radius &&
            player.y > w.y - player.radius && player.y < w.y + w.h + player.radius) canMoveX = false;
        if (player.x > w.x - player.radius && player.x < w.x + w.w + player.radius &&
            nextY > w.y - player.radius && nextY < w.y + w.h + player.radius) canMoveY = false;
    });

    if (canMoveX) player.x = nextX;
    if (canMoveY) player.y = nextY;

    // Update Bullets
    bullets.forEach((b, i) => {
        b.x += b.vx;
        b.y += b.vy;

        // Wall hit
        walls.forEach(w => {
            if (b.x > w.x && b.x < w.x + w.w && b.y > w.y && b.y < w.y + w.h) bullets.splice(i, 1);
        });

        // Enemy hit
        enemies.forEach((en, ei) => {
            const dist = Math.sqrt((b.x - en.x) ** 2 + (b.y - en.y) ** 2);
            if (dist < en.radius) {
                en.hp -= 40;
                bullets.splice(i, 1);
                if (en.hp <= 0) enemies.splice(ei, 1);
            }
        });

        if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) bullets.splice(i, 1);
    });

    // Enemy AI (Simple follow/move)
    enemies.forEach(en => {
        const dist = Math.sqrt((player.x - en.x) ** 2 + (player.y - en.y) ** 2);
        if (dist < 400) {
            const enAngle = Math.atan2(player.y - en.y, player.x - en.x);
            en.x += Math.cos(enAngle) * 1.5;
            en.y += Math.sin(enAngle) * 1.5;

            // Randomly shoot
            if (Math.random() < 0.01) {
                bullets.push({
                    x: en.x, y: en.y,
                    vx: Math.cos(enAngle) * 8, vy: Math.sin(enAngle) * 8,
                    owner: 'enemy'
                });
            }
        }
    });

    // Bullet hit player
    bullets.forEach((b, i) => {
        if (b.owner === 'enemy') {
            const dist = Math.sqrt((b.x - player.x) ** 2 + (b.y - player.y) ** 2);
            if (dist < player.radius) {
                player.hp -= 10;
                bullets.splice(i, 1);
                document.getElementById('hp-val').textContent = player.hp;
                if (player.hp <= 0) gameOver();
            }
        }
    });

    // Spike logic
    const distToSpike = Math.sqrt((player.x - spike.x) ** 2 + (player.y - spike.y) ** 2);
    if (distToSpike < 60 && keys['KeyF']) {
        spike.progress += 1;
        if (spike.progress >= 200) {
            spike.status = 'PLANTED';
            roundWin('SPIKE PLANTED');
        }
    } else {
        spike.progress = Math.max(0, spike.progress - 2);
    }

    if (enemies.length === 0) roundWin('ACE');
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Walls
    ctx.fillStyle = '#3a444d';
    ctx.strokeStyle = '#0f1923';
    walls.forEach(w => {
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.strokeRect(w.x, w.y, w.w, w.h);
    });

    // Draw Spike Site
    ctx.strokeStyle = '#ff4655';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(spike.x, spike.y, 50, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 70, 85, 0.1)';
    ctx.fill();

    // Draw Spike indicator
    if (spike.progress > 0) {
        ctx.fillStyle = '#ff4655';
        ctx.fillRect(spike.x - 50, spike.y - 70, spike.progress / 2, 10);
    }

    // Draw Bullets
    ctx.fillStyle = '#f9f9f9';
    bullets.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw Enemies
    enemies.forEach(en => {
        ctx.fillStyle = en.color;
        ctx.beginPath();
        ctx.arc(en.x, en.y, en.radius, 0, Math.PI * 2);
        ctx.fill();
        // HP bar above
        ctx.fillStyle = '#eee';
        ctx.fillRect(en.x - 20, en.y - 35, 40, 5);
        ctx.fillStyle = '#ff4655';
        ctx.fillRect(en.x - 20, en.y - 35, (en.hp / 100) * 40, 5);
    });

    // Draw Player
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    // Body
    ctx.fillStyle = '#00A2FF';
    ctx.beginPath();
    ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Weapon
    ctx.fillStyle = '#333';
    ctx.fillRect(10, -5, 30, 10);

    ctx.restore();
}

function roundWin(text) {
    gameState = 'WIN';
    const status = document.getElementById('round-status');
    status.classList.remove('hidden');
    document.getElementById('status-text').textContent = text;
    setTimeout(() => location.reload(), 3000);
}

function gameOver() {
    gameState = 'GAMEOVER';
    const status = document.getElementById('round-status');
    status.classList.remove('hidden');
    document.getElementById('status-text').textContent = 'ELIMINATED';
    setTimeout(() => location.reload(), 3000);
}

function gameLoop() {
    update();
    draw();
    if (gameState === 'PLAYING' || gameState === 'WIN' || gameState === 'GAMEOVER') {
        requestAnimationFrame(gameLoop);
    }
}

init();
