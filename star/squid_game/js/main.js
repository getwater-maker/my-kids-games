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
let npcs = [];
let game2Canvas, game2Ctx;
let game3Rope, game5GlassTiles = [];

// Game State Values
let lightState = 'GREEN';
let timer = 0;
let score = 0;
let isDead = false;
let game3TugOfWarProgress = 0.5;

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
    scene.background = new THREE.Color(0xaaccff); // Sky Blue default

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    clock = new THREE.Clock();

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(50, 100, 50);
    sun.castShadow = true;
    scene.add(sun);

    // Initial Empty Scene
    resetScene();

    // Select Button Setup
    for (let i = 1; i <= 6; i++) {
        const btn = document.getElementById(`select-game-${i}`);
        btn.onclick = () => {
            if (unlockedGames.includes(i)) startStage(i);
            else alert(`이전 게임을 클리어해야 합니다!`);
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
            statusText.textContent = "활성";
            statusText.style.color = "#00ff99";
        } else {
            btn.classList.add('locked');
            statusText.textContent = "잠김";
            statusText.style.color = "#ff3366";
        }
    }
}

function resetScene() {
    while (scene.children.length > 0) {
        scene.remove(scene.children[0]);
    }
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(50, 100, 50);
    sun.castShadow = true;
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

    // Clear UI state completely
    statusInd.style.display = 'none';
    interactionHint.textContent = "";
    document.getElementById('dalgona-layer').classList.add('hidden');

    isDead = false;
    timer = 60;
    resetScene();

    switch (num) {
        case 1: setupGame1(); break;
        case 2: setupGame2(); break;
        case 3: setupGame3(); break;
        case 4: setupGame4(); break;
        case 5: setupGame5(); break;
        case 6: setupGame6(); break;
    }
}

function restartCurrentStage() {
    const num = parseInt(currentMode.split('_')[1]);
    startStage(num);
}

// --- GAME 1: RED LIGHT GREEN LIGHT ---
function setupGame1() {
    npcs = [];
    const groundGeo = new THREE.PlaneGeometry(100, 1000);
    const groundMat = new THREE.MeshPhongMaterial({ color: 0xedc9af });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Giant Doll
    const dollGroup = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(5, 15, 32), new THREE.MeshPhongMaterial({ color: 0xffeb3b }));
    body.position.y = 7.5;
    dollGroup.add(body);

    dollHead = new THREE.Mesh(new THREE.SphereGeometry(3, 32, 32), new THREE.MeshPhongMaterial({ color: 0xffdbac }));
    dollHead.position.y = 16;
    dollGroup.add(dollHead);

    dollGroup.position.set(0, 0, -200);
    scene.add(dollGroup);

    // Player
    player = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2, 0.8), new THREE.MeshPhongMaterial({ color: 0x037a76 }));
    player.position.set(0, 1, 50);
    scene.add(player);

    for (let i = 0; i < 40; i++) {
        const npc = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2, 0.8), new THREE.MeshPhongMaterial({ color: 0x014d4e }));
        const rx = (Math.random() - 0.5) * 40;
        const rz = 40 + Math.random() * 20;
        npc.position.set(rx, 1, rz);
        npc.userData = { speed: 8 + Math.random() * 4, isDead: false, reactionTime: Math.random() * 0.5 };
        scene.add(npc);
        npcs.push(npc);
    }

    camera.position.set(0, 5, player.position.z + 15);
    camera.lookAt(0, 2, player.position.z - 5);

    lightLoop();
}

function speak(text, rate = 1.0) {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = rate;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
}

