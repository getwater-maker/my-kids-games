// 슬리퍼 신발 꾸미기 공방 게임 로직 🩴

const shoeSole = document.getElementById('shoeSole');
const shoeStrap = document.getElementById('shoeStrap');
const canvas = document.getElementById('shoeCanvas');
const ctx = canvas.getContext('2d');
const cursorHint = document.getElementById('cursorHint');

// 오디오
const sfxDraw = document.getElementById('sfx-draw');
const sfxPop = document.getElementById('sfx-pop');

// 도구 상태
let currentToolType = 'marker'; // 'marker', 'spray', 'sticker'
let currentColor = '#2d3436';
let currentItem = null; // 스티커 이모지
let isDrawing = false;
let sprayInterval = null;
let lastMousePos = { x: 0, y: 0 };


// 1. 신발 색상 바꾸기 (CSS background-color 제어)
const shoeColors = {
    yellow: '#ffeaa7',
    pink: '#ffb8b8',
    mint: '#81ecec',
    purple: '#a29bfe',
    white: '#dfe6e9',
    black: '#2d3436'
};

document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const colorName = btn.dataset.color;
        const colorHex = shoeColors[colorName];

        shoeSole.style.backgroundColor = colorHex;
        shoeStrap.style.backgroundColor = colorHex;
    });
});

// 2. 도구 선택하기
document.querySelectorAll('.tool-btn:not(.color-btn)').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tool-btn:not(.color-btn)').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        currentToolType = btn.dataset.tool;

        if (currentToolType === 'marker') {
            currentColor = btn.dataset.color;
            currentItem = null;
            cursorHint.innerText = '✏️';
        } else if (currentToolType === 'spray') {
            currentColor = btn.dataset.color;
            currentItem = null;
            cursorHint.innerText = '💨';
        } else if (currentToolType === 'sticker') {
            currentItem = btn.dataset.val;
            cursorHint.innerText = currentItem;
        }
    });
});

// 3. 마우스 드로잉 이벤트
function getMousePos(evt) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

canvas.addEventListener('mousemove', (e) => {
    cursorHint.style.display = 'block';

    const wpRect = document.getElementById('shoeWrapper').getBoundingClientRect();
    const hitX = e.clientX - wpRect.left;
    const hitY = e.clientY - wpRect.top;

    cursorHint.style.left = hitX + 'px';
    cursorHint.style.top = hitY + 'px';

    lastMousePos = getMousePos(e);

    if (isDrawing && currentToolType === 'marker') {
        drawMarker(lastMousePos.x, lastMousePos.y);
    }
});

canvas.addEventListener('mouseout', () => {
    cursorHint.style.display = 'none';
});

canvas.addEventListener('mousedown', (e) => {
    lastMousePos = getMousePos(e);

    if (currentToolType === 'marker') {
        isDrawing = true;
        sfxDraw.currentTime = 0;
        sfxDraw.play().catch(() => { });

        ctx.beginPath();
        ctx.moveTo(lastMousePos.x, lastMousePos.y);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 15;
        ctx.strokeStyle = currentColor;

        // 마커펜 질감 (그림자 살짝)
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = 5;

    } else if (currentToolType === 'spray') {
        isDrawing = true;
        sfxDraw.currentTime = 0;
        sfxDraw.play().catch(() => { });

        sprayInterval = setInterval(() => {
            if (isDrawing) drawSpray(lastMousePos.x, lastMousePos.y);
        }, 15);

    } else if (currentToolType === 'sticker') {
        // 지비츠 찍기!
        sfxPop.currentTime = 0;
        sfxPop.play().catch(() => { });

        // 약간의 볼륨감을 위해 그림자 강하게
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;

        // 지비츠 커다랗게 그림!
        ctx.font = '70px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(currentItem, lastMousePos.x, lastMousePos.y);

        cursorHint.animate([
            { transform: 'translate(-50%, -50%) scale(1)' },
            { transform: 'translate(-50%, -50%) scale(1.5)' },
            { transform: 'translate(-50%, -50%) scale(1)' }
        ], { duration: 200, easing: 'ease-out' });

        ctx.shadowColor = 'transparent';
    }
});

window.addEventListener('mouseup', () => {
    if (isDrawing) {
        isDrawing = false;
        sfxDraw.pause();
        if (currentToolType === 'marker') {
            ctx.closePath();
        } else if (currentToolType === 'spray' && sprayInterval) {
            clearInterval(sprayInterval);
            sprayInterval = null;
        }
    }
});

function drawMarker(x, y) {
    ctx.lineTo(x, y);
    ctx.stroke();

    // 이중 그리기(펜 질감을 살림)
    ctx.beginPath();
    ctx.moveTo(x, y);
}

