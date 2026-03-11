/* js/main.js */

// Game Constants & State
let scene, camera, renderer, controls;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, canJump = false, isSprinting = false;
let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

let gameState = 'START';
let playerHP = 100;
let ammo = 30;
let reserve = 210;
let isReloading = false;
let kills = 0;
let stamina = 100;

// NEW: Weapon & Utility System
let currentWeaponType = 'AR'; // 'AR', 'PISTOL', 'KATANA', 'DAGGER', 'CLAYMORE', 'SCYTHE', 'UTILITY'
let isZooming = false;
let isBlocking = false;
let isMouseDown = false;
let lastFireTime = 0;
let isMeleeSwinging = false;

let arObject, pistolObject, scytheObject, utilityObject;
let katanaObject, daggerObject, claymoreObject;
let gunContainer, muzzleFlash;
let enemies = [];
let bullets = []; // Kept from original, not explicitly removed by diff
let particles = [];
let worldObjects = [];
let medkits = 3;
let bandages = 5;

const clock = new THREE.Clock();

// Initialization
function init() {
    setupThree();
    setupControls();
    createLevel();
    createWeapons();
    setupUI();

    animate();
}

function setupThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Light blue sky
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.008);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.7, 72); // Player at one end of the pier

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    sunLight.position.set(100, 100, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.left = -150; // Kept from original, not explicitly removed by diff
    sunLight.shadow.camera.right = 150; // Kept from original, not explicitly removed by diff
    sunLight.shadow.camera.top = 150; // Kept from original, not explicitly removed by diff
    sunLight.shadow.camera.bottom = -150; // Kept from original, not explicitly removed by diff
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

    const onKeyDown = (event) => {
        switch (event.code) {
            case 'KeyW': case 'ArrowUp': moveForward = true; break;
            case 'KeyA': case 'ArrowLeft': moveLeft = true; break;
            case 'KeyS': case 'ArrowDown': moveBackward = true; break;
            case 'KeyD': case 'ArrowRight': moveRight = true; break;
            case 'Space': if (canJump === true) velocity.y += 180; canJump = false; break;
            case 'ShiftLeft': isSprinting = true; break;
            case 'KeyR': reload(); break;
            case 'Digit1': switchWeapon('AR'); break;
            case 'Digit2': switchWeapon('PISTOL'); break;
            case 'Digit3': switchWeapon('KATANA'); break;
            case 'Digit4': switchWeapon('DAGGER'); break;
            case 'Digit5': switchWeapon('CLAYMORE'); break;
            case 'Digit6': switchWeapon('SCYTHE'); break;
            case 'Digit7': switchWeapon('UTILITY'); break;
            case 'KeyF': useQuickMelee(); break;
            case 'KeyG': useQuickUtility(); break;
        }
    };

    const onKeyUp = (event) => {
        switch (event.code) {
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
        if (e.button === 0) {
            isMouseDown = true;
            handleAttack();
        }
        if (e.button === 2) {
            if (isMeleeWeapon(currentWeaponType)) isBlocking = true;
            else isZooming = true;
        }
    });

    document.addEventListener('mouseup', (e) => {
        if (e.button === 0) isMouseDown = false;
        if (e.button === 2) {
            isBlocking = false;
            isZooming = false;
        }
    });

    document.addEventListener('contextmenu', (e) => e.preventDefault());
    scene.add(controls.getObject());
}

function isMeleeWeapon(type) {
    return ['KATANA', 'DAGGER', 'CLAYMORE', 'SCYTHE'].includes(type);
}

function handleAttack() {
    if (gameState !== 'PLAYING') return;
    if (isMeleeWeapon(currentWeaponType)) performMeleeAttack();
    else if (currentWeaponType === 'UTILITY') useUtilityAction();
    else shoot(); // For single click pistols or initial AR shot
}

