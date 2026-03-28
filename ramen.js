// 라면 끓이기 게임 로직 🍜

const canvas = document.getElementById('ramenCanvas');
const ctx = canvas.getContext('2d');
const cursorHint = document.getElementById('cursorHint');

// 오디오 (없으면 에러 방지 처리)
const sfxBroth = document.getElementById('sfx-broth');
const sfxPop = document.getElementById('sfx-pop');
const sfxSprinkle = document.getElementById('sfx-sprinkle');

const width = canvas.width;
const height = canvas.height;
const centerX = width / 2;
const centerY = height / 2;

// 냄비 안쪽 크기 (그리기 영역)
const potRadius = 240;

// 도구 상태
let currentToolType = 'broth'; // 'broth', 'noodle', 'powder', 'topping'
let currentColor = '#e15f41';
let currentItem = null;
let currentSize = 15;
let isDrawing = false;
let sprayInterval = null;
let lastMousePos = { x: 0, y: 0 };

// 1. 도구 선택하기
document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        currentToolType = btn.dataset.tool;

        if (currentToolType === 'broth') {
            currentColor = btn.dataset.color;
            currentItem = null;
            cursorHint.innerText = btn.innerText.split(' ')[0]; // 아이콘 추출
        } else if (currentToolType === 'noodle') {
            currentColor = btn.dataset.color;
            currentSize = parseInt(btn.dataset.size);
            currentItem = null;
            cursorHint.innerText = '🍝';
        } else if (currentToolType === 'powder') {
            currentColor = btn.dataset.color;
            currentItem = null;
            cursorHint.innerText = btn.innerText.split(' ')[0];
        } else if (currentToolType === 'topping') {
            currentItem = btn.dataset.val;
            cursorHint.innerText = currentItem;
        }
    });
});

// 기본 세팅 (마스킹)
function setupCanvas() {
    ctx.clearRect(0, 0, width, height);

    // 원형 마스크 설정: 이 영역 안에서만 그려지도록 합니다.
    ctx.beginPath();
    ctx.arc(centerX, centerY, potRadius, 0, Math.PI * 2);
    ctx.clip(); // 이제부터 캔버스 밖으로 삐져나가지 않음!

    // 초기 냄비 바닥색을 살짝 깔아줄 수도 있음
}

function getMousePos(evt) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

canvas.addEventListener('mousemove', (e) => {
    cursorHint.style.display = 'block';

    const wpRect = document.querySelector('.ramen-wrapper').getBoundingClientRect();
    const hitX = e.clientX - wpRect.left - (wpRect.width - canvas.width) / 2;
    const hitY = e.clientY - wpRect.top - (wpRect.height - canvas.height) / 2;

    const cursorLeft = hitX + (wpRect.width - canvas.width) / 2;
    const cursorTop = hitY + (wpRect.height - canvas.height) / 2;

    cursorHint.style.left = cursorLeft + 'px';
    cursorHint.style.top = cursorTop + 'px';

    lastMousePos = getMousePos(e);

    if (isDrawing) {
        if (currentToolType === 'broth') {
            drawStroke(lastMousePos.x, lastMousePos.y, 80, 0.9);
        } else if (currentToolType === 'noodle') {
            // 면은 좀 더 구불구불하게 그려질 수 있도록
            drawStroke(lastMousePos.x, lastMousePos.y, currentSize, 1.0);
        }
    }
});

canvas.addEventListener('mouseout', () => {
    cursorHint.style.display = 'none';
});

