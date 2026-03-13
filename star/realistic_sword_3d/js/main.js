/* js/main.js */

// Game Constants & State
let scene, camera, renderer, controls;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, canJump = false, isSprinting = false;
let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

let gameState = 'START';
let playerHP = 100;
let stamina = 100;
let kills = 0;
let medkits = 3;

// Sword System
let currentWeaponType = 'KATANA'; // 'KATANA', 'DAGGER', 'CLAYMORE'
let swordContainer, swordObject, daggerObject, claymoreObject, medkitObject;
let isAttacking = false, isBlocking = false;
let comboCount = 0;
let lastAttackTime = 0;

let enemies = [];
let worldObjects = [];
let particles = [];

// Initialization
function init() {
    setupThree();
    setupControls();
    createLevel();
    createWeapons();

    animate();
}

function setupThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a); // Dark environment
    scene.fog = new THREE.FogExp2(0x1a1a1a, 0.015);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.7, 72);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.position.set(50, 100, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);
}

function setupControls() {
    controls = new THREE.PointerLockControls(camera, document.body);

    const startBtn = document.getElementById('start-btn');
    startBtn.addEventListener('click', () => controls.lock());

    controls.addEventListener('lock', () => {
        document.getElementById('overlay').classList.add('hidden');
        gameState = 'PLAYING';
    });

    controls.addEventListener('unlock', () => {
        if (gameState !== 'DEAD') {
            document.getElementById('overlay').classList.remove('hidden');
            gameState = 'START';
        }
    });

    const onKeyDown = (e) => {
        switch (e.code) {
            case 'KeyW': case 'ArrowUp': moveForward = true; break;
            case 'KeyA': case 'ArrowLeft': moveLeft = true; break;
            case 'KeyS': case 'ArrowDown': moveBackward = true; break;
            case 'KeyD': case 'ArrowRight': moveRight = true; break;
            case 'Space': if (canJump) velocity.y += 180; canJump = false; break;
            case 'ShiftLeft': isSprinting = true; break;
            case 'Digit1': switchWeapon('KATANA'); break;
            case 'Digit2': switchWeapon('DAGGER'); break;
            case 'Digit3': switchWeapon('CLAYMORE'); break;
            case 'KeyG': useMedkit(); break;
        }
    };

    const onKeyUp = (e) => {
        switch (e.code) {
            case 'KeyW': case 'ArrowUp': moveForward = false; break;
            case 'KeyA': case 'ArrowLeft': moveLeft = false; break;
            case 'KeyS': case 'ArrowDown': moveBackward = false; break;
            case 'KeyD': case 'ArrowRight': moveRight = false; break;
            case 'ShiftLeft': isSprinting = false; break;
        }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    document.addEventListener('mousedown', (e) => {
        if (e.button === 0) performAttack();
        if (e.button === 2) isBlocking = true;
    });

    document.addEventListener('mouseup', (e) => {
        if (e.button === 2) isBlocking = false;
    });

    document.addEventListener('contextmenu', e => e.preventDefault());
    scene.add(controls.getObject());
}

function createLevel() {
    // Ground - Ancient Stone Wharf
    const groundGeom = new THREE.PlaneGeometry(100, 200);
    groundGeom.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.receiveShadow = true;
    scene.add(ground);
    worldObjects.push(ground);

    // Pillars & Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    for (let i = 0; i < 10; i++) {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(4, 15, 4), wallMat);
        pillar.position.set(i % 2 === 0 ? -20 : 20, 7.5, (i * 20) - 80);
        pillar.castShadow = i % 2 === 0;
        pillar.receiveShadow = true;
        scene.add(pillar);
        worldObjects.push(pillar);
    }

    // Water around the wharf
    const waterGeom = new THREE.PlaneGeometry(2000, 2000);
    waterGeom.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x0a1a2a, transparent: true, opacity: 0.8 });
    const water = new THREE.Mesh(waterGeom, waterMat);
    water.position.y = -2;
    scene.add(water);

    spawnEnemy(0, -60);
}

