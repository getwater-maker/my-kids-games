let camera, scene, renderer, controls;
let raycaster = new THREE.Raycaster();
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, canJump = false;
let prevTime = performance.now();
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();

let mapGrid = new Map();
let blocksGroup = new THREE.Group();
let itemsGroup = new THREE.Group();
let interactables = [];

const blockSize = 1;
const playerWidth = 0.6;
const playerHeight = 1.6;

let player = {
    hp: 100, maxHp: 100, isDead: false,
    iron: 0, gold: 0, blocks: 20, sword: 10, armor: 0,
    team: 'red', attackCooldown: 0
};

let aiObj = {
    pos: new THREE.Vector3(0, 5, -30),
    vel: new THREE.Vector3(),
    hp: 100, maxHp: 100, isDead: false,
    mesh: null, team: 'blue',
    blocks: 50, bridgeTimer: 0, thinkTimer: 0
};

let beds = {
    red: { exists: true },
    blue: { exists: true }
};

let generators = [
    { x: 4, z: 26, type: 'iron', timer: 0, interval: 3, color: 0xcccccc },
    { x: -4, z: -26, type: 'iron', timer: 0, interval: 3, color: 0xcccccc },
    { x: 0, z: 0, type: 'gold', timer: 0, interval: 10, color: 0xffd700 }
];

let shopOpen = false;
let handMesh;
let blockPreview;

const matStone = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8 });
const matRedWool = new THREE.MeshStandardMaterial({ color: 0xff5555, roughness: 0.9 });
const matBlueWool = new THREE.MeshStandardMaterial({ color: 0x5555ff, roughness: 0.9 });
const matBedRed = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const matBedBlue = new THREE.MeshStandardMaterial({ color: 0x0000ff });
const matShop = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x005500 });
const matAI = new THREE.MeshStandardMaterial({ color: 0x4444ff, roughness: 0.5 });

function getK(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 20, 150);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    hemiLight.position.set(0, 200, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 100, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    scene.add(blocksGroup);
    scene.add(itemsGroup);

    const previewGeo = new THREE.BoxGeometry(1.02, 1.02, 1.02);
    const edges = new THREE.EdgesGeometry(previewGeo);
    blockPreview = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000 }));
    blockPreview.visible = false;
    scene.add(blockPreview);

    camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 1000);

    // Hand model (Sword)
    const handGeo = new THREE.BoxGeometry(0.05, 0.05, 0.4);
    const handMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.8 });
    handMesh = new THREE.Mesh(handGeo, handMat);
    handMesh.position.set(0.3, -0.2, -0.4);
    camera.add(handMesh);

    renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    controls = new THREE.PointerLockControls(camera, document.body);
    scene.add(controls.getObject());

    const instructions = document.getElementById('instructions');
    instructions.addEventListener('click', () => {
        if (!shopOpen && !player.isDead) controls.lock();
    });
    controls.addEventListener('lock', () => {
        document.getElementById('blocker').style.display = 'none';
        document.getElementById('ui-layer').classList.remove('hidden');
    });
    controls.addEventListener('unlock', () => {
        if (!shopOpen && !player.isDead) document.getElementById('blocker').style.display = 'flex';
    });

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('contextmenu', e => e.preventDefault());

    buildWorld();
    spawnAI();

    controls.getObject().position.set(0, 5, 30);

    updateUI();
    setInterval(spawnItems, 1000);

    animate();
}

function buildWorld() {
    // Red Base (0, 30)
    for (let x = -4; x <= 4; x++) for (let z = 26; z <= 34; z++) addBlock(x, 0, z, matStone);
    // Blue Base (0, -30)
    for (let x = -4; x <= 4; x++) for (let z = -34; z <= -26; z++) addBlock(x, 0, z, matStone);
    // Mid (0, 0)
    for (let x = -5; x <= 5; x++) for (let z = -5; z <= 5; z++) addBlock(x, 0, z, matStone);

    // Beds
    createBed(0, 32, 'red', matBedRed);
    createBed(0, -32, 'blue', matBedBlue);

    // Shops
    createShop(-4, 30, 'shop_red');
    createShop(-4, -30, 'shop_blue');

    // Generator platforms
    addBlock(4, 0, 26, matStone);
    addBlock(-4, 0, -26, matStone);
    addBlock(0, 0, 0, matStone);
}

function addBlock(x, y, z, mat) {
    let key = getK(x, y, z);
    if (mapGrid.has(key)) return;

    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { isBlock: true, x: x, y: y, z: z, mat: mat };
    blocksGroup.add(mesh);
    mapGrid.set(key, mesh);
}