function createLevel() {
    // 1. Water Area
    const seaGeom = new THREE.PlaneGeometry(2000, 2000);
    seaGeom.rotateX(-Math.PI / 2);
    const seaMat = new THREE.MeshStandardMaterial({
        color: 0x00a8ff,
        transparent: true,
        opacity: 0.9,
        roughness: 0.05, // Kept from original, not explicitly removed by diff
        metalness: 0.3 // Kept from original, not explicitly removed by diff
    });
    const sea = new THREE.Mesh(seaGeom, seaMat);
    sea.position.y = -1.2;
    scene.add(sea);

    // 2. Concrete Pier
    const pierMat = new THREE.MeshStandardMaterial({ color: 0x7f8c8d });
    const mainDeck = new THREE.Mesh(new THREE.BoxGeometry(60, 2, 160), pierMat);
    mainDeck.position.set(0, -0.6, 0);
    mainDeck.receiveShadow = true;
    scene.add(mainDeck);
    worldObjects.push(mainDeck);

    // 3. Shipping Containers
    const colors = [0xd63031, 0x0984e3, 0x27ae60, 0xf1c40f, 0x8e44ad];
    const containerGeom = new THREE.BoxGeometry(5, 5, 12);
    for (let i = 0; i < 40; i++) {
        const mat = new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.8 }); // Kept roughness from original
        const container = new THREE.Mesh(containerGeom, mat);
        let x, z, stack;
        if (i < 20) { x = (i % 2 === 0 ? -15 : 15); z = (i * 6) - 60; stack = Math.floor(i / 10); }
        else { x = (Math.random() - 0.5) * 40; z = (Math.random() - 0.5) * 120; stack = Math.floor(Math.random() * 2); }
        container.position.set(x, 2.5 + (stack * 5), z);
        container.rotation.y = (Math.random() < 0.3 ? Math.PI / 2 : 0); // Kept from original
        container.castShadow = true; container.receiveShadow = true;
        scene.add(container); worldObjects.push(container);
    }

    // 4. Warehouse & Cranes
    const buildMat = new THREE.MeshStandardMaterial({ color: 0x34495e });
    const warehouse = new THREE.Mesh(new THREE.BoxGeometry(50, 25, 45), buildMat);
    warehouse.position.set(0, 12.5, 90);
    warehouse.castShadow = true;
    warehouse.receiveShadow = true;
    scene.add(warehouse);
    worldObjects.push(warehouse);

    // 5. Cranes (Original code had this, keeping it for consistency with the original structure)
    const craneMat = new THREE.MeshStandardMaterial({ color: 0xe67e22, metalness: 0.7 });
    for (let xPos of [-25, 25]) {
        for (let zPos of [-50, 20]) {
            const craneBase = new THREE.Mesh(new THREE.BoxGeometry(4, 50, 4), craneMat);
            craneBase.position.set(xPos, 25, zPos);
            scene.add(craneBase);
            worldObjects.push(craneBase);

            const craneArm = new THREE.Mesh(new THREE.BoxGeometry(40, 3, 4), craneMat);
            craneArm.position.set(xPos > 0 ? xPos - 15 : xPos + 15, 48, zPos);
            scene.add(craneArm);
            worldObjects.push(craneArm);
        }
    }

    // Boat
    const ship = new THREE.Group();
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50 });
    const hull = new THREE.Mesh(new THREE.BoxGeometry(30, 15, 100), hullMat);
    hull.position.y = 5;
    ship.add(hull);
    ship.position.set(50, -5, -10);
    scene.add(ship);
    worldObjects.push(hull);

    spawnEnemy(0, -72);
}

