import * as THREE from 'three';

// --- Configuration & Constants ---
const FIELD_SIZE = 500;
const BATTER_POS = new THREE.Vector3(0, 1.2, 50);
const PITCHER_POS = new THREE.Vector3(0, 1.5, -40);
const MAX_OUTS = 3;

// --- State Variables ---
let scene, camera, renderer, clock;
let ball, bat, pitcher;
let ballVelocity = new THREE.Vector3();
let isPitched = false;
let isHit = false;
let score = 0, hits = 0, outs = 0;
let gameState = 'START'; // START, PLAYING, END

let swingTimer = 0;
const SWING_DURATION = 0.4; // Seconds

// --- Initialization ---
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky Blue
    scene.fog = new THREE.Fog(0x87ceeb, 20, 300);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Behind-the-batter view
    camera.position.set(0, 4, 65);
    camera.lookAt(0, 2, -10);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    clock = new THREE.Clock();

    setupLighting();
    setupField();
    setupStands();
    setupPlayers();
    setupEventListeners();

    animate();
}

function setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    sunLight.position.set(50, 100, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);
}

function setupField() {
    // Grass
    const grassGeo = new THREE.PlaneGeometry(FIELD_SIZE, FIELD_SIZE);
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x27ae60 });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.receiveShadow = true;
    scene.add(grass);

    // Dirt infield (Diamond)
    const diamondGeo = new THREE.IcosahedronGeometry(60, 0); // Flat-ish diamond
    const dirtMat = new THREE.MeshStandardMaterial({ color: 0xd35400 });
    const diamond = new THREE.Mesh(diamondGeo, dirtMat);
    diamond.scale.set(1, 0.01, 1);
    diamond.rotation.y = Math.PI / 4;
    diamond.position.y = 0.01;
    scene.add(diamond);

    // Bases
    const baseGeo = new THREE.BoxGeometry(2, 0.2, 2);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const homeBase = new THREE.Mesh(baseGeo, baseMat);
    homeBase.position.set(0, 0.05, 52);
    scene.add(homeBase);
}

function setupStands() {
    // Basic stands
    const standGeo = new THREE.TorusGeometry(150, 20, 16, 100, Math.PI);
    const standMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50 });
    constスタンド = new THREE.Mesh(standGeo, standMat);
    スタンド.rotation.x = Math.PI / 2;
    スタンド.position.z = -100;
    scene.add(スタンド);
}

function setupPlayers() {
    // Pitcher (Red)
    const pitcherGeo = new THREE.CapsuleGeometry(0.7, 1.5, 4, 8);
    const pMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c });
    pitcher = new THREE.Mesh(pitcherGeo, pMat);
    pitcher.position.copy(PITCHER_POS);
    pitcher.castShadow = true;
    scene.add(pitcher);

    // Bat
    const batGeo = new THREE.CylinderGeometry(0.1, 0.15, 3.5);
    const batMat = new THREE.MeshStandardMaterial({ color: 0xbdc3c7 });
    bat = new THREE.Mesh(batGeo, batMat);
    bat.rotation.z = Math.PI / 2; // Horizontal
    bat.position.copy(BATTER_POS);
    bat.position.x = 2; // Right side
    scene.add(bat);

    // Ball
    const ballGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const ballMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    ball = new THREE.Mesh(ballGeo, ballMat);
    ball.castShadow = true;
    resetBall();
    scene.add(ball);
}

function resetBall() {
    ball.position.copy(PITCHER_POS);
    ball.position.y += 1; // Hand height
    ballVelocity.set(0, 0, 0);
    isPitched = false;
    isHit = false;

    // Slow delay before pitch
    if (gameState === 'PLAYING') {
        setTimeout(pitchBall, 2000);
    }
}

function pitchBall() {
    if (gameState !== 'PLAYING') return;
    isPitched = true;
    ballVelocity.set(
        (Math.random() - 0.5) * 1, // Curve
        0.1,
        25 // Speed toward batter
    );
}

function setupEventListeners() {
    window.addEventListener('mousedown', swingBat);
    window.addEventListener('keydown', (e) => { if (e.code === 'Space') swingBat(); });

    document.getElementById('start-btn').onclick = () => {
        document.getElementById('overlay').classList.add('hidden');
        gameState = 'PLAYING';
        resetBall();
    };

    document.getElementById('restart-btn').onclick = () => location.reload();
}

function swingBat() {
    if (gameState !== 'PLAYING' || swingTimer > 0) return;
    swingTimer = SWING_DURATION;

    // Check hit logic
    if (isPitched && !isHit) {
        const dist = ball.position.distanceTo(new THREE.Vector3(0, BATTER_POS.y, BATTER_POS.z));
        if (dist < 4) {
            scoreSuccess();
        }
    }
}

function scoreSuccess() {
    isHit = true;
    hits++;
    score += 100;

    // Launch ball into the distance
    ballVelocity.set(
        (Math.random() - 0.5) * 10,
        15,
        -50
    );

    showCombo();
    updateHUD();
}

function scoreOut() {
    outs++;
    updateHUD();
    if (outs >= MAX_OUTS) {
        gameOver();
    } else {
        resetBall();
    }
}

function showCombo() {
    const box = document.getElementById('combo-display');
    box.classList.remove('hidden');
    setTimeout(() => box.classList.add('hidden'), 2000);
}

function updateHUD() {
    document.getElementById('hit-count').textContent = hits;
    document.getElementById('out-count').textContent = outs;
    document.getElementById('total-score').textContent = score;
}

function gameOver() {
    gameState = 'END';
    document.getElementById('game-over').classList.remove('hidden');
    document.getElementById('final-score').textContent = score;
    document.getElementById('final-hits').textContent = hits;
}

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    if (gameState === 'PLAYING') {
        updateGame(delta);
    }

    renderer.render(scene, camera);
}

function updateGame(dt) {
    // Bat Animation
    if (swingTimer > 0) {
        swingTimer -= dt;
        const phase = (SWING_DURATION - swingTimer) / SWING_DURATION;
        bat.rotation.y = -Math.PI / 2 + Math.sin(phase * Math.PI) * 2;
        bat.position.x = 2 - Math.sin(phase * Math.PI) * 4;
    } else {
        bat.rotation.y = 0;
        bat.position.x = 2;
    }

    // Ball Movement
    if (isPitched || isHit) {
        ball.position.add(ballVelocity.clone().multiplyScalar(dt));
        if (!isHit) ballVelocity.y -= 0.05; // Gravity

        // Out detection
        if (ball.position.z > 80 && !isHit) {
            scoreOut();
        }

        // Return ball after hit flies off
        if (isHit && (ball.position.y < 0 || ball.position.z < -200)) {
            resetBall();
        }
    }
}

init();