function removeBlock(x, y, z) {
    let key = getK(x, y, z);
    if (mapGrid.has(key)) {
        let b = mapGrid.get(key);
        // Can only break wool
        if (b.userData.mat === matRedWool || b.userData.mat === matBlueWool) {
            blocksGroup.remove(b);
            mapGrid.delete(key);
        }
    }
}

function createBed(x, z, team, mat) {
    const geo = new THREE.BoxGeometry(1.8, 0.6, 1.8);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x + 0.5, 1 + 0.3, z + 0.5);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { isBed: true, team: team };
    scene.add(mesh);
    interactables.push(mesh);
}

function createShop(x, z, type) {
    const geo = new THREE.BoxGeometry(1, 2, 1);
    const mesh = new THREE.Mesh(geo, matShop);
    mesh.position.set(x + 0.5, 1 + 1, z + 0.5);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { type: type };
    scene.add(mesh);
    interactables.push(mesh);
}

function spawnAI() {
    const geo = new THREE.BoxGeometry(playerWidth, playerHeight, playerWidth);
    aiObj.mesh = new THREE.Mesh(geo, matAI);
    aiObj.mesh.castShadow = true;
    aiObj.mesh.userData = { isAI: true };
    scene.add(aiObj.mesh);
    interactables.push(aiObj.mesh);
}

// PHYSICS
function getBoundingBox(pos, w, h) {
    return {
        minX: pos.x - w / 2, maxX: pos.x + w / 2,
        minY: pos.y, maxY: pos.y + h,
        minZ: pos.z - w / 2, maxZ: pos.z + w / 2
    };
}

function checkCollision(pos, w, h) {
    const b = getBoundingBox(pos, w, h);
    const gMinX = Math.floor(b.minX), gMaxX = Math.floor(b.maxX);
    const gMinY = Math.floor(b.minY), gMaxY = Math.floor(b.maxY);
    const gMinZ = Math.floor(b.minZ), gMaxZ = Math.floor(b.maxZ);

    for (let x = gMinX; x <= gMaxX; x++) {
        for (let y = gMinY; y <= gMaxY; y++) {
            for (let z = gMinZ; z <= gMaxZ; z++) {
                if (mapGrid.has(getK(x, y, z))) return true;
            }
        }
    }
    return false;
}

function updatePhysics(dt) {
    if (player.isDead) return;

    velocity.x -= velocity.x * 10.0 * dt;
    velocity.z -= velocity.z * 10.0 * dt;
    velocity.y -= 25.0 * dt; // gravity

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    let speed = 40.0;
    if (moveForward || moveBackward) velocity.z -= direction.z * speed * dt;
    if (moveLeft || moveRight) velocity.x += direction.x * speed * dt;

    let pObj = controls.getObject();
    let basePos = new THREE.Vector3(pObj.position.x, pObj.position.y - playerHeight, pObj.position.z);

    // Y Axis
    basePos.y += velocity.y * dt;
    if (checkCollision(basePos, playerWidth, playerHeight)) {
        basePos.y -= velocity.y * dt;
        if (velocity.y < 0) canJump = true;
        velocity.y = 0;
    } else canJump = false;

    // Build local move vector based on camera rotation
    let moveVec = new THREE.Vector3(velocity.x * dt, 0, velocity.z * dt);
    let cameraEuler = new THREE.Euler().setFromQuaternion(pObj.quaternion, 'YXZ');
    cameraEuler.x = 0; cameraEuler.z = 0; // Ignore pitch for movement
    moveVec.applyEuler(cameraEuler);

    basePos.x += moveVec.x;
    if (checkCollision(basePos, playerWidth, playerHeight)) basePos.x -= moveVec.x;

    basePos.z += moveVec.z;
    if (checkCollision(basePos, playerWidth, playerHeight)) basePos.z -= moveVec.z;

    pObj.position.set(basePos.x, basePos.y + playerHeight, basePos.z);

    // Death void
    if (pObj.position.y < -10) takeDamage(9999);
}

