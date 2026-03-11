/* Neon Rider Main Game Loop */

const { Engine, Render, Runner, Bodies, Composite, Constraint, Vector, Body, Events } = Matter;

let engine, runner, render;
let player, wheelA, wheelB, playerBox;
let isHolding = false;
let score = 0, bestScore = 0, gemCount = 0;
let currentStage = parseInt(localStorage.getItem('neon_rider_stage')) || 1;
let gameState = 'START';
let trackSegments = [];
let nextTrackX = 0;
let lastTrackY = 400;
let cameraX = 0;

const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;

function init() {
    engine = Engine.create();

    // Create Matter.js render - we will use a custom drawing logic for neon look, but we can use this for debug
    render = Render.create({
        canvas: document.getElementById('gameCanvas'),
        engine: engine,
        options: {
            width: WIDTH,
            height: HEIGHT,
            wireframes: false,
            background: 'transparent',
            hasBounds: true // Enable camera bounds
        }
    });

    runner = Runner.create();

    setupPlayer();
    setupEvents();
    generateTrack(true);
}

function setupPlayer() {
    const startX = 200;
    const startY = 400; // Adjusted closer to start

    // The Bike Frame
    playerBox = Bodies.rectangle(startX, startY, 40, 15, {
        render: { fillStyle: '#ff00ff' },
        label: 'player_body',
        frictionAir: 0.02,
        collisionFilter: { group: -1 }
    });

    // Wheels
    wheelA = Bodies.circle(startX - 20, startY + 15, 12, {
        render: { fillStyle: '#00d2ff' },
        friction: 0.9,
        label: 'wheel'
    });

    wheelB = Bodies.circle(startX + 20, startY + 15, 12, {
        render: { fillStyle: '#00d2ff' },
        friction: 0.9,
        label: 'wheel'
    });

    // Constraints (Axles)
    const axleA = Constraint.create({
        bodyA: playerBox,
        pointA: { x: -20, y: 15 },
        bodyB: wheelA,
        stiffness: 0.4,
        length: 2
    });

    const axleB = Constraint.create({
        bodyA: playerBox,
        pointA: { x: 20, y: 15 },
        bodyB: wheelB,
        stiffness: 0.4,
        length: 2
    });

    player = Composite.create();
    Composite.add(player, [playerBox, wheelA, wheelB, axleA, axleB]);
    Composite.add(engine.world, player);
}

function generateTrack(first = false) {
    if (first) {
        nextTrackX = 0;
        lastTrackY = 600; // Fixed height for start reliability

        // Initial flat start
        for (let i = 0; i < 10; i++) {
            addTrackSegment(nextTrackX, lastTrackY, 150, 0);
        }
    }

    // Generate upcoming segments
    for (let i = 0; i < 15; i++) {
        const length = 180 + Math.random() * 100;
        const angle = (Math.random() - 0.3) * 0.4; // More downhill favor
        addTrackSegment(nextTrackX, lastTrackY, length, angle);
    }
}

function addTrackSegment(x, y, length, angle) {
    const endX = x + Math.cos(angle) * length;
    const endY = y + Math.sin(angle) * length;

    const centerX = (x + endX) / 2;
    const centerY = (y + endY) / 2;

    const segment = Bodies.rectangle(centerX, centerY, length, 12, { // Thicker track
        isStatic: true,
        angle: angle,
        render: { fillStyle: '#00d2ff', strokeStyle: '#fff', lineWidth: 2 },
        label: 'track',
        friction: 0.8
    });

    Composite.add(engine.world, segment);
    trackSegments.push(segment);

    // Gems
    if (Math.random() < 0.2) {
        const gem = Bodies.circle(centerX, centerY - 80, 12, {
            isSensor: true,
            isStatic: true, // Make static so they don't fall!
            label: 'gem',
            render: { fillStyle: '#ff00ff', glow: '0 0 10px #ff00ff' }
        });
        Composite.add(engine.world, gem);
    }

    nextTrackX = endX;
    lastTrackY = endY;
}

