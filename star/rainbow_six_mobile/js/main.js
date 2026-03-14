// GLOBALS: THREE, THREE.PointerLockControls
let scene, camera, renderer, controls, clock;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, isSprinting = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let hp = 100, ammo = 30, maxAmmo = 150;
let enemies = [], bullets = [], particles = [];
let isMobile = false;
let gameActive = false;
let isADS = false;

// --- Class & 1v1 States ---
let currentClass = 'burst';
let jumpCount = 0;
let canJump = true;
let is1v1 = true;
let playerSpeedMultiplier = 1.0;
let lastFireTime = 0;

const CLASSES = {
    scythe: { name: 'SCYTHE (낫)', speed: 2.2, weapon: 'TACTICAL SCYTHE', ammo: 0, max: 0, gadget: 'SPEED BOOST' },
    burst: { name: 'BURST RIFLE', speed: 1.0, weapon: 'BURST-S RIFLE', ammo: 30, max: 120, gadget: 'FRAG' },
    dagger: { name: 'DAGGER (단검)', speed: 1.3, weapon: 'THROWING DAGGER', ammo: 5, max: 5, gadget: 'SILENCE' }
};

// --- Mobile Joystick Logic ---
let joystickMove = new THREE.Vector2();
let joystickActive = false;
let touchX = 0, touchY = 0;

function init() {
    isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isMobile) {
        document.getElementById('mobile-ui').classList.remove('hidden');
    }

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);
    scene.fog = new THREE.FogExp2(0x05050a, 0.05);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = 1.7; // Human eye height

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    if (!isMobile) {
        controls = new THREE.PointerLockControls(camera, document.body);
    } else {
        setupMobileControls();
    }

    clock = new THREE.Clock();

    setupLighting();
    setupMap();
    setupWeapon();
    setupEnemies();
    setupEventListeners();

    animate();
}

function setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0x00d2ff, 1.0);
    sun.position.set(20, 50, 20);
    sun.castShadow = true;
    scene.add(sun);
}

function setupMap() {
    // Floor
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(300, 300),
        new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 })
    );
    ground.rotation.x = -Math.PI/2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Duel Arena (1v1) or Industrial Warehouse
    const boxGeo = new THREE.BoxGeometry(10, 8, 10);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x222222 });

    for (let i = 0; i < 20; i++) {
        const box = new THREE.Mesh(boxGeo, boxMat);
        box.position.set((Math.random()-0.5)*150, 4, (Math.random()-0.5)*150);
        box.castShadow = true;
        box.receiveShadow = true;
        scene.add(box);
    }
}

let weaponGroup;
function setupWeapon() {
    if (weaponGroup) camera.remove(weaponGroup);
    weaponGroup = new THREE.Group();
    
    const mat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    
    if (currentClass === 'scythe') {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.5), mat);
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.1), new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 1 }));
        blade.position.set(0.2, 0.7, 0);
        weaponGroup.add(pole, blade);
        weaponGroup.rotation.z = Math.PI/4;
    } else if (currentClass === 'burst') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 1), mat);
        weaponGroup.add(body);
    } else {
        const dagger = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.4), new THREE.MeshStandardMaterial({ color: 0xdddddd }));
        weaponGroup.add(dagger);
    }

    camera.add(weaponGroup);
    scene.add(camera);
    weaponGroup.position.set(0.4, -0.4, -0.6);
}

function setupEnemies() {
    // Clear existing
    enemies.forEach(en => scene.remove(en.mesh));
    enemies = [];

    const count = is1v1 ? 1 : 8;
    for (let i = 0; i < count; i++) {
        const en = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.8), new THREE.MeshStandardMaterial({ color: 0xff3e3e }));
        body.position.y = 0.9;
        en.add(body);
        en.position.set((Math.random()-0.5)*100, 0, (Math.random()-0.5)*100);
        if (is1v1) en.position.set(0, 0, -50);
        
        scene.add(en);
        enemies.push({ mesh: en, hp: 150, lastShot: 0 });
    }
}

// Global scope for HTML button
window.selectClass = (type) => {
    currentClass = type;
    document.querySelectorAll('.class-card').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.class-card').forEach(c => {
        if (c.innerHTML.includes(type.toUpperCase())) c.classList.add('active');
    });
    
    // UI update in Overlay
    const cData = CLASSES[type];
    document.getElementById('weapon-name').textContent = cData.weapon;
    document.getElementById('curr-ammo').textContent = cData.ammo;
    document.getElementById('max-ammo').textContent = cData.max;
    document.getElementById('gadget-name').textContent = `GADGET: 1 / 1`;
    document.getElementById('class-tag').textContent = `CLASS: ${cData.name}`;

    setupWeapon();
};

