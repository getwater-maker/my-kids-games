/* js/main.js - Battle Cats Logic */

const CONFIG = {
    battlefieldWidth: 2000,
    playerBasePos: 50,
    enemyBasePos: 1950,
    baseMaxHp: 2000,
    moneyTick: 5, // ms
    initialMoney: 0,
    initialMaxMoney: 1000,
    enemySpawnRate: 4000, // ms
};

const UNIT_TYPES = {
    'cat': { hp: 100, atk: 15, spd: 2, range: 40, cost: 50, cd: 2000, icon: '🐈' },
    'tank': { hp: 500, atk: 5, spd: 1.2, range: 40, cost: 150, cd: 4000, icon: '🧱' },
    'axe': { hp: 150, atk: 35, spd: 2.5, range: 45, cost: 300, cd: 3000, icon: '🪓' },
    'cow': { hp: 200, atk: 20, spd: 5.0, range: 40, cost: 500, cd: 4000, icon: '🐄' },
    'bird': { hp: 150, atk: 50, spd: 1.8, range: 150, cost: 650, cd: 5000, icon: '🐦' },
    'fish': { hp: 600, atk: 80, spd: 1.5, range: 50, cost: 800, cd: 6000, icon: '🐟' },
    'titan': { hp: 1500, atk: 200, spd: 1, range: 70, cost: 1500, cd: 15000, icon: '🦁' },
    'enemy_doge': { hp: 100, atk: 10, spd: 2, range: 40, icon: '🐕' },
    'enemy_snake': { hp: 80, atk: 15, spd: 3, range: 40, icon: '🐍' },
    'enemy_hippo': { hp: 1000, atk: 40, spd: 1, range: 50, icon: '🦛' }
};

class Game {
    constructor() {
        this.money = CONFIG.initialMoney;
        this.maxMoney = CONFIG.initialMaxMoney;
        this.workerLevel = 1;
        this.playerBaseHp = CONFIG.baseMaxHp;
        this.enemyBaseHp = CONFIG.baseMaxHp;
        this.units = [];
        this.enemies = [];
        this.isGameOver = false;
        this.lastTime = 0;
        this.moneyTimer = 0;
        this.enemySpawnTimer = 0;
        this.scrollPos = 0;

        this.cannonCharge = 0;
        this.cannonMaxCharge = 100;
        this.isCannonReady = false;

        this.init();
    }

    init() {
        const startBtn = document.getElementById('start-btn');
        startBtn.onclick = () => {
            document.getElementById('start-overlay').classList.add('hidden');
            this.start();
        };

        const upgradeBtn = document.getElementById('upgrade-worker-btn');
        upgradeBtn.onclick = () => this.upgradeWorker();

        const cannonBtn = document.getElementById('fire-cannon-btn');
        cannonBtn.onclick = () => this.fireCannon();

        const slots = document.querySelectorAll('.unit-slot');
        slots.forEach(slot => {
            slot.onclick = () => this.spawnUnit(slot.dataset.type);
        });

        // Horizontal Scrolling (mouse wheel)
        window.onwheel = (e) => {
            this.scrollPos = Math.max(0, Math.min(this.scrollPos + e.deltaY, CONFIG.battlefieldWidth - window.innerWidth));
            document.getElementById('battlefield').style.transform = `translateX(${-this.scrollPos}px)`;
        };
    }

    start() {
        requestAnimationFrame((t) => this.loop(t));
    }

