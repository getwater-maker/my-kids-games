// js/main.js

// --- Constants & Config ---
const TILE_SIZE = 1; // 3D Unit size
const GRAVITY = 0.02;
const JUMP_FORCE = 0.35;
const WALK_SPEED = 0.05; // Adjusted to 'Speed 5' feel

// --- Three.js Setup ---
let scene, camera, renderer, controls;
let raycaster = new THREE.Raycaster();
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let canJump = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let isLeftMouseDown = false;
let breakingTarget = null;
let breakingProgress = 0;
const BREAK_SPEED = 2; // Progress per frame

// --- Game State ---
let gameState = 'START';
let player = {
    hp: 100,
    kills: 0,
    iron: 0,
    emerald: 0,
    armor: 1, // 1: None, 0.8: Leather, 0.6: Iron, 0.4: Diamond, 0.2: Emerald
    selectedSlot: 0,
    isPlacingMode: false,
    inventory: [
        { name: '칼', type: 'weapon', damage: 20, level: 0 },
        { name: '양털', type: 'block', count: 24 }
    ]
};

let objects = [];
let enemies = [];
let resources = [];
let spawners = [];
let placementGhost; // Block placement preview

// --- UI Elements ---
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over');
const crosshair = document.getElementById('crosshair');
const hud = document.getElementById('hud');
const woolCountText = document.getElementById('wool-count');
const ironCountText = document.getElementById('iron-count');
const emeraldCountText = document.getElementById('emerald-count');
const hpBarFill = document.getElementById('hp-bar-fill');
const hpText = document.getElementById('hp-text');
const shopScreen = document.getElementById('shop-screen');
const invSlots = [document.getElementById('slot-0'), document.getElementById('slot-1')];

// --- Initialization ---
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue
    scene.fog = new THREE.Fog(0x87ceeb, 0, 100);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = 2; // Eyes level

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.zIndex = '1';
    document.getElementById('game-container').prepend(renderer.domElement);

    // Placement Ghost
    const ghostGeo = new THREE.BoxGeometry(1.01, 1.01, 1.01);
    const ghostMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, wireframe: true });
    placementGhost = new THREE.Mesh(ghostGeo, ghostMat);
    placementGhost.visible = false;
    scene.add(placementGhost);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLight.position.set(10, 20, 10);
    sunLight.castShadow = true;
    scene.add(sunLight);

    // Controls
    controls = new THREE.PointerLockControls(camera, document.body);

    document.getElementById('start-btn').addEventListener('click', () => {
        controls.lock();
    });

    controls.addEventListener('lock', () => {
        startScreen.classList.add('hidden');
        gameOverScreen.classList.add('hidden');
        crosshair.style.display = 'block';
        hud.classList.remove('hidden');
        updateModeText();
        gameState = 'PLAYING';
    });

    controls.addEventListener('unlock', () => {
        if (gameState !== 'GAME_OVER') {
            startScreen.classList.remove('hidden');
            crosshair.style.display = 'none';
        }
    });

    // Input Handling
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    // Prevent context menu on right click to allow block placing
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('wheel', (e) => {
        if (e.deltaY > 0) selectSlot(1);
        else selectSlot(0);
    });

    // Generate Level
    generateMap();

    // Start Loop
    animate();
}

// --- Map Generation ---
function generateMap() {
    // Starting Island (Blue)
    createIsland(0, 0, 0, 12, 12, 0x4caf50);
    createBed(0, 1, -5, 'blue');
    createSpawner(0, 1, -2, 'iron');

    // Side Island Left
    createIsland(-30, 0, 15, 10, 10, 0x9e9e9e);
    createSpawner(-30, 1, 15, 'iron');

    // Side Island Right
    createIsland(30, 0, 15, 10, 10, 0x9e9e9e);
    createSpawner(30, 1, 15, 'iron');

    // Middle Island (Diamond/Emerald Area)
    createIsland(0, 0, 40, 20, 20, 0x546e7a);
    createSpawner(0, 1, 40, 'emerald');

    // Enemy Island (Red)
    createIsland(0, 0, 80, 12, 12, 0xef5350);
    createBed(0, 1, 85, 'red');
    createSpawner(0, 1, 82, 'iron');

    spawnEnemy(0, 1, 75);
    spawnEnemy(5, 1, 80);

    const voidGeo = new THREE.PlaneGeometry(3000, 3000);
    const voidMat = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.2 });
    const voidPlane = new THREE.Mesh(voidGeo, voidMat);
    voidPlane.rotation.x = -Math.PI / 2;
    voidPlane.position.y = -40;
    scene.add(voidPlane);
}

