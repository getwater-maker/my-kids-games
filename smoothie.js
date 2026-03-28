// 스무디 만들기 게임 로직 🍹

// 캔버스 두 개 사용 (액체는 유리잔 안에만, 토핑은 볼륨감있게 잔 밖으로도 넘칠 수 있음)
const liquidCanvas = document.getElementById('liquidCanvas');
const toppingCanvas = document.getElementById('toppingCanvas');
const liqCtx = liquidCanvas.getContext('2d');
const topCtx = toppingCanvas.getContext('2d');
const cursorHint = document.getElementById('cursorHint');

// 오디오
const sfxPour = document.getElementById('sfx-pour');
const sfxPop = document.getElementById('sfx-pop');

// 도구 상태
let currentToolType = 'liquid'; // 'liquid', 'cream', 'topping'
let currentColor = 'rgba(255, 118, 117, 0.4)'; // 기본 딸기 스무디
let currentItem = null;
let isDrawing = false;
let lastMousePos = { x: 0, y: 0 };


// 1. 도구 선택 이벤트
document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        currentToolType = btn.dataset.tool;

        if (currentToolType === 'liquid') {
            currentColor = btn.dataset.color;
            currentItem = null;
            cursorHint.innerText = '💧';
        } else if (currentToolType === 'cream') {
            currentColor = btn.dataset.color;
            currentItem = null;
            cursorHint.innerText = '🍦';
        } else if (currentToolType === 'topping') {
            currentItem = btn.dataset.val;
            cursorHint.innerText = currentItem;
        }
    });
});

