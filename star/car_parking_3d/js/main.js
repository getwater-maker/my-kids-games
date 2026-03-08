// star/car_parking_3d/js/main.js

// --- Configuration & Constants ---
const CONFIG = {
    acceleration: 0.05,
    maxSpeed: 0.8,
    friction: 0.96,
    steering: 0.04,
    brakeForce: 0.9,
    spawnPos: { x: 0, z: 20 },
    targetPos: { x: 0, z: -20 },
    targetSize: { w: 4, d: 8 }
};

// --- Game State ---
let scene, camera, renderer;
let car, targetZone;
let obstacles = [];
let gameState = 'START';
let currentLevel = 1;
let startTime;
let damage = 0;
let gear = 'D'; // 'D' or 'R'

// Input
const keys = {};

// UI
const hud = document.getElementById('hud');
const startScreen = document.getElementById('start-screen');
const winScreen = document.getElementById('level-complete');
const loseScreen = document.getElementById('game-over');
const speedText = document.getElementById('speed-text');
const timerText = document.getElementById('timer-text');
const damageFill = document.getElementById('damage-fill');
const gearD = document.getElementById('gear-d');
const gearR = document.getElementById('gear-r');

// Physics variables
let speed = 0;
let angle = 0;

// --- Initialization ---
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    scene.fog = new THREE.Fog(0x1a1a1a, 20, 100);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 15, 30);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.camera.left = -50;
    dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = -50;
    scene.add(dirLight);

    createMap();
    createCar();
    createTargetZone();

    // Event listeners
    window.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (e.code === 'KeyR' && gameState === 'PLAYING') toggleGear();
    });
    window.addEventListener('keyup', (e) => keys[e.code] = false);
    document.getElementById('start-btn').onclick = startGame;
    document.getElementById('next-level-btn').onclick = nextLevel;

    animate();
}

function createMap() {
    // Floor
    const floorGeo = new THREE.PlaneGeometry(100, 100);
    const floorMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid lines
    const grid = new THREE.GridHelper(100, 20, 0xffffff, 0x444444);
    grid.position.y = 0.05;
    scene.add(grid);

    // Walls
    createWall(0, 50, 100, 2);
    createWall(0, -50, 100, 2);
    createWall(50, 0, 2, 100);
    createWall(-50, 0, 2, 100);

    // Initial Level Obstacles
    setupLevel(1);
}

function createWall(x, z, w, d) {
    const geo = new THREE.BoxGeometry(w, 4, d);
    const mat = new THREE.MeshPhongMaterial({ color: 0x222222 });
    const wall = new THREE.Mesh(geo, mat);
    wall.position.set(x, 2, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
    obstacles.push(wall);
}

function createCar() {
    const group = new THREE.Group();

    // Body
    const bodyGeo = new THREE.BoxGeometry(2, 0.8, 4);
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0xff4757 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6;
    body.castShadow = true;
    group.add(body);

    // Roof
    const roofGeo = new THREE.BoxGeometry(1.6, 0.6, 2);
    const roofMat = new THREE.MeshPhongMaterial({ color: 0x2f3542 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 1.3, -0.2);
    group.add(roof);

    // Windows
    const winGeo = new THREE.BoxGeometry(1.4, 0.4, 1.8);
    const winMat = new THREE.MeshBasicMaterial({ color: 0x1e90ff, transparent: true, opacity: 0.5 });
    const win = new THREE.Mesh(winGeo, winMat);
    win.position.set(0, 1.3, -0.2);
    group.add(win);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 12);
    const wheelMat = new THREE.MeshPhongMaterial({ color: 0x111111 });
    const wheelPos = [
        { x: 0.9, z: 1.2 }, { x: -0.9, z: 1.2 },
        { x: 0.9, z: -1.2 }, { x: -0.9, z: -1.2 }
    ];
    wheelPos.forEach(p => {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(p.x, 0.4, p.z);
        group.add(w);
    });

    // Lights
    const lGeo = new THREE.BoxGeometry(0.4, 0.2, 0.1);
    const frontLMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
    const fL = new THREE.Mesh(lGeo, frontLMat);
    fL.position.set(0.6, 0.6, -2.01);
    group.add(fL);
    const fR = fL.clone();
    fR.position.x = -0.6;
    group.add(fR);

    group.position.set(CONFIG.spawnPos.x, 0, CONFIG.spawnPos.z);
    scene.add(group);
    car = group;
}

function createTargetZone() {
    const group = new THREE.Group();
    // Border lines
    const lineGeo = new THREE.BoxGeometry(CONFIG.targetSize.w, 0.1, 0.2);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffd32a });

    const f = new THREE.Mesh(lineGeo, lineMat);
    f.position.z = CONFIG.targetSize.d / 2;
    group.add(f);
    const b = f.clone();
    b.position.z = -CONFIG.targetSize.d / 2;
    group.add(b);

    const sideGeo = new THREE.BoxGeometry(0.2, 0.1, CONFIG.targetSize.d);
    const sl = new THREE.Mesh(sideGeo, lineMat);
    sl.position.x = CONFIG.targetSize.w / 2;
    group.add(sl);
    const sr = sl.clone();
    sr.position.x = -CONFIG.targetSize.w / 2;
    group.add(sr);

    // Glowing base
    const pGeo = new THREE.PlaneGeometry(CONFIG.targetSize.w, CONFIG.targetSize.d);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(pGeo, pMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = 0.05;
    group.add(plane);

    group.position.set(CONFIG.targetPos.x, 0, CONFIG.targetPos.z);
    scene.add(group);
    targetZone = group;
}

