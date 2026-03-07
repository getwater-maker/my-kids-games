const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// -- UI Elements --
const ui = {
    startScreen: document.getElementById('start-screen'),
    roundOverScreen: document.getElementById('round-over-screen'),
    gameOverScreen: document.getElementById('game-over-screen'),
    playerHp: document.getElementById('player-hp-bar'),
    enemyHp: document.getElementById('enemy-hp-bar'),
    timer: document.getElementById('round-timer'),
    announcement: document.getElementById('announcement'),
    roundMsg: document.getElementById('round-result-msg'),
    finalMsg: document.getElementById('final-result-msg')
};

// -- Game State --
let gameState = 'START';
let animationId;
const FPS = 60;
let lastTime = 0;

let round = 1;
let playerWins = 0;
let enemyWins = 0;
let roundTimer = 60;
let timerInterval;

// -- Input --
const keys = { w: false, a: false, s: false, d: false, j: false, k: false, l: false };

window.addEventListener('keydown', (e) => {
    let key = e.key.toLowerCase();
    if (keys.hasOwnProperty(key)) keys[key] = true;
});
window.addEventListener('keyup', (e) => {
    let key = e.key.toLowerCase();
    if (keys.hasOwnProperty(key)) keys[key] = false;
});

// -- Constants --
const GROUND_Y = 350;

// -- Classes --
class Fighter {
    constructor(isPlayer) {
        this.isPlayer = isPlayer;
        this.w = 50;
        this.h = 50;
        this.color = isPlayer ? '#42a5f5' : '#ef5350';

        // Stats
        this.maxHp = 1000;
        this.hp = this.maxHp;

        // Physics
        this.speed = 5;
        this.jumpPower = -12;
        this.gravity = 0.6;
        this.vx = 0;
        this.vy = 0;
        this.isGrounded = false;

        // State Machine
        this.state = 'IDLE'; // IDLE, MOVE, JUMP, GUARD, ATK_P, ATK_K, HIT, DEAD
        this.stateTimer = 0;
        this.facingRight = isPlayer;

        // AI variables
        this.aiCooldown = 0;
    }

    reset(startSide) {
        this.hp = this.maxHp;
        this.x = startSide === 'left' ? 150 : canvas.width - 200;
        this.y = GROUND_Y - this.h;
        this.vx = 0;
        this.vy = 0;
        this.state = 'IDLE';
        this.stateTimer = 0;
        this.facingRight = startSide === 'left';
    }

    update() {
        if (gameState !== 'PLAYING') return;

        // State update
        this.stateTimer--;
        if (this.stateTimer < 0) this.stateTimer = 0;

        // Apply Gravity
        this.vy += this.gravity;
        if (this.y + this.h + this.vy >= GROUND_Y) {
            this.y = GROUND_Y - this.h;
            this.vy = 0;
            this.isGrounded = true;
        } else {
            this.isGrounded = false;
        }

        // Action Logic based on state
        if (this.state !== 'HIT' && this.state !== 'DEAD') {
            if (this.isPlayer) {
                this.handlePlayerInput();
            } else {
                this.handleAILogic();
            }
        }

        // Apply Velocity
        this.x += this.vx;
        this.y += this.vy;

        // Bounds
        if (this.x < 0) this.x = 0;
        if (this.x + this.w > canvas.width) this.x = canvas.width - this.w;

        // Facing direction based on opponent
        if (this.state !== 'ATK_P' && this.state !== 'ATK_K') {
            let opponent = this.isPlayer ? enemy : player;
            if (opponent) {
                this.facingRight = (this.x < opponent.x);
            }
        }
    }

    handlePlayerInput() {
        // Can't act if attacking or hitting
        if (['ATK_P', 'ATK_K'].includes(this.state) && this.stateTimer > 0) {
            this.vx = 0;
            return;
        }

        // Guard
        if (keys.l && this.isGrounded) {
            this.state = 'GUARD';
            this.vx = 0;
            return;
        }

        // Attacks
        if (keys.j && this.stateTimer === 0) {
            this.attack('PUNCH');
            return;
        }
        if (keys.k && this.stateTimer === 0) {
            this.attack('KICK');
            return;
        }

        // Movement
        if (keys.a) {
            this.vx = -this.speed;
            this.state = this.isGrounded ? 'MOVE' : 'JUMP';
        } else if (keys.d) {
            this.vx = this.speed;
            this.state = this.isGrounded ? 'MOVE' : 'JUMP';
        } else {
            this.vx = 0;
            if (this.isGrounded) this.state = 'IDLE';
        }

        // Jump
        if (keys.w && this.isGrounded) {
            this.vy = this.jumpPower;
            this.isGrounded = false;
            this.state = 'JUMP';
        }
    }