canvas.addEventListener('mousedown', (e) => {
    lastMousePos = getMousePos(e);

    if (currentToolType === 'broth' || currentToolType === 'noodle') {
        isDrawing = true;

        if (currentToolType === 'broth' && sfxBroth) {
            sfxBroth.currentTime = 0;
            sfxBroth.play().catch(() => { });
        } else if (currentToolType === 'noodle' && sfxBroth) {
            sfxBroth.currentTime = 0;
            sfxBroth.play().catch(() => { }); // 면 소스 대용
        }

        ctx.beginPath();
        ctx.moveTo(lastMousePos.x, lastMousePos.y);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = currentColor;

        if (currentToolType === 'noodle') {
            ctx.shadowColor = 'rgba(0,0,0,0.4)';
            ctx.shadowBlur = 5;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
        } else {
            ctx.shadowColor = 'transparent';
        }

    } else if (currentToolType === 'powder') {
        isDrawing = true;
        if (sfxSprinkle) {
            sfxSprinkle.currentTime = 0;
            sfxSprinkle.play().catch(() => { });
        }

        sprayInterval = setInterval(() => {
            if (isDrawing) drawPowder(lastMousePos.x, lastMousePos.y);
        }, 15);

    } else if (currentToolType === 'topping') {
        if (sfxPop) {
            sfxPop.currentTime = 0;
            sfxPop.play().catch(() => { });
        }

        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 5;

        ctx.font = '65px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.save();
        ctx.translate(lastMousePos.x, lastMousePos.y);
        ctx.rotate((Math.random() - 0.5) * Math.PI * 0.5); // 살짝 회전
        ctx.fillText(currentItem, 0, 0);
        ctx.restore();

        cursorHint.animate([
            { transform: 'translate(-50%, -50%) scale(1)' },
            { transform: 'translate(-50%, -50%) scale(1.5)' },
            { transform: 'translate(-50%, -50%) scale(1)' }
        ], { duration: 200, easing: 'ease-out' });

        ctx.shadowColor = 'transparent'; // 복귀
    }
});

window.addEventListener('mouseup', () => {
    if (isDrawing) {
        isDrawing = false;

        if (currentToolType === 'broth' || currentToolType === 'noodle') {
            if (sfxBroth) sfxBroth.pause();
            ctx.closePath();
        } else if (currentToolType === 'powder' && sprayInterval) {
            if (sfxSprinkle) sfxSprinkle.pause();
            clearInterval(sprayInterval);
            sprayInterval = null;
        }
    }
});

function drawStroke(x, y, size, opacity) {
    ctx.lineWidth = size;
    ctx.globalAlpha = opacity;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.globalAlpha = 1.0;
}

function drawPowder(x, y) {
    const radius = 60; // 뿌려지는 반경
    const density = 20;

    ctx.fillStyle = currentColor;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 2;

    for (let i = 0; i < density; i++) {
        const offsetX = (Math.random() - 0.5) * radius * 2;
        const offsetY = (Math.random() - 0.5) * radius * 2;

        if (offsetX * offsetX + offsetY * offsetY <= radius * radius) {
            ctx.beginPath();
            // 가루입자는 매우 작게
            ctx.arc(x + offsetX, y + offsetY, Math.random() * 2 + 1, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
}

// 리셋 및 캡처
document.getElementById('clearBtn').addEventListener('click', () => {
    if (confirm('새 냄비를 준비할까요? 🍜🔥')) {
        canvas.width = canvas.width; // 캔버스 초기화 트릭
        setupCanvas();
        if (sfxPop) sfxPop.play();
    }
});

document.getElementById('saveBtn').addEventListener('click', () => {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 600;
    exportCanvas.height = 600;
    const exCtx = exportCanvas.getContext('2d');

    // 식탁 배경
    exCtx.fillStyle = '#d1d8e0';
    exCtx.fillRect(0, 0, 600, 600);

    // 냄비 그리기
    const pCenter = { x: 300, y: 300 };
    exCtx.save();
    exCtx.translate(pCenter.x, pCenter.y);

    // 손잡이
    exCtx.fillStyle = '#ffa502';
    exCtx.beginPath();
    exCtx.roundRect(-290, -40, 50, 80, 20);
    exCtx.roundRect(240, -40, 50, 80, 20);
    exCtx.fill();

    // 냄비 본체
    exCtx.beginPath();
    exCtx.arc(0, 0, 260, 0, Math.PI * 2); // 냄비 외곽
    exCtx.fillStyle = '#ffa502';
    exCtx.fill();

    exCtx.beginPath();
    exCtx.arc(0, 0, 240, 0, Math.PI * 2); // 냄비 안쪽
    exCtx.fillStyle = '#eccc68';
    exCtx.fill();
    exCtx.restore();

    // 캔버스(그린 내용) 얹기
    exCtx.drawImage(canvas, 50, 50);

    const a = document.createElement('a');
    a.href = exportCanvas.toDataURL('image/png');
    a.download = 'my-ramen.png';
    a.click();

    if (sfxPop) sfxPop.play();
    alert('📸 맛있는 라면 사진이 갤러리에 저장됐어요!');
});

// 시작
setupCanvas();
