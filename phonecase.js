// 폰케이스 꾸미기 게임 로직 📱🎀

const phoneCase = document.getElementById('phoneCase');
const canvas = document.getElementById('caseCanvas');
const ctx = canvas.getContext('2d');
const cursorHint = document.getElementById('cursorHint');

// 오디오
const sfxCream = document.getElementById('sfx-cream');
const sfxPop = document.getElementById('sfx-pop');

// 현재 도구 상태
let currentToolType = 'piping'; // 'piping' 또는 'sticker'
let currentColor = '#ffffff';
let currentSticker = null;
let isDrawing = false;
let sprayInterval = null;
let lastMousePos = { x: 0, y: 0 };

// 1. 케이스 색상 바꾸기 (CSS Background)
const caseColors = {
    white: 'linear-gradient(135deg, #ffffff 0%, #f1f2f6 100%)',
    pink: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    purple: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    mint: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
    sunset: 'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
    night: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)'
};

document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // 기존 active 제거
        document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // 배경색 적용
        const colorName = btn.dataset.color;
        phoneCase.style.background = caseColors[colorName];
    });
});

// 2. 도구 선택하기 (생크림 vs 지비츠 스티커)
document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // 기존 버튼 리셋
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        currentToolType = btn.dataset.tool;

        if (currentToolType === 'piping') {
            currentColor = btn.dataset.color;
            currentSticker = null;
            cursorHint.innerText = '🍦';
        } else if (currentToolType === 'spray') {
            currentColor = btn.dataset.color;
            currentSticker = null;
            cursorHint.innerText = '💨';
        } else if (currentToolType === 'sticker') {
            currentSticker = btn.dataset.val;
            cursorHint.innerText = currentSticker;
        }
    });
});

// 3. 마우스 드로잉 이벤트 (캔버스)
// 좌표 구하기 마법사
function getMousePos(evt) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

// 캔버스 위에 마우스를 올리면 힌트 마우스 포인터 따라다니게 하기
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    cursorHint.style.display = 'block';

    // Position absolute relative to phone-wrapper
    const wpRect = document.getElementById('phoneWrapper').getBoundingClientRect();
    const hitX = e.clientX - wpRect.left;
    const hitY = e.clientY - wpRect.top;

    cursorHint.style.left = hitX + 'px';
    cursorHint.style.top = hitY + 'px';

    lastMousePos = getMousePos(e);

    // 생크림 그리는 중이면 계속 그리기
    if (isDrawing && currentToolType === 'piping') {
        drawPiping(lastMousePos.x, lastMousePos.y);
    }
});

canvas.addEventListener('mouseout', () => {
    cursorHint.style.display = 'none';
});

// 마우스 누르면 (스티커 찍기 or 생크림/스프레이 시작)
canvas.addEventListener('mousedown', (e) => {
    const pos = getMousePos(e);
    lastMousePos = pos;

    if (currentToolType === 'piping') {
        isDrawing = true;
        // 생크림 소리
        sfxCream.currentTime = 0;
        sfxCream.play().catch(console.error);

        // 브러쉬 설정 초기화 (동그란 생크림)
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 25;
        ctx.strokeStyle = currentColor;

        // 입체감을 위한 그림자 마법사
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;

    } else if (currentToolType === 'spray') {
        isDrawing = true;
        sfxCream.currentTime = 0;
        sfxCream.play().catch(console.error);

        // 락카 계속 뿌리기 타이머
        sprayInterval = setInterval(() => {
            if (isDrawing) drawSpray(lastMousePos.x, lastMousePos.y);
        }, 15);

    } else if (currentToolType === 'sticker') {
        // 스티커 찍기! (이모지 도장)
        sfxPop.currentTime = 0;
        sfxPop.play().catch(console.error);

        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 4;

        ctx.font = '50px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(currentSticker, pos.x, pos.y);

        // 퐁! 하고 커지는 애니메이션 (힌트에 적용)
        cursorHint.animate([
            { transform: 'translate(-50%, -50%) scale(1)' },
            { transform: 'translate(-50%, -50%) scale(1.5)' },
            { transform: 'translate(-50%, -50%) scale(1)' }
        ], { duration: 200, easing: 'ease-out' });
    }
});

// 마우스 떼기 (생크림 끝)
window.addEventListener('mouseup', () => {
    if (isDrawing) {
        isDrawing = false;
        sfxCream.pause();
        if (currentToolType === 'piping') {
            ctx.closePath();
        }
        if (sprayInterval) {
            clearInterval(sprayInterval);
            sprayInterval = null;
        }
    }
});

