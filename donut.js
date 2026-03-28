// 도넛 만들기 로직 🍩

const canvas = document.getElementById('donutCanvas');
const ctx = canvas.getContext('2d');
const cursorHint = document.getElementById('cursorHint');

// 오디오
const sfxCream = document.getElementById('sfx-cream');
const sfxPop = document.getElementById('sfx-pop');
const sfxSprinkle = document.getElementById('sfx-sprinkle');

// 캔버스 크기
const width = canvas.width;
const height = canvas.height;
const centerX = width / 2;
const centerY = height / 2;

// 도구 상태
let currentToolType = 'icing'; // icing, sprinkle, topping
let currentColor = '#ff7979';
let currentItem = null; // sprinkle 타입이나 topping 이모지
let isDrawing = false;
let sprinkleInterval = null;
let lastMousePos = { x: 0, y: 0 };

// 1. 도넛 기본 빵(반죽) 굽기!
function drawBaseDonut() {
    // 모두 지우기 먼저! (source-over 상태로 되돌리기)
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, width, height);

    // 도넛 빵 그리기
    ctx.beginPath();
    // 바깥지름에서 안쪽지름을 뺀 형태가 되도록 두꺼운 선으로 원을 그림 (반지름 160, 두께 140)
    ctx.arc(centerX, centerY, 160, 0, Math.PI * 2);

    // 빵 색상 및 입체감
    ctx.lineWidth = 150;
    ctx.strokeStyle = '#f8c291'; // 구워진 반죽 색상

    // 그림자로 구워진 느낌 주면 안됨 (source-atop을 위해 깔끔한 마스크용이 필요함)
    ctx.stroke();

    // 약간의 빵결 디테일 (옵션)
    ctx.strokeStyle = '#e58e26';
    ctx.lineWidth = 10;
    ctx.stroke();

    // 중요! 이제부터 그리는 모든 것(시럽, 토핑)은 도넛 빵(이미 그려진 픽셀) 위에만 그려진다!
    ctx.globalCompositeOperation = 'source-atop';
}

// 2. 도구 선택하기
document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        currentToolType = btn.dataset.tool;

        if (currentToolType === 'icing') {
            currentColor = btn.dataset.color;
            currentItem = null;
            cursorHint.innerText = '🍦';
        } else if (currentToolType === 'sprinkle') {
            currentItem = btn.dataset.color; // 'rainbow', 'chocolate'
            cursorHint.innerText = '✨';
        } else if (currentToolType === 'topping') {
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

    // hint 위치 (canvas 좌상단에서 직접 계산)
    const wpRect = document.querySelector('.donut-wrapper').getBoundingClientRect();
    const hitX = e.clientX - wpRect.left;
    const hitY = e.clientY - wpRect.top;

    cursorHint.style.left = hitX + 'px';
    cursorHint.style.top = hitY + 'px';

    lastMousePos = getMousePos(e);

    if (isDrawing) {
        if (currentToolType === 'icing') {
            drawIcing(lastMousePos.x, lastMousePos.y);
        }
    }
});

canvas.addEventListener('mouseout', () => {
    cursorHint.style.display = 'none';
});

canvas.addEventListener('mousedown', (e) => {
    lastMousePos = getMousePos(e);

    if (currentToolType === 'icing') {
        isDrawing = true;
        sfxCream.currentTime = 0;
        sfxCream.play().catch(() => { });

        ctx.beginPath();
        ctx.moveTo(lastMousePos.x, lastMousePos.y);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 40; // 굵은 시럽
        ctx.strokeStyle = currentColor;

        // 반짝이는 입체감
        ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

    } else if (currentToolType === 'sprinkle') {
        isDrawing = true;
        sfxSprinkle.currentTime = 0;
        sfxSprinkle.play().catch(() => { });

        sprinkleInterval = setInterval(() => {
            if (isDrawing) drawSprinkle(lastMousePos.x, lastMousePos.y);
        }, 30);

    } else if (currentToolType === 'topping') {
        // 스티커 찍기
        sfxPop.currentTime = 0;
        sfxPop.play().catch(() => { });

        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;

        ctx.font = '60px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(currentItem, lastMousePos.x, lastMousePos.y);

        cursorHint.animate([
            { transform: 'translate(-50%, -50%) scale(1)' },
            { transform: 'translate(-50%, -50%) scale(1.5)' },
            { transform: 'translate(-50%, -50%) scale(1)' }
        ], { duration: 200, easing: 'ease-out' });
    }
});

window.addEventListener('mouseup', () => {
    if (isDrawing) {
        isDrawing = false;
        if (currentToolType === 'icing') {
            sfxCream.pause();
            ctx.closePath();
        } else if (currentToolType === 'sprinkle') {
            sfxSprinkle.pause();
            clearInterval(sprinkleInterval);
            sprinkleInterval = null;
        }
    }
});

// 아이싱 그리기
function drawIcing(x, y) {
    ctx.lineTo(x, y);
    ctx.stroke();

    // 시럽 중앙에 하이라이트 레이어 추가
    ctx.save();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 15;
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.restore();
}

// 스프링클 뿌리기
function drawSprinkle(x, y) {
    const radius = 35; // 뿌려지는 반경
    const offsetX = (Math.random() - 0.5) * radius * 2;
    const offsetY = (Math.random() - 0.5) * radius * 2;

    // 도넛 위에만 그려지므로 아무데나 뿌려도 도넛 밖으로 튀어나가지 않음!
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    ctx.translate(x + offsetX, y + offsetY);
    ctx.rotate(Math.random() * Math.PI * 2);

    if (currentItem === 'chocolate') {
        // 초코칩 (네모난 조각)
        ctx.fillStyle = '#3e2723';
        ctx.fillRect(-4, -4, 8, 8);
    } else {
        // 무지개 스프링클 (긴 알약모양)
        const colors = ['#ff4d4d', '#ffaf40', '#fffa65', '#32ff7e', '#18dcff', '#cd84f1'];
        ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
        // 캡슐모양 그리기
        ctx.beginPath();
        ctx.roundRect(-2, -6, 5, 12, 5);
        ctx.fill();
    }

    ctx.restore();
}

// 4. 지우기 / 저장하기 버튼
document.getElementById('clearBtn').addEventListener('click', () => {
    if (confirm('도넛 반죽을 새로 구울까요? 🍩🔥')) {
        drawBaseDonut();
        sfxPop.play();
    }
});

document.getElementById('saveBtn').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'my-donut.png';
    a.click();
    sfxPop.play();
    alert('📸 나만의 도넛이 갤러리에 저장됐어요!');
});

// 게임 시작 시 기본 도넛 굽기!
drawBaseDonut();