function createWeapons() {
    swordContainer = new THREE.Group();

    // 1. Katana (Balanced)
    swordObject = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.08), new THREE.MeshStandardMaterial({ color: 0xf1c40f }));
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.9, 0.05), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.1 }));
    blade.position.y = 0.6;
    swordObject.add(handle, guard, blade);
    swordContainer.add(swordObject);

    // 2. Dagger (Fast)
    daggerObject = new THREE.Group();
    const dHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.2), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    const dBlade = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.4, 0.04), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1 }));
    dBlade.position.y = 0.3;
    daggerObject.add(dHandle, dBlade);
    daggerObject.visible = false;
    swordContainer.add(daggerObject);

    // 3. Heavy Claymore (Slow, high dmg)
    claymoreObject = new THREE.Group();
    const cHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5), new THREE.MeshStandardMaterial({ color: 0x4e342e }));
    const cGuard = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.1), new THREE.MeshStandardMaterial({ color: 0x5d4037 }));
    const cBlade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.4, 0.15), new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.8 }));
    cBlade.position.y = 0.95;
    claymoreObject.add(cHandle, cGuard, cBlade);
    claymoreObject.visible = false;
    swordContainer.add(claymoreObject);

    // 4. Medkit
    medkitObject = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.1), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    medkitObject.visible = false;
    swordContainer.add(medkitObject);

    swordContainer.position.set(0.4, -0.4, -0.6);
    swordContainer.rotation.x = -Math.PI / 3;
    camera.add(swordContainer);
}

function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();

    if (controls.isLocked) {
        const delta = (time - prevTime) / 1000;

        // Movement
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= 9.8 * 80.0 * delta;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        let moveSpeed = 400.0;
        if (isSprinting && stamina > 0) {
            moveSpeed = 700.0;
            stamina -= 30 * delta;
        } else {
            stamina = Math.min(100, stamina + 15 * delta);
        }

        if (moveForward || moveBackward) velocity.z -= direction.z * moveSpeed * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * moveSpeed * delta;

        const playerObj = controls.getObject();
        const oldPos = playerObj.position.clone();

        controls.moveForward(-velocity.z * delta);
        controls.moveRight(-velocity.x * delta);

        // Basic Plane Collision
        if (checkCollision()) playerObj.position.copy(oldPos);

        playerObj.position.y += (velocity.y * delta);
        if (playerObj.position.y < 1.7) {
            velocity.y = 0;
            playerObj.position.y = 1.7;
            canJump = true;
        }

        // Sword Animation
        updateSwordAnimation(time, delta);
        updateEnemies(delta);
        updateParticles(delta);
        updateUI();
    }
    prevTime = time;
    renderer.render(scene, camera);
}

function checkCollision() {
    const playerBox = new THREE.Box3().setFromCenterAndSize(controls.getObject().position, new THREE.Vector3(1, 1.8, 1));
    for (let obj of worldObjects) {
        if (obj === worldObjects[0]) continue; // Skip ground
        const objBox = new THREE.Box3().setFromObject(obj);
        if (playerBox.intersectsBox(objBox)) return true;
    }
    return false;
}

function switchWeapon(type) {
    currentWeaponType = type;
    swordObject.visible = (type === 'KATANA');
    daggerObject.visible = (type === 'DAGGER');
    claymoreObject.visible = (type === 'CLAYMORE');
    medkitObject.visible = false;

    document.getElementById('weapon-name').textContent = type;
    document.querySelectorAll('.slot').forEach(s => s.classList.remove('active'));
    document.getElementById(`slot-${type === 'KATANA' ? 1 : type === 'DAGGER' ? 2 : 3}`).classList.add('active');
}

function performAttack() {
    if (isAttacking || stamina < 15) return;
    isAttacking = true;
    stamina -= (currentWeaponType === 'CLAYMORE' ? 30 : currentWeaponType === 'KATANA' ? 15 : 10);
    lastAttackTime = performance.now();

    const attackDuration = currentWeaponType === 'CLAYMORE' ? 600 : currentWeaponType === 'KATANA' ? 300 : 150;

    setTimeout(() => {
        checkHit();
        setTimeout(() => isAttacking = false, attackDuration / 2);
    }, attackDuration / 2);
}

