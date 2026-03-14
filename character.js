// 캐릭터 꾸미기 액션 🧚‍♀️

const canvas = document.getElementById('characterCanvas');
const ctx = canvas.getContext('2d');
const cursorHint = document.getElementById('cursorHint');

// 오디오 (옵션)
const sfxBrush = document.getElementById('sfx-brush');
const sfxPop = document.getElementById('sfx-pop');

const width = canvas.width;
const height = canvas.height;

// 도구 상태
let currentToolType = 'brush'; // 'brush', 'eraser', 'topping'
let currentColor = '#ff7979';
let currentSize = 30;
let currentOpacity = 1.0;
let currentItem = null;
let isDrawing = false;
let lastMousePos = { x: 0, y: 0 };

// 1. 도구 선택하기
document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        currentToolType = btn.dataset.tool;

        if (currentToolType === 'brush') {
            currentColor = btn.dataset.color || '#000000';
            currentSize = parseInt(btn.dataset.size || 30);
            currentOpacity = parseFloat(btn.dataset.opacity || 1.0);
            currentItem = null;
            cursorHint.innerText = btn.innerText.split(' ')[0]; // 🎀 같은 아이콘만 표시
        } else if (currentToolType === 'eraser') {
            currentItem = null;
            cursorHint.innerText = '🧽';
        } else if (currentToolType === 'topping') {
            currentItem = btn.dataset.val;
            cursorHint.innerText = currentItem;
        }
    });
});

function getMousePos(evt) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

canvas.addEventListener('mousemove', (e) => {
    cursorHint.style.display = 'block';

    const wpRect = document.querySelector('.character-wrapper').getBoundingClientRect();
    const hitX = e.clientX - wpRect.left - (wpRect.width - canvas.width) / 2;
    const hitY = e.clientY - wpRect.top - (wpRect.height - canvas.height) / 2;

    const cursorLeft = hitX + (wpRect.width - canvas.width) / 2;
    const cursorTop = hitY + (wpRect.height - canvas.height) / 2;

    cursorHint.style.left = cursorLeft + 'px';
    cursorHint.style.top = cursorTop + 'px';

    lastMousePos = getMousePos(e);

    if (isDrawing) {
        if (currentToolType === 'brush' || currentToolType === 'eraser') {
            drawStroke(lastMousePos.x, lastMousePos.y);
        }
    }
});

canvas.addEventListener('mouseout', () => {
    cursorHint.style.display = 'none';
});

canvas.addEventListener('mousedown', (e) => {
    lastMousePos = getMousePos(e);

    if (currentToolType === 'brush' || currentToolType === 'eraser') {
        isDrawing = true;

        if (currentToolType === 'brush' && sfxBrush) {
            sfxBrush.currentTime = 0;
            sfxBrush.play().catch(() => { });
        }

        ctx.beginPath();
        ctx.moveTo(lastMousePos.x, lastMousePos.y);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (currentToolType === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out'; // 지우기 모드
            ctx.lineWidth = 50;
            ctx.globalAlpha = 1.0;
        } else {
            ctx.globalCompositeOperation = 'source-over'; // 그리기 모드
            ctx.lineWidth = currentSize;
            ctx.strokeStyle = currentColor;
            ctx.globalAlpha = currentOpacity;

            // 머리카락이나 볼터치에 살짝 부드러운 효과
            ctx.shadowColor = currentColor;
            ctx.shadowBlur = 5;
        }

    } else if (currentToolType === 'topping') {
        if (sfxPop) {
            sfxPop.currentTime = 0;
            sfxPop.play().catch(() => { });
        }

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 4;

        ctx.font = '70px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.save();
        ctx.translate(lastMousePos.x, lastMousePos.y);
        // 살짝 기울이기 (옵션, 싫으면 제거가능)
        // ctx.rotate((Math.random() - 0.5) * Math.PI * 0.1); 
        ctx.fillText(currentItem, 0, 0);
        ctx.restore();

        cursorHint.animate([
            { transform: 'translate(-50%, -50%) scale(1)' },
            { transform: 'translate(-50%, -50%) scale(1.4)' },
            { transform: 'translate(-50%, -50%) scale(1)' }
        ], { duration: 200, easing: 'ease-out' });

        ctx.shadowColor = 'transparent'; // 그림자 끄기
    }
});

window.addEventListener('mouseup', () => {
    if (isDrawing) {
        isDrawing = false;

        if (currentToolType === 'brush' || currentToolType === 'eraser') {
            if (sfxBrush) sfxBrush.pause();
            ctx.closePath();
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'source-over'; // 원복
            ctx.shadowColor = 'transparent'; // 그림자 끄기
        }
    }
});

function drawStroke(x, y) {
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
}

// 리셋 및 캡처
document.getElementById('clearBtn').addEventListener('click', () => {
    if (confirm('모두 지우고 새로운 아이를 꾸며볼까요? ✨')) {
        ctx.clearRect(0, 0, width, height);
        if (sfxPop) sfxPop.play();
    }
});

document.getElementById('saveBtn').addEventListener('click', () => {
    // 저장용 캔버스 생성
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 600;
    exportCanvas.height = 700;
    const exCtx = exportCanvas.getContext('2d');

    // 배경 패턴!
    exCtx.fillStyle = '#f8f9fa';
    exCtx.fillRect(0, 0, 600, 700);
    // 점 패턴 그리기
    exCtx.fillStyle = '#fdcb6e';
    for (let i = 0; i < 600; i += 30) {
        for (let j = 0; j < 700; j += 30) {
            exCtx.beginPath();
            exCtx.arc(i, j, 1, 0, Math.PI * 2);
            exCtx.fill();
        }
    }

    // 캐릭터 그리기
    const pCenter = { x: 300, y: 350 };
    exCtx.save();
    exCtx.translate(pCenter.x, pCenter.y);

    // 몸통
    exCtx.shadowColor = 'rgba(0,0,0,0.1)';
    exCtx.shadowBlur = 15;
    exCtx.shadowOffsetY = 10;
    exCtx.fillStyle = '#81ecec';
    exCtx.beginPath();
    exCtx.roundRect(-90, 100, 180, 120, [80, 80, 30, 30]);
    exCtx.fill();

    // 목
    exCtx.shadowColor = 'transparent';
    exCtx.fillStyle = '#f5d0a9';
    exCtx.beginPath();
    exCtx.roundRect(-40, 60, 80, 80, [0, 0, 20, 20]);
    exCtx.fill();

    // 얼굴
    exCtx.shadowColor = 'rgba(0,0,0,0.15)';
    exCtx.fillStyle = '#ffe0bd';
    exCtx.beginPath();
    // 타원형 얼굴 (rx, ry)
    exCtx.ellipse(0, 0, 125, 125, 0, 0, Math.PI * 2);
    exCtx.fill();
    exCtx.restore();

    // 캔버스(그린 내용 - 머리카락, 표정) 얹기
    exCtx.drawImage(canvas, 25, 25);

    const a = document.createElement('a');
    a.href = exportCanvas.toDataURL('image/png');
    a.download = 'my-character.png';
    a.click();

    if (sfxPop) sfxPop.play();
    alert('📸 나만의 캐릭터 사진이 갤러리에 저장됐어요!');
});
