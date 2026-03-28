const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// --- GAME CONFIG ---
const CONFIG = {
    gravity: 0.5,
    groundY: 0,
    playerX: 100,
    fontSize: '24px Jua'
};

// --- GAME STATE ---
let state = {
    hp: 100,
    maxHp: 100,
    gold: 0,
    stage: 1,
    day: 1,
    isWalking: false,
    distanceTravelled: 0,
    currentEvent: null,
    inventory: [],
    skills: []
};

// --- ASSETS & ANIMATION ---
let player = {
    x: 100,
    y: 0,
    targetY: 0,
    frame: 0,
    animationSpeed: 0.1
};

let backgroundX = 0;

function init() {
    resize();
    window.addEventListener('resize', resize);
    
    // UI Events
    document.getElementById('start-btn').onclick = startGame;
    document.getElementById('go-btn').onclick = nextDay;

    CONFIG.groundY = canvas.height * 0.7;
    player.y = CONFIG.groundY - 50;

    requestAnimationFrame(gameLoop);
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    CONFIG.groundY = canvas.height * 0.7;
}

function startGame() {
    document.getElementById('start-screen').classList.add('hidden');
    nextDay();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function update() {
    if (state.isWalking) {
        backgroundX -= 5;
        player.frame += player.animationSpeed;
        state.distanceTravelled += 5;

        // Stop walking at event point
        if (state.distanceTravelled >= 200) {
            state.isWalking = false;
            state.distanceTravelled = 0;
            triggerEvent();
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Background (Sky & Sun)
    drawSky();
    
    // Draw Ground
    drawGround();

    // Draw Capybara
    drawCapybara();
}

function drawSky() {
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#81d4fa');
    grad.addColorStop(1, '#e1f5fe');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Sun
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.arc(canvas.width - 100, 100, 40, 0, Math.PI * 2);
    ctx.fill();
}

function drawGround() {
    ctx.fillStyle = '#a8d5ba';
    ctx.fillRect(0, CONFIG.groundY, canvas.width, canvas.height - CONFIG.groundY);
    
    // Decorative grass
    ctx.fillStyle = '#81c784';
    for (let i = 0; i < 20; i++) {
        let x = (backgroundX % 200) + (i * 200);
        ctx.fillRect(x, CONFIG.groundY, 10, -20);
    }
}

function drawCapybara() {
    const bounce = Math.sin(player.frame) * 5;
    const w = 80;
    const h = 50;
    
    ctx.save();
    ctx.translate(player.x, CONFIG.groundY - h + bounce);

    // Body (Brown Oval)
    ctx.fillStyle = '#8d6e63';
    ctx.beginPath();
    ctx.ellipse(w/2, h/2, w/2, h/2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#795548';
    ctx.beginPath();
    ctx.ellipse(w*0.8, h/3, 20, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(w*0.9, h/3, 2, 0, Math.PI * 2);
    ctx.fill();

    // Legs (Animated)
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#5d4037';
    const legSwing = Math.sin(player.frame) * 10;
    
    // Front leg
    ctx.beginPath(); ctx.moveTo(w*0.7, h*0.8); ctx.lineTo(w*0.7 + legSwing, h*1.1); ctx.stroke();
    // Back leg
    ctx.beginPath(); ctx.moveTo(w*0.2, h*0.8); ctx.lineTo(w*0.2 - legSwing, h*1.1); ctx.stroke();

    ctx.restore();
}

// --- LOGIC ---

function nextDay() {
    if (state.isWalking) return;
    
    state.day++;
    document.getElementById('day-text').textContent = `DAY ${state.day}`;
    document.getElementById('event-log').textContent = "모험을 떠나는 중...";
    state.isWalking = true;
}

const EVENTS = [
    { type: 'CHOICE', title: '보급 상자 발견!', desc: '무엇을 챙기시겠습니까?', options: [
        { text: '사과 (HP +20)', action: () => modStat('hp', 20) },
        { text: '동전 주머니 (Gold +50)', action: () => modStat('gold', 50) },
        { text: '행운의 부적 (럭키)', action: () => logEvent('운이 좋아졌습니다!') }
    ]},
    { type: 'COMBAT', name: '겁쟁이 슬라임', hp: 30, loot: 30 },
    { type: 'LUCK', title: '온천 발견', desc: '따뜻한 온천에서 휴식합니다. HP가 회복됩니다!', action: () => modStat('hp', 30) }
];

function triggerEvent() {
    const rand = Math.random();
    let ev;
    
    if (rand < 0.4) ev = EVENTS[0]; // Choice
    else if (rand < 0.8) ev = EVENTS[2]; // Luck
    else ev = EVENTS[1]; // Combat

    if (ev.type === 'CHOICE' || ev.type === 'LUCK') {
        showModal(ev);
    } else {
        startCombat(ev);
    }
}

function showModal(ev) {
    const modal = document.getElementById('choice-modal');
    document.getElementById('modal-title').textContent = ev.title;
    document.getElementById('modal-desc').textContent = ev.desc || '';
    
    const container = modal.querySelector('.choice-group');
    container.innerHTML = '';

    if (ev.options) {
        ev.options.forEach(opt => {
            const btn = document.createElement('div');
            btn.className = 'choice-btn';
            btn.textContent = opt.text;
            btn.onclick = () => {
                opt.action();
                modal.classList.add('hidden');
            };
            container.appendChild(btn);
        });
    } else {
        const btn = document.createElement('div');
        btn.className = 'choice-btn';
        btn.textContent = '계속하기';
        btn.onclick = () => {
            if (ev.action) ev.action();
            modal.classList.add('hidden');
        };
        container.appendChild(btn);
    }

    modal.classList.remove('hidden');
}

function startCombat(enemy) {
    logEvent(`${enemy.name}(을)를 만났습니다! 전투 시작!`);
    
    // Simplified automated combat for 2D feel
    setTimeout(() => {
        const damage = 10;
        modStat('hp', -damage);
        modStat('gold', enemy.loot);
        logEvent(`${enemy.name} 격퇴! (골드 +${enemy.loot})`);
    }, 1000);
}

function modStat(type, val) {
    state[type] += val;
    if (type === 'hp') {
        state.hp = Math.min(state.maxHp, state.hp);
        const fill = (state.hp / state.maxHp) * 100;
        document.getElementById('hp-bar').style.width = fill + '%';
        document.getElementById('hp-text').textContent = `${state.hp}/${state.maxHp}`;
        
        if (state.hp <= 0) gameOver();
    } else if (type === 'gold') {
        document.getElementById('gold-text').textContent = state.gold;
    }
}

function logEvent(txt) {
    document.getElementById('event-log').textContent = txt;
}

function gameOver() {
    document.getElementById('game-over-screen').classList.remove('hidden');
    document.getElementById('result-stats').innerHTML = `
        <p>생존 일수: ${state.day}</p>
        <p>획득 골드: ${state.gold}</p>
    `;
}

init();
