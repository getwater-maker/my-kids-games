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
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 32);
    gradient.addColorStop(0, '#1e3c72');
    gradient.addColorStop(1, '#2a5298');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1, 32);
    const skyTex = new THREE.CanvasTexture(canvas);
    scene.background = skyTex;
    scene.fog = new THREE.FogExp2(0x1e3c72, 0.005);

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
    // Pro Ground
    const groundGeometry = new THREE.PlaneGeometry(1000, 1000, 100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x111111,
        roughness: 0.8,
        metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid Helper for more 'Cyber' feel
    const grid = new THREE.GridHelper(1000, 100, 0x00aeff, 0x222222);
    grid.position.y = 0.01;
    scene.add(grid);

    // City Map (Realistic Buildings)
    for (let i = 0; i < 60; i++) {
        const height = 20 + Math.random() * 80;
        const width = 15 + Math.random() * 25;
        const boxGeo = new THREE.BoxGeometry(width, height, width);
        const boxMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(0.6, 0.2, 0.1 + Math.random() * 0.1),
            metalness: 0.5,
            roughness: 0.2
        });
        const building = new THREE.Mesh(boxGeo, boxMat);

        building.position.x = (Math.random() - 0.5) * 500;
        building.position.z = (Math.random() - 0.5) * 500;
        if (Math.abs(building.position.x) < 30 && Math.abs(building.position.z) < 30) {
            building.position.x += 100; // Keep spawn clear
        }
        building.position.y = height / 2;
        building.castShadow = true;
        building.receiveShadow = true;
        scene.add(building);
    }
}

let playerWeapon;
function setupPlayerWeapon() {
    const weaponGroup = new THREE.Group();

    // High Quality Rifle
    const bodyGeo = new THREE.BoxGeometry(0.15, 0.25, 0.8);
    const bodyMat = new THREE.MeshStandardMaterial({ 
        color: 0x222222, 
        roughness: 0.2, 
        metalness: 0.8 
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    weaponGroup.add(body);

    // Barrel
    const barrelGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.7);
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9 });
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -0.6;
    weaponGroup.add(barrel);

    // Scope
    const scopeGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.2);
    const scope = new THREE.Mesh(scopeGeo, bodyMat);
    scope.rotation.x = Math.PI / 2;
    scope.position.y = 0.15;
    scope.position.z = -0.1;
    weaponGroup.add(scope);

    // Magazine
    const magGeo = new THREE.BoxGeometry(0.1, 0.3, 0.2);
    const mag = new THREE.Mesh(magGeo, bodyMat);
    mag.position.y = -0.2;
    mag.position.z = -0.1;
    weaponGroup.add(mag);

    playerWeapon = weaponGroup;
    camera.add(playerWeapon);
    scene.add(camera);

    playerWeapon.position.set(0.35, -0.35, -0.7);
}

function setupEnemies() {
    for (let i = 0; i < 8; i++) {
        spawnEnemy();
    }
}

function createRealisticHuman(color) {
    const group = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdbac }); // Skin color
    const clothMat = new THREE.MeshStandardMaterial({ color: color });

    // Torso
    const torsoGeo = new THREE.CapsuleGeometry(0.4, 0.8, 4, 8);
    const torso = new THREE.Mesh(torsoGeo, clothMat);
    torso.position.y = 1.2;
    torso.castShadow = true;
    group.add(torso);

    // Head
    const headGeo = new THREE.SphereGeometry(0.25, 16, 16);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 2.1;
    head.castShadow = true;
    group.add(head);

    // Arms
    const armGeo = new THREE.CapsuleGeometry(0.12, 0.6, 4, 8);
    const leftArm = new THREE.Mesh(armGeo, skinMat);
    leftArm.position.set(-0.6, 1.5, 0);
    leftArm.rotation.z = Math.PI / 8;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, skinMat);
    rightArm.position.set(0.6, 1.5, 0);
    rightArm.rotation.z = -Math.PI / 8;
    group.add(rightArm);

    // Legs
    const legGeo = new THREE.CapsuleGeometry(0.15, 0.8, 4, 8);
    const leftLeg = new THREE.Mesh(legGeo, clothMat);
    leftLeg.position.set(-0.25, 0.4, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, clothMat);
    rightLeg.position.set(0.25, 0.4, 0);
    group.add(rightLeg);

    return group;
}