function lightLoop() {
    if (currentMode !== 'GAME_1' || isDead) return;

    lightState = 'GREEN';
    statusInd.textContent = "GREEN LIGHT";
    statusInd.className = "green";
    statusInd.style.display = "block";
    interactionHint.textContent = "W 키를 눌러 앞으로 가세요!";
    interactionHint.style.background = "#4caf50";
    if (dollHead) dollHead.rotation.y = Math.PI;

    const greenTime = 4000 + Math.random() * 4000;
    speak("무궁화 꽃이 피었습니다!", 0.8 + Math.random() * 0.5);

    // Countdown
    setTimeout(() => { if (currentMode === 'GAME_1' && !isDead) { speak("3", 1.2); statusInd.textContent = "3!!"; } }, greenTime - 3000);
    setTimeout(() => { if (currentMode === 'GAME_1' && !isDead) { speak("2", 1.2); statusInd.textContent = "2!!"; } }, greenTime - 2000);
    setTimeout(() => { if (currentMode === 'GAME_1' && !isDead) { speak("1", 1.2); statusInd.textContent = "1!!"; } }, greenTime - 1000);

    setTimeout(() => {
        if (currentMode !== 'GAME_1' || isDead) return;
        lightState = 'RED';
        statusInd.textContent = "RED LIGHT";
        statusInd.className = "red";
        interactionHint.textContent = "멈추세요! 움직이면 탈락!";
        interactionHint.style.background = "#ed1c4d";
        if (dollHead) dollHead.rotation.y = 0;
        setTimeout(() => { if (currentMode === 'GAME_1' && !isDead) lightLoop(); }, 2000);
    }, greenTime);
}

// --- GAME 2: DALGONA ---
function setupGame2() {
    document.getElementById('dalgona-layer').classList.remove('hidden');
    game2Canvas = document.getElementById('dalgona-canvas');
    game2Ctx = game2Canvas.getContext('2d');
    game2Canvas.width = 400;
    game2Canvas.height = 400;

    game2Ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    game2Ctx.lineWidth = 15;
    game2Ctx.beginPath();
    game2Ctx.arc(200, 200, 120, 0, Math.PI * 2);
    game2Ctx.stroke();

    score = 0;
    game2Canvas.onclick = (e) => {
        if (isDead) return;
        const rect = game2Canvas.getBoundingClientRect();
        const dist = Math.sqrt(Math.pow(e.clientX - rect.left - 200, 2) + Math.pow(e.clientY - rect.top - 200, 2));
        if (Math.abs(dist - 120) < 15) {
            score++;
            game2Ctx.fillStyle = '#ff9800';
            game2Ctx.beginPath();
            game2Ctx.arc(e.clientX - rect.left, e.clientY - rect.top, 5, 0, Math.PI * 2);
            game2Ctx.fill();
            if (score >= 30) triggerWin(2, 500000);
        } else {
            eliminate("쿠키가 박살났습니다!");
        }
    };
}

// --- GAME 3: TUG OF WAR ---
function setupGame3() {
    // Platforms
    const platGeo = new THREE.BoxGeometry(40, 40, 20);
    const platMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const p1 = new THREE.Mesh(platGeo, platMat); p1.position.set(-35, -15, 0); scene.add(p1);
    const p2 = new THREE.Mesh(platGeo, platMat); p2.position.set(35, -15, 0); scene.add(p2);

    // Ground beneath platforms for better visual reference
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), new THREE.MeshPhongMaterial({ color: 0x111111 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -50; scene.add(ground);

    // Rope
    game3Rope = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 100, 8), new THREE.MeshPhongMaterial({ color: 0x8d6e63 }));
    game3Rope.rotation.z = Math.PI / 2;
    game3Rope.position.y = 8;
    scene.add(game3Rope);

    for (let i = 0; i < 5; i++) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2, 0.8), new THREE.MeshPhongMaterial({ color: 0x037a76 }));
        p.position.set(-15 - i * 2, 1, 0); game3Rope.add(p);
        const e = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2, 0.8), new THREE.MeshPhongMaterial({ color: 0xed1c4d }));
        e.position.set(15 + i * 2, 1, 0); game3Rope.add(e);
    }

    game3TugOfWarProgress = 0.5;
    camera.position.set(0, 20, 40);
    camera.lookAt(0, 5, 0);
    interactionHint.textContent = "광클하여 줄을 당기세요!!";
    interactionHint.style.background = "#037a76";

    window.onmousedown = () => {
        if (currentMode === 'GAME_3' && !isDead) game3TugOfWarProgress += 0.04;
    };
}

