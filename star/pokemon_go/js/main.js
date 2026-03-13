// star/pokemon_go/js/main.js

const mapCanvas = document.getElementById('mapCanvas');
const mctx = mapCanvas.getContext('2d');
const catchCanvas = document.getElementById('catchCanvas');
const cctx = catchCanvas.getContext('2d');

let gameState = 'START';
let currentCaught = 0;
let caughtPokemon = [];

// Pokemon data
const POKEMON_LIST = [
    { name: 'Pikachu', emoji: '⚡', color: '#f9ca24' },
    { name: 'Bulbasaur', emoji: '🌱', color: '#2ecc71' },
    { name: 'Charmander', emoji: '🔥', color: '#e67e22' },
    { name: 'Squirtle', emoji: '💧', color: '#3498db' },
    { name: 'Gengar', emoji: '👻', color: '#9b59b6' },
    { name: 'Snorlax', emoji: '💤', color: '#34495e' }
];

// Map Player
const player = {
    x: 0,
    y: 0,
    speed: 5,
    size: 40
};

// Map State
let mapPokemon = [];
const keys = {};

// Catch State
let activePokemon = null;
let pokeball = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    isFlying: false,
    radius: 30,
    grabbed: false
};
let dragStart = { x: 0, y: 0 };

function init() {
    resize();
    player.x = mapCanvas.width / 2;
    player.y = mapCanvas.height / 2;

    for (let i = 0; i < 5; i++) spawnMapPokemon();

    window.addEventListener('keydown', e => keys[e.code] = true);
    window.addEventListener('keyup', e => keys[e.code] = false);

    // UI Buttons
    document.getElementById('start-btn').onclick = () => {
        document.getElementById('overlay').classList.add('hidden');
        gameState = 'EXPLORE';
        requestAnimationFrame(gameLoop);
    };

    document.getElementById('run-btn').onclick = () => {
        gameState = 'EXPLORE';
        document.getElementById('catch-view').classList.add('hidden');
    };

    document.getElementById('ok-btn').onclick = () => {
        document.getElementById('catch-result').classList.add('hidden');
        gameState = 'EXPLORE';
        document.getElementById('catch-view').classList.add('hidden');
    };

    // Catch listeners
    catchCanvas.addEventListener('mousedown', startBallDrag);
    window.addEventListener('mousemove', dragBall);
    window.addEventListener('mouseup', endBallDrag);

    // Touch Support
    catchCanvas.addEventListener('touchstart', e => {
        const t = e.touches[0];
        startBallDrag({ clientX: t.clientX, clientY: t.clientY });
    });
    window.addEventListener('touchmove', e => {
        const t = e.touches[0];
        dragBall({ clientX: t.clientX, clientY: t.clientY });
    });
    window.addEventListener('touchend', endBallDrag);
}

function resize() {
    mapCanvas.width = window.innerWidth;
    mapCanvas.height = window.innerHeight;
    catchCanvas.width = window.innerWidth;
    catchCanvas.height = window.innerHeight;
}

function spawnMapPokemon() {
    const data = POKEMON_LIST[Math.floor(Math.random() * POKEMON_LIST.length)];
    mapPokemon.push({
        ...data,
        x: Math.random() * mapCanvas.width,
        y: Math.random() * mapCanvas.height,
        size: 50,
        pulse: 0
    });
}

function updateExploration() {
    if (keys['KeyW'] || keys['ArrowUp']) player.y -= player.speed;
    if (keys['KeyS'] || keys['ArrowDown']) player.y += player.speed;
    if (keys['KeyA'] || keys['ArrowLeft']) player.x -= player.speed;
    if (keys['KeyD'] || keys['ArrowRight']) player.x += player.speed;

    // Check encounter
    mapPokemon.forEach((p, index) => {
        const dist = Math.sqrt((player.x - p.x) ** 2 + (player.y - p.y) ** 2);
        if (dist < 50) {
            startCatch(p);
            mapPokemon.splice(index, 1);
            spawnMapPokemon(); // Respawn elsewhere
        }
    });

    // Pulse effects
    mapPokemon.forEach(p => p.pulse += 0.05);
}

function drawExploration() {
    mctx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);

    // Grid floor
    mctx.strokeStyle = 'rgba(255,255,255,0.1)';
    const spacing = 100;
    for (let x = 0; x < mapCanvas.width; x += spacing) {
        mctx.beginPath();
        mctx.moveTo(x, 0); mctx.lineTo(x, mapCanvas.height);
        mctx.stroke();
    }
    for (let y = 0; y < mapCanvas.height; y += spacing) {
        mctx.beginPath();
        mctx.moveTo(0, y); mctx.lineTo(mapCanvas.width, y);
        mctx.stroke();
    }

    // Draw Pokemon sightings
    mapPokemon.forEach(p => {
        mctx.save();
        mctx.globalAlpha = 0.5 + Math.sin(p.pulse) * 0.3;
        mctx.fillStyle = 'rgba(255,255,255,0.2)';
        mctx.beginPath();
        mctx.arc(p.x, p.y, p.size + Math.sin(p.pulse) * 5, 0, Math.PI * 2);
        mctx.fill();
        mctx.restore();

        mctx.font = '30px serif';
        mctx.textAlign = 'center';
        mctx.textBaseline = 'middle';
        mctx.fillText(p.emoji, p.x, p.y);
    });

    // Draw Player (Avatar)
    mctx.fillStyle = '#00A2FF';
    mctx.beginPath();
    mctx.arc(player.x, player.y, 20, 0, Math.PI * 2);
    mctx.fill();
    mctx.strokeStyle = 'white';
    mctx.lineWidth = 4;
    mctx.stroke();
}

