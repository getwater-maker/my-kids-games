// star/squid_game/js/main.js

const CONFIG = {
    walkSpeed: 10,
    runSpeed: 18,
    gameTime: 60,
    dollTurnIntervalMin: 1500,
    dollTurnIntervalMax: 4000,
    dalgonaShapePoints: 50,
    dalgonaTolerance: 20
};

let scene, camera, renderer, clock;
let currentMode = 'LOBBY';
let totalWins = parseInt(localStorage.getItem('squidWins')) || 0;
let unlockedGames = JSON.parse(localStorage.getItem('squidUnlocked')) || [1];

// Game Objects
let player, floor, doll, dollHead;
let game1Objects = [];
let game2Canvas, game2Ctx, dalgonaShape = [];
let game3TugOfWarProgress = 0.5;
let game5GlassTiles = [];

// Game State Values
let lightState = 'GREEN';
let timer = 0, startTime = 0;
let score = 0;
let isDead = false;
let moveDetectTime = 0;

// UI Elements
let lobbyPage, hud, resultPage, totalCashEl, timerEl, statusInd, interactionHint;
let resultMsgEl, rewardEl;

async function init() {
    // UI Linkage
    lobbyPage = document.getElementById('lobby-screen');
    hud = document.getElementById('hud');
    resultPage = document.getElementById('result-screen');
    timerEl = document.getElementById('timer');
    totalCashEl = document.getElementById('total-cash');
    statusInd = document.getElementById('status-indicator');
    interactionHint = document.getElementById('interaction-prompt');
    resultMsgEl = document.getElementById('result-title');
    rewardEl = document.getElementById('reward-amount');

    totalCashEl.textContent = totalWins.toLocaleString();
    updateLobbyButtons();

    // 3D Setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    clock = new THREE.Clock();

    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(50, 100, 50);
    scene.add(sun);

    // Initial Empty Scene
    resetScene();

    // Select Button Setup
    for (let i = 1; i <= 6; i++) {
        const btn = document.getElementById(`select-game-${i}`);
        btn.onclick = () => {
            if (unlockedGames.includes(i)) startStage(i);
            else alert(`게임 ${i - 1}을 먼저 클리어해야 합니다!`);
        };
    }

    document.getElementById('retry-game-btn').onclick = () => restartCurrentStage();
    document.getElementById('lobby-back-btn').onclick = () => showLobby();

    animate();
}

function updateLobbyButtons() {
    for (let i = 1; i <= 6; i++) {
        const btn = document.getElementById(`select-game-${i}`);
        const statusText = btn.querySelector('.status');
        if (unlockedGames.includes(i)) {
            btn.classList.remove('locked');
            statusText.textContent = "활성화";
            statusText.style.color = "#037a76";
        } else {
            btn.classList.add('locked');
            statusText.textContent = "잠금 해제 필요";
            statusText.style.color = "#ed1c4d";
        }
    }
}

function resetScene() {
    while (scene.children.length > 0) {
        scene.remove(scene.children[0]);
    }
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(50, 100, 50);
    scene.add(sun);
}

function showLobby() {
    currentMode = 'LOBBY';
    lobbyPage.classList.remove('hidden');
    hud.classList.add('hidden');
    resultPage.classList.add('hidden');
    document.getElementById('dalgona-layer').classList.add('hidden');
    resetScene();
}

function startStage(num) {
    currentMode = `GAME_${num}`;
    lobbyPage.classList.add('hidden');
    hud.classList.remove('hidden');
    resultPage.classList.add('hidden');
    document.getElementById('game-title').textContent = `GAME 0${num} 진행 중`;

    isDead = false;
    timer = 60;
    resetScene();

    switch (num) {
        case 1: setupGame1(); break; // 무궁화
        case 2: setupGame2(); break; // 달고나
        case 3: setupGame3(); break; // 줄다리기
        case 4: setupGame4(); break; // 구슬
        case 5: setupGame5(); break; // 징검다리
        case 6: setupGame6(); break; // 오징어
    }
}

function restartCurrentStage() {
    const num = parseInt(currentMode.split('_')[1]);
    startStage(num);
}

// --- GAME 1: RED LIGHT GREEN LIGHT ---
function setupGame1() {
    const groundGeo = new THREE.PlaneGeometry(100, 1000);
    const groundMat = new THREE.MeshPhongMaterial({ color: 0xedc9af });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Giant Doll
    const dollGroup = new THREE.Group();
    const bodyGeo = new THREE.ConeGeometry(5, 15, 32);
    const body = new THREE.Mesh(bodyGeo, new THREE.MeshPhongMaterial({ color: 0xffeb3b }));
    body.position.y = 7.5;
    dollGroup.add(body);

    dollHead = new THREE.Mesh(new THREE.SphereGeometry(3, 32, 32), new THREE.MeshPhongMaterial({ color: 0xffdbac }));
    dollHead.position.y = 16;
    dollGroup.add(dollHead);

    dollGroup.position.set(0, 0, -200);
    scene.add(dollGroup);
    doll = dollGroup;

    // Player
    player = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshPhongMaterial({ color: 0x037a76 }));
    player.position.set(0, 1, 50);
    scene.add(player);

    camera.position.set(0, 5, player.position.z + 10);
    camera.lookAt(player.position.x, 2, player.position.z - 5);

    lightLoop();
}

