const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let GROUND_Y = window.innerHeight * 0.8;
let PLAYER_BASE_X = 150;
let WORLD_WIDTH = 4000;
let ENEMY_BASE_X = WORLD_WIDTH - 400;

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    GROUND_Y = canvas.height * 0.8;
}
window.addEventListener('resize', resize);
resize();

const assets = {};
const assetPaths = {
    background: 'assets/background.png',
    player_base: 'assets/player_base.png',
    enemy_base: 'assets/enemy_base.png',
    cat: 'assets/cat_basic.png',
    tank: 'assets/cat_tank.png',
    ninja: 'assets/cat_ninja.png',
    bird: 'assets/cat_bird.png',
    enemy_basic: 'assets/enemy_basic.png'
};

function processImage(img, name) {
    try {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tCtx = tempCanvas.getContext('2d');
        tCtx.drawImage(img, 0, 0);
        
        // Always remove background for units and bases
        if (name !== 'background') {
            const imageData = tCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i+1], b = data[i+2];
                // Aggressive white removal
                if (r > 180 && g > 180 && b > 180) {
                    data[i + 3] = 0;
                }
            }
            tCtx.putImageData(imageData, 0, 0);
        }
        
        tempCanvas.isReady = true; // Use clear flag
        assets[name] = tempCanvas;
        
        // Update UI button with processed image
        const btnIcon = document.querySelector(`.unit-btn[data-unit="${name}"] .icon`);
        if (btnIcon) {
            btnIcon.innerHTML = '';
            const previewImg = document.createElement('img');
            previewImg.src = tempCanvas.toDataURL();
            previewImg.style.width = '100%';
            previewImg.style.imageRendering = 'pixelated';
            btnIcon.appendChild(previewImg);
        }
    } catch (e) {
        console.error("Asset processing failed:", name, e);
        img.isReady = true;
        assets[name] = img;
    }
}

function loadAssets() {
    Object.entries(assetPaths).forEach(([name, path]) => {
        const img = new Image();
        img.onload = () => processImage(img, name);
        img.src = path;
    });
}

// Unit Stats
const UNIT_TYPES = {
    cat: { cost: 50, hp: 100, atk: 12, speed: 2.5, range: 60, cooldown: 2000, size: 80 },
    tank: { cost: 150, hp: 600, atk: 5, speed: 1.5, range: 50, cooldown: 5000, size: 100 },
    ninja: { cost: 300, hp: 180, atk: 35, speed: 4.0, range: 70, cooldown: 6000, size: 90 },
    bird: { cost: 500, hp: 120, atk: 50, speed: 2.2, range: 180, cooldown: 8000, size: 90 },
    enemy_basic: { hp: 150, atk: 15, speed: 1.8, range: 60, size: 85 }
};

class Base {
    constructor(x, color, isPlayer) {
        this.x = x;
        this.width = 200;
        this.height = 300;
        this.hp = 2000;
        this.maxHp = 2000;
        this.isPlayer = isPlayer;
        this.color = color;
    }

