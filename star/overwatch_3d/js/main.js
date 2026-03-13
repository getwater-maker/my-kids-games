import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// --- Configuration & Constants ---
const PLAYER_SPEED = 0.15;
const SPRINT_MULTIPLIER = 1.6;
const JUMP_FORCE = 0.15;
const GRAVITY = 0.008;

const MAX_HP = 200;
const MAX_AMMO = 25;

// --- State Variables ---
let scene, camera, renderer, controls;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, canJump = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();

let hp = MAX_HP;
let ammo = MAX_AMMO;
let ultPercentage = 0;
let isSprinting = false;
let isReloading = false;
let isGameOver = false;

let abilityCooldowns = {
    sprint: false,
    heal: 0,
    rocket: 0
};

let enemies = [];
let bullets = [];
let clock = new THREE.Clock();

// --- Initialization ---
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 0, 500);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = 10;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    controls = new PointerLockControls(camera, document.body);

    setupLighting();
    setupEnvironment();
    setupPlayerWeapon();
    setupEnemies();
    setupEventListeners();

    animate();
}

function setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLight.position.set(50, 100, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);
}

function setupEnvironment() {
    // Ground
    const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // City Map (Overwatch style)
    for (let i = 0; i < 40; i++) {
        const height = 10 + Math.random() * 50;
        const width = 10 + Math.random() * 20;
        const boxGeo = new THREE.BoxGeometry(width, height, width);
        const boxMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(Math.random(), 0.5, 0.2),
            emissive: new THREE.Color(0x000033)
        });
        const building = new THREE.Mesh(boxGeo, boxMat);

        building.position.x = (Math.random() - 0.5) * 300;
        building.position.z = (Math.random() - 0.5) * 300;
        building.position.y = height / 2;
        building.castShadow = true;
        building.receiveShadow = true;
        scene.add(building);
    }
}

let playerWeapon;
function setupPlayerWeapon() {
    const weaponGroup = new THREE.Group();

    // Simple rifle mesh
    const bodyGeo = new THREE.BoxGeometry(0.2, 0.3, 1);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    weaponGroup.add(body);

    const barrelGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.6);
    const barrel = new THREE.Mesh(barrelGeo, bodyMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -0.7;
    weaponGroup.add(barrel);

    playerWeapon = weaponGroup;
    camera.add(playerWeapon);
    scene.add(camera);

    playerWeapon.position.set(0.4, -0.4, -0.8);
}

function setupEnemies() {
    for (let i = 0; i < 5; i++) {
        spawnEnemy();
    }
}

function spawnEnemy() {
    const enemyGroup = new THREE.Group();

    // Robot/Target mesh
    const bodyGeo = new THREE.BoxGeometry(1.5, 3, 1);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xeb4d4b, emissive: 0x990000 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    enemyGroup.add(body);

    const headGeo = new THREE.BoxGeometry(1, 1, 1);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.y = 2;
    enemyGroup.add(head);

    enemyGroup.position.set(
        (Math.random() - 0.5) * 100,
        1.5,
        (Math.random() - 0.5) * 100
    );

    scene.add(enemyGroup);
    enemies.push({
        mesh: enemyGroup,
        hp: 150,
        lastShotTime: 0
    });
}

// --- Input Handling ---
function setupEventListeners() {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('resize', onWindowResize);
    document.getElementById('start-btn').addEventListener('click', () => {
        controls.lock();
        document.getElementById('overlay').classList.add('hidden');
    });
}

function onKeyDown(e) {
    switch (e.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyD': moveRight = true; break;
        case 'Space': if (canJump) velocity.y += JUMP_FORCE; canJump = false; break;
        case 'ShiftLeft': isSprinting = true; break;
        case 'KeyR': reload(); break;
        case 'KeyE': useHeal(); break;
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
    if (controls.isLocked && ammo > 0 && !isReloading) {
        if (e.button === 0) fireWeapon();
        else if (e.button === 2) fireRocket();
    }
}

function fireWeapon() {
    ammo--;
    updateHUD();
    ultPercentage = Math.min(100, ultPercentage + 1);

    // Recoil effect
    playerWeapon.position.z += 0.1;
    setTimeout(() => playerWeapon.position.z -= 0.1, 50);

    // Hitscan raycast
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);

    const intersects = raycaster.intersectObjects(enemies.map(e => e.mesh), true);
    if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        const enemy = enemies.find(e => e.mesh === hitMesh.parent);
        if (enemy) {
            enemy.hp -= 20;
            if (enemy.hp <= 0) killEnemy(enemy);
            showHitEffect(intersects[0].point);
        }
    }
}

