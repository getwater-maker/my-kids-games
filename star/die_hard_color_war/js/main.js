// GLOBALS: THREE, THREE.PointerLockControls

// --- Configuration ---
const PLAYER_SPEED = 0.15;
const SPRINT_MAX = 1.8;
const GRAVITY = 0.008;
const MAX_HP = 100;
const MAP_SIZE = 200;

// --- State ---
let scene, camera, renderer, controls, clock;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, isSprinting = false, canJump = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let hp = MAX_HP;
let blueScore = 0, redScore = 0;
let enemies = [], bullets = [], particles = [];
let gameActive = false;
let paintSplats = [];

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    scene.fog = new THREE.FogExp2(0x0a0a12, 0.015);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = 10;

    renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container').appendChild(renderer.domElement);

    controls = new THREE.PointerLockControls(camera, document.body);
    clock = new THREE.Clock();

    setupLighting();
    setupMap();
    setupPlayerWeapon();
    setupEnemies();
    setupEventListeners();

    animate();
}

function setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(50, 100, 50);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 4096;
    sun.shadow.mapSize.height = 4096;
    sun.shadow.camera.left = -150;
    sun.shadow.camera.right = 150;
    sun.shadow.camera.top = 150;
    sun.shadow.camera.bottom = -150;
    scene.add(sun);

    // Neon lights
    const pointLight = new THREE.PointLight(0x00d2ff, 1, 100);
    pointLight.position.set(0, 20, 0);
    scene.add(pointLight);
}

function setupMap() {
    // Ground
    const groundGeo = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE, 50, 50);
    const groundMat = new THREE.MeshStandardMaterial({ 
        color: 0x222222, 
        roughness: 0.8, 
        metalness: 0.2 
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid
    const grid = new THREE.GridHelper(MAP_SIZE, 40, 0x444444, 0x222222);
    grid.position.y = 0.05;
    scene.add(grid);

    // Urban Environment
    for (let i = 0; i < 40; i++) {
        const h = 10 + Math.random() * 40;
        const w = 10 + Math.random() * 20;
        const geo = new THREE.BoxGeometry(w, h, w);
        const mat = new THREE.MeshStandardMaterial({ 
            color: 0x111111,
            metalness: 0.5,
            roughness: 0.1
        });
        const building = new THREE.Mesh(geo, mat);
        building.position.x = (Math.random() - 0.5) * (MAP_SIZE - 20);
        building.position.z = (Math.random() - 0.5) * (MAP_SIZE - 20);
        if (Math.abs(building.position.x) < 20 && Math.abs(building.position.z) < 20) {
            building.position.x += 40;
        }
        building.position.y = h / 2;
        building.castShadow = true;
        building.receiveShadow = true;
        scene.add(building);
    }
}

let playerWeapon;
function setupPlayerWeapon() {
    const group = new THREE.Group();
    
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.2 });
    
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.6), bodyMat);
    group.add(body);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4), bodyMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -0.4;
    group.add(barrel);

    const laser = new THREE.Mesh(
        new THREE.CylinderGeometry(0.005, 0.005, 100),
        new THREE.MeshBasicMaterial({ color: 0x00d2ff, transparent: true, opacity: 0.2 })
    );
    laser.rotation.x = Math.PI / 2;
    laser.position.z = -50;
    group.add(laser);

    playerWeapon = group;
    camera.add(playerWeapon);
    scene.add(camera);

    playerWeapon.position.set(0.3, -0.3, -0.6);
}

