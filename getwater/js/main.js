import { getGoals, toggleGoal, subscribeToGame, updateGameState, getTaskSettings, saveTaskSettings, getWalletBalance, updateWalletBalance } from './db.js';
import { initOmokGame } from './omok.js';

// ============================================================
// Game Data (Family Mode)
// ============================================================
// ============================================================
// Game Data (Family Mode)
// ============================================================
let ROUNDS = [
    {
        player: "한봄", avatar: "🐻", category: "TV",
        categoryName: "TV 시청", categoryIcon: "📺", unit: "개",
        options: [4, 3, 2, 1], details: {}
    },
    {
        player: "한별", avatar: "🐱", category: "STUDY",
        categoryName: "공부", categoryIcon: "📚", unit: "개",
        options: [7, 4, 3, 2],
        details: {
            // Keep default details for now, or simplify
        }
    },
    {
        player: "한빛", avatar: "🐰", category: "GAME",
        categoryName: "게임 시간", categoryIcon: "🎮", unit: "분",
        options: [60, 50, 40, 30, 20, 10], details: {}
    }
];

// Load from LocalStorage if exists
const savedRounds = localStorage.getItem('familyRounds');
if (savedRounds) {
    try {
        ROUNDS = JSON.parse(savedRounds);
    } catch (e) { console.error("Failed to load rounds", e); }
}

window.openFamilyEdit = function () {
    document.getElementById('family-edit-modal').classList.remove('hidden');
    renderFamilyEdit();
}

window.saveFamilyEdit = function () {
    // Read edited values from inputs
    ROUNDS.forEach((r, i) => {
        const catInput = document.getElementById(`edit-cat-${i}`);
        const optsInput = document.getElementById(`edit-opts-${i}`);
        if (catInput) r.categoryName = catInput.value.trim() || r.categoryName;
        if (optsInput) {
            const newOpts = optsInput.value.split(',').map(s => s.trim()).filter(s => s);
            if (newOpts.length > 0) r.options = newOpts;
        }
    });
    saveRounds();
    document.getElementById('family-edit-modal').classList.add('hidden');
}

function renderFamilyEdit() {
    const list = document.getElementById('family-round-list');
    list.innerHTML = '';

    ROUNDS.forEach((r, i) => {
        const div = document.createElement('div');
        div.className = 'round-edit-item';
        div.innerHTML = `
            <div class="edit-round-header">
                <span class="edit-round-name">${r.avatar} ${r.player}</span>
            </div>
            <div class="edit-round-fields">
                <label>카테고리</label>
                <input type="text" id="edit-cat-${i}" value="${r.categoryName}">
                <label>항목 (쉼표 구분)</label>
                <input type="text" id="edit-opts-${i}" value="${r.options.join(', ')}">
            </div>
        `;
        list.appendChild(div);
    });
}

function saveRounds() {
    localStorage.setItem('familyRounds', JSON.stringify(ROUNDS));
}


// ============================================================
// Config
// ============================================================
const ENTRY_COLORS = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#45B7D1", "#96CEB4", "#DDA0DD", "#98D8C8", "#F7DC6F"];

// ============================================================
// Game State
// ============================================================
let gameState = {
    mode: '',           // 'family' or 'general'
    results: [],
    paths: [],
    // Family mode
    currentRound: 0,
    totalRounds: 3,
    familyResults: [],  // Collect results from each round for report
    player: '', avatar: '', category: '', categoryName: '', categoryIcon: '',
    selected: false,
    // General mode
    players: [],
    finishedPlayers: new Set(),
    playerCount: 4
};

let animating = false;

// ============================================================
// DOM Elements
// ============================================================
const startScreen = document.getElementById('start-screen');
const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const canvas = document.getElementById('ladderCanvas');
const ctx = canvas.getContext('2d');

window.addEventListener('resize', resizeCanvas);

// ============================================================
// Screen Transitions
// ============================================================
function switchScreen(from, to) {
    from.classList.remove('active');
    from.classList.add('hidden');
    to.classList.remove('hidden');
    to.classList.add('active');
}