    handleAILogic() {
        if (['ATK_P', 'ATK_K'].includes(this.state) && this.stateTimer > 0) {
            this.vx = 0;
            return;
        }

        if (this.aiCooldown > 0) {
            this.aiCooldown--;
        }

        let dist = Math.abs(this.x - player.x);

        // Simple AI: Move towards player, attack if close
        if (dist > 70) {
            this.vx = (this.x < player.x) ? this.speed * 0.8 : -this.speed * 0.8;
            this.state = 'MOVE';

            // Random jump
            if (Math.random() < 0.01 && this.isGrounded) {
                this.vy = this.jumpPower;
                this.isGrounded = false;
            }
        } else {
            this.vx = 0;
            this.state = 'IDLE';

            if (this.aiCooldown <= 0) {
                // Decide attack or guard
                let rand = Math.random();
                if (rand < 0.3) {
                    this.state = 'GUARD';
                    this.stateTimer = 30;
                } else if (rand < 0.6) {
                    this.attack('PUNCH');
                } else {
                    this.attack('KICK');
                }
                this.aiCooldown = 40 + Math.random() * 30;
            }
        }
    }

    attack(type) {
        if (type === 'PUNCH') {
            this.state = 'ATK_P';
            this.stateTimer = 15; // Animation frames
            this.vx = 0;
            this.checkHitbox(40, 20, 30, 80); // damage, w, h, knocback
        } else if (type === 'KICK') {
            this.state = 'ATK_K';
            this.stateTimer = 25;
            this.vx = this.facingRight ? 3 : -3; // slight forward dash
            this.checkHitbox(70, 40, 20, 150);
        }
    }

    checkHitbox(damage, hw, hh, knockback) {
        let hx = this.facingRight ? this.x + this.w : this.x - hw;
        let hy = this.y + (this.h / 2) - (hh / 2);

        let opponent = this.isPlayer ? enemy : player;

        // Basic AABB Collision
        if (hx < opponent.x + opponent.w && hx + hw > opponent.x &&
            hy < opponent.y + opponent.h && hy + hh > opponent.y) {

            opponent.takeDamage(damage, this.facingRight ? knockback : -knockback);
        }
    }

    takeDamage(amount, knockbackX) {
        if (this.state === 'DEAD') return;

        // Guarding reduces damage significantly and prevents flinching
        if (this.state === 'GUARD') {
            this.hp -= amount * 0.2;
            this.vx = knockbackX * 0.02; // Tiny pushback
            // display effect
        } else {
            this.hp -= amount;
            this.state = 'HIT';
            this.stateTimer = 20; // Stun duration
            this.vx = knockbackX * 0.05;
            this.vy = -3; // slight pop up
        }

        if (this.hp <= 0) {
            this.hp = 0;
            this.state = 'DEAD';
            this.vx = knockbackX * 0.1;
            this.vy = -5;
            this.stateTimer = 999;
            checkRoundEnd();
        }

        updateUI();
    }

    draw(ctx) {
        let px = this.x;
        let py = this.y;

        // Main Body
        ctx.fillStyle = (this.state === 'HIT') ? 'white' : this.color;

        if (this.state === 'GUARD') {
            ctx.fillStyle = '#9e9e9e'; // Gray out when guarding
        }

        ctx.beginPath();
        ctx.roundRect(px, py, this.w, this.h, 15);
        ctx.fill();

        // Eyes
        ctx.fillStyle = 'black';
        let eyeX = this.facingRight ? px + 30 : px + 10;
        ctx.fillRect(eyeX, py + 10, 5, 12);
        ctx.fillRect(eyeX - 8, py + 10, 5, 12);

        // Attack hitboxes (Visual)
        ctx.fillStyle = 'rgba(255, 255, 0, 0.7)';
        if (this.state === 'ATK_P') {
            if (this.facingRight) ctx.fillRect(px + this.w, py + 15, 30, 20);
            else ctx.fillRect(px - 30, py + 15, 30, 20);
        } else if (this.state === 'ATK_K') {
            ctx.fillStyle = 'rgba(255, 100, 0, 0.7)';
            if (this.facingRight) ctx.fillRect(px + this.w, py + 30, 40, 20);
            else ctx.fillRect(px - 40, py + 30, 40, 20);
        }

        // Guard Shield effect
        if (this.state === 'GUARD') {
            ctx.strokeStyle = 'rgba(0, 200, 255, 0.5)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            let sx = this.facingRight ? px + this.w + 5 : px - 5;
            ctx.moveTo(sx, py - 10);
            ctx.lineTo(sx, py + this.h + 10);
            ctx.stroke();
        }
    }
}

// -- Global Variables --
let player, enemy;

// -- Core Functions --
function init() {
    gameState = 'START';
    ui.startScreen.classList.remove('active');
    ui.gameOverScreen.classList.remove('active');

    round = 1;
    playerWins = 0;
    enemyWins = 0;

    startRound();
}

