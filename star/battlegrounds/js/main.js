import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// --- Config & Constants ---
const PLAYER_SPEED = 0.2;
const GRAVITY = 0.008;
const INITIAL_ZONE_SIZE = 400;
const ZONE_SHRINK_RATE = 0.15;
const MAX_HP = 100;
const MAX_AMMO = 30;

// --- State Variables ---
let scene, camera, renderer, controls;
let hp = MAX_HP;
let ammo = MAX_AMMO;
let kills = 0;
let timeRemaining = 120; // 2 minutes
let gameState = 'START'; // START, PLAYING, END

let zoneRadius = INITIAL_ZONE_SIZE;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, isSprinting = false, canJump = false;
let velocity = new THREE.Vector3(), direction = new THREE.Vector3();
let clock = new THREE.Clock();

let enemies = [];
let obstacles = [];
let zoneMesh;

// --- Initialization ---
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Day sky
    scene.fog = new THREE.Fog(0x87ceeb, 0, 800);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.y = 10;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    controls = new PointerLockControls(camera, document.body);

    setupLighting();
    setupEnvironment();
    setupZone();
    setupEnemies();
    setupEventListeners();

    animate();
}

function setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    sunLight.position.set(200, 500, 200);
    sunLight.castShadow = true;
    sunLight.shadow.camera.left = -500;
    sunLight.shadow.camera.right = 500;
    sunLight.shadow.camera.top = 500;
    sunLight.shadow.camera.bottom = -500;
    sunLight.shadow.mapSize.width = 4096;
    sunLight.shadow.mapSize.height = 4096;
    scene.add(sunLight);
}

function setupEnvironment() {
    // Ground
    const groundGeo = new THREE.PlaneGeometry(2000, 2000);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x3d5a1b }); // Grass
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Buidlings (Crates/Blocks)
    for (let i = 0; i < 50; i++) {
        const height = 5 + Math.random() * 15;
        const width = 5 + Math.random() * 5;
        const boxGeo = new THREE.BoxGeometry(width, height, width);
        const boxMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
        const box = new THREE.Mesh(boxGeo, boxMat);
        box.position.set((Math.random() - 0.5) * 400, height / 2, (Math.random() - 0.5) * 400);
        box.castShadow = true;
        box.receiveShadow = true;
        scene.add(box);
        obstacles.push(box);
    }
}

function setupZone() {
    const zoneGeo = new THREE.CylinderGeometry(INITIAL_ZONE_SIZE, INITIAL_ZONE_SIZE, 100, 64);
    const zoneMat = new THREE.MeshBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.1, side: THREE.BackSide });
    zoneMesh = new THREE.Mesh(zoneGeo, zoneMat);
    zoneMesh.position.y = 50;
    scene.add(zoneMesh);
}

function setupEnemies() {
    for (let i = 0; i < 20; i++) {
        spawnEnemy();
    }
}

function spawnEnemy() {
    const group = new THREE.Group();
    const bodyGeo = new THREE.CapsuleGeometry(1, 4, 4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 3;
    body.castShadow = true;
    group.add(body);

    group.position.set(
        (Math.random() - 0.5) * 600,
        0,
        (Math.random() - 0.5) * 600
    );

    scene.add(group);
    enemies.push({ mesh: group, hp: 100, lastDmgTime: 0 });
}

function setupEventListeners() {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('resize', onWindowResize);

    document.getElementById('start-btn').onclick = () => {
        controls.lock();
        document.getElementById('overlay').classList.add('hidden');
        gameState = 'PLAYING';
        startTimer();
    };

    document.getElementById('restart-btn').onclick = () => location.reload();
}

function onKeyDown(e) {
    if (gameState !== 'PLAYING') return;
    switch (e.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyD': moveRight = true; break;
        case 'Space': if (canJump) velocity.y += 0.15; break;
        case 'ShiftLeft': isSprinting = true; break;
        case 'KeyR': reload(); break;
    }
}

function onKeyUp(e) {
    switch (e.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyD': moveRight = false; break;
        case 'ShiftLeft': isSprinting = false; break;
    }
}

function onMouseDown(e) {
    if (controls.isLocked && ammo > 0 && gameState === 'PLAYING') {
        shoot();
    }
}

function shoot() {
    ammo--;
    updateHUD();

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    const intersects = raycaster.intersectObjects(enemies.map(e => e.mesh), true);

    if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        const enemy = enemies.find(e => e.mesh === hitMesh.parent);
        if (enemy) {
            enemy.hp -= 25;
            if (enemy.hp <= 0) {
                scene.remove(enemy.mesh);
                enemies = enemies.filter(e => e !== enemy);
                kills++;
                updateHUD();
                checkWin();
            }
        }
    }
}

function reload() {
    ammo = MAX_AMMO;
    updateHUD();
}

function startTimer() {
    setInterval(() => {
        if (gameState !== 'PLAYING') return;
        timeRemaining--;
        if (timeRemaining <= 0) timeRemaining = 0;
        updateHUD();

        // Shrink zone
        if (zoneRadius > 20) {
            zoneRadius -= ZONE_SHRINK_RATE;
            zoneMesh.scale.set(zoneRadius / INITIAL_ZONE_SIZE, 1, zoneRadius / INITIAL_ZONE_SIZE);
        }
    }, 1000);
}

function checkZoneDamage() {
    const distToCenter = Math.hypot(camera.position.x, camera.position.z);
    if (distToCenter > zoneRadius) {
        hp -= 1;
        updateHUD();
        if (hp <= 0) gameOver("ELIMINATED BY BLUE ZONE");
    }
}

function updateHUD() {
    document.getElementById('current-hp').textContent = Math.floor(hp);
    document.getElementById('hp-bar-fill').style.width = (hp / MAX_HP * 100) + '%';
    document.getElementById('current-ammo').textContent = ammo;
    document.getElementById('kill-val').textContent = kills;

    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    document.getElementById('timer-val').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function checkWin() {
    if (enemies.length === 0) {
        gameOver("WINNER WINNER CHICKEN DINNER!");
    }
}

function gameOver(text) {
    gameState = 'END';
    controls.unlock();
    document.getElementById('game-over').classList.remove('hidden');
    document.getElementById('end-title').textContent = text;
    document.getElementById('final-kills').textContent = kills;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    if (controls.isLocked && gameState === 'PLAYING') {
        const delta = clock.getDelta();

        // Movement Physics
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= GRAVITY;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        const speed = isSprinting ? PLAYER_SPEED * 1.8 : PLAYER_SPEED;

        if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * delta * speed;
        if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta * speed;

        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);

        camera.position.y += velocity.y;
        if (camera.position.y < 10) {
            camera.position.y = 10;
            velocity.y = 0;
            canJump = true;
        }

        checkZoneDamage();

        // Basic AI: Rotate enemies
        enemies.forEach(e => {
            e.mesh.rotation.y += 0.02;
        });
    }

    renderer.render(scene, camera);
}

init();
