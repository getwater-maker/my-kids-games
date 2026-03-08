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
let game6Boss;

// Game State Values
let lightState = 'GREEN';
let timer = 0;
let score = 0;
let isDead = false;
let game3TugOfWarProgress = 0.5;
let playerMarbles = 10;
let glassStep = 0;

// UI Elements
let lobbyPage, hud, resultPage, totalCashEl, timerEl, statusInd, interactionHint;
let resultMsgEl, rewardEl, marblesLayer, marbleStatusEl;

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
    marblesLayer = document.getElementById('marbles-layer');
    marbleStatusEl = document.getElementById('marble-status');

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

    // Marble Betting Buttons
    document.getElementById('odd-btn').onclick = () => betMarble('odd');
    document.getElementById('even-btn').onclick = () => betMarble('even');

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
    marblesLayer.classList.add('hidden');
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
    marblesLayer.classList.add('hidden');

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

    const dollGroup = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(5, 15, 32), new THREE.MeshPhongMaterial({ color: 0xffeb3b }));
    body.position.y = 7.5; dollGroup.add(body);
    dollHead = new THREE.Mesh(new THREE.SphereGeometry(3, 32, 32), new THREE.MeshPhongMaterial({ color: 0xffdbac }));
    dollHead.position.y = 16; dollGroup.add(dollHead);
    dollGroup.position.set(0, 0, -200); scene.add(dollGroup);

    player = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2, 0.8), new THREE.MeshPhongMaterial({ color: 0x037a76 }));
    player.position.set(0, 1, 50); scene.add(player);

    for (let i = 0; i < 40; i++) {
        const npc = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2, 0.8), new THREE.MeshPhongMaterial({ color: 0x014d4e }));
        npc.position.set((Math.random() - 0.5) * 40, 1, 40 + Math.random() * 20);
        npc.userData = { speed: 8 + Math.random() * 4, isDead: false, reactionTime: Math.random() * 0.5 };
        scene.add(npc); npcs.push(npc);
    }
    camera.position.set(0, 5, player.position.z + 15);
    camera.lookAt(0, 2, player.position.z - 5);
    lightLoop();
}

function speak(text, rate = 1.0) {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR'; utterance.rate = rate;
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(utterance);
}

function lightLoop() {
    if (currentMode !== 'GAME_1' || isDead) return;
    lightState = 'GREEN'; statusInd.textContent = "GREEN LIGHT"; statusInd.className = "green"; statusInd.style.display = "block";
    interactionHint.textContent = "W 키를 눌러 앞으로 가세요!"; interactionHint.style.background = "#4caf50";
    if (dollHead) dollHead.rotation.y = Math.PI;
    const greenTime = 4000 + Math.random() * 4000;
    speak("무궁화 꽃이 피었습니다!", 0.8 + Math.random() * 0.5);
    setTimeout(() => { if (currentMode === 'GAME_1' && !isDead) { speak("3", 1.2); statusInd.textContent = "3!!"; } }, greenTime - 3000);
    setTimeout(() => { if (currentMode === 'GAME_1' && !isDead) { speak("2", 1.2); statusInd.textContent = "2!!"; } }, greenTime - 2000);
    setTimeout(() => { if (currentMode === 'GAME_1' && !isDead) { speak("1", 1.2); statusInd.textContent = "1!!"; } }, greenTime - 1000);
    setTimeout(() => {
        if (currentMode !== 'GAME_1' || isDead) return;
        lightState = 'RED'; statusInd.textContent = "RED LIGHT"; statusInd.className = "red";
        interactionHint.textContent = "멈추세요! 움직이면 탈락!"; interactionHint.style.background = "#ed1c4d";
        if (dollHead) dollHead.rotation.y = 0;
        setTimeout(() => { if (currentMode === 'GAME_1' && !isDead) lightLoop(); }, 2000);
    }, greenTime);
}

