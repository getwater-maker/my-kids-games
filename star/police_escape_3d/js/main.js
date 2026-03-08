// star/police_escape_3d/js/main.js

const CONFIG = {
    walkSpeed: 12.0, // Speed per second
    runSpeed: 20.0,
    jumpForce: 15.0,
    gravity: 45.0,
    respawnY: -50,
    eyeHeight: 1.6,
    startPos: { x: 0, y: 0.25, z: 0 }
};

let scene, camera, renderer, controls, clock;
let gameState = 'START';
let startTime, deaths = 0;
let platforms = [];
let checkpoints = [{ x: 0, y: 1, z: 0 }]; // Will be overwritten by stage 1
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

    clock = new THREE.Clock();

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky Blue
    scene.fog = new THREE.Fog(0x87ceeb, 50, 500); // Very far fog

    // Add Grid for orientation
    const grid = new THREE.GridHelper(200, 50, 0x444444, 0x888888);
    grid.position.y = -0.1;
    scene.add(grid);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(CONFIG.startPos.x, CONFIG.startPos.y + CONFIG.eyeHeight, CONFIG.startPos.z);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Strong Global Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(100, 200, 100);
    sun.castShadow = true;
    scene.add(sun);

    // Controls
    controls = new THREE.PointerLockControls(camera, document.body);

    document.getElementById('start-btn').onclick = () => {
        controls.lock();
    };

    controls.addEventListener('lock', () => {
        if (gameState === 'START') {
            gameState = 'PLAYING';
            startTime = Date.now();
            clock.start();
            startScreen.classList.add('hidden');
            document.getElementById('hud').classList.remove('hidden');
        }
    });

    createMap();
    setupInput();
    animate();
}

function createMap() {
    checkpoints = []; // Clear and rebuild

    // Stage 1 Start: The Jail
    createBox(0, 0, 0, 20, 0.5, 20, 0x4a4a4a); // Larger floor
    createBox(-10, 3, 0, 0.5, 6, 20, 0x333333); // Back wall
    createBox(0, 3, -10, 20, 6, 0.5, 0x333333); // Side wall
    createBox(0, 3, 10, 20, 6, 0.5, 0x333333);  // Side wall
    createBox(0, 6, 0, 20, 0.5, 20, 0x333333); // Ceiling

    // Prison Bars with an Exit
    for (let i = -9; i <= 9; i += 2.5) {
        if (Math.abs(i) < 1.5) continue; // Exit gap
        createBox(10, 3, i, 0.3, 6, 0.3, 0x222222);
    }

    checkpoints.push({ x: 0, y: 0.25, z: 0 }); // CP 0: Jail

    const path = [
        // --- STAGE 1: CONCRETE ---
        { x: 15, y: 1.5, z: 0, w: 4, d: 4, color: 0xbdc3c7 },
        { x: 22, y: 3, z: 3, w: 3, d: 3 },
        { x: 30, y: 4.5, z: 0, w: 5, d: 5, checkpoint: true, color: 0x2980b9 }, // CP 1

        // --- STAGE 2: POLICE CARS ---
        { x: 38, y: 5, z: -4, w: 3, d: 5, color: 0x2c3e50 },
        { x: 46, y: 6.5, z: 1, w: 3, d: 5, color: 0x2c3e50 },
        { x: 55, y: 8, z: 0, w: 6, d: 6, checkpoint: true, color: 0x2980b9 }, // CP 2

        // --- STAGE 3: PIPES ---
        { x: 65, y: 9.5, z: 4, w: 2, d: 8, color: 0xe67e22 },
        { x: 75, y: 11, z: -2, w: 2, d: 8, color: 0xe67e22 },
        { x: 85, y: 12.5, z: 0, w: 6, d: 6, checkpoint: true, color: 0x2980b9 }, // CP 3

        // --- STAGE 4: WIRES ---
        { x: 95, y: 14, z: 4, w: 8, d: 1.5, color: 0x1e272e },
        { x: 105, y: 15.5, z: -3, w: 8, d: 1.5, color: 0x1e272e },
        { x: 115, y: 17, z: 0, w: 8, d: 8, checkpoint: true, color: 0x2980b9 }, // CP 4

        // --- STAGE 5: EXTRACTION ---
        { x: 128, y: 19, z: 5, w: 5, d: 5, color: 0xc0392b },
        { x: 140, y: 21, z: 0, w: 10, d: 10, color: 0xf1c40f, isGoal: true } // WIN
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

    const delta = clock.getDelta();
    const speed = keys['ShiftLeft'] ? CONFIG.runSpeed : CONFIG.walkSpeed;
    const oldPos = camera.position.clone();

    // Gravity
    velocity.y -= CONFIG.gravity * delta;

    // Jump
    if (keys['Space'] && !isJumping) {
        velocity.y = CONFIG.jumpForce;
        isJumping = true;
    }

    camera.position.y += velocity.y * delta;

    // Movement Direction
    direction.z = Number(keys['KeyW']) - Number(keys['KeyS']);
    direction.x = Number(keys['KeyD']) - Number(keys['KeyA']);
    direction.normalize();

    if (keys['KeyW'] || keys['KeyS']) controls.moveForward(direction.z * speed * delta);
    if (keys['KeyA'] || keys['KeyD']) controls.moveRight(direction.x * speed * delta);

    // X/Z Wall Blocking
    checkWallCollision(oldPos);

    // Floor Landing
    checkFloorCollision();

    // Respawn Fall
    if (camera.position.y < CONFIG.respawnY) {
        respawn();
    }
}

function checkWallCollision(oldPos) {
    platforms.forEach(p => {
        const platformBox = new THREE.Box3().setFromObject(p);
        const playerBoxXZ = new THREE.Box3();
        playerBoxXZ.setFromCenterAndSize(camera.position, new THREE.Vector3(0.7, 0.5, 0.7));

        if (platformBox.intersectsBox(playerBoxXZ)) {
            // Only block if we are actually within the height range of the wall
            if (camera.position.y - 1.2 < platformBox.max.y && camera.position.y + 0.2 > platformBox.min.y) {
                camera.position.x = oldPos.x;
                camera.position.z = oldPos.z;
            }
        }
    });
}

function checkFloorCollision() {
    let onFloor = false;
    const py = camera.position.y;
    const px = camera.position.x;
    const pz = camera.position.z;
    const footY = py - CONFIG.eyeHeight;

    platforms.forEach(p => {
        const box = new THREE.Box3().setFromObject(p);

        // Horizontal Check
        if (px >= box.min.x - 0.4 && px <= box.max.x + 0.4 &&
            pz >= box.min.z - 0.4 && pz <= box.max.z + 0.4) {

            const top = box.max.y;
            // Vertical Snap Check: if feet are falling and close to the top
            if (velocity.y <= 0 && footY <= top + 0.1 && footY >= top - 0.8) {
                camera.position.y = top + CONFIG.eyeHeight;
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
    camera.position.set(cp.x, cp.y + CONFIG.eyeHeight, cp.z);
    velocity.y = 0;
    isJumping = false;
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
