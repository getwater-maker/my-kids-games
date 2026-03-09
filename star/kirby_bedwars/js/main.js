// js/main.js

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// --- UI Elements ---
const ui = {
    startScreen: document.getElementById('start-screen'),
    gameOverScreen: document.getElementById('game-over-screen'),
    gameClearScreen: document.getElementById('game-clear-screen'),
    shopModal: document.getElementById('shop-modal'),
    playerHp: document.getElementById('player-hp'),
    playerBed: document.getElementById('player-bed-status'),
    enemyHp: document.getElementById('enemy-hp'),
    enemyBed: document.getElementById('enemy-bed-status'),
    resIron: document.getElementById('res-iron'),
    resGold: document.getElementById('res-gold'),
    resEmerald: document.getElementById('res-emerald'),
    announcement: document.getElementById('announcement'),
    startBtn: document.getElementById('start-btn'),
    restartBtn: document.getElementById('restart-btn'),
    closeShopBtn: document.getElementById('close-shop-btn'),
    buyBtns: document.querySelectorAll('.buy-btn')
};

// --- Game State ---
let gameState = 'START';
let animationId;
const FPS = 60;
let lastTime = 0;

// Camera
let camera = { x: 0, y: 0, width: canvas.width, height: canvas.height };

// Input
const keys = { w: false, a: false, s: false, d: false, b: false, Space: false };
const mouse = { x: 0, y: 0, leftDown: false, rightDown: false };

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = true;
    if (e.code === 'Space') keys.Space = true;

    // Toggle Shop
    if (e.key.toLowerCase() === 'b' && gameState === 'PLAYING') {
        toggleShop();
    }
});
window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = false;
    if (e.code === 'Space') keys.Space = false;
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left + camera.x;
    mouse.y = e.clientY - rect.top + camera.y;
});
canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) mouse.leftDown = true;
    if (e.button === 2) mouse.rightDown = true;
});
canvas.addEventListener('mouseup', (e) => {
    if (e.button === 0) mouse.leftDown = false;
    if (e.button === 2) mouse.rightDown = false;
});

// --- Map System (Tile-based) ---
const TILE_SIZE = 40;
const MAP_COLS = 100; // 4000px
const MAP_ROWS = 30;  // 1200px
let mapGrid = [];

const BLOCK_TYPES = {
    EMPTY: 0,
    BEDROCK: 1, // 파괴 불가 (기본 섬)
    WOOL_BLUE: 2, // 파랑팀 양털
    WOOL_RED: 3,  // 빨강팀 양털
    BED_BLUE_HEAD: 4,
    BED_BLUE_FOOT: 5,
    BED_RED_HEAD: 6,
    BED_RED_FOOT: 7
};

function initMap() {
    mapGrid = [];
    for (let y = 0; y < MAP_ROWS; y++) {
        mapGrid[y] = [];
        for (let x = 0; x < MAP_COLS; x++) {
            mapGrid[y][x] = BLOCK_TYPES.EMPTY;
        }
    }

    // 파랑팀 기지 (왼쪽)
    for (let y = 15; y < 18; y++) {
        for (let x = 5; x < 20; x++) {
            mapGrid[y][x] = BLOCK_TYPES.BEDROCK;
        }
    }
    // 파랑팀 침대
    mapGrid[14][16] = BLOCK_TYPES.BED_BLUE_HEAD;
    mapGrid[14][17] = BLOCK_TYPES.BED_BLUE_FOOT;

    // 중앙 섬
    for (let y = 15; y < 18; y++) {
        for (let x = 45; x < 55; x++) {
            mapGrid[y][x] = BLOCK_TYPES.BEDROCK;
        }
    }

    // 빨강팀 기지 (오른쪽)
    for (let y = 15; y < 18; y++) {
        for (let x = 80; x < 95; x++) {
            mapGrid[y][x] = BLOCK_TYPES.BEDROCK;
        }
    }
    // 빨강팀 침대
    mapGrid[14][82] = BLOCK_TYPES.BED_RED_FOOT;
    mapGrid[14][83] = BLOCK_TYPES.BED_RED_HEAD;
}

