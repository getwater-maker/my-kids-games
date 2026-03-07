const { Engine, Render, Runner, Bodies, Composite, Events, World, Body } = Matter;

// 게임 설정
const CONFIG = {
    width: 450,
    height: 700,
    kirbys: [
        { label: "Lv.0", radius: 15, color: "#fce4ec", score: 1, next: 1 },
        { label: "Lv.1", radius: 25, color: "#ff80ab", score: 2, next: 2 },
        { label: "Lv.2", radius: 35, color: "#f50057", score: 4, next: 3 },
        { label: "Lv.3", radius: 50, color: "#7b1fa2", score: 8, next: 4 },
        { label: "Lv.4", radius: 70, color: "#3f51b5", score: 16, next: 5 },
        { label: "Lv.5", radius: 95, color: "#00bcd4", score: 32, next: 6 },
        { label: "Lv.6", radius: 130, color: "#ffeb3b", score: 64, next: -1 } // 마지막 단계
    ],
    wallThickness: 20
};

let engine, render, runner;
let canvas, ctx;
let score = 0;
let isGameOver = false;
let isWin = false;
let currentKirby = null;
let nextKirbyIndex = 0;
let canDrop = true;

// 초기화
function init() {
    engine = Engine.create();
    canvas = document.getElementById("game-canvas");

    render = Render.create({
        canvas: canvas,
        engine: engine,
        options: {
            width: CONFIG.width,
            height: CONFIG.height,
            wireframes: false,
            background: 'transparent'
        }
    });

    // 벽 생성
    const ground = Bodies.rectangle(CONFIG.width / 2, CONFIG.height, CONFIG.width, CONFIG.wallThickness, { isStatic: true, render: { fillStyle: '#ff4081' } });
    const leftWall = Bodies.rectangle(0, CONFIG.height / 2, CONFIG.wallThickness, CONFIG.height, { isStatic: true, render: { fillStyle: '#ff4081' } });
    const rightWall = Bodies.rectangle(CONFIG.width, CONFIG.height / 2, CONFIG.wallThickness, CONFIG.height, { isStatic: true, render: { fillStyle: '#ff4081' } });

    // 게임 오버 라인 (보이지 않는 센서)
    const deadLine = Bodies.rectangle(CONFIG.width / 2, 100, CONFIG.width, 2, {
        isStatic: true,
        isSensor: true,
        render: { visible: true, fillStyle: 'rgba(255, 0, 0, 0.2)' },
        label: "DEAD_LINE"
    });

    Composite.add(engine.world, [ground, leftWall, rightWall, deadLine]);

    Render.run(render);
    runner = Runner.create();
    Runner.run(runner, engine);

    // 다음 커비 미리 정기
    prepareNextKirby();

    // 입력 이벤트
    window.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mousedown", handleMouseDown);

    // 충돌 처리
    Events.on(engine, "collisionStart", (event) => {
        event.pairs.forEach((pair) => {
            const { bodyA, bodyB } = pair;

            // 데이터가 있는 커비들끼리 충돌 시
            if (bodyA.kirbyData && bodyB.kirbyData) {
                // 같은 레벨이면 합성
                if (bodyA.kirbyData.level === bodyB.kirbyData.level) {
                    const level = bodyA.kirbyData.level;
                    if (level < CONFIG.kirbys.length - 1) {
                        mergeKirbys(bodyA, bodyB);
                    }
                }
            }
        });
    });

    // 게임 루프: 게임 오버 체크 및 커스텀 그리기
    Events.on(render, "afterRender", () => {
        const bodies = Composite.allBodies(engine.world);
        bodies.forEach(body => {
            if (body.kirbyData) {
                drawKirbyExtras(body);
            }
        });

        checkGameOver();
    });
}

// 다음 커비 준비
function prepareNextKirby() {
    nextKirbyIndex = Math.floor(Math.random() * 3); // 처음엔 0~2단계만 나옴
    updatePreviewUI();
    spawnKirby();
}

function updatePreviewUI() {
    const preview = document.getElementById("next-kirby");
    preview.style.backgroundColor = CONFIG.kirbys[nextKirbyIndex].color;
}

// 상단 대기 중인 커비 생성
function spawnKirby() {
    if (isGameOver || isWin) return;

    const data = CONFIG.kirbys[nextKirbyIndex];
    canDrop = true;

    // 마우스 위치에 맞게 대기 커비 생성 (물리 영향 X)
    // 실제 물리 객체는 클릭 시 생성할 것이므로, 현재는 시각적 가이드만
    currentKirby = {
        level: nextKirbyIndex,
        x: CONFIG.width / 2,
        y: 50,
        radius: data.radius,
        color: data.color
    };
}

// 마우스 이동 시 대기 커비 이동
function handleMouseMove(e) {
    if (!currentKirby || !canDrop) return;

    const rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;

    // 벽 안쪽으로 제한
    const minX = CONFIG.wallThickness + currentKirby.radius;
    const maxX = CONFIG.width - CONFIG.wallThickness - currentKirby.radius;

    if (x < minX) x = minX;
    if (x > maxX) x = maxX;

    currentKirby.x = x;

    // 시각적 가이드는 afterRender에서 직접 그릴 수도 있지만, 
    // 여기서는 그냥 따로 렌더링하기 복잡하니 render.canvas 컨텍스트를 활용
}

