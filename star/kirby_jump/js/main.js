// js/main.js

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// --- UI Elements ---
const screens = {
    start: document.getElementById('start-screen'),
    gameOver: document.getElementById('game-over-screen'),
    stageClear: document.getElementById('stage-clear-screen')
};
const ui = {
    stageDisplay: document.getElementById('stage-display'),
    scoreDisplay: document.getElementById('score-display'),
    gameOverReason: document.getElementById('game-over-reason')
};
const btns = {
    start: document.getElementById('start-btn'),
    restart: document.getElementById('restart-btn'),
    nextStage: document.getElementById('next-stage-btn')
};

// --- Game State ---
let gameState = 'START'; // START, PLAYING, GAME_OVER, STAGE_CLEAR
let currentStage = 1;
let score = 0;
let cameraX = 0;
let animationId;

// --- Input Handling ---
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    Space: false
};

window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft') keys.ArrowLeft = true;
    if (e.code === 'ArrowRight') keys.ArrowRight = true;
    if (e.code === 'ArrowUp') {
        keys.ArrowUp = true;
        if (gameState === 'PLAYING') player.jump();
    }
    if (e.code === 'Space') {
        keys.Space = true;
        if (gameState === 'PLAYING') player.jump();
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft') keys.ArrowLeft = false;
    if (e.code === 'ArrowRight') keys.ArrowRight = false;
    if (e.code === 'ArrowUp') keys.ArrowUp = false;
    if (e.code === 'Space') keys.Space = false;
});

// --- Constants & Config ---
const GRAVITY = 0.5;
const MAX_FALL_SPEED = 10;
const HOVER_GRAVITY = 0.2; // 호버링 시 떨어지는 속도 감소
const CELL_SIZE = 40; // 블록 하나의 크기

// --- Classes ---

class Level {
    constructor() {
        this.platforms = [];
        this.obstacles = [];
        this.goal = null;
        this.width = 0;
        this.boss = null;
    }

    generate(stage) {
        this.platforms = [];
        this.obstacles = [];
        this.goal = null;

        // 스테이지에 따라 맵 길이와 난이도 증가
        let mapLength = 50 + (stage * 10);
        this.width = mapLength * CELL_SIZE;

        // 시작 지점 발판 (안전 구역)
        this.platforms.push({ x: 0, y: 400, w: 400, h: 200 });

        let currentX = 400;

        // 랜덤 플랫폼 생성
        while (currentX < this.width - 800) {
            // 발판 사이의 간격 (구멍 크기)
            let gap = Math.random() * 150 + 50 + (stage * 10); // 스테이지가 높을수록 구멍 범위 증가
            if (gap > 350) gap = 350; // 최대 구멍 크기 제한

            currentX += gap;

            // 발판 크기
            let platformWidth = Math.random() * 200 + 100;

            // 발판 높이 (Y축 제한: 200 ~ 500 사이)
            let platformY = Math.random() * 300 + 200;

            this.platforms.push({
                x: currentX,
                y: platformY,
                w: platformWidth,
                h: canvas.height - platformY + 100 // 바닥까지 닿도록 보이게
            });

            // 기물(빨간 가시) 생성 - 2단계부터 일정 확률로 생성
            if (stage >= 2 && Math.random() < (stage * 0.05 + 0.1) && platformWidth > 150) {
                this.obstacles.push({
                    x: currentX + platformWidth / 2 - 20, // 발판 중앙 쯤
                    y: platformY - 40,                    // 발판 위
                    w: 40,
                    h: 40
                });
            }

            currentX += platformWidth;
        }

        // 도착 지점 (골인 지점) 발판
        this.platforms.push({
            x: this.width - 600,
            y: 300,
            w: 600,
            h: 300
        });

        // 골인 문
        this.goal = {
            x: this.width - 200,
            y: 300 - 80, // 발판 위에 위치
            w: 60,
            h: 80
        };

        // 보스 생성 (5단계 이상)
        if (stage >= 5) {
            this.boss = new Boss(stage);
        }
    }