// --- GAME 2: DALGONA ---
function setupGame2() {
    document.getElementById('dalgona-layer').classList.remove('hidden');
    game2Canvas = document.getElementById('dalgona-canvas');
    game2Ctx = game2Canvas.getContext('2d');
    game2Canvas.width = 400; game2Canvas.height = 400;
    game2Ctx.strokeStyle = 'rgba(0,0,0,0.3)'; game2Ctx.lineWidth = 15;
    game2Ctx.beginPath(); game2Ctx.arc(200, 200, 120, 0, Math.PI * 2); game2Ctx.stroke();
    score = 0;
    game2Canvas.onclick = (e) => {
        if (isDead) return;
        const rect = game2Canvas.getBoundingClientRect();
        const dist = Math.sqrt(Math.pow(e.clientX - rect.left - 200, 2) + Math.pow(e.clientY - rect.top - 200, 2));
        if (Math.abs(dist - 120) < 15) {
            score++; game2Ctx.fillStyle = '#ff9800'; game2Ctx.beginPath();
            game2Ctx.arc(e.clientX - rect.left, e.clientY - rect.top, 5, 0, Math.PI * 2); game2Ctx.fill();
            if (score >= 30) triggerWin(2, 500000);
        } else eliminate("쿠키가 박살났습니다!");
    };
}

// --- GAME 3: TUG OF WAR ---
function setupGame3() {
    const platGeo = new THREE.BoxGeometry(40, 40, 20); const platMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const p1 = new THREE.Mesh(platGeo, platMat); p1.position.set(-35, -15, 0); scene.add(p1);
    const p2 = new THREE.Mesh(platGeo, platMat); p2.position.set(35, -15, 0); scene.add(p2);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), new THREE.MeshPhongMaterial({ color: 0x111111 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -50; scene.add(ground);
    game3Rope = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 100, 8), new THREE.MeshPhongMaterial({ color: 0x8d6e63 }));
    game3Rope.rotation.z = Math.PI / 2; game3Rope.position.y = 8; scene.add(game3Rope);
    for (let i = 0; i < 5; i++) {
        const team1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2, 0.8), new THREE.MeshPhongMaterial({ color: 0x037a76 }));
        team1.position.set(-15 - i * 2, 1, 0); game3Rope.add(team1);
        const team2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2, 0.8), new THREE.MeshPhongMaterial({ color: 0xed1c4d }));
        team2.position.set(15 + i * 2, 1, 0); game3Rope.add(team2);
    }
    game3TugOfWarProgress = 0.5; camera.position.set(0, 20, 40); camera.lookAt(0, 5, 0);
    interactionHint.textContent = "광클하여 줄을 당기세요!!"; interactionHint.style.background = "#037a76";
    window.onmousedown = () => { if (currentMode === 'GAME_3' && !isDead) game3TugOfWarProgress += 0.04; };
}

// --- GAME 4: MARBLES (구슬치기) ---
function setupGame4() {
    scene.background = new THREE.Color(0xd3a15c); // Sunset tone
    const alleyGround = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshPhongMaterial({ color: 0x7a5e3d }));
    alleyGround.rotation.x = -Math.PI / 2; scene.add(alleyGround);

    // Brick walls
    const wallGeo = new THREE.BoxGeometry(2, 20, 100); const wallMat = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
    const w1 = new THREE.Mesh(wallGeo, wallMat); w1.position.set(-20, 10, 0); scene.add(w1);
    const w2 = new THREE.Mesh(wallGeo, wallMat); w2.position.set(20, 10, 0); scene.add(w2);

    playerMarbles = 10;
    marblesLayer.classList.remove('hidden');
    updateMarbleUI();
    camera.position.set(0, 10, 20); camera.lookAt(0, 0, 0);
    interactionHint.textContent = "홀인지 짝인지 선택하세요 (구슬 20개를 모으면 통과)";
}

function updateMarbleUI() {
    marbleStatusEl.textContent = `보유 구슬: ${playerMarbles}개 (목표: 20개)`;
}

