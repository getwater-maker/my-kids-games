const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set Canvas Size
canvas.width = 1024;
canvas.height = 576;
ctx.imageSmoothingEnabled = false; // For crisp pixel art

// Game State
let gameActive = false;
let timer = 60;
let timerInterval;
let screenShake = 0;

// Assets
let playerImg = new Image();
let cpuImg = new Image();

// Helper to remove solid background (Chroma Key)
function removeBackground(img, targetColor = { r: 0, g: 255, b: 0 }) {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    tempCtx.drawImage(img, 0, 0);

    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;

    // Tolerance for green removal
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // If it's mostly green (chroma key)
        if (g > 150 && r < 120 && b < 120) {
            data[i + 3] = 0; // Set alpha to 0 (transparent)
        }
        // Also remove near-white (if AI messed up)
        if (r > 245 && g > 245 && b > 245) {
            data[i + 3] = 0;
        }
    }

    tempCtx.putImageData(imageData, 0, 0);
    const newImg = new Image();
    newImg.src = tempCanvas.toDataURL();
    return newImg;
}

playerImg.onload = () => { playerImg = removeBackground(playerImg); };
playerImg.src = 'player.png';
cpuImg.onload = () => { cpuImg = removeBackground(cpuImg); };
cpuImg.src = 'cpu.png';

// Constants
const GRAVITY = 0.6;
const GROUND_Y = 500;

class Fighter {
    constructor({ position, velocity, color, image, isPlayer = false }) {
        this.position = position;
        this.velocity = velocity;
        this.width = 120;
        this.height = 120;
        this.color = color;
        this.image = image;
        this.health = 100;
        this.isPlayer = isPlayer;
        this.isAttacking = false;
        this.attackType = null;
        this.attackFrame = 0;
        this.isGuarding = false;
        this.isHit = false;
        this.hitTimer = 0;
        this.facing = isPlayer ? 1 : -1;
        this.animationFrame = 0;

        this.attackBox = {
            position: { x: this.position.x, y: this.position.y },
            width: 90,
            height: 60
        };
    }

    draw() {
        ctx.save();

        // Screenshake
        if (screenShake > 0) {
            ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
            screenShake--;
        }

        this.animationFrame++;

        // Procedural Animation Variables
        let bobY = Math.sin(this.animationFrame * 0.1) * 5;
        let walkLean = 0;
        let scaleX = 1;
        let scaleY = 1;
        let rotation = 0;

        // Walking animation
        if (Math.abs(this.velocity.x) > 0.1) {
            bobY = Math.sin(this.animationFrame * 0.2) * 10;
            walkLean = (this.velocity.x > 0 ? 0.1 : -0.1) * this.facing;
        }

        // Guarding (Squash)
        if (this.isGuarding) {
            scaleY = 0.8;
            bobY += 20;
        }

        // Attack animations (Lean/Lunge)
        if (this.isAttacking) {
            this.attackFrame++;
            if (this.attackType === 'punch') {
                walkLean = 0.3 * this.facing;
                bobY -= 5;
            } else if (this.attackType === 'kick') {
                rotation = -0.2 * this.facing;
                bobY -= 15;
                scaleX = 1.1;
            }
        }

        // Setup transform
        ctx.translate(this.position.x + this.width / 2, this.position.y + this.height / 2 + bobY);
        if (this.facing === -1) ctx.scale(-1, 1);
        ctx.scale(scaleX, scaleY);
        ctx.rotate(walkLean + rotation);

        // Draw character
        ctx.drawImage(
            this.image,
            -this.width / 2,
            -this.height / 2,
            this.width,
            this.height
        );

        // Hit flash
        if (this.isHit) {
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = 'white';
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        }

        ctx.restore();

        // Optional: Particles or VFX could be added here
    }

    update() {
        this.draw();

        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;

        if (this.position.y + this.height + this.velocity.y >= GROUND_Y) {
            this.velocity.y = 0;
            this.position.y = GROUND_Y - this.height;
        } else {
            this.velocity.y += GRAVITY;
        }

        if (this.position.x < 0) this.position.x = 0;
        if (this.position.x + this.width > canvas.width) this.position.x = canvas.width - this.width;

        if (this.hitTimer > 0) {
            this.hitTimer--;
            if (this.hitTimer === 0) this.isHit = false;
        }
    }

    attack(type) {
        if (this.isAttacking || this.isGuarding || this.isHit) return;

        this.isAttacking = true;
        this.attackType = type;
        this.attackFrame = 0;

        setTimeout(() => {
            this.isAttacking = false;
            this.attackType = null;
        }, 300); // Longer duration for animation visibility
    }