    loop(time) {
        if (this.isGameOver) return;
        const dt = time - this.lastTime;
        this.lastTime = time;

        this.update(dt);
        this.render();

        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        // Money tick
        this.moneyTimer += dt;
        if (this.moneyTimer > 100) {
            this.money = Math.min(this.maxMoney, this.money + (this.workerLevel * 2));
            this.moneyTimer = 0;
        }

        // Cannon Charge
        if (!this.isCannonReady) {
            this.cannonCharge += dt / 300; // Charge speed
            if (this.cannonCharge >= this.cannonMaxCharge) {
                this.cannonCharge = this.cannonMaxCharge;
                this.isCannonReady = true;
                document.getElementById('fire-cannon-btn').classList.add('ready');
            }
            document.getElementById('cannon-charge-bar').style.width = this.cannonCharge + '%';
        }

        // Enemy spawning
        this.enemySpawnTimer += dt;
        if (this.enemySpawnTimer > CONFIG.enemySpawnRate) {
            this.spawnEnemy();
            this.enemySpawnTimer = 0;
        }

        // Update units
        this.units.forEach(u => u.update(dt, this.enemies, this.enemyBaseHp, CONFIG.enemyBasePos));
        this.enemies.forEach(e => e.update(dt, this.units, this.playerBaseHp, CONFIG.playerBasePos));

        // Cleanup dead
        this.units = this.units.filter(u => u.hp > 0);
        this.enemies = this.enemies.filter(e => e.hp > 0);

        // Check base damage
        this.units.forEach(u => {
            if (u.isAttackingBase) {
                this.enemyBaseHp -= u.atk * (dt / 1000);
            }
        });
        this.enemies.forEach(e => {
            if (e.isAttackingBase) {
                this.playerBaseHp -= e.atk * (dt / 1000);
            }
        });

        if (this.playerBaseHp <= 0) this.gameOver(false);
        if (this.enemyBaseHp <= 0) this.gameOver(true);

        this.updateUI();
    }

    render() {
        // Most rendering is handled by DOM manipulation in Unit class
    }

    spawnUnit(type) {
        const unitData = UNIT_TYPES[type];
        if (this.money >= unitData.cost) {
            this.money -= unitData.cost;
            const u = new Unit(type, false);
            this.units.push(u);

            // Cooldown animation
            const slot = document.querySelector(`.unit-slot[data-type="${type}"]`);
            const overlay = slot.querySelector('.cooldown-overlay');
            overlay.style.height = '100%';
            let start = Date.now();
            const cdInterval = setInterval(() => {
                let elapsed = Date.now() - start;
                let percent = Math.max(0, 100 - (elapsed / unitData.cd * 100));
                overlay.style.height = percent + '%';
                if (percent <= 0) clearInterval(cdInterval);
            }, 50);
        }
    }

    spawnEnemy() {
        const types = ['enemy_doge', 'enemy_snake', 'enemy_hippo'];
        const weights = [0.6, 0.3, 0.1];
        let rand = Math.random();
        let cumulative = 0;
        let type = types[0];
        for (let i = 0; i < weights.length; i++) {
            cumulative += weights[i];
            if (rand < cumulative) {
                type = types[i];
                break;
            }
        }
        const e = new Unit(type, true);
        this.enemies.push(e);
    }

    fireCannon() {
        if (!this.isCannonReady) return;

        this.isCannonReady = false;
        this.cannonCharge = 0;
        const btn = document.getElementById('fire-cannon-btn');
        btn.classList.remove('ready');

        // Visual Effect
        const beam = document.getElementById('cannon-beam');
        beam.classList.add('firing');
        setTimeout(() => beam.classList.remove('firing'), 400);

        // Damage enemies on screen
        const screenStart = this.scrollPos;
        const screenEnd = this.scrollPos + window.innerWidth;

        this.enemies.forEach(en => {
            if (en.x >= screenStart && en.x <= screenEnd) {
                en.hp -= 200; // Cannon damage
                en.showHitEffect(en.x);
                // Knockback
                en.x += 100;
                en.updateElement();
            }
        });
    }

    upgradeWorker() {
        if (this.workerLevel >= 8) return;
        const upgradeCosts = [100, 200, 400, 800, 1600, 3200, 6400];
        const cost = upgradeCosts[this.workerLevel - 1];
        if (this.money >= cost) {
            this.money -= cost;
            this.workerLevel++;
            this.maxMoney += 1000;
            document.getElementById('upgrade-cost').textContent = this.workerLevel < 8 ? `Lv.${this.workerLevel} - ${upgradeCosts[this.workerLevel - 1]}` : 'Lv.MAX';
            this.updateUI();
        }
    }

    updateUI() {
        document.getElementById('money-val').textContent = Math.floor(this.money);
        document.getElementById('max-money-val').textContent = this.maxMoney;

        // Update slot availability
        document.querySelectorAll('.unit-slot').forEach(slot => {
            const cost = UNIT_TYPES[slot.dataset.type].cost;
            if (this.money < cost) slot.classList.add('disabled');
            else slot.classList.remove('disabled');
        });

        // Update Base HPs
        document.querySelector('#player-base .hp-fill').style.width = (this.playerBaseHp / CONFIG.baseMaxHp * 100) + '%';
        document.querySelector('#enemy-base .hp-fill').style.width = (this.enemyBaseHp / CONFIG.baseMaxHp * 100) + '%';
    }