function spawnEnemy() {
    const enemyMesh = createRealisticHuman(0xeb4d4b);
    
    enemyMesh.position.set(
        (Math.random() - 0.5) * 150,
        0,
        (Math.random() - 0.5) * 150
    );

    scene.add(enemyMesh);
    enemies.push({
        mesh: enemyMesh,
        hp: 150,
        lastShotTime: 0,
        velocity: new THREE.Vector3()
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
        // AI Movement: Walk towards player
        const dirToPlayer = new THREE.Vector3().subVectors(camera.position, enemy.mesh.position);
        dirToPlayer.y = 0;
        dirToPlayer.normalize();
        
        const dist = enemy.mesh.position.distanceTo(camera.position);
        if (dist > 10) {
            enemy.mesh.position.addScaledVector(dirToPlayer, 2.0 * dt);
        }

        // AI Face player
        enemy.mesh.lookAt(camera.position.x, 0, camera.position.z);

        // Animation: Swivel arms (Human walk simulation)
        const time = Date.now() * 0.005;
        enemy.mesh.children.forEach((child, idx) => {
            if (idx === 2 || idx === 3) { // Arms
                child.rotation.x = Math.sin(time + (idx === 2 ? 0 : Math.PI)) * 0.5;
            }
            if (idx === 4 || idx === 5) { // Legs
                child.rotation.x = Math.sin(time + (idx === 4 ? 0 : Math.PI)) * 0.5;
            }
        });

        // Attack player
        if (Date.now() - enemy.lastShotTime > 1500) {
            if (dist < 40) {
                hp -= 10;
                updateHUD();
                enemy.lastShotTime = Date.now();
                showDamageEffect();
                if (hp <= 0) die();
            }
        }
    });
}

function showDamageEffect() {
    const vignette = document.createElement('div');
    vignette.style.position = 'absolute';
    vignette.style.top = '0';
    vignette.style.left = '0';
    vignette.style.width = '100%';
    vignette.style.height = '100%';
    vignette.style.boxShadow = 'inset 0 0 100px rgba(255,0,0,0.5)';
    vignette.style.pointerEvents = 'none';
    vignette.style.zIndex = '50';
    document.body.appendChild(vignette);
    setTimeout(() => vignette.remove(), 100);
}

function killEnemy(enemy) {
    spawnDeathParticles(enemy.mesh.position);
    scene.remove(enemy.mesh);
    enemies = enemies.filter(e => e !== enemy);
    setTimeout(spawnEnemy, 5000); // Respawn

    // Kill feed logic
    const feed = document.getElementById('kill-feed');
    const msg = document.createElement('div');
    msg.style.color = "#ff4444";
    msg.innerHTML = `<span style="color:#00aeff">Soldier: 76</span> [Eliminated] Training Bot`;
    feed.appendChild(msg);
    setTimeout(() => msg.remove(), 4000);
}

function spawnDeathParticles(pos) {
    for (let i = 0; i < 20; i++) {
        const geo = new THREE.SphereGeometry(0.1, 4, 4);
        const mat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const p = new THREE.Mesh(geo, mat);
        p.position.copy(pos);
        p.position.y += 1;
        const vel = new THREE.Vector3(
            (Math.random() - 0.5) * 0.5,
            Math.random() * 0.5,
            (Math.random() - 0.5) * 0.5
        );
        scene.add(p);
        
        const animateP = () => {
            p.position.add(vel);
            vel.y -= 0.02;
            p.scale.multiplyScalar(0.95);
            if (p.scale.x > 0.01) requestAnimationFrame(animateP);
            else scene.remove(p);
        };
        animateP();
    }
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
