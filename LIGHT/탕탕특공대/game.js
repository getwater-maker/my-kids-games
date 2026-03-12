/**
 * 탕탕특공대 (Survivor.io Clone)
 * Core Game Engine
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const expFill = document.getElementById('exp-bar-fill');
const timerEl = document.getElementById('timer');
const killCountEl = document.getElementById('kill-count');
const levelEl = document.getElementById('level');
const skillSelection = document.getElementById('skill-selection');
const skillOptions = document.getElementById('skill-options');
const gameOverScreen = document.getElementById('game-over');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Game Config
const CONFIG = {
    PLAYER_SPEED: 4,
    ENEMY_SPAWN_RATE: 1000, // ms
    GEM_ATTRACT_DIST: 100,
    MAP_SIZE: 3000,
};

// Global State
let gameRunning = false;
let startTime = 0;
let lastTime = 0;
let frameCount = 0;
let screenShake = 0;

// Particles
let particles = [];
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10;
        this.life = 20 + Math.random() * 20;
        this.color = color;
        this.size = 2 + Math.random() * 4;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        return this.life <= 0;
    }
    draw(camera) {
        const sx = this.x - camera.x + canvas.width/2;
        const sy = this.y - camera.y + canvas.height/2;
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life / 40;
        ctx.fillRect(sx, sy, this.size, this.size);
        ctx.globalAlpha = 1.0;
    }
}

// Classes
class Player {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.w = 40;
        this.h = 40;
        this.hp = 100;
        this.maxHp = 100;
        this.level = 1;
        this.exp = 0;
        this.maxExp = 10;
        this.kills = 0;
        this.skills = {
            kunai: 1,
            forcefield: 0,
            molotov: 0,
            lightning: 0
        };
        this.velocity = { x: 0, y: 0 };
    }

    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;

        // Keep in bounds
        const halfMap = CONFIG.MAP_SIZE / 2;
        this.x = Math.max(-halfMap, Math.min(halfMap, this.x));
        this.y = Math.max(-halfMap, Math.min(halfMap, this.y));

        // Exp logic
        if (this.exp >= this.maxExp) {
            this.levelUp();
        }
    }

    draw(camera) {
        const screenX = this.x - camera.x + canvas.width / 2 - this.w / 2;
        const screenY = this.y - camera.y + canvas.height / 2 - this.h / 2;
        
        // Simple Body (Blue Square)
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(screenX, screenY, this.w, this.h);
        
        // Eyes (Look direction)
        ctx.fillStyle = '#fff';
        const eyeSize = 6;
        const offset = this.velocity.x > 0 ? 25 : (this.velocity.x < 0 ? 5 : 15);
        ctx.fillRect(screenX + offset, screenY + 10, eyeSize, eyeSize);
        ctx.fillRect(screenX + offset + 8, screenY + 10, eyeSize, eyeSize);

        // HP Bar
        const barW = 40;
        const barH = 4;
        const hpPerc = this.hp / this.maxHp;
        ctx.fillStyle = '#444';
        ctx.fillRect(screenX + (this.w - barW)/2, screenY - 15, barW, barH);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(screenX + (this.w - barW)/2, screenY - 15, barW * hpPerc, barH);
    }

    levelUp() {
        this.exp -= this.maxExp;
        this.level++;
        this.maxExp = Math.floor(this.maxExp * 1.5) + 5;
        levelEl.textContent = this.level;
        showSkillSelection();
    }
}

class Enemy {
    constructor(x, y, type = 'normal') {
        this.x = x;
        this.y = y;
        this.w = 50;
        this.h = 50;
        this.hp = 10 + (player.level * 5);
        this.maxHp = this.hp;
        this.speed = 2 + (Math.random() * 0.5);
        this.damage = 10;
        this.type = type;
        this.flash = 0; // for hit effect
    }

    update() {
        // Move towards player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 5) {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }

        if (this.flash > 0) this.flash--;
    }

    draw(camera) {
        const screenX = this.x - camera.x + canvas.width / 2 - this.w / 2;
        const screenY = this.y - camera.y + canvas.height / 2 - this.h / 2;

        ctx.fillStyle = this.flash > 0 ? '#fff' : '#ef4444';
        ctx.fillRect(screenX, screenY, this.w, this.h);

        // Mini HP bar if damaged
        if (this.hp < this.maxHp) {
            const barW = 30;
            ctx.fillStyle = '#000';
            ctx.fillRect(screenX + (this.w - barW)/2, screenY - 8, barW, 4);
            ctx.fillStyle = '#f00';
            ctx.fillRect(screenX + (this.w - barW)/2, screenY - 8, barW * (this.hp / this.maxHp), 4);
        }
    }
}

class Projectile {
    constructor(x, y, targetX, targetY, damage, speed) {
        this.x = x;
        this.y = y;
        const dx = targetX - x;
        const dy = targetY - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.vx = (dx / dist) * speed;
        this.vy = (dy / dist) * speed;
        this.damage = damage;
        this.size = 10;
        this.life = 100;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
    }

    draw(camera) {
        const screenX = this.x - camera.x + canvas.width / 2;
        const screenY = this.y - camera.y + canvas.height / 2;
        
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size, 0, Math.PI * 2);
        ctx.fill();
        // Glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#4ade80';
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

class Gem {
    constructor(x, y, expValue = 1) {
        this.x = x;
        this.y = y;
        this.size = 8;
        this.expValue = expValue;
        this.attracted = false;
    }

    update() {
        if (this.attracted) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            this.x += (dx / dist) * 10;
            this.y += (dy / dist) * 10;
            
            if (dist < 20) {
                player.exp += this.expValue;
                updateExpBar();
                return true; // remove
            }
        } else {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < CONFIG.GEM_ATTRACT_DIST) {
                this.attracted = true;
            }
        }
        return false;
    }

    draw(camera) {
        const screenX = this.x - camera.x + canvas.width / 2;
        const screenY = this.y - camera.y + canvas.height / 2;
        
        ctx.fillStyle = '#2dd4bf';
        ctx.beginPath();
        ctx.moveTo(screenX, screenY - this.size);
        ctx.lineTo(screenX + this.size, screenY);
        ctx.lineTo(screenX, screenY + this.size);
        ctx.lineTo(screenX - this.size, screenY);
        ctx.closePath();
        ctx.fill();
    }
}

// Game Manager
let player = new Player();
let enemies = [];
let projectiles = [];
let gems = [];
let camera = { x: 0, y: 0 };
let keys = {};
let joystick = {
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    maxDist: 60
};

// Skill Data
const ALL_SKILLS = [
    { id: 'kunai', name: '쿠나이', desc: '가장 가까운 적에게 단검을 던집니다.', icon: '🗡️' },
    { id: 'forcefield', name: '역장', desc: '주변에 지속적인 데미지를 주는 보호막을 생성합니다.', icon: '🛡️' },
    { id: 'molotov', name: '화염병', desc: '바닥에 불을 질러 범위 내 적을 태웁니다.', icon: '🔥' },
    { id: 'lightning', name: '번개', desc: '랜덤한 적에게 강력한 번개를 떨어뜨립니다.', icon: '⚡' },
    { id: 'hp_boost', name: '체력 강화', desc: '최대 체력을 20% 증가시킵니다.', icon: '❤️' }
];

function init() {
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', e => keys[e.code] = true);
    window.addEventListener('keyup', e => keys[e.code] = false);
    
    // Joystick events
    const jsContainer = document.getElementById('joystick-container');
    const jsStick = document.getElementById('joystick-stick');

    jsContainer.addEventListener('touchstart', e => {
        joystick.active = true;
        const touch = e.touches[0];
        const rect = jsContainer.getBoundingClientRect();
        joystick.startX = rect.left + rect.width / 2;
        joystick.startY = rect.top + rect.height / 2;
        e.preventDefault();
    });

    window.addEventListener('touchmove', e => {
        if (!joystick.active) return;
        const touch = e.touches[0];
        const dx = touch.clientX - joystick.startX;
        const dy = touch.clientY - joystick.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const cappedDist = Math.min(dist, joystick.maxDist);
        const angle = Math.atan2(dy, dx);
        
        const stickX = Math.cos(angle) * cappedDist;
        const stickY = Math.sin(angle) * cappedDist;
        
        jsStick.style.transform = `translate(${stickX}px, ${stickY}px)`;
        
        player.velocity.x = (dx / dist) * CONFIG.PLAYER_SPEED * (cappedDist / joystick.maxDist);
        player.velocity.y = (dy / dist) * CONFIG.PLAYER_SPEED * (cappedDist / joystick.maxDist);
        e.preventDefault();
    }, { passive: false });

    window.addEventListener('touchend', () => {
        joystick.active = false;
        jsStick.style.transform = `translate(0px, 0px)`;
        player.velocity.x = 0;
        player.velocity.y = 0;
    });

    startBtn.onclick = startGame;
    restartBtn.onclick = () => location.reload();
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function startGame() {
    startScreen.classList.add('hidden');
    gameRunning = true;
    startTime = Date.now();
    requestAnimationFrame(gameLoop);
    
    // Auto weapons loop
    setInterval(autoFire, 1000);
}

function gameLoop() {
    if (!gameRunning) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const now = Date.now();
    const dt = now - lastTime;
    lastTime = now;

    update();
    draw();
    
    updateTimer();
    
    requestAnimationFrame(gameLoop);
}

function update() {
    if (screenShake > 0) screenShake--;

    // Keyboard inputs
    if (!joystick.active) {
        player.velocity.x = 0;
        player.velocity.y = 0;
        if (keys['KeyA'] || keys['ArrowLeft']) player.velocity.x = -CONFIG.PLAYER_SPEED;
        if (keys['KeyD'] || keys['ArrowRight']) player.velocity.x = CONFIG.PLAYER_SPEED;
        if (keys['KeyW'] || keys['ArrowUp']) player.velocity.y = -CONFIG.PLAYER_SPEED;
        if (keys['KeyS'] || keys['ArrowDown']) player.velocity.y = CONFIG.PLAYER_SPEED;
        
        // Normalize diagonal speed
        if (player.velocity.x !== 0 && player.velocity.y !== 0) {
            player.velocity.x *= 0.707;
            player.velocity.y *= 0.707;
        }
    }

    player.update();
    camera.x = player.x;
    camera.y = player.y;

    // Spawn enemies
    if (Math.random() < 0.05 && enemies.length < 50 + (player.level * 10)) {
        spawnEnemy();
    }

    // Update enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.update();
        
        // Collision with player
        const dx = e.x - player.x;
        const dy = e.y - player.y;
        if (Math.sqrt(dx*dx + dy*dy) < 40) {
            player.hp -= 0.5; // Continuous damage
            screenShake = 5;
            if (player.hp <= 0) endGame();
        }
    }

    // Update projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.update();
        
        let hit = false;
        for (const e of enemies) {
            const dx = p.x - e.x;
            const dy = p.y - e.y;
            if (Math.sqrt(dx*dx + dy*dy) < 30) {
                e.hp -= p.damage;
                e.flash = 5;
                hit = true;
                // Add hit particles
                for(let k=0; k<3; k++) particles.push(new Particle(e.x, e.y, '#fff'));
                break;
            }
        }
        
        if (hit || p.life <= 0) {
            projectiles.splice(i, 1);
        }
    }

    // Update gems
    for (let i = gems.length - 1; i >= 0; i--) {
        if (gems[i].update()) {
            gems.splice(i, 1);
        }
    }

    // Enemy death
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].hp <= 0) {
            gems.push(new Gem(enemies[i].x, enemies[i].y));
            // Death particles
            for(let k=0; k<10; k++) particles.push(new Particle(enemies[i].x, enemies[i].y, '#4ade80'));
            enemies.splice(i, 1);
            player.kills++;
            killCountEl.textContent = player.kills;
        }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].update()) particles.splice(i, 1);
    }
}

function draw() {
    ctx.save();
    if (screenShake > 0) {
        ctx.translate((Math.random()-0.5)*screenShake*4, (Math.random()-0.5)*screenShake*4);
    }

    drawBackground();
    
    gems.forEach(g => g.draw(camera));
    particles.forEach(p => p.draw(camera));
    enemies.forEach(e => e.draw(camera));
    projectiles.forEach(p => p.draw(camera));
    player.draw(camera);
    
    // Draw skill effects (e.g. forcefield)
    if (player.skills.forcefield > 0) {
        drawForcefield();
    }

    ctx.restore();
}

function drawBackground() {
    // Solid color for minimalist look
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawForcefield() {
    const screenX = canvas.width / 2;
    const screenY = canvas.height / 2;
    const radius = 100 + (player.skills.forcefield * 10);
    
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.3)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.fillStyle = 'rgba(74, 222, 128, 0.05)';
    ctx.fill();

    // Damage enemies in field
    enemies.forEach(e => {
        const dx = e.x - player.x;
        const dy = e.y - player.y;
        if (Math.sqrt(dx*dx + dy*dy) < radius) {
            e.hp -= 0.1 * player.skills.forcefield;
            e.flash = 2;
        }
    });
}

function spawnEnemy() {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.max(canvas.width, canvas.height) * 0.7;
    const x = player.x + Math.cos(angle) * dist;
    const y = player.y + Math.sin(angle) * dist;
    enemies.push(new Enemy(x, y));
}

function autoFire() {
    if (!gameRunning) return;

    // Kunai (Closest enemy)
    if (player.skills.kunai > 0 && enemies.length > 0) {
        let nearest = null;
        let minDist = Infinity;
        enemies.forEach(e => {
            const d = Math.sqrt((e.x-player.x)**2 + (e.y-player.y)**2);
            if (d < minDist) {
                minDist = d;
                nearest = e;
            }
        });
        
        if (nearest && minDist < 600) {
            for(let i=0; i<player.skills.kunai; i++) {
                setTimeout(() => {
                    projectiles.push(new Projectile(player.x, player.y, nearest.x, nearest.y, 15, 12));
                }, i * 100);
            }
        }
    }

    // Lightning (Random enemies)
    if (player.skills.lightning > 0 && enemies.length > 0) {
        const count = player.skills.lightning;
        for (let i = 0; i < count; i++) {
            const target = enemies[Math.floor(Math.random() * enemies.length)];
            // Draw lightning effect briefly
            drawLightning(target);
            target.hp -= 40;
            target.flash = 10;
        }
    }
}

function drawLightning(target) {
    const screenX = target.x - camera.x + canvas.width/2;
    const screenY = target.y - camera.y + canvas.height/2;
    
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(screenX, screenY - 500);
    ctx.lineTo(screenX - 20, screenY - 250);
    ctx.lineTo(screenX + 20, screenY - 100);
    ctx.lineTo(screenX, screenY);
    ctx.stroke();
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#fef08a';
    ctx.stroke();
    ctx.shadowBlur = 0;
}

function updateExpBar() {
    const perc = (player.exp / player.maxExp) * 100;
    expFill.style.width = perc + '%';
}

function updateTimer() {
    const elapsed = Date.now() - startTime;
    const s = Math.floor(elapsed / 1000) % 60;
    const m = Math.floor(elapsed / 60000);
    timerEl.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function showSkillSelection() {
    gameRunning = false;
    skillOptions.innerHTML = '';
    
    // Pick 3 random skills
    const shuffled = [...ALL_SKILLS].sort(() => 0.5 - Math.random());
    const choices = shuffled.slice(0, 3);
    
    choices.forEach(skill => {
        const div = document.createElement('div');
        div.className = 'skill-card';
        div.innerHTML = `
            <div class="skill-icon">${skill.icon}</div>
            <div class="skill-info">
                <h3>${skill.name} LV.${(player.skills[skill.id] || 0) + 1}</h3>
                <p>${skill.desc}</p>
            </div>
        `;
        div.onclick = () => selectSkill(skill.id);
        skillOptions.appendChild(div);
    });
    
    skillSelection.classList.remove('hidden');
}

function selectSkill(id) {
    if (id === 'hp_boost') {
        player.maxHp += 20;
        player.hp += 20;
    } else {
        player.skills[id] = (player.skills[id] || 0) + 1;
    }
    
    skillSelection.classList.add('hidden');
    gameRunning = true;
    lastTime = Date.now();
    requestAnimationFrame(gameLoop);
}

function endGame() {
    gameRunning = false;
    gameOverScreen.classList.remove('hidden');
    document.getElementById('final-time').textContent = timerEl.textContent;
    document.getElementById('final-kills').textContent = player.kills;
    document.getElementById('final-level').textContent = player.level;
}

init();