// ============================================================
// Mode Selection
// ============================================================
function startFamilyGame() {
    gameState.mode = 'family';
    gameState.familyResults = [];
    // Show family-specific buttons
    document.getElementById('btn-edit-game').style.display = '';
    document.getElementById('btn-prev-round').style.display = '';
    document.getElementById('btn-next-round').style.display = '';
    loadFamilyRound(0);
    switchScreen(startScreen, gameScreen);
    setTimeout(resizeCanvas, 100);
}

function showSetupScreen() {
    gameState.playerCount = 4;
    document.getElementById('player-count').innerText = '4';
    generateInputFields();
    switchScreen(startScreen, setupScreen);
}

function backToStart() {
    // Hide all screens, then show start screen
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
        s.classList.add('hidden');
    });
    startScreen.classList.remove('hidden');
    startScreen.classList.add('active');
}

function startChessGame() {
    // Show chess screen with mode selection
    document.getElementById('chess-mode-select').classList.remove('hidden');
    document.getElementById('chess-game-area').classList.add('hidden');
    switchScreen(startScreen, document.getElementById('chess-screen'));
}

function backToStartFromChess() {
    switchScreen(document.getElementById('chess-screen'), startScreen);
}

// ============================================================
// General Mode: Setup
// ============================================================
function changeCount(delta) {
    let count = gameState.playerCount + delta;
    if (count < 2) count = 2;
    if (count > 8) count = 8;
    gameState.playerCount = count;
    document.getElementById('player-count').innerText = count;
    generateInputFields();
}

function generateInputFields() {
    const grid = document.getElementById('input-grid');
    grid.innerHTML = '';

    for (let i = 0; i < gameState.playerCount; i++) {
        const row = document.createElement('div');
        row.className = 'input-row';
        row.innerHTML = `
            <span class="input-dot" style="background:${ENTRY_COLORS[i]}"></span>
            <input type="text" id="name-${i}" placeholder="이름 ${i + 1}" maxlength="6">
            <input type="text" id="item-${i}" placeholder="아이템 ${i + 1}" maxlength="10">
        `;
        grid.appendChild(row);
    }
}

function startGeneralGame() {
    const players = [];
    const items = [];

    for (let i = 0; i < gameState.playerCount; i++) {
        const name = document.getElementById(`name-${i}`).value.trim() || `참가자${i + 1}`;
        const item = document.getElementById(`item-${i}`).value.trim() || `아이템${i + 1}`;
        players.push(name);
        items.push(item);
    }

    gameState.mode = 'general';
    gameState.players = players;
    gameState.finishedPlayers = new Set();
    // Hide family-specific buttons
    document.getElementById('btn-edit-game').style.display = 'none';
    document.getElementById('btn-prev-round').style.display = 'none';
    document.getElementById('btn-next-round').style.display = 'none';

    // Shuffle items for random bottom placement
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    gameState.results = shuffled.map(item => ({ display: item }));

    // Setup header
    document.getElementById('round-title').innerText = '일반 사다리 게임';
    document.getElementById('round-subtitle').innerText = `${players.length}명 참가`;
    document.getElementById('current-player-info').style.display = 'none';
    document.getElementById('instruction').innerText = '👆 이름을 클릭하여 사다리를 타세요!';

    // Setup ladder
    setupGeneralLadderUI();
    generateLadderPaths(players.length);

    switchScreen(setupScreen, gameScreen);
    setTimeout(resizeCanvas, 100);
}

// ============================================================
// General Mode: Ladder UI
// ============================================================
function setupGeneralLadderUI() {
    const startNodes = document.getElementById('start-nodes');
    const endNodes = document.getElementById('end-nodes');
    startNodes.innerHTML = '';
    endNodes.innerHTML = '';

    // Player names at top
    gameState.players.forEach((name, i) => {
        const div = document.createElement('div');
        div.className = 'player-node';
        div.id = `player-${i}`;
        div.onclick = () => runGeneralLadder(i);
        div.innerHTML = `
            <div class="player-avatar" style="background:${ENTRY_COLORS[i % ENTRY_COLORS.length]}">${name.charAt(0)}</div>
            <span class="player-label">${name}</span>
        `;
        startNodes.appendChild(div);
    });

    // Covered items at bottom
    gameState.results.forEach((res, i) => {
        const div = document.createElement('div');
        div.className = 'result-node covered';
        div.id = `result-${i}`;
        endNodes.appendChild(div);
    });
}

