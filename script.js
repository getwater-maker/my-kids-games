// 스케치북(캔버스) 요정 불러오기
const canvas = document.getElementById('coloringCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
let currentTool = 'fill'; // 처음엔 물감 붓기 모드!
let currentColor = '#ff4757'; // 기본 색상은 예쁜 빨간색
let isDrawing = false; // 지금 그리고 있는지 확인
let currentImageSrc = 'assets/dinosaur.png';

// 친구들이 좋아할 만한 12가지 무지개 색깔들!
const colors = [
    '#ff4757', // 빨강 🍎
    '#ffa502', // 주황 🍊
    '#eccc68', // 노랑 🍌
    '#7bed9f', // 연두 🍈
    '#2ed573', // 초록 🥦
    '#70a1ff', // 하늘 👖
    '#1e90ff', // 파랑 🌊
    '#5352ed', // 보라 🍇
    '#ff6b81', // 분홍 🌸
    '#a4b0be', // 회색 🐘
    '#ffffff', // 하양 ☁️
    '#2f3542'  // 까망 🐾
];

// 화면에 동그란 물감 버튼들 만들기
const paletteContainer = document.getElementById('colorPalette');
colors.forEach(color => {
    const btn = document.createElement('button');
    btn.className = 'color-btn';
    btn.style.backgroundColor = color;
    if (color === currentColor) btn.classList.add('active'); // 처음에 선택된 색

    // 물감을 클릭하면 일어나는 마법
    btn.addEventListener('click', () => {
        // 다른 물감 선택 취소하고
        document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
        // 내가 누른 것만 선택되게!
        btn.classList.add('active');
        currentColor = color;
    });

    paletteContainer.appendChild(btn);
});

// 페인트, 크레파스, 지우개 도구 고르기
document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTool = btn.dataset.tool; // 내가 쓸 도구 이름 기억하기

        // 마우스 모양 바꾸는 마법
        if (currentTool === 'fill') canvas.style.cursor = 'crosshair'; // 물감붓기
        else if (currentTool === 'brush') canvas.style.cursor = 'crosshair'; // 그리기
        else if (currentTool === 'eraser') canvas.style.cursor = 'crosshair'; // 지우개
    });
});

// 스케치북 크기 맞추기 (선생님이 알아서 해주는 마법!)
function resizeCanvas() {
    const wrapper = document.querySelector('.canvas-wrapper');
    let targetWidth = wrapper.clientWidth - 40;
    let targetHeight = wrapper.clientHeight - 40;

    if (targetWidth / 4 > targetHeight / 3) {
        targetWidth = (targetHeight / 3) * 4;
    } else {
        targetHeight = (targetWidth / 4) * 3;
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    loadImage(currentImageSrc); // 그림 다시 올리기
}

window.addEventListener('resize', resizeCanvas);

// 밑그림 스케치북에 올리기
function loadImage(src) {
    if (!src) { // 빈 도화지일 때
        ctx.fillStyle = '#ffffff'; // 하얀색으로 칠하기
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return;
    }

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 그림 크기 예쁘게 조절
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        const nw = img.width * scale * 0.9;
        const nh = img.height * scale * 0.9;
        const x = (canvas.width - nw) / 2;
        const y = (canvas.height - nh) / 2;

        ctx.drawImage(img, x, y, nw, nh);
    };
    img.src = src;
}

// 밑그림 클릭해서 바꾸기
document.querySelectorAll('.template-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
        document.querySelectorAll('.template-thumb').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');

        if (thumb.id === 'blankTemplate') {
            currentImageSrc = null;
            loadImage(null);
        } else {
            currentImageSrc = thumb.dataset.src;
            loadImage(currentImageSrc);
        }
    });
});

// 다 지우기 버튼 마법
document.getElementById('clearBtn').addEventListener('click', () => {
    loadImage(currentImageSrc); // 처음으로 되돌리기
});

// 내 그림 저장하기 마법
document.getElementById('saveBtn').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = '내작품.png'; // 사진 이름 설정
    link.href = canvas.toDataURL('image/png'); // 마법의 사진 변환 주문
    link.click();
});

// 색깔 숫자로 바꾸기 (컴퓨터가 알아듣는 언어)
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
        a: 255
    } : { r: 0, g: 0, b: 0, a: 255 };
}

// 내가 마우스(나 손가락)로 누른 곳 찾기
function getMousePos(evt) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = evt.clientX;
    let clientY = evt.clientY;

    if (evt.touches && evt.touches.length > 0) {
        clientX = evt.touches[0].clientX;
        clientY = evt.touches[0].clientY;
    }

    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