function betMarble(choice) {
    if (currentMode !== 'GAME_4' || isDead) return;
    const aiMarbles = Math.floor(Math.random() * 5) + 1; // AI bets 1-5
    const isAiEven = aiMarbles % 2 === 0;
    const win = (choice === 'even' && isAiEven) || (choice === 'odd' && !isAiEven);

    if (win) {
        playerMarbles += aiMarbles;
        alert(`정답! 상대는 구슬 ${aiMarbles}개를 들고 있었습니다. +${aiMarbles}개!`);
    } else {
        playerMarbles -= aiMarbles;
        alert(`땡! 상대는 구슬 ${aiMarbles}개를 들고 있었습니다. -${aiMarbles}개...`);
    }

    if (playerMarbles <= 0) eliminate("구슬을 모두 잃어 탈락하셨습니다.");
    else if (playerMarbles >= 20) {
        marblesLayer.classList.add('hidden');
        triggerWin(4, 2000000);
    }
    updateMarbleUI();
}

// --- GAME 5: GLASS BRIDGE (징검다리) ---
let game5Rows = [];
function setupGame5() {
    scene.background = new THREE.Color(0x111111);
    const beamGeo = new THREE.BoxGeometry(2, 1, 150); const beamMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const b1 = new THREE.Mesh(beamGeo, beamMat); b1.position.set(-6, 0, -50); scene.add(b1);
    const b2 = new THREE.Mesh(beamGeo, beamMat); b2.position.set(6, 0, -50); scene.add(b2);

    game5Rows = []; glassStep = 0;
    for (let i = 0; i < 10; i++) {
        const safeIdx = Math.floor(Math.random() * 2); // 0: left, 1: right
        const pair = [];
        for (let j = 0; j < 2; j++) {
            const glass = new THREE.Mesh(new THREE.BoxGeometry(5, 0.2, 8), new THREE.MeshPhongMaterial({ color: 0x88ccff, transparent: true, opacity: 0.5 }));
            glass.position.set(j === 0 ? -6 : 6, 0.5, -i * 12);
            scene.add(glass);
            pair.push({ mesh: glass, safe: j === safeIdx });
        }
        game5Rows.push(pair);
    }

    player = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 1), new THREE.MeshPhongMaterial({ color: 0x037a76 }));
    player.position.set(0, 2, 10); scene.add(player);

    camera.position.set(0, 15, 25); camera.lookAt(0, 0, -30);
    interactionHint.textContent = "A(좌) 또는 D(우) 키를 눌러 점프하세요! (10칸 통과)";

    window.onkeydown = (e) => {
        if (currentMode !== 'GAME_5' || isDead || glassStep >= 10) return;
        let side = -1;
        if (e.code === 'KeyA' || e.code === 'ArrowLeft') side = 0;
        if (e.code === 'KeyD' || e.code === 'ArrowRight') side = 1;
        if (side === -1) return;

        const tile = game5Rows[glassStep][side];
        player.position.set(side === 0 ? -6 : 6, 2, -glassStep * 12);

        if (!tile.safe) {
            tile.mesh.visible = false;
            eliminate("강화유리가 아니었습니다... 추락하셨습니다.");
            player.position.y = -20; // Fall effect
        } else {
            glassStep++;
            if (glassStep >= 10) triggerWin(5, 5000000);
        }
    };
}

// --- GAME 6: SQUID GAME (Final) ---
function setupGame6() {
    scene.background = new THREE.Color(0x333333);
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshPhongMaterial({ color: 0x966f33 }));
    sand.rotation.x = -Math.PI / 2; scene.add(sand);

    // Final Boss (Soldier in pink)
    game6Boss = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 1.5), new THREE.MeshPhongMaterial({ color: 0xed1c4d }));
    game6Boss.position.set(0, 2, -50); scene.add(game6Boss);

    player = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3, 1), new THREE.MeshPhongMaterial({ color: 0x037a76 }));
    player.position.set(0, 1.5, 50); scene.add(player);

    camera.position.set(0, 10, 70); camera.lookAt(0, 0, 0);
    interactionHint.textContent = "최종 목적지(도형의 머리)까지 전진하세요! 보스를 피하세요!";
}

