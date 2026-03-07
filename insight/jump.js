const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const sfxJump = document.getElementById("sfx-jump");
const sfxWin = document.getElementById("sfx-win");
const sfxFall = document.getElementById("sfx-fall");

const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayDesc = document.getElementById("overlayDesc");
const overlayBtn = document.getElementById("overlayBtn");
const levelText = document.getElementById("levelText");

// 키 입력 상태
const keys = {
    left: false,
    right: false,
    up: false
};

// 모바일 버튼 바인딩
const btnLeft = document.getElementById('btnLeft');
const btnRight = document.getElementById('btnRight');
const btnJump = document.getElementById('btnJump');

function bindBtn(btn, keyName) {
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); keys[keyName] = true; btn.classList.add('active'); }, { passive: false });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); keys[keyName] = false; btn.classList.remove('active'); });
    btn.addEventListener('mousedown', (e) => { keys[keyName] = true; btn.classList.add('active'); });
    btn.addEventListener('mouseup', (e) => { keys[keyName] = false; btn.classList.remove('active'); });
    btn.addEventListener('mouseleave', (e) => { keys[keyName] = false; btn.classList.remove('active'); });
}

bindBtn(btnLeft, 'left');
bindBtn(btnRight, 'right');
bindBtn(btnJump, 'up');

// 키보드 이벤트
window.addEventListener("keydown", (e) => {
    if (e.code === "ArrowLeft") keys.left = true;
    if (e.code === "ArrowRight") keys.right = true;
    if (e.code === "ArrowUp" || e.code === "Space") keys.up = true;
});

window.addEventListener("keyup", (e) => {
    if (e.code === "ArrowLeft") keys.left = false;
    if (e.code === "ArrowRight") keys.right = false;
    if (e.code === "ArrowUp" || e.code === "Space") keys.up = false;
});

// 게임 설정
let currentLevel = 1;
let camera = { x: 0, y: 0 };
let platforms = [];
let goal = { x: 0, y: 0, w: 50, h: 50 };
let gameState = "playing"; // playing, win, fall

// 플레이어 객체 (토끼 🐰)
const player = {
    x: 100,
    y: 100,
    width: 40,
    height: 40,
    vx: 0,
    vy: 0,
    speed: 5,
    jumpPower: -13,
    gravity: 0.6,
    grounded: false,
    emoji: "🐰"
};

// 맵 레벨 디자인 (단순화: 1단계부터 무한히 생성)
function loadLevel(level) {
    currentLevel = level;
    levelText.innerText = level;
    gameState = "playing";
    overlay.classList.add("hidden");

    player.x = 100;
    player.y = 300;
    player.vx = 0;
    player.vy = 0;
    camera.x = 0;

    platforms = [];

    // 시작 발판
    platforms.push({ x: 50, y: 400, w: 200, h: 40, type: 'start' });

    // 레벨에 따라 맵 길이가 달라지고, 간격이 넓어짐
    let lastX = 250;
    let lastY = 400;
    const numPlatforms = 5 + (level * 2);

    for (let i = 0; i < numPlatforms; i++) {
        // x 간격 (레벨이 높을수록 멀어짐)
        let gapX = 80 + Math.random() * (40 + level * 10);
        if (gapX > 250) gapX = 250; // 최대 점프 거리 제한

        let targetX = lastX + gapX;

        // y 간격 (오르락 내리락)
        let yVariaton = (Math.random() - 0.5) * 150;
        let targetY = lastY + yVariaton;

        // 바닥/천장 제한
        if (targetY > 500) targetY = 500;
        if (targetY < 200) targetY = 200;

        // 발판 크기 (레벨이 오르면 좁아짐)
        let platW = 120 - (level * 5);
        if (platW < 50) platW = 50;

        platforms.push({ x: targetX, y: targetY, w: platW, h: 30, type: 'cloud' });

        lastX = targetX + platW;
        lastY = targetY;
    }

    // 골인 지점 (당근 🥕)
    goal.x = lastX + 100;
    goal.y = lastY - 50;
    platforms.push({ x: lastX + 50, y: lastY, w: 200, h: 40, type: 'goal' });
}