// 클릭 시 떨어뜨리기
function handleMouseDown() {
    if (!currentKirby || !canDrop || isGameOver || isWin) return;

    canDrop = false;
    const data = CONFIG.kirbys[currentKirby.level];

    const newKirby = Bodies.circle(currentKirby.x, currentKirby.y, data.radius, {
        restitution: 0.3,
        friction: 0.1,
        label: "KIRBY",
        render: { fillStyle: data.color },
        kirbyData: { level: currentKirby.level, radius: data.radius }
    });

    Composite.add(engine.world, newKirby);

    // 잠깐의 딜레이 후 다음 커비 준비
    setTimeout(() => {
        nextKirbyIndex = Math.floor(Math.random() * 3);
        updatePreviewUI();
        spawnKirby();
    }, 1000);
}

// 합체 로직
function mergeKirbys(bodyA, bodyB) {
    const nextLevel = bodyA.kirbyData.level + 1;
    const midX = (bodyA.position.x + bodyB.position.x) / 2;
    const midY = (bodyA.position.y + bodyB.position.y) / 2;

    // 기존 것들 제거
    Composite.remove(engine.world, [bodyA, bodyB]);

    // 점수 추가
    addScore(CONFIG.kirbys[nextLevel - 1].score * 10);

    // 승리 체크
    if (nextLevel === 6) {
        showWin();
    }

    // 새로운 커비 생성
    const data = CONFIG.kirbys[nextLevel];
    const newKirby = Bodies.circle(midX, midY, data.radius, {
        restitution: 0.3,
        friction: 0.1,
        label: "KIRBY",
        render: { fillStyle: data.color },
        kirbyData: { level: nextLevel, radius: data.radius }
    });

    Composite.add(engine.world, newKirby);
}

// 점수 추가
function addScore(amount) {
    score += amount;
    document.getElementById("score").innerText = score;
}

// 커비 얼굴 그리기
function drawKirbyExtras(body) {
    const { x, y } = body.position;
    const radius = body.kirbyData.radius;
    const angle = body.angle;

    const ctx = render.context;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // 눈 그리기
    const eyeSize = radius * 0.15;
    const eyeOffset = radius * 0.3;

    ctx.fillStyle = "#333";
    // 왼쪽 눈
    ctx.beginPath();
    ctx.ellipse(-eyeOffset, -eyeSize, eyeSize * 0.6, eyeSize, 0, 0, Math.PI * 2);
    ctx.fill();
    // 오른쪽 눈
    ctx.beginPath();
    ctx.ellipse(eyeOffset, -eyeSize, eyeSize * 0.6, eyeSize, 0, 0, Math.PI * 2);
    ctx.fill();

    // 볼터치
    ctx.fillStyle = "rgba(255, 100, 100, 0.4)";
    ctx.beginPath();
    ctx.arc(-eyeOffset * 1.5, 0, radius * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(eyeOffset * 1.5, 0, radius * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // 입
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, radius * 0.2, radius * 0.2, 0, Math.PI, false);
    ctx.stroke();

    ctx.restore();

    // 대기 중인 커비 가이드 그리기
    if (canDrop && currentKirby) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = currentKirby.color;
        ctx.beginPath();
        ctx.arc(currentKirby.x, currentKirby.y, currentKirby.radius, 0, Math.PI * 2);
        ctx.fill();

        // 가이드 커비 얼굴
        ctx.translate(currentKirby.x, currentKirby.y);
        ctx.fillStyle = "#333";
        ctx.beginPath();
        ctx.ellipse(-currentKirby.radius * 0.3, -currentKirby.radius * 0.15, currentKirby.radius * 0.1, currentKirby.radius * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(currentKirby.radius * 0.3, -currentKirby.radius * 0.15, currentKirby.radius * 0.1, currentKirby.radius * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// 게임 오버 체크
function checkGameOver() {
    if (isGameOver || isWin) return;

    const bodies = Composite.allBodies(engine.world);
    for (let body of bodies) {
        if (body.label === "KIRBY" && body.position.y < 100 && body.velocity.y < 0.1) {
            // 커비가 생성된 직후가 아니고, 멈춰있는데 위에 있다면
            // 실제 구현상 떨어지는 중일 수도 있으므로 보정 필요
            // 3초 이상 머무를 때 게임 오버로 처리하는 방식이 일반적
            if (!body.topTime) body.topTime = Date.now();
            if (Date.now() - body.topTime > 2000) {
                showGameOver();
                break;
            }
        } else {
            body.topTime = null;
        }
    }
}

function showGameOver() {
    isGameOver = true;
    document.getElementById("final-score").innerText = score;
    document.getElementById("game-over").classList.remove("hidden");
    Runner.stop(runner);
}

function showWin() {
    isWin = true;
    document.getElementById("win-score").innerText = score;
    document.getElementById("game-win").classList.remove("hidden");
    // 승리 시에도 계속 할 수는 있게 할 수 있지만 일단 멈춤
}

// 시작
init();
