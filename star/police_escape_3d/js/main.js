// star/police_escape_3d/js/main.js

const CONFIG = {
    walkSpeed: 10.0,
    runSpeed: 16.0,
    jumpForce: 14.0,
    gravity: 42.0,
    respawnY: -50,
    eyeHeight: 1.8, // Slightly higher for better perspective
    startPos: { x: 0, y: 0.5, z: 0 } // Top of 1.0 thick floor
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
let platformBoxes = []; // Pre-cached for performance

// UI
let timerText, deathText, startScreen, winScreen, finalTime, finalDeaths;

function init() {
    timerText = document.getElementById('timer');
    deathText = document.getElementById('death-count');
    startScreen = document.getElementById('start-screen');
    winScreen = document.getElementById('win-screen');
    finalTime = document.getElementById('final-time');
    finalDeaths = document.getElementById('final-deaths');

    clock = new THREE.Clock(false); // DO NOT start automatically

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky Blue
    scene.fog = new THREE.Fog(0x87ceeb, 50, 500); // Very far fog

    // Add Grid for orientation - move below floor bottom
    const grid = new THREE.GridHelper(200, 50, 0x444444, 0x888888);
    grid.position.y = -0.55;
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
    // Floor and Ceiling are 1m (1.0) thick
    createBox(0, 0, 0, 20, 1.0, 20, 0x4a4a4a); // Floor
    createBox(-10, 3, 0, 1.0, 6, 20, 0x333333); // Back wall
    createBox(0, 3, -10, 20, 6, 1.0, 0x333333); // Side wall
    createBox(0, 3, 10, 20, 6, 1.0, 0x333333);  // Side wall
    createBox(0, 6, 0, 20, 1.0, 20, 0x333333); // Ceiling

    // Prison Bars
    for (let i = -9; i <= 9; i += 2.5) {
        if (Math.abs(i) < 1.5) continue;
        createBox(10, 3, i, 0.3, 6, 0.3, 0x222222);
    }

    checkpoints.push({ x: 0, y: 0.5, z: 0 }); // CP 0: Jail Top

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
        // All platforms are 1m (1.0) thick
        const mesh = createBox(p.x, p.y, p.z, p.w || 2, 1.0, p.d || 2, p.color || 0xbdc3c7);
        if (p.checkpoint) {
            mesh.isCheckpoint = true;
            mesh.cpIdx = checkpoints.length;
            checkpoints.push({ x: p.x, y: p.y + 0.5, z: p.z }); // y + half thickness
        }
        if (p.isGoal) mesh.isGoal = true;
    });

    // Pre-cache bounding boxes after all boxes are created
    updatePlatformBoxes();
}

function updatePlatformBoxes() {
    platformBoxes = platforms.map(p => {
        p.updateMatrixWorld();
        return {
            mesh: p,
            box: new THREE.Box3().setFromObject(p)
        };
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

function updateMovement(delta) {
    if (gameState !== 'PLAYING') return;

    const speed = keys['ShiftLeft'] ? CONFIG.runSpeed : CONFIG.walkSpeed;
    const substeps = 4;
    const subDelta = delta / substeps;

    for (let i = 0; i < substeps; i++) {
        const oldPos = camera.position.clone();

        // Gravity - apply once per subDelta
        velocity.y -= CONFIG.gravity * subDelta;

        // Jump
        if (keys['Space'] && !isJumping) {
            velocity.y = CONFIG.jumpForce;
            isJumping = true;
        }

        camera.position.y += velocity.y * subDelta;

        // Movement Direction
        direction.z = Number(keys['KeyW']) - Number(keys['KeyS']);
        direction.x = Number(keys['KeyD']) - Number(keys['KeyA']);
        direction.normalize();

        const moveSpeed = speed * subDelta;
        if (keys['KeyW'] || keys['KeyS']) controls.moveForward(direction.z * moveSpeed);
        if (keys['KeyA'] || keys['KeyD']) controls.moveRight(direction.x * moveSpeed);

        // Ceiling Collision
        checkCeilingCollision(oldPos);

        // X/Z Wall Blocking
        checkWallCollision(oldPos);

        // Floor Landing
        checkFloorCollision();
    }

    // Respawn Fall - checking at the end of substeps is fine
    if (camera.position.y < -20) {
        respawn();
    }
}

function checkCeilingCollision(oldPos) {
    platformBoxes.forEach(pb => {
        if (velocity.y > 0 && pb.box.containsPoint(new THREE.Vector3(camera.position.x, camera.position.y + 0.2, camera.position.z))) {
            camera.position.y = oldPos.y;
            velocity.y = 0;
        }
    });
}

function checkWallCollision(oldPos) {
    platformBoxes.forEach(pb => {
        const playerBoxXZ = new THREE.Box3();
        // Slightly larger box for wall collision
        playerBoxXZ.setFromCenterAndSize(camera.position, new THREE.Vector3(0.8, 1.0, 0.8));

        if (pb.box.intersectsBox(playerBoxXZ)) {
            // Only block if we are actually within the height range of the wall
            // Using a more generous body range
            if (camera.position.y - 1.5 < pb.box.max.y && camera.position.y + 0.3 > pb.box.min.y) {
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

    platformBoxes.forEach(pb => {
        const box = pb.box;
        const p = pb.mesh;

        // Horizontal Check - slightly smaller padding to be more precise
        if (px >= box.min.x - 0.2 && px <= box.max.x + 0.2 &&
            pz >= box.min.z - 0.2 && pz <= box.max.z + 0.2) {

            const top = box.max.y;
            // Vertical Snap Check: more robust range for high velocity
            if (velocity.y <= 0 && footY <= top + 0.15 && footY >= top - 1.0) {
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

    let delta = clock.getDelta();
    if (delta > 0.05) delta = 0.05; // Tight cap for stability

    updateMovement(delta);

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
