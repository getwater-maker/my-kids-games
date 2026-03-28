// 빙수 만들기 로직 🍧

const canvas = document.getElementById('bingsuCanvas');
const ctx = canvas.getContext('2d');
const cursorHint = document.getElementById('cursorHint');

// 오디오
const sfxIce = document.getElementById('sfx-ice');
const sfxPop = document.getElementById('sfx-pop');

// 캔버스 중앙 위치 및 환경설정
const width = canvas.width;
const height = canvas.height;
// 실제 그릇의 센터 위치 (css bowl은 bottom 50px, 높이 180px -> y좌표 기준 약 420 ~ 600)
// 따라서 그릇 상단 라인은 Y=420 부근이다.
const bowlTopY = 420;
const centerX = width / 2;

// 도구 상태
let currentToolType = 'ice'; // 'ice', 'syrup', 'topping'
let currentColor = '#ffffff';
let currentItem = null;
let isDrawing = false;
let sprayInterval = null;
let lastMousePos = { x: 0, y: 0 };


// 1. 도구 선택하기
document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        currentToolType = btn.dataset.tool;

        if (currentToolType === 'ice') {
            currentColor = btn.dataset.color;
            currentItem = null;
            cursorHint.innerText = '🧊';
        } else if (currentToolType === 'syrup') {
            currentColor = btn.dataset.color;
            currentItem = null;
            cursorHint.innerText = '🍯';
        } else if (currentToolType === 'topping') {
            currentItem = btn.dataset.val;
            cursorHint.innerText = currentItem;
        }
    });
});

// 2. 마우스 드로잉 이벤트
function getMousePos(evt) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

canvas.addEventListener('mousemove', (e) => {
    cursorHint.style.display = 'block';

    // hint 위치
    const wpRect = document.querySelector('.bingsu-wrapper').getBoundingClientRect();
    const hitX = e.clientX - wpRect.left;
    const hitY = e.clientY - wpRect.top;

    cursorHint.style.left = hitX + 'px';
    cursorHint.style.top = hitY + 'px';

    lastMousePos = getMousePos(e);

    if (isDrawing) {
        if (currentToolType === 'syrup') {
            drawSyrup(lastMousePos.x, lastMousePos.y);
        }
    }
});

canvas.addEventListener('mouseout', () => {
    cursorHint.style.display = 'none';
});

canvas.addEventListener('mousedown', (e) => {
    lastMousePos = getMousePos(e);

    if (currentToolType === 'syrup') {
        isDrawing = true;
        sfxIce.currentTime = 0;
        sfxIce.play().catch(() => { });

        ctx.beginPath();
        ctx.moveTo(lastMousePos.x, lastMousePos.y);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 25; // 두꺼운 시럽 줄기
        ctx.strokeStyle = currentColor;

    } else if (currentToolType === 'ice') {
        isDrawing = true;
        sfxIce.currentTime = 0;
        sfxIce.play().catch(() => { });

        // 얼음 갈기 지속 분사
        sprayInterval = setInterval(() => {
            if (isDrawing) drawIce(lastMousePos.x, lastMousePos.y);
        }, 15);

    } else if (currentToolType === 'topping') {
        sfxPop.currentTime = 0;
        sfxPop.play().catch(() => { });

        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;

        ctx.font = '70px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(currentItem, lastMousePos.x, lastMousePos.y);

        cursorHint.animate([
            { transform: 'translate(-50%, -50%) scale(1)' },
            { transform: 'translate(-50%, -50%) scale(1.5)' },
            { transform: 'translate(-50%, -50%) scale(1)' }
        ], { duration: 200, easing: 'ease-out' });

        // 초기화
        ctx.shadowColor = 'transparent';
    }
});

window.addEventListener('mouseup', () => {
    if (isDrawing) {
        isDrawing = false;
        if (currentToolType === 'syrup') {
            sfxIce.pause();
            ctx.closePath();
        } else if (currentToolType === 'ice') {
            sfxIce.pause();
            clearInterval(sprayInterval);
            sprayInterval = null;
        }
    }
});

// 시럽 그리기 (투명 레이어)
function drawSyrup(x, y) {
    ctx.lineTo(x, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, y);
}

// 얼음 그리기 (스프레이 방식)
function drawIce(x, y) {
    // 둥근 솜사탕처럼 퍼지게
    const radius = 40;
    const density = 20;

    ctx.save();

    // 약간의 푸른빛~흰색 섞어서 입체감
    for (let i = 0; i < density; i++) {
        const offsetX = (Math.random() - 0.5) * radius * 2;
        const offsetY = (Math.random() - 0.5) * radius * 2;

        if (offsetX * offsetX + offsetY * offsetY <= radius * radius) {

            ctx.fillStyle = Math.random() > 0.3 ? '#ffffff' : '#f1f2f6';

            ctx.beginPath();
            ctx.arc(x + offsetX, y + offsetY, Math.random() * 8 + 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // 외곽 부드러운 하이라이트 글로우
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur = 10;

    // 그리기 (빈 원)
    ctx.beginPath();
    ctx.arc(x, y, radius - 10, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fill();

    ctx.restore();
}

// 4. 지우기 / 저장하기 버튼
document.getElementById('clearBtn').addEventListener('click', () => {
    if (confirm('새 그릇을 준비할까요? 만든 빙수가 다 지워져요! 🧊')) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        sfxPop.play();
    }
});

document.getElementById('saveBtn').addEventListener('click', () => {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width + 100; // 좀더 넓게
    exportCanvas.height = canvas.height + 150;
    const exCtx = exportCanvas.getContext('2d');

    // 뒷 배경 채우기
    exCtx.fillStyle = '#f5f6fa';
    exCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // 빙수 윗부분
    exCtx.drawImage(canvas, 50, 0);

    // 저장
    const a = document.createElement('a');
    a.href = exportCanvas.toDataURL('image/png');
    a.download = 'my-bingsu.png';
    a.click();
    sfxPop.play();
    alert('📸 나만의 빙수가 저장됐어요!');
});