// 생크림 그리기 함수
function drawPiping(x, y) {
    ctx.lineTo(x, y);
    ctx.stroke();

    // 생크림의 "주름" 디테일을 위해 위에 살짝 밝은색 덧칠
    ctx.save();
    ctx.shadowColor = 'transparent'; // 내부엔 그림자 빼기
    ctx.lineWidth = 15;
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; // 밝은 하이라이트
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.restore();
}

// 스프레이(락카) 그리기 함수
function drawSpray(x, y) {
    const radius = 25; // 락카 퍼지는 정도
    const density = 60; // 한 번에 찍히는 점 개수

    ctx.fillStyle = currentColor;
    ctx.save();
    ctx.shadowColor = 'transparent'; // 스프레이는 자연스러운 도트 

    for (let i = 0; i < density; i++) {
        const offsetX = (Math.random() - 0.5) * radius * 2;
        const offsetY = (Math.random() - 0.5) * radius * 2;

        if (offsetX * offsetX + offsetY * offsetY <= radius * radius) {
            ctx.fillRect(x + offsetX, y + offsetY, 1.5, 1.5);
        }
    }
    ctx.restore();
}

// 4. 지우기 / 저장하기 버튼
document.getElementById('clearBtn').addEventListener('click', () => {
    if (confirm('진짜 다 지우고 새 폰케이스를 꺼낼까요? 🗑️')) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        sfxPop.play();
    }
});

document.getElementById('saveBtn').addEventListener('click', () => {
    // 폰 배경화면 + 캔버스 그림 함께 저장하기!

    // 숨겨진 합성기(Canvas)를 만들어서 뒷면 배경색까지 통째로 사진 찍기
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exCtx = exportCanvas.getContext('2d');

    // 모서리 둥글게 자르기 (CSS랑 똑같이 50px)
    exCtx.beginPath();
    exCtx.roundRect(0, 0, canvas.width, canvas.height, 50);
    exCtx.clip();

    // 현재 CSS 폰케이스 배경색 가져와서 칠하기
    const cs = window.getComputedStyle(phoneCase);
    exCtx.fillStyle = cs.background;

    // getComputedStyle.background가 gradient를 완벽하게 못그리므로
    // 현재 활성화된 color-btn을 찾아 그라데이션 직접 적용 (임시방편)
    const activeColorBtn = document.querySelector('.color-btn.active');
    const colorType = activeColorBtn ? activeColorBtn.dataset.color : 'white';

    // 간단히 단색이나 하드코딩 그라디언트로 채우기
    let gd = exCtx.createLinearGradient(0, 0, 320, 640);
    if (colorType === 'white') { gd.addColorStop(0, '#ffffff'); gd.addColorStop(1, '#f1f2f6'); }
    else if (colorType === 'pink') { gd.addColorStop(0, '#ff9a9e'); gd.addColorStop(1, '#fecfef'); }
    else if (colorType === 'purple') { gd.addColorStop(0, '#a18cd1'); gd.addColorStop(1, '#fbc2eb'); }
    else if (colorType === 'mint') { gd.addColorStop(0, '#84fab0'); gd.addColorStop(1, '#8fd3f4'); }
    else if (colorType === 'sunset') { gd.addColorStop(0, '#fccb90'); gd.addColorStop(1, '#d57eeb'); }
    else if (colorType === 'night') { gd.addColorStop(0, '#30cfd0'); gd.addColorStop(1, '#330867'); }
    else { gd.addColorStop(0, '#fff'); gd.addColorStop(1, '#f1f2f6'); }

    exCtx.fillStyle = gd;
    exCtx.fillRect(0, 0, canvas.width, canvas.height);

    // 그 위에 내가 그린 스티커/크레파스 덧붙이기
    exCtx.drawImage(canvas, 0, 0);

    // 카메라 구멍 그리기 (검정 렌즈 느낌)
    exCtx.fillStyle = 'rgba(255,255,255,0.4)';
    exCtx.roundRect(30, 30, 100, 105, 25);
    exCtx.fill();
    exCtx.fillStyle = '#1e272e';
    exCtx.beginPath(); exCtx.arc(55, 60, 17, 0, Math.PI * 2); exCtx.fill();
    exCtx.beginPath(); exCtx.arc(55, 105, 17, 0, Math.PI * 2); exCtx.fill();

    // 저장 링크 뾰로롱
    const a = document.createElement('a');
    a.href = exportCanvas.toDataURL('image/png');
    a.download = 'my-phonecase.png';
    a.click();

    sfxPop.play();
    alert('📸 폰케이스가 갤러리에 저장됐어요!');
});