function updatePhysics() {
    if (gameState !== "playing") return;

    // 좌우 이동
    if (keys.left) player.vx = -player.speed;
    else if (keys.right) player.vx = player.speed;
    else player.vx = 0;

    // 점프
    if (keys.up && player.grounded) {
        player.vy = player.jumpPower;
        player.grounded = false;
        if (sfxJump) {
            sfxJump.currentTime = 0;
            sfxJump.play().catch(() => { });
        }
    }

    // 중력 적용
    player.vy += player.gravity;

    // 위치 갱신
    player.x += player.vx;
    player.y += player.vy;

    // 맵 밖으로 떨어지면?
    if (player.y > 800) {
        gameOver();
        return;
    }

    // 충돌 처리 (플랫폼)
    player.grounded = false;
    for (let p of platforms) {
        // 플레이어가 발판 위로 떨어질 때만 (y방향 속도가 양수이고, 이전 위치가 발판 위였을 때)
        if (player.vy > 0 &&
            player.x + player.width > p.x &&
            player.x < p.x + p.w &&
            player.y + player.height >= p.y &&
            player.y + player.height - player.vy <= p.y + 10) {
            player.grounded = true;
            player.vy = 0;
            player.y = p.y - player.height;
        }
    }

    // 도착 판정 (당근에 닿았는가?)
    if (
        player.x + player.width > goal.x &&
        player.x < goal.x + goal.w &&
        player.y + player.height > goal.y &&
        player.y < goal.y + goal.h
    ) {
        gameWin();
    }

    // 카메라 추적 (캐릭터가 화면 중앙 1/3을 넘어서면 스크롤)
    let targetCamX = player.x - 300;
    if (targetCamX < 0) targetCamX = 0;

    // 부드러운 카메라 이동
    camera.x += (targetCamX - camera.x) * 0.1;
}

function gameOver() {
    gameState = "fall";
    if (sfxFall) { sfxFall.currentTime = 0; sfxFall.play().catch(() => { }); }

    overlayTitle.innerText = "앗, 떨어졌어요! 😭";
    overlayDesc.innerText = "다시 한번 도전해볼까요?";
    overlayBtn.innerText = "다시 하기";
    overlay.classList.remove("hidden");

    overlayBtn.onclick = () => loadLevel(currentLevel); // 같은 레벨 다시
}

function gameWin() {
    gameState = "win";
    if (sfxWin) { sfxWin.currentTime = 0; sfxWin.play().catch(() => { }); }
    player.emoji = "😎"; // 깬 표정

    overlayTitle.innerText = "우와! 성공! 🎉";
    overlayDesc.innerText = currentLevel + "단계를 클리어했어요!";
    overlayBtn.innerText = "다음 단계 고고!";
    overlay.classList.remove("hidden");

    overlayBtn.onclick = () => {
        player.emoji = "🐰";
        loadLevel(currentLevel + 1); // 다음 레벨
    };
}

// 둥근 사각형 그리기 툴
function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
}

function draw() {
    // 배경 (하늘)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // 카메라 스크롤 (원경: 패럴랙스 효과용 구름 등 그려도 좋음)
    ctx.translate(-camera.x, 0);

    // 플랫폼 그리기
    for (let p of platforms) {
        if (p.type === 'start') {
            ctx.fillStyle = '#badc58'; // 풀밭
            roundRect(ctx, p.x, p.y, p.w, p.h, 15, true, false);
            // 흙
            ctx.fillStyle = '#f6e58d';
            ctx.fillRect(p.x, p.y + 15, p.w, p.h - 15);
        } else if (p.type === 'goal') {
            ctx.fillStyle = '#ffbe76'; // 체크포인트 블록
            roundRect(ctx, p.x, p.y, p.w, p.h, 10, true, false);
        } else {
            // 구름 발판
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.shadowColor = 'rgba(0,0,0,0.1)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetY = 5;
            roundRect(ctx, p.x, p.y, p.w, p.h, 15, true, false);
            ctx.shadowColor = 'transparent';
        }
    }

    // 골인 지점 (도착 깃발 / 당근) 📍 🥕
    ctx.font = '50px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    ctx.fillText("🥕", goal.x, goal.y + 40);

    // 플레이어 그리기
    ctx.font = '40px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    // 플레이어가 바라보는 방향 (뒤집기)
    ctx.save();
    if (player.vx < 0) {
        ctx.translate(player.x + player.width, player.y);
        ctx.scale(-1, 1);
        ctx.fillText(player.emoji, 0, 35);
    } else {
        ctx.fillText(player.emoji, player.x, player.y + 35);
    }
    ctx.restore();

    ctx.restore();
}

function gameLoop() {
    updatePhysics();
    draw();
    requestAnimationFrame(gameLoop);
}

// 게임 시작
loadLevel(1);
requestAnimationFrame(gameLoop);