function drawMap(ctx) {
    for (let y = 0; y < MAP_ROWS; y++) {
        for (let x = 0; x < MAP_COLS; x++) {
            let type = mapGrid[y][x];
            if (type !== BLOCK_TYPES.EMPTY) {
                let px = x * TILE_SIZE - camera.x;
                let py = y * TILE_SIZE - camera.y;

                // Culling
                if (px + TILE_SIZE < 0 || px > camera.width || py + TILE_SIZE < 0 || py > camera.height) continue;

                if (type === BLOCK_TYPES.BEDROCK) {
                    ctx.fillStyle = '#546e7a'; // 회색 바위
                    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    ctx.strokeStyle = '#37474f';
                    ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
                } else if (type === BLOCK_TYPES.WOOL_BLUE) {
                    ctx.fillStyle = '#42a5f5'; // 파란 양털
                    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    ctx.strokeStyle = '#1e88e5';
                    ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
                } else if (type === BLOCK_TYPES.WOOL_RED) {
                    ctx.fillStyle = '#ef5350'; // 빨간 양털
                    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    ctx.strokeStyle = '#e53935';
                    ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
                } else if (type >= 4 && type <= 7) {
                    // Beds
                    ctx.fillStyle = (type === 4 || type === 5) ? '#1565c0' : '#c62828';
                    ctx.fillRect(px, py + 20, TILE_SIZE, 20); // 침대는 1/2 높이
                    if (type === 4 || type === 6) {
                        ctx.fillStyle = 'white'; // 베게
                        ctx.fillRect(px + 5, py + 10, 20, 10);
                    }
                }
            }
        }
    }
}

// 충돌 AABB 검사 (개체와 맵)
function checkMapCollision(x, y, w, h) {
    let leftTile = Math.floor(x / TILE_SIZE);
    let rightTile = Math.floor((x + w - 0.01) / TILE_SIZE);
    let topTile = Math.floor(y / TILE_SIZE);
    let bottomTile = Math.floor((y + h - 0.01) / TILE_SIZE);

    for (let r = topTile; r <= bottomTile; r++) {
        for (let c = leftTile; c <= rightTile; c++) {
            if (r >= 0 && r < MAP_ROWS && c >= 0 && c < MAP_COLS) {
                // 침대는 충돌 방해(막힘) 용도가 아님 (지나다닐 수 있음), 솔리드 블록만 충돌
                if (mapGrid[r][c] !== BLOCK_TYPES.EMPTY && mapGrid[r][c] < 4) {
                    return true;
                }
            }
        }
    }
    return false;
}

// --- Spawners & Items ---
class DropItem {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.w = 15;
        this.h = 15;
        this.type = type; // 'iron', 'gold', 'emerald'
        this.vy = 0;
        this.toRemove = false;

        if (type === 'iron') this.color = '#e0e0e0';
        else if (type === 'gold') this.color = '#ffeb3b';
        else if (type === 'emerald') this.color = '#4caf50';
    }

    update() {
        this.vy += 0.5;
        if (this.vy > 8) this.vy = 8;

        if (!checkMapCollision(this.x, this.y + this.vy, this.w, this.h)) {
            this.y += this.vy;
        } else {
            this.vy = 0;
            this.y = Math.round(this.y);
        }

        // Player pickup
        if (player.x < this.x + this.w && player.x + player.w > this.x &&
            player.y < this.y + this.h && player.y + player.h > this.y) {
            player[this.type]++;
            this.toRemove = true;
        }
    }

    draw(ctx) {
        let px = this.x - camera.x;
        let py = this.y - camera.y;
        if (px + this.w < 0 || px > camera.width || py + this.h < 0 || py > camera.height) return;

        ctx.fillStyle = this.color;
        ctx.fillRect(px, py, this.w, this.h);
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.strokeRect(px, py, this.w, this.h);
    }
}

class Spawner {
    constructor(x, y, ironRate, goldRate, emeraldRate) {
        this.x = x;
        this.y = y;
        this.ironRate = ironRate;
        this.goldRate = goldRate;
        this.emeraldRate = emeraldRate;
        this.ironTimer = 0;
        this.goldTimer = 0;
        this.emeraldTimer = 0;
    }