function setupEvents() {
    window.addEventListener('mousedown', () => isHolding = true);
    window.addEventListener('mouseup', () => isHolding = false);
    window.addEventListener('touchstart', (e) => { e.preventDefault(); isHolding = true; }, { passive: false });
    window.addEventListener('touchend', () => isHolding = false);

    window.addEventListener('keydown', (e) => { if (e.code === 'Space' || e.code === 'ArrowUp') isHolding = true; });
    window.addEventListener('keyup', (e) => { if (e.code === 'Space' || e.code === 'ArrowUp') isHolding = false; });

    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    document.getElementById('next-stage-btn').addEventListener('click', nextStage);

    Events.on(engine, 'beforeUpdate', () => {
        if (gameState !== 'PLAYING') return;

        if (isHolding) {
            // Stronger motor force for 'Woosh' feel
            Body.setAngularVelocity(wheelB, 0.6);
            Body.setAngularVelocity(wheelA, 0.6);

            // Add forward 'boost' force
            Body.applyForce(playerBox, playerBox.position, { x: 0.005, y: -0.001 });

            // Flip rotation
            Body.setAngularVelocity(playerBox, playerBox.angularVelocity - 0.06);
        }

        // Camera follow
        const targetX = playerBox.position.x - 400;
        const targetY = playerBox.position.y - HEIGHT / 2;

        // Smooth interpolation for camera
        cameraX += (targetX - cameraX) * 0.1;
        let currentY = render.bounds.min.y;
        let newY = currentY + (targetY - currentY) * 0.1;

        render.bounds.min.x = cameraX;
        render.bounds.max.x = cameraX + WIDTH;
        render.bounds.min.y = newY;
        render.bounds.max.y = newY + HEIGHT;

        // Procedural generation
        if (nextTrackX < cameraX + WIDTH + 1000) {
            generateTrack();
        }

        // Score
        score = Math.max(score, Math.floor(playerBox.position.x / 100) - 2);
        updateUI();

        // Check for Stage Clear
        if (score >= 1000) {
            winStage();
        }
    });

    Events.on(engine, 'collisionStart', (event) => {
        event.pairs.forEach((pair) => {
            if (pair.bodyA.label === 'player_body' || pair.bodyB.label === 'player_body') {
                if (pair.bodyA.label === 'track' || pair.bodyB.label === 'track') {
                    die();
                }
            }
            if ((pair.bodyA.label === 'gem' || pair.bodyB.label === 'gem') && (pair.bodyA.label.includes('player') || pair.bodyB.label.includes('player'))) {
                const gem = pair.bodyA.label === 'gem' ? pair.bodyA : pair.bodyB;
                Composite.remove(engine.world, gem);
                gemCount++;
            }
        });
    });
}

function startGame() {
    document.getElementById('overlay').classList.add('hidden');
    gameState = 'PLAYING';
    Render.run(render);
    Runner.run(runner, engine);
}

function restartGame() {
    location.reload();
}

function winStage() {
    if (gameState === 'WIN') return;
    gameState = 'WIN';

    // Stop runner
    Runner.stop(runner);

    document.getElementById('win-screen').classList.remove('hidden');
    document.getElementById('stage-clear-msg').textContent = `Stage ${currentStage} Complete!`;

    currentStage++;
    localStorage.setItem('neon_rider_stage', currentStage);
}

function nextStage() {
    location.reload(); // Simplest way to reset everything for next stage
}

function die() {
    if (gameState === 'DEAD') return;
    gameState = 'DEAD';
    document.getElementById('death-screen').classList.remove('hidden');
    document.getElementById('final-score').textContent = `SCORE: ${score}`;
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('neon_rider_best', bestScore);
    }
}

function updateUI() {
    document.getElementById('score').textContent = `SCORE: ${score} / 1000`;
    document.getElementById('gem-count').textContent = gemCount;
    document.getElementById('stage-info').textContent = `STAGE ${currentStage}`;

    const progress = Math.min(100, (score / 1000) * 100);
    document.getElementById('progress-bar').style.width = progress + '%';
}

// Initial Call
bestScore = localStorage.getItem('neon_rider_best') || 0;
document.getElementById('best').textContent = `BEST: ${bestScore}`;
init();