function createWeapons() {
    gunContainer = new THREE.Group();

    // 1. AR (Assault Rifle)
    arObject = new THREE.Group();
    const arBody = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.4), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    const arBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    arBarrel.rotateX(Math.PI / 2); arBarrel.position.z = -0.3;
    arObject.add(arBody, arBarrel);
    gunContainer.add(arObject);

    // 2. Pistol
    pistolObject = new THREE.Group();
    const pBody = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.25), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    const pGrip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15, 0.06), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    pGrip.position.set(0, -0.1, 0.1); pGrip.rotateX(0.2);
    pistolObject.add(pBody, pGrip);
    pistolObject.visible = false;
    gunContainer.add(pistolObject);

    // 3. Katana
    katanaObject = new THREE.Group();
    const kHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    const kGuard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.08), new THREE.MeshStandardMaterial({ color: 0xf1c40f }));
    const kBlade = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.9, 0.05), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9 }));
    kBlade.position.z = -0.45; kBlade.rotateX(Math.PI / 2);
    katanaObject.add(kHandle, kGuard, kBlade);
    katanaObject.visible = false;
    gunContainer.add(katanaObject);

    // 4. Dagger
    daggerObject = new THREE.Group();
    const dHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.2), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    const dBlade = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.4, 0.04), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1 }));
    dBlade.position.z = -0.2; dBlade.rotateX(Math.PI / 2);
    daggerObject.add(dHandle, dBlade);
    daggerObject.visible = false;
    gunContainer.add(daggerObject);

    // 5. Heavy Claymore
    claymoreObject = new THREE.Group();
    const cHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5), new THREE.MeshStandardMaterial({ color: 0x4e342e }));
    const cBlade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.4, 0.15), new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.8 }));
    cBlade.position.z = -0.7; cBlade.rotateX(Math.PI / 2);
    claymoreObject.add(cHandle, cBlade);
    claymoreObject.visible = false;
    gunContainer.add(claymoreObject);

    // 6. Scythe
    scytheObject = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.5), new THREE.MeshStandardMaterial({ color: 0x4e342e }));
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.1), new THREE.MeshStandardMaterial({ color: 0xbdc3c7 }));
    blade.position.set(0, 0.7, -0.2); blade.rotateX(Math.PI / 2);
    scytheObject.add(shaft, blade);
    scytheObject.position.set(0.5, -0.5, -0.5);
    scytheObject.visible = false;
    gunContainer.add(scytheObject);

    // 7. Utility (Medkit Box)
    utilityObject = new THREE.Group();
    const kitBox = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.1), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    // Removed cross meshes as per diff
    utilityObject.add(kitBox);
    utilityObject.position.set(0.3, -0.3, -0.3); // Kept from original
    utilityObject.visible = false;
    gunContainer.add(utilityObject);

    // Muzzle Flash
    muzzleFlash = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0 }));
    muzzleFlash.position.z = -0.6;
    gunContainer.add(muzzleFlash);

    gunContainer.position.set(0.3, -0.3, -0.5);
    camera.add(gunContainer);
}

function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();

    if (controls.isLocked === true) {
        const delta = (time - prevTime) / 1000;

        // Player Movement
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= 9.8 * 80.0 * delta;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        let moveSpeed = 400.0;
        if (isSprinting && stamina > 0) { moveSpeed = 750.0; stamina -= 35 * delta; }
        else { stamina = Math.min(100, stamina + 15 * delta); }

        if (moveForward || moveBackward) velocity.z -= direction.z * moveSpeed * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * moveSpeed * delta;

        // Better Collision Check: Try moving X and Z separately to allow sliding along walls
        // Player Movement Logic (Local Space)
        const playerObj = controls.getObject();
        const moveX = -velocity.x * delta, moveZ = -velocity.z * delta;

        const checkCollision = () => {
            const playerBox = new THREE.Box3().setFromCenterAndSize(playerObj.position, new THREE.Vector3(0.6, 1.8, 0.6));
            for (let obj of worldObjects) {
                const objBox = new THREE.Box3().setFromObject(obj);
                if (playerBox.intersectsBox(objBox)) return true;
            }
            return false;
        };

        const oldPos = playerObj.position.clone();
        controls.moveForward(moveZ); if (checkCollision()) playerObj.position.copy(oldPos);
        const posAfterZ = playerObj.position.clone();
        controls.moveRight(moveX); if (checkCollision()) playerObj.position.copy(posAfterZ);

        playerObj.position.y += (velocity.y * delta);
        if (playerObj.position.y < 1.7) { velocity.y = 0; playerObj.position.y = 1.7; canJump = true; }

        // Automatic Firing Logic
        if (isMouseDown && (currentWeaponType === 'AR' || currentWeaponType === 'PISTOL')) {
            const fireInterval = currentWeaponType === 'AR' ? 100 : 250;
            if (time - lastFireTime > fireInterval) { shoot(); lastFireTime = time; }
        }

        // Zoom/Block & Animations
        const targetFOV = isZooming ? 40 : 75;
        camera.fov += (targetFOV - camera.fov) * 0.15;
        camera.updateProjectionMatrix();

        updateWeaponAnimations(time);

        updateEnemies(delta);
        updateParticles(delta);
        // Only one enemy, no auto-respawn to keep it 1v1
    }
    prevTime = time;
    renderer.render(scene, camera);
}

