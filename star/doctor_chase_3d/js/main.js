// star/doctor_chase_3d/js/main.js

const CONFIG = {
    walkSpeed: 0.12,
    runSpeed: 0.25,
    staminaRegen: 0.5,
    staminaDrain: 1.0,
    mazeSize: 20, // Grid size
    wallHeight: 3.5,
    totalPills: 10,
    doctorSpeed: 0.09
};

// State
let scene, camera, renderer, controls;
let gameState = 'START';
let maze = [];
let pills = [];
let doctors = [];
let collectedPills = 0;
let stamina = 100;
let startTime;

// Input
const keys = {};

// UI
const startScreen = document.getElementById('start-screen');
const winScreen = document.getElementById('win-screen');
const loseScreen = document.getElementById('lose-screen');
const hud = document.getElementById('hud');
const pillCountText = document.getElementById('pill-count');
const staminaFill = document.getElementById('stamina-fill');
const timerText = document.getElementById('game-timer');
const alertMsg = document.getElementById('alert-msg');

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    scene.fog = new THREE.Fog(0x050505, 5, 30);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(2, 1.7, 2);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambient);

    // Flashlight (attached to camera)
    const flashlight = new THREE.SpotLight(0xffffff, 1);
    flashlight.position.set(0, 0, 0);
    flashlight.angle = Math.PI / 6;
    flashlight.penumbra = 0.5;
    flashlight.decay = 2;
    flashlight.distance = 40;
    camera.add(flashlight);
    camera.add(flashlight.target);
    flashlight.target.position.set(0, 0, -1);
    scene.add(camera);

    // Generate Maze & Level
    generateHospitalMaze();
    spawnPills();
    spawnDoctors();

    // Controls
    controls = new THREE.PointerLockControls(camera, document.body);

    document.getElementById('start-btn').onclick = () => {
        controls.lock();
    };

    controls.addEventListener('lock', () => {
        startScreen.classList.add('hidden');
        hud.classList.remove('hidden');
        if (gameState === 'START') {
            gameState = 'PLAYING';
            startTime = Date.now();
        }
    });

    window.addEventListener('keydown', (e) => keys[e.code] = true);
    window.addEventListener('keyup', (e) => keys[e.code] = false);

    animate();
}

function generateHospitalMaze() {
    const size = CONFIG.mazeSize;
    // Simple Randomized Maze (DFS)
    for (let x = 0; x < size; x++) {
        maze[x] = [];
        for (let z = 0; z < size; z++) {
            maze[x][z] = 1; // Wall
        }
    }

    function carve(x, z) {
        maze[x][z] = 0; // Floor
        const dirs = [[0, 2], [0, -2], [2, 0], [-2, 0]].sort(() => Math.random() - 0.5);
        for (const [dx, dz] of dirs) {
            const nx = x + dx, nz = z + dz;
            if (nx > 0 && nx < size - 1 && nz > 0 && nz < size - 1 && maze[nx][nz] === 1) {
                maze[x + dx / 2][z + dz / 2] = 0;
                carve(nx, nz);
            }
        }
    }
    carve(1, 1);

    // Visuals
    const wallGeo = new THREE.BoxGeometry(2, CONFIG.wallHeight, 2);
    const wallMat = new THREE.MeshPhongMaterial({ color: 0x95afc0 });
    const floorGeo = new THREE.PlaneGeometry(size * 2, size * 2);
    const floorMat = new THREE.MeshPhongMaterial({ color: 0x2d3436 });

    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(size - 1, 0, size - 1);
    scene.add(floor);

    for (let x = 0; x < size; x++) {
        for (let z = 0; z < size; z++) {
            if (maze[x][z] === 1) {
                const wall = new THREE.Mesh(wallGeo, wallMat);
                wall.position.set(x * 2, CONFIG.wallHeight / 2, z * 2);
                scene.add(wall);
            }
        }
    }
}