function createHighPolyHuman(teamColor) {
    const group = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdbac });
    const clothMat = new THREE.MeshStandardMaterial({ color: teamColor, emissive: teamColor, emissiveIntensity: 0.2 });

    // Torso
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.2, 16), clothMat);
    torso.position.y = 1.2;
    torso.castShadow = true;
    group.add(torso);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 24, 24), skinMat);
    head.position.y = 2.1;
    head.castShadow = true;
    group.add(head);

    // Helmet/Goggles
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.25), new THREE.MeshBasicMaterial({ color: 0x222222 }));
    visor.position.set(0, 2.15, -0.15);
    group.add(visor);

    // Arms & Legs
    const limbGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 16);
    
    const lA = new THREE.Mesh(limbGeo, skinMat);
    lA.position.set(-0.6, 1.5, 0);
    lA.rotation.z = 0.2;
    group.add(lA);

    const rA = new THREE.Mesh(limbGeo, skinMat);
    rA.position.set(0.6, 1.5, 0);
    rA.rotation.z = -0.2;
    group.add(rA);

    const legGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.8, 16);
    const lL = new THREE.Mesh(legGeo, clothMat);
    lL.position.set(-0.25, 0.4, 0);
    group.add(lL);

    const rL = new THREE.Mesh(legGeo, clothMat);
    rL.position.set(0.25, 0.4, 0);
    group.add(rL);

    return group;
}

function setupEnemies() {
    for (let i = 0; i < 10; i++) {
        spawnEnemy();
    }
}

function spawnEnemy() {
    const mesh = createHighPolyHuman(0xff3e3e); // Red Team
    mesh.position.set(
        (Math.random() - 0.5) * 160,
        0,
        (Math.random() - 0.5) * 160
    );
    scene.add(mesh);
    enemies.push({
        mesh: mesh,
        hp: 150,
        lastShot: 0,
        targetPos: mesh.position.clone(),
        state: 'WANDER'
    });
}

function setupEventListeners() {
    window.addEventListener('keydown', (e) => {
        switch(e.code) {
            case 'KeyW': moveForward = true; break;
            case 'KeyS': moveBackward = true; break;
            case 'KeyA': moveLeft = true; break;
            case 'KeyD': moveRight = true; break;
            case 'ShiftLeft': isSprinting = true; break;
            case 'Space': if(canJump) { velocity.y += 0.15; canJump = false; } break;
        }
    });

    window.addEventListener('keyup', (e) => {
        switch(e.code) {
            case 'KeyW': moveForward = false; break;
            case 'KeyS': moveBackward = false; break;
            case 'KeyA': moveLeft = false; break;
            case 'KeyD': moveRight = false; break;
            case 'ShiftLeft': isSprinting = false; break;
        }
    });

    window.addEventListener('mousedown', (e) => {
        if (controls.isLocked) fireWeapon();
    });

    document.getElementById('start-btn').addEventListener('click', () => {
        if (controls) controls.lock();
        document.getElementById('overlay').style.display = 'none';
        document.getElementById('overlay').classList.add('hidden');
        gameActive = true;
    });
}

function fireWeapon() {
    // Recoil
    playerWeapon.position.z += 0.1;

    // Raycast
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);

    const intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length > 0) {
        const hit = intersects[0];
        createPaintSplat(hit.point, hit.face.normal, 0x00d2ff); // Blue splat

        // Enemy hit
        let hitEnemy = null;
        enemies.forEach(en => {
            let matches = false;
            en.mesh.traverse(obj => { if (obj === hit.object) matches = true; });
            if (matches) hitEnemy = en;
        });

        if (hitEnemy) {
            hitEnemy.hp -= 25;
            if (hitEnemy.hp <= 0) eliminateEnemy(hitEnemy);
        }
    }

    setTimeout(() => { playerWeapon.position.z -= 0.1; }, 50);
}

function createPaintSplat(point, normal, color) {
    const geo = new THREE.CircleGeometry(0.5 + Math.random() * 1.5, 16);
    const mat = new THREE.MeshStandardMaterial({ 
        color: color, 
        transparent: true, 
        opacity: 0.8,
        polygonOffset: true,
        polygonOffsetFactor: -1
    });
    const splat = new THREE.Mesh(geo, mat);
    
    splat.position.copy(point).add(normal.multiplyScalar(0.01));
    splat.lookAt(point.clone().add(normal));
    scene.add(splat);
    paintSplats.push(splat);

    // Update Scores
    if (color === 0x00d2ff) blueScore += 0.1;
    else redScore += 0.1;
    updateHUD();
}