function updateAI(dt) {
    if (aiObj.isDead) return;

    aiObj.thinkTimer -= dt;
    if (aiObj.thinkTimer <= 0) {
        aiObj.thinkTimer = 0.5;
        if (aiObj.pos.distanceTo(controls.getObject().position) < 3 && !player.isDead) {
            takeDamage(15);
        }
    }

    let pObj = controls.getObject();
    let target = new THREE.Vector3(pObj.position.x, pObj.position.y - playerHeight, pObj.position.z);

    if (!beds.red.exists) target = new THREE.Vector3(pObj.position.x, pObj.position.y - playerHeight, pObj.position.z);
    else if (target.distanceTo(aiObj.pos) > 20) target = new THREE.Vector3(0, 1, 32);

    let diff = new THREE.Vector3().subVectors(target, aiObj.pos);
    diff.y = 0;
    if (diff.length() > 1.5) {
        diff.normalize();
        aiObj.vel.x = diff.x * 4;
        aiObj.vel.z = diff.z * 4;
    } else {
        if (beds.red.exists && diff.length() < 3) {
            beds.red.exists = false;
            interactables = interactables.filter(i => i.userData.team !== 'red');
            scene.children.forEach(c => { if (c.userData && c.userData.isBed && c.userData.team === 'red') scene.remove(c); });
            showMessage("RED 팀 침대가 파괴되었습니다!");
            updateUI();
        }
        aiObj.vel.x = 0; aiObj.vel.z = 0;
    }

    aiObj.vel.y -= 25.0 * dt; // gravity

    aiObj.pos.y += aiObj.vel.y * dt;
    if (checkCollision(aiObj.pos, playerWidth, playerHeight)) {
        aiObj.pos.y -= aiObj.vel.y * dt;
        if (aiObj.vel.y < 0) {
            let ahead = aiObj.pos.clone();
            ahead.x += aiObj.vel.x * dt * 25;
            ahead.z += aiObj.vel.z * dt * 25;
            if (checkCollision(ahead, playerWidth, playerHeight)) {
                aiObj.vel.y = 8; // jump
            } else {
                ahead.y -= 1;
                if (!checkCollision(ahead, playerWidth, playerHeight) && Math.abs(aiObj.vel.x) + Math.abs(aiObj.vel.z) > 0) {
                    aiObj.bridgeTimer -= dt;
                    if (aiObj.bridgeTimer <= 0 && aiObj.blocks > 0) {
                        addBlock(Math.floor(ahead.x), Math.floor(ahead.y), Math.floor(ahead.z), matBlueWool);
                        aiObj.bridgeTimer = 1.0;
                        aiObj.blocks--;
                    }
                }
            }
        }
        aiObj.vel.y = 0;
    }

    aiObj.pos.x += aiObj.vel.x * dt;
    if (checkCollision(aiObj.pos, playerWidth, playerHeight)) aiObj.pos.x -= aiObj.vel.x * dt;

    aiObj.pos.z += aiObj.vel.z * dt;
    if (checkCollision(aiObj.pos, playerWidth, playerHeight)) aiObj.pos.z -= aiObj.vel.z * dt;

    aiObj.mesh.position.set(aiObj.pos.x, aiObj.pos.y + playerHeight / 2, aiObj.pos.z);

    if (aiObj.pos.y < -10) {
        aiObj.isDead = true; aiObj.mesh.position.y = -100;
        setTimeout(() => respawnAI(), 3000);
    }
}

function respawnAI() {
    if (!beds.blue.exists) return;
    aiObj.isDead = false;
    aiObj.hp = aiObj.maxHp;
    aiObj.pos.set(0, 5, -30);
    aiObj.vel.set(0, 0, 0);
}

function spawnItems() {
    generators.forEach(g => {
        g.timer++;
        if (g.type === 'iron' || (g.type === 'gold' && g.timer % 4 === 0)) {
            const geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
            const mat = new THREE.MeshStandardMaterial({ color: g.color, metalness: 0.5 });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(g.x + Math.random() * 0.5, 2.5, g.z + Math.random() * 0.5);
            mesh.userData = { type: g.type };
            mesh.castShadow = true;
            itemsGroup.add(mesh);
        }
    });
}

function updateItems(dt) {
    let pObj = controls.getObject();
    let pBase = new THREE.Vector3(pObj.position.x, pObj.position.y - playerHeight / 2, pObj.position.z);

    for (let i = itemsGroup.children.length - 1; i >= 0; i--) {
        let it = itemsGroup.children[i];
        it.rotation.y += dt;
        it.rotation.x += dt;

        it.position.y -= 5 * dt;
        if (checkCollision(it.position, 0.3, 0.3)) it.position.y += 5 * dt;

        if (pBase.distanceTo(it.position) < 1.5) {
            if (it.userData.type === 'iron') player.iron++;
            if (it.userData.type === 'gold') player.gold++;
            itemsGroup.remove(it);
            updateUI();
        }
    }
}

