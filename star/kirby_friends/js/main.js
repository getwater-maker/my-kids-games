// js/main.js

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const fogDiv = document.getElementById('fog');

// UI Elements
const ui = {
    startScreen: document.getElementById('start-screen'),
    gameOverScreen: document.getElementById('game-over-screen'),
    gameClearScreen: document.getElementById('game-clear-screen'),
    yoyoCount: document.getElementById('yoyo-count'),
    survivorCount: document.getElementById('survivor-count'),
    startBtn: document.getElementById('start-btn'),
    restartBtn: document.getElementById('restart-btn')
};

// --- Game State ---
let gameState = 'START'; // START, PLAYING, GAME_OVER, GAME_CLEAR
let animationId;
let yoyosCollected = 0;
const TOTAL_YOYOS = 10;
const TOTAL_SURVIVORS = 15;
let survivingKirbys = TOTAL_SURVIVORS;

// Map & Camera
const TILE_SIZE = 40;
const MAP_WIDTH = 40; // 40 * 40 = 1600px
const MAP_HEIGHT = 30; // 30 * 40 = 1200px
let camera = { x: 0, y: 0, width: canvas.width, height: canvas.height };

// Input
const keys = {
    w: false, a: false, s: false, d: false,
    ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false
};

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
    else if (keys.hasOwnProperty(e.code)) keys[e.code] = true; // Arrow keys compatibility
});
window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
    else if (keys.hasOwnProperty(e.code)) keys[e.code] = false;
});

// --- Map System ---
class GameMap {
    constructor() {
        this.grid = []; // 0 = empty, 1 = wall
        this.generateMap();
    }

    generateMap() {
        // 배열 미리 초기화
        for (let y = 0; y < MAP_HEIGHT; y++) {
            this.grid[y] = [];
            for (let x = 0; x < MAP_WIDTH; x++) {
                this.grid[y][x] = 0;
            }
        }

        // 미로 생성 (간단한 고정 패턴 + 랜덤)
        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                // 외곽선 벽
                if (x === 0 || x === MAP_WIDTH - 1 || y === 0 || y === MAP_HEIGHT - 1) {
                    this.grid[y][x] = 1;
                } else {
                    // 기둥/벽 생성 확률 (플레이어가 지나갈 공간 충분히 확보)
                    if (x % 3 === 0 && y % 3 === 0 && Math.random() > 0.3) {
                        this.grid[y][x] = 1;
                        // 가끔 십자 모양으로 벽 연장
                        if (Math.random() > 0.5 && x + 1 < MAP_WIDTH - 1) this.grid[y][x + 1] = 1;
                        if (Math.random() > 0.5 && y + 1 < MAP_HEIGHT - 1) this.grid[y + 1][x] = 1;
                    }
                }
            }
        }

        // 시작 지점(중앙 부근)은 비워두기
        const startCX = Math.floor(MAP_WIDTH / 2);
        const startCY = Math.floor(MAP_HEIGHT / 2);
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                this.grid[startCY + dy][startCX + dx] = 0;
            }
        }
    }

    draw(ctx) {
        ctx.fillStyle = '#222'; // 어두운 벽돌 느낌
        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                if (this.grid[y][x] === 1) {
                    let screenX = x * TILE_SIZE - camera.x;
                    let screenY = y * TILE_SIZE - camera.y;

                    // 화면에 보일 때만 그리기
                    if (screenX + TILE_SIZE > 0 && screenX < camera.width &&
                        screenY + TILE_SIZE > 0 && screenY < camera.height) {
                        ctx.fillStyle = '#3a0ca3'; // 벽 색상
                        ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
                        ctx.strokeStyle = '#270872';
                        ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
                    }
                }
            }
        }
    }

    isWall(x, y, width, height) {
        // 픽셀 좌표를 그리드 좌표로 변환하여 벽과 충돌하는지 확인 (AABB)
        let leftTile = Math.floor(x / TILE_SIZE);
        let rightTile = Math.floor((x + width - 1) / TILE_SIZE);
        let topTile = Math.floor(y / TILE_SIZE);
        let bottomTile = Math.floor((y + height - 1) / TILE_SIZE);

        for (let row = topTile; row <= bottomTile; row++) {
            for (let col = leftTile; col <= rightTile; col++) {
                if (row >= 0 && row < MAP_HEIGHT && col >= 0 && col < MAP_WIDTH) {
                    if (this.grid[row][col] === 1) return true;
                } else {
                    return true; // 맵 밖은 벽으로 취급
                }
            }
        }
        return false;
    }
}

