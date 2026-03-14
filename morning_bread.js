const state = {
    step: 'knead',
    kneadCount: 0,
    kneadTarget: 15,
    timer: 5, // shortened for fun, 5 seconds
    selectedTool: null,
    decorations: []
};

// DOM Elements
const els = {
    stepDesc: document.getElementById('step-desc'),
    kneadArea: document.getElementById('knead-area'),
    ovenArea: document.getElementById('oven-area'),
    decorArea: document.getElementById('decor-area'),
    dough: document.getElementById('dough'),
    kneadProgress: document.getElementById('knead-progress'),
    bakeBtn: document.getElementById('bake-btn'),
    timer: document.getElementById('timer'),
    ovenContent: document.getElementById('oven-content'),
    decorCanvas: document.getElementById('decorCanvas'),
    resetBtn: document.getElementById('resetBtn'),
    saveBtn: document.getElementById('saveBtn'),
    tools: document.querySelectorAll('.decor-item'),
    toast: document.getElementById('toast'),
    miniDough: document.querySelector('.mini-dough')
};

const ctx = els.decorCanvas.getContext('2d');
let breadImg = new Image();
breadImg.src = 'assets/morning_bread_baked.png';

// Initialize
function init() {
    setupEventListeners();
    showStage('knead');
}

function setupEventListeners() {
    // Stage 1: Knead
    els.dough.addEventListener('click', handleKnead);

    // Stage 2: Bake
    els.bakeBtn.addEventListener('click', startBaking);

    // Stage 3: Decorate
    els.decorCanvas.addEventListener('mousedown', startDecorating);
    els.tools.forEach(tool => {
        tool.addEventListener('click', () => {
            els.tools.forEach(t => t.classList.remove('active'));
            tool.classList.add('active');
            state.selectedTool = tool.getAttribute('data-item');
        });
    });

    els.resetBtn.addEventListener('click', () => location.reload());
    els.saveBtn.addEventListener('click', saveCanvas);
}

function handleKnead() {
    if (state.step !== 'knead') return;

    state.kneadCount++;
    const progress = (state.kneadCount / state.kneTarget) * 100; // Oops, typo in target name, let's fix it
    
    // Manual fix for state access
    const target = state.kneadTarget;
    const p = Math.min((state.kneadCount / target) * 100, 100);
    els.kneadProgress.style.width = p + '%';

    // Animation effect
    els.dough.style.transform = 'scale(0.9) translateY(10px)';
    setTimeout(() => {
        els.dough.style.transform = 'scale(1)';
    }, 100);

    if (state.kneadCount >= target) {
        showToast("반죽 완성! 이제 오븐에 구워볼까요?");
        setTimeout(() => showStage('oven'), 1000);
    }
}

function startBaking() {
    state.step = 'baking';
    els.bakeBtn.style.display = 'none';
    document.querySelector('.oven-wrapper').classList.add('oven-active');
    
    let timeLeft = state.timer;
    els.timer.innerText = "00:0" + timeLeft;

    const interval = setInterval(() => {
        timeLeft--;
        els.timer.innerText = "00:0" + timeLeft;
        
        // Change color of dough slowly
        const bakedRatio = (state.timer - timeLeft) / state.timer;
        els.miniDough.style.filter = `sepia(${bakedRatio}) saturate(${1 + bakedRatio}) brightness(${1 - bakedRatio * 0.2})`;

        if (timeLeft <= 0) {
            clearInterval(interval);
            completeBaking();
        }
    }, 1000);
}

function completeBaking() {
    showToast("맛있게 구워졌어요! 예쁘게 꾸며봐요.");
    setTimeout(() => {
        showStage('decor');
        drawBread();
    }, 1000);
}

function drawBread() {
    ctx.clearRect(0, 0, els.decorCanvas.width, els.decorCanvas.height);
    // Draw 4 buns
    const positions = [
        {x: 150, y: 150}, {x: 350, y: 150},
        {x: 150, y: 300}, {x: 350, y: 300}
    ];
    positions.forEach(pos => {
        ctx.drawImage(breadImg, pos.x, pos.y, 150, 120);
    });
}

function startDecorating(e) {
    if (!state.selectedTool) {
        showToast("도구를 먼저 선택해주세요!");
        return;
    }

    const rect = els.decorCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    drawSticker(x, y, state.selectedTool);
}

function drawSticker(x, y, type) {
    ctx.font = "40px Arial";
    let emoji = "";
    if (type === 'butter') emoji = "🧈";
    if (type === 'jam') emoji = "🍓";
    if (type === 'honey') emoji = "🍯";
    
    ctx.fillText(emoji, x - 20, y + 20);
}

function showStage(stage) {
    state.step = stage;
    els.kneadArea.classList.remove('active');
    els.ovenArea.classList.remove('active');
    els.decorArea.classList.remove('active');

    if (stage === 'knead') {
        els.kneadArea.classList.add('active');
        els.stepDesc.innerText = "반죽을 꾹꾹 눌러주세요!";
    } else if (stage === 'oven') {
        els.ovenArea.classList.add('active');
        els.stepDesc.innerText = "오븐에 넣고 노릇노릇 구워요!";
    } else if (stage === 'decor') {
        els.decorArea.classList.add('active');
        els.stepDesc.innerText = "잼과 버터로 맛있게 꾸며요!";
    }
}

function showToast(msg) {
    els.toast.innerText = msg;
    els.toast.classList.remove('hidden');
    els.toast.style.opacity = '1';
    setTimeout(() => {
        els.toast.style.opacity = '0';
        setTimeout(() => els.toast.classList.add('hidden'), 300);
    }, 2000);
}

function saveCanvas() {
    const link = document.createElement('a');
    link.download = 'my_morning_bread.png';
    link.href = els.decorCanvas.toDataURL();
    link.click();
}

window.onload = init;