// --- STAGE 4-6 PLACEHOLDERS ---
function setupGame4() {
    scene.background = new THREE.Color(0x333333);
    interactionHint.textContent = "구슬치기 - 준비 중입니다.";
    setTimeout(() => triggerWin(4, 2000000), 2000);
}
function setupGame5() {
    scene.background = new THREE.Color(0x222222);
    interactionHint.textContent = "징검다리 - 준비 중입니다.";
    setTimeout(() => triggerWin(5, 5000000), 2000);
}
function setupGame6() {
    scene.background = new THREE.Color(0x000000);
    interactionHint.textContent = "오징어 게임 (결승) - 준비 중입니다.";
    setTimeout(() => {
        alert("축하합니다! 오징어 게임의 최종 우승자가 되셨습니다!");
        triggerWin(6, 10000000);
    }, 2000);
}

// --- UTILS ---
function eliminate(msg) {
    isDead = true;
    hud.classList.add('hidden');
    resultPage.classList.remove('hidden');
    resultMsgEl.textContent = msg;
    resultMsgEl.style.color = "#ed1c4d";
    rewardEl.textContent = "0";
}

function triggerWin(stageNum, reward) {
    if (isDead) return;
    isDead = true;
    totalWins += reward;
    localStorage.setItem('squidWins', totalWins);
    totalCashEl.textContent = totalWins.toLocaleString();
    if (!unlockedGames.includes(stageNum + 1) && stageNum < 6) {
        unlockedGames.push(stageNum + 1);
        localStorage.setItem('squidUnlocked', JSON.stringify(unlockedGames));
    }
    resultPage.classList.remove('hidden');
    resultMsgEl.textContent = "PASSED";
    resultMsgEl.style.color = "#4caf50";
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

        if (currentMode === 'GAME_1') {
            updateGame1(delta);
        } else if (currentMode === 'GAME_3' && game3Rope) {
            game3TugOfWarProgress -= delta * 0.15;
            game3Rope.position.x = (game3TugOfWarProgress - 0.5) * 50;
            camera.position.x = game3Rope.position.x * 0.5;
            camera.lookAt(game3Rope.position.x, 5, 0);
            if (game3TugOfWarProgress < 0.2) eliminate("떨어졌습니다!");
            if (game3TugOfWarProgress > 0.8) triggerWin(3, 1000000);
        }
    }
    renderer.render(scene, camera);
}

function updateGame1(delta) {
    const isMoving = activeKeys['KeyW'] || activeKeys['ArrowUp'];
    if (isMoving) {
        if (lightState === 'RED') eliminate("움직임 감지!");
        else {
            player.position.z -= CONFIG.walkSpeed * delta;
            player.position.y = 1.0 + Math.abs(Math.sin(Date.now() * 0.01)) * 0.2;
            camera.position.z = player.position.z + 15;
        }
    } else player.position.y = 1.0;

    npcs.forEach(npc => {
        if (npc.userData.isDead) { npc.rotation.x = Math.PI / 2; npc.position.y = 0.5; npc.material.color.set(0xff0000); }
        else if (lightState === 'GREEN') {
            npc.position.z -= npc.userData.speed * delta;
            npc.position.y = 1.0 + Math.abs(Math.sin(Date.now() * 0.008 + npc.position.x)) * 0.2;
        } else if (Math.random() < 0.005) {
            npc.userData.isDead = true;
        }
    });
    if (player.position.z < -188) triggerWin(1, 456000);
}

const activeKeys = {};
window.addEventListener('keydown', (e) => { activeKeys[e.code] = true; });
window.addEventListener('keyup', (e) => { activeKeys[e.code] = false; });
window.onload = init;
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
