// 스케치북(캔버스) 요정 불러오기
const canvas = document.getElementById('coloringCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

// 회전판 마법을 위한 '진짜 스케치북' (여기다 그리고, 화면에는 돌아가는 걸 보여줌!)
const offCanvas = document.createElement('canvas');
const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });

let isSpinning = false;
let rotationAngle = 0;
let mousePos = null;

let currentTool = 'pipe'; // 처음엔 짤주머니!
let currentColor = '#ff9ff3'; // 예쁜 분홍색 크림
let isDrawing = false;
const currentImageSrc = 'assets/cake.png'; // 무조건 케이크 그림!

// 토핑 이미지 요정들 불러오기
const stampImages = {
    'stamp_strawberry': new Image(),
    'stamp_cherry': new Image(),
    'stamp_star': new Image()
};
stampImages['stamp_strawberry'].src = 'assets/cake/strawberry_2d.png';
stampImages['stamp_cherry'].src = 'assets/cake/cherry_2d.png';
stampImages['stamp_star'].src = 'assets/cake/star_2d.png';

const pipingBagImg = new Image();
pipingBagImg.src = 'assets/cake/piping_bag.png';

// 친구들이 좋아할 만한 12가지 달콤한 크림 색깔들!
const colors = [
    '#ff9ff3', '#feca57', '#ff6b6b', '#48dbfb',
    '#1dd1a1', '#c8d6e5', '#5f27cd', '#ff9f43',
    '#222f3e', '#01a3a4', '#ffffff', '#c0392b'
];

// 화면에 동그란 물감 버튼들 만들기
const paletteContainer = document.getElementById('colorPalette');
colors.forEach(color => {
    const btn = document.createElement('button');
    btn.className = 'color-btn';
    btn.style.backgroundColor = color;
    if (color === currentColor) btn.classList.add('active'); // 처음에 선택된 색

    btn.addEventListener('click', () => {
        document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentColor = color;

        if (currentTool.startsWith('stamp_')) {
            document.querySelector('[data-tool="pipe"]').click();
        }
    });

    paletteContainer.appendChild(btn);
});

// 도구 고르기
document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTool = btn.dataset.tool;

        // 마우스 모양 바꾸는 마법
        if (currentTool === 'pipe') canvas.style.cursor = 'none'; // 짤주머니 그림으로 가리기
        else if (currentTool === 'fill') canvas.style.cursor = 'crosshair';
        else if (currentTool === 'brush') canvas.style.cursor = 'crosshair';
        else if (currentTool === 'eraser') canvas.style.cursor = 'crosshair';
        else canvas.style.cursor = 'pointer';
    });
});
// 시작할때 짤주머니 모양 가리기
canvas.style.cursor = 'none';

// 회전판 마법 버튼
document.getElementById('spinBtn').addEventListener('click', (e) => {
    isSpinning = !isSpinning;
    if (isSpinning) {
        e.target.innerText = '⏸️ 회전판 멈추기';
        e.target.style.backgroundColor = '#ff7675';
        e.target.style.boxShadow = '0 4px 0 #d63031';
    } else {
        e.target.innerText = '🔄 회전판 켜기';
        e.target.style.backgroundColor = '#f368e0';
        e.target.style.boxShadow = '0 4px 0 #b33939';
    }
});

// 스케치북 크기 맞추기
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
    offCanvas.width = targetWidth;
    offCanvas.height = targetHeight;
    loadImage(currentImageSrc);
}

window.addEventListener('resize', resizeCanvas);

// 밑그림 스케치북에 올리기
function loadImage(src) {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
        offCtx.fillStyle = '#ffffff';
        offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);

        const scale = Math.min(offCanvas.width / img.width, offCanvas.height / img.height);
        const nw = img.width * scale * 0.9;
        const nh = img.height * scale * 0.9;
        const x = (offCanvas.width - nw) / 2;
        const y = (offCanvas.height - nh) / 2;

        offCtx.drawImage(img, x, y, nw, nh);
    };
    img.src = src;
}

// 빙글빙글 화면 그리기 요정
function renderLoop() {
    requestAnimationFrame(renderLoop);

    // 화면 깨끗하게 지우기
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Y축 기준 회전 (케이크 돌아가는 효과)
    ctx.translate(canvas.width / 2, canvas.height / 2);
    if (isSpinning) {
        rotationAngle += 0.01; // 천천히 돌아라!
    }
    ctx.scale(Math.cos(rotationAngle), 1);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    // 진짜 그려진 스케치북 도화지 복사해서 보여주기
    ctx.drawImage(offCanvas, 0, 0);
    ctx.restore();

    // 짤주머니 마우스 따라다니기!
    if (currentTool === 'pipe' && mousePos) {
        // 이미지가 크니까 적당히 줄이기
        ctx.drawImage(pipingBagImg, mousePos.appX - 40, mousePos.appY - 100, 100, 100);
    }
}
renderLoop(); // 요정 일 시작!

document.getElementById('clearBtn').addEventListener('click', () => {
    rotationAngle = 0; // 회전 멈추고 리셋
    loadImage(currentImageSrc);
});

