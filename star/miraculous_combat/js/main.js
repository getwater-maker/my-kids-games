const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// --- Assets ---
const SPRITES = {
    ladybug: new Image(),
    catnoir: new Image(),
    villain: new Image(),
    background: new Image()
};
SPRITES.ladybug.src = 'assets/ladybug.png';
SPRITES.catnoir.src = 'assets/catnoir.png';
SPRITES.villain.src = 'assets/villain.png';
SPRITES.background.src = 'assets/background.png';

// --- Config ---
const PLAYER_SPEED = 6;
const MAX_HP = 100;
const MAX_MANA = 100;

// --- State ---
let player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 30,
    hp: MAX_HP,
    mana: 0,
    role: null, // 'ladybug' or 'catnoir'
    isAttacking: false,
    attackTimer: 0,
    kills: 0
};

let enemies = [];
let projectiles = [];
let particles = [];
let effects = [];
let gameState = 'START';
const keys = {};

// --- Initialization ---
function init() {
    setupEventListeners();
    requestAnimationFrame(gameLoop);
}

function setupEventListeners() {
    window.addEventListener('keydown', e => keys[e.code] = true);
    window.addEventListener('keyup', e => keys[e.code] = false);

    document.getElementById('select-ladybug').onclick = () => selectHero('ladybug');
    document.getElementById('select-catnoir').onclick = () => selectHero('catnoir');
    document.getElementById('start-btn').onclick = startGame;

    window.addEventListener('mousedown', () => {
        if (gameState === 'PLAYING') attack();
    });

    window.addEventListener('keydown', e => {
        if (e.code === 'Space' && gameState === 'PLAYING') useUltimate();
    });
}

function selectHero(hero) {
    player.role = hero;
    document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
    document.getElementById(`select-${hero}`).classList.add('selected');
    document.getElementById('start-btn').disabled = false;
    
    // UI update
    const name = hero === 'ladybug' ? '레이디버그' : '블랙캣';
    document.getElementById('char-name').textContent = name;
    document.querySelector('.menu-box').style.borderColor = hero === 'ladybug' ? '#ea2027' : '#2ecc71';
    document.getElementById('start-btn').style.background = hero === 'ladybug' ? '#ea2027' : '#2ecc71';
}

function startGame() {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    gameState = 'PLAYING';
    spawnWave();
}

function attack() {
    if (player.isAttacking) return;
    player.isAttacking = true;
    player.attackTimer = 15;

    // Use current mouse position from the global mouse object
    const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    
    if (player.role === 'ladybug') {
        // Yo-yo Projectile
        projectiles.push({
            x: player.x, y: player.y,
            vx: Math.cos(angle) * 20, // Faster
            vy: Math.sin(angle) * 20,
            type: 'yoyo',
            life: 40,
            returning: false
        });
    } else {
        // Baton Strike (Melee)
        const strikeX = player.x + Math.cos(angle) * 70;
        const strikeY = player.y + Math.sin(angle) * 70;

        effects.push({
            x: strikeX,
            y: strikeY,
            type: 'baton',
            life: 10,
            angle: angle
        });

        // Hit check - Larger Radius
        enemies.forEach((e) => {
            const d = Math.hypot(e.x - strikeX, e.y - strikeY);
            if (d < 120) hitEnemy(e, 25);
        });
    }
}

function useUltimate() {
    if (player.mana < MAX_MANA) return;
    player.mana = 0;
    
    // Visual flash
    const flash = document.getElementById('ability-flash');
    flash.classList.remove('hidden');
    flash.style.background = player.role === 'ladybug' ? 'rgba(255, 0, 0, 0.4)' : 'rgba(0, 255, 0, 0.4)';
    setTimeout(() => flash.classList.add('hidden'), 500);

    if (player.role === 'ladybug') {
        // LUCKY CHARM: Purify all current enemies
        enemies.forEach((e, ei) => {
            setTimeout(() => hitEnemy(e, 999), ei * 100);
        });
    } else {
        // CATACLYSM: Massive explosion at mouse
        effects.push({
            x: mouse.x, y: mouse.y,
            type: 'cataclysm',
            radius: 0,
            maxRadius: 300,
            life: 60
        });
        
        enemies.forEach((e) => {
            const d = Math.hypot(e.x - mouse.x, e.y - mouse.y);
            if (d < 300) hitEnemy(e, 999);
        });
    }
}

let mouse = { x: 0, y: 0 };
canvas.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

function spawnWave() {
    for (let i = 0; i < 5 + player.kills / 2; i++) {
        const side = Math.floor(Math.random() * 4);
        let x, y;
        if (side === 0) { x = Math.random() * canvas.width; y = -50; }
        else if (side === 1) { x = canvas.width + 50; y = Math.random() * canvas.height; }
        else if (side === 2) { x = Math.random() * canvas.width; y = canvas.height + 50; }
        else { x = -50; y = Math.random() * canvas.height; }

        enemies.push({
            x, y,
            hp: 50,
            speed: 2 + Math.random() * 2,
            radius: 25,
            attackTimer: 0
        });
    }
}

