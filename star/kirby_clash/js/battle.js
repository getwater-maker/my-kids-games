// js/battle.js

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let battleLoop;
let isBattleActive = false;
let battleTime = 0;
let lastTime = 0;

// Input state
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false,
    z: false
};

// Game Entities
let player;
let boss;
let ais = [];
let particles = [];
let damageTexts = [];

// Constants
const GRAVITY = 0.5;
const GROUND_Y = 350;

class Character {
    constructor(x, y, color, role) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 40;
        this.color = color;
        this.role = role;

        this.vx = 0;
        this.vy = 0;
        this.speed = 5;
        this.jumpPower = -10;

        this.maxHp = 100 * state.upgrades.hp; // Apply HP upgrade
        this.hp = this.maxHp;
        this.atk = 10 * Math.pow(state.upgrades.atk, 2); // 데미지를 올리면 올릴수록 많이 들어가게 (2차 함수 비례)
        this.isAttacking = false;
        this.attackCooldown = 0;
        this.facingRight = true;
    }

    update() {
        // Gravity
        this.vy += GRAVITY;
        this.y += this.vy;

        if (this.y + this.height > GROUND_Y) {
            this.y = GROUND_Y - this.height;
            this.vy = 0;
        }

        this.x += this.vx;

        // Boundaries
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;

        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }
    }

    draw(ctx) {
        // Draw Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(this.x + this.width / 2, this.y + this.height, 15, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        let faceDir = this.facingRight;

        // Feet
        ctx.fillStyle = (this.role === 'sword') ? '#ff4040' :
            (this.role === 'hammer') ? '#ffaa00' :
                (this.role === 'magic') ? '#ff4040' : '#44dd44';

        if (faceDir) {
            ctx.beginPath(); ctx.ellipse(-8, 15, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(12, 15, 14, 8, -Math.PI / 8, 0, Math.PI * 2); ctx.fill();
        } else {
            ctx.beginPath(); ctx.ellipse(8, 15, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(-12, 15, 14, 8, Math.PI / 8, 0, Math.PI * 2); ctx.fill();
        }

        // Body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = 'black';
        ctx.beginPath();
        if (faceDir) {
            ctx.ellipse(4, -4, 2.5, 7, 0, 0, Math.PI * 2); ctx.fill();
            ctx.ellipse(12, -4, 2.5, 7, 0, 0, Math.PI * 2); ctx.fill();
        } else {
            ctx.ellipse(-4, -4, 2.5, 7, 0, 0, Math.PI * 2); ctx.fill();
            ctx.ellipse(-12, -4, 2.5, 7, 0, 0, Math.PI * 2); ctx.fill();
        }

        // Blush
        ctx.fillStyle = '#ff9999';
        ctx.beginPath();
        if (faceDir) {
            ctx.ellipse(-2, 2, 4, 2.5, 0, 0, Math.PI * 2); ctx.fill();
            ctx.ellipse(18, 2, 4, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        } else {
            ctx.ellipse(2, 2, 4, 2.5, 0, 0, Math.PI * 2); ctx.fill();
            ctx.ellipse(-18, 2, 4, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        }

        // Role specifics
        if (this.role === 'sword') {
            ctx.fillStyle = '#22cc44'; // Green Hat
            ctx.beginPath();
            if (faceDir) { ctx.moveTo(-5, -12); ctx.lineTo(-25, 0); ctx.lineTo(10, -18); }
            else { ctx.moveTo(5, -12); ctx.lineTo(25, 0); ctx.lineTo(-10, -18); }
            ctx.fill();
        } else if (this.role === 'hammer') {
            ctx.strokeStyle = '#eeeeee'; // Headband
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-16, -10); ctx.lineTo(16, -10);
            ctx.stroke();
            // Minor crown jewel
            ctx.fillStyle = '#ff00ff';
            ctx.beginPath(); ctx.arc(0, -10, 4, 0, Math.PI * 2); ctx.fill();
        } else if (this.role === 'magic') {
            ctx.fillStyle = '#aa55ff'; // Mage Hat
            ctx.beginPath();
            ctx.moveTo(-15, -10); ctx.lineTo(15, -10); ctx.lineTo(0, -30);
            ctx.fill();
        } else if (this.role === 'flask') {
            ctx.strokeStyle = '#ff3333'; // Glasses (Doctor)
            ctx.lineWidth = 2;
            ctx.beginPath();
            if (faceDir) { ctx.arc(4, -4, 5, 0, Math.PI * 2); ctx.arc(12, -4, 5, 0, Math.PI * 2); }
            else { ctx.arc(-4, -4, 5, 0, Math.PI * 2); ctx.arc(-12, -4, 5, 0, Math.PI * 2); }
            ctx.stroke();
            ctx.fillStyle = '#fff'; // White cap
            ctx.beginPath(); ctx.arc(0, -15, 12, Math.PI, 0); ctx.fill();
        }

        ctx.restore();

        // Attack hitbox visual
        if (this.isAttacking) {
            ctx.save();
            if (this.role === 'sword') {
                ctx.fillStyle = '#ffffff';
                if (faceDir) { ctx.fillRect(this.x + this.width, this.y - 5, 15, 30); }
                else { ctx.fillRect(this.x - 15, this.y - 5, 15, 30); }
            } else if (this.role === 'hammer') {
                ctx.fillStyle = '#654321';
                if (faceDir) { ctx.fillRect(this.x + this.width, this.y, 25, 25); }
                else { ctx.fillRect(this.x - 25, this.y, 25, 25); }
            } else if (this.role === 'magic') {
                ctx.fillStyle = '#00ffff';
                if (faceDir) { ctx.beginPath(); ctx.arc(this.x + this.width + 10, this.y + 20, 15, 0, Math.PI * 2); ctx.fill(); }
                else { ctx.beginPath(); ctx.arc(this.x - 10, this.y + 20, 15, 0, Math.PI * 2); ctx.fill(); }
            } else if (this.role === 'flask') {
                ctx.fillStyle = '#00ff00';
                if (faceDir) { ctx.beginPath(); ctx.arc(this.x + this.width + 15, this.y + 25, 10, 0, Math.PI * 2); ctx.fill(); }
                else { ctx.beginPath(); ctx.arc(this.x - 15, this.y + 25, 10, 0, Math.PI * 2); ctx.fill(); }
            }
            ctx.restore();
        }
    }

    attack(target) {
        if (this.attackCooldown <= 0) {
            this.isAttacking = true;
            this.attackCooldown = 30; // frames

            setTimeout(() => {
                this.isAttacking = false;
            }, 100);

            // Check hit
            let hitbox = {
                x: this.facingRight ? this.x + this.width : this.x - 30,
                y: this.y + 10,
                w: 30,
                h: 20
            };

            if (checkCollision(hitbox, target)) {
                target.takeDamage(this.atk);
                spawnDamageText(target.x + target.width / 2, target.y, this.atk);
                spawnParticles(target.x + target.width / 2, target.y + target.height / 2, this.color);
            }
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;
        updateHUD();
    }
}

class Boss {
    constructor(bossType) {
        this.type = bossType;
        this.width = 120;
        this.height = 120;
        this.x = canvas.width - this.width - 50;

        switch (bossType) {
            case 'whispy':
                this.maxHp = 1500;
                this.width = 100;
                this.height = 180;
                this.y = GROUND_Y - this.height;
                break;
            case 'kracko':
                this.maxHp = 1200;
                this.width = 140;
                this.height = 90;
                this.y = GROUND_Y - this.height - 100; // Floats
                break;
            case 'dedede':
                this.maxHp = 2500;
                this.width = 130;
                this.height = 130;
                this.y = GROUND_Y - this.height;
                break;
            case 'metaknight':
                this.maxHp = 1800;
                this.width = 100;
                this.height = 100;
                this.y = GROUND_Y - this.height;
                break;
            case 'marx':
                this.maxHp = 2200;
                this.width = 110;
                this.height = 110;
                this.y = GROUND_Y - this.height - 80;
                break;
            case 'magolor':
                this.maxHp = 2800;
                this.width = 120;
                this.height = 150;
                this.y = GROUND_Y - this.height - 50;
                break;
            case 'galacta':
                this.maxHp = 4000;
                this.width = 110;
                this.height = 110;
                this.y = GROUND_Y - this.height - 30;
                break;
            case 'darkmeta': this.maxHp = 4500; this.width = 100; this.height = 100; this.y = GROUND_Y - this.height; break;
            case 'sectonia': this.maxHp = 5000; this.width = 120; this.height = 140; this.y = GROUND_Y - this.height - 80; break;
            case 'stardream': this.maxHp = 6000; this.width = 160; this.height = 160; this.y = GROUND_Y - this.height - 100; break;
            case 'void': this.maxHp = 7000; this.width = 150; this.height = 150; this.y = GROUND_Y - this.height - 50; break;
            case 'zero': this.maxHp = 6500; this.width = 130; this.height = 130; this.y = GROUND_Y - this.height - 120; break;
            case 'nightmare': this.maxHp = 4000; this.width = 110; this.height = 150; this.y = GROUND_Y - this.height; break;
            case 'darkmind': this.maxHp = 5500; this.width = 120; this.height = 120; this.y = GROUND_Y - this.height - 70; break;
            case 'drawcia': this.maxHp = 4800; this.width = 110; this.height = 130; this.y = GROUND_Y - this.height - 60; break;
            case 'magolorsoul': this.maxHp = 8000; this.width = 130; this.height = 160; this.y = GROUND_Y - this.height - 60; break;
            case 'chaos': this.maxHp = 9999; this.width = 140; this.height = 160; this.y = GROUND_Y - this.height - 80; break;
            case 'finalboss': this.maxHp = 15000; this.width = 150; this.height = 150; this.y = GROUND_Y - this.height - 100; break;
            default:
                this.maxHp = 2000;
                this.y = GROUND_Y - this.height;
        }

        this.hp = this.maxHp;
        this.state = 'idle';
        this.stateTimer = 0;
        this.startX = this.x;
    }

    update() {
        this.stateTimer++;

        if (this.state === 'idle' && this.stateTimer > 150 - (this.maxHp % 50)) {
            this.state = 'attack';
            this.stateTimer = 0;
        } else if (this.state === 'attack' && this.stateTimer > 60) {
            // Boss attack logic based on type
            let dmg = 15;
            let shockwave = null;

            if (this.type === 'whispy') {
                // Apples drop
                for (let i = 0; i < 3; i++) {
                    let rx = this.x - 200 + Math.random() * 150;
                    spawnParticles(rx, this.y + 50, '#ff0000');
                    if (Math.abs(player.x - rx) < 40) { player.takeDamage(10); spawnDamageText(player.x, player.y, 10); }
                    ais.forEach(ai => { if (Math.abs(ai.x - rx) < 40) ai.takeDamage(10); });
                }
            } else if (this.type === 'kracko') {
                // Lightning strike below kracko
                shockwave = { x: this.x - 50, y: GROUND_Y - 100, w: this.width + 100, h: 100 };
                dmg = 20;
            } else if (this.type === 'dedede') {
                // Dedede Hammer Slam
                shockwave = { x: this.x - 120, y: this.y + this.height - 40, w: 120, h: 40 };
                dmg = 25;
            } else if (this.type === 'metaknight') {
                // Tornado swoop
                shockwave = { x: 0, y: GROUND_Y - 80, w: canvas.width, h: 80 };
                dmg = 30;
            } else if (this.type === 'marx') {
                // Laser beam straight down
                shockwave = { x: this.x - 150, y: GROUND_Y - 50, w: 150, h: 50 };
                dmg = 35;
            } else if (this.type === 'magolor') {
                // Black hole
                shockwave = { x: canvas.width / 2 - 100, y: GROUND_Y - 60, w: 200, h: 60 };
                dmg = 45;
            } else if (this.type === 'galacta') {
                // Screen wipe wave
                shockwave = { x: 0, y: GROUND_Y - 120, w: canvas.width, h: 40 };
                dmg = 60;
            } else if (['darkmeta', 'sectonia', 'stardream', 'void', 'zero', 'nightmare', 'darkmind', 'drawcia', 'magolorsoul', 'chaos'].includes(this.type)) {
                // 공통된 후반 보스 광역 공격
                let h = 50 + (this.maxHp / 200); // 70~100 높이
                shockwave = { x: 0, y: GROUND_Y - h, w: canvas.width, h: h };
                dmg = 40 + (this.maxHp / 100); // 85 ~ 140 데미지
            } else if (this.type === 'finalboss') {
                // 대왕 보스의 무서운 손 공격 (화면 절반 이상을 뒤덮는 내려치기)
                shockwave = { x: 0, y: GROUND_Y - 150, w: canvas.width - 250, h: 150 };
                dmg = 120;
            }

            if (shockwave) {
                if (checkCollision(shockwave, player)) {
                    player.takeDamage(dmg);
                    spawnDamageText(player.x, player.y, dmg);
                }
                ais.forEach(ai => {
                    if (checkCollision(shockwave, ai)) {
                        ai.takeDamage(dmg);
                    }
                });
            }
            this.state = 'idle';
            this.stateTimer = 0;
            this.startX = this.x; // reset baseline x after attack if needed
        }

        // Bobbing & Moving logic side to side while idle
        if (this.state === 'idle') {
            this.x = this.startX + Math.sin(Date.now() / 800) * 30;
        }

        if (['kracko', 'marx', 'magolor', 'galacta', 'sectonia', 'stardream', 'void', 'zero', 'darkmind', 'drawcia', 'magolorsoul', 'chaos', 'finalboss'].includes(this.type)) {
            let baseOffset = 50;
            if (this.type === 'kracko' || this.type === 'stardream' || this.type === 'zero' || this.type === 'finalboss') baseOffset = 100;
            else if (this.type === 'marx' || this.type === 'sectonia' || this.type === 'chaos') baseOffset = 80;

            this.y = GROUND_Y - this.height - baseOffset + Math.sin(Date.now() / 300) * 15;
        } else {
            this.y = GROUND_Y - this.height + Math.sin(Date.now() / 200) * 5;
        }
    }

    draw(ctx) {
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        let shY = GROUND_Y;
        ctx.ellipse(this.x + this.width / 2, shY, this.width / 2 - 10, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        if (this.type === 'whispy') {
            // Tree Trunk
            ctx.fillStyle = '#8B5A2B';
            ctx.fillRect(this.x + 20, this.y + 60, 60, 120);
            // Face
            ctx.fillStyle = 'black';
            ctx.beginPath(); ctx.ellipse(this.x + 35, this.y + 110, 5, 12, 0, 0, Math.PI * 2); ctx.fill(); // Left eye
            ctx.beginPath(); ctx.ellipse(this.x + 65, this.y + 110, 5, 12, 0, 0, Math.PI * 2); ctx.fill(); // Right eye
            ctx.beginPath(); ctx.ellipse(this.x + 50, this.y + 150, 10, 15, 0, 0, Math.PI * 2); ctx.fill(); // Mouth

            // Leaves
            ctx.fillStyle = '#228B22';
            ctx.beginPath(); ctx.arc(this.x + 50, this.y + 50, 60, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(this.x + 10, this.y + 80, 40, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(this.x + 90, this.y + 80, 40, 0, Math.PI * 2); ctx.fill();

        } else if (this.type === 'kracko') {
            // Cloud
            ctx.fillStyle = '#f0f0f0';
            ctx.beginPath(); ctx.arc(this.x + 70, this.y + 45, 45, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(this.x + 30, this.y + 60, 30, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(this.x + 110, this.y + 60, 30, 0, Math.PI * 2); ctx.fill();

            // Spikes
            ctx.fillStyle = '#ffff00';
            for (let i = 0; i < 8; i++) {
                let angle = (Math.PI * 2 / 8) * i;
                let sx = this.x + 70 + Math.cos(angle) * 40;
                let sy = this.y + 45 + Math.sin(angle) * 40;
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx + Math.cos(angle) * 20, sy + Math.sin(angle) * 20);
                ctx.lineTo(sx + Math.cos(angle + 0.5) * 10, sy + Math.sin(angle + 0.5) * 10);
                ctx.fill();
            }
            // Big Eye
            ctx.fillStyle = 'white';
            ctx.beginPath(); ctx.arc(this.x + 70, this.y + 45, 15, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'black';
            ctx.beginPath(); ctx.arc(this.x + 65, this.y + 45, 6, 0, Math.PI * 2); ctx.fill();

            if (this.state === 'attack') {
                ctx.fillStyle = 'rgba(255, 255, 0, 0.6)';
                ctx.fillRect(this.x - 50, GROUND_Y - 100, this.width + 100, 100);
            }

        } else if (this.type === 'dedede') {
            // Dedede Body
            ctx.fillStyle = '#4488ff'; // Blue coat
            ctx.beginPath(); ctx.arc(this.x + 65, this.y + 80, 50, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffccaa'; // Belly
            ctx.beginPath(); ctx.arc(this.x + 50, this.y + 90, 35, 0, Math.PI * 2); ctx.fill();
            // Head
            ctx.fillStyle = '#ffaa33'; // Penguin beak
            ctx.beginPath(); ctx.ellipse(this.x + 30, this.y + 40, 20, 10, 0, 0, Math.PI * 2); ctx.fill();
            // Eyes
            ctx.fillStyle = 'white';
            ctx.beginPath(); ctx.arc(this.x + 50, this.y + 20, 15, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'black';
            ctx.beginPath(); ctx.arc(this.x + 45, this.y + 20, 5, 0, Math.PI * 2); ctx.fill();
            // Red hat
            ctx.fillStyle = '#ff3333';
            ctx.beginPath(); ctx.arc(this.x + 65, this.y + 25, 25, Math.PI, 0); ctx.fill();
            // Hammer
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(this.x, this.y - 20, 10, 100);
            ctx.fillStyle = '#555';
            ctx.fillRect(this.x - 20, this.y - 40, 50, 40);

            if (this.state === 'attack') {
                ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                ctx.fillRect(this.x - 120, this.y + this.height - 40, 120, 40);
            }
        } else if (this.type === 'metaknight') {
            ctx.fillStyle = '#111155';
            ctx.beginPath(); ctx.arc(this.x + 50, this.y + 50, 45, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#dddddd';
            ctx.beginPath(); ctx.arc(this.x + 35, this.y + 50, 35, -Math.PI / 2, Math.PI / 2); ctx.fill();
            ctx.fillStyle = '#ffff00';
            ctx.beginPath(); ctx.ellipse(this.x + 25, this.y + 45, 4, 12, Math.PI / 6, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(this.x + 45, this.y + 45, 4, 12, -Math.PI / 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(this.x - 20, this.y + 60, 20, 5);
            ctx.fillStyle = '#ccc';
            ctx.beginPath(); ctx.moveTo(this.x - 20, this.y + 55); ctx.lineTo(this.x - 70, this.y + 62); ctx.lineTo(this.x - 20, this.y + 69); ctx.fill();
            ctx.fillStyle = '#331155';
            ctx.beginPath(); ctx.moveTo(this.x + 80, this.y + 50); ctx.lineTo(this.x + 130, this.y - 20); ctx.lineTo(this.x + 100, this.y + 60); ctx.fill();

            if (this.state === 'attack') {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.fillRect(0, GROUND_Y - 80, canvas.width, 80);
            }
        } else if (this.type === 'marx') {
            ctx.fillStyle = '#cc88ff';
            ctx.beginPath(); ctx.arc(this.x + 55, this.y + 60, 45, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ff3333';
            ctx.beginPath(); ctx.moveTo(this.x + 55, this.y + 20); ctx.lineTo(this.x + 10, this.y - 10); ctx.lineTo(this.x + 55, this.y + 45); ctx.fill();
            ctx.fillStyle = '#3355ff';
            ctx.beginPath(); ctx.moveTo(this.x + 55, this.y + 20); ctx.lineTo(this.x + 100, this.y - 10); ctx.lineTo(this.x + 55, this.y + 45); ctx.fill();
            ctx.fillStyle = '#884400';
            ctx.beginPath(); ctx.ellipse(this.x + 35, this.y + 105, 15, 8, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(this.x + 75, this.y + 105, 15, 8, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'black';
            ctx.beginPath(); ctx.ellipse(this.x + 40, this.y + 50, 5, 10, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(this.x + 70, this.y + 50, 5, 10, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ff0000';
            ctx.beginPath(); ctx.moveTo(this.x + 55, this.y + 90); ctx.lineTo(this.x + 35, this.y + 80); ctx.lineTo(this.x + 35, this.y + 100); ctx.fill();
            ctx.beginPath(); ctx.moveTo(this.x + 55, this.y + 90); ctx.lineTo(this.x + 75, this.y + 80); ctx.lineTo(this.x + 75, this.y + 100); ctx.fill();

            if (this.state === 'attack') {
                ctx.fillStyle = 'rgba(255, 50, 255, 0.6)';
                ctx.fillRect(this.x - 150, GROUND_Y - 50, 150, 50);
            }
        } else if (this.type === 'magolor') {
            ctx.fillStyle = '#3355cc';
            ctx.beginPath(); ctx.moveTo(this.x + 60, this.y + 30); ctx.lineTo(this.x + 10, this.y + 140); ctx.lineTo(this.x + 110, this.y + 140); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(this.x + 60, this.y + 50, 40, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#111111';
            ctx.beginPath(); ctx.arc(this.x + 50, this.y + 50, 25, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffff00';
            ctx.beginPath(); ctx.ellipse(this.x + 40, this.y + 45, 6, 12, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(this.x + 60, this.y + 45, 6, 12, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(this.x - 10, this.y + 90, 15, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(this.x + 130, this.y + 90, 15, 0, Math.PI * 2); ctx.fill();

            if (this.state === 'attack') {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.beginPath(); ctx.arc(canvas.width / 2, GROUND_Y - 30, 40, 0, Math.PI * 2); ctx.fill();
            }
        } else if (this.type === 'galacta') {
            ctx.fillStyle = '#ff88dd';
            ctx.beginPath(); ctx.arc(this.x + 55, this.y + 55, 45, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(this.x + 40, this.y + 55, 35, -Math.PI / 2, Math.PI / 2); ctx.fill();
            ctx.strokeStyle = '#ff33aa';
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(this.x + 40, this.y + 25); ctx.lineTo(this.x + 40, this.y + 85); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(this.x + 15, this.y + 50); ctx.lineTo(this.x + 65, this.y + 50); ctx.stroke();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath(); ctx.ellipse(this.x + 100, this.y + 30, 40, 15, -Math.PI / 4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(this.x + 100, this.y + 70, 30, 15, -Math.PI / 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'white';
            ctx.beginPath(); ctx.arc(this.x + 80, this.y + 70, 20, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#ff33aa';
            ctx.beginPath(); ctx.arc(this.x + 80, this.y + 70, 15, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = '#ff88dd';
            ctx.beginPath(); ctx.moveTo(this.x - 50, this.y + 55); ctx.lineTo(this.x, this.y + 52); ctx.lineTo(this.x, this.y + 58); ctx.fill();

            if (this.state === 'attack') {
                ctx.fillStyle = 'rgba(255, 136, 221, 0.6)';
                ctx.fillRect(0, GROUND_Y - 120, canvas.width, 40);
            }
        } else if (['darkmeta', 'sectonia', 'stardream', 'void', 'zero', 'nightmare', 'darkmind', 'drawcia', 'magolorsoul', 'chaos'].includes(this.type)) {
            // 새로 추가된 보스들을 위한 범용적인 그리기 (타입마다 색상과 외형 약간 차별)
            let baseColor, eyeColor, accColor;
            let drawShape = 'circle';

            switch (this.type) {
                case 'darkmeta': baseColor = '#555'; eyeColor = '#ff2222'; accColor = '#333'; drawShape = 'meta'; break;
                case 'sectonia': baseColor = '#ffdd44'; eyeColor = '#aa00ff'; accColor = '#ff55cc'; drawShape = 'bug'; break;
                case 'stardream': baseColor = '#dddddd'; eyeColor = '#ff0000'; accColor = '#ff6600'; drawShape = 'mech'; break;
                case 'void': baseColor = '#440088'; eyeColor = '#ff00ff'; accColor = '#ff88ff'; drawShape = 'blob'; break;
                case 'zero': baseColor = '#ffffff'; eyeColor = '#ff0000'; accColor = '#cc0000'; drawShape = 'eye'; break;
                case 'nightmare': baseColor = '#222255'; eyeColor = '#ffff00'; accColor = '#ccaacc'; drawShape = 'star'; break;
                case 'darkmind': baseColor = '#ffaa00'; eyeColor = '#ff0000'; accColor = '#333333'; drawShape = 'eye'; break;
                case 'drawcia': baseColor = '#aa33aa'; eyeColor = '#000000'; accColor = '#ff88aa'; drawShape = 'blob'; break;
                case 'magolorsoul': baseColor = '#220033'; eyeColor = '#00ffcc'; accColor = '#660066'; drawShape = 'blob'; break;
                case 'chaos': baseColor = '#00aaaa'; eyeColor = '#ff0044'; accColor = '#ffaa00'; drawShape = 'blob'; break;
            }

            let cx = this.x + this.width / 2;
            let cy = this.y + this.height / 2;

            ctx.fillStyle = baseColor;

            if (drawShape === 'meta') {
                // 다크 메타 나이트 형태
                ctx.beginPath(); ctx.arc(cx, cy, 45, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = accColor; ctx.beginPath(); ctx.moveTo(cx - 60, cy); ctx.lineTo(cx, cy - 30); ctx.lineTo(cx, cy + 30); ctx.fill(); // 칼
                ctx.fillStyle = eyeColor; ctx.beginPath(); ctx.ellipse(cx - 10, cy - 5, 5, 12, 0, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(cx + 10, cy - 5, 5, 12, 0, 0, Math.PI * 2); ctx.fill();
            } else if (drawShape === 'bug') {
                // 세크토니아
                ctx.beginPath(); ctx.ellipse(cx, cy - 20, 30, 40, 0, 0, Math.PI * 2); ctx.fill(); // 머리
                ctx.fillStyle = accColor; ctx.beginPath(); ctx.ellipse(cx - 40, cy - 30, 40, 15, -Math.PI / 6, 0, Math.PI * 2); ctx.fill(); // 날개
                ctx.beginPath(); ctx.ellipse(cx + 40, cy - 30, 40, 15, Math.PI / 6, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = eyeColor; ctx.beginPath(); ctx.arc(cx, cy - 30, 8, 0, Math.PI * 2); ctx.fill();
            } else if (drawShape === 'mech') {
                // 별의 꿈
                ctx.fillRect(cx - 50, cy - 40, 100, 80);
                ctx.fillStyle = accColor; ctx.beginPath(); ctx.arc(cx, cy - 60, 20, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = eyeColor; ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI * 2); ctx.fill();
            } else if (drawShape === 'eye') {
                // 제로 투, 다크 마인드
                ctx.beginPath(); ctx.arc(cx, cy, 50, 0, Math.PI * 2); ctx.fill();
                if (this.type === 'zero') {
                    ctx.fillStyle = accColor; ctx.beginPath(); ctx.ellipse(cx, cy - 60, 80, 20, 0, 0, Math.PI * 2); ctx.fill(); // 헤일로
                }
                ctx.fillStyle = eyeColor; ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2); ctx.fill(); // 큰 눈
                ctx.fillStyle = 'black'; ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fill();
            } else if (drawShape === 'blob') {
                // 마버로아 소울, 엔드 닐, 카오스 등 무정형 형태
                ctx.beginPath(); ctx.moveTo(cx, cy - 60); ctx.bezierCurveTo(cx + 70, cy - 30, cx + 50, cy + 60, cx, cy + 50); ctx.bezierCurveTo(cx - 50, cy + 60, cx - 70, cy - 30, cx, cy - 60); ctx.fill();
                ctx.fillStyle = eyeColor;
                ctx.beginPath(); ctx.arc(cx - 15, cy, 10, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(cx + 15, cy, 10, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = accColor; ctx.beginPath(); ctx.moveTo(cx - 20, cy - 40); ctx.lineTo(cx + 20, cy - 40); ctx.lineTo(cx, cy - 60); ctx.fill();
            } else if (drawShape === 'star') {
                // 나이트메어
                ctx.beginPath(); ctx.arc(cx, cy - 30, 40, 0, Math.PI * 2); ctx.fill(); // 몸
                ctx.fillStyle = accColor; ctx.beginPath(); ctx.moveTo(cx - 50, cy); ctx.lineTo(cx + 50, cy); ctx.lineTo(cx, cy + 70); ctx.fill(); // 망토
                ctx.fillStyle = eyeColor; ctx.fillRect(cx - 15, cy - 40, 30, 10); // 선글라스
            }

            if (this.state === 'attack') {
                ctx.fillStyle = `rgba(${parseInt(eyeColor.slice(1, 3), 16)}, ${parseInt(eyeColor.slice(3, 5), 16)}, ${parseInt(eyeColor.slice(5, 7), 16)}, 0.5)`;
                let h = 50 + (this.maxHp / 200);
                ctx.fillRect(0, GROUND_Y - h, canvas.width, h);
            }
        } else if (this.type === 'finalboss') {
            let cx = this.x + this.width / 2;
            let cy = this.y + this.height / 2;

            // 주어진 이미지 기반 블록형 캐릭터 형태 렌더링

            // 다리(검은색)
            ctx.fillStyle = '#222';
            ctx.fillRect(cx - 20, cy + 40, 15, 20); // 왼쪽 다리
            ctx.fillRect(cx + 5, cy + 40, 15, 20); // 오른쪽 다리

            // 몸통(흰색/보라색 섞인 도복 느낌)
            ctx.fillStyle = '#dddcdb';
            ctx.fillRect(cx - 25, cy - 10, 50, 50);

            // 몸통의 무늬 (보라색 라인)
            ctx.strokeStyle = '#6a0dad';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(cx - 10, cy - 10); ctx.lineTo(cx + 10, cy + 40); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx + 10, cy - 10); ctx.lineTo(cx - 10, cy + 40); ctx.stroke();

            // 머리/얼굴 (피부색 + 보라색 그림자)
            ctx.fillStyle = '#e8cbb8';
            ctx.fillRect(cx - 20, cy - 40, 40, 30);

            // 헤어스타일 (보라색/자주색 뿔과 머리카락)
            ctx.fillStyle = '#8b3a62';
            // 왼쪽 머리
            ctx.beginPath(); ctx.moveTo(cx - 25, cy - 10); ctx.lineTo(cx - 30, cy - 45); ctx.lineTo(cx, cy - 50); ctx.fill();
            // 오른쪽 머리 (더 풍성하고 보라색 빛이 감도는 부분)
            ctx.fillStyle = '#551a8b';
            ctx.beginPath(); ctx.moveTo(cx, cy - 50); ctx.lineTo(cx + 35, cy - 40); ctx.lineTo(cx + 25, cy - 10); ctx.fill();
            // 뿔 (오른쪽 검은색 뿔)
            ctx.fillStyle = '#111';
            ctx.beginPath(); ctx.moveTo(cx + 15, cy - 45); ctx.lineTo(cx + 30, cy - 70); ctx.lineTo(cx + 25, cy - 45); ctx.fill();

            // 빛나는 보라색 외눈 (오른쪽 눈 부분)
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#d100ff';
            ctx.fillStyle = '#e066ff';
            ctx.beginPath(); ctx.arc(cx + 10, cy - 25, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(cx + 10, cy - 25, 2, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0; // 그림자 초기화

            // 왼쪽 팔 & 무기(방패나 두꺼운 건틀릿 형태)
            ctx.fillStyle = '#8b7355'; // 갈색 나무/가죽 재질 느낌
            ctx.fillRect(cx - 45, cy - 15, 20, 45);

            // 오른쪽 팔 & 빛나는 보라색 기운(오브/마법)
            ctx.fillStyle = '#e8cbb8'; // 기본 팔
            ctx.fillRect(cx + 25, cy - 10, 15, 30);

            // 보라색 불꽃/오브
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#d100ff';
            ctx.fillStyle = 'rgba(209, 0, 255, 0.7)';
            ctx.beginPath(); ctx.arc(cx + 35, cy + 15, 12, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(cx + 35, cy + 15, 4, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;

            if (this.state === 'attack') {
                // 무서운 손 (보라색/창백한 톤으로 변경)
                ctx.fillStyle = '#dcd0ff'; // 약간 보랏빛 도는 창백한 색
                ctx.strokeStyle = '#4b0082'; // 짙은 보라색 테두리
                ctx.lineWidth = 4;

                let hx = 100 + Math.sin(Date.now() / 100) * 10;
                let hy = GROUND_Y - 140;

                // 손바닥
                ctx.beginPath(); ctx.roundRect(hx, hy - 200, 120, 250, 15); ctx.fill(); ctx.stroke();

                // 손가락 4개
                for (let i = 0; i < 4; i++) {
                    ctx.beginPath(); ctx.roundRect(hx - 30 + (i * 35), hy + 30, 25, 100 + (Math.sin(i) * 20), 10); ctx.fill(); ctx.stroke();
                    // 보랏빛 날카로운 손톱
                    ctx.fillStyle = '#6a0dad';
                    ctx.beginPath(); ctx.moveTo(hx - 30 + (i * 35), hy + 130 + (Math.sin(i) * 20)); ctx.lineTo(hx - 17 + (i * 35), hy + 180 + (Math.sin(i) * 20)); ctx.lineTo(hx - 5 + (i * 35), hy + 130 + (Math.sin(i) * 20)); ctx.fill();
                    ctx.fillStyle = '#dcd0ff';
                }

                // 찍힌 바닥의 보랏빛 어둠의 충격파
                ctx.fillStyle = 'rgba(106, 13, 173, 0.7)';
                ctx.beginPath(); ctx.ellipse(hx + 60, GROUND_Y, 200, 40, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(20, 0, 50, 0.5)';
                ctx.fillRect(0, GROUND_Y - 150, canvas.width - 250, 150);

                // 화면 전체 진동/데미지 효과 (보랏빛)
                ctx.fillStyle = 'rgba(106, 13, 173, 0.2)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;
        updateBossHP();

        if (this.hp <= 0) {
            endBattle(true);
        }
    }
}

// Input handling
window.addEventListener('keydown', e => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
    if (e.key === 'z') keys['z'] = true;

    if (isBattleActive && player && player.role === 'sword') { // 플레이어만 적용
        if (e.key === 'ArrowUp') {
            player.vy = player.jumpPower * 0.8; // 호버링 (공기 빨아들이기)
            spawnParticles(player.x + player.width / 2, player.y + player.height, '#ffffff');
        }
        if (e.key === 'ArrowDown') {
            player.vy += 15; // 아래로 급강하 (누를때마다 아래로 내려감)
            state.inventory.light += 50;
            state.inventory.water += 50;
            state.inventory.fire += 50;
            state.inventory.apples += 50;
            spawnDamageText(player.x + player.width / 2, player.y - 20, "+50 화석 & 사과!");
        }
    }
});

window.addEventListener('keyup', e => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
    if (e.key === 'z') keys['z'] = false;
});

function initBattle() {
    // Pink Kirby for player
    player = new Character(100, 200, '#ffb8c6', 'sword');

    if (state.isCoop) {
        ais = [
            new Character(50, 200, '#ffdd55', 'hammer'), // Yellow Hammer
            new Character(150, 200, '#55ff55', 'magic'), // Green Magic
            new Character(200, 200, '#55aaff', 'flask')  // Blue Flask (Doctor)
        ];
    } else {
        ais = [];
    }

    // Create actual boss based on state
    let bossType = state.selectedBoss || 'whispy'; // Use state var
    boss = new Boss(bossType);

    particles = [];
    damageTexts = [];
    battleTime = 0;
    lastTime = document.timeline ? document.timeline.currentTime : performance.now();
    isBattleActive = true;

    updateHUD();
    updateBossHP();
    document.getElementById('return-lobby-btn').classList.remove('hidden');
}

function startBattle() {
    initBattle();
    requestAnimationFrame(gameLoop);
}

function updateAI() {
    ais.forEach((ai, index) => {
        // Simple AI: Move towards boss and attack
        let targetX = boss.x - 60 - (index * 40);

        if (Math.abs(ai.x - targetX) > 10) {
            if (ai.x < targetX) {
                ai.vx = ai.speed * 0.8;
                ai.facingRight = true;
            } else {
                ai.vx = -ai.speed * 0.8;
                ai.facingRight = false;
            }
        } else {
            ai.vx = 0;
            if (Math.random() < 0.05) {
                ai.attack(boss);
            }
        }

        // Random jump
        if (Math.random() < 0.01 && ai.y >= GROUND_Y - ai.height) {
            ai.vy = ai.jumpPower;
        }

        ai.update();
    });
}

function checkCollision(rect1, rect2) {
    let r1 = { x: rect1.x, y: rect1.y, w: rect1.w || rect1.width, h: rect1.h || rect1.height };
    let r2 = { x: rect2.x, y: rect2.y, w: rect2.w || rect2.width, h: rect2.h || rect2.height };

    return r1.x < r2.x + r2.w &&
        r1.x + r1.w > r2.x &&
        r1.y < r2.y + r2.h &&
        r1.y + r1.h > r2.y;
}

function spawnParticles(x, y, color) {
    for (let i = 0; i < 5; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 20, color: color
        });
    }
}

function spawnDamageText(x, y, amount) {
    damageTexts.push({
        x: x + (Math.random() - 0.5) * 30,
        y: y,
        text: amount,
        life: 30
    });
}

function updateHUD() {
    let p1Percent = (player.hp / player.maxHp) * 100;
    document.getElementById('hp-fill-p1').style.width = p1Percent + '%';

    // HUD 숨김/보이기 처리
    for (let i = 2; i <= 4; i++) {
        let hud = document.getElementById(`hud-p${i}`);
        if (hud) {
            hud.style.display = state.isCoop ? 'block' : 'none';
        }
    }

    ais.forEach((ai, i) => {
        let percent = (ai.hp / ai.maxHp) * 100;
        let fillElem = document.getElementById(`hp-fill-p${i + 2}`);
        if (fillElem) {
            fillElem.style.width = percent + '%';
        }
    });
}

function updateBossHP() {
    if (!boss) return;
    let percent = (boss.hp / boss.maxHp) * 100;
    document.getElementById('boss-hp-bar').style.width = percent + '%';
    document.getElementById('boss-hp-text').innerText = `BOSS HP: ${Math.max(0, Math.floor(percent))}%`;
}

function gameLoop(timestamp) {
    if (!isBattleActive) return;

    let dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    battleTime += dt;
    document.getElementById('battle-time').innerText = battleTime.toFixed(2);

    // Player input
    player.vx = 0;
    if (keys.ArrowLeft) { player.vx = -player.speed; player.facingRight = false; }
    if (keys.ArrowRight) { player.vx = player.speed; player.facingRight = true; }
    // ArrowUp logic is moved to keydown event for hovering
    if (keys.z || keys.Z) { player.attack(boss); }

    player.update();
    updateAI();
    boss.update();

    // Draw
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Ground
    ctx.fillStyle = '#654321';
    ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);

    player.draw(ctx);
    ais.forEach(ai => ai.draw(ctx));
    boss.draw(ctx);

    // Particles
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 20;
        ctx.fillRect(p.x, p.y, 5, 5);
        ctx.globalAlpha = 1.0;
    });

    // Damage texts
    damageTexts = damageTexts.filter(d => d.life > 0);
    ctx.font = '20px Jua';
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    damageTexts.forEach(d => {
        d.y -= 1;
        d.life--;
        ctx.globalAlpha = d.life / 30;
        ctx.strokeText(d.text, d.x, d.y);
        ctx.fillText(d.text, d.x, d.y);
        ctx.globalAlpha = 1.0;
    });

    if (player.hp <= 0) {
        endBattle(false);
    } else {
        battleLoop = requestAnimationFrame(gameLoop);
    }
}

function endBattle(isVictory) {
    isBattleActive = false;
    cancelAnimationFrame(battleLoop);
    document.getElementById('return-lobby-btn').classList.add('hidden');

    if (isVictory) {
        document.getElementById('result-title').innerText = "Victory!";
        document.getElementById('result-title').style.color = "#ff7bc3";

        let timeScore = battleTime;
        let rank = "브론즈 등급";
        let badge = "🥉";
        let apples = 5;
        let resources = 5; // 항상 5개 지급

        if (timeScore < 30) {
            rank = "플래티넘 등급!";
            badge = "💎";
            apples = 30;
        } else if (timeScore < 60) {
            rank = "골드 등급!";
            badge = "🥇";
            apples = 20;
        } else if (timeScore < 90) {
            rank = "실버 등급!";
            badge = "🥈";
            apples = 10;
        }

        document.getElementById('result-rank').innerText = rank;
        document.getElementById('result-badge').innerText = badge;
        document.getElementById('result-time').innerText = `Clear Time: ${battleTime.toFixed(2)}s`;

        // Give rewards
        state.inventory.apples += apples;
        state.inventory.fire += resources;
        state.inventory.water += resources;
        state.inventory.light += resources;

        document.getElementById('result-rewards').innerHTML = `
            <div>🍎 +${apples}</div>
            <div>🔥 +${resources}</div>
            <div>💧 +${resources}</div>
            <div>✨ +${resources}</div>
        `;
    } else {
        document.getElementById('result-title').innerText = "Defeat...";
        document.getElementById('result-title').style.color = "#555";
        document.getElementById('result-rank').innerText = "도전 실패";
        document.getElementById('result-badge').innerText = "💀";
        document.getElementById('result-time').innerText = `Survived: ${battleTime.toFixed(2)}s`;
        document.getElementById('result-rewards').innerHTML = "<div>보상 없음...</div>";
    }

    document.getElementById('result-modal').classList.remove('hidden');
}