// ============================================================
// General Mode: Run & Result
// ============================================================
function runGeneralLadder(playerIndex) {
    if (animating) return;
    if (gameState.finishedPlayers.has(playerIndex)) return;

    animating = true;

    const playerNode = document.getElementById(`player-${playerIndex}`);
    playerNode.classList.add('tracing');

    const color = ENTRY_COLORS[playerIndex % ENTRY_COLORS.length];
    const { pathPoints, finalCol } = calculatePath(playerIndex);

    animatePath(pathPoints, color, () => {
        gameState.finishedPlayers.add(playerIndex);
        playerNode.classList.remove('tracing');
        playerNode.classList.add('finished');
        showGeneralResult(playerIndex, finalCol);
    });
}

function showGeneralResult(playerIdx, itemColIdx) {
    const item = gameState.results[itemColIdx];
    const playerName = gameState.players[playerIdx];
    const color = ENTRY_COLORS[playerIdx % ENTRY_COLORS.length];

    // Reveal item node
    const resultNode = document.getElementById(`result-${itemColIdx}`);
    resultNode.classList.remove('covered');
    resultNode.innerText = item.display;
    resultNode.style.background = color;
    resultNode.style.color = 'white';

    setTimeout(() => {
        document.getElementById('modal-player-name').innerText = `${playerName}의 결과!`;
        document.getElementById('modal-result-icon').innerText = '🎉';
        document.getElementById('modal-result-text').innerText = item.display;
        document.getElementById('modal-result-text').className = '';
        document.getElementById('modal-details').innerHTML = '';
        document.getElementById('modal-details').classList.add('hidden');

        const btnArea = document.getElementById('modal-btn-area');
        const allDone = gameState.finishedPlayers.size >= gameState.players.length;

        if (allDone) {
            btnArea.innerHTML = '<button class="btn-primary" onclick="location.reload()">다시 하기</button>';
        } else {
            btnArea.innerHTML = '<button class="btn-primary" onclick="closeModal()">확인</button>';
        }

        document.getElementById('result-modal').classList.remove('hidden');
    }, 500);
}

function closeModal() {
    document.getElementById('result-modal').classList.add('hidden');
}

// ============================================================
// Family Mode: Data
// ============================================================
function getRoundData(roundIndex) {
    if (roundIndex < 0 || roundIndex >= ROUNDS.length) return null;
    const r = ROUNDS[roundIndex];

    const shuffled = [...r.options];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return {
        player: r.player, avatar: r.avatar,
        category: r.category, categoryName: r.categoryName,
        categoryIcon: r.categoryIcon,
        results: shuffled.map(val => {
            const res = { value: val, display: `${val}${r.unit}` };
            if (r.category === "STUDY" && r.details[val]) res.details = r.details[val];
            return res;
        }),
        totalRounds: ROUNDS.length,
        currentRound: roundIndex + 1
    };
}

// ============================================================
// Family Mode: Game Flow
// ============================================================
function loadFamilyRound(roundIndex) {
    const data = getRoundData(roundIndex);
    if (!data) return;

    gameState.currentRound = roundIndex;
    gameState.totalRounds = data.totalRounds;
    gameState.player = data.player;
    gameState.avatar = data.avatar;
    gameState.category = data.category;
    gameState.categoryName = data.categoryName;
    gameState.categoryIcon = data.categoryIcon;
    gameState.results = data.results;
    gameState.selected = false;

    document.getElementById('round-title').innerText = `라운드 ${data.currentRound} / ${data.totalRounds}`;
    document.getElementById('round-subtitle').innerText = `${data.categoryIcon} ${data.player}의 ${data.categoryName}`;
    document.getElementById('current-player-info').style.display = 'flex';
    document.getElementById('current-player-avatar').innerText = data.avatar;
    document.getElementById('current-player-name').innerText = data.player;
    document.getElementById('instruction').innerText = `👆 ${data.player}! 위에서 번호를 하나 선택하세요!`;

    setupFamilyLadderUI();
    generateLadderPaths(data.results.length);
    setTimeout(resizeCanvas, 50);
}

