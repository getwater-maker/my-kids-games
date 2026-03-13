// star/infinite_stairs/js/main.js

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gameState = 'START';
let score = 0;
let time = 100;
const maxTime = 100;

// Staircase settings
const stairWidth = 100;
const stairHeight = 40;
let stairs = [];
let playerPos = { x: 0, y: 0, side: 1 }; // side: 1 (Right), -1 (Left)
let cameraY = 0;
let cameraX = 0;
let hasStarted = false;

function init() {
    resize();
    resetGame();

    document.getElementById('start-btn').onclick = () => {
        document.getElementById('overlay').classList.add('hidden');
        gameState = 'PLAYING';
    };

    window.addEventListener('keydown', handleInput);

    gameLoop();
}

function resize() {
    canvas.width = 500;
    canvas.height = 800;
}

function resetGame() {
    score = 0;
    time = maxTime;
    stairs = [{ x: canvas.width / 2 - stairWidth / 2, y: canvas.height - 200, side: 1 }];
    playerPos = { x: canvas.width / 2, y: canvas.height - 200 - 45, side: 1 };
    cameraY = 0;
    cameraX = 0;
    hasStarted = false;

    // Initial stairs
    for (let i = 0; i < 20; i++) {
        addStair();
    }
}

function addStair() {
    const last = stairs[stairs.length - 1];
    const newSide = Math.random() > 0.6 ? last.side * -1 : last.side;
    const newX = last.x + (newSide === 1 ? stairWidth / 2 : -stairWidth / 2);
    const newY = last.y - stairHeight;

    stairs.push({ x: newX, y: newY, side: newSide });
}

function handleInput(e) {
    if (gameState !== 'PLAYING') return;

    const key = e.code;
    const nextStair = stairs[score + 1];

    if (key === 'KeyL' || key === 'KeyK') {
        hasStarted = true;
    }

    if (key === 'KeyL') { // Climb
        // Move in CURRENT direction
        movePlayer(playerPos.side);
    } else if (key === 'KeyK') { // Rotate
        // Switch direction THEN move
        playerPos.side *= -1;
        movePlayer(playerPos.side);
    }
}

function movePlayer(moveSide) {
    const nextStair = stairs[score + 1];

    // Check if player's side matches the next stair's requirement
    // In Infinite Stairs, if you are looking Right (side 1), moving forward takes you to the next step if it's placed to the right.
    // However, the game logic is simpler:
    // Every step is a 'move'. If you move towards where the next step IS, you succeed.

    // Calculate where player WOULD be
    const targetX = stairs[score].x + (moveSide === 1 ? stairWidth : 0);

    // Actually, Infinite Stairs logic:
    // Next stair is always up.
    // If you are at step i, and step i+1 is to the "relative right" of i, you must be facing Right.
    const isCorrect = (nextStair.x > stairs[score].x && moveSide === 1) ||
        (nextStair.x < stairs[score].x && moveSide === -1);

    if (isCorrect) {
        score++;
        time = Math.min(maxTime, time + 2); // Refill time
        playerPos.y -= stairHeight;
        playerPos.x = nextStair.x + (moveSide === 1 ? stairWidth * 0.7 : stairWidth * 0.3);

        if (stairs.length < score + 20) {
            addStair();
        }

        // Update Camera
        cameraY = -playerPos.y + canvas.height - 300;
        cameraX = -playerPos.x + canvas.width / 2;

        // Visual feedback
        document.getElementById('score-display').textContent = score;
    } else {
        gameOver();
    }
}

function update() {
    if (gameState !== 'PLAYING' || !hasStarted) return;

    time -= 0.5 + (score / 100); // Speed up depletion over time
    if (time <= 0) gameOver();

    document.getElementById('timer-bar').style.width = time + '%';
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(cameraX, cameraY);

    // Draw Stairs
    stairs.forEach((s, i) => {
        // Skip stairs way below camera
        if (s.y + cameraY > canvas.height + 100) return;

        ctx.fillStyle = i % 2 === 0 ? '#ff9f43' : '#ee5253';
        ctx.fillRect(s.x, s.y, stairWidth, stairHeight);

        // Highlight top
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(s.x, s.y, stairWidth, 5);
    });

    // Draw Player
    ctx.save();
    ctx.translate(playerPos.x, playerPos.y);
    if (playerPos.side === -1) ctx.scale(-1, 1);

    if (score < 50) {
        // Normal Character
        ctx.fillStyle = '#2f3542';
        ctx.fillRect(-15, -40, 30, 40); // Body
        ctx.fillStyle = '#ff6b81';
        ctx.fillRect(-15, -40, 30, 10); // Hat/Top
        ctx.fillStyle = '#fff';
        ctx.fillRect(5, -30, 5, 5); // Eyes
    } else if (score < 100) {
        // Cheerleader Character (Unlocked at 50)
        ctx.fillStyle = '#f8c291'; // Skin
        ctx.fillRect(-12, -45, 24, 45); // Body
        ctx.fillStyle = '#ff4757'; // Red Uniform
        ctx.fillRect(-12, -30, 24, 20); // Top
        ctx.fillStyle = '#fff';
        ctx.fillRect(-12, -15, 24, 15); // Skirt
        ctx.fillStyle = '#ffa502'; // Pom Poms
        ctx.beginPath();
        ctx.arc(15, -20, 10, 0, Math.PI * 2);
        ctx.arc(-15, -20, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.fillRect(5, -38, 4, 4); // Eyes
    } else if (score < 150) {
        // Sheriff Character (Unlocked at 100)
        ctx.fillStyle = '#e1b12c'; // Tan Shirt
        ctx.fillRect(-14, -40, 28, 40);
        ctx.fillStyle = '#273c75'; // Blue Pants
        ctx.fillRect(-14, -15, 28, 15);
        ctx.fillStyle = '#4b2c12'; // Brown Hat
        ctx.fillRect(-22, -45, 44, 5); // Brim
        ctx.fillRect(-15, -55, 30, 15); // Top
        ctx.fillStyle = '#fbc531'; // Silver/Gold Badge
        ctx.fillRect(2, -30, 8, 8);
        ctx.fillStyle = '#000';
        ctx.fillRect(5, -40, 4, 4); // Eyes
    } else {
        // Boxer Character (Unlocked at 150)
        ctx.fillStyle = '#f8c291'; // Skin
        ctx.fillRect(-14, -45, 28, 45);
        ctx.fillStyle = '#192a56'; // Blue Shorts
        ctx.fillRect(-14, -15, 28, 15);
        // Boxing Gloves
        ctx.fillStyle = '#c23616'; // Red
        ctx.beginPath();
        ctx.arc(18, -25, 12, 0, Math.PI * 2);
        ctx.arc(-10, -35, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.fillRect(5, -38, 4, 4); // Eyes
    }

    ctx.restore();

    ctx.restore();
}

function gameOver() {
    gameState = 'GAMEOVER';
    document.getElementById('game-over').classList.remove('hidden');
    document.getElementById('final-score').textContent = score;
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

init();