function updateWeaponAnimations(time) {
    const swayX = Math.sin(time * 0.005) * (velocity.length() > 0.1 ? 0.012 : 0.002); // Kept from original
    const swayY = Math.cos(time * 0.01) * (velocity.length() > 0.1 ? 0.012 : 0.002); // Kept from original
    if (isBlocking) {
        gunContainer.position.set(0, -0.1, -0.4);
        gunContainer.rotation.set(0, 0, Math.PI / 2);
    } else if (isMeleeSwinging) {
        // Swing anim handled by intervals or math
    } else {
        gunContainer.position.x = (isZooming ? 0 : 0.3) + swayX;
        gunContainer.position.y = (isZooming ? -0.15 : -0.3) + swayY;
        gunContainer.rotation.set(0, 0, 0);
    }
}

function switchWeapon(type) {
    currentWeaponType = type;
    arObject.visible = (type === 'AR');
    pistolObject.visible = (type === 'PISTOL');
    katanaObject.visible = (type === 'KATANA');
    daggerObject.visible = (type === 'DAGGER');
    claymoreObject.visible = (type === 'CLAYMORE');
    scytheObject.visible = (type === 'SCYTHE');
    utilityObject.visible = (type === 'UTILITY');

    document.getElementById('weapon-name').textContent = type; // Simplified as per diff
    document.querySelectorAll('#hotbar .slot').forEach(s => s.classList.remove('active'));
    const slotMap = { 'AR': 'slot-ar', 'PISTOL': 'slot-pistol', 'KATANA': 'slot-katana', 'DAGGER': 'slot-dagger', 'CLAYMORE': 'slot-claymore', 'SCYTHE': 'slot-scythe', 'UTILITY': 'slot-utility' };
    document.getElementById(slotMap[type]).classList.add('active');
    updateUI();
}

function performMeleeAttack() {
    if (isMeleeSwinging || stamina < 15) return;
    isMeleeSwinging = true;
    stamina -= (currentWeaponType === 'CLAYMORE' ? 30 : 15);

    // Quick Swing Anim
    gunContainer.rotation.x = -1.5;
    setTimeout(() => {
        checkMeleeHit();
        setTimeout(() => { gunContainer.rotation.x = 0; isMeleeSwinging = false; }, 200);
    }, 150);
}

function checkMeleeHit() {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    const intersects = raycaster.intersectObjects(enemies.map(e => e.mesh));
    const range = currentWeaponType === 'CLAYMORE' ? 6 : currentWeaponType === 'SCYTHE' ? 5 : 4;
    if (intersects.length > 0 && intersects[0].distance < range) {
        const target = enemies.find(e => e.mesh === intersects[0].object);
        if (target) {
            handleEnemyDamage(target, currentWeaponType === 'CLAYMORE' ? 100 : currentWeaponType === 'KATANA' ? 50 : 34, intersects[0].point);
        }
    }
}

function useQuickMelee() { switchWeapon('SCYTHE'); performMeleeAttack(); }
function useQuickUtility() { switchWeapon('UTILITY'); useUtilityAction(); }

