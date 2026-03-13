// star/cookie_run/js/main.js

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state
let gameState = 'START';
let score = 0;
let energy = 100;
let backgroundOffset = 0;
let groundOffset = 0;

// Canvas scaling
function resize() {
    canvas.width = 1280;
    canvas.height = 720;
}
resize();

// Assets simulation (using colors/shapes)
const player = {
    x: 150,
    y: 500,
    width: 60,
    height: 80,
    vy: 0,
    gravity: 0.8,
    jumpForce: -18,
    isJumping: false,
    jumpCount: 0,
    isSliding: false,
    state: 'RUN' // RUN, JUMP, SLIDE
};

let obstacles = [];
let jellies = [];
let frameCount = 0;

function spawnObstacle() {
    const types = ['HIGH', 'LOW']; // High obstacles require sliding, Low require jumping
    const type = types[Math.floor(Math.random() * 2)];
    obstacles.push({
        x: canvas.width,
        y: type === 'HIGH' ? 420 : 540,
        width: 50,
        height: type === 'HIGH' ? 100 : 80,
        type: type
    });
}

function spawnJelly() {
    jellies.push({
        x: canvas.width,
        y: 400 + Math.random() * 200,
        width: 20,
        height: 20,
        color: '#f9ca24'
    });
}

function update() {
    if (gameState !== 'PLAYING') return;

    frameCount++;
    backgroundOffset -= 2;
    groundOffset -= 8;

    // Player Physics
    player.vy += player.gravity;
    player.y += player.vy;

    if (player.y > 540) { // Ground level
        player.y = 540;
        player.vy = 0;
        player.isJumping = false;
        player.jumpCount = 0;
    }

    // Energy logic
    energy -= 0.05;
    if (energy <= 0) gameOver();
    document.getElementById('energy-bar').style.width = energy + '%';

    // Spawning
    if (frameCount % 120 === 0) spawnObstacle();
    if (frameCount % 40 === 0) spawnJelly();

    // Update Obstacles
    obstacles.forEach((obs, index) => {
        obs.x -= 8;
        // Collision
        if (checkCollision(player, obs)) {
            energy -= 20;
            obstacles.splice(index, 1);
        }
        if (obs.x < -100) obstacles.splice(index, 1);
    });

    // Update Jellies
    jellies.forEach((jelly, index) => {
        jelly.x -= 8;
        if (checkCollision(player, jelly)) {
            score += 100;
            energy = Math.min(100, energy + 1);
            jellies.splice(index, 1);
        }
        if (jelly.x < -50) jellies.splice(index, 1);
    });

    document.getElementById('score-val').textContent = Math.floor(score);
}

function checkCollision(p, o) {
    // Simple box collision
    const px = p.x;
    const py = p.isSliding ? p.y + 40 : p.y;
    const ph = p.isSliding ? p.height / 2 : p.height;

    return px < o.x + o.width &&
        px + p.width > o.x &&
        py < o.y + o.height &&
        py + ph > o.y;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background (Gradient)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGrad.addColorStop(0, '#74b9ff');
    bgGrad.addColorStop(1, '#a29bfe');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Drawing distant hills
    ctx.fillStyle = '#6ab04c';
    for (let i = 0; i < 5; i++) {
        const x = (backgroundOffset % 400) + i * 400;
        ctx.beginPath();
        ctx.arc(x, 600, 200, 0, Math.PI * 2);
        ctx.fill();
    }

    // Ground
    ctx.fillStyle = '#2c1608';
    ctx.fillRect(0, 620, canvas.width, 100);
    ctx.fillStyle = '#d35400';
    ctx.fillRect(0, 620, canvas.width, 10);

    // Obstacles
    obstacles.forEach(obs => {
        ctx.fillStyle = '#eb4d4b';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        // Spike visual
        ctx.strokeStyle = '#2c3e50';
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
    });

    // Jellies
    jellies.forEach(jelly => {
        ctx.fillStyle = jelly.color;
        ctx.beginPath();
        ctx.arc(jelly.x + 10, jelly.y + 10, 10, 0, Math.PI * 2);
        ctx.fill();
    });

    // Player
    ctx.save();
    ctx.translate(player.x, player.y);

    if (player.isSliding) {
        ctx.fillStyle = '#f0932b'; // Ginger
        ctx.fillRect(0, 40, 100, 40);
        ctx.fillStyle = '#fff'; // Frosting
        ctx.fillRect(10, 50, 20, 10);
        // Face
        ctx.fillStyle = '#000';
        ctx.fillRect(80, 50, 5, 5);
    } else {
        ctx.fillStyle = '#f0932b';
        ctx.fillRect(0, 0, 60, 80);
        ctx.fillStyle = '#fff';
        ctx.fillRect(10, 10, 40, 10);
        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(15, 25, 5, 5);
        ctx.fillRect(40, 25, 5, 5);
        // Smile
        ctx.beginPath();
        ctx.arc(30, 45, 10, 0, Math.PI);
        ctx.stroke();
    }
    ctx.restore();
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

function handleInput(type) {
    if (gameState !== 'PLAYING') return;

    if (type === 'JUMP') {
        if (player.jumpCount < 2) {
            player.vy = player.jumpForce;
            player.jumpCount++;
            player.isSliding = false;
        }
    } else if (type === 'SLIDE_START') {
        if (player.jumpCount === 0) {
            player.isSliding = true;
        }
    } else if (type === 'SLIDE_END') {
        player.isSliding = false;
    }
}

// Controls
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') handleInput('JUMP');
    if (e.code === 'ArrowDown' || e.code === 'KeyS') handleInput('SLIDE_START');
});
window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowDown' || e.code === 'KeyS') handleInput('SLIDE_END');
});
canvas.addEventListener('mousedown', () => handleInput('JUMP'));

function gameOver() {
    gameState = 'GAMEOVER';
    document.getElementById('game-over').classList.remove('hidden');
    document.getElementById('final-score').textContent = Math.floor(score);
}

document.getElementById('start-btn').onclick = () => {
    document.getElementById('overlay').classList.add('hidden');
    gameState = 'PLAYING';
    loop();
};
