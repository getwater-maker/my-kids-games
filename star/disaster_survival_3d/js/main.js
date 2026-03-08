// star/disaster_survival_3d/js/main.js

// --- CONFIG ---
const CONFIG = {
    walkSpeed: 0.15,
    runSpeed: 0.3,
    jumpForce: 0.3,
    gravity: 0.015,
    maxHP: 100,
    disasters: [
        { name: "산성비 (Acid Rain)", type: "RAIN", duration: 15000, damage: 0.8 },
        { name: "강력한 태풍 (Typhoon)", type: "WIND", duration: 12000, damage: 0.5 },
        { name: "재앙적 지진 (Earthquake)", type: "SHAKE", duration: 10000, damage: 0.3 }
    ]
};

// --- STATE ---
let scene, camera, renderer, controls;
let gameState = 'START';
let hp = CONFIG.maxHP;
let startTime;
let currentDisaster = null;
let nextDisasterTime = 5000;
let buildings = [];
let roofs = []; // Objects that act as shelter
let obstacles = [];

// Movement
let velocity = new THREE.Vector3();
let isJumping = false;
const keys = {};

// UI
let startScreen, loseScreen, hud, hpFill, disasterName, disasterProgress, survivalTimeText, locationStatus, causeOfDeathText;

function init() {
    startScreen = document.getElementById('start-screen');
    loseScreen = document.getElementById('lose-screen');
    hud = document.getElementById('hud');
    hpFill = document.getElementById('hp-fill');
    disasterName = document.getElementById('disaster-name');
    disasterProgress = document.getElementById('disaster-progress');
    survivalTimeText = document.getElementById('survival-time');
    locationStatus = document.getElementById('location-status');
    causeOfDeathText = document.getElementById('cause-of-death');

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Light blue for start
    scene.fog = new THREE.Fog(0x87ceeb, 20, 100);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.8, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(50, 100, 50);
    sun.castShadow = true;
    scene.add(sun);

    // Controls
    controls = new THREE.PointerLockControls(camera, document.body);
    document.getElementById('start-btn').onclick = () => {
        controls.lock();
    };

    controls.addEventListener('lock', () => {
        if (gameState === 'START') startGame();
        else if (gameState === 'LOSE') location.reload();
    });

    createEnvironment();
    setupInput();
    animate();
}

function createEnvironment() {
    // Floor
    const floorGeo = new THREE.PlaneGeometry(200, 200);
    const floorMat = new THREE.MeshPhongMaterial({ color: 0x57606f });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid helper
    const grid = new THREE.GridHelper(200, 40, 0x000000, 0x000000);
    grid.position.y = 0.01;
    scene.add(grid);

    // Create Buildings
    for (let i = 0; i < 15; i++) {
        const x = (Math.random() - 0.5) * 100;
        const z = (Math.random() - 0.5) * 100;
        if (Math.abs(x) < 5 && Math.abs(z) < 5) continue; // Don't spawn on player

        const w = 6 + Math.random() * 6;
        const h = 8 + Math.random() * 15;
        const d = 6 + Math.random() * 6;

        createBuilding(x, z, w, h, d);
    }
}