function onKeyDown(e) {
    if (e.code === 'Escape' || e.code === 'KeyE') {
        if (shopOpen) {
            shopOpen = false;
            document.getElementById('shop-ui').classList.add('hidden');
            if (!player.isDead) controls.lock();
        }
    }
    if (!controls.isLocked) return;
    switch (e.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyD': moveRight = true; break;
        case 'Space': if (canJump) velocity.y = 8.5; break;
    }
}
function onKeyUp(e) {
    switch (e.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyD': moveRight = false; break;
    }
}

function onMouseDown(e) {
    if (!controls.isLocked || player.isDead) return;

    if (player.attackCooldown > 0) return;
    player.attackCooldown = 0.3;

    handMesh.position.z -= 0.3; handMesh.rotation.x -= 0.5;
    setTimeout(() => { handMesh.position.z += 0.3; handMesh.rotation.x += 0.5; }, 100);

    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    if (e.button === 0) { // Left click: Attack / Break
        let ents = raycaster.intersectObjects(interactables);
        if (ents.length > 0 && ents[0].distance < 6) {
            let obj = ents[0].object.userData;
            if (obj.type && obj.type.includes('shop')) {
                controls.unlock();
                shopOpen = true;
                document.getElementById('shop-ui').classList.remove('hidden');
                return;
            }
            if (obj.isBed && obj.team === 'blue') {
                beds.blue.exists = false;
                interactables.splice(interactables.indexOf(ents[0].object), 1);
                scene.remove(ents[0].object);
                showMessage("BLUE 팀 침대를 파괴했습니다!!");
                updateUI();
                return;
            }
            if (obj.isAI && !aiObj.isDead) {
                aiObj.hp -= player.sword;
                aiObj.vel.add(raycaster.ray.direction.clone().multiplyScalar(10));
                aiObj.vel.y += 5;
                if (aiObj.hp <= 0) {
                    aiObj.isDead = true; aiObj.mesh.position.y = -100;
                    showMessage("BLUE 팀을 처치했습니다!");
                    setTimeout(() => respawnAI(), 5000);
                }
                return;
            }
        }

        let blocks = raycaster.intersectObjects(blocksGroup.children);
        if (blocks.length > 0 && blocks[0].distance < 7) {
            let b = blocks[0].object.userData;
            removeBlock(b.x, b.y, b.z);
        }

    } else if (e.button === 2) { // Right click: Build
        if (player.blocks <= 0) return;
        let pos = getTargetBlockPos();
        if (pos) {
            let { bx, by, bz } = pos;
            let pPos = controls.getObject().position;
            if (Math.abs(pPos.x - (bx + 0.5)) < 0.8 && Math.abs(pPos.z - (bz + 0.5)) < 0.8 &&
                (by === Math.floor(pPos.y) || by === Math.floor(pPos.y - playerHeight))) {
                return;
            }
            addBlock(bx, by, bz, matRedWool);
            player.blocks--;
            updateUI();
        }
    }
}

window.closeShop = function () {
    shopOpen = false;
    document.getElementById('shop-ui').classList.add('hidden');
    if (!player.isDead) controls.lock();
}

window.buyItem = function (type) {
    if (type === 'blocks' && player.iron >= 4) { player.iron -= 4; player.blocks += 16; }
    else if (type === 'sword' && player.iron >= 10 && player.sword === 10) { player.iron -= 10; player.sword = 20; }
    else if (type === 'armor' && player.gold >= 4 && player.armor === 0) { player.gold -= 4; player.armor = 0.5; }
    else { alert("자원이 부족하거나 이미 소유 중입니다."); return; }
    updateUI();
}