function startCatch(pokemon) {
    gameState = 'CATCH';
    activePokemon = { ...pokemon, catchX: catchCanvas.width / 2, catchY: 250, radius: 60 };
    document.getElementById('catch-view').classList.remove('hidden');
    document.getElementById('pokemon-name').textContent = activePokemon.name;
    resetBall();
}

function resetBall() {
    pokeball.x = catchCanvas.width / 2;
    pokeball.y = catchCanvas.height - 150;
    pokeball.vx = 0;
    pokeball.vy = 0;
    pokeball.isFlying = false;
    pokeball.grabbed = false;
}

function startBallDrag(e) {
    if (gameState !== 'CATCH' || pokeball.isFlying) return;
    const dist = Math.sqrt((e.clientX - pokeball.x) ** 2 + (e.clientY - pokeball.y) ** 2);
    if (dist < 100) {
        pokeball.grabbed = true;
        dragStart.x = e.clientX;
        dragStart.y = e.clientY;
    }
}

function dragBall(e) {
    if (pokeball.grabbed) {
        pokeball.x = e.clientX;
        pokeball.y = e.clientY;
    }
}

function endBallDrag(e) {
    if (pokeball.grabbed) {
        pokeball.grabbed = false;
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;

        // Only throw if meaningful swipe
        if (dy < -20) {
            pokeball.vx = dx * 0.1;
            pokeball.vy = dy * 0.1;
            pokeball.isFlying = true;
        } else {
            resetBall();
        }
    }
}

function updateCatch() {
    if (pokeball.isFlying) {
        pokeball.x += pokeball.vx;
        pokeball.y += pokeball.vy;
        pokeball.vy += 0.5; // Gravity

        // Bounce off walls
        if (pokeball.x < 0 || pokeball.x > catchCanvas.width) pokeball.vx *= -1;

        // Check collision with Pokemon
        const dist = Math.sqrt((pokeball.x - activePokemon.catchX) ** 2 + (pokeball.y - activePokemon.catchY) ** 2);
        if (dist < activePokemon.radius) {
            catchSuccess();
        }

        // Out of bounds
        if (pokeball.y > catchCanvas.height || pokeball.y < -100) resetBall();
    }
}

function drawCatch() {
    cctx.clearRect(0, 0, catchCanvas.width, catchCanvas.height);

    // Target Ring
    if (activePokemon) {
        cctx.strokeStyle = '#2ecc71';
        cctx.lineWidth = 4;
        cctx.beginPath();
        const pulse = Math.abs(Math.sin(Date.now() / 200)) * 20;
        cctx.arc(activePokemon.catchX, activePokemon.catchY, 40 + pulse, 0, Math.PI * 2);
        cctx.stroke();

        cctx.font = '100px serif';
        cctx.textAlign = 'center';
        cctx.textBaseline = 'middle';
        cctx.fillText(activePokemon.emoji, activePokemon.catchX, activePokemon.catchY);
    }

    // Pokeball
    cctx.save();
    cctx.translate(pokeball.x, pokeball.y);
    if (pokeball.isFlying) cctx.rotate(Date.now() / 50);

    // Bottom half (White)
    cctx.fillStyle = 'white';
    cctx.beginPath();
    cctx.arc(0, 0, 30, 0, Math.PI * 2);
    cctx.fill();

    // Top half (Red)
    cctx.fillStyle = '#eb4d4b';
    cctx.beginPath();
    cctx.arc(0, 0, 30, Math.PI, 0);
    cctx.fill();

    // Center belt
    cctx.fillStyle = '#222';
    cctx.fillRect(-30, -3, 60, 6);

    // Inner button
    cctx.beginPath();
    cctx.arc(0, 0, 10, 0, Math.PI * 2);
    cctx.fill();
    cctx.fillStyle = 'white';
    cctx.beginPath();
    cctx.arc(0, 0, 6, 0, Math.PI * 2);
    cctx.fill();
    cctx.restore();
}

function catchSuccess() {
    pokeball.isFlying = false;
    currentCaught++;
    caughtPokemon.push(activePokemon);
    document.getElementById('caught-count').textContent = currentCaught;

    document.getElementById('catch-result').classList.remove('hidden');
    document.getElementById('result-status').textContent = 'GOTCHA!';
    document.getElementById('caught-visual').textContent = activePokemon.emoji;

    gameState = 'RESULT';
}

function gameLoop() {
    if (gameState === 'EXPLORE') {
        updateExploration();
        drawExploration();
    } else if (gameState === 'CATCH') {
        updateCatch();
        drawCatch();
    }
    requestAnimationFrame(gameLoop);
}

window.onload = init;
window.addEventListener('resize', resize);