function updateHUD() {
    const total = Math.max(1, blueScore + redScore);
    const bPerc = (blueScore / (MAP_SIZE * MAP_SIZE) * 2000).toFixed(1);
    const rPerc = (redScore / (MAP_SIZE * MAP_SIZE) * 2000).toFixed(1);
    
    document.getElementById('blue-score').textContent = bPerc + '%';
    document.getElementById('red-score').textContent = rPerc + '%';
    document.getElementById('blue-progress').style.width = Math.min(100, bPerc) + '%';
    document.getElementById('red-progress').style.width = Math.min(100, rPerc) + '%';
    document.getElementById('curr-hp').textContent = Math.floor(hp);
    document.getElementById('hp-fill').style.width = hp + '%';
}

function eliminateEnemy(enemy) {
    // Death particles
    spawnParticles(enemy.mesh.position, 0xff3e3e);
    
    // Kill Feed
    const feed = document.getElementById('kill-feed');
    const item = document.createElement('div');
    item.className = 'feed-item';
    item.innerHTML = '<span style="color:#00d2ff">PLAYER</span> [PAINTED] RED SQUAD';
    feed.appendChild(item);
    setTimeout(() => item.remove(), 3000);

    scene.remove(enemy.mesh);
    enemies = enemies.filter(e => e !== enemy);
    setTimeout(spawnEnemy, 3000);
}

function spawnParticles(pos, color) {
    for (let i = 0; i < 15; i++) {
        const p = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 4, 4),
            new THREE.MeshBasicMaterial({ color: color })
        );
        p.position.copy(pos).y += 1;
        p.userData.vel = new THREE.Vector3(
            (Math.random() - 0.5) * 0.4,
            Math.random() * 0.4,
            (Math.random() - 0.5) * 0.4
        );
        scene.add(p);
        particles.push(p);
        setTimeout(() => { scene.remove(p); particles = particles.filter(part => part !== p); }, 1000);
    }
}

function animate() {
    requestAnimationFrame(animate);

    if (gameActive && controls.isLocked) {
        const delta = clock.getDelta();

        // Player physics
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= GRAVITY;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        const speed = isSprinting ? PLAYER_SPEED * SPRINT_MAX : PLAYER_SPEED;

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
        updateParticles();
    }

    renderer.render(scene, camera);
}

function updateEnemies(dt) {
    enemies.forEach(en => {
        // AI Logic: Face player and move towards random targets
        const dist = en.mesh.position.distanceTo(camera.position);

        if (dist < 40) {
            en.mesh.lookAt(camera.position.x, 0, camera.position.z);
            if (Date.now() - en.lastShot > 1500) {
                hp -= 5;
                en.lastShot = Date.now();
                showDamageEffect();
                createPaintSplat(camera.position.clone().add(new THREE.Vector3(0,-5,0)), new THREE.Vector3(0,1,0), 0xff3e3e);
                updateHUD();
                if (hp <= 0) location.reload();
            }
        }

        // Animation
        const time = Date.now() * 0.005;
        en.mesh.children.forEach((c, i) => {
            if (i >= 5) c.rotation.x = Math.sin(time + (i % 2 === 0 ? 0 : Math.PI)) * 0.5;
        });
    });
}

function showDamageEffect() {
    const v = document.createElement('div');
    v.style.position = 'absolute'; v.style.top = '0'; v.style.left = '0';
    v.style.width = '100%'; v.style.height = '100%';
    v.style.boxShadow = 'inset 0 0 150px rgba(255,0,0,0.6)';
    v.style.pointerEvents = 'none'; v.style.zIndex = '2000';
    document.body.appendChild(v);
    setTimeout(() => v.remove(), 100);
}

function updateParticles() {
    particles.forEach(p => {
        p.position.add(p.userData.vel);
        p.userData.vel.y -= 0.01;
        p.scale.multiplyScalar(0.95);
    });
}

init();