class Entity {
    constructor(x, y, speed, color) {
        this.width = 30;
        this.height = 30;
        this.x = x;
        this.y = y;
        this.speed = speed;
        this.color = color;
        this.dx = 0;
        this.dy = 0;
    }

    move() {
        if (!gameMap.isWall(this.x + this.dx, this.y, this.width, this.height)) {
            this.x += this.dx;
        } else {
            this.dx = 0; // 벽에 부딪히면 멈춤
        }

        if (!gameMap.isWall(this.x, this.y + this.dy, this.width, this.height)) {
            this.y += this.dy;
        } else {
            this.dy = 0;
        }
    }

    draw(ctx) {
        let screenX = this.x - camera.x;
        let screenY = this.y - camera.y;

        // 화면 밖이면 그리지 않음
        if (screenX + this.width < 0 || screenX > camera.width || screenY + this.height < 0 || screenY > camera.height) return;

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(screenX + this.width / 2, screenY + this.height / 2, this.width / 2, 0, Math.PI * 2);
        ctx.fill();

        // 눈
        ctx.fillStyle = 'black';
        ctx.fillRect(screenX + 8, screenY + 6, 4, 8);
        ctx.fillRect(screenX + 18, screenY + 6, 4, 8);

        // 볼터치
        ctx.fillStyle = '#ff4081';
        ctx.beginPath();
        ctx.arc(screenX + 4, screenY + 14, 3, 0, Math.PI * 2);
        ctx.arc(screenX + 26, screenY + 14, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

// --- Entities ---
class Player {
    constructor() {
        this.width = 32;
        this.height = 32;
        this.x = (MAP_WIDTH * TILE_SIZE) / 2;
        this.y = (MAP_HEIGHT * TILE_SIZE) / 2;
        this.speed = 4;
        this.color = '#ff80ab';
    }

    update() {
        let dx = 0;
        let dy = 0;

        if (keys.w || keys.ArrowUp) dy = -this.speed;
        if (keys.s || keys.ArrowDown) dy = this.speed;
        if (keys.a || keys.ArrowLeft) dx = -this.speed;
        if (keys.d || keys.ArrowRight) dx = this.speed;

        // 대각선 이동 속도 보정
        if (dx !== 0 && dy !== 0) {
            let length = Math.sqrt(dx * dx + dy * dy);
            dx = (dx / length) * this.speed;
            dy = (dy / length) * this.speed;
        }

        // X축 충돌 검사
        if (!gameMap.isWall(this.x + dx, this.y, this.width, this.height)) {
            this.x += dx;
        }
        // Y축 충돌 검사
        if (!gameMap.isWall(this.x, this.y + dy, this.width, this.height)) {
            this.y += dy;
        }

        // Update Camera to center on player
        camera.x = this.x + this.width / 2 - canvas.width / 2;
        camera.y = this.y + this.height / 2 - canvas.height / 2;

        // Camera clamping (맵 밖을 보여주지 않도록)
        if (camera.x < 0) camera.x = 0;
        if (camera.y < 0) camera.y = 0;
        if (camera.x > MAP_WIDTH * TILE_SIZE - camera.width) camera.x = MAP_WIDTH * TILE_SIZE - camera.width;
        if (camera.y > MAP_HEIGHT * TILE_SIZE - camera.height) camera.y = MAP_HEIGHT * TILE_SIZE - camera.height;
    }

    draw(ctx) {
        let screenX = this.x - camera.x;
        let screenY = this.y - camera.y;

        // 몸통
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(screenX + this.width / 2, screenY + this.height / 2, this.width / 2, 0, Math.PI * 2);
        ctx.fill();

        // 눈 (간단히 앞을 보는 걸로)
        ctx.fillStyle = 'black';
        ctx.fillRect(screenX + 10, screenY + 8, 4, 8);
        ctx.fillRect(screenX + 22, screenY + 8, 4, 8);

        ctx.fillStyle = '#ff4081'; // 볼터치
        ctx.beginPath();
        ctx.arc(screenX + 6, screenY + 16, 3, 0, Math.PI * 2);
        ctx.arc(screenX + 28, screenY + 16, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

class NormalKirby extends Entity {
    constructor(x, y) {
        super(x, y, 2.5, '#f48fb1'); // 플레이어보단 약간 연한 핑크, 느림
        this.changeDirectionTimer = 0;
        this.state = 'WANDER';
    }

    update() {
        this.changeDirectionTimer--;

        if (this.changeDirectionTimer <= 0 || (this.dx === 0 && this.dy === 0)) {
            // 랜덤 방향 설정
            let angle = Math.random() * Math.PI * 2;
            this.dx = Math.cos(angle) * this.speed;
            this.dy = Math.sin(angle) * this.speed;
            this.changeDirectionTimer = 60 + Math.random() * 60; // 1~2초 유지
        }

        this.move();
    }
}

class ScaryKirby extends Entity {
    constructor(x, y) {
        super(x, y, 3.2, '#311b92'); // 다크 퍼플, 일반 커비보다 빠름
        this.target = null;
    }

    update() {
        // 가장 가까운 목표 찾기 (플레이어 우선 탐색, 거리가 멀면 AI 커비)
        let closestDist = Infinity;
        this.target = null;

        // 플레이어 거리 계산
        let distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
        closestDist = distToPlayer;
        this.target = player;

        // 살아있는 AI 커비들 탐색
        for (let k of aiKirbys) {
            if (!k.dead) {
                let d = Math.hypot(k.x - this.x, k.y - this.y);
                if (d < closestDist) {
                    closestDist = d;
                    this.target = k;
                }
            }
        }

        // 목표를 향해 이동
        if (this.target) {
            let angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
            this.dx = Math.cos(angle) * this.speed;
            this.dy = Math.sin(angle) * this.speed;

            // 이동 (Entity의 move 메서드를 오버라이드하여 벽에 비비적거리게 만듦)
            if (!gameMap.isWall(this.x + this.dx, this.y, this.width, this.height)) {
                this.x += this.dx;
            } else {
                // X가 막히면 Y로만 가보기
                if (!gameMap.isWall(this.x, this.y + this.dy, this.width, this.height)) {
                    this.y += this.dy;
                }
            }

            if (!gameMap.isWall(this.x, this.y + this.dy, this.width, this.height)) {
                this.y += this.dy;
            } else {
                // Y가 막히면 X로만 가보기
                if (!gameMap.isWall(this.x + this.dx, this.y, this.width, this.height)) {
                    this.x += this.dx;
                }
            }
        }
    }

    draw(ctx) {
        let screenX = this.x - camera.x;
        let screenY = this.y - camera.y;

        if (screenX + this.width < 0 || screenX > camera.width || screenY + this.height < 0 || screenY > camera.height) return;

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(screenX + this.width / 2, screenY + this.height / 2, this.width / 2, 0, Math.PI * 2);
        ctx.fill();

        // 무서운 눈 (빨간색, 큼)
        ctx.fillStyle = '#ff1744'; // Red
        ctx.fillRect(screenX + 6, screenY + 4, 8, 10);
        ctx.fillRect(screenX + 16, screenY + 4, 8, 10);

        // 날카로운 입 (이빨)
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(screenX + 10, screenY + 22);
        ctx.lineTo(screenX + 15, screenY + 16);
        ctx.lineTo(screenX + 20, screenY + 22);
        ctx.fill();
    }
}

class Yoyo {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 16;
        this.height = 16;
        this.collected = false;
        this.floatOffset = Math.random() * Math.PI * 2;
    }

    draw(ctx) {
        if (this.collected) return;

        let screenX = this.x - camera.x;
        let screenY = this.y - camera.y + Math.sin(Date.now() / 300 + this.floatOffset) * 5; // 둥둥 뜨는 애니메이션

        if (screenX + this.width < 0 || screenX > camera.width || screenY + this.height < 0 || screenY > camera.height) return;

        // 요요 끈 (노란 선)
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(screenX + this.width / 2, screenY - 5);
        ctx.lineTo(screenX + this.width / 2, screenY + this.width / 2);
        ctx.stroke();

        // 요요 본체 (주황빛나는 빨강)
        ctx.fillStyle = '#ff5722';
        ctx.beginPath();
        ctx.arc(screenX + this.width / 2, screenY + this.height / 2, 8, 0, Math.PI * 2);
        ctx.fill();

        // 중앙 노란 별
        ctx.fillStyle = '#ffeb3b';
        ctx.beginPath();
        ctx.arc(screenX + this.width / 2, screenY + this.height / 2, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Global Objects
let gameMap;
let player;
let aiKirbys = [];
let yoyos = [];
let scaryKirby;

// Helper
function getRandomEmptySpace() {
    let x, y;
    while (true) {
        x = Math.floor(Math.random() * (MAP_WIDTH - 2)) + 1;
        y = Math.floor(Math.random() * (MAP_HEIGHT - 2)) + 1;
        if (gameMap.grid[y][x] === 0) {
            return {
                x: x * TILE_SIZE + TILE_SIZE / 4,
                y: y * TILE_SIZE + TILE_SIZE / 4
            };
        }
    }
}

// --- Main Engine ---
function init() {
    gameMap = new GameMap();
    player = new Player();
    aiKirbys = [];
    yoyos = [];

    yoyosCollected = 0;
    survivingKirbys = TOTAL_SURVIVORS;

    // Spawn AI Kirbys
    for (let i = 0; i < TOTAL_SURVIVORS - 1; i++) { // 플레이어 포함 15명이므로 AI는 14명
        let pos = getRandomEmptySpace();
        aiKirbys.push(new NormalKirby(pos.x, pos.y));
    }

    // Spawn Yoyos
    for (let i = 0; i < TOTAL_YOYOS; i++) {
        let pos = getRandomEmptySpace();
        yoyos.push(new Yoyo(pos.x, pos.y));
    }

    // Spawn Scary Kirby (항상 플레이어와 멀리 떨어지게, 대략 오른쪽 아래 끝 부근에서 생성확률 높음)
    let badPos = { x: (MAP_WIDTH - 2) * TILE_SIZE, y: (MAP_HEIGHT - 2) * TILE_SIZE };
    scaryKirby = new ScaryKirby(badPos.x, badPos.y);

    updateHUD();

    gameState = 'PLAYING';

    // Hide all UI screens
    ui.startScreen.classList.remove('active');
    ui.gameOverScreen.classList.remove('active');
    ui.gameClearScreen.classList.remove('active');

    fogDiv.style.opacity = '1';
}

function updateHUD() {
    ui.yoyoCount.textContent = `${yoyosCollected} / ${TOTAL_YOYOS}`;
    ui.survivorCount.textContent = `${survivingKirbys} / ${TOTAL_SURVIVORS}`;
}

function update() {
    if (gameState !== 'PLAYING') return;

    player.update();

    // Yoyo Collision
    for (let i = 0; i < yoyos.length; i++) {
        let y = yoyos[i];
        if (!y.collected) {
            // AABB Collision with player
            if (player.x < y.x + y.width && player.x + player.width > y.x &&
                player.y < y.y + y.height && player.y + player.height > y.y) {

                y.collected = true;
                yoyosCollected++;
                updateHUD();

                if (yoyosCollected >= TOTAL_YOYOS) {
                    gameState = 'GAME_CLEAR';
                    ui.gameClearScreen.classList.add('active');
                    return;
                }
            }
        }
    }

    // AI Kirbys
    for (let i = 0; i < aiKirbys.length; i++) {
        if (!aiKirbys[i].dead) {
            aiKirbys[i].update();
        }
    }

    // Scary Kirby Update & Collisions
    if (scaryKirby) {
        scaryKirby.update();

        // Player Collision (Game Over)
        if (player.x < scaryKirby.x + scaryKirby.width && player.x + player.width > scaryKirby.x &&
            player.y < scaryKirby.y + scaryKirby.height && player.y + player.height > scaryKirby.y) {

            gameState = 'GAME_OVER';
            ui.gameOverScreen.classList.add('active');
            return;
        }

        // AI Kirby Collision (Elimination)
        for (let i = 0; i < aiKirbys.length; i++) {
            let k = aiKirbys[i];
            if (!k.dead) {
                if (k.x < scaryKirby.x + scaryKirby.width && k.x + k.width > scaryKirby.x &&
                    k.y < scaryKirby.y + scaryKirby.height && k.y + k.height > scaryKirby.y) {

                    k.dead = true;
                    survivingKirbys--;
                    updateHUD();
                }
            }
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameState === 'PLAYING') {
        // Floor
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Map
        gameMap.draw(ctx);

        // Draw Yoyos
        for (let y of yoyos) y.draw(ctx);

        // Draw AI Kirbys
        for (let k of aiKirbys) {
            if (!k.dead) k.draw(ctx);
        }

        // Draw Scary Kirby
        if (scaryKirby) scaryKirby.draw(ctx);

        // Draw Player
        player.draw(ctx);

        // Update Fog Effect Center
        let screenX = player.x + player.width / 2 - camera.x;
        let screenY = player.y + player.height / 2 - camera.y;
        fogDiv.style.background = `radial-gradient(circle at ${screenX}px ${screenY}px, transparent 50px, rgba(0,0,0,0.85) 300px, rgba(0,0,0,0.95) 100%)`;
    }
}

function loop() {
    update();
    draw();
    animationId = requestAnimationFrame(loop);
}

// Events
ui.startBtn.addEventListener('click', () => {
    init();
});

ui.restartBtn.addEventListener('click', () => {
    init();
});

// Start loop but keep it on START menu
loop();