function useUtilityAction() {
    // Medkit (G) or Bandage (G + right click)
    if (isZooming) { // Bandage
        if (bandages > 0) {
            playerHP = Math.min(100, playerHP + 50);
            bandages--;
            flashHeal();
        }
    } else { // Medkit
        if (medkits > 0) {
            playerHP = 100;
            medkits--;
            flashHeal();
        }
    }
    updateUI();
}

function flashHeal() {
    const vignette = document.getElementById('damage-vignette');
    vignette.style.boxShadow = "inset 0 0 100px rgba(46, 204, 113, 0.6)";
    setTimeout(() => vignette.style.boxShadow = "", 500);
}

function shoot() {
    if (gameState !== 'PLAYING' || ammo <= 0 || isReloading) return;

    // Prevent shooting if inside or pointing directly at a wall (clipping check)
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    const wallIntersects = raycaster.intersectObjects(worldObjects);
    if (wallIntersects.length > 0 && wallIntersects[0].distance < 1) return;

    ammo--; updateUI(); muzzleFlash.material.opacity = 0.8; setTimeout(() => muzzleFlash.material.opacity = 0, 50);

    // AR has more recoil than pistol
    gunContainer.rotation.x = currentWeaponType === 'AR' ? 0.08 : 0.03; setTimeout(() => gunContainer.rotation.x = 0, 100);

    const targetObjects = enemies.map(e => e.mesh).concat(worldObjects);
    const intersects = raycaster.intersectObjects(targetObjects);

    if (intersects.length > 0) {
        const hit = intersects[0];
        const target = enemies.find(e => e.mesh === hit.object);
        if (target) {
            handleEnemyDamage(target, currentWeaponType === 'AR' ? 34 : 20, hit.point);
        } else createImpact(hit.point, hit.face.normal);
    }
    if (ammo === 0) reload();
}

function reload() {
    if (isReloading || reserve <= 0) return; // Removed ammo check for full mag as per diff
    isReloading = true; const oldName = document.getElementById('weapon-name').textContent;
    document.getElementById('weapon-name').textContent = "RELOADING..."; gunContainer.position.y = -0.8;
    setTimeout(() => {
        const magSize = currentWeaponType === 'AR' ? 30 : 12; // Kept from original
        const missing = magSize - ammo;
        const add = Math.min(missing, reserve); ammo += add; reserve -= add;
        isReloading = false; document.getElementById('weapon-name').textContent = oldName; gunContainer.position.y = -0.3; updateUI();
    }, 1500); // Simplified reload time as per diff
}

function spawnEnemy(forcedX, forcedZ) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.8, 0.4), new THREE.MeshStandardMaterial({ color: 0xc0392b })); // Red for enemy
    body.castShadow = true;
    group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshStandardMaterial({ color: 0xd7ccc8 })); // Kept from original
    head.position.y = 1.1; // Kept from original
    group.add(head); // Kept from original
    const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.2, 0.65), new THREE.MeshStandardMaterial({ color: 0x111111 })); // Kept from original
    helmet.position.y = 1.3; // Kept from original
    group.add(helmet); // Kept from original

    let x, z;
    if (forcedX !== undefined && forcedZ !== undefined) {
        x = forcedX;
        z = forcedZ;
    } else {
        const isMainDeck = () => { return x > -25 && x < 25 && z > -70 && z < 70; }; // Kept from original
        do {
            x = (Math.random() - 0.5) * 60;
            z = (Math.random() - 0.5) * 150;
        } while (Math.sqrt(x * x + z * z) < 15 || !isMainDeck());
    }

    group.position.set(x, 0.9, z); scene.add(group);
    enemies.push({ mesh: group, hp: 100, lastShot: 0, speed: 3, isDead: false }); // Added isDead flag
}

