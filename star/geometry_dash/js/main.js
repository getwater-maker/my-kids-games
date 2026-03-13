const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const GRAVITY = 0.8;
const JUMP_FORCE = -12;
const SPEED = 6;
const PLAYER_SIZE = 40;
const GROUND_Y = canvas.height * 0.7;

let player = {
    x: 100,
    y: GROUND_Y - PLAYER_SIZE,
    vy: 0,
    rotation: 0,
    isGrounded: true
};

let obstacles = [];
let gameDistance = 0;
let gameState = 'START';
let frameCount = 0;

function init() {
    setupEventListeners();
    animate();
}

function setupEventListeners() {
    const jump = () => {
        if (gameState === 'PLAYING' && player.isGrounded) {
            player.vy = JUMP_FORCE;
            player.isGrounded = false;
        }
    };

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.code === 'ArrowUp') jump();
    });
    canvas.addEventListener('mousedown', jump);

    document.getElementById('start-btn').onclick = () => {
        gameState = 'PLAYING';
        document.getElementById('overlay').classList.add('hidden');
        resetGame();
    };
}

function resetGame() {
    player.y = GROUND_Y - PLAYER_SIZE;
    player.vy = 0;
    player.rotation = 0;
    player.isGrounded = true;
    obstacles = [];
    gameDistance = 0;
    frameCount = 0;
}

function spawnObstacle() {
    const type = Math.random() < 0.7 ? 'spike' : 'block';
    obstacles.push({
        x: canvas.width + 100,
        y: GROUND_Y,
        type: type,
        width: 40,
        height: 40
    });
}

function update() {
    if (gameState !== 'PLAYING') return;

    frameCount++;
    gameDistance += SPEED;

    // Player Gravity
    player.vy += GRAVITY;
    player.y += player.vy;

    if (player.y > GROUND_Y - PLAYER_SIZE) {
        player.y = GROUND_Y - PLAYER_SIZE;
        player.vy = 0;
        player.isGrounded = true;
        // Snap rotation to 90deg steps
        player.rotation = Math.round(player.rotation / (Math.PI / 2)) * (Math.PI / 2);
    } else {
        player.rotation += 0.15; // Fast rotation while jumping
    }

    // Move & Collide Obstacles
    obstacles.forEach((obs, idx) => {
        obs.x -= SPEED;

        // Simple AABB Collision
        if (player.x < obs.x + obs.width &&
            player.x + PLAYER_SIZE > obs.x &&
            player.y < obs.y &&
            player.y + PLAYER_SIZE > obs.y - obs.height) {
            gameOver();
        }

        if (obs.x < -100) obstacles.splice(idx, 1);
    });

    if (frameCount % 60 === 0) spawnObstacle();

    // UI
    const progress = Math.min(100, (gameDistance / 10000) * 100);
    document.getElementById('progress-bar').style.width = progress + '%';
    document.getElementById('percent').textContent = Math.floor(progress) + '%';

    if (progress >= 100) win();
}

function gameOver() {
    gameState = 'START';
    document.getElementById('overlay').classList.remove('hidden');
    document.querySelector('.logo').innerHTML = "YOU <span>DIED</span>";
    document.getElementById('start-btn').textContent = "RETRY";
}

function win() {
    gameState = 'START';
    document.getElementById('overlay').classList.remove('hidden');
    document.querySelector('.logo').innerHTML = "LEVEL <span>CLEAR!</span>";
    document.getElementById('start-btn').textContent = "NEXT CHALLENGE";
}

function draw() {
    // BG
    ctx.fillStyle = '#000022';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Floor
    ctx.fillStyle = '#0080ff';
    ctx.fillRect(0, GROUND_Y, canvas.width, 4);

    // Grid Effect
    ctx.strokeStyle = 'rgba(0, 128, 255, 0.1)';
    const offset = (gameDistance % 100);
    for (let x = -offset; x < canvas.width; x += 100) {
        ctx.beginPath(); ctx.moveTo(x, GROUND_Y); ctx.lineTo(x, canvas.height); ctx.stroke();
    }

    // Obstacles
    obstacles.forEach(obs => {
        ctx.fillStyle = '#ff4444';
        if (obs.type === 'spike') {
            ctx.beginPath();
            ctx.moveTo(obs.x, obs.y);
            ctx.lineTo(obs.x + obs.width / 2, obs.y - obs.height);
            ctx.lineTo(obs.x + obs.width, obs.y);
            ctx.fill();
        } else {
            ctx.fillRect(obs.x, obs.y - obs.height, obs.width, obs.height);
            ctx.strokeStyle = 'white';
            ctx.strokeRect(obs.x, obs.y - obs.height, obs.width, obs.height);
        }
    });

    // Player
    ctx.save();
    ctx.translate(player.x + PLAYER_SIZE / 2, player.y + PLAYER_SIZE / 2);
    ctx.rotate(player.rotation);

    ctx.fillStyle = '#00ff00';
    ctx.fillRect(-PLAYER_SIZE / 2, -PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.strokeRect(-PLAYER_SIZE / 2, -PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE);

    // Face
    ctx.fillStyle = 'black';
    ctx.fillRect(-10, -10, 5, 5);
    ctx.fillRect(5, -10, 5, 5);
    ctx.restore();
}

function animate() {
    update();
    draw();
    requestAnimationFrame(animate);
}

init();
