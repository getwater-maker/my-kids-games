const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- GAME STATE ---
let state = {
    hp: 100,
    hunger: 100,
    fuel: 100,
    day: 1,
    time: 0, // 0 to 1
    isDay: true,
    wood: 0,
    food: 0,
    gameState: 'START',
    camera: { x: 0, y: 0 },
    player: { x: 0, y: 0, targetX: 0, targetY: 0, speed: 4, radius: 15 },
    ais: [] // List of AI players
};

let entities = []; // Trees, Rocks, Animals
let worldSize = 3000;

function init() {
    resize();
    window.addEventListener('resize', resize);
    
    document.getElementById('start-btn').onclick = () => {
        state.gameState = 'PLAYING';
        document.getElementById('start-screen').classList.add('hidden');
    };

    generateWorld();
    spawnAIs();
    requestAnimationFrame(gameLoop);
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function generateWorld() {
    // Campfire at (0,0)
    entities.push({ type: 'FIRE', x: 0, y: 0, radius: 30 });

    // Trees & Gatherables
    for (let i = 0; i < 200; i++) {
        const x = (Math.random() - 0.5) * worldSize;
        const y = (Math.random() - 0.5) * worldSize;
        if (Math.hypot(x, y) < 100) continue;

        entities.push({ type: 'TREE', x, y, radius: 40 });
        if (Math.random() > 0.5) entities.push({ type: 'WOOD', x: x + 20, y: y + 20, radius: 10 });
        if (Math.random() > 0.8) entities.push({ type: 'FOOD', x: x - 20, y: y - 20, radius: 10 });
    }
}

function spawnAIs() {
    const aiNames = ["Alex", "Sam", "Jordan", "Taylor", "Casey", "Riley", "Charlie", "Quinn", "Skyler"];
    const colors = ["#ff9f43", "#0abde3", "#10ac84", "#5f27cd", "#ee5253", "#54a0ff", "#2ecc71", "#f1c40f", "#9b59b6"];
    for (let i = 0; i < 9; i++) {
        state.ais.push({
            name: aiNames[i],
            color: colors[i],
            x: (Math.random() - 0.5) * 200,
            y: (Math.random() - 0.5) * 200,
            targetX: 0,
            targetY: 0,
            wait: 0,
            wood: 0,
            food: 0,
            hunger: 100,
            radius: 15,
            speed: 3
        });
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function update() {
    if (state.gameState !== 'PLAYING') return;

    // Player Movement
    const pdx = state.player.targetX - (canvas.width/2);
    const pdy = state.player.targetY - (canvas.height/2);
    const pdist = Math.hypot(pdx, pdy);

    if (pdist > 5) {
        state.player.x += (pdx / pdist) * state.player.speed;
        state.player.y += (pdy / pdist) * state.player.speed;
    }

    state.camera.x = state.player.x;
    state.camera.y = state.player.y;

    // Time cycle
    state.time += 0.001;
    if (state.time >= 1) {
        state.time = 0;
        state.isDay = !state.isDay;
        if (state.isDay) state.day++;
    }

    // Survival Decay
    state.hunger -= 0.02;
    if (state.hunger <= 0) { state.hunger = 0; state.hp -= 0.1; }

    if (!state.isDay) {
        state.fuel -= 0.05;
        const distToFire = Math.hypot(state.player.x, state.player.y);
        if (distToFire > 150 && state.fuel <= 0) state.hp -= 0.2;
    }

    // AI Logic
    state.ais.forEach(ai => {
        ai.hunger -= 0.015;
        
        // AI Decision Making
        if (ai.wait > 0) {
            ai.wait--;
        } else {
            const distToFire = Math.hypot(ai.x, ai.y);
            
            // At night or low hunger, go home or find food
            if (!state.isDay || ai.hunger < 50 || ai.wood >= 2) {
                ai.targetX = 0;
                ai.targetY = 0;
            } else {
                // Roam / Find nearest wood
                if (Math.random() < 0.01) {
                    ai.targetX += (Math.random() - 0.5) * 300;
                    ai.targetY += (Math.random() - 0.5) * 300;
                }
            }

            // Move AI
            const adx = ai.targetX - ai.x;
            const ady = ai.targetY - ai.y;
            const adist = Math.hypot(adx, ady);
            if (adist > 5) {
                ai.x += (adx / adist) * ai.speed;
                ai.y += (ady / adist) * ai.speed;
            } else {
                ai.wait = 60 + Math.random() * 120;
            }
        }

        // Entity Interaction for AI
        entities.forEach((entity, index) => {
            const d = Math.hypot(ai.x - entity.x, ai.y - entity.y);
            if (d < ai.radius + entity.radius) {
                if (entity.type === 'WOOD') { ai.wood++; entities.splice(index, 1); }
                if (entity.type === 'FOOD') { ai.food++; entities.splice(index, 1); }
                if (entity.type === 'FIRE' && ai.wood > 0) { 
                    state.fuel = Math.min(100, state.fuel + 20); 
                    ai.wood--; 
                }
            }
        });

        // AI Consumption
        if (ai.food > 0 && ai.hunger < 80) { ai.food--; ai.hunger += 20; }
    });

    // Interaction check for Player
    entities.forEach((entity, index) => {
        const d = Math.hypot(state.player.x - entity.x, state.player.y - entity.y);
        if (d < state.player.radius + entity.radius) {
            if (entity.type === 'WOOD') { state.wood++; entities.splice(index, 1); }
            if (entity.type === 'FOOD') { state.food++; entities.splice(index, 1); }
            if (entity.type === 'FIRE' && state.wood > 0) { state.fuel = Math.min(100, state.fuel + 20); state.wood--; }
        }
    });

    if (state.food > 0 && state.hunger < 80) { state.food--; state.hunger += 20; }

    if (state.hp <= 0) {
        state.gameState = 'OVER';
        document.getElementById('game-over').classList.remove('hidden');
        document.getElementById('final-days').textContent = state.day;
    }

    updateUI();
}

function updateUI() {
    document.getElementById('hp-fill').style.width = state.hp + '%';
    document.getElementById('hunger-fill').style.width = state.hunger + '%';
    document.getElementById('fuel-fill').style.width = state.fuel + '%';
    document.getElementById('day-info').innerHTML = `DAY ${state.day} - <span id="time-status" style="color:${state.isDay?'#ffce00':'#54a0ff'}">${state.isDay?'낮':'밤'}</span>`;
    document.getElementById('wood-count').textContent = state.wood;
    document.getElementById('food-count').textContent = state.food;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2 - state.camera.x, canvas.height / 2 - state.camera.y);

    // Draw Ground
    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect(-worldSize/2, -worldSize/2, worldSize, worldSize);

    // Grid details
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    for(let i = -worldSize/2; i < worldSize/2; i+=100) {
        ctx.beginPath(); ctx.moveTo(i, -worldSize/2); ctx.lineTo(i, worldSize/2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-worldSize/2, i); ctx.lineTo(worldSize/2, i); ctx.stroke();
    }

    // Entities
    entities.forEach(ent => {
        if (ent.type === 'FIRE') {
            ctx.fillStyle = '#ff4757';
            ctx.beginPath(); ctx.arc(ent.x, ent.y, 15, 0, Math.PI*2); ctx.fill();
            // Glow
            const glow = ctx.createRadialGradient(ent.x, ent.y, 10, ent.x, ent.y, 100);
            glow.addColorStop(0, 'rgba(255, 165, 2, 0.4)');
            glow.addColorStop(1, 'rgba(255, 165, 2, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath(); ctx.arc(ent.x, ent.y, 100, 0, Math.PI*2); ctx.fill();
        } else if (ent.type === 'TREE') {
            ctx.fillStyle = '#051005';
            ctx.beginPath(); ctx.arc(ent.x, ent.y, 25, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#2d3436';
            ctx.beginPath(); ctx.arc(ent.x, ent.y, 10, 0, Math.PI*2); ctx.fill();
        } else if (ent.type === 'WOOD') {
            ctx.fillStyle = '#5d4037';
            ctx.fillRect(ent.x - 8, ent.y - 3, 16, 6);
        } else if (ent.type === 'FOOD') {
            ctx.fillStyle = '#ff3131';
            ctx.beginPath(); ctx.arc(ent.x, ent.y, 6, 0, Math.PI*2); ctx.fill();
        }
    });

    // AI Players
    state.ais.forEach(ai => {
        ctx.fillStyle = ai.color;
        ctx.beginPath(); ctx.arc(ai.x, ai.y, ai.radius, 0, Math.PI*2); ctx.fill();
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(ai.name, ai.x, ai.y - 20);
        
        // Hunger bar for AI
        ctx.fillStyle = '#333';
        ctx.fillRect(ai.x - 15, ai.y + 20, 30, 4);
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(ai.x - 15, ai.y + 20, (ai.hunger/100) * 30, 4);
    });

    // Player
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(state.player.x, state.player.y, state.player.radius, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#2ecc71';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();

    // Night overlay
    if (!state.isDay) {
        ctx.fillStyle = 'rgba(0, 0, 10, 0.85)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Dynamic lighting
        ctx.globalCompositeOperation = 'destination-out';
        
        // Light around player
        const pGrad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, 250);
        pGrad.addColorStop(0, 'rgba(0,0,0,1)');
        pGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = pGrad;
        ctx.beginPath(); ctx.arc(canvas.width/2, canvas.height/2, 250, 0, Math.PI*2); ctx.fill();
        
        // Light around fire
        const fx = canvas.width/2 - state.camera.x;
        const fy = canvas.height/2 - state.camera.y;
        const fGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, 300);
        fGrad.addColorStop(0, 'rgba(0,0,0,1)');
        fGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = fGrad;
        ctx.beginPath(); ctx.arc(fx, fy, 300, 0, Math.PI*2); ctx.fill();
        
        ctx.globalCompositeOperation = 'source-over';
    }
}

window.onmousemove = (e) => {
    state.player.targetX = e.clientX;
    state.player.targetY = e.clientY;
};

init();