function setupFamilyLadderUI() {
    const startNodes = document.getElementById('start-nodes');
    const endNodes = document.getElementById('end-nodes');
    startNodes.innerHTML = '';
    endNodes.innerHTML = '';

    const numCols = gameState.results.length;

    for (let i = 0; i < numCols; i++) {
        const div = document.createElement('div');
        div.className = 'entry-node';
        div.onclick = () => runFamilyLadder(i);
        div.innerHTML = `<div class="entry-circle" style="background:${ENTRY_COLORS[i % ENTRY_COLORS.length]}">${i + 1}</div>`;
        startNodes.appendChild(div);
    }

    gameState.results.forEach((res, index) => {
        const div = document.createElement('div');
        div.className = 'result-node covered';
        div.id = `result-${index}`;
        endNodes.appendChild(div);
    });
}

function runFamilyLadder(entryIndex) {
    if (animating || gameState.selected) return;

    animating = true;
    gameState.selected = true;

    const entryNodes = document.querySelectorAll('.entry-node');
    entryNodes.forEach((node, idx) => {
        if (idx === entryIndex) node.classList.add('selected');
        else node.style.opacity = '0.4';
    });

    const color = ENTRY_COLORS[entryIndex % ENTRY_COLORS.length];
    const { pathPoints, finalCol } = calculatePath(entryIndex);

    animatePath(pathPoints, color, () => {
        showFamilyResult(finalCol);
    });
}

function showFamilyResult(resultColIdx) {
    const result = gameState.results[resultColIdx];

    // Collect result for report
    gameState.familyResults.push({
        player: gameState.player,
        avatar: gameState.avatar,
        categoryName: gameState.categoryName,
        categoryIcon: gameState.categoryIcon,
        result: result.display
    });

    const resultNode = document.getElementById(`result-${resultColIdx}`);
    resultNode.classList.remove('covered');
    resultNode.innerText = result.display;
    resultNode.style.background = '#FF6B6B';
    resultNode.style.color = 'white';

    setTimeout(() => {
        document.getElementById('modal-player-name').innerText = `${gameState.avatar} ${gameState.player}의 결과!`;
        document.getElementById('modal-result-icon').innerText = gameState.categoryIcon;
        document.getElementById('modal-result-text').innerText = `${gameState.categoryName} ${result.display}`;
        document.getElementById('modal-result-text').className = '';

        const mDetails = document.getElementById('modal-details');
        mDetails.innerHTML = '';
        mDetails.classList.add('hidden');

        if (gameState.category === 'STUDY' && result.details && result.details.length > 0) {
            mDetails.classList.remove('hidden');
            let html = '<h4>할 일 목록:</h4><ul class="details-list">';
            result.details.forEach(item => { html += `<li>${item}</li>`; });
            html += '</ul>';
            mDetails.innerHTML = html;
        }

        const btnArea = document.getElementById('modal-btn-area');
        if (gameState.currentRound < gameState.totalRounds - 1) {
            btnArea.innerHTML = '<button class="btn-primary" onclick="nextFamilyRound()">다음 라운드 →</button>';
        } else {
            // Show final report
            btnArea.innerHTML = '<button class="btn-primary" onclick="showFamilyReport()">결과 보기</button>';
        }

        document.getElementById('result-modal').classList.remove('hidden');
    }, 500);
}

function nextFamilyRound() {
    document.getElementById('result-modal').classList.add('hidden');
    loadFamilyRound(gameState.currentRound + 1);
}

function prevFamilyRound() {
    if (gameState.currentRound > 0) {
        loadFamilyRound(gameState.currentRound - 1);
    }
}

function skipToNextRound() {
    if (gameState.currentRound < gameState.totalRounds - 1) {
        loadFamilyRound(gameState.currentRound + 1);
    }
}