function setupLevel(lv) {
    // Clear old obstacles
    obstacles.forEach(o => {
        if (o.type !== 'Mesh') return; // Keep walls
        // Only remove non-boundary obstacles if needed
    });

    if (lv === 1) {
        createObstacleCar(8, -10, Math.PI / 2);
        createObstacleCar(-8, -10, -Math.PI / 2);
    } else if (lv === 2) {
        createObstacleCar(8, -10, 0);
        createObstacleCar(-8, -15, 0);
        createObstacleCar(0, 0, Math.PI / 4);
    }
}

function createObstacleCar(x, z, rot) {
    const geo = new THREE.BoxGeometry(2, 1.2, 4.2);
    const mat = new THREE.MeshPhongMaterial({ color: Math.random() * 0xffffff });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, 0.6, z);
    m.rotation.y = rot;
    scene.add(m);
    obstacles.push(m);
}

// --- Gameplay ---
function startGame() {
    gameState = 'PLAYING';
    startScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    startTime = Date.now();
    damage = 0;
    speed = 0;
    angle = 0;
    updateHUD();
}

function nextLevel() {
    currentLevel++;
    winScreen.classList.add('hidden');
    car.position.set(CONFIG.spawnPos.x, 0, CONFIG.spawnPos.z);
    car.rotation.y = 0;
    angle = 0; speed = 0; damage = 0;
    setupLevel(currentLevel);
    document.getElementById('level-text').textContent = `LEVEL ${currentLevel}`;
    startGame();
}

function toggleGear() {
    gear = (gear === 'D' ? 'R' : 'D');
    gearD.classList.toggle('active');
    gearR.classList.toggle('active');
}

function updatePhysics() {
    if (gameState !== 'PLAYING') return;

    // Movement logic
    const moveDir = gear === 'D' ? 1 : -1;

    if (keys['KeyW'] || keys['ArrowUp']) {
        speed += CONFIG.acceleration * moveDir;
    } else if (keys['KeyS'] || keys['ArrowDown']) {
        speed -= CONFIG.acceleration * moveDir;
    } else {
        speed *= CONFIG.friction;
    }

    // Brake
    if (keys['Space']) speed *= CONFIG.brakeForce;

    // Limit speed
    speed = Math.max(-CONFIG.maxSpeed, Math.min(CONFIG.maxSpeed, speed));

    // Steering (only when moving)
    if (Math.abs(speed) > 0.01) {
        const steerDir = speed > 0 ? 1 : -1;
        if (keys['KeyA'] || keys['ArrowLeft']) angle += CONFIG.steering * steerDir * (gear === 'D' ? 1 : -1);
        if (keys['KeyD'] || keys['ArrowRight']) angle -= CONFIG.steering * steerDir * (gear === 'D' ? 1 : -1);
    }

    car.rotation.y = angle;
    car.position.x += Math.sin(angle) * speed;
    car.position.z += Math.cos(angle) * speed;

    // Camera follow
    const camOffset = new THREE.Vector3(Math.sin(angle) * 15, 8, Math.cos(angle) * 15);
    camera.position.lerp(car.position.clone().add(camOffset), 0.1);
    camera.lookAt(car.position);

    checkCollisions();
    checkWinCondition();
}

function checkCollisions() {
    const carBox = new THREE.Box3().setFromObject(car);

    for (const obstacle of obstacles) {
        const obsBox = new THREE.Box3().setFromObject(obstacle);
        if (carBox.intersectsBox(obsBox)) {
            // Collision!
            speed *= -0.5; // Bounce back
            damage += 50; // High damage for now to trigger fail quickly
            updateHUD();
            if (damage >= 100) triggerGameOver();
        }
    }
}

function checkWinCondition() {
    const dx = Math.abs(car.position.x - targetZone.position.x);
    const dz = Math.abs(car.position.z - targetZone.position.z);

    // Check if in zone and almost stopped and aligned
    if (dx < 1.5 && dz < 2.5 && Math.abs(speed) < 0.05) {
        const angleDiff = Math.abs(car.rotation.y % Math.PI);
        if (angleDiff < 0.2 || angleDiff > Math.PI - 0.2) {
            triggerWin();
        }
    }
}

function updateHUD() {
    speedText.textContent = Math.abs(Math.round(speed * 200));
    damageFill.style.width = damage + '%';

    if (gameState === 'PLAYING') {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const s = (elapsed % 60).toString().padStart(2, '0');
        timerText.textContent = `${m}:${s}`;
    }
}

function triggerWin() {
    gameState = 'WIN';
    winScreen.classList.remove('hidden');
    document.getElementById('result-time').textContent = `소요 시간: ${timerText.textContent}`;
}

function triggerGameOver() {
    gameState = 'LOSE';
    loseScreen.classList.remove('hidden');
}

function animate() {
    requestAnimationFrame(animate);
    updatePhysics();
    updateHUD();
    renderer.render(scene, camera);
}

// Start app
window.onload = init;
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