function createSpawner(x, y, z, type) {
    const geo = new THREE.CylinderGeometry(1, 1, 0.2, 8);
    const mat = new THREE.MeshPhongMaterial({ color: type === 'iron' ? 0xbdc3c7 : 0x2ecc71 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y - 0.9, z);
    scene.add(mesh);
    spawners.push({ x, y, z, type, lastSpawn: 0 });
}

function spawnResource(x, y, z, type) {
    const geo = new THREE.IcosahedronGeometry(0.3);
    const mat = new THREE.MeshPhongMaterial({ color: type === 'iron' ? 0xffffff : 0x00ff00, emissive: type === 'iron' ? 0x000000 : 0x003300 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y + 0.5, z);
    scene.add(mesh);
    resources.push({ mesh, type });
}

function createIsland(x, y, z, w, d, color) {
    const geo = new THREE.BoxGeometry(w, 2, d);
    const mat = new THREE.MeshPhongMaterial({ color: color });
    const island = new THREE.Mesh(geo, mat);
    island.position.set(x, y - 1, z);
    island.receiveShadow = true;
    scene.add(island);
    objects.push(island);
}

function createBed(x, y, z, team) {
    const geo = new THREE.BoxGeometry(1.2, 0.6, 2);
    const mat = new THREE.MeshPhongMaterial({ color: team === 'blue' ? 0x2196f3 : 0xf44336 });
    const bed = new THREE.Mesh(geo, mat);
    bed.position.set(x, y, z);
    bed.castShadow = true;
    bed.team = team;
    scene.add(bed);
    objects.push(bed);
    beds.push(bed);
}

function spawnEnemy(x, y, z) {
    // Simple Human Model (Minecraft style)
    const group = new THREE.Group();

    // Body
    const bodyGeo = new THREE.BoxGeometry(0.6, 0.8, 0.3);
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0xff8a80 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.4;
    group.add(body);

    // Head
    const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const headMat = new THREE.MeshPhongMaterial({ color: 0xffccbc });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.0;
    group.add(head);

    group.position.set(x, y, z);
    scene.add(group);

    let enemy = {
        mesh: group,
        hp: 100,
        team: 'red',
        vx: 0, vz: 0,
        state: 'IDLE'
    };
    enemies.push(enemy);
}

// --- Movement & Input ---
function onKeyDown(e) {
    switch (e.code) {
        case 'ArrowUp':
        case 'KeyW': moveForward = true; break;
        case 'ArrowLeft':
        case 'KeyA': moveLeft = true; break;
        case 'ArrowDown':
        case 'KeyS': moveBackward = true; break;
        case 'ArrowRight':
        case 'KeyD': moveRight = true; break;
        case 'Space': if (canJump) velocity.y += JUMP_FORCE; canJump = false; break;
        case 'Digit1': selectSlot(0); break;
        case 'Digit2': selectSlot(1); break;
        case 'KeyB': toggleShop(); break;
        case 'ShiftLeft':
        case 'ShiftRight': player.isPlacingMode = !player.isPlacingMode; updateModeText(); break;
    }
}

function onKeyUp(e) {
    switch (e.code) {
        case 'ArrowUp':
        case 'KeyW': moveForward = false; break;
        case 'ArrowLeft':
        case 'KeyA': moveLeft = false; break;
        case 'ArrowDown':
        case 'KeyS': moveBackward = false; break;
        case 'ArrowRight':
        case 'KeyD': moveRight = false; break;
    }
}

function selectSlot(idx) {
    player.selectedSlot = idx;
}

function updateModeText() {
    const msg = document.getElementById('msg');
    msg.textContent = "🖱️ 왼쪽 클릭: 공격 / 오른쪽 클릭: 양털 설치";
    msg.style.color = "#fff";
}

function onMouseDown(e) {
    if (gameState !== 'PLAYING') return;

    if (e.button === 2) { // Right Click
        placeBlock();
    } else if (e.button === 0) { // Left Click
        isLeftMouseDown = true;
        performAttack(); // Initial attack click
    }
}

function onMouseUp(e) {
    if (e.button === 0) {
        isLeftMouseDown = false;
        if (breakingTarget) {
            breakingTarget.scale.set(1, 1, 1);
            breakingTarget = null;
            breakingProgress = 0;
        }
    }
}

// --- Combat & Building ---
function performAttack() {
    // Camera direction ray
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(enemies.map(e => e.mesh), true);

    if (intersects.length > 0 && intersects[0].distance < 3) {
        // Hit enemy
        let hitMesh = intersects[0].object;
        let enemy = enemies.find(e => e.mesh === hitMesh || e.mesh.children.includes(hitMesh));
        if (enemy) {
            let damage = player.inventory[0].damage;
            if (player.inventory[0].level === 4) damage = 75; // Rage Blade

            enemy.hp -= damage;
            spawnEffect(intersects[0].point, 0xff0000);
            if (enemy.hp <= 0) {
                scene.remove(enemy.mesh);
                enemies = enemies.filter(e => e !== enemy);

                // Barbarian Progression
                player.kills++;
                upgradeSword();
                announce(`🔴 적을 처치했습니다! (${player.kills}킬)`);
                updateHUD();
            }
        }
    }
}

function upgradeSword() {
    if (player.kills >= 5) {
        player.inventory[0].level = 4;
        player.inventory[0].name = "레이지 블레이드";
    } else if (player.kills >= 3) {
        player.inventory[0].level = 3;
        player.inventory[0].name = "다이아몬드 검";
    } else if (player.kills >= 2) {
        player.inventory[0].level = 2;
        player.inventory[0].name = "철검";
    } else if (player.kills >= 1) {
        player.inventory[0].level = 1;
        player.inventory[0].name = "돌검";
    }

    // Update inventory slot text
    invSlots[0].textContent = `⚔️ ${player.inventory[0].name}`;
}

function placeBlock() {
    if (player.inventory[1].count <= 0) {
        announce("양털이 부족합니다!");
        return;
    }

    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(objects);
    let pos;

    if (intersects.length > 0 && intersects[0].distance < 6) {
        const hit = intersects[0];
        const normal = hit.face.normal.clone();
        normal.applyEuler(hit.object.rotation);
        pos = hit.point.clone().add(normal.multiplyScalar(0.5));
    } else {
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        pos = camera.position.clone().add(dir.multiplyScalar(3.5));
    }

    if (pos) {
        pos.x = Math.round(pos.x);
        pos.y = Math.round(pos.y);
        pos.z = Math.round(pos.z);

        const geo = new THREE.BoxGeometry(1, 1, 1);
        const mat = new THREE.MeshPhongMaterial({ color: 0xeeeeee });
        const wool = new THREE.Mesh(geo, mat);
        wool.position.copy(pos);
        wool.castShadow = true;
        wool.receiveShadow = true;

        scene.add(wool);
        objects.push(wool);

        player.inventory[1].count--;
        woolCountText.textContent = player.inventory[1].count;
    }
}

// --- Shop Logic ---
function toggleShop() {
    if (gameState === 'GAME_OVER') return;

    if (shopScreen.classList.contains('hidden')) {
        shopScreen.classList.remove('hidden');
        controls.unlock();
    } else {
        shopScreen.classList.add('hidden');
        controls.lock();
    }
}

function buyArmor(type) {
    let cost = 0;
    let resType = 'iron';
    let armorValue = 1;
    let name = "";

    switch (type) {
        case 'leather': cost = 50; armorValue = 0.8; name = "가죽 갑옷"; break;
        case 'iron': cost = 120; armorValue = 0.6; name = "철 갑옷"; break;
        case 'diamond': cost = 8; resType = 'emerald'; armorValue = 0.4; name = "다이아 갑옷"; break;
        case 'emerald': cost = 40; resType = 'emerald'; armorValue = 0.2; name = "에메랄드 갑옷"; break;
    }

    if (player[resType] >= cost) {
        player[resType] -= cost;
        player.armor = armorValue;
        updateHUD();
        announce(`🛡️ ${name} 구입 완료!`);
    } else {
        announce("💰 재화가 부족합니다!");
    }
}

function spawnEffect(pos, color) {
    const geo = new THREE.SphereGeometry(0.1, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: color });
    const p = new THREE.Mesh(geo, mat);
    p.position.copy(pos);
    scene.add(p);
    setTimeout(() => scene.remove(p), 200);
}

function announce(text) {
    const hudMsg = document.createElement('div');
    hudMsg.style.position = 'fixed';
    hudMsg.style.top = '100px';
    hudMsg.style.width = '100%';
    hudMsg.style.textAlign = 'center';
    hudMsg.style.color = '#fff';
    hudMsg.style.fontSize = '2rem';
    hudMsg.style.textShadow = '2px 2px #000';
    hudMsg.textContent = text;
    document.body.appendChild(hudMsg);
    setTimeout(() => hudMsg.remove(), 2000);
}

function updatePlacementPreview() {
    if (gameState !== 'PLAYING') {
        placementGhost.visible = false;
        return;
    }

    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(objects);
    let pos;

    if (intersects.length > 0 && intersects[0].distance < 6) {
        const hit = intersects[0];
        const normal = hit.face.normal.clone();
        normal.applyEuler(hit.object.rotation);
        pos = hit.point.clone().add(normal.multiplyScalar(0.5));
    } else {
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        pos = camera.position.clone().add(dir.multiplyScalar(3.5));
    }

    if (pos) {
        pos.x = Math.round(pos.x);
        pos.y = Math.round(pos.y);
        pos.z = Math.round(pos.z);

        placementGhost.position.copy(pos);
        placementGhost.visible = true;
    } else {
        placementGhost.visible = false;
    }
}

function animate() {
    requestAnimationFrame(animate);

    if (gameState === 'PLAYING' && controls.isLocked) {
        updatePlacementPreview();

        // Block Breaking Logic (Left Click Hold)
        if (isLeftMouseDown) {
            raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
            const intersects = raycaster.intersectObjects(objects);

            // Only blocks (not islands/beds for now, or just wool)
            if (intersects.length > 0 && intersects[0].distance < 4) {
                const target = intersects[0].object;

                // If it's a breakable block ( wool usually, check color or property )
                if (target.geometry.type === "BoxGeometry" && target.material.color.getHex() === 0xeeeeee) {
                    if (breakingTarget !== target) {
                        if (breakingTarget) breakingTarget.scale.set(1, 1, 1);
                        breakingTarget = target;
                        breakingProgress = 0;
                    }

                    breakingProgress += BREAK_SPEED;

                    // Visual feedback: wiggle/scale down
                    const s = 1 - (breakingProgress / 120);
                    target.scale.set(s, s, s);

                    if (breakingProgress >= 100) {
                        scene.remove(target);
                        objects = objects.filter(o => o !== target);
                        breakingTarget = null;
                        breakingProgress = 0;
                        announce("📢 블록을 파괴했습니다!");
                    }
                }
            } else {
                if (breakingTarget) {
                    breakingTarget.scale.set(1, 1, 1);
                    breakingTarget = null;
                    breakingProgress = 0;
                }
            }
        }

        const time = performance.now();
        const delta = 1.0;

        velocity.x -= velocity.x * 0.1;
        velocity.z -= velocity.z * 0.1;
        velocity.y -= GRAVITY;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        if (moveForward || moveBackward) velocity.z -= direction.z * WALK_SPEED;
        if (moveLeft || moveRight) velocity.x -= direction.x * WALK_SPEED;

        controls.moveRight(-velocity.x);
        controls.moveForward(-velocity.z);
        camera.position.y += velocity.y;

        if (camera.position.y < -20) {
            triggerGameOver("허공에 빠졌습니다!");
        }

        let grounded = false;
        raycaster.set(camera.position, new THREE.Vector3(0, -1, 0));
        const intersects = raycaster.intersectObjects(objects);
        if (intersects.length > 0 && intersects[0].distance < 1.6) {
            camera.position.y += (1.6 - intersects[0].distance);
            velocity.y = 0;
            canJump = true;
            grounded = true;
        }

        // Enemy AI logic
        enemies.forEach(enemy => {
            let distToPlayer = enemy.mesh.position.distanceTo(camera.position);
            if (distToPlayer < 35 && distToPlayer > 2) {
                let dir = new THREE.Vector3().subVectors(camera.position, enemy.mesh.position);
                dir.y = 0;
                dir.normalize();
                enemy.mesh.position.x += dir.x * 0.1;
                enemy.mesh.position.z += dir.z * 0.1;
                enemy.mesh.lookAt(camera.position.x, enemy.mesh.position.y, camera.position.z);
            }

            if (distToPlayer < 2) {
                player.hp -= (0.5 * player.armor); // Armor reduction
                updateHUD();
                if (player.hp <= 0) triggerGameOver("적에게 당했습니다!");
            }
        });

        // Resource Spawning
        const now = time;
        spawners.forEach(s => {
            const interval = s.type === 'iron' ? 3000 : 15000;
            if (now - s.lastSpawn > interval) {
                spawnResource(s.x, s.y, s.z, s.type);
                s.lastSpawn = now;
            }
        });

        // Collection
        resources.forEach((r, idx) => {
            r.mesh.rotation.y += 0.05;
            if (r.mesh.position.distanceTo(camera.position) < 2.5) {
                player[r.type]++;
                scene.remove(r.mesh);
                resources.splice(idx, 1);
                updateHUD();
            }
        });
    }

    renderer.render(scene, camera);
}

function updateHUD() {
    hpBarFill.style.width = player.hp + '%';
    hpText.textContent = `HP: ${Math.ceil(player.hp)} | 🎯 Kills: ${player.kills}`;
    ironCountText.textContent = player.iron;
    emeraldCountText.textContent = player.emerald;

    if (player.hp < 30) hpBarFill.style.background = '#ff4757';
    else hpBarFill.style.background = '#2ed573';
}

function triggerGameOver(reason) {
    gameState = 'GAME_OVER';
    controls.unlock();
    gameOverScreen.classList.remove('hidden');
    document.getElementById('result-title').textContent = "탈락했습니다!";
    document.getElementById('result-msg').textContent = reason;
}

// Initial Boot
window.onload = init;
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