function showFamilyReport() {
    document.getElementById('result-modal').classList.add('hidden');
    const modal = document.getElementById('result-modal');
    document.getElementById('modal-player-name').innerText = '게임 리포트';
    document.getElementById('modal-result-icon').innerText = '📊';
    document.getElementById('modal-result-text').innerText = '오늘의 결과';
    document.getElementById('modal-result-text').className = '';

    const mDetails = document.getElementById('modal-details');
    mDetails.classList.remove('hidden');
    let html = '<div style="text-align:left">';
    gameState.familyResults.forEach((r, i) => {
        html += `<div style="padding:10px;margin-bottom:8px;background:#f0f0f0;border-radius:10px;display:flex;align-items:center;gap:10px">
            <span style="font-size:1.5rem">${r.avatar}</span>
            <div><b>${r.player}</b> - ${r.categoryIcon} ${r.categoryName}<br>
            <span style="color:#FF6B6B;font-weight:bold;font-size:1.1rem">${r.result}</span></div>
        </div>`;
    });
    html += '</div>';
    mDetails.innerHTML = html;

    document.getElementById('modal-btn-area').innerHTML = '<button class="btn-primary" onclick="backToStart(); closeModal();">처음으로</button>';
    modal.classList.remove('hidden');
}

// ============================================================
// Shared: Ladder Path Generation
// ============================================================
function generateLadderPaths(columns) {
    gameState.paths = [];
    const steps = columns <= 4 ? 15 : 20;

    for (let i = 0; i < steps; i++) {
        const bridgeRowY = (i + 1) / (steps + 1);
        if (Math.random() > 0.3) {
            const col = Math.floor(Math.random() * (columns - 1));
            gameState.paths.push({ y: bridgeRowY, col: col });
        }
    }
}

// ============================================================
// Shared: Canvas Drawing
// ============================================================
function resizeCanvas() {
    if (!gameScreen.classList.contains('active')) return;
    const box = canvas.getBoundingClientRect();
    canvas.width = box.width;
    canvas.height = box.height;
    drawLadder();
}

function drawLadder() {
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const cols = gameState.results.length;
    if (cols === 0) return;
    const colWidth = w / cols;

    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    for (let i = 0; i < cols; i++) {
        const x = colWidth / 2 + i * colWidth;
        ctx.strokeStyle = '#bbb';
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    }

    gameState.paths.forEach(bridge => {
        const x1 = colWidth / 2 + bridge.col * colWidth;
        const x2 = colWidth / 2 + (bridge.col + 1) * colWidth;
        const y = bridge.y * h;
        ctx.strokeStyle = '#bbb';
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();
    });
}

// ============================================================
// Shared: Path Calculation & Animation
// ============================================================
function calculatePath(startCol) {
    const w = canvas.width;
    const h = canvas.height;
    const cols = gameState.results.length;
    const colWidth = w / cols;

    let pathPoints = [];
    let curCol = startCol;
    const sortedBridges = [...gameState.paths].sort((a, b) => a.y - b.y);

    pathPoints.push({ x: colWidth / 2 + curCol * colWidth, y: 0 });

    sortedBridges.forEach(bridge => {
        if (bridge.col === curCol || bridge.col === curCol - 1) {
            pathPoints.push({ x: colWidth / 2 + curCol * colWidth, y: bridge.y * h });
            if (bridge.col === curCol) curCol += 1;
            else curCol -= 1;
            pathPoints.push({ x: colWidth / 2 + curCol * colWidth, y: bridge.y * h });
        }
    });

    pathPoints.push({ x: colWidth / 2 + curCol * colWidth, y: h });
    return { pathPoints, finalCol: curCol };
}

function animatePath(pathPoints, color, onComplete) {
    let pointIdx = 0;
    let progress = 0;
    const speed = 0.05;

    function animate() {
        if (pointIdx >= pathPoints.length - 1) {
            animating = false;
            onComplete();
            return;
        }

        const p1 = pathPoints[pointIdx];
        const p2 = pathPoints[pointIdx + 1];

        progress += speed;
        if (progress >= 1) {
            progress = 0;
            pointIdx++;
            ctx.strokeStyle = color;
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            requestAnimationFrame(animate);
            return;
        }

        const curX = p1.x + (p2.x - p1.x) * progress;
        const curY = p1.y + (p2.y - p1.y) * progress;

        ctx.strokeStyle = color;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(curX, curY);
        ctx.stroke();

        requestAnimationFrame(animate);
    }

    animate();
}