function fireRocket() {
    if (abilityCooldowns.rocket > 0) return;

    abilityCooldowns.rocket = 8; // 8s cooldown
    startCooldown('ability-3', 8);

    // Projectile logic could be added here
    console.log("Rocket Fired!");
}

function useHeal() {
    if (abilityCooldowns.heal > 0) return;

    abilityCooldowns.heal = 15;
    startCooldown('ability-2', 15);

    const healInterval = setInterval(() => {
        hp = Math.min(MAX_HP, hp + 5);
        updateHUD();
    }, 500);
    setTimeout(() => clearInterval(healInterval), 5000);
}

function reload() {
    if (isReloading || ammo === MAX_AMMO) return;
    isReloading = true;
    setTimeout(() => {
        ammo = MAX_AMMO;
        isReloading = false;
        updateHUD();
    }, 1500);
}

// --- Game Logic ---
function animate() {
    requestAnimationFrame(animate);

    if (controls.isLocked) {
        const delta = clock.getDelta();

        // Movement
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= GRAVITY;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        const speed = isSprinting ? PLAYER_SPEED * SPRINT_MULTIPLIER : PLAYER_SPEED;

        if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * delta * speed;
        if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta * speed;

        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);

        camera.position.y += velocity.y;

        if (camera.position.y < 10) {
            velocity.y = 0;
            camera.position.y = 10;
            canJump = true;
        }

        updateEnemies(delta);
    }

    renderer.render(scene, camera);
}

function updateEnemies(dt) {
    enemies.forEach(enemy => {
        // Simple AI: face player
        enemy.mesh.lookAt(camera.position.x, 0, camera.position.z);

        // Attack player occasionally
        if (Date.now() - enemy.lastShotTime > 2000) {
            const dist = enemy.mesh.position.distanceTo(camera.position);
            if (dist < 50) {
                hp -= 5;
                updateHUD();
                enemy.lastShotTime = Date.now();
                if (hp <= 0) die();
            }
        }
    });
}

function killEnemy(enemy) {
    scene.remove(enemy.mesh);
    enemies = enemies.filter(e => e !== enemy);
    setTimeout(spawnEnemy, 5000); // Respawn

    // Kill feed logic
    const feed = document.getElementById('kill-feed');
    const msg = document.createElement('div');
    msg.textContent = "Soldier: 76 [Rifle] Training Bot";
    feed.appendChild(msg);
    setTimeout(() => msg.remove(), 3000);
}

// --- UI Updates ---
function updateHUD() {
    document.getElementById('current-hp').textContent = Math.floor(hp);
    document.getElementById('hp-bar-fill').style.width = (hp / MAX_HP * 100) + '%';
    document.getElementById('current-ammo').textContent = ammo;
    document.getElementById('ult-percent').textContent = ultPercentage + '%';

    // Ult circle
    const offset = 283 - (ultPercentage / 100 * 283);
    document.getElementById('ult-progress-circle').style.strokeDashoffset = offset;
}

function startCooldown(slotId, duration) {
    const overlay = document.querySelector(`#${slotId} .cooldown-overlay`);
    overlay.style.height = '100%';
    let start = Date.now();
    const interval = setInterval(() => {
        let elapsed = (Date.now() - start) / 1000;
        let percent = Math.max(0, 100 - (elapsed / duration * 100));
        overlay.style.height = percent + '%';
        if (elapsed >= duration) {
            clearInterval(interval);
            if (slotId === 'ability-2') abilityCooldowns.heal = 0;
            if (slotId === 'ability-3') abilityCooldowns.rocket = 0;
        }
    }, 100);
}

function showHitEffect(point) {
    const geometry = new THREE.SphereGeometry(0.1, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const spark = new THREE.Mesh(geometry, material);
    spark.position.copy(point);
    scene.add(spark);
    setTimeout(() => scene.remove(spark), 100);
}

function die() {
    if (isGameOver) return;
    isGameOver = true;
    document.getElementById('overlay').classList.remove('hidden');
    document.querySelector('.logo-text').innerHTML = "YOU <span>DIED</span>";
    document.getElementById('start-btn').textContent = "RESPAWN";
    document.getElementById('start-btn').onclick = () => location.reload();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

init();