function hitEnemy(enemyObj, damage) {
    if (!enemyObj || enemyObj.dead) return;
    enemyObj.hp -= damage;
    createParticles(enemyObj.x, enemyObj.y, '#9b59b6'); // Akuma purple particles
    
    if (enemyObj.hp <= 0 && !enemyObj.dead) {
        enemyObj.dead = true;
        player.kills++;
        player.mana = Math.min(MAX_MANA, player.mana + 15);
        document.getElementById('kill-count').textContent = player.kills;
        
        if (player.kills % 10 === 0) spawnWave();
        if (player.kills >= 50) winGame();
    }
}

function update() {
    if (gameState !== 'PLAYING') return;

    // Player Move
    if (keys['KeyW']) player.y -= PLAYER_SPEED;
    if (keys['KeyS']) player.y += PLAYER_SPEED;
    if (keys['KeyA']) player.x -= PLAYER_SPEED;
    if (keys['KeyD']) player.x += PLAYER_SPEED;

    // Bounds
    player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));

    if (player.attackTimer > 0) player.attackTimer--;
    else player.isAttacking = false;

    // Update Enemies
    enemies.forEach((e, ei) => {
        const angle = Math.atan2(player.y - e.y, player.x - e.x);
        e.x += Math.cos(angle) * e.speed;
        e.y += Math.sin(angle) * e.speed;

        // Collision with player
        const dist = Math.hypot(e.x - player.x, e.y - player.y);
        if (dist < player.radius + e.radius) {
            player.hp -= 0.2;
            if (player.hp <= 0) loseGame();
        }
    });

    // Projectiles (Yo-yo)
    projectiles = projectiles.filter(p => {
        if (!p.returning) {
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if (p.life <= 0) p.returning = true;
        } else {
            const angle = Math.atan2(player.y - p.y, player.x - p.x);
            p.x += Math.cos(angle) * 15;
            p.y += Math.sin(angle) * 15;
            if (Math.hypot(p.x - player.x, p.y - player.y) < 30) return false;
        }

        // Hit check
        enemies.forEach((e) => {
            if (Math.hypot(e.x - p.x, e.y - p.y) < e.radius + 10) {
                hitEnemy(e, 10);
            }
        });
        return true;
    });

    // Effects
    effects = effects.filter(f => {
        if (f.type === 'cataclysm') f.radius += (f.maxRadius - f.radius) * 0.1;
        f.life--;
        return f.life > 0;
    });

    // Particles
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.02;
        return p.alpha > 0;
    });

    enemies = enemies.filter(e => !e.dead);
    updateUI();
}

function updateUI() {
    document.getElementById('hp-fill').style.width = (player.hp / MAX_HP) * 100 + '%';
    document.getElementById('mana-fill').style.width = (player.mana / MAX_MANA) * 100 + '%';
}

function winGame() {
    gameState = 'WIN';
    document.getElementById('win-screen').classList.remove('hidden');
}

function loseGame() {
    gameState = 'LOSE';
    document.getElementById('lose-screen').classList.remove('hidden');
}

function createParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            alpha: 1,
            color: color,
            size: Math.random() * 4 + 2
        });
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.drawImage(SPRITES.background, 0, 0, canvas.width, canvas.height);

    // Grid Overlay
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    for(let i=0; i<canvas.width; i+=100) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
    }

    // Enemies
    enemies.forEach(e => {
        const size = e.radius * 3;
        ctx.drawImage(SPRITES.villain, e.x - size/2, e.y - size/2, size, size);
        
        // HP bar above enemy
        ctx.fillStyle = '#ff4d4d';
        ctx.fillRect(e.x - 20, e.y - 40, (e.hp/50) * 40, 5);
    });

    // Projectiles
    projectiles.forEach(p => {
        ctx.fillStyle = '#ea2027';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 10, 0, Math.PI*2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    });

    // Particles
    particles.forEach(p => {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Effects
    effects.forEach(f => {
        if (f.type === 'baton') {
            ctx.strokeStyle = '#2ecc71';
            ctx.lineWidth = 10;
            ctx.beginPath();
            ctx.moveTo(player.x, player.y);
            ctx.lineTo(f.x, f.y);
            ctx.stroke();
        }
        if (f.type === 'cataclysm') {
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.radius, 0, Math.PI*2);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 5;
            ctx.stroke();
            ctx.fillStyle = 'rgba(46, 204, 113, 0.2)';
            ctx.fill();
        }
    });

    // Player
    const pSize = player.radius * 4;
    const sprite = player.role === 'ladybug' ? SPRITES.ladybug : SPRITES.catnoir;
    ctx.drawImage(sprite, player.x - pSize/2, player.y - pSize/2, pSize, pSize);

    // Mouse Reticle
    ctx.strokeStyle = player.role === 'ladybug' ? '#ea2027' : '#2ecc71';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, 15, 0, Math.PI*2);
    ctx.stroke();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

init();