    draw(ctx) {
        // Draw Obstacles
        ctx.fillStyle = '#d32f2f'; // 빨간 가시
        for (let obs of this.obstacles) {
            if (obs.x + obs.w > cameraX && obs.x < cameraX + canvas.width) {
                ctx.beginPath();
                ctx.moveTo(obs.x - cameraX + obs.w / 2, obs.y);
                ctx.lineTo(obs.x - cameraX + obs.w, obs.y + obs.h);
                ctx.lineTo(obs.x - cameraX, obs.y + obs.h);
                ctx.fill();
            }
        }

        // Draw Platforms
        ctx.fillStyle = '#8bc34a'; // 풀색

        for (let p of this.platforms) {
            // 화면에 보이는 것만 그리기 (최적화)
            if (p.x + p.w > cameraX && p.x < cameraX + canvas.width) {
                // 풀 부분
                ctx.fillStyle = '#8bc34a';
                ctx.fillRect(p.x - cameraX, p.y, p.w, p.h);
                // 흙 부분
                ctx.fillStyle = '#795548';
                ctx.fillRect(p.x - cameraX, p.y + 20, p.w, p.h - 20);
            }
        }

        // Draw Goal Door
        if (this.goal && this.goal.x + this.goal.w > cameraX && this.goal.x < cameraX + canvas.width) {
            ctx.fillStyle = '#ffd54f'; // 문 프레임
            ctx.fillRect(this.goal.x - cameraX, this.goal.y, this.goal.w, this.goal.h);

            ctx.fillStyle = '#000000'; // 문 안쪽
            ctx.fillRect(this.goal.x - cameraX + 5, this.goal.y + 5, this.goal.w - 10, this.goal.h - 5);

            // 별 무늬 (간단히)
            ctx.fillStyle = 'yellow';
            ctx.beginPath();
            ctx.arc(this.goal.x - cameraX + this.goal.w / 2, this.goal.y + this.goal.h / 2, 10, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

class Boss {
    constructor(stage) {
        this.x = -150; // 플레이어 뒤에서 시작
        this.y = canvas.height / 2;
        this.width = 120; // 디디디 대왕
        this.height = 120;
        // 스테이지가 오를수록 속도 증가
        let baseSpeed = 2.5;
        this.speed = baseSpeed + (stage - 5) * 0.4;

        if (stage >= 1000) {
            this.speed = player.speed * 1.5; // 베리 베리 크레이지 모드 (플레이어보다 빠름!)
        } else if (this.speed > player.speed - 0.5) {
            this.speed = player.speed - 0.5; // 너무 빠르면 안되게 제한
        }
    }

    update() {
        this.x += this.speed;

        // Y축은 약간 떠다니거나 플레이어 쪽을 향하게 (간단히 유지)
        // 화면 중앙에 떠있도록
        this.y = (Math.sin(Date.now() / 300) * 50) + canvas.height / 2 - 50;
    }

    draw(ctx) {
        // 화면에 보일 때만 그림
        if (this.x + this.width > cameraX && this.x < cameraX + canvas.width) {
            let cx = this.x - cameraX;
            let cy = this.y;

            // 몸통 (버건디 코트)
            ctx.fillStyle = '#b71c1c';
            ctx.beginPath();
            ctx.arc(cx + this.width / 2, cy + this.height / 2, this.width / 2, 0, Math.PI * 2);
            ctx.fill();

            // 뱃살
            ctx.fillStyle = '#ffecb3';
            ctx.beginPath();
            ctx.arc(cx + this.width / 2, cy + this.height / 2 + 10, this.width / 2 - 15, 0, Math.PI * 2);
            ctx.fill();

            // 파란 모자/펭귄 머리
            ctx.fillStyle = '#1e88e5';
            ctx.beginPath();
            ctx.arc(cx + this.width / 2, cy + this.height / 2 - 20, this.width / 2 - 20, Math.PI, Math.PI * 2);
            ctx.fill();

            // 모자 흰 폼폼
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(cx + this.width / 2, cy - 5, 15, 0, Math.PI * 2);
            ctx.fill();

            // 눈 (화난 표정)
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(cx + this.width / 2 + 15, cy + this.height / 2 - 20, 10, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'black'; // 눈동자
            ctx.beginPath();
            ctx.arc(cx + this.width / 2 + 18, cy + this.height / 2 - 20, 4, 0, Math.PI * 2);
            ctx.fill();

            // 눈썹 (화남)
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(cx + this.width / 2 + 5, cy + this.height / 2 - 30);
            ctx.lineTo(cx + this.width / 2 + 25, cy + this.height / 2 - 25);
            ctx.stroke();

            // 부리 (입)
            ctx.fillStyle = '#ffb300';
            ctx.beginPath();
            ctx.ellipse(cx + this.width / 2 + 25, cy + this.height / 2, 20, 10, 0, 0, Math.PI * 2);
            ctx.fill();

            // 망치 (해머) 자루
            ctx.fillStyle = '#8d6e63';
            ctx.fillRect(cx + this.width / 2, cy + this.height / 2 - 20, 70, 15);

            // 망치 머리
            ctx.fillStyle = '#5d4037';
            ctx.fillRect(cx + this.width / 2 + 50, cy + this.height / 2 - 40, 40, 55);

            // 망치 별 표식
            ctx.fillStyle = 'yellow';
            ctx.beginPath();
            ctx.arc(cx + this.width / 2 + 70, cy + this.height / 2 - 12, 10, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

class Player {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = 100;
        this.y = 300;
        this.width = 40;
        this.height = 40;
        this.vx = 0;
        this.vy = 0;
        this.speed = 5;
        this.jumpPower = -12;
        this.hoverPower = -8;
        this.isGrounded = false;
        this.isHovering = false;
        this.color = '#ff80ab'; // 커비 핑크
    }

    update() {
        // Horizontal Movement
        if (keys.ArrowLeft) {
            this.vx = -this.speed;
        } else if (keys.ArrowRight) {
            this.vx = this.speed;
        } else {
            this.vx = 0;
        }

        this.x += this.vx;

        // 화면 왼쪽 밖으로 나가지 못하게
        if (this.x < cameraX) {
            this.x = cameraX;
        }

        // Vertical Movement & Gravity
        // Infinite Hovering check
        let jumpKey = keys.ArrowUp || keys.Space;
        this.isHovering = !this.isGrounded && jumpKey;

        if (this.isHovering) {
            // Constant upward force if falling or rising slowly
            if (this.vy > -4) this.vy = -4;
        } else {
            this.vy += GRAVITY;
        }

        if (this.vy > MAX_FALL_SPEED) {
            this.vy = MAX_FALL_SPEED;
        }

        this.y += this.vy;

        // Platform collision
        this.isGrounded = false;

        for (let p of level.platforms) {
            // AABB(Axis-Aligned Bounding Box) Collision
            if (this.x < p.x + p.w &&
                this.x + this.width > p.x &&
                this.y < p.y + p.h &&
                this.y + this.height > p.y) {

                // Falling down onto platform
                if (this.vy > 0 && this.y + this.height - this.vy <= p.y + 10) {
                    this.y = p.y - this.height;
                    this.vy = 0;
                    this.isGrounded = true;
                }
                // Hitting head on bottom of platform
                else if (this.vy < 0 && this.y - this.vy >= p.y + p.h - 10) {
                    this.y = p.y + p.h;
                    this.vy = 0;
                }
                // Side collisions
                else {
                    // Moving Right
                    if (this.vx > 0) {
                        this.x = p.x - this.width;
                    }
                    // Moving Left
                    else if (this.vx < 0) {
                        this.x = p.x + p.w;
                    }
                }
            }
        }

        // Camera follow
        if (this.x > cameraX + canvas.width / 2) {
            cameraX = this.x - canvas.width / 2;
        }
    }

    jump() {
        if (this.isGrounded) {
            // Normal Jump
            this.vy = this.jumpPower;
            this.isGrounded = false;
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        // Draw relative to camera
        ctx.beginPath();
        ctx.arc(this.x - cameraX + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();

        // Eye
        ctx.fillStyle = 'black';
        ctx.fillRect(this.x - cameraX + this.width / 2 + 5, this.y + 10, 4, 10);

        // Blush
        ctx.fillStyle = '#ff4081';
        ctx.beginPath();
        ctx.arc(this.x - cameraX + this.width / 2 + 12, this.y + 22, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

// --- Initialization ---
const player = new Player();
const level = new Level();

function getStageSubtitle(stage) {
    if (stage === 1) return "ez";
    if (stage === 2) return "좀 ez";
    if (stage === 3) return "음......";
    if (stage === 4) return "오우";
    if (stage === 5) return "오우 노!";
    if (stage >= 1000) return "베리 베리 슈퍼 베리 베리 크레이지 모드";
    return "점점 어려워짐...";
}

function initGame(stage) {
    currentStage = stage;
    score = 0;
    cameraX = 0;
    player.reset();

    ui.stageDisplay.textContent = `Stage ${currentStage} - ${getStageSubtitle(currentStage)}`;
    // ui.scoreDisplay.textContent = `점수: ${score}`;

    level.generate(currentStage);

    gameState = 'PLAYING';
    hideAllScreens();
}

// --- Main Game Loop ---
function update() {
    if (gameState !== 'PLAYING') return;

    player.update();

    // Check fall out of bounds
    if (player.y > canvas.height) {
        setGameOver('구멍에 빠졌습니다!');
        return;
    }

    // Check Obstacles (가시)
    for (let obs of level.obstacles) {
        // 충돌 크기를 살짝 줄여서 억울한 죽음 방지 (히트박스 보정)
        if (player.x + 10 < obs.x + obs.w &&
            player.x + player.width - 10 > obs.x &&
            player.y + 10 < obs.y + obs.h &&
            player.y + player.height > obs.y) {

            setGameOver('기물(가시)에 찔렸습니다!');
            return;
        }
    }

    // Check goal reached
    if (level.goal &&
        player.x < level.goal.x + level.goal.w &&
        player.x + player.width > level.goal.x &&
        player.y < level.goal.y + level.goal.h &&
        player.y + player.height > level.goal.y) {

        setStageClear();
        return;
    }

    // Update Boss (if stage >= 5)
    if (level.boss) {
        level.boss.update();

        // 보스가 너무 뒤쳐지면 약간씩 당겨오기 (보이지 않는 곳에서 너무 멀어지지 않게)
        if (level.boss.x < cameraX - 500) {
            level.boss.x = cameraX - 500;
        }

        // Check Boss Collision
        // 원형 충돌 비스무리하게 (간단한 AABB로 처리)
        if (player.x < level.boss.x + level.boss.width - 20 &&
            player.x + player.width > level.boss.x + 20 &&
            player.y < level.boss.y + level.boss.height - 20 &&
            player.y + player.height > level.boss.y + 20) {

            setGameOver('보스에게 잡혔습니다!');
            return;
        }
    }
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Always draw Background so it's not black
    ctx.fillStyle = '#87CEEB';
    if (gameState === 'PLAYING' && currentStage >= 5) {
        // 보스 스테이지 배경색 어둡게
        ctx.fillStyle = '#4a148c';
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (gameState === 'PLAYING') {
        // Draw Level Elements
        level.draw(ctx);

        // Draw Player
        player.draw(ctx);

        // Draw Boss
        if (level.boss) {
            level.boss.draw(ctx);
        }
    }
}

function gameLoop() {
    update();
    draw();
    animationId = requestAnimationFrame(gameLoop);
}

// --- UI Control ---
function hideAllScreens() {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
}

function showScreen(screenId) {
    hideAllScreens();
    screens[screenId].classList.add('active');
}

function setGameOver(reason) {
    gameState = 'GAME_OVER';
    ui.gameOverReason.textContent = reason;
    showScreen('gameOver');
}

function setStageClear() {
    gameState = 'STAGE_CLEAR';
    showScreen('stageClear');
}

// --- Event Listeners for UI Buttons ---
btns.start.addEventListener('click', () => {
    initGame(1);
});

btns.restart.addEventListener('click', () => {
    initGame(currentStage); // 재도전 시 현재 스테이지부터
});

btns.nextStage.addEventListener('click', () => {
    initGame(currentStage + 1);
});

// Start the loop
gameLoop();
