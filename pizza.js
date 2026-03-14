// 피자 만들기 공방 게임 로직 🍕

const canvas = document.getElementById('pizzaCanvas');
const ctx = canvas.getContext('2d');
const cursorHint = document.getElementById('cursorHint');

// 오디오
const sfxSauce = document.getElementById('sfx-sauce');
const sfxPop = document.getElementById('sfx-pop');
const sfxSprinkle = document.getElementById('sfx-sprinkle');

// 캔버스 크기 및 중앙
const width = canvas.width;
const height = canvas.height;
const centerX = width / 2;
const centerY = height / 2;

// 피자 반죽 베이스 (크러스트와 베이스 도우)
const crustRadius = 260;
const doughRadius = 230;

// 도구 상태
let currentToolType = 'sauce'; // 'sauce', 'cheese', 'topping'
let currentColor = '#e74c3c';
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

        if (currentToolType === 'sauce') {
            currentColor = btn.dataset.color;
            currentItem = null;
            cursorHint.innerText = '🍅';
        } else if (currentToolType === 'cheese') {
            currentColor = btn.dataset.color;
            currentItem = null;
            cursorHint.innerText = '🧀';
        } else if (currentToolType === 'topping') {
            currentItem = btn.dataset.val;
            cursorHint.innerText = currentItem;
        }
    });
});

// 피자 베이스 도우 굽기 (기본 함수)
function drawBasePizza() {
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, width, height);

    // 크러스트 빵
    ctx.beginPath();
    ctx.arc(centerX, centerY, crustRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#f39c12'; // 구워진 크러스트 갈색
    ctx.fill();
    // 크러스트 입체 그림자
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;
    ctx.strokeStyle = '#e67e22';
    ctx.lineWidth = 15;
    ctx.stroke();

    // 리셋 그림자
    ctx.shadowColor = 'transparent';

    // 안쪽 반죽 (소스 바를 곳)
    ctx.beginPath();
    ctx.arc(centerX, centerY, doughRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#f1c40f'; // 연한 도우색
    ctx.fill();

    // 마스킹 효과 (소스와 치즈는 이 안쪽 원을 넘지 않게!)
    ctx.globalCompositeOperation = 'source-atop';
}


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

    const wpRect = document.querySelector('.pizza-wrapper').getBoundingClientRect();
    const hitX = e.clientX - wpRect.left;
    const hitY = e.clientY - wpRect.top;

    cursorHint.style.left = hitX + 'px';
    cursorHint.style.top = hitY + 'px';

    lastMousePos = getMousePos(e);

    if (isDrawing) {
        if (currentToolType === 'sauce') {
            drawSauce(lastMousePos.x, lastMousePos.y);
        }
    }
});

canvas.addEventListener('mouseout', () => {
    cursorHint.style.display = 'none';
});

canvas.addEventListener('mousedown', (e) => {
    lastMousePos = getMousePos(e);

    if (currentToolType === 'sauce') {
        isDrawing = true;
        sfxSauce.currentTime = 0;
        sfxSauce.play().catch(() => { });

        // 소스 바르기: source-atop이 적용되어 도우 바깥으로 안 나감!
        ctx.beginPath();
        ctx.moveTo(lastMousePos.x, lastMousePos.y);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 60; // 굵은 소스 국자
        ctx.strokeStyle = currentColor;

        // 약간의 깊이감을 위한 그림자 마법
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 10;

    } else if (currentToolType === 'cheese') {
        isDrawing = true;
        sfxSprinkle.currentTime = 0;
        sfxSprinkle.play().catch(() => { });

        sprayInterval = setInterval(() => {
            if (isDrawing) drawCheese(lastMousePos.x, lastMousePos.y);
        }, 15);

    } else if (currentToolType === 'topping') {
        // 토핑 찍기! 
        sfxPop.currentTime = 0;
        sfxPop.play().catch(() => { });

        // 토핑부터는 크러스트 위에도 올라갈 수 있게 source-over로 살짝 전환!
        // 하지만 소스/치즈 때문에 기본이 source-atop 이므로, 찍기 전에 source-over, 찍고 다시 source-atop 복귀!
        ctx.globalCompositeOperation = 'source-over';

        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;

        ctx.font = '65px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.save();
        ctx.translate(lastMousePos.x, lastMousePos.y);
        // 토핑을 살짝씩 자연스럽게 회전! (모짜렐라 피자처럼)
        ctx.rotate((Math.random() - 0.5) * Math.PI);
        ctx.fillText(currentItem, 0, 0);
        ctx.restore();

        cursorHint.animate([
            { transform: 'translate(-50%, -50%) scale(1)' },
            { transform: 'translate(-50%, -50%) scale(1.5)' },
            { transform: 'translate(-50%, -50%) scale(1)' }
        ], { duration: 200, easing: 'ease-out' });

        ctx.shadowColor = 'transparent';
        ctx.globalCompositeOperation = 'source-atop'; // 다시 복귀
    }
});

window.addEventListener('mouseup', () => {
    if (isDrawing) {
        isDrawing = false;

        if (currentToolType === 'sauce') {
            sfxSauce.pause();
            ctx.closePath();
        } else if (currentToolType === 'cheese' && sprayInterval) {
            sfxSprinkle.pause();
            clearInterval(sprayInterval);
            sprayInterval = null;
        }
    }
});


function drawSauce(x, y) {
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
}

function drawCheese(x, y) {
    const radius = 50;
    const density = 15;

    ctx.fillStyle = currentColor;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 3;

    for (let i = 0; i < density; i++) {
        const offsetX = (Math.random() - 0.5) * radius * 2;
        const offsetY = (Math.random() - 0.5) * radius * 2;

        if (offsetX * offsetX + offsetY * offsetY <= radius * radius) {
            // 치즈 가닥 느낌나게 살짝 길게
            ctx.beginPath();
            ctx.ellipse(x + offsetX, y + offsetY, Math.random() * 8 + 3, Math.random() * 2 + 1, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
}

// 4. 리셋 및 캡처!
document.getElementById('clearBtn').addEventListener('click', () => {
    if (confirm('새 반죽을 꺼내 도우를 펼칠까요? 🍕 🔥')) {
        drawBasePizza();
        sfxPop.play();
    }
});

document.getElementById('saveBtn').addEventListener('click', () => {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width + 100;
    exportCanvas.height = canvas.height + 100;
    const exCtx = exportCanvas.getContext('2d');

    // 나무 무늬 배경 (간단히 그리기)
    exCtx.fillStyle = '#d2b48c';
    exCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    exCtx.fillStyle = '#5a3a22'; // 도마 베이스

    // 도마 그리기
    const pCenter = { x: exportCanvas.width / 2, y: exportCanvas.height / 2 };
    exCtx.save();
    exCtx.translate(pCenter.x, pCenter.y);
    exCtx.beginPath();
    exCtx.arc(0, 0, crustRadius + 30, 0, Math.PI * 2);
    exCtx.fill();
    // 손잡이
    exCtx.fillRect(crustRadius, -40, 100, 80);
    exCtx.restore();

    // 캔버스 얹기
    exCtx.drawImage(canvas, 50, 50);

    const a = document.createElement('a');
    a.href = exportCanvas.toDataURL('image/png');
    a.download = 'my-pizza.png';
    a.click();

    sfxPop.play();
    alert('📸 갓 구운 피자가 자랑스럽게 갤러리에 저장됐어요!');
});


// 시작 시 기본 반죽 세팅!
drawBasePizza();