// --- UTILS ---
function eliminate(msg) {
    isDead = true; hud.classList.add('hidden'); resultPage.classList.remove('hidden');
    resultMsgEl.textContent = msg; resultMsgEl.style.color = "#ed1c4d"; rewardEl.textContent = "0";
}

function triggerWin(stageNum, reward) {
    if (isDead) return; isDead = true; totalWins += reward;
    localStorage.setItem('squidWins', totalWins);
    totalCashEl.textContent = totalWins.toLocaleString();
    if (!unlockedGames.includes(stageNum + 1) && stageNum < 6) {
        unlockedGames.push(stageNum + 1); localStorage.setItem('squidUnlocked', JSON.stringify(unlockedGames));
    }
    resultPage.classList.remove('hidden');
    resultMsgEl.textContent = `Stage 0${stageNum} Clear!`; resultMsgEl.style.color = "#4caf50";
    rewardEl.textContent = reward.toLocaleString(); updateLobbyButtons();
}

function animate() {
    requestAnimationFrame(animate); const delta = clock.getDelta();
    if (!isDead && currentMode.startsWith('GAME_')) {
        timer -= delta; timerEl.textContent = Math.ceil(timer);
        if (timer <= 0) eliminate("시간 초과!");
        if (currentMode === 'GAME_1') updateGame1(delta);
        else if (currentMode === 'GAME_3' && game3Rope) {
            game3TugOfWarProgress -= delta * 0.15;
            game3Rope.position.x = (game3TugOfWarProgress - 0.5) * 50;
            camera.position.x = game3Rope.position.x * 0.5; camera.lookAt(game3Rope.position.x, 5, 0);
            if (game3TugOfWarProgress < 0.2) eliminate("떨어졌습니다!"); if (game3TugOfWarProgress > 0.8) triggerWin(3, 1000000);
        } else if (currentMode === 'GAME_6' && player) {
            const speed = 15 * delta;
            if (activeKeys['KeyW'] || activeKeys['ArrowUp']) player.position.z -= speed;
            if (activeKeys['KeyS'] || activeKeys['ArrowDown']) player.position.z += speed;
            if (activeKeys['KeyA'] || activeKeys['ArrowLeft']) player.position.x -= speed;
            if (activeKeys['KeyD'] || activeKeys['ArrowRight']) player.position.x += speed;

            // Boss AI: Move towards player
            const dx = player.position.x - game6Boss.position.x;
            const dz = player.position.z - game6Boss.position.z;
            const angle = Math.atan2(dx, dz);
            game6Boss.position.x += Math.sin(angle) * 8 * delta;
            game6Boss.position.z += Math.cos(angle) * 8 * delta;

            if (player.position.distanceTo(game6Boss.position) < 2.5) eliminate("보스에게 처단당했습니다!");
            if (player.position.z < -60) triggerWin(6, 10000000);
            camera.position.set(player.position.x, 15, player.position.z + 30); camera.lookAt(player.position);
        }
    }
    renderer.render(scene, camera);
}

function updateGame1(delta) {
    if (activeKeys['KeyW'] || activeKeys['ArrowUp']) {
        if (lightState === 'RED') eliminate("움직임 감지!");
        else {
            player.position.z -= CONFIG.walkSpeed * delta; player.position.y = 1.0 + Math.abs(Math.sin(Date.now() * 0.01)) * 0.2;
            camera.position.z = player.position.z + 15;
        }
    } else player.position.y = 1.0;
    npcs.forEach(npc => {
        if (npc.userData.isDead) { npc.rotation.x = Math.PI / 2; npc.position.y = 0.5; npc.material.color.set(0xff0000); }
        else if (lightState === 'GREEN') {
            npc.position.z -= npc.userData.speed * delta; npc.position.y = 1.0 + Math.abs(Math.sin(Date.now() * 0.008 + npc.position.x)) * 0.2;
        } else if (Math.random() < 0.005) npc.userData.isDead = true;
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
