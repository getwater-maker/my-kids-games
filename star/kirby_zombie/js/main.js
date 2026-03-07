// js/main.js

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const ui = {
    aliveSurvivors: document.getElementById('alive-survivors'),
    matchTimer: document.getElementById('match-timer'),
    aliveZombies: document.getElementById('alive-zombies'),
    announcement: document.getElementById('announcement'),
    lobbyScreen: document.getElementById('lobby-screen'),
    spectatorScreen: document.getElementById('spectator-screen'),
    gameOverScreen: document.getElementById('game-over-screen'),
    resultTitle: document.getElementById('result-title'),
    startBtn: document.getElementById('start-btn'),
    spectateBtn: document.getElementById('spectate-btn'),
    restartBtn: document.getElementById('restart-btn')
};

// -- Game State --
let gameState = 'LOBBY'; // LOBBY, PLAYING, GAME_OVER
let animationId;
let gameTimer = 120; // 2 minutes = 120 seconds
let timerInterval;

// -- Metrics --
const MAP_WIDTH = 2500;
const MAP_HEIGHT = 2000;
let camera = { x: 0, y: 0, width: canvas.width, height: canvas.height };

// -- Input --
const keys = { w: false, a: false, s: false, d: false };
const mouse = { x: 0, y: 0, isDown: false, lastX: 0, lastY: 0 };

window.addEventListener('keydown', (e) => {
    let key = e.key.toLowerCase();
    if (keys.hasOwnProperty(key)) keys[key] = true;
});
window.addEventListener('keyup', (e) => {
    let key = e.key.toLowerCase();
    if (keys.hasOwnProperty(key)) keys[key] = false;
});

// Drag to pan in spectator mode
canvas.addEventListener('mousedown', (e) => {
    mouse.isDown = true;
    mouse.lastX = e.clientX;
    mouse.lastY = e.clientY;
});
window.addEventListener('mousemove', (e) => {
    if (gameState === 'PLAYING' && player.isDead && mouse.isDown) {
        let dx = e.clientX - mouse.lastX;
        let dy = e.clientY - mouse.lastY;
        camera.x -= dx;
        camera.y -= dy;
        mouse.lastX = e.clientX;
        mouse.lastY = e.clientY;
    }
});
window.addEventListener('mouseup', () => mouse.isDown = false);

// -- Classes --
class Entity {
    constructor(x, y, isZombie, isPlayer = false) {
        this.x = x;
        this.y = y;
        this.radius = 15;
        this.isZombie = isZombie;
        this.isPlayer = isPlayer;
        this.isDead = false; // Player specific death flag -> turns into spectator

        // Stats
        this.speed = this.isZombie ? 3.5 : 3.0; // 좀비가 미세하게 더 빠름
        if (this.isPlayer && !this.isZombie) this.speed = 3.6; // 플레이어는 예외적으로 조금 빠름

        this.dx = 0;
        this.dy = 0;

        // AI Tracking
        this.target = null;
        this.changeDirTimer = 0;
    }

    turnIntoZombie() {
        this.isZombie = true;
        this.speed = 3.5;
        if (this.isPlayer) {
            this.isDead = true; // 플레이어는 물리적으로 조종불가/관전자로 전환
            triggerSpectatorMode();
        }
    }