    gameOver(isVictory) {
        this.isGameOver = true;
        const overlay = document.getElementById('game-over-overlay');
        overlay.classList.remove('hidden');
        document.getElementById('result-title').textContent = isVictory ? "VICTORY!" : "DEFEAT...";
        document.getElementById('result-title').style.color = isVictory ? "#1dd1a1" : "#ff6b6b";
        document.getElementById('result-msg').textContent = isVictory ? "The cats reign supreme!" : "Base destroyed. Humanity is lost.";
    }
}

class Unit {
    constructor(type, isEnemy) {
        this.type = type;
        this.isEnemy = isEnemy;
        const data = UNIT_TYPES[type];
        this.maxHp = data.hp;
        this.hp = data.hp;
        this.atk = data.atk;
        this.spd = data.spd;
        this.range = data.range;
        this.icon = data.icon;

        this.x = isEnemy ? CONFIG.enemyBasePos : CONFIG.playerBasePos;
        this.lastAttackTime = 0;
        this.attackCooldown = 1000;
        this.isAttackingBase = false;

        this.createElement();
    }

    createElement() {
        this.element = document.createElement('div');
        this.element.className = 'unit' + (this.isEnemy ? ' enemy' : '');
        this.element.textContent = this.icon;

        this.hpElement = document.createElement('div');
        this.hpElement.className = 'unit-hp';
        this.element.appendChild(this.hpElement);

        document.getElementById('units-container').appendChild(this.element);
        this.updateElement();
    }

    update(dt, opponents, baseHp, basePos) {
        if (this.hp <= 0) return;

        let target = this.findTarget(opponents);
        let distToBase = Math.abs(this.x - basePos);

        if (target) {
            this.attack(target, dt);
        } else if (distToBase <= this.range) {
            this.isAttackingBase = true;
            this.attackBase(dt);
        } else {
            this.isAttackingBase = false;
            // Move
            this.x += (this.isEnemy ? -this.spd : this.spd);
            this.updateElement();
        }
    }

    findTarget(opponents) {
        for (let op of opponents) {
            let dist = Math.abs(this.x - op.x);
            if (dist < this.range) return op;
        }
        return null;
    }

    attack(target, dt) {
        const now = Date.now();
        if (now - this.lastAttackTime > this.attackCooldown) {
            target.hp -= this.atk;
            this.lastAttackTime = now;
            this.showHitEffect(target.x);
            // Visual bounce
            this.element.style.transform = `scale(1.2) ${this.isEnemy ? 'scaleX(-1)' : ''}`;
            setTimeout(() => this.element.style.transform = `${this.isEnemy ? 'scaleX(-1)' : ''}`, 100);
        }
    }

    attackBase(dt) {
        const now = Date.now();
        if (now - this.lastAttackTime > this.attackCooldown) {
            this.lastAttackTime = now;
            // Visual bounce
            this.element.style.transform = `scale(1.2) ${this.isEnemy ? 'scaleX(-1)' : ''}`;
            setTimeout(() => this.element.style.transform = `${this.isEnemy ? 'scaleX(-1)' : ''}`, 100);
        }
    }

    updateElement() {
        this.element.style.left = this.x + 'px';
        const hpPercent = (this.hp / this.maxHp) * 100;
        this.hpElement.style.width = (hpPercent * 0.3) + 'px'; // Scaled down

        if (this.hp <= 0) {
            this.element.style.transition = 'opacity 0.5s, transform 0.5s';
            this.element.style.opacity = '0';
            this.element.style.transform += ' translateY(-20px) rotate(45deg)';
            setTimeout(() => this.element.remove(), 500);
        }
    }

    showHitEffect(x) {
        const p = document.createElement('div');
        p.className = 'hit-particle';
        p.textContent = '💥';
        p.style.left = x + 'px';
        p.style.bottom = '35%';
        document.getElementById('effects-container').appendChild(p);
        setTimeout(() => p.remove(), 500);
    }
}

// Start Game
new Game();