function drawSpray(x, y) {
    const radius = 30; // 락카 퍼짐 반경
    const density = 40;

    ctx.fillStyle = currentColor;
    ctx.save();
    ctx.shadowColor = 'transparent';

    for (let i = 0; i < density; i++) {
        const offsetX = (Math.random() - 0.5) * radius * 2;
        const offsetY = (Math.random() - 0.5) * radius * 2;

        if (offsetX * offsetX + offsetY * offsetY <= radius * radius) {
            // 스프레이 점
            ctx.fillRect(x + offsetX, y + offsetY, 2, 2);
        }
    }
    ctx.restore();
}

// 4. 리셋 및 캡처!
document.getElementById('clearBtn').addEventListener('click', () => {
    if (confirm('새 슬리퍼를 꺼내올까요? 🩴 (그린 그림이 다 지워집니다)')) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        sfxPop.play();
    }
});

document.getElementById('saveBtn').addEventListener('click', () => {
    // 폰케이스 게임과 비슷하게, 보이지 않는 캔버스에 신발 배경을 그리고 사용자의 캔버스를 얹음!
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exCtx = exportCanvas.getContext('2d');

    // 현재 슬리퍼 색 가져오기
    const activeColorBtn = document.querySelector('.color-btn.active');
    const colorType = activeColorBtn ? activeColorBtn.dataset.color : 'yellow';
    const shoeColorHex = shoeColors[colorType] || '#ffeaa7';

    const wrapperOffsetX = 40; // width 360, shoe is 280. left margin 40
    const wrapperOffsetY = 20; // margin-top 20

    // 1) Sole (밑창) 그리기
    exCtx.save();
    exCtx.translate(wrapperOffsetX, wrapperOffsetY);

    exCtx.fillStyle = shoeColorHex;
    exCtx.beginPath();
    exCtx.roundRect(0, 0, 280, 560, 140);
    exCtx.fill();
    // 살짝 3D 경계 그리기
    exCtx.strokeStyle = 'rgba(0,0,0,0.1)';
    exCtx.lineWidth = 4;
    exCtx.stroke();
    exCtx.restore();

    // 2) Strap (어퍼 스트랩) 그리기
    // .shoe-strap: top 70, left -10, w 300, h 240, rounded 70 70 40 40
    exCtx.save();
    exCtx.translate(wrapperOffsetX - 10, wrapperOffsetY + 70);

    exCtx.fillStyle = shoeColorHex;
    exCtx.beginPath();
    exCtx.moveTo(70, 0);
    exCtx.lineTo(300 - 70, 0);
    exCtx.quadraticCurveTo(300, 0, 300, 70);
    exCtx.lineTo(300, 240 - 40);
    exCtx.quadraticCurveTo(300, 240, 300 - 40, 240);
    exCtx.lineTo(40, 240);
    exCtx.quadraticCurveTo(0, 240, 0, 240 - 40);
    exCtx.lineTo(0, 70);
    exCtx.quadraticCurveTo(0, 0, 70, 0);
    exCtx.closePath();

    // Strap 그림자 효과
    // css: box-shadow: 0 20px 20px rgba(0,0,0,0.2)
    exCtx.shadowColor = 'rgba(0,0,0,0.2)';
    exCtx.shadowBlur = 20;
    exCtx.shadowOffsetY = 20;
    exCtx.fill();

    // Strap 밝은광 내부 그림자 (간단히 선으로)
    exCtx.shadowColor = 'transparent';
    exCtx.strokeStyle = 'rgba(255,255,255,0.6)';
    exCtx.lineWidth = 10;
    exCtx.stroke();

    // 3) Croc Holes (지비츠 구멍 3x3)
    // strap 크기: 300x240
    // padding 30 40, 간격 20. 즉 3x3 구멍들.
    // 대충 9개 구멍 그리기
    exCtx.fillStyle = 'rgba(0,0,0,0.15)';
    const holeStartX = 60;
    const holeStartY = 50;
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            let hx = holeStartX + c * 90;
            let hy = holeStartY + r * 70;
            exCtx.beginPath();
            exCtx.arc(hx, hy, 15, 0, Math.PI * 2);
            exCtx.fill();
        }
    }
    exCtx.restore();

    // 4) 최종적으로 위에 사용자가 그린 캔버스를 얹음!
    exCtx.drawImage(canvas, 0, 0);

    // 5) 저장 뿅!
    const a = document.createElement('a');
    a.href = exportCanvas.toDataURL('image/png');
    a.download = 'my-slipper.png';
    a.click();

    sfxPop.play();
    alert('📸 펑키한 내 슬리퍼가 성공적으로 저장됐어요!');
});