    update(entities) {
        if (this.isPlayer && this.isDead) return; // Player is spectating

        if (this.isPlayer) {
            // Player Input
            this.dx = 0; this.dy = 0;
            if (keys.w) this.dy = -this.speed;
            if (keys.s) this.dy = this.speed;
            if (keys.a) this.dx = -this.speed;
            if (keys.d) this.dx = this.speed;

            // Diagonal normalize
            if (this.dx !== 0 && this.dy !== 0) {
                let len = Math.hypot(this.dx, this.dy);
                this.dx = (this.dx / len) * this.speed;
                this.dy = (this.dy / len) * this.speed;
            }

        } else {
            // AI Logic
            if (this.isZombie) {
                // 좀비 AI: 가장 가까운 인간 추적
                let closestDist = Infinity;
                let closestTarget = null;

                for (let e of entities) {
                    if (!e.isZombie && !(e.isPlayer && e.isDead)) {
                        let dist = Math.hypot(e.x - this.x, e.y - this.y);
                        if (dist < closestDist) {
                            closestDist = dist;
                            closestTarget = e;
                        }
                    }
                }

                if (closestTarget) {
                    let angle = Math.atan2(closestTarget.y - this.y, closestTarget.x - this.x);
                    this.dx = Math.cos(angle) * this.speed;
                    this.dy = Math.sin(angle) * this.speed;
                } else {
                    this.dx = 0; this.dy = 0; // 승리 후 멈춤
                }

            } else {
                // 인간 AI: 가장 가까운 좀비 파악
                let closestZombieDist = Infinity;
                let closestZombie = null;

                for (let e of entities) {
                    if (e.isZombie) {
                        let dist = Math.hypot(e.x - this.x, e.y - this.y);
                        if (dist < closestZombieDist) {
                            closestZombieDist = dist;
                            closestZombie = e;
                        }
                    }
                }

                if (closestZombie && closestZombieDist < 300) {
                    // 도망치기
                    let angle = Math.atan2(this.y - closestZombie.y, this.x - closestZombie.x);
                    this.dx = Math.cos(angle) * this.speed;
                    this.dy = Math.sin(angle) * this.speed;
                } else {
                    // 평상시 배회
                    this.changeDirTimer--;
                    if (this.changeDirTimer <= 0) {
                        let angle = Math.random() * Math.PI * 2;
                        this.dx = Math.cos(angle) * (this.speed * 0.5);
                        this.dy = Math.sin(angle) * (this.speed * 0.5);
                        this.changeDirTimer = 60 + Math.random() * 60;
                    }
                }
            }
        }

        // Apply movement & bounds
        this.x += this.dx;
        this.y += this.dy;

        if (this.x < this.radius) this.x = this.radius;
        if (this.y < this.radius) this.y = this.radius;
        if (this.x > MAP_WIDTH - this.radius) this.x = MAP_WIDTH - this.radius;
        if (this.y > MAP_HEIGHT - this.radius) this.y = MAP_HEIGHT - this.radius;

        // Zombie Attack Collision
        if (this.isZombie) {
            for (let e of entities) {
                if (!e.isZombie && !(e.isPlayer && e.isDead)) {
                    let dist = Math.hypot(e.x - this.x, e.y - this.y);
                    if (dist < this.radius * 2) {
                        // 감염
                        e.turnIntoZombie();
                    }
                }
            }
        }
    }

