// --- CONFIG ---
const CONFIG = {
    panLimit: 400, // Max pixels to pan world
    zoomLevel: 4,  // Scale when scoped
    enemySpawnRate: 3000,
    aiAccuracy: 0.3
};

// --- GLOBALS ---
let isScoped = false;
let playerHp = 100;
let enemyHp = 100;
let gameState = 'START';
let startTime = 0;
let mouseX = 0, mouseY = 0;
let worldX = 0, worldY = 0;

const world = document.getElementById('world');
const scopeOverlay = document.getElementById('scope-overlay');
const hpBar = document.getElementById('hp-bar');
const enemyContainer = document.getElementById('enemy-container');
const enemyHpBar = document.getElementById('enemy-hp-bar');

// --- INITIALIZATION ---
function init() {
    setupEventListeners();
    spawnEnemy();
}

function setupEventListeners() {
    window.addEventListener('mousemove', (e) => {
        if (gameState !== 'PLAYING') return;
        
        // Relative mouse pos for panning
        const relX = (e.clientX / window.innerWidth) - 0.5;
        const relY = (e.clientY / window.innerHeight) - 0.5;
        
        worldX = -relX * CONFIG.panLimit;
        worldY = -relY * CONFIG.panLimit;
        
        updateCamera();
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    window.addEventListener('mousedown', (e) => {
        if (gameState !== 'PLAYING') return;

        if (e.button === 2) { // Right Click: Scope
            toggleScope();
        } else if (e.button === 0) { // Left Click: Fire
            fireSnapshot(e.clientX, e.clientY);
        }
    });

    // Prevent context menu on right click
    window.addEventListener('contextmenu', e => e.preventDefault());

    document.getElementById('start-btn').onclick = () => {
        gameState = 'PLAYING';
        startTime = Date.now();
        document.getElementById('start-screen').classList.add('hidden');
        startMissionTimer();
        startAILogic();
    };
}

function updateCamera() {
    const scale = isScoped ? CONFIG.zoomLevel : 1;
    world.style.transform = `translate(${worldX}px, ${worldY}px) scale(${scale})`;
}

function toggleScope() {
    isScoped = !isScoped;
    scopeOverlay.classList.toggle('hidden', !isScoped);
    updateCamera();
}

function fireSnapshot(mx, my) {
    // Muzzle Flash
    const flash = document.getElementById('flash');
    flash.classList.remove('hidden');
    setTimeout(() => flash.classList.add('hidden'), 50);

    // Hit Logic
    const rect = enemyContainer.getBoundingClientRect();
    if (mx >= rect.left && mx <= rect.right && my >= rect.top && my <= rect.bottom) {
        // Hit!
        enemyHp -= 25;
        enemyHpBar.style.width = enemyHp + '%';
        showHitMarker();
        
        if (enemyHp <= 0) {
            triggerWin();
        } else {
            // Relocate enemy after hit
            setTimeout(spawnEnemy, 500);
        }
    }
}

function showHitMarker() {
    const hm = document.getElementById('hit-marker');
    hm.classList.remove('hidden');
    setTimeout(() => hm.classList.add('hidden'), 200);
}

function spawnEnemy() {
    // Random position in the world view
    const x = Math.random() * 150 + 20; // 20vw to 170vw
    const y = Math.random() * 80 + 40;  // 40vh to 120vh
    
    enemyContainer.style.left = x + 'vw';
    enemyContainer.style.top = y + 'vh';
    
    // Scale enemy size based on Y (pseudo-perspective)
    const scale = 0.5 + (y / 150);
    enemyContainer.style.transform = `scale(${scale})`;
}

function startAILogic() {
    setInterval(() => {
        if (gameState !== 'PLAYING') return;
        
        // AI fires if player doesn't move/hide?
        // Random chance to hit player
        if (Math.random() < CONFIG.aiAccuracy) {
            enemyFire();
        }
        
        // Randomly relocate every few seconds
        if (Math.random() > 0.7) spawnEnemy();
        
    }, CONFIG.enemySpawnRate);
}

function enemyFire() {
    // Screen shakes or flashes red
    document.body.style.background = '#300';
    setTimeout(() => document.body.style.background = '#000', 100);
    
    playerHp -= 10;
    hpBar.style.width = playerHp + '%';
    
    if (playerHp <= 0) {
        triggerGameOver();
    }
}

function startMissionTimer() {
    setInterval(() => {
        if (gameState !== 'PLAYING') return;
        const elapsed = Date.now() - startTime;
        const ms = Math.floor((elapsed % 1000) / 10);
        const s = Math.floor((elapsed / 1000) % 60);
        const m = Math.floor(elapsed / 60000);
        document.getElementById('timer').innerText = 
            `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}:${ms.toString().padStart(2,'0')}`;
    }, 10);
}

function triggerWin() {
    gameState = 'WIN';
    document.getElementById('game-result').classList.remove('hidden');
    document.getElementById('result-title').innerText = "MISSION COMPLETE";
    document.getElementById('result-title').style.color = "#00d2ff";
}

function triggerGameOver() {
    gameState = 'LOST';
    document.getElementById('game-result').classList.remove('hidden');
    document.getElementById('result-title').innerText = "KIA";
    document.getElementById('result-title').style.color = "#ff3131";
    document.getElementById('result-stats').innerText = "Mission Failed. Enemy Sniper Neutralized You.";
}

init();
