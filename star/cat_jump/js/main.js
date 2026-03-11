const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const GRAVITY = 0.5;
const JUMP_POWER = -12;
const WALL_DISTANCE = 300; // Vertical distance between walls

let cat = {
    x: canvas.width / 2,
    y: canvas.height - 100,
    vy: 0,
    width: 40,
    height: 40,
    jumpCount: 0,
    facingLeft: true
};

let platforms = [];
let score = 0;
let gameState = 'START';
let cameraY = 0;

function init() {
    setupEventListeners();
    resetGame();
    animate();
}

function setupEventListeners() {
    const jump = () => {
        if (gameState === 'PLAYING' && cat.jumpCount < 2) {
            cat.vy = JUMP_POWER;
            cat.jumpCount++;
        }
    };

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') jump();
    });

    canvas.addEventListener('mousedown', jump);

    document.getElementById('start-btn').onclick = () => {
        gameState = 'PLAYING';
        document.getElementById('overlay').classList.add('hidden');
    };
}

function resetGame() {
    cat.y = canvas.height - 100;
    cat.vy = 0;
    cat.jumpCount = 0;
    score = 0;
    cameraY = 0;
    platforms = [];

    // Initial platforms
    for (let i = 0; i < 6; i++) {
        spawnPlatform(canvas.height - i * 200);
    }
}

function spawnPlatform(y) {
    const width = 120 + Math.random() * 80;
    platforms.push({
        x: Math.random() * (canvas.width - width),
        y: y,
        width: width,
        height: 20
    });
}

function update() {
    if (gameState !== 'PLAYING') return;

    cat.vy += GRAVITY;
    cat.y += cat.vy;

    // Camera follow
    if (cat.y < canvas.height / 2 + cameraY) {
        cameraY = cat.y - canvas.height / 2;
    }

    // Platforms
    platforms.forEach(p => {
        if (cat.vy > 0 &&
            cat.x + cat.width > p.x &&
            cat.x < p.x + p.width &&
            cat.y + cat.height > p.y &&
            cat.y + cat.height < p.y + p.height + cat.vy) {
            cat.y = p.y - cat.height;
            cat.vy = JUMP_POWER;
            cat.jumpCount = 0;
            score = Math.max(score, Math.floor((canvas.height - cat.y) / 100));
        }
    });

    // Spawn new platforms
    if (platforms[platforms.length - 1].y > cameraY - 200) {
        spawnPlatform(platforms[platforms.length - 1].y - 200);
    }

    // Clean up
    if (platforms[0].y > cameraY + canvas.height + 100) {
        platforms.shift();
    }

    // Death
    if (cat.y > cameraY + canvas.height) {
        gameOver();
    }

    document.getElementById('score').textContent = score;
}

function gameOver() {
    gameState = 'START';
    document.getElementById('overlay').classList.remove('hidden');
    resetGame();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(0, -cameraY);

    // Platforms
    platforms.forEach(p => {
        ctx.fillStyle = '#70d6ff';
        ctx.fillRect(p.x, p.y, p.width, p.height);
        ctx.strokeStyle = 'white';
        ctx.strokeRect(p.x, p.y, p.width, p.height);
    });

    // Cat
    ctx.fillStyle = '#ff85a2';
    ctx.fillRect(cat.x, cat.y, cat.width, cat.height);
    // Cat ears
    ctx.beginPath();
    ctx.moveTo(cat.x, cat.y);
    ctx.lineTo(cat.x + 10, cat.y - 10);
    ctx.lineTo(cat.x + 20, cat.y);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cat.x + cat.width, cat.y);
    ctx.lineTo(cat.x + cat.width - 10, cat.y - 10);
    ctx.lineTo(cat.x + cat.width - 20, cat.y);
    ctx.fill();

    ctx.restore();
}

function animate() {
    update();
    draw();
    requestAnimationFrame(animate);
}

init();
