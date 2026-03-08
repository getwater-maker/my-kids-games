// star/police_escape_3d/js/main.js

const CONFIG = {
    walkSpeed: 0.05,
    runSpeed: 0.08,
    jumpForce: 0.22,
    gravity: 0.012,
    respawnY: -30,
    startPos: { x: 0, y: 0.25, z: 0 }
};

let scene, camera, renderer, controls;
let gameState = 'START';
let startTime, deaths = 0;
let platforms = [];
let checkpoints = [{ x: 0, y: 1, z: 0 }];
let currentCheckpointIdx = 0;

// Input
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let isJumping = false;
const keys = {};

// UI
let timerText, deathText, startScreen, winScreen, finalTime, finalDeaths;

function init() {
    timerText = document.getElementById('timer');
    deathText = document.getElementById('death-count');
    startScreen = document.getElementById('start-screen');
    winScreen = document.getElementById('win-screen');
    finalTime = document.getElementById('final-time');
    finalDeaths = document.getElementById('final-deaths');

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x7fb3d5); // Lighter, clearer Blue
    scene.fog = new THREE.Fog(0x7fb3d5, 20, 150); // Much further fog

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Initial camera height: Floor top (0.25) + Player Eye Height (1.2) = 1.45
    camera.position.set(CONFIG.startPos.x, CONFIG.startPos.y + 1.2, CONFIG.startPos.z);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x000000, 0.8);
    scene.add(hemiLight);

    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(50, 100, 50);
    sun.castShadow = true;
    scene.add(sun);

    // Flashlight (attached to camera)
    const flashlight = new THREE.SpotLight(0xffffff, 1.5);
    flashlight.position.set(0, 0, 0);
    flashlight.angle = Math.PI / 6;
    flashlight.penumbra = 0.5;
    flashlight.decay = 2;
    flashlight.distance = 50;
    camera.add(flashlight);
    camera.add(flashlight.target);
    flashlight.target.position.set(0, 0, -1);
    scene.add(camera);

    // Controls
    controls = new THREE.PointerLockControls(camera, document.body);

    document.getElementById('start-btn').onclick = () => {
        controls.lock();
    };

    controls.addEventListener('lock', () => {
        if (gameState === 'START') {
            gameState = 'PLAYING';
            startTime = Date.now();
            startScreen.classList.add('hidden');
            document.getElementById('hud').classList.remove('hidden');
        }
    });

    createMap();
    setupInput();
    animate();
}

function createMap() {
    // 1. Initial Jail Cell
    createBox(0, 0, 0, 10, 0.5, 10, 0x4a4a4a); // Floor
    createBox(-5, 3, 0, 0.5, 6, 10, 0x333333); // Back wall
    createBox(0, 3, -5, 10, 6, 0.5, 0x333333); // Side wall
    createBox(0, 3, 5, 10, 6, 0.5, 0x333333);  // Side wall
    createBox(0, 6, 0, 10, 0.5, 10, 0x333333); // Ceiling

    // Front Exit (Bars with gaps)
    for (let i = -4; i <= 4; i += 2) {
        if (i === 0) continue; // Small gap to exit
        createBox(5, 3, i, 0.2, 6, 0.2, 0x111111);
    }

    const path = [
        // --- STAGE 1: CONCRETE ESCAPE ---
        { x: 10, y: 0.8, z: 0, w: 4, d: 4, color: 0xbdc3c7 },
        { x: 16, y: 2, z: 2, w: 3, d: 3 },
        { x: 22, y: 3.5, z: -1, w: 3, d: 3 },
        { x: 28, y: 5, z: 1, w: 4, d: 4, checkpoint: true, color: 0x2980b9 }, // Checkpoint 1

        // --- STAGE 2: POLICE CAR ROOFTOPS ---
        { x: 35, y: 4.5, z: 4, w: 3, d: 4, color: 0x2c3e50 },
        { x: 42, y: 5, z: 1, w: 3, d: 4, color: 0x2c3e50 },
        { x: 48, y: 6.5, z: -2, w: 3, d: 4, color: 0x2c3e50 },
        { x: 55, y: 7.5, z: 0, w: 6, d: 6, checkpoint: true, color: 0x2980b9 }, // Checkpoint 2

        // --- STAGE 3: INDUSTRIAL PIPES ---
        { x: 64, y: 8.5, z: 3, w: 1.5, d: 7, color: 0xe67e22 },
        { x: 72, y: 10, z: -2, w: 1.5, d: 7, color: 0xe67e22 },
        { x: 80, y: 11.5, z: 0, w: 6, d: 6, checkpoint: true, color: 0x2980b9 }, // Checkpoint 3

        // --- STAGE 4: HIGH-VOLTAGE WIRES ---
        { x: 88, y: 12.5, z: 3, w: 7, d: 1, color: 0x1e272e },
        { x: 97, y: 14, z: -3, w: 7, d: 1, color: 0x1e272e },
        { x: 106, y: 15.5, z: 1, w: 7, d: 7, checkpoint: true, color: 0x2980b9 }, // Checkpoint 4

        // --- STAGE 5: FINAL ROOFTOP & HELIPAD ---
        { x: 115, y: 16.5, z: 4, w: 4, d: 4, color: 0xc0392b },
        { x: 125, y: 18, z: -2, w: 4, d: 4, color: 0xc0392b },
        { x: 135, y: 20, z: 0, w: 10, d: 10, color: 0xf1c40f, isGoal: true } // FINAL GOAL
    ];

    path.forEach(p => {
        const mesh = createBox(p.x, p.y, p.z, p.w || 2, 0.5, p.d || 2, p.color || 0xbdc3c7);
        if (p.checkpoint) {
            mesh.isCheckpoint = true;
            mesh.cpIdx = checkpoints.length;
            checkpoints.push({ x: p.x, y: p.y + 1, z: p.z });
        }
        if (p.isGoal) mesh.isGoal = true;
    });
}