function createBuilding(x, z, w, h, d) {
    const group = new THREE.Group();

    // Walls
    const wallMat = new THREE.MeshPhongMaterial({ color: 0x95afc0 });
    const wallGeo = new THREE.BoxGeometry(w, h, d);
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.y = h / 2;
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);

    // Roof (Slightly larger to act as shelter)
    const roofGeo = new THREE.BoxGeometry(w + 1, 0.4, d + 1);
    const roofMat = new THREE.MeshPhongMaterial({ color: 0x2f3542 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = h;
    group.add(roof);
    roofs.push(roof); // Track roofs

    // Entrance / Shelter Area (Hollow out a part or just make it accessible)
    // For simplicity, we'll treat being close to the center of a building as "inside" if we can't do complex raycasting

    group.position.set(x, 0, z);
    scene.add(group);
    buildings.push(group);
}

function setupInput() {
    window.addEventListener('keydown', (e) => keys[e.code] = true);
    window.addEventListener('keyup', (e) => keys[e.code] = false);
}

function startGame() {
    gameState = 'PLAYING';
    startScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    startTime = Date.now();
    hp = CONFIG.maxHP;
}

function updateMovement() {
    if (gameState !== 'PLAYING') return;

    const delta = 0.1;
    const speed = keys['ShiftLeft'] ? CONFIG.runSpeed : CONFIG.walkSpeed;

    // Gravity
    velocity.y -= CONFIG.gravity;
    camera.position.y += velocity.y;

    if (camera.position.y < 1.8) {
        camera.position.y = 1.8;
        velocity.y = 0;
        isJumping = false;
    }

    if (keys['Space'] && !isJumping) {
        velocity.y = CONFIG.jumpForce;
        isJumping = true;
    }

    // Directional
    if (keys['KeyW']) controls.moveForward(speed);
    if (keys['KeyS']) controls.moveForward(-speed);
    if (keys['KeyA']) controls.moveRight(-speed * 0.8);
    if (keys['KeyD']) controls.moveRight(speed * 0.8);

    // Boundaries
    camera.position.x = Math.max(-95, Math.min(95, camera.position.x));
    camera.position.z = Math.max(-95, Math.min(95, camera.position.z));
}

function updateDisasters() {
    if (gameState !== 'PLAYING') return;

    const now = Date.now();
    const elapsedSinceStart = now - startTime;

    if (!currentDisaster) {
        const timeToNext = nextDisasterTime - (now - (currentDisasterEndTime || startTime));
        disasterName.textContent = "기상 관측 중...";
        disasterProgress.style.width = ((nextDisasterTime - timeToNext) / nextDisasterTime * 100) + '%';
        disasterProgress.style.background = "var(--safe)";

        if (timeToNext <= 0) {
            startDisaster();
        }
    } else {
        const timeLeft = currentDisasterEndTime - now;
        disasterProgress.style.width = (timeLeft / currentDisaster.duration * 100) + '%';
        disasterProgress.style.background = "var(--danger)";

        processDisasterEffects();

        if (timeLeft <= 0) {
            endDisaster();
        }
    }
}

let currentDisasterEndTime = 0;

function startDisaster() {
    const idx = Math.floor(Math.random() * CONFIG.disasters.length);
    currentDisaster = CONFIG.disasters[idx];
    currentDisasterEndTime = Date.now() + currentDisaster.duration;
    disasterName.textContent = currentDisaster.name;

    // Visual changes
    if (currentDisaster.type === 'RAIN') {
        scene.background = new THREE.Color(0x2f3542);
        scene.fog.color = new THREE.Color(0x2f3542);
    } else if (currentDisaster.type === 'WIND') {
        scene.background = new THREE.Color(0x747d8c);
        scene.fog.color = new THREE.Color(0x747d8c);
    } else {
        scene.background = new THREE.Color(0x57606f);
    }
}

function processDisasterEffects() {
    const isUnderShelter = checkShelter();

    if (isUnderShelter) {
        locationStatus.textContent = "실내 (안전)";
        locationStatus.className = "status-tip safe";
    } else {
        locationStatus.textContent = "실외 (위험!)";
        locationStatus.className = "status-tip";

        // Take damage
        hp -= currentDisaster.damage;

        if (currentDisaster.type === 'WIND') {
            // Push player randomly
            controls.moveRight((Math.random() - 0.5) * 0.2);
            controls.moveForward((Math.random() - 0.5) * 0.2);
        } else if (currentDisaster.type === 'SHAKE') {
            camera.position.y += (Math.random() - 0.5) * 0.1;
        }
    }

    hpFill.style.width = hp + '%';
    if (hp <= 0) triggerLose();
}

function checkShelter() {
    // Simple logic: Is the player's 2D position within a building's footprint?
    // Since buildings are boxes, we check if player is "inside" the wall bounds
    for (const b of buildings) {
        const dx = Math.abs(camera.position.x - b.position.x);
        const dz = Math.abs(camera.position.z - b.position.z);

        // Building box size (w/2, d/2)
        const wall = b.children[0];
        const w = wall.geometry.parameters.width / 2;
        const d = wall.geometry.parameters.depth / 2;

        if (dx < w && dz < d) {
            return true;
        }
    }
    return false;
}

function endDisaster() {
    currentDisaster = null;
    currentDisasterEndTime = Date.now();
    nextDisasterTime = 3000 + Math.random() * 5000;

    // Restore sky
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog.color = new THREE.Color(0x87ceeb);
}

function triggerLose() {
    gameState = 'LOSE';
    controls.unlock();
    loseScreen.classList.remove('hidden');
    causeOfDeathText.textContent = currentDisaster ? `${currentDisaster.name}을(를) 피하지 못했습니다.` : "기력이 다했습니다.";

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const s = (elapsed % 60).toString().padStart(2, '0');
    document.getElementById('final-time').textContent = `${m}:${s}`;
}

function animate() {
    requestAnimationFrame(animate);

    if (gameState === 'PLAYING') {
        updateMovement();
        updateDisasters();

        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const s = (elapsed % 60).toString().padStart(2, '0');
        survivalTimeText.textContent = `${m}:${s}`;
    }

    renderer.render(scene, camera);
}

window.onload = init;
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