    draw(ctx) {
        if (this.isPlayer && this.isDead) return; // 관전자는 안 그림

        let screenX = this.x - camera.x;
        let screenY = this.y - camera.y;

        // Culling
        if (screenX < -50 || screenX > canvas.width + 50 || screenY < -50 || screenY > canvas.height + 50) return;

        // Player Outline Indicator
        if (this.isPlayer) {
            ctx.shadowColor = 'yellow';
            ctx.shadowBlur = 10;
        }

        ctx.fillStyle = this.isZombie ? '#66bb6a' : '#ff80ab'; // 좀비: 그린, 생존자: 핑크
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0; // reset

        // 눈
        ctx.fillStyle = this.isZombie ? '#ff1744' : 'black'; // 좀비는 빨간 눈

        // 방향 계산 (눈의 위치)
        let angle = Math.atan2(this.dy, this.dx);
        if (this.dx === 0 && this.dy === 0) angle = Math.PI / 2; // 기본 정면

        let eyeOffsetX = Math.cos(angle) * 8;
        let eyeOffsetY = Math.sin(angle) * 8;

        ctx.beginPath();
        ctx.arc(screenX + eyeOffsetX - 4, screenY + eyeOffsetY, 3, 0, Math.PI * 2);
        ctx.arc(screenX + eyeOffsetX + 4, screenY + eyeOffsetY, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

// -- Global Vars --
let player = null;
let allEntities = [];

function initGame() {
    allEntities = [];

    // Player - 생존자 1
    player = new Entity(MAP_WIDTH / 2, MAP_HEIGHT / 2, false, true);
    allEntities.push(player);

    // AI 생존자 29명 (총 생존자 30)
    for (let i = 0; i < 29; i++) {
        let x = Math.random() * (MAP_WIDTH - 100) + 50;
        let y = Math.random() * (MAP_HEIGHT - 100) + 50;
        allEntities.push(new Entity(x, y, false));
    }

    // 초기 좀비 3명 (숙주)
    for (let i = 0; i < 3; i++) {
        // 플레이어와 너무 가깝지 않게
        let x, y;
        do {
            x = Math.random() * (MAP_WIDTH - 100) + 50;
            y = Math.random() * (MAP_HEIGHT - 100) + 50;
        } while (Math.hypot(x - player.x, y - player.y) < 600);

        allEntities.push(new Entity(x, y, true));
    }

    gameTimer = 120; // 2분
    gameState = 'PLAYING';

    ui.lobbyScreen.classList.remove('active');
    ui.gameOverScreen.classList.remove('active');
    ui.spectatorScreen.classList.remove('active');

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (gameState === 'PLAYING') {
            gameTimer--;
            let mins = Math.floor(gameTimer / 60).toString().padStart(2, '0');
            let secs = (gameTimer % 60).toString().padStart(2, '0');
            ui.matchTimer.textContent = `${mins}:${secs}`;

            if (gameTimer <= 0) {
                checkWinCondition(true); // 시간 초과로 강제 체크 (생존자 승)
            }
        }
    }, 1000);

    announce("감염이 시작되었습니다!", 3000);
}

function triggerSpectatorMode() {
    ui.spectatorScreen.classList.add('active');
}

function checkWinCondition(timeOut = false) {
    let sCount = 0;
    let zCount = 0;

    for (let e of allEntities) {
        if (e.isZombie) zCount++;
        else if (!(e.isPlayer && e.isDead)) sCount++; // 죽은 플레이어 제외 생존자
    }

    ui.aliveSurvivors.textContent = sCount;
    ui.aliveZombies.textContent = zCount;

    if (gameState === 'PLAYING') {
        if (sCount === 0) {
            endGame("좀비 승리!", "모든 인류가 감염되었습니다.");
        } else if (timeOut) {
            if (player.isDead) {
                endGame("생존자 승리!", "비록 당신은 감염되었으나, 인류의 끈을 이은 생존자들이 탈출했습니다.");
            } else {
                endGame("생존자 승리!", "무사히 버텨냈습니다! 헬기가 도착했습니다.");
            }
        }
    }
}

function endGame(title, msg) {
    gameState = 'GAME_OVER';
    clearInterval(timerInterval);
    ui.resultTitle.textContent = title;
    ui.spectatorScreen.classList.remove('active'); // Hide spectator UI
    ui.gameOverScreen.classList.add('active');
}

function announce(msg, duration = 2000) {
    ui.announcement.textContent = msg;
    ui.announcement.style.opacity = 1;
    setTimeout(() => { ui.announcement.style.opacity = 0; }, duration);
}

// -- Main Loop --
function update() {
    if (gameState !== 'PLAYING') return;

    // Update Entities
    for (let e of allEntities) {
        e.update(allEntities);
    }

    checkWinCondition();

    // Camera follow (Player if alive, Free roam if spectating)
    if (player && !player.isDead) {
        camera.x += (player.x - canvas.width / 2 - camera.x) * 0.1;
        camera.y += (player.y - canvas.height / 2 - camera.y) * 0.1;
    }

    // Clamp Camera bounds
    if (camera.x < 0) camera.x = 0;
    if (camera.y < 0) camera.y = 0;
    if (camera.x > MAP_WIDTH - camera.width) camera.x = MAP_WIDTH - camera.width;
    if (camera.y > MAP_HEIGHT - camera.height) camera.y = MAP_HEIGHT - camera.height;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Floor Draw
    ctx.fillStyle = '#37474f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid details for pseudo-texture
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 2;
    let offsetX = camera.x % 100;
    let offsetY = camera.y % 100;

    for (let x = -offsetX; x < canvas.width; x += 100) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = -offsetY; y < canvas.height; y += 100) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Map Boundaries rendering
    ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
    if (camera.x <= 0) ctx.fillRect(0, 0, 10, canvas.height);
    if (camera.y <= 0) ctx.fillRect(0, 0, canvas.width, 10);
    if (camera.x >= MAP_WIDTH - camera.width) ctx.fillRect(canvas.width - 10, 0, 10, canvas.height);
    if (camera.y >= MAP_HEIGHT - camera.height) ctx.fillRect(0, canvas.height - 10, canvas.width, 10);

    // Entities
    for (let e of allEntities) {
        e.draw(ctx);
    }

    // Vignette / Darkness Effect
    let gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 100, canvas.width / 2, canvas.height / 2, 600);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function loop() {
    update();
    draw();
    animationId = requestAnimationFrame(loop);
}

// Events
ui.startBtn.addEventListener('click', initGame);
ui.restartBtn.addEventListener('click', () => {
    gameState = 'LOBBY';
    ui.gameOverScreen.classList.remove('active');
    ui.lobbyScreen.classList.add('active');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

ui.spectateBtn.addEventListener('click', () => {
    ui.spectatorScreen.classList.remove('active');
});

// Initial boot
requestAnimationFrame(loop);