// ============================================================
// Auth & User Profile (Removed)
// ============================================================
// Login is no longer required.
// window.handleLogin = ...
// window.handleLogout = ...
// onUserChange(...) 

// Auto-join family room on load
// Assignments moved to end of file to ensure definition exists

// Auto-join family room logic — moved to end of file after FAMILY_ROOM_ID is declared


// ============================================================
// To-Do List & Wallet
// ============================================================
let currentSettingsChild = '한봄';
let taskSettings = {};

function updateTabUI(selector, activeName) {
    document.querySelectorAll(selector).forEach(btn => {
        if (btn.innerText.includes(activeName)) btn.classList.add('active');
        else btn.classList.remove('active');
    });
}

// ============================================================
// Settings Logic
// ============================================================
window.openSettings = function () {
    document.getElementById('scheduler-modal').classList.add('hidden');
    document.getElementById('settings-modal').classList.remove('hidden');
    switchSettingsTab('한봄'); // Default
};

window.closeSettings = function () {
    document.getElementById('settings-modal').classList.add('hidden');
    document.getElementById('scheduler-modal').classList.remove('hidden');
    // Refresh the scheduler to show changes
    if (window.refreshScheduler) window.refreshScheduler();
};

window.switchSettingsTab = async function (childName) {
    currentSettingsChild = childName;
    updateTabUI('.settings-content .tab-btn', childName);
    loadSettingsList(childName);
};

async function loadSettingsList(childName) {
    const list = document.getElementById('settings-task-list');
    list.innerHTML = '<p>Loading...</p>';

    let tasks = await getTaskSettings(childName);
    if (!tasks) tasks = [];
    taskSettings[childName] = tasks; // Cache

    renderSettingsList(tasks);
}

function renderSettingsList(tasks) {
    const list = document.getElementById('settings-task-list');
    list.innerHTML = '';

    tasks.forEach((task, idx) => {
        const div = document.createElement('div');
        div.className = 'setting-item';
        div.innerHTML = `
            <div class="goal-left">
                <span class="goal-label">${task.name}</span>
                <span class="goal-reward">${task.reward}원</span>
            </div>
            <button class="delete-btn" onclick="deleteTask(${idx})">삭제</button>
        `;
        list.appendChild(div);
    });
}

window.addNewTask = async function () {
    const nameInput = document.getElementById('new-task-name');
    const rewardInput = document.getElementById('new-task-reward');

    const name = nameInput.value.trim();
    const reward = parseInt(rewardInput.value) || 0;

    if (!name) {
        alert("할 일 이름을 입력해주세요.");
        return;
    }

    const tasks = taskSettings[currentSettingsChild] || [];
    const newTask = {
        id: Date.now().toString(),
        name: name,
        reward: reward
    };

    tasks.push(newTask);

    renderSettingsList(tasks);
    nameInput.value = '';

    await saveTaskSettings(currentSettingsChild, tasks);
};

window.deleteTask = async function (index) {
    const tasks = taskSettings[currentSettingsChild] || [];
    if (confirm(`${tasks[index].name}을(를) 삭제하시겠습니까?`)) {
        tasks.splice(index, 1);
        renderSettingsList(tasks);
        await saveTaskSettings(currentSettingsChild, tasks);
    }
};

// ============================================================
// Multiplayer (Family Room)
// ============================================================
const FAMILY_ROOM_ID = 'family_room';
let isOnlineGame = false;

function joinFamilyRoom() {
    subscribeToGame(FAMILY_ROOM_ID, (data) => {
        if (data) {
            // If another player sets the round, prompt to join or auto-update?
            // For now, simple state sync: if 'ladderStarted' is true, show animation
            if (data.activeRound !== undefined && data.activeRound !== gameState.currentRound) {
                // Sync round
                // loadFamilyRound(data.activeRound);
            }

            if (data.lastSelection && data.timestamp > Date.now() - 5000) {
                // Someone selected a number recently
                // Show animation if we are on the same screen
            }
        }
    });
}