function takeDamage(dmg) {
    if (player.isDead) return;
    player.hp -= dmg * (1 - player.armor);

    document.body.classList.remove('screen-shake');
    void document.body.offsetWidth;
    document.body.classList.add('screen-shake');

    if (player.hp <= 0) {
        player.isDead = true;
        document.getElementById('death-overlay').classList.remove('hidden');
        controls.unlock();
        if (beds.red.exists) {
            let t = 5;
            document.getElementById('respawn-timer').textContent = t;
            let iv = setInterval(() => {
                t--;
                document.getElementById('respawn-timer').textContent = t;
                if (t <= 0) {
                    clearInterval(iv);
                    player.hp = player.maxHp;
                    player.isDead = false;
                    player.iron = 0; player.gold = 0; player.blocks = 0;
                    document.getElementById('death-overlay').classList.add('hidden');
                    controls.getObject().position.set(0, 5, 30);
                    velocity.set(0, 0, 0);

                    document.getElementById('blocker').style.display = 'flex';
                    document.getElementById('instructions').innerHTML = '<h1 style="font-size: 60px; margin-bottom:10px;">부활 완료</h1><p style="font-size: 24px; color: #ffdd44; margin-bottom: 30px;">[ 화면을 클릭하여 다시 전장으로! ]</p>';

                    updateUI();
                }
            }, 1000);
        } else {
            showMessage("GAME OVER");
            document.getElementById('respawn-timer').parentElement.textContent = "침대가 없어 부활할 수 없습니다.";
        }
    }
    updateUI();
}

function updateUI() {
    document.getElementById('hp-val').textContent = Math.ceil(Math.max(0, player.hp));
    document.getElementById('health-bar').style.width = Math.max(0, (player.hp / player.maxHp) * 100) + "%";
    document.getElementById('iron-val').textContent = player.iron;
    document.getElementById('gold-val').textContent = player.gold;
    document.getElementById('blocks-val').textContent = player.blocks;
    document.getElementById('my-bed').textContent = beds.red.exists ? "✅" : "❌ (부활불가)";
    document.getElementById('enemy-bed').textContent = beds.blue.exists ? "✅" : "❌ (파괴됨)";
}

function showMessage(msg) {
    const d = document.getElementById('game-message');
    d.textContent = msg;
    d.classList.add('show');
    setTimeout(() => { d.classList.remove('show'); }, 3000);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    const time = performance.now();
    let dt = (time - prevTime) / 1000;
    if (dt > 0.1) dt = 0.1;
    prevTime = time;

    if (player.attackCooldown > 0) player.attackCooldown -= dt;

    if (controls.isLocked) updatePhysics(dt);

    updateAI(dt);
    updateItems(dt);
    updateBlockPreview();

    renderer.render(scene, camera);
}

function getTargetBlockPos() {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    let blocks = raycaster.intersectObjects(blocksGroup.children);
    if (blocks.length > 0 && blocks[0].distance < 7) {
        let p = blocks[0].point.clone().add(blocks[0].face.normal.clone().multiplyScalar(0.5));
        return { bx: Math.floor(p.x), by: Math.floor(p.y), bz: Math.floor(p.z) };
    }

    // Forward/auto bridge logic
    let dir = raycaster.ray.direction;
    let origin = raycaster.ray.origin;
    let pPos = controls.getObject().position;

    // We want to build at the level the feet are resting ON (or jumping from)
    // pPos.y is eye level, playerHeight is eye-to-feet distance.
    // Subtracting 0.05 ensures if feet are exactly at y=1.0, footY is 0.
    let footY = Math.floor(pPos.y - playerHeight - 0.05);

    // If pointing down slightly, project to foot plane top
    if (dir.y < -0.1) {
        let t = (footY + 1 - origin.y) / dir.y;
        if (t > 0 && t < 7) {
            let p = origin.clone().add(dir.clone().multiplyScalar(t));
            return { bx: Math.floor(p.x), by: footY, bz: Math.floor(p.z) };
        }
    }

    // Otherwise just project in front at foot level
    let forwardVec = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forwardVec.y = 0;
    if (forwardVec.lengthSq() > 0.001) {
        forwardVec.normalize();
        let toePos = pPos.clone().add(forwardVec.multiplyScalar(1.5));
        return { bx: Math.floor(toePos.x), by: footY, bz: Math.floor(toePos.z) };
    }
    return null;
}

function updateBlockPreview() {
    if (!controls.isLocked || player.isDead || player.blocks <= 0) {
        blockPreview.visible = false;
        return;
    }

    let pos = getTargetBlockPos();
    if (pos) {
        let { bx, by, bz } = pos;
        let pPos = controls.getObject().position;
        if (Math.abs(pPos.x - (bx + 0.5)) < 0.8 && Math.abs(pPos.z - (bz + 0.5)) < 0.8 &&
            (by === Math.floor(pPos.y) || by === Math.floor(pPos.y - playerHeight))) {
            blockPreview.visible = false;
        } else {
            blockPreview.position.set(bx + 0.5, by + 0.5, bz + 0.5);
            blockPreview.visible = true;
        }
    } else {
        blockPreview.visible = false;
    }
}

init();