    update() {
        if (this.ironRate > 0) {
            this.ironTimer++;
            if (this.ironTimer >= this.ironRate) {
                dropItems.push(new DropItem(this.x, this.y, 'iron'));
                this.ironTimer = 0;
            }
        }
        if (this.goldRate > 0) {
            this.goldTimer++;
            if (this.goldTimer >= this.goldRate) {
                dropItems.push(new DropItem(this.x, this.y, 'gold'));
                this.goldTimer = 0;
            }
        }
        if (this.emeraldRate > 0) {
            this.emeraldTimer++;
            if (this.emeraldTimer >= this.emeraldRate) {
                dropItems.push(new DropItem(this.x, this.y, 'emerald'));
                this.emeraldTimer = 0;
            }
        }
    }
}

// --- Player Logic ---
class Player {
    constructor() {
        this.reset();
        this.color = '#42a5f5'; // 파란팀
        this.team = 'blue';
    }

    reset() {
        this.w = 32;
        this.h = 32;
        // 파랑팀 기지 위에서 스폰
        this.x = 10 * TILE_SIZE;
        this.y = 10 * TILE_SIZE;
        this.vx = 0;
        this.vy = 0;
        this.speed = 4;
        this.jumpPower = -10;
        this.gravity = 0.5;
        this.isGrounded = false;
        this.jumpDebounce = false; // Add jump debounce flag

        // Stats
        this.hp = 100;
        this.maxHp = 100;
        this.woolCount = 0;

        // Resources
        this.iron = 0;
        this.gold = 0;
        this.emerald = 0;

        // Combat
        this.swordLevel = 0; // 0: 목검, 1: 돌검, 2: 철검, 3: 다검, 4: 레이지 블레이드
        this.attackCooldown = 0;
        this.facingRight = true;

        this.kills = 0;
        this.kit = 'Barbarian';
    }

    update() {
        if (this.hp <= 0) {
            this.handleDeath();
            return;
        }

        // 1. 가로 이동 결정
        if (this === player) {
            if (keys.a) { this.vx = -this.speed; this.facingRight = false; }
            else if (keys.d) { this.vx = this.speed; this.facingRight = true; }
            else { this.vx = 0; }
        } else {
            this.aiLogic();
        }

        // 2. 가로 충돌 해결 (벽에 비빌 때 튀는 현상 방지)
        // 캐릭터의 높이를 살짝 줄여서(상하 5px씩) 발밑/머리 끝 타일에 걸리지 않게 함
        if (!checkMapCollision(this.x + this.vx, this.y + 5, this.w, this.h - 10)) {
            this.x += this.vx;
        } else {
            // 벽에 부딪힘: 좌표 정밀 스냅
            if (this.vx > 0) this.x = Math.floor((this.x + this.w) / TILE_SIZE) * TILE_SIZE - this.w;
            else if (this.vx < 0) this.x = Math.ceil(this.x / TILE_SIZE) * TILE_SIZE;
            this.vx = 0;
        }

        // Vertical Movement & Gravity
        this.vy += this.gravity;
        if (this.vy > 10) this.vy = 10;

        // 4. 세로 충돌 해결 (발밑 판정)
        // 충돌 여부를 먼저 확인
        let verticalCollision = checkMapCollision(this.x + 8, this.y + this.vy, this.w - 16, this.h);

        if (verticalCollision) {
            if (this.vy > 0) { // 하강 중 충돌 (바닥)
                this.isGrounded = true;
                this.y = Math.floor((this.y + this.h + 0.1) / TILE_SIZE) * TILE_SIZE - this.h;
            } else if (this.vy < 0) { // 상승 중 충돌 (천장)
                this.y = Math.ceil(this.y / TILE_SIZE) * TILE_SIZE;
            }
            this.vy = 0;
        } else {
            this.y += this.vy;
            // 바닥에서 아주 미세하게 떨어지는 경우(0.5px 미만)는 여전히 grounded로 간주하여 통통 튀는 걸 방지
            if (!checkMapCollision(this.x + 8, this.y + 1, this.w - 16, this.h)) {
                this.isGrounded = false;
            }
        }

        // 5. 점프 및 호버링 로직 (플레이어 전용)
        if (this === player) {
            let jumpKey = keys.Space || keys.w;
            if (jumpKey) {
                if (this.isGrounded && !this.jumpDebounce) {
                    // 땅에서 첫 점프
                    this.vy = this.jumpPower;
                    this.isGrounded = false;
                    this.jumpDebounce = true;
                } else if (!this.isGrounded) {
                    // 공중 무한 호버링: 점프 힘보다 크지 않을 때만 (점프 힘을 방해하지 않게)
                    if (this.vy > -3.5) this.vy = -3.5;
                }
            } else {
                this.jumpDebounce = false;
            }
        }

        // 6. 기타 액션 (쿨타임, 공격, 설치 등)
        if (this.attackCooldown > 0) this.attackCooldown--;

        if (this === player) {
            if (mouse.leftDown && this.attackCooldown <= 0) this.attack();
            if (mouse.rightDown) this.buildBlock();

            // 카메라 업데이트
            camera.x = this.x + this.w / 2 - canvas.width / 2;
            camera.y = this.y + this.h / 2 - canvas.height / 2;
        }
    }