function spawnPills() {
    const pillGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.6, 8);
    const pillMat = new THREE.MeshPhongMaterial({ color: 0xff4757, emissive: 0x330000 });

    let spawned = 0;
    while (spawned < CONFIG.totalPills) {
        let rx = Math.floor(Math.random() * CONFIG.mazeSize);
        let rz = Math.floor(Math.random() * CONFIG.mazeSize);
        if (maze[rx][rz] === 0) {
            const p = new THREE.Mesh(pillGeo, pillMat);
            p.position.set(rx * 2, 0.5, rz * 2);
            scene.add(p);
            pills.push(p);
            spawned++;
        }
    }
    pillCountText.textContent = `0 / ${CONFIG.totalPills}`;
}

function spawnDoctors() {
    for (let i = 0; i < 2; i++) {
        const group = new THREE.Group();
        // Body (White Coat)
        const bGeo = new THREE.BoxGeometry(0.8, 1.8, 0.5);
        const bMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
        const body = new THREE.Mesh(bGeo, bMat);
        body.position.y = 0.9;
        group.add(body);

        // Face (Angry)
        const fGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const fMat = new THREE.MeshPhongMaterial({ color: 0xffcccc });
        const head = new THREE.Mesh(fGeo, fMat);
        head.position.y = 2.0;
        group.add(head);

        // Stethoscope or whatever...

        group.position.set(15 * 2, 0, 15 * 2); // Far end
        scene.add(group);
        doctors.push({ mesh: group, state: 'HUNT' });
    }
}

function updateMovement() {
    if (gameState !== 'PLAYING' || !controls.isLocked) return;

    const isRunning = keys['ShiftLeft'] && stamina > 5;
    const speed = isRunning ? CONFIG.runSpeed : CONFIG.walkSpeed;

    if (isRunning) stamina -= CONFIG.staminaDrain;
    else stamina = Math.min(100, stamina + CONFIG.staminaRegen);
    staminaFill.style.width = stamina + '%';

    if (keys['KeyW']) controls.moveForward(speed);
    if (keys['KeyS']) controls.moveForward(-speed);
    if (keys['KeyA']) controls.moveRight(-speed * 0.8);
    if (keys['KeyD']) controls.moveRight(speed * 0.8);

    // Collision (Simple wall check)
    const px = Math.round(camera.position.x / 2);
    const pz = Math.round(camera.position.z / 2);
    if (px >= 0 && px < CONFIG.mazeSize && pz >= 0 && pz < CONFIG.mazeSize) {
        if (maze[px][pz] === 1) {
            // Push back logic could go here, but we just check position
        }
    }
}

function updateAI() {
    if (gameState !== 'PLAYING') return;

    doctors.forEach(doc => {
        const dist = doc.mesh.position.distanceTo(camera.position);

        // If close, catch player
        if (dist < 1.5) triggerLose();

        // Follow player (Simulate pathing or direct line if in line of sight)
        const dir = new THREE.Vector3().subVectors(camera.position, doc.mesh.position);
        dir.y = 0;
        dir.normalize();

        // Obstacle avoidance (very simple: if wall in front, slide sideways)
        doc.mesh.position.add(dir.multiplyScalar(CONFIG.doctorSpeed));
        doc.mesh.lookAt(camera.position.x, doc.mesh.position.y, camera.position.z);
    });

    // Pills pickup
    for (let i = pills.length - 1; i >= 0; i--) {
        const p = pills[i];
        p.rotation.y += 0.05;
        if (p.position.distanceTo(camera.position) < 1.2) {
            scene.remove(p);
            pills.splice(i, 1);
            collectedPills++;
            pillCountText.textContent = `${collectedPills} / ${CONFIG.totalPills}`;
            showToast("📸 약 상자를 획득했습니다!");

            if (collectedPills === CONFIG.totalPills) triggerWin();
        }
    }
}

function showToast(txt) {
    alertMsg.textContent = txt;
    alertMsg.style.opacity = 1;
    setTimeout(() => alertMsg.style.opacity = 0, 2000);
}

function triggerWin() {
    gameState = 'WIN';
    controls.unlock();
    winScreen.classList.remove('hidden');
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById('final-time').textContent = `기록: ${Math.floor(elapsed / 60)}분 ${elapsed % 60}초`;
}

function triggerLose() {
    gameState = 'LOSE';
    controls.unlock();
    loseScreen.classList.remove('hidden');
}

function animate() {
    requestAnimationFrame(animate);
    updateMovement();
    updateAI();

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
