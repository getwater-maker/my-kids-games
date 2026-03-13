import * as THREE from 'three';

// --- Global State ---
let scene, camera, renderer, clock;
let player, teacher;
let isGameOver = false;
let prankCount = 0;
let inventory = null; // Current item held
let detectionPercent = 0;
let gameState = 'START'; // START, PLAYING, END

let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let obstacles = [];
let interactiveItems = []; // Traps to pickup
let prankSpots = []; // Positions to set traps

// --- Setup ---
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2c3e50); // Dark indoor
    scene.fog = new THREE.Fog(0x2c3e50, 10, 50);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 15, 10);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    clock = new THREE.Clock();

    setupLighting();
    setupRoom();
    setupPlayer();
    setupTeacher();
    setupItemsAndSpots();
    setupEventListeners();

    animate();
}

function setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.8);
    pointLight.position.set(0, 10, 0);
    pointLight.castShadow = true;
    scene.add(pointLight);
}

function setupRoom() {
    // Floor
    const floorGeo = new THREE.PlaneGeometry(40, 40);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Walls
    const wallGeo = new THREE.BoxGeometry(40, 10, 1);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x7f8c8d });

    const wall1 = new THREE.Mesh(wallGeo, wallMat);
    wall1.position.set(0, 5, -20);
    scene.add(wall1);

    const wall2 = new THREE.Mesh(wallGeo, wallMat);
    wall2.rotation.y = Math.PI / 2;
    wall2.position.set(-20, 5, 0);
    scene.add(wall2);
}

function setupPlayer() {
    const group = new THREE.Group();
    const bodyGeo = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3498db });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1;
    body.castShadow = true;
    group.add(body);

    player = group;
    player.position.set(-15, 0, 15);
    scene.add(player);
}

function setupTeacher() {
    const group = new THREE.Group();
    const bodyGeo = new THREE.CapsuleGeometry(0.7, 1.5, 4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.25;
    body.castShadow = true;
    group.add(body);

    // Vision cone (visual)
    const coneGeo = new THREE.ConeGeometry(5, 10, 32);
    const coneMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.2 });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.rotation.x = Math.PI / 2;
    cone.position.z = -5;
    group.add(cone);

    teacher = group;
    teacher.position.set(0, 0, 0);
    teacher.userData = {
        targets: [[10, 0, 10], [-10, 0, -10], [10, 0, -10], [-10, 0, 10]],
        currentTarget: 0,
        speed: 0.05
    };
    scene.add(teacher);
}

function setupItemsAndSpots() {
    // Pickable trap: Glue
    const glueGeo = new THREE.BoxGeometry(0.5, 0.2, 0.5);
    const glueMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f });
    const glue = new THREE.Mesh(glueGeo, glueMat);
    glue.position.set(5, 0.1, 5);
    glue.userData = { id: 'GLUE', name: 'GLUE TRAP' };
    scene.add(glue);
    interactiveItems.push(glue);

    // Prank spot (Table)
    const tableGeo = new THREE.BoxGeometry(3, 1.5, 3);
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50 });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.set(0, 0.75, -5);
    table.userData = { prankId: 'GLUE', active: false };
    scene.add(table);
    prankSpots.push(table);
}

function setupEventListeners() {
    window.onkeydown = (e) => {
        if (e.code === 'KeyW') moveForward = true;
        if (e.code === 'KeyS') moveBackward = true;
        if (e.code === 'KeyA') moveLeft = true;
        if (e.code === 'KeyD') moveRight = true;

        if (e.code === 'KeyE') handleInteract();
    };
    window.onkeyup = (e) => {
        if (e.code === 'KeyW') moveForward = false;
        if (e.code === 'KeyS') moveBackward = false;
        if (e.code === 'KeyA') moveLeft = false;
        if (e.code === 'KeyD') moveRight = false;
    };

    document.getElementById('start-btn').onclick = () => {
        document.getElementById('overlay').classList.add('hidden');
        gameState = 'PLAYING';
    };

    document.getElementById('retry-btn').onclick = () => location.reload();
    document.getElementById('win-retry-btn').onclick = () => location.reload();
}

function handleInteract() {
    // Pick up
    interactiveItems.forEach((item, idx) => {
        if (player.position.distanceTo(item.position) < 2) {
            inventory = item.userData;
            document.getElementById('current-item').textContent = inventory.name;
            scene.remove(item);
            interactiveItems.splice(idx, 1);
        }
    });

    // Prank
    prankSpots.forEach(spot => {
        if (player.position.distanceTo(spot.position) < 3 && inventory && spot.userData.prankId === inventory.id) {
            prankCount++;
            document.getElementById('prank-val').textContent = prankCount;
            inventory = null;
            document.getElementById('current-item').textContent = 'NONE';
            spot.material.color.set(0x27ae60); // Visual feedback

            if (prankCount >= 3) {
                gameState = 'WIN';
                document.getElementById('win-overlay').classList.remove('hidden');
            }
        }
    });
}

function animate() {
    requestAnimationFrame(animate);

    if (gameState === 'PLAYING') {
        const delta = clock.getDelta();
        updateMovement(delta);
        updateAI(delta);
        checkDetection();
    }

    renderer.render(scene, camera);
}

function updateMovement(dt) {
    const speed = 0.1;
    if (moveForward) player.position.z -= speed;
    if (moveBackward) player.position.z += speed;
    if (moveLeft) player.position.x -= speed;
    if (moveRight) player.position.x += speed;

    camera.position.x = player.position.x;
    camera.position.z = player.position.z + 10;
}

function updateAI(dt) {
    const ai = teacher.userData;
    const target = new THREE.Vector3(...ai.targets[ai.currentTarget]);
    const dir = target.clone().sub(teacher.position).normalize();

    teacher.position.add(dir.multiplyScalar(ai.speed));
    teacher.lookAt(target);

    if (teacher.position.distanceTo(target) < 0.5) {
        ai.currentTarget = (ai.currentTarget + 1) % ai.targets.length;
    }
}

function checkDetection() {
    // Simple look-at detection
    const toPlayer = player.position.clone().sub(teacher.position).normalize();
    const teacherDir = new THREE.Vector3(0, 0, -1).applyQuaternion(teacher.quaternion);
    const angle = teacherDir.angleTo(toPlayer);
    const dist = teacher.position.distanceTo(player.position);

    if (angle < Math.PI / 4 && dist < 12) { // Within 45 degrees and 12 units
        detectionPercent += 1;
    } else {
        detectionPercent = Math.max(0, detectionPercent - 0.5);
    }

    document.getElementById('meter-fill').style.width = detectionPercent + '%';

    if (detectionPercent >= 100) {
        gameState = 'CAUGHT';
        document.getElementById('caught-overlay').classList.remove('hidden');
    }
}

init();