    draw() {
        const drawX = this.isPlayer ? this.x - this.width : this.x;
        const drawY = GROUND_Y - this.height;
        
        ctx.fillStyle = this.color;
        ctx.fillRect(drawX, drawY, this.width, this.height);
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(drawX, drawY, this.width, 30);
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 30px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.floor(this.hp)}`, drawX + this.width/2, drawY - 20);
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;
    }
}

class Unit {
    constructor(type, isPlayer, x) {
        const stats = UNIT_TYPES[type];
        this.type = type;
        this.isPlayer = isPlayer;
        this.x = x;
        this.hp = stats.hp;
        this.maxHp = stats.hp;
        this.atk = stats.atk;
        this.speed = stats.speed;
        this.range = stats.range;
        this.size = stats.size;
        this.state = 'walk';
        this.attackCooldown = 0;
        this.attackInterval = 1000;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, GROUND_Y);
        const bounce = this.state === 'walk' ? Math.abs(Math.sin(Date.now() / 150)) * 15 : 0;
        ctx.translate(0, -bounce);

        const assetKey = this.type === 'enemy_basic' ? 'enemy_basic' : this.type;
        const img = assets[assetKey];
        if (!this.isPlayer) ctx.scale(-1, 1);

        if (img) { // More robust check
            ctx.drawImage(img, -this.size/2, -this.size, this.size, this.size);
        }

        if (this.hp < this.maxHp) {
            const barW = this.size * 0.9;
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(-barW/2, -this.size - 25, barW, 10);
            ctx.fillStyle = this.isPlayer ? '#4ecdc4' : '#ff6b6b';
            ctx.fillRect(-barW/2, -this.size - 25, barW * (this.hp / this.maxHp), 10);
        }
        ctx.restore();
    }

    update(enemies, targetBase, dt) {
        if (this.hp <= 0) return;

        const distToBase = this.isPlayer ? 
            (targetBase.x - this.x) : 
            (this.x - (targetBase.x + targetBase.width));

        if (distToBase < this.range) {
            this.state = 'attack';
            if (this.attackCooldown <= 0) {
                targetBase.takeDamage(this.atk);
                this.attackCooldown = this.attackInterval;
                this.x += this.isPlayer ? 10 : -10;
                setTimeout(() => this.x -= this.isPlayer ? 10 : -10, 80);
            }
        } else {
            let nearestEnemy = null;
            let minDist = Infinity;
            enemies.forEach(enemy => {
                const d = this.isPlayer ? (enemy.x - this.x) : (this.x - enemy.x);
                if (d > 0 && d < minDist) {
                    minDist = d;
                    nearestEnemy = enemy;
                }
            });

            if (nearestEnemy && minDist < this.range) {
                this.state = 'attack';
                if (this.attackCooldown <= 0) {
                    nearestEnemy.takeDamage(this.atk);
                    this.attackCooldown = this.attackInterval;
                    this.x += this.isPlayer ? 10 : -10;
                    setTimeout(() => this.x -= this.isPlayer ? 10 : -10, 80);
                }
            } else {
                this.state = 'walk';
                this.x += this.isPlayer ? this.speed : -this.speed;
            }
        }
        if (this.attackCooldown > 0) this.attackCooldown -= dt;
    }

    takeDamage(amount) {
        this.hp -= amount;
    }
}

class Game {
    constructor() {
        this.money = 200;
        this.moneyLevel = 1;
        this.moneyCaps = [500, 1000, 2000, 4000, 8000, 15000];
        this.moneyRates = [0.3, 0.6, 1.2, 2.5, 5.0, 10.0];
        
        this.cannonCharge = 0;
        this.cannonMaxCharge = 7000;
        this.cannonFiring = false;
        
        this.playerUnits = [];
        this.enemyUnits = [];
        this.cameraX = 0;
        this.targetCameraX = 0;
        this.lastTime = performance.now();
        this.gameOver = false;
        
        this.enemySpawnTimer = 1500;
        this.enemySpawnInterval = 4500;
        this.cooldowns = { cat: 0, tank: 0, ninja: 0, bird: 0 };

        this.playerBase = new Base(PLAYER_BASE_X, '#4ecdc4', true);
        this.enemyBase = new Base(ENEMY_BASE_X, '#ff6b6b', false);

        loadAssets();
        this.initUI();
        this.loop();
    }

    initUI() {
        document.querySelectorAll('.unit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.unit;
                const stats = UNIT_TYPES[type];
                if (this.money >= stats.cost && this.cooldowns[type] <= 0) {
                    this.money -= stats.cost;
                    this.playerUnits.push(new Unit(type, true, PLAYER_BASE_X + 30));
                    this.cooldowns[type] = stats.cooldown;
                }
            });
        });

        document.getElementById('btn-upgrade').addEventListener('click', () => {
            const cost = this.moneyLevel * 200;
            if (this.money >= cost && this.moneyLevel < this.moneyCaps.length) {
                this.money -= cost;
                this.moneyLevel++;
                document.getElementById('upgrade-lvl').innerText = this.moneyLevel;
                document.getElementById('upgrade-cost').innerText = this.moneyLevel < this.moneyCaps.length ? this.moneyLevel * 200 : 'MAX';
            }
        });

        document.getElementById('btn-cannon').addEventListener('click', () => {
            if (this.cannonCharge >= this.cannonMaxCharge) {
                this.cannonCharge = 0;
                this.cannonFiring = true;
                setTimeout(() => {
                    this.enemyUnits.forEach(u => {
                        const relX = u.x - (this.playerBase.x);
                        if (relX < 1200 && relX > 0) u.takeDamage(250);
                    });
                    this.cannonFiring = false;
                }, 700);
            }
        });

        let isDragging = false;
        let startX = 0;
        canvas.addEventListener('mousedown', (e) => { isDragging = true; startX = e.clientX; });
        window.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const dx = e.clientX - startX;
                this.targetCameraX -= dx;
                startX = e.clientX;
            }
        });
        window.addEventListener('mouseup', () => isDragging = false);
    }

    update(dt) {
        if (this.gameOver) return;

        this.money = Math.min(this.moneyCaps[this.moneyLevel-1], this.money + this.moneyRates[this.moneyLevel-1] * (dt/16));
        document.getElementById('money-amount').innerText = Math.floor(this.money);
        document.getElementById('money-cap').innerText = this.moneyCaps[this.moneyLevel-1];

        this.cannonCharge = Math.min(this.cannonMaxCharge, this.cannonCharge + dt);
        document.getElementById('cannon-fill').style.width = `${(this.cannonCharge / this.cannonMaxCharge) * 100}%`;
        document.getElementById('btn-cannon').disabled = this.cannonCharge < this.cannonMaxCharge;

        const maxCam = WORLD_WIDTH - canvas.width;
        this.targetCameraX = Math.max(0, Math.min(maxCam, this.targetCameraX));
        this.cameraX += (this.targetCameraX - this.cameraX) * 0.15;

        for (let k in this.cooldowns) {
            if (this.cooldowns[k] > 0) {
                this.cooldowns[k] -= dt;
                const progress = (this.cooldowns[k] / UNIT_TYPES[k].cooldown) * 100;
                const cooldownEl = document.getElementById(`btn-${k}`).querySelector('.cooldown');
                if (cooldownEl) cooldownEl.style.height = `${progress}%`;
            }
            const btn = document.getElementById(`btn-${k}`);
            if (btn) btn.disabled = this.money < UNIT_TYPES[k].cost || this.cooldowns[k] > 0;
        }

        const upBtn = document.getElementById('btn-upgrade');
        if (upBtn) upBtn.disabled = this.money < this.moneyLevel * 200 || this.moneyLevel >= this.moneyCaps.length;

        this.enemySpawnTimer -= dt;
        if (this.enemySpawnTimer <= 0) {
            this.enemyUnits.push(new Unit('enemy_basic', false, ENEMY_BASE_X - 30));
            this.enemySpawnTimer = this.enemySpawnInterval;
            this.enemySpawnInterval = Math.max(1500, this.enemySpawnInterval * 0.97);
        }

        this.playerUnits.forEach(u => u.update(this.enemyUnits, this.enemyBase, dt));
        this.enemyUnits.forEach(u => u.update(this.playerUnits, this.playerBase, dt));
        this.playerUnits = this.playerUnits.filter(u => u.hp > 0);
        this.enemyUnits = this.enemyUnits.filter(u => u.hp > 0);

        if (this.playerBase.hp <= 0) this.endGame(false);
        if (this.enemyBase.hp <= 0) this.endGame(true);

        document.getElementById('player-hp-fill').style.width = `${(this.playerBase.hp / this.playerBase.maxHp) * 100}%`;
        document.getElementById('enemy-hp-fill').style.width = `${(this.enemyBase.hp / this.enemyBase.maxHp) * 100}%`;
    }

    draw() {
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(-this.cameraX, 0);

        // Background
        if (assets.background && assets.background.ready) {
            const bh = canvas.height;
            const bw = (assets.background.width / assets.background.height) * bh;
            for(let x=0; x < WORLD_WIDTH; x += bw) ctx.drawImage(assets.background, x, 0, bw, bh);
        } else {
            ctx.fillStyle = '#90EE90';
            ctx.fillRect(0, GROUND_Y, WORLD_WIDTH, canvas.height - GROUND_Y);
        }

        // Cannon Effect
        if (this.cannonFiring) {
            const grad = ctx.createLinearGradient(PLAYER_BASE_X, 0, PLAYER_BASE_X + 1200, 0);
            grad.addColorStop(0, 'rgba(0, 200, 255, 0.7)');
            grad.addColorStop(1, 'rgba(0, 200, 255, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(PLAYER_BASE_X, 0, 1200, canvas.height);
        }

        this.playerBase.draw();
        this.enemyBase.draw();
        
        this.playerUnits.forEach(u => u.draw());
        this.enemyUnits.forEach(u => u.draw());

        ctx.restore();
    }

    endGame(win) {
        this.gameOver = true;
        document.getElementById('game-over').classList.remove('hidden');
        const title = document.getElementById('result-title');
        title.innerText = win ? 'VICTORY!' : 'DEFEAT...';
        title.style.color = win ? '#4ecdc4' : '#ff6b6b';
    }

    loop() {
        const now = performance.now();
        this.update(now - this.lastTime);
        this.draw();
        this.lastTime = now;
        if (!this.gameOver) requestAnimationFrame(() => this.loop());
    }
}

window.onload = () => new Game();