    takeDamage(amount) {
        if (this.isGuarding) {
            this.health -= amount * 0.2;
            screenShake = 2;
        } else {
            this.health -= amount;
            this.isHit = true;
            this.hitTimer = 15;
            this.velocity.x = (this.facing === 1) ? -8 : 8;
            screenShake = 8;
            setTimeout(() => { if (!keys.a.pressed && !keys.d.pressed) this.velocity.x = 0; }, 200);
        }

        if (this.health < 0) this.health = 0;
        updateHealthUI();
    }
}

// Instantiate Players
const player = new Fighter({
    position: { x: 100, y: 0 },
    velocity: { x: 0, y: 0 },
    image: playerImg,
    isPlayer: true
});

const cpu = new Fighter({
    position: { x: 800, y: 0 },
    velocity: { x: 0, y: 0 },
    image: cpuImg,
    isPlayer: false
});

// Controls
const keys = {
    w: { pressed: false },
    a: { pressed: false },
    s: { pressed: false },
    d: { pressed: false },
    l: { pressed: false }
};

window.addEventListener('keydown', (event) => {
    if (!gameActive) return;

    switch (event.key.toLowerCase()) {
        case 'w': if (player.position.y + player.height === GROUND_Y) player.velocity.y = -20; break;
        case 'a': keys.a.pressed = true; break;
        case 'd': keys.d.pressed = true; break;
        case 's': player.isGuarding = true; break;
        case 'l': player.isGuarding = true; break;
        case 'j': player.attack('punch'); break;
        case 'k': player.attack('kick'); break;
    }
});

window.addEventListener('keyup', (event) => {
    switch (event.key.toLowerCase()) {
        case 'a': keys.a.pressed = false; break;
        case 'd': keys.d.pressed = false; break;
        case 's':
        case 'l': player.isGuarding = false; break;
    }
});

// UI Management
function updateHealthUI() {
    document.getElementById('p1-health').style.width = player.health + '%';
    document.getElementById('p2-health').style.width = cpu.health + '%';

    if (player.health <= 0 || cpu.health <= 0) {
        endGame();
    }
}

function endGame() {
    gameActive = false;
    clearInterval(timerInterval);
    const resultText = document.getElementById('result-text');
    if (player.health === cpu.health) resultText.innerText = "DRAW!";
    else if (player.health > cpu.health) resultText.innerText = "PLAYER 1 WINS!";
    else resultText.innerText = "CPU WINS!";

    document.getElementById('game-over').classList.remove('hidden');
}

// AI Logic
function updateAI() {
    if (!gameActive) return;

    // Relative position
    const dist = cpu.position.x - player.position.x;

    // Facing
    cpu.facing = dist > 0 ? -1 : 1;
    player.facing = dist > 0 ? 1 : -1;

    // Movement
    if (Math.abs(dist) > 120) {
        cpu.velocity.x = dist > 0 ? -3 : 3;
    } else {
        cpu.velocity.x = 0;
        // Attack
        if (Math.random() < 0.05) {
            cpu.attack(Math.random() > 0.5 ? 'punch' : 'kick');
        }
        // Random guard
        if (Math.random() < 0.02) {
            cpu.isGuarding = true;
            setTimeout(() => cpu.isGuarding = false, 500);
        }
    }
}

// Collision Detection
function checkCollision(attacker, target) {
    const boxX = attacker.facing === 1 ? attacker.position.x + attacker.width : attacker.position.x - attacker.attackBox.width;

    if (
        attacker.isAttacking &&
        boxX < target.position.x + target.width &&
        boxX + attacker.attackBox.width > target.position.x &&
        attacker.position.y + 20 < target.position.y + target.height &&
        attacker.position.y + 20 + attacker.attackBox.height > target.position.y
    ) {
        attacker.isAttacking = false; // Prevent multiple hits
        target.takeDamage(attacker.attackType === 'kick' ? 15 : 10);
    }
}

// Game Loop
function animate() {
    window.requestAnimationFrame(animate);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background layer is handled by CSS background for simplicity or we can draw it
    // Drawing it here if we want dynamic effects

    player.update();
    cpu.update();

    if (gameActive) {
        // Player movement
        player.velocity.x = 0;
        if (keys.a.pressed) player.velocity.x = -5;
        if (keys.d.pressed) player.velocity.x = 5;

        // Collision
        checkCollision(player, cpu);
        checkCollision(cpu, player);

        updateAI();
    }
}

// Initialization
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);
document.getElementById('menu-btn').addEventListener('click', () => {
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
    document.getElementById('hud').classList.add('hidden');
});

function startGame() {
    // Reset state
    player.health = 100;
    cpu.health = 100;
    player.position = { x: 100, y: 0 };
    cpu.position = { x: 800, y: 0 };
    timer = 60;
    gameActive = true;

    // UI
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('timer').innerText = timer;
    updateHealthUI();

    // Timer
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timer--;
        document.getElementById('timer').innerText = timer;
        if (timer <= 0) endGame();
    }, 1000);
}

// Start visual loop
animate();