// 2. 마우스 좌표 마법사
// 캔버스 사이즈와 여백이 서로 다르므로, 각각의 위치를 구해야해!
function getToppingPos(evt) {
    const rect = toppingCanvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

function getLiquidPos(evt) {
    const rect = liquidCanvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

// 3. 힌트 및 드로잉 로직 (모든 이벤트는 최상단의 토핑 캔버스가 받음!)
toppingCanvas.addEventListener('mousemove', (e) => {
    cursorHint.style.display = 'block';

    const wpRect = document.querySelector('.smoothie-wrapper').getBoundingClientRect();
    const hitX = e.clientX - wpRect.left;
    const hitY = e.clientY - wpRect.top;

    cursorHint.style.left = hitX + 'px';
    cursorHint.style.top = hitY + 'px';

    if (isDrawing) {
        if (currentToolType === 'liquid') {
            const lPos = getLiquidPos(e);
            drawLiquid(lPos.x, lPos.y);
        } else if (currentToolType === 'cream') {
            const tPos = getToppingPos(e);
            drawCream(tPos.x, tPos.y);
        }
    }
});

toppingCanvas.addEventListener('mouseout', () => {
    cursorHint.style.display = 'none';
});

toppingCanvas.addEventListener('mousedown', (e) => {
    if (currentToolType === 'liquid') {
        const lPos = getLiquidPos(e);
        lastMousePos = lPos;
        isDrawing = true;

        sfxPour.currentTime = 0;
        sfxPour.play().catch(() => { });

        // 스무디 세팅: 아주 두껍고 둥글게, 투명하게 여러번 겹치도록
        liqCtx.beginPath();
        liqCtx.moveTo(lPos.x, lPos.y);
        liqCtx.lineCap = 'round';
        liqCtx.lineJoin = 'round';
        liqCtx.lineWidth = 100;
        liqCtx.strokeStyle = currentColor;

        liqCtx.shadowColor = currentColor;
        liqCtx.shadowBlur = 40;

    } else if (currentToolType === 'cream') {
        const tPos = getToppingPos(e);
        lastMousePos = tPos;
        isDrawing = true;

        sfxPour.currentTime = 0;
        sfxPour.play().catch(() => { });

        // 휘핑 크림 세팅: 케이크 꾸미기 때처럼!
        topCtx.beginPath();
        topCtx.moveTo(tPos.x, tPos.y);
        topCtx.lineCap = 'round';
        topCtx.lineJoin = 'round';
        topCtx.lineWidth = 40;
        topCtx.strokeStyle = currentColor;

        topCtx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        topCtx.shadowBlur = 10;
        topCtx.shadowOffsetX = 3;
        topCtx.shadowOffsetY = 3;

    } else if (currentToolType === 'topping') {
        const tPos = getToppingPos(e);

        sfxPop.currentTime = 0;
        sfxPop.play().catch(() => { });

        topCtx.shadowColor = 'rgba(0,0,0,0.3)';
        topCtx.shadowBlur = 5;
        topCtx.shadowOffsetX = 3;
        topCtx.shadowOffsetY = 3;

        topCtx.font = '70px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
        topCtx.textAlign = 'center';
        topCtx.textBaseline = 'middle';
        topCtx.fillText(currentItem, tPos.x, tPos.y);

        cursorHint.animate([
            { transform: 'translate(-50%, -50%) scale(1)' },
            { transform: 'translate(-50%, -50%) scale(1.5)' },
            { transform: 'translate(-50%, -50%) scale(1)' }
        ], { duration: 200, easing: 'ease-out' });

        topCtx.shadowColor = 'transparent';
    }
});

// 마우스 떼기
window.addEventListener('mouseup', () => {
    if (isDrawing) {
        isDrawing = false;
        sfxPour.pause();
        if (currentToolType === 'liquid') {
            // 안 닫아도 상관없긴 함
        } else if (currentToolType === 'cream') {
            topCtx.closePath();
        }
    }
});

// 스무디 액체 붓기
function drawLiquid(x, y) {
    // 액체 느낌을 위해 무작위성을 조금 줄까? (옵션)
    liqCtx.lineTo(x, y);
    liqCtx.stroke();

    liqCtx.beginPath();
    liqCtx.moveTo(x, y);
}

// 생크림 / 폼 짜기 (입체 효과)
function drawCream(x, y) {
    topCtx.lineTo(x, y);
    topCtx.stroke();

    // 입체감 더하기
    topCtx.save();
    topCtx.shadowColor = 'transparent';
    topCtx.lineWidth = 15;
    topCtx.strokeStyle = 'rgba(255,255,255,0.5)';
    topCtx.lineTo(x, y);
    topCtx.stroke();
    topCtx.restore();

    topCtx.beginPath();
    topCtx.moveTo(x, y);
}

// 4. 리셋 및 캡처
document.getElementById('clearBtn').addEventListener('click', () => {
    if (confirm('새 빈 컵을 꺼내올까요? (지금 만든 스무디는 버려져요) 🗑️')) {
        liqCtx.clearRect(0, 0, liquidCanvas.width, liquidCanvas.height);
        topCtx.clearRect(0, 0, toppingCanvas.width, toppingCanvas.height);
        sfxPop.play();
    }
});

document.getElementById('saveBtn').addEventListener('click', () => {
    // 사진 저장을 위해 캔버스 합성
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 600;
    exportCanvas.height = 700;
    const exCtx = exportCanvas.getContext('2d');

    // 1. 배경 채우기
    exCtx.fillStyle = '#ffffff';
    exCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // 2. Liquid 캔버스를 원래 위치에 그리기
    // CSS : cup-mask (width 300, height 420, bottom: 80) -> wrapper가 height 700 이므로.
    // top = 700 - 420 - 80 = 200.
    // left = (600 - 300)/2 = 150.

    // 우선 마스킹 적용 (css의 border-radius 와 동일하게 아래쪽만 둥글다)
    exCtx.save();
    exCtx.translate(150, 200);
    exCtx.beginPath();
    exCtx.moveTo(0, 0);
    exCtx.lineTo(300, 0);
    exCtx.lineTo(300, 420 - 60);
    exCtx.quadraticCurveTo(300, 420, 300 - 60, 420);
    exCtx.lineTo(60, 420);
    exCtx.quadraticCurveTo(0, 420, 0, 420 - 60);
    exCtx.closePath();
    exCtx.clip();

    // 빈 컵 베이스 
    let grd = exCtx.createLinearGradient(0, 0, 0, 420);
    grd.addColorStop(0, "rgba(230, 240, 255, 0.1)");
    grd.addColorStop(1, "rgba(200, 230, 255, 0.3)");
    exCtx.fillStyle = grd;
    exCtx.fill();

    // 그려진 스무디
    exCtx.drawImage(liquidCanvas, 0, 0);
    exCtx.restore();

    // 3. 유리잔 텍스처 (glint, border) -> glass-front
    // width: 316, height: 430, bottom: 74, left: 142
    // top = 700 - 430 - 74 = 196
    exCtx.save();
    exCtx.translate(142, 196);
    exCtx.beginPath();
    exCtx.moveTo(0, 0);
    exCtx.lineTo(316, 0);
    exCtx.lineTo(316, 430 - 66);
    exCtx.quadraticCurveTo(316, 430, 316 - 66, 430);
    exCtx.lineTo(66, 430);
    exCtx.quadraticCurveTo(0, 430, 0, 430 - 66);
    exCtx.closePath();

    // 테두리
    exCtx.lineWidth = 16;
    exCtx.strokeStyle = 'rgba(255,255,255,0.8)';
    exCtx.stroke();
    // 상단 얇은 테두리 덮어쓰기 로직 생략(간단히)
    exCtx.restore();

    // 4. 마지막으로 Topping Canvas(오버레이)
    exCtx.drawImage(toppingCanvas, 0, 0);


    const a = document.createElement('a');
    a.href = exportCanvas.toDataURL('image/png');
    a.download = 'my-smoothie.png';
    a.click();
    sfxPop.play();
    alert('📸 나만의 달콤한 스무디가 갤러리에 저장됐어요!');
});