    attack() {
        this.attackCooldown = 20;

        // 블록 파괴 로직 (클릭한 곳)
        let tx = Math.floor(mouse.x / TILE_SIZE);
        let ty = Math.floor(mouse.y / TILE_SIZE);

        if (tx >= 0 && tx < MAP_COLS && ty >= 0 && ty < MAP_ROWS) {
            let dist = Math.hypot((tx * TILE_SIZE + 20) - (this.x + 16), (ty * TILE_SIZE + 20) - (this.y + 16));
            if (dist < 100) {
                let block = mapGrid[ty][tx];

                // 적 침대 파괴
                if ((block === BLOCK_TYPES.BED_RED_HEAD || block === BLOCK_TYPES.BED_RED_FOOT)) {
                    mapGrid[ty][tx] = BLOCK_TYPES.EMPTY;
                    // 침대의 다른 파츠도 파괴
                    if (mapGrid[ty][tx - 1] === BLOCK_TYPES.BED_RED_FOOT) mapGrid[ty][tx - 1] = BLOCK_TYPES.EMPTY;
                    if (mapGrid[ty][tx + 1] === BLOCK_TYPES.BED_RED_HEAD) mapGrid[ty][tx + 1] = BLOCK_TYPES.EMPTY;
                    redBed = false;
                    announce("🔴 적 팀의 침대가 파괴되었습니다!", 4000);
                }

                // 양털 블록 파괴
                else if (block === BLOCK_TYPES.WOOL_BLUE || block === BLOCK_TYPES.WOOL_RED) {
                    mapGrid[ty][tx] = BLOCK_TYPES.EMPTY;
                }
            }
        }

        // Entity 히트판정 (마우스 클릭 위치 방향 검사)
        let hitBoxX = this.facingRight ? this.x + this.w : this.x - 30;
        let hitBoxY = this.y - 10;
        let hitBoxW = 30;
        let hitBoxH = this.h + 20;

        if (enemy && hitBoxX < enemy.x + enemy.w && hitBoxX + hitBoxW > enemy.x &&
            hitBoxY < enemy.y + enemy.h && hitBoxY + hitBoxH > enemy.y) {

            let damage = 15 + (this.swordLevel * 5);
            // Rage Blade Special Damage (75)
            if (this.swordLevel >= 4) damage = 75;

            enemy.hp -= damage;
            enemy.vy = -5;
            enemy.x += this.facingRight ? 20 : -20; // 넉백
        }
    }

    buildBlock() {
        if (this.woolCount <= 0) return;

        let tx = Math.floor(mouse.x / TILE_SIZE);
        let ty = Math.floor(mouse.y / TILE_SIZE);

        if (tx >= 0 && tx < MAP_COLS && ty >= 0 && ty < MAP_ROWS) {
            // 빈 공간이고, 플레이어 위치와 너무 멀지 않으며, 플레이어 몸체와 겹치지 않을 때
            let dist = Math.hypot((tx * TILE_SIZE + 20) - (this.x + 16), (ty * TILE_SIZE + 20) - (this.y + 16));

            // 몸 박스 겹침 확인
            let boxX = tx * TILE_SIZE;
            let boxY = ty * TILE_SIZE;
            let overlapsPlayer = (boxX < this.x + this.w && boxX + TILE_SIZE > this.x &&
                boxY < this.y + this.h && boxY + TILE_SIZE > this.y);

            if (mapGrid[ty][tx] === BLOCK_TYPES.EMPTY && dist < 150 && !overlapsPlayer) {
                mapGrid[ty][tx] = BLOCK_TYPES.WOOL_BLUE;
                this.woolCount--;
                mouse.rightDown = false; // 한 번 클릭에 한 블록
            }
        }
    }