function createBox(x, y, z, w, h, d, color) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshPhongMaterial({ color: color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);
    platforms.push(mesh);
    return mesh;
}

function setupInput() {
    window.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (e.code === 'KeyR') respawn();
    });
    window.addEventListener('keyup', (e) => keys[e.code] = false);
}

function updateMovement() {
    if (gameState !== 'PLAYING') return;

    const speed = keys['ShiftLeft'] ? CONFIG.runSpeed : CONFIG.walkSpeed;
    const oldPos = camera.position.clone();

    // Gravity & Vertical Movement
    velocity.y -= CONFIG.gravity;

    // Jump
    if (keys['Space'] && !isJumping) {
        velocity.y = CONFIG.jumpForce;
        isJumping = true;
    }

    camera.position.y += velocity.y;

    // Horizontal Movement
    direction.z = Number(keys['KeyW']) - Number(keys['KeyS']);
    direction.x = Number(keys['KeyD']) - Number(keys['KeyA']);
    direction.normalize();

    if (keys['KeyW'] || keys['KeyS']) controls.moveForward(direction.z * speed);
    if (keys['KeyA'] || keys['KeyD']) controls.moveRight(direction.x * speed);

    // X/Z Wall/Platform Collision
    checkWallCollision(oldPos);

    // Ceiling / Floor Collision
    checkFloorCollision();

    // Respawn if fell
    if (camera.position.y < CONFIG.respawnY) {
        respawn();
    }
}

function checkWallCollision(oldPos) {
    platforms.forEach(p => {
        const box = new THREE.Box3().setFromObject(p);
        const playerBoxXZ = new THREE.Box3().setFromCenterAndSize(
            camera.position.clone(),
            new THREE.Vector3(0.6, 1.0, 0.6) // Smaller height for XZ check
        );

        if (box.intersectsBox(playerBoxXZ)) {
            // If the collision wasn't from above/below, block horizontal movement
            if (Math.abs(oldPos.y - camera.position.y) < 0.1) {
                camera.position.x = oldPos.x;
                camera.position.z = oldPos.z;
            }
        }
    });
}

function checkFloorCollision() {
    let onFloor = false;
    const playerX = camera.position.x;
    const playerZ = camera.position.z;
    const playerY = camera.position.y;
    const eyeHeight = 1.45;

    platforms.forEach(p => {
        const box = new THREE.Box3().setFromObject(p);

        // Horizontal check (with 0.3 unit margin for easier landing)
        const margin = 0.3;
        if (playerX >= box.min.x - margin && playerX <= box.max.x + margin &&
            playerZ >= box.min.z - margin && playerZ <= box.max.z + margin) {

            const floorTop = box.max.y;
            // Floor landing check: if player feet are within 0.6 units of floor top
            if (velocity.y <= 0 && playerY - eyeHeight <= floorTop && playerY - eyeHeight >= floorTop - 0.6) {
                camera.position.y = floorTop + eyeHeight;
                velocity.y = 0;
                isJumping = false;
                onFloor = true;
                if (p.isCheckpoint) currentCheckpointIdx = p.cpIdx;
                if (p.isGoal) triggerWin();
            }
        }
    });

    if (!onFloor) isJumping = true;
}

function respawn() {
    const cp = checkpoints[currentCheckpointIdx];
    camera.position.set(cp.x, cp.y + 0.7, cp.z);
    velocity.y = 0;
    deaths++;
    deathText.textContent = deaths;
}

function triggerWin() {
    gameState = 'WIN';
    controls.unlock();
    winScreen.classList.remove('hidden');

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const s = (elapsed % 60).toString().padStart(2, '0');
    finalTime.textContent = `${m}:${s}`;
    finalDeaths.textContent = deaths;
}

function animate() {
    requestAnimationFrame(animate);
    updateMovement();

    if (gameState === 'PLAYING') {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const s = (elapsed % 60).toString().padStart(2, '0');
        timerText.textContent = `${m}:${s}`;
    }

    renderer.render(scene, camera);
}

window.onload = init;
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
