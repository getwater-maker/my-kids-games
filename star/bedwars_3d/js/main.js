// js/main.js

let scene, camera, renderer, controls;
let raycaster = new THREE.Raycaster();
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, moveJump = false;
let canJump = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();

// Player State
let player = {
    hp: 100,
    iron: 0,
    gold: 0,
    kills: 0,
    swordLevel: 0, // 0: Wood, 1: Stone, 2: Iron, 3: Diamond
    wool: 24,
    selectedSlot: 0,
    bedActive: true
};

let enemies = [];
let objects = [];
let resources = [];
let spawners = [];
let placementGhost;
let gameState = 'START';

// UI
const ui = {
    start: document.getElementById('start-screen'),
    hud: document.getElementById('hud'),
    hotbar: document.getElementById('hotbar-ui'),
    crosshair: document.getElementById('crosshair'),
    hpFill: document.getElementById('hp-bar-fill'),
    iron: document.getElementById('iron-count'),
    gold: document.getElementById('gold-count'),
    wool: document.getElementById('wool-count'),
    slots: [document.getElementById('slot-0'), document.getElementById('slot-1')],
    msg: document.getElementById('msg'),
    shop: document.getElementById('shop-screen'),
    gameOver: document.getElementById('game-over'),
    resultTitle: document.getElementById('result-title'),
    resultMsg: document.getElementById('result-msg')
};

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 0, 100);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').prepend(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(20, 40, 20);
    sun.castShadow = true;
    scene.add(sun);

    // Ghost for building
    placementGhost = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.05, 1.05), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.3 }));
    scene.add(placementGhost);

    controls = new THREE.PointerLockControls(camera, document.body);
    document.getElementById('start-btn').addEventListener('click', () => controls.lock());

    controls.addEventListener('lock', () => {
        ui.start.classList.add('hidden');
        ui.hud.classList.remove('hidden');
        ui.hotbar.classList.remove('hidden');
        ui.msg.classList.remove('hidden');
        ui.crosshair.style.display = 'block';
        gameState = 'PLAYING';
    });

    controls.addEventListener('unlock', () => {
        if (gameState === 'PLAYING') ui.start.classList.remove('hidden');
    });

    setupInput();
    generateWorld();
    animate();
}

function generateWorld() {
    // Player Island
    createIsland(0, 0, 0, 15, 15, 0x4caf50);
    createBed(0, 1.1, -6, 0x42a5f5); // Blue team bed
    createSpawner(0, 1, -2, 'iron');

    // Central Island
    createIsland(0, 0, 40, 20, 20, 0x90a4ae);
    createSpawner(0, 1, 40, 'gold');

    // Enemy Island
    createIsland(0, 0, 80, 15, 15, 0xef5350);
    createBed(0, 1.1, 86, 0xef5350); // Red team bed
    createSpawner(0, 1, 82, 'iron');

    spawnEnemy(0, 1.5, 75);
    spawnEnemy(5, 1.5, 80);
}

function createIsland(x, y, z, w, d, color) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 2, d), new THREE.MeshPhongMaterial({ color }));
    mesh.position.set(x, y - 1, z);
    mesh.receiveShadow = true;
    scene.add(mesh);
    objects.push(mesh);
}

function createBed(x, y, z, color) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 2), new THREE.MeshPhongMaterial({ color }));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    scene.add(mesh);
    objects.push(mesh);
}

function createSpawner(x, y, z, type) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.2, 8), new THREE.MeshPhongMaterial({ color: type === 'iron' ? 0xbdc3c7 : 0xffd700 }));
    mesh.position.set(x, y - 0.9, z);
    scene.add(mesh);
    spawners.push({ x, y, z, type, last: 0 });
}

function spawnEnemy(x, y, z) {
    const group = new THREE.Group();
    // Human model
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.3), new THREE.MeshPhongMaterial({ color: 0xef5350 }));
    body.position.y = 0.6;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshPhongMaterial({ color: 0xffccbc }));
    head.position.y = 1.4;
    group.add(body, head);
    group.position.set(x, y, z);
    scene.add(group);
    enemies.push({ mesh: group, hp: 100, team: 'red' });
}

function setupInput() {
    window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyW') moveForward = true;
        if (e.code === 'KeyS') moveBackward = true;
        if (e.code === 'KeyA') moveLeft = true;
        if (e.code === 'KeyD') moveRight = true;
        if (e.code === 'Space' && canJump) { velocity.y += 0.3; canJump = false; }
        if (e.code === 'Digit1') selectSlot(0);
        if (e.code === 'Digit2') selectSlot(1);
        if (e.code === 'KeyB') toggleShop();
    });
    window.addEventListener('keyup', (e) => {
        if (e.code === 'KeyW') moveForward = false;
        if (e.code === 'KeyS') moveBackward = false;
        if (e.code === 'KeyA') moveLeft = false;
        if (e.code === 'KeyD') moveRight = false;
    });
    window.addEventListener('mousedown', (e) => {
        if (e.button === 0) attack();
        if (e.button === 2) placeBlock();
    });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
}

function selectSlot(idx) {
    player.selectedSlot = idx;
    ui.slots.forEach((s, i) => s.classList.toggle('active', i === idx));
}

