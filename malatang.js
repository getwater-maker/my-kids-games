// 마라탕 만들기 게임 로직 🍲

const canvas = document.getElementById('malatangCanvas');
const ctx = canvas.getContext('2d');
const cursorHint = document.getElementById('cursorHint');

// 오디오
const sfxBroth = document.getElementById('sfx-broth');
const sfxPop = document.getElementById('sfx-pop');
const sfxSprinkle = document.getElementById('sfx-sprinkle');

const width = canvas.width;
const height = canvas.height;
const centerX = width / 2;
const centerY = height / 2;

// 냄비 안쪽 크기 (그리기 영역) - 550 전체 크기에 맞춤
const bowlRadius = 250;

// 도구 상태
let currentToolType = 'broth'; // 'broth', 'noodle', 'topping', 'powder'
let currentColor = '#e84118';
let currentItem = null;
let currentSize = 15;
let currentOpacity = 0.9;
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
            currentOpacity = 0.9;
            currentItem = null;
            cursorHint.innerText = '💧';
        } else if (currentToolType === 'noodle') {
            currentColor = btn.dataset.color;
            currentSize = parseInt(btn.dataset.size);
            currentOpacity = parseFloat(btn.dataset.opacity || 1.0);
            currentItem = null;
            cursorHint.innerText = '🥢';
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

    // 원형 마스크 설정
    ctx.beginPath();
    ctx.arc(centerX, centerY, bowlRadius, 0, Math.PI * 2);
    ctx.clip(); // 캔버스 밖으로 삐져나가지 않음!
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

    const wpRect = document.querySelector('.malatang-wrapper').getBoundingClientRect();
    const hitX = e.clientX - wpRect.left - (wpRect.width - canvas.width) / 2;
    const hitY = e.clientY - wpRect.top - (wpRect.height - canvas.height) / 2;

    const cursorLeft = hitX + (wpRect.width - canvas.width) / 2;
    const cursorTop = hitY + (wpRect.height - canvas.height) / 2;

    cursorHint.style.left = cursorLeft + 'px';
    cursorHint.style.top = cursorTop + 'px';

    lastMousePos = getMousePos(e);

    if (isDrawing) {
        if (currentToolType === 'broth') {
            drawStroke(lastMousePos.x, lastMousePos.y, 80, currentOpacity);
        } else if (currentToolType === 'noodle') {
            drawStroke(lastMousePos.x, lastMousePos.y, currentSize, currentOpacity);
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
            sfxBroth.play().catch(() => { });
        }

        ctx.beginPath();
        ctx.moveTo(lastMousePos.x, lastMousePos.y);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = currentColor;

        if (currentToolType === 'noodle') {
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 4;
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

        ctx.font = '60px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.save();
        ctx.translate(lastMousePos.x, lastMousePos.y);
        ctx.rotate((Math.random() - 0.5) * Math.PI * 0.4); // 살짝 회전
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
    const radius = 50; // 뿌려지는 반경
    const density = 15;

    ctx.fillStyle = currentColor;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 2;

    for (let i = 0; i < density; i++) {
        // 원형으로 분사
        const angle = Math.random() * Math.PI * 2;
        const rad = Math.random() * radius;
        const offsetX = Math.cos(angle) * rad;
        const offsetY = Math.sin(angle) * rad;

        ctx.beginPath();
        // 가루입자는 매우 작게
        ctx.arc(x + offsetX, y + offsetY, Math.random() * 2.5 + 1, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// 리셋 및 캡처
document.getElementById('clearBtn').addEventListener('click', () => {
    if (confirm('새 그릇을 준비할까요? 🍲🔥')) {
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
    exCtx.fillStyle = '#dfe6e9';
    exCtx.fillRect(0, 0, 600, 600);

    // 그릇(Bowl) 그리기
    const pCenter = { x: 300, y: 300 };
    exCtx.save();
    exCtx.translate(pCenter.x, pCenter.y);

    // 냄비 본체
    exCtx.beginPath();
    exCtx.arc(0, 0, 275, 0, Math.PI * 2); // 그릇 외곽
    exCtx.fillStyle = '#2d3436';
    exCtx.fill();

    // 빨간 테두리 선
    exCtx.lineWidth = 3;
    exCtx.strokeStyle = '#d63031';
    exCtx.stroke();

    exCtx.beginPath();
    exCtx.arc(0, 0, 250, 0, Math.PI * 2); // 그릇 안쪽
    exCtx.fillStyle = '#fdfbf7';
    exCtx.fill();
    exCtx.restore();

    // 캔버스(그린 내용) 얹기 (크기가 500x500이므로 중앙 300,300에 맞추려면 50,50에 두면 됨)
    exCtx.drawImage(canvas, 50, 50);

    const a = document.createElement('a');
    a.href = exportCanvas.toDataURL('image/png');
    a.download = 'my-malatang.png';
    a.click();

    if (sfxPop) sfxPop.play();
    alert('📸 맛있는 마라탕 사진이 갤러리에 저장됐어요!');
});

// 시작
setupCanvas();