    handleDeath() {
        if (blueBed) {
            // Respawn
            announce("당신이 사망했습니다! 3초 후 부활합니다.", 3000);
            this.reset();
        } else {
            // Game Over
            gameState = 'GAME_OVER';
            ui.gameOverScreen.classList.add('active');
        }
    }

    draw(ctx) {
        let px = this.x - camera.x;
        let py = this.y - camera.y;

        ctx.fillStyle = this.color;
        ctx.beginPath();
        // 커비 모양 (사각형 베이스 둥글게)
        ctx.roundRect(px, py, this.w, this.h, 10);
        ctx.fill();

        // 눈
        ctx.fillStyle = 'black';
        let eyeX = this.facingRight ? px + 20 : px + 8;
        ctx.fillRect(eyeX, py + 8, 4, 10);
        ctx.fillRect(eyeX - 6, py + 8, 4, 10);

        // 검
        if (this.attackCooldown > 10) {
            // Sword colors for different levels
            let swordColors = ['#8d6e63', '#9e9e9e', '#cfd8dc', '#00bcd4', '#7e57c2'];
            ctx.fillStyle = swordColors[this.swordLevel] || '#9e9e9e';

            if (this.facingRight) {
                ctx.fillRect(px + this.w, py + 10, 20, 5);
            } else {
                ctx.fillRect(px - 20, py + 10, 20, 5);
            }
        }
    }
}

class EnemyPlayer extends Player {
    constructor() {
        super();
        this.color = '#ef5350'; // 빨간팀
        this.team = 'red';
        this.state = 'FARM'; // FARM, BRIDGE_CENTER, ATTACK_PLAYER
        this.stateTimer = 0;
    }

    reset() {
        super.reset();
        this.x = 88 * TILE_SIZE; // 빨강팀 기지
        this.y = 10 * TILE_SIZE;
        this.woolCount = 999; // AI는 무한 블록 (단순화)
    }

    update() {
        super.update(); // 부모 클래스의 통합된 물리 엔진 사용
    }

    aiLogic() {
        // AI 타겟 정하기: 1. 플레이어 공격, 2. 파랑 침대 공격, 3. 센터로 이동 (단순화 위해 무조건 왼쪽 플레이어 진영으로 전진)
        this.vx = -this.speed * 0.6; // 천천히 왼쪽으로 이동
        this.facingRight = false;

        // 앞에 낭떠러지가 있으면 블록 설치
        let frontTx = Math.floor((this.x - TILE_SIZE) / TILE_SIZE);
        let underTy = Math.floor((this.y + this.h + 5) / TILE_SIZE);

        if (frontTx >= 0 && underTy < MAP_ROWS && mapGrid[underTy][frontTx] === BLOCK_TYPES.EMPTY) {
            // 다리 짓기 (무한 양털)
            if (Math.random() < 0.1) { // 딜레이를 살짝 줘서 사람처럼 보이게
                mapGrid[underTy][frontTx] = BLOCK_TYPES.WOOL_RED;
            }
            // 떨어지지 않게 멈춤
            this.vx = 0;
        }

        // 앞에 벽이 있으면 점프
        let forwardTx = Math.floor((this.x - 5) / TILE_SIZE);
        let playerTy = Math.floor(this.y / TILE_SIZE);
        if (forwardTx >= 0 && mapGrid[playerTy][forwardTx] !== BLOCK_TYPES.EMPTY) {
            if (this.isGrounded) {
                this.vy = this.jumpPower;
                this.isGrounded = false;
            }
        }

        // 플레이어가 가까우면 공격
        let distToPlayer = Math.hypot(this.x - player.x, this.y - player.y);
        if (distToPlayer < 70 && this.attackCooldown <= 0) {
            this.vx = 0; // 멈춰서 공격
            this.attack();
        }

        // 파랑 침대가 가까우면 공격
        if (blueBed) {
            let distToBed = Math.hypot(this.x - (16 * TILE_SIZE), this.y - (14 * TILE_SIZE));
            if (distToBed < 80 && this.attackCooldown <= 0) {
                this.vx = 0;
                this.attack();
            }
        }
    }