function updateSwordAnimation(time, delta) {
    if (isAttacking) {
        const elapsed = time - lastAttackTime;
        const phase = currentWeaponType === 'CLAYMORE' ? 600 : 300;
        const progress = Math.min(1, elapsed / phase);

        swordContainer.rotation.x = -Math.PI / 3 + Math.sin(progress * Math.PI) * 1.5;
        swordContainer.rotation.y = Math.sin(progress * Math.PI) * 1.0;
    } else if (isBlocking) {
        swordContainer.position.set(0, -0.1, -0.4);
        swordContainer.rotation.set(0, 0, Math.PI / 2);
    } else {
        // Idle sway
        const sway = Math.sin(time * 0.003) * 0.05;
        swordContainer.position.set(0.4, -0.4 + sway, -0.6);
        swordContainer.rotation.set(-Math.PI / 3, 0, 0.2);
    }
}

function checkHit() {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    const intersects = raycaster.intersectObjects(enemies.map(e => e.mesh));

    const reach = currentWeaponType === 'CLAYMORE' ? 6 : currentWeaponType === 'KATANA' ? 4 : 2.5;

    if (intersects.length > 0 && intersects[0].distance < reach) {
        const enemy = enemies.find(e => e.mesh === intersects[0].object);
        if (enemy) {
            const dmg = currentWeaponType === 'CLAYMORE' ? 100 : currentWeaponType === 'KATANA' ? 40 : 25;
            enemy.hp -= dmg;
            createBlood(intersects[0].point);
            if (enemy.hp <= 0) {
                scene.remove(enemy.mesh);
                enemies = enemies.filter(e => e !== enemy);
                kills++;
                setTimeout(() => spawnEnemy((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 150), 3000);
            }
        }
    }
}

function useMedkit() {
    if (medkits > 0 && playerHP < 100) {
        medkitObject.visible = true;
        setTimeout(() => {
            playerHP = 100;
            medkits--;
            medkitObject.visible = false;
        }, 500);
    }
}

function spawnEnemy(x, z) {
    const group = new THREE.Group();
    // Knight-like enemy
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.8, 0.4), new THREE.MeshStandardMaterial({ color: 0x444444 }));
    const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    helmet.position.y = 1.1;
    const enemySword = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1, 0.1), new THREE.MeshStandardMaterial({ color: 0xaa0000 }));
    enemySword.position.set(0.6, 0, -0.4);

    group.add(body, helmet, enemySword);
    group.position.set(x, 0.9, z);
    scene.add(group);
    enemies.push({ mesh: group, hp: 100, lastAttack: 0 });
}

function updateEnemies(delta) {
    const playerPos = controls.getObject().position;
    enemies.forEach(en => {
        en.mesh.lookAt(playerPos.x, en.mesh.position.y, playerPos.z);
        const dist = en.mesh.position.distanceTo(playerPos);

        if (dist > 3) {
            en.mesh.translateZ(4 * delta);
        } else if (Date.now() - en.lastAttack > 1500) {
            en.lastAttack = Date.now();
            if (!isBlocking) {
                playerHP -= 20;
                flashDamage();
                if (playerHP <= 0) die();
            } else {
                stamina = Math.max(0, stamina - 10); // Blocking costs stamina
            }
        }
    });
}

function flashDamage() {
    const v = document.getElementById('damage-vignette');
    v.classList.add('hit');
    setTimeout(() => v.classList.remove('hit'), 200);
}

function createBlood(pos) {
    for (let i = 0; i < 10; i++) {
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.05), new THREE.MeshBasicMaterial({ color: 0x880000 }));
        p.position.copy(pos);
        p.userData.vel = new THREE.Vector3((Math.random() - 0.5) * 0.2, Math.random() * 0.2, (Math.random() - 0.5) * 0.2);
        p.userData.life = 1.0;
        scene.add(p);
        particles.push(p);
    }
}

function updateParticles(delta) {
    particles.forEach((p, i) => {
        p.position.add(p.userData.vel);
        p.userData.life -= delta;
        p.scale.setScalar(p.userData.life);
        if (p.userData.life <= 0) { scene.remove(p); particles.splice(i, 1); }
    });
}

function updateUI() {
    document.getElementById('hp-bar').style.width = playerHP + '%';
    document.getElementById('stamina-bar').style.width = stamina + '%';
    document.getElementById('kill-count').textContent = `KILLS: ${kills}`;
}

function die() {
    gameState = 'DEAD';
    controls.unlock();
    document.getElementById('death-overlay').classList.remove('hidden');
    document.getElementById('final-stats').textContent = `적 제거: ${kills}명`;
}

init();