function startRound() {
    player = new Fighter(true);
    enemy = new Fighter(false);

    player.reset('left');
    enemy.reset('right');

    roundTimer = 60;
    ui.timer.textContent = roundTimer;
    updateUI();

    ui.roundOverScreen.classList.remove('active');

    // Countdown
    gameState = 'COUNTDOWN';
    announce(`Round ${round}`, 1500);

    setTimeout(() => {
        if (gameState === 'COUNTDOWN') {
            announce("FIGHT!", 1000);
            gameState = 'PLAYING';
            clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                if (gameState === 'PLAYING') {
                    roundTimer--;
                    ui.timer.textContent = roundTimer;
                    if (roundTimer <= 0) {
                        handleTimeOver();
                    }
                }
            }, 1000);
        }
    }, 1500);
}

function checkRoundEnd() {
    if (gameState !== 'PLAYING') return;

    if (player.hp <= 0 || enemy.hp <= 0) {
        gameState = 'ROUND_OVER';
        clearInterval(timerInterval);

        if (player.hp <= 0 && enemy.hp <= 0) {
            announce("DOUBLE K.O.", 2000);
        } else if (player.hp <= 0) {
            enemyWins++;
            announce("K.O. - CPU WINS!", 2000);
            ui.roundMsg.textContent = "CPU WINS THE ROUND";
        } else {
            playerWins++;
            announce("K.O. - PLAYER WINS!", 2000);
            ui.roundMsg.textContent = "PLAYER WINS THE ROUND";
        }

        setTimeout(() => showRoundResult(), 2500);
    }
}

function handleTimeOver() {
    gameState = 'ROUND_OVER';
    clearInterval(timerInterval);
    announce("TIME OVER", 2000);

    if (player.hp > enemy.hp) {
        playerWins++;
        ui.roundMsg.textContent = "PLAYER WINS THE ROUND";
    } else if (enemy.hp > player.hp) {
        enemyWins++;
        ui.roundMsg.textContent = "CPU WINS THE ROUND";
    } else {
        ui.roundMsg.textContent = "DRAW";
    }

    setTimeout(() => showRoundResult(), 2500);
}

function showRoundResult() {
    if (playerWins >= 2 || enemyWins >= 2) {
        // Game Over
        ui.gameOverScreen.classList.add('active');
        if (playerWins > enemyWins) {
            ui.finalMsg.textContent = "YOU WIN THE MATCH!";
            ui.finalMsg.style.color = '#00e676';
        } else {
            ui.finalMsg.textContent = "YOU LOSE!";
            ui.finalMsg.style.color = '#ff1744';
        }
    } else {
        // Next Round
        ui.roundOverScreen.classList.add('active');
        round++;
    }
}

// UI Helpers
function announce(msg, duration = 2000) {
    ui.announcement.textContent = msg;
    ui.announcement.style.opacity = 1;
    setTimeout(() => { ui.announcement.style.opacity = 0; }, duration);
}

function updateUI() {
    let pPercent = Math.max(0, (player.hp / player.maxHp) * 100);
    ui.playerHp.style.width = `${pPercent}%`;

    let ePercent = Math.max(0, (enemy.hp / enemy.maxHp) * 100);
    ui.enemyHp.style.width = `${ePercent}%`;
}


// -- Game Loop --
function update() {
    if (!player || !enemy) return;

    player.update();
    enemy.update();

    // Keep them from pushing each other out of bounds entirely
    // Basic collision pushing
    let dist = Math.abs(player.x - enemy.x);
    if (dist < 40 && player.state !== 'DEAD' && enemy.state !== 'DEAD') {
        let push = (40 - dist) / 2;
        if (player.x < enemy.x) {
            player.x -= push;
            enemy.x += push;
        } else {
            player.x += push;
            enemy.x -= push;
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // clears transparent parts

    // Draw Ground Line
    ctx.fillStyle = '#37474f';
    ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);

    if (player && enemy) {
        // Draw the one further back first (simple Z sorting based on state could be done, just draw enemy then player)
        enemy.draw(ctx);
        player.draw(ctx);
    }
}

function gameLoop(timestamp) {
    if (timestamp - lastTime >= 1000 / FPS) {
        lastTime = timestamp;

        if (gameState === 'PLAYING' || gameState === 'COUNTDOWN' || gameState === 'ROUND_OVER') {
            update();
            draw();
        }
    }
    animationId = requestAnimationFrame(gameLoop);
}

// -- Event Listeners --
document.getElementById('start-btn').addEventListener('click', init);
document.getElementById('restart-btn').addEventListener('click', init);
document.getElementById('next-round-btn').addEventListener('click', startRound);

// Boot
requestAnimationFrame(gameLoop);
