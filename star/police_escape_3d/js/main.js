// star/police_escape_3d/js/main.js

const CONFIG = {
    walkSpeed: 0.01,
    runSpeed: 0.01,
    jumpForce: 0.2, // Adjusted for slower speed
    gravity: 0.01,
    respawnY: -20,
    startPos: { x: 0, y: 0.5, z: 0 } // Lowered start pos
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
    scene.background = new THREE.Color(0x34495e); // Dark Blueish Grey
    scene.fog = new THREE.Fog(0x34495e, 10, 50);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(CONFIG.startPos.x, CONFIG.startPos.y + 1.7, CONFIG.startPos.z);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6); // Increased brightness
    scene.add(ambient);

    const hemiLight = new THREE.HemisphereLight(0x404040, 0x000000, 0.7);
    scene.add(hemiLight);

    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(20, 50, 20);
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
    createBox(0, 0, 0, 10, 0.5, 10, 0x7f8c8d); // Floor
    createBox(-5, 3, 0, 0.5, 6, 10, 0x95a5a6); // Back wall
    createBox(0, 3, -5, 10, 6, 0.5, 0x95a5a6); // Side wall
    createBox(0, 3, 5, 10, 6, 0.5, 0x95a5a6);  // Side wall

    // Jail Bars (partial)
    for (let i = -4; i <= 4; i += 1.5) {
        createBox(5, 3, i, 0.2, 6, 0.2, 0x2c3e50);
    }

    // 2. Jump Section 1: Concrete Platforms
    const path = [
        { x: 10, y: 1, z: 0, w: 3, d: 3, color: 0xbdc3c7 },
        { x: 15, y: 2.5, z: 2, w: 2, d: 2 },
        { x: 20, y: 4, z: -1, w: 2, d: 2 },
        { x: 26, y: 5, z: 1, w: 4, d: 4, checkpoint: true, color: 0x2980b9 }, // Checkpoint 1

        // 3. Jump Section 2: Police Car Roofs (themed)
        { x: 32, y: 4, z: 3, w: 2, d: 3, color: 0x2c3e50 },
        { x: 38, y: 3.5, z: 1, w: 2, d: 3, color: 0x2c3e50 },
        { x: 44, y: 4.5, z: -2, w: 2, d: 3, color: 0x2c3e50 },
        { x: 50, y: 6, z: 0, w: 5, d: 5, checkpoint: true, color: 0x2980b9 }, // Checkpoint 2

        // 4. Jump Section 3: Floating Pipes & High Stakes
        { x: 58, y: 7, z: 2, w: 1, d: 5, color: 0xe67e22 },
        { x: 65, y: 8.5, z: -1, w: 1, d: 5, color: 0xe67e22 },
        { x: 72, y: 10, z: 3, w: 5, d: 5, color: 0xf1c40f, isGoal: true } // GOAL
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

    // Gravity & Vertical Movement
    velocity.y -= CONFIG.gravity;

    // Jump
    if (keys['Space'] && !isJumping) {
        velocity.y = CONFIG.jumpForce;
        isJumping = true;
    }

    // Horizontal Movement
    direction.z = Number(keys['KeyW']) - Number(keys['KeyS']);
    direction.x = Number(keys['KeyD']) - Number(keys['KeyA']);
    direction.normalize();

    if (keys['KeyW'] || keys['KeyS']) controls.moveForward(direction.z * speed);
    if (keys['KeyA'] || keys['KeyD']) controls.moveRight(direction.x * speed);

    camera.position.y += velocity.y;

    // Ceiling / Floor Collision Logic (Simple)
    checkCollision();

    // Respawn if fell
    if (camera.position.y < CONFIG.respawnY) {
        respawn();
    }
}

function checkCollision() {
    let onFloor = false;

    platforms.forEach(p => {
        const box = new THREE.Box3().setFromObject(p);
        const playerBox = new THREE.Box3().setFromCenterAndSize(
            camera.position.clone().setY(camera.position.y - 0.8),
            new THREE.Vector3(0.6, 1.8, 0.6)
        );

        if (box.intersectsBox(playerBox)) {
            // Check if jumping on top
            if (velocity.y <= 0 && camera.position.y > p.position.y) {
                camera.position.y = p.position.y + 0.5 + 1.2; // Platform top + player half height
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