// 마우스, 터치 이벤트 달아주기!
canvas.addEventListener('mousedown', startAction);
canvas.addEventListener('mousemove', moveAction);
canvas.addEventListener('mouseup', endAction);
canvas.addEventListener('mouseout', endAction);

canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startAction(e); }, { passive: false });
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); moveAction(e); }, { passive: false });
canvas.addEventListener('touchend', endAction);

// 꾹 눌렀을 때 시작하는 행동!
function startAction(e) {
    const pos = getMousePos(e);

    if (currentTool === 'fill') {
        // 물감을 확~ 부어버리는 마법 (Flood Fill!)
        floodFill(Math.floor(pos.x), Math.floor(pos.y), hexToRgb(currentColor));
    } else {
        isDrawing = true;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineCap = 'round'; // 둥글둥글하게
        ctx.lineJoin = 'round';
        if (currentTool === 'eraser') {
            ctx.strokeStyle = '#ffffff'; // 하얀색 크레파스 = 지우개
            ctx.lineWidth = 30; // 왕 크게!
        } else {
            ctx.strokeStyle = currentColor; // 예쁜 색 크레파스
            ctx.lineWidth = 15; // 뚱뚱하게!
        }
    }
}

// 스윽스윽 그리기
function moveAction(e) {
    if (!isDrawing) return; // 클릭 안 했으면 무시!
    const pos = getMousePos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
}

// 떼었을 때 행동!
function endAction() {
    if (!isDrawing) return;
    isDrawing = false;
    ctx.closePath();
}

// 컴퓨터가 똑똑하게 경계선을 찾아서 물감 채우는 마법! (Flood fill 요정)
function floodFill(startX, startY, fillColor) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;

    const startPos = (startY * width + startX) * 4;
    const startR = data[startPos];
    const startG = data[startPos + 1];
    const startB = data[startPos + 2];

    // 검정색 선(테두리)을 누르면 무시하기 (벽을 칠하면 안되니까!)
    const isBarrier = (r, g, b) => (r < 80 && g < 80 && b < 80);
    if (isBarrier(startR, startG, startB)) return;

    // 이미 같은 색이면 무시하기
    if (Math.abs(startR - fillColor.r) < 10 && Math.abs(startG - fillColor.g) < 10 && Math.abs(startB - fillColor.b) < 10) return;

    // 요정이 칠할 수 있는 색인지 확인
    const matchStartColor = (pos) => {
        const r = data[pos];
        const g = data[pos + 1];
        const b = data[pos + 2];
        const a = data[pos + 3];

        // 배경이랑 색이 비슷하고, 투명하지 않고 까만색 벽이 아니면 통과!
        return !isBarrier(r, g, b) && a > 0 && Math.abs(r - startR) < 30 && Math.abs(g - startG) < 30 && Math.abs(b - startB) < 30;
    };

    // 요정이 색칠함 뿅!
    const colorPixel = (pos) => {
        data[pos] = fillColor.r;
        data[pos + 1] = fillColor.g;
        data[pos + 2] = fillColor.b;
        data[pos + 3] = 255;
    };

    const queue = [[startX, startY]];

    while (queue.length > 0) {
        let [x, y] = queue.shift();
        let currentPos = (y * width + x) * 4;

        if (y < 0 || y >= height || x < 0 || x >= width) continue;
        if (!matchStartColor(currentPos)) continue;

        // 왼쪽 끝까지 이동!
        let leftX = x;
        while (leftX >= 0 && matchStartColor((y * width + leftX) * 4)) { leftX--; }
        leftX++;

        // 오른쪽 끝까지 이동!
        let rightX = x;
        while (rightX < width && matchStartColor((y * width + rightX) * 4)) { rightX++; }
        rightX--;

        let scanAbove = false;
        let scanBelow = false;

        // 가로로 한 줄 쭈욱 칠하기
        for (let currX = leftX; currX <= rightX; currX++) {
            colorPixel((y * width + currX) * 4);

            // 윗줄 확인
            if (y > 0) {
                if (matchStartColor(((y - 1) * width + currX) * 4)) {
                    if (!scanAbove) { queue.push([currX, y - 1]); scanAbove = true; }
                } else { scanAbove = false; }
            }

            // 아랫줄 확인
            if (y < height - 1) {
                if (matchStartColor(((y + 1) * width + currX) * 4)) {
                    if (!scanBelow) { queue.push([currX, y + 1]); scanBelow = true; }
                } else { scanBelow = false; }
            }
        }
    }

    ctx.putImageData(imageData, 0, 0); // 다 칠하면 스케치북에 업데이트!
}

// 0.1초 뒤에 스케치북 준비 완료!
setTimeout(resizeCanvas, 100);