function setupEventListeners() {
    window.addEventListener('keydown', (e) => {
        if (!gameActive) return;
        switch(e.code) {
            case 'KeyW': moveForward = true; break;
            case 'KeyS': moveBackward = true; break;
            case 'KeyA': moveLeft = true; break;
            case 'KeyD': moveRight = true; break;
            case 'Space': handleJump(); break;
        }
    });

    window.addEventListener('keyup', (e) => {
        switch(e.code) {
            case 'KeyW': moveForward = false; break;
            case 'KeyS': moveBackward = false; break;
            case 'KeyA': moveLeft = false; break;
            case 'KeyD': moveRight = false; break;
        }
    });

    window.addEventListener('mousedown', (e) => {
        if (gameActive && (e.button === 0)) fire();
    });

    document.getElementById('start-btn').addEventListener('click', () => {
        is1v1 = document.getElementById('mode-1v1').checked;
        if (!isMobile) controls.lock();
        document.getElementById('start-screen').style.display = 'none';
        gameActive = true;
        setupEnemies();
    });
}

function handleJump() {
    const maxJumps = (currentClass === 'scythe') ? 2 : 1;
    if (jumpCount < maxJumps) {
        velocity.y = 0.2;
        jumpCount++;
    }
}

function fire() {
    const now = Date.now();
    if (now - lastFireTime < 100) return;
    
    if (currentClass === 'burst') {
        // 3-Round Burst
        let shots = 0;
        const burstInt = setInterval(() => {
            performSingleShot();
            shots++;
            if (shots >= 3) clearInterval(burstInt);
        }, 100);
    } else {
        performSingleShot();
    }
    lastFireTime = now;
}

function performSingleShot() {
    // Recoil
    weaponGroup.position.z += 0.05;
    setTimeout(() => weaponGroup.position.z -= 0.05, 50);

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        const hit = intersects[0];
        let hitEnemy = null;
        enemies.forEach(en => {
            en.mesh.traverse(obj => { if (obj === hit.object) hitEnemy = en; });
        });

        if (hitEnemy) {
            const dmg = (currentClass === 'scythe') ? 50 : 35;
            hitEnemy.hp -= dmg;
            showHitmarker();
            if (hitEnemy.hp <= 0) eliminate(hitEnemy);
        }
    }
}

function eliminate(enemy) {
    scene.remove(enemy.mesh);
    enemies = enemies.filter(e => e !== enemy);
    if (is1v1) {
        setTimeout(setupEnemies, 3000); // Respawn boss
    } else {
        setTimeout(spawnEnemy, 2000);
    }
}

function spawnEnemy() {
    const en = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.8), new THREE.MeshStandardMaterial({ color: 0xff3e3e }));
    body.position.y = 0.9;
    en.add(body);
    en.position.set((Math.random()-0.5)*100, 0, (Math.random()-0.5)*100);
    scene.add(en);
    enemies.push({ mesh: en, hp: 150, lastShot: 0 });
}

function showHitmarker() {
    const hm = document.getElementById('hit-marker');
    hm.classList.remove('hidden');
    setTimeout(() => hm.classList.add('hidden'), 100);
}

function animate() {
    requestAnimationFrame(animate);
    if (!gameActive) return;

    const delta = clock.getDelta();
    
    // Movement
    if (!isMobile) {
        velocity.x -= velocity.x * 10 * delta;
        velocity.z -= velocity.z * 10 * delta;
        velocity.y -= 0.01; // Gravity

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        const baseSpeed = (currentClass === 'scythe') ? 0.25 : 0.15;
        if (moveForward || moveBackward) velocity.z -= direction.z * 400 * delta * baseSpeed;
        if (moveLeft || moveRight) velocity.x -= direction.x * 400 * delta * baseSpeed;

        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);
        camera.position.y += velocity.y;

        if (camera.position.y < 1.7) {
            velocity.y = 0;
            camera.position.y = 1.7;
            jumpCount = 0;
        }
    }

    // AI Logic
    enemies.forEach(en => {
        en.mesh.lookAt(camera.position.x, 0, camera.position.z);
        if (en.mesh.position.distanceTo(camera.position) < 40) {
            if (Date.now() - en.lastShot > 2000) {
                hp -= is1v1 ? 20 : 5;
                en.lastShot = Date.now();
                updateHUD();
                if (hp <= 0) location.reload();
            }
        }
    });

    renderer.render(scene, camera);
}

function updateHUD() {
    document.getElementById('curr-hp').textContent = hp;
    document.getElementById('hp-bar-fill').style.width = hp + '%';
}

init();