    attack() {
        this.attackCooldown = 30; // 0.5초 쿨타임

        // AI 공격 사거리
        let hitBoxX = this.facingRight ? this.x + this.w : this.x - 30;
        let hitBoxY = this.y - 10;
        let hitBoxW = 30;
        let hitBoxH = this.h + 20;

        // 타격 판정 (플레이어)
        if (hitBoxX < player.x + player.w && hitBoxX + hitBoxW > player.x &&
            hitBoxY < player.y + player.h && hitBoxY + hitBoxH > player.y) {
            // Player 피격
            player.hp -= 15 + (this.swordLevel * 5);
            // 넉백 (오른쪽으로 날리기)
            player.vy = -5;
            player.x -= 20; // 왼쪽으로 넉백 (Red는 무조건 왼쪽을 보므로)
            announce("당신이 공격받았습니다!", 1000);
        }

        // 타격 판정 (파랑 침대)
        // 대략 16~17번 타일 X 파랑 침대
        let headX = 16 * TILE_SIZE;
        let headY = 14 * TILE_SIZE;
        if (blueBed && hitBoxX < headX + TILE_SIZE * 2 && hitBoxX + hitBoxW > headX &&
            hitBoxY < headY + TILE_SIZE && hitBoxY + hitBoxH > headY) {

            mapGrid[14][16] = BLOCK_TYPES.EMPTY;
            mapGrid[14][17] = BLOCK_TYPES.EMPTY;
            blueBed = false;
            announce("🔵 우리 팀의 침대가 파괴되었습니다!", 4000);
        }

        // 타격 판정 (파랑 양털 부수기)
        let tx = Math.floor((this.facingRight ? this.x + this.w + 10 : this.x - 10) / TILE_SIZE);
        let ty = Math.floor(this.y / TILE_SIZE);
        if (tx >= 0 && tx < MAP_COLS && mapGrid[ty][tx] === BLOCK_TYPES.WOOL_BLUE) {
            mapGrid[ty][tx] = BLOCK_TYPES.EMPTY;
        }
    }

    handleDeath() {
        // Barbarian Kill logic
        if (player.kit === 'Barbarian') {
            player.kills++;
            // Upgrade Sword based on kills
            if (player.kills >= 5) player.swordLevel = 4; // Rage Blade
            else if (player.kills >= 3) player.swordLevel = 3; // Diamond Blade
            else if (player.kills >= 2) player.swordLevel = 2; // Iron Blade
            else if (player.kills >= 1) player.swordLevel = 1; // Stone Blade

            announce(`[Barbarian] 킬 보너스! (총 ${player.kills}킬)`);
        }

        if (redBed) {
            this.reset();
        } else {
            // 적 사망 (게임 클리어)
            gameState = 'GAME_CLEAR';
            ui.gameClearScreen.classList.add('active');
        }
    }
}

// Global Entities
let player;
let enemy;
let blueBed = true;
let redBed = true;
let dropItems = [];
let spawners = [];

// UI Helpers
function announce(msg, duration = 2000) {
    ui.announcement.textContent = msg;
    ui.announcement.style.opacity = 1;
    setTimeout(() => { ui.announcement.style.opacity = 0; }, duration);
}

function toggleShop() {
    if (ui.shopModal.classList.contains('show')) {
        ui.shopModal.classList.remove('show');
    } else {
        // 상점은 기지 중앙 근처에서만 열리도록 (간단히 X거리 체크)
        if (Math.abs(player.x - 12 * TILE_SIZE) < 300) {
            ui.shopModal.classList.add('show');
        } else {
            announce("기지 상점 npc 근처에서만 열 수 있습니다.");
        }
    }
}