function lightLoop() {
    if (currentMode !== 'GAME_1' || isDead) return;

    // Switch to GREEN
    lightState = 'GREEN';
    statusInd.textContent = "GREEN LIGHT";
    statusInd.className = "green";
    statusInd.style.display = "block";
    dollHead.rotation.y = Math.PI; // Face away

    const greenTime = 2000 + Math.random() * 3000;
    setTimeout(() => {
        if (currentMode !== 'GAME_1' || isDead) return;

        // RED
        lightState = 'RED';
        statusInd.textContent = "RED LIGHT";
        statusInd.className = "red";
        dollHead.rotation.y = 0; // Face player

        setTimeout(() => { if (currentMode === 'GAME_1') lightLoop(); }, 1500 + Math.random() * 2000);
    }, greenTime);
}

// --- GAME 2: DALGONA (Honeycomb) ---
function setupGame2() {
    document.getElementById('dalgona-layer').classList.remove('hidden');
    game2Canvas = document.getElementById('dalgona-canvas');
    game2Ctx = game2Canvas.getContext('2d');
    game2Canvas.width = 400;
    game2Canvas.height = 400;

    // Drawing the circle to trace
    game2Ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    game2Ctx.lineWidth = 15;
    game2Ctx.beginPath();
    game2Ctx.arc(200, 200, 120, 0, Math.PI * 2);
    game2Ctx.stroke();

    score = 0;
    game2Canvas.onclick = (e) => {
        if (isDead) return;
        const rect = game2Canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Distance from center (200, 200)
        const dx = mouseX - 200;
        const dy = mouseY - 200;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (Math.abs(dist - 120) < 15) {
            score++;
            game2Ctx.fillStyle = '#ff9800';
            game2Ctx.beginPath();
            game2Ctx.arc(mouseX, mouseY, 5, 0, Math.PI * 2);
            game2Ctx.fill();
            if (score >= 30) triggerWin(2, 500000);
        } else {
            eliminate("쿠키가 박살났습니다!");
        }
    };
}

// --- GAME 3: TUG OF WAR ---
function setupGame3() {
    // Basic Visualization
    const ropeGeo = new THREE.CylinderGeometry(0.2, 0.2, 100, 8);
    const ropeMat = new THREE.MeshPhongMaterial({ color: 0x8d6e63 });
    const rope = new THREE.Mesh(ropeGeo, ropeMat);
    rope.rotation.z = Math.PI / 2;
    rope.position.y = 5;
    scene.add(rope);

    game3TugOfWarProgress = 0.5;
    window.onmousedown = () => {
        if (currentMode === 'GAME_3' && !isDead) {
            game3TugOfWarProgress += 0.05;
            camera.position.x += 0.2;
        }
    }
}

// --- CORE UTILS ---

function eliminate(msg = "탈락하셨습니다.") {
    isDead = true;
    hud.classList.add('hidden');
    resultPage.classList.remove('hidden');
    resultMsgEl.textContent = "탈락 (ELIMINATED)";
    resultMsgEl.style.color = "#ed1c4d";
    resultMsgEl.style.textShadow = "0 0 20px #ed1c4d";
    resultMsgEl.textContent = msg;
    rewardEl.textContent = "0";
}

function triggerWin(stageNum, reward) {
    if (isDead) return;
    isDead = true; // Block inputs

    totalWins += reward;
    localStorage.setItem('squidWins', totalWins);
    totalCashEl.textContent = totalWins.toLocaleString();

    if (!unlockedGames.includes(stageNum + 1) && stageNum < 6) {
        unlockedGames.push(stageNum + 1);
        localStorage.setItem('squidUnlocked', JSON.stringify(unlockedGames));
    }

    resultPage.classList.remove('hidden');
    resultMsgEl.textContent = "통과 (PASSED)";
    resultMsgEl.style.color = "#4caf50";
    resultMsgEl.style.textShadow = "0 0 20px #4caf50";
    resultMsgEl.textContent = `Stage 0${stageNum} 클리어!`;
    rewardEl.textContent = reward.toLocaleString();
    updateLobbyButtons();
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (!isDead && currentMode.startsWith('GAME_')) {
        timer -= delta;
        timerEl.textContent = Math.ceil(timer);
        if (timer <= 0) eliminate("시간 초과!");

        // Mode Specific Updates
        if (currentMode === 'GAME_1') {
            updateGame1(delta);
        } else if (currentMode === 'GAME_3') {
            game3TugOfWarProgress -= delta * 0.15; // AI pulls back
            if (game3TugOfWarProgress < 0.2) eliminate("상대팀의 힘에 밀려 떨어졌습니다!");
            if (game3TugOfWarProgress > 0.8) triggerWin(3, 1000000);
        }
    }

    renderer.render(scene, camera);
}

function updateGame1(delta) {
    const isMoving = activeKeys['KeyW'] || activeKeys['ArrowUp'];
    if (isMoving && !isDead) {
        if (lightState === 'RED') {
            eliminate("움직임이 감지되었습니다!");
        } else {
            player.position.z -= CONFIG.walkSpeed * delta;
            camera.position.z = player.position.z + 10;
        }
    }

    if (player.position.z < -180) {
        triggerWin(1, 456000);
    }
}

const activeKeys = {};
window.onkeydown = (e) => activeKeys[e.code] = true;
window.onkeyup = (e) => activeKeys[e.code] = false;

window.onload = init;
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