function attack() {
    if (gameState !== 'PLAYING' || player.selectedSlot !== 0) return;
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hits = raycaster.intersectObjects(enemies.map(e => e.mesh), true);
    if (hits.length > 0 && hits[0].distance < 3.5) {
        let eMesh = hits[0].object.parent;
        let enemy = enemies.find(e => e.mesh === eMesh);
        if (enemy) {
            enemy.hp -= 25 + (player.swordLevel * 10);
            if (enemy.hp <= 0) {
                scene.remove(enemy.mesh);
                enemies = enemies.filter(e => e !== enemy);
                player.kills++;
                updateHUD();
            }
        }
    }
}

function placeBlock() {
    if (gameState !== 'PLAYING' || player.selectedSlot !== 1 || player.wool <= 0) return;
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hits = raycaster.intersectObjects(objects);
    if (hits.length > 0 && hits[0].distance < 6) {
        const h = hits[0];
        const n = h.face.normal.clone().applyEuler(h.object.rotation);
        const pos = h.point.clone().add(n.multiplyScalar(0.5));
        pos.x = Math.round(pos.x); pos.y = Math.round(pos.y); pos.z = Math.round(pos.z);

        const wool = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshPhongMaterial({ color: 0xffffff }));
        wool.position.copy(pos);
        scene.add(wool);
        objects.push(wool);
        player.wool--;
        updateHUD();
    }
}

function toggleShop() {
    const isHidden = ui.shop.classList.toggle('hidden');
    if (!isHidden) controls.unlock();
    else controls.lock();
}

window.buyItem = function (item) {
    if (item === 'wool' && player.iron >= 8) { player.iron -= 8; player.wool += 16; updateHUD(); }
};

window.buySword = function () {
    const costs = [10, 50, 4]; // Iron, Iron, Gold
    if (player.swordLevel >= 3) return;
    let res = player.swordLevel < 2 ? 'iron' : 'gold';
    if (player[res] >= costs[player.swordLevel]) {
        player[res] -= costs[player.swordLevel];
        player.swordLevel++;
        updateHUD();
        const names = ["돌검", "철검", "다이아몬드 검"];
        document.getElementById('sword-upgrade-btn').textContent = player.swordLevel < 3 ? `🗡️ ${names[player.swordLevel]} (${player.swordLevel < 2 ? '철' : '금'} ${costs[player.swordLevel]})` : "최고 등급";
    }
};

function animate() {
    requestAnimationFrame(animate);
    if (gameState === 'PLAYING') {
        const time = performance.now();
        // Spawners
        spawners.forEach(s => {
            if (time - s.last > (s.type === 'iron' ? 3000 : 8000)) {
                const r = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3), new THREE.MeshPhongMaterial({ color: s.type === 'iron' ? 0xffffff : 0xffd700 }));
                r.position.set(s.x, s.y + 0.5, s.z);
                scene.add(r);
                resources.push({ mesh: r, type: s.type });
                s.last = time;
            }
        });

        // Collection
        resources.forEach((r, i) => {
            r.mesh.rotation.y += 0.05;
            if (r.mesh.position.distanceTo(camera.position) < 2) {
                player[r.type]++;
                scene.remove(r.mesh); resources.splice(i, 1); updateHUD();
            }
        });

        // Movement
        velocity.x -= velocity.x * 0.1; velocity.z -= velocity.z * 0.1; velocity.y -= 0.015;
        direction.z = Number(moveForward) - Number(moveBackward); direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();
        if (moveForward || moveBackward) velocity.z -= direction.z * 0.05;
        if (moveLeft || moveRight) velocity.x -= direction.x * 0.05;

        controls.moveRight(-velocity.x);
        controls.moveForward(-velocity.z);
        camera.position.y += velocity.y;

        // Ground check
        raycaster.set(camera.position, new THREE.Vector3(0, -1, 0));
        const floor = raycaster.intersectObjects(objects);
        if (floor.length > 0 && floor[0].distance < 1.6) {
            camera.position.y += (1.6 - floor[0].distance); velocity.y = 0; canJump = true;
        }

        if (camera.position.y < -15) gameOver("허공에 빠졌습니다!");

        // Enemy AI
        enemies.forEach(e => {
            let d = e.mesh.position.distanceTo(camera.position);
            if (d < 30 && d > 2) {
                let dir = new THREE.Vector3().subVectors(camera.position, e.mesh.position).normalize();
                e.mesh.position.x += dir.x * 0.08; e.mesh.position.z += dir.z * 0.08;
                e.mesh.lookAt(camera.position.x, e.mesh.position.y, camera.position.z);
            }
            if (d < 2) { player.hp -= 0.3; updateHUD(); if (player.hp <= 0) gameOver("적에게 당했습니다!"); }
        });

        // Placement preview
        if (player.selectedSlot === 1) {
            raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
            const hits = raycaster.intersectObjects(objects);
            if (hits.length > 0 && hits[0].distance < 6) {
                const h = hits[0];
                const n = h.face.normal.clone().applyEuler(h.object.rotation);
                const p = h.point.clone().add(n.multiplyScalar(0.5));
                placementGhost.position.set(Math.round(p.x), Math.round(p.y), Math.round(p.z));
                placementGhost.visible = true;
            } else placementGhost.visible = false;
        } else placementGhost.visible = false;
    }
    renderer.render(scene, camera);
}

function updateHUD() {
    ui.hpFill.style.width = `${player.hp}%`;
    ui.iron.textContent = player.iron;
    ui.gold.textContent = player.gold;
    ui.wool.textContent = player.wool;
}

function gameOver(msg) {
    gameState = 'OVER'; controls.unlock();
    ui.gameOver.classList.remove('hidden');
    ui.resultMsg.textContent = msg;
}

window.onload = init;
