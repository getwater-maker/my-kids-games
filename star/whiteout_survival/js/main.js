/* Whiteout Survival - JS Implementation */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.onresize = resize;
resize();

// --- Game State ---
let resources = { wood: 100, food: 100, coal: 50 };
let furnace = { level: 1, fuel: 100, maxFuel: 100, upgradeCost: 150 };
let population = 4;
let temp = -25;
let time = 0;
let gameState = 'START';

// --- Assets/Visuals ---
let snowParticles = [];
for (let i = 0; i < 200; i++) {
    snowParticles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        v: 1 + Math.random() * 2,
        size: 1 + Math.random() * 3
    });
}

// --- Initialization ---
function init() {
    document.getElementById('start-game-btn').onclick = startGame;
    document.getElementById('restart-btn').onclick = () => location.reload();

    document.getElementById('gather-wood-btn').onclick = () => { resources.wood += 10; updateUI(); };
    document.getElementById('hunt-food-btn').onclick = () => { resources.food += 10; updateUI(); };
    document.getElementById('upgrade-btn').onclick = upgradeFurnace;

    requestAnimationFrame(gameLoop);
}

function startGame() {
    document.getElementById('start-overlay').classList.add('hidden');
    gameState = 'PLAYING';
}

function upgradeFurnace() {
    if (resources.wood >= furnace.upgradeCost) {
        resources.wood -= furnace.upgradeCost;
        furnace.level++;
        furnace.maxFuel += 50;
        furnace.fuel = furnace.maxFuel;
        furnace.upgradeCost = Math.floor(furnace.upgradeCost * 1.8);
        population += 2;
        updateUI();
    }
}

function update() {
    if (gameState !== 'PLAYING') return;

    time++;

    // Furnace Consumption
    furnace.fuel -= (0.05 + furnace.level * 0.02);

    // survivors consume food
    if (time % 600 === 0) {
        resources.food -= population;
        if (resources.food < 0) {
            resources.food = 0;
            population = Math.max(1, population - 1);
        }
    }

    // Temperature fluctuation
    temp = -25 - Math.sin(time * 0.001) * 20;

    if (furnace.fuel <= 0) {
        gameOver();
    }

    updateUI();
}

function updateUI() {
    document.getElementById('wood-count').textContent = Math.floor(resources.wood);
    document.getElementById('food-count').textContent = Math.floor(resources.food);
    document.getElementById('coal-count').textContent = Math.floor(furnace.fuel);
    document.getElementById('temp-value').textContent = Math.floor(temp);
    document.getElementById('pop-count').textContent = population;
    document.getElementById('f-lv').textContent = furnace.level;

    const progress = (furnace.fuel / furnace.maxFuel) * 100;
    document.getElementById('furnace-progress').style.width = progress + '%';

    const upgradeBtn = document.getElementById('upgrade-btn');
    upgradeBtn.textContent = `UPGRADE FURNACE (🌲 ${furnace.upgradeCost})`;
}

function draw() {
    // Fill Background (Frozen tundra)
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#1e293b');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Ground
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.moveTo(0, canvas.height * 0.7);
    for (let x = 0; x <= canvas.width; x += 50) {
        ctx.lineTo(x, canvas.height * 0.7 + Math.sin(x * 0.01) * 20);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.fill();

    // Draw Furnace (Center)
    const centerX = canvas.width / 2;
    const centerY = canvas.height * 0.7;

    // Furnace Building
    ctx.fillStyle = '#334155';
    ctx.fillRect(centerX - 40, centerY - 60, 80, 60);

    // Fire Glow
    if (furnace.fuel > 0) {
        const glow = ctx.createRadialGradient(centerX, centerY - 30, 0, centerX, centerY - 30, 40 + Math.sin(time * 0.1) * 10);
        glow.addColorStop(0, 'rgba(249, 115, 22, 0.8)');
        glow.addColorStop(1, 'rgba(249, 115, 22, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(centerX, centerY - 30, 50, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw Snow
    ctx.fillStyle = 'white';
    snowParticles.forEach(p => {
        p.y += p.v;
        p.x += Math.sin(time * 0.01 + p.y * 0.01);
        if (p.y > canvas.height) p.y = -10;
        if (p.x > canvas.width) p.x = 0;
        if (p.x < 0) p.x = canvas.width;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function gameOver() {
    gameState = 'OVER';
    document.getElementById('death-overlay').classList.remove('hidden');
}

init();