// Override runFamilyLadder to report to DB
const originalRunFamilyLadder = window.runFamilyLadder || function () { }; // It's not on window yet, it is local.
// We need to inject DB call into runFamilyLadder.
// Since runFamilyLadder is defined above in this file, we can't easily override it without modifying the original function.
// But for now, let's just leave the local logic and add Auth/Goals which was the main complex part.

// ============================================================
// Expose functions to global scope for HTML onclick attributes
// ============================================================
// ============================================================
// Omok Game Logic Integration
// ============================================================
// import { initOmokGame } from './omok.js'; // Already imported at top

window.showOmokScreen = function () {
    document.getElementById('start-screen').classList.remove('active');
    document.getElementById('start-screen').classList.add('hidden');
    // Reset to mode step
    document.getElementById('omok-mode-step').classList.remove('hidden');
    document.getElementById('omok-pvp-step').classList.add('hidden');
    document.getElementById('omok-screen').classList.remove('hidden');
    document.getElementById('omok-screen').classList.add('active');
};

window.showOmokBoard = function () {
    document.getElementById('omok-screen').classList.remove('active');
    document.getElementById('omok-screen').classList.add('hidden');
    document.getElementById('omok-game-area').classList.remove('hidden');
    document.getElementById('omok-game-area').classList.add('active');
};

window.backToStartFromOmok = function () {
    document.getElementById('omok-game-area').classList.add('hidden');
    // Clear Game State if needed
    if (window.restartOmok) window.restartOmok(); // Reset board logic
    const boardEl = document.getElementById('omok-board');
    if (boardEl) boardEl.innerHTML = ''; // Physically clear

    document.getElementById('omok-game-area').classList.add('hidden');
    document.getElementById('omok-game-area').classList.remove('active');
    document.getElementById('omok-screen').classList.add('hidden');
    document.getElementById('omok-screen').classList.remove('active');
    document.getElementById('omok-level-screen').classList.add('hidden');

    document.getElementById('start-screen').classList.remove('hidden');
    document.getElementById('start-screen').classList.add('active');
};

function showOmokLevelSelect() {
    document.getElementById('omok-mode-step').classList.add('hidden');
    document.getElementById('omok-screen').classList.add('hidden');
    document.getElementById('omok-level-screen').classList.remove('hidden');
    document.getElementById('omok-level-screen').classList.add('active');
}

function backToOmokMode() {
    document.getElementById('omok-level-screen').classList.add('hidden');
    document.getElementById('omok-level-screen').classList.remove('active');
    document.getElementById('omok-mode-step').classList.remove('hidden');
    document.getElementById('omok-screen').classList.remove('hidden');
    document.getElementById('omok-screen').classList.add('active');
}

window.backFromOmokStep = function () {
    const pvpStep = document.getElementById('omok-pvp-step');
    if (pvpStep && !pvpStep.classList.contains('hidden')) {
        pvpStep.classList.add('hidden');
        document.getElementById('omok-mode-step').classList.remove('hidden');
    } else {
        backToStart();
    }
};

window.showOmokLevelSelect = showOmokLevelSelect;
window.backToOmokMode = backToOmokMode;

window.initOmokGame = initOmokGame;
// window.restartOmok is exported from omok.js, needs to be attached to window in main or imported

// We need to attach other omok functions to window if not already done in omok.js
// In omok.js we did: window.startOmokGame = ..., window.restartOmok = ...
// So we just need to make sure the module is loaded.
// Since we import initOmokGame, the module body executes and attaches window functions.


// ============================================================
// Expose functions
// ============================================================
window.startFamilyGame = startFamilyGame;
window.showSetupScreen = showSetupScreen;
window.backToStart = backToStart;
window.startChessGame = startChessGame;
window.backToStartFromChess = backToStartFromChess;
window.changeCount = changeCount;
window.startGeneralGame = startGeneralGame;
window.nextFamilyRound = nextFamilyRound;
window.prevFamilyRound = prevFamilyRound;
window.skipToNextRound = skipToNextRound;
window.showFamilyReport = showFamilyReport;
window.closeModal = closeModal;
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.switchSettingsTab = switchSettingsTab;
window.addNewTask = addNewTask;
window.deleteTask = deleteTask;


// ============================================================
// Initialization
// ============================================================
joinFamilyRoom();