function updateHUD() {
    ui.playerHp.textContent = `HP: ${player.hp} | Kills: ${player.kills} (Kit: ${player.kit})`;
    ui.resIron.textContent = player.iron;
    ui.resGold.textContent = player.gold;
    ui.resEmerald.textContent = player.emerald;

    ui.playerBed.textContent = blueBed ? "🛏️ 침대: 생존" : "❌ 침대 파괴됨";
    ui.enemyBed.textContent = redBed ? "🛏️ 침대: 생존" : "❌ 침대 파괴됨";
}

// Main Engine
function init() {
    initMap();
    player = new Player();
    enemy = new EnemyPlayer();

    blueBed = true;
    redBed = true;
    dropItems = [];
    spawners = [];

    // Spawners: Rate is in frames (60 = 1 sec)
    // Blue Home: Iron every 1.5s, Gold every 8s
    spawners.push(new Spawner(10 * TILE_SIZE, 14 * TILE_SIZE, 90, 480, 0));
    // Red Home: Iron every 1.5s, Gold every 8s
    spawners.push(new Spawner(89 * TILE_SIZE, 14 * TILE_SIZE, 90, 480, 0));
    // Center: Emerald every 15s
    spawners.push(new Spawner(50 * TILE_SIZE, 14 * TILE_SIZE, 0, 0, 900));

    gameState = 'PLAYING';
    ui.startScreen.classList.remove('active');
    ui.gameOverScreen.classList.remove('active');
    ui.gameClearScreen.classList.remove('active');
    ui.shopModal.classList.remove('show');
}

function gameLoop(timestamp) {
    if (timestamp - lastTime >= 1000 / FPS) {
        lastTime = timestamp;

        if (gameState === 'PLAYING' && !ui.shopModal.classList.contains('show')) {
            update();
        }
        draw();
    }
    animationId = requestAnimationFrame(gameLoop);
}

function update() {
    if (!player || !enemy) return;

    player.update();
    enemy.update();

    for (let s of spawners) s.update();

    for (let i = dropItems.length - 1; i >= 0; i--) {
        dropItems[i].update();
        if (dropItems[i].toRemove) {
            dropItems.splice(i, 1);
        }
    }

    // UI 반영
    updateHUD();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Sky
    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (gameState === 'PLAYING' || ui.shopModal.classList.contains('show')) {
        drawMap(ctx);

        for (let item of dropItems) item.draw(ctx);

        if (enemy) enemy.draw(ctx);
        player.draw(ctx);

        // 마우스 커서 타겟팅 표시 (블록 설치/파괴 용)
        if (!ui.shopModal.classList.contains('show')) {
            let tx = Math.floor(mouse.x / TILE_SIZE) * TILE_SIZE - camera.x;
            let ty = Math.floor(mouse.y / TILE_SIZE) * TILE_SIZE - camera.y;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.strokeRect(tx, ty, TILE_SIZE, TILE_SIZE);
        }
    }
}

// Events
ui.startBtn.addEventListener('click', init);
ui.restartBtn.addEventListener('click', init);
ui.closeShopBtn.addEventListener('click', () => ui.shopModal.classList.remove('show'));

// Shop Logic
ui.buyBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        let item = e.target.parentElement;
        let type = item.getAttribute('data-type');
        let costType = item.getAttribute('data-cost-type'); // iron, gold, emerald
        let costVal = parseInt(item.getAttribute('data-cost-val'));

        if (player[costType] >= costVal) {
            player[costType] -= costVal; // 결제
            // 아이템 획득 로직
            if (type === 'wool') {
                player.woolCount += 16;
                announce("양털을 구매했습니다!");
            } else if (type.startsWith('sword')) {
                player.swordLevel++;
                announce("검을 업그레이드했습니다!");
            } else if (type === 'armor') {
                player.maxHp += 50;
                player.hp = player.maxHp;
                announce("체력과 방어력이 증가했습니다!");
            }
            updateHUD();
        } else {
            announce(`자원이 부족합니다! (${costType} 필요)`);
        }
    });
});

// Start loop
requestAnimationFrame(gameLoop);