function handleEnemyDamage(target, dmg, point) {
    if (target.isDead) return;
    target.hp -= dmg;
    createBlood(point || target.mesh.position);
    if (target.hp <= 0) {
        target.isDead = true;
        kills++;
        updateUI();
        // Death Animation: Fall over
        const fallAxis = new THREE.Vector3(1, 0, 0);
        target.mesh.rotation.x = Math.PI / 2;
        target.mesh.position.y = 0.2; // Lie on the ground

        // Show "ELIMINATED" message briefly
        flashMessage("TARGET ELIMINATED", "#2ecc71");

        setTimeout(() => {
            scene.remove(target.mesh);
            enemies = enemies.filter(e => e !== target);
            // Respawn opponent after 4 seconds at the far end
            setTimeout(() => {
                spawnEnemy(0, -72);
                flashMessage("NEW CHALLENGER ARRIVED", "#f1c40f");
            }, 3000);
        }, 2000);
    }
}

function flashMessage(text, color) {
    const msg = document.createElement('div');
    msg.style.position = 'absolute';
    msg.style.top = '20%';
    msg.style.left = '50%';
    msg.style.transform = 'translate(-50%, -50%)';
    msg.style.color = color || 'white';
    msg.style.fontSize = '2rem';
    msg.style.fontWeight = 'bold';
    msg.style.textShadow = '0 0 10px rgba(0,0,0,0.5)';
    msg.style.zIndex = '500';
    msg.textContent = text;
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 2000);
}

function updateEnemies(delta) {
    const playerPos = controls.getObject().position;
    enemies.forEach(en => {
        if (en.isDead) return; // Skip dead enemies
        en.mesh.lookAt(playerPos.x, en.mesh.position.y, playerPos.z);
        const dist = en.mesh.position.distanceTo(playerPos);
        if (dist > 5) en.mesh.translateZ(en.speed * delta);
        if (dist < 30 && Date.now() - en.lastShot > 2000) { en.lastShot = Date.now(); enemyShoot(); }
    });
}

function enemyShoot() { // Removed 'en' parameter as per diff
    if (isBlocking) { stamina = Math.max(0, stamina - 10); return; }
    if (Math.random() < 0.6) { playerHP -= 10; flashDamage(); updateUI(); if (playerHP <= 0) die(); }
}

function flashDamage() { const v = document.getElementById('damage-vignette'); v.classList.add('hit'); setTimeout(() => v.classList.remove('hit'), 200); }
function flashHeal() { const v = document.getElementById('damage-vignette'); v.style.boxShadow = "inset 0 0 100px rgba(46, 204, 113, 0.6)"; setTimeout(() => v.style.boxShadow = "", 500); }

function createBlood(pos) {
    for (let i = 0; i < 8; i++) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: 0xaa0000 }));
        p.position.copy(pos); p.userData.vel = new THREE.Vector3((Math.random() - 0.5) * 0.1, 0.1, (Math.random() - 0.5) * 0.1); p.userData.life = 1.0;
        scene.add(p); particles.push(p);
    }
}

function createImpact(pos, normal) {
    for (let i = 0; i < 4; i++) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: 0xaaaaaa }));
        p.position.copy(pos); p.userData.vel = normal.clone().multiplyScalar(0.05); p.userData.life = 0.5;
        scene.add(p); particles.push(p);
    }
}

function updateParticles(delta) {
    particles.forEach((p, i) => { p.position.add(p.userData.vel); p.userData.life -= delta; p.scale.setScalar(p.userData.life); if (p.userData.life <= 0) { scene.remove(p); particles.splice(i, 1); } });
}

function updateUI() {
    document.getElementById('hp-bar').style.width = playerHP + '%';
    document.getElementById('ammo-val').textContent = ammo;
    document.getElementById('reserve-val').textContent = reserve;
    document.getElementById('kill-count').textContent = `KILLS: ${kills} | Med: ${medkits} | Band: ${bandages} | Stamina: ${Math.floor(stamina)}%`;
}

function die() { gameState = 'DEAD'; controls.unlock(); document.getElementById('death-overlay').classList.remove('hidden'); } // Simplified final stats as per diff

function setupUI() { window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); }); }

init();