document.getElementById('saveBtn').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = '내케이크.png';
    // 저장할 때는 돌아가는 화면 그대로 저장!
    link.href = canvas.toDataURL('image/png');
    link.click();
});

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16), a: 255 } : null;
}

// 회전을 고려한 똑똑한 위치 찾기 요정
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

    let appX = (clientX - rect.left) * scaleX;
    let appY = (clientY - rect.top) * scaleY;

    mousePos = { appX: appX, appY: appY };

    // Y축 회전 역변환으로 진짜 캔버스 위치 계산!
    let cx = canvas.width / 2;
    let dx = appX - cx;
    let cosA = Math.cos(rotationAngle);

    // cos가 0에 가까우면 (옆면 보일 때) 그리기 불가
    let realX = Math.abs(cosA) > 0.01 ? dx / cosA + cx : cx;
    let realY = appY; // Y축은 그대로

    return {
        x: realX,
        y: realY
    };
}

canvas.addEventListener('mousedown', startAction);
canvas.addEventListener('mousemove', moveAction);
canvas.addEventListener('mouseup', endAction);
canvas.addEventListener('mouseout', (e) => {
    endAction();
    mousePos = null; // 마우스 나가면 짤주머니도 사라짐
});

canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startAction(e); }, { passive: false });
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); moveAction(e); }, { passive: false });
canvas.addEventListener('touchend', (e) => {
    endAction();
    mousePos = null;
});

function startAction(e) {
    const pos = getMousePos(e);

    if (currentTool.startsWith('stamp_')) {
        const stampStr = currentTool;
        const img = stampImages[stampStr];
        const stampSize = 80;
        offCtx.drawImage(img, pos.x - stampSize / 2, pos.y - stampSize / 2, stampSize, stampSize);
    }
    else if (currentTool === 'fill') {
        floodFill(Math.floor(pos.x), Math.floor(pos.y), hexToRgb(currentColor));
    }
    else {
        isDrawing = true;
        offCtx.beginPath();
        offCtx.moveTo(pos.x, pos.y);
        offCtx.lineCap = 'round';
        offCtx.lineJoin = 'round';

        if (currentTool === 'eraser') {
            offCtx.strokeStyle = '#ffffff';
            offCtx.lineWidth = 30;
            offCtx.shadowColor = 'transparent';
        } else if (currentTool === 'pipe') {
            offCtx.strokeStyle = currentColor;
            offCtx.lineWidth = 25; // 두껍게
            offCtx.shadowColor = 'rgba(0,0,0,0.3)'; // 입체그림자
            offCtx.shadowBlur = 4;
            offCtx.shadowOffsetX = 2;
            offCtx.shadowOffsetY = 2;
        } else {
            offCtx.strokeStyle = currentColor;
            offCtx.lineWidth = 10;
            offCtx.shadowColor = 'transparent';
        }
    }
}

function moveAction(e) {
    const pos = getMousePos(e);
    if (!isDrawing) return;
    offCtx.lineTo(pos.x, pos.y);
    offCtx.stroke();
}

function endAction() {
    if (!isDrawing) return;
    isDrawing = false;
    offCtx.closePath();
    offCtx.shadowColor = 'transparent'; // 끝날 때 그림자 제거
}

// 색칠 요정 (Flood fill) - 이제 offCtx 에서 작업!
function floodFill(startX, startY, fillColor) {
    const imageData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
    const data = imageData.data;
    const width = offCanvas.width;
    const height = offCanvas.height;

    const startPos = (startY * width + startX) * 4;
    const startR = data[startPos];
    const startG = data[startPos + 1];
    const startB = data[startPos + 2];

    const isBarrier = (r, g, b) => (r < 80 && g < 80 && b < 80);
    if (isBarrier(startR, startG, startB)) return;
    if (Math.abs(startR - fillColor.r) < 10 && Math.abs(startG - fillColor.g) < 10 && Math.abs(startB - fillColor.b) < 10) return;

    const matchStartColor = (pos) => {
        const r = data[pos];
        const g = data[pos + 1];
        const b = data[pos + 2];
        const a = data[pos + 3];
        return !isBarrier(r, g, b) && a > 0 && Math.abs(r - startR) < 30 && Math.abs(g - startG) < 30 && Math.abs(b - startB) < 30;
    };

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

        let leftX = x;
        while (leftX >= 0 && matchStartColor((y * width + leftX) * 4)) { leftX--; }
        leftX++;

        let rightX = x;
        while (rightX < width && matchStartColor((y * width + rightX) * 4)) { rightX++; }
        rightX--;

        let scanAbove = false;
        let scanBelow = false;

        for (let currX = leftX; currX <= rightX; currX++) {
            colorPixel((y * width + currX) * 4);

            if (y > 0) {
                if (matchStartColor(((y - 1) * width + currX) * 4)) {
                    if (!scanAbove) { queue.push([currX, y - 1]); scanAbove = true; }
                } else { scanAbove = false; }
            }
            if (y < height - 1) {
                if (matchStartColor(((y + 1) * width + currX) * 4)) {
                    if (!scanBelow) { queue.push([currX, y + 1]); scanBelow = true; }
                } else { scanBelow = false; }
            }
        }
    }
    offCtx.putImageData(imageData, 0, 0);
}

setTimeout(resizeCanvas, 100);
