// js/main.js

// --- Constants & Config ---
const TILE_SIZE = 1; // 3D Unit size
const GRAVITY = 0.02;
const JUMP_FORCE = 0.35;
const WALK_SPEED = 0.02; // Very slow/precise as requested (Speed '5')

// --- Three.js Setup ---
let scene, camera, renderer, controls;
let raycaster = new THREE.Raycaster();
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let canJump = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();

// --- Game State ---
let gameState = 'START';
let player = {
    hp: 100,
    kills: 0,
    selectedSlot: 0, // 0: Sword, 1: Wool
    isPlacingMode: false,
    inventory: [
        { name: '칼', type: 'weapon', damage: 20, level: 0 },
        { name: '양털', type: 'block', count: 24 }
    ]
};

let objects = []; // For collision (islands, blocks)
let enemies = [];
let beds = [];
let placementGhost; // Block placement preview

// --- UI Elements ---
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over');
const crosshair = document.getElementById('crosshair');
const hud = document.getElementById('hud');
const woolCountText = document.getElementById('wool-count');
const hpBarFill = document.getElementById('hp-bar-fill');
const hpText = document.getElementById('hp-text');
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
    // Starting Island
    createIsland(0, 0, 0, 10, 10, 0x4caf50); // Player Island
    createBed(0, 1, -4, 'blue');

    // Middle Island
    createIsland(0, -5, 30, 15, 15, 0x9e9e9e); // Middle

    // Enemy Island
    createIsland(0, 0, 60, 10, 10, 0xef5350); // Enemy Island
    createBed(0, 1, 64, 'red');

    spawnEnemy(0, 1, 60);

    // Void floor (just a visual plane far down)
    const voidGeo = new THREE.PlaneGeometry(2000, 2000);
    const voidMat = new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.3 });
    const voidPlane = new THREE.Mesh(voidGeo, voidMat);
    voidPlane.rotation.x = -Math.PI / 2;
    voidPlane.position.y = -50;
    scene.add(voidPlane);
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
        performAttack();
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

    let intersects = raycaster.intersectObjects(objects);
    let hit, normal, pos;

    if (intersects.length > 0 && intersects[0].distance < 6) {
        hit = intersects[0];
        normal = hit.face.normal.clone();
        normal.applyEuler(hit.object.rotation);
        pos = hit.point.clone().add(normal.multiplyScalar(0.5));
    } else {
        // "Easy Front Bridging": If looking at air, allow placing 2 units in front at floor level
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        // Only if looking down a bit
        if (dir.y < -0.2) {
            pos = camera.position.clone().add(dir.multiplyScalar(2.5));
            pos.y = -0.5; // Snap to floor level
        } else {
            return; // Too high
        }
    }

    if (pos) {
        pos.x = Math.round(pos.x);
        pos.y = Math.round(pos.y * 2) / 2;
        pos.z = Math.round(pos.z);
        pos.x = Math.round(pos.x);
        pos.y = Math.round(pos.y * 2) / 2; // half unit snap or just round
        pos.z = Math.round(pos.z);

        const geo = new THREE.BoxGeometry(1, 1, 1);
        const mat = new THREE.MeshPhongMaterial({ color: 0xeeeeee }); // White wool
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
        // Preview for "Easy Front Bridging"
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        if (dir.y < -0.2) {
            pos = camera.position.clone().add(dir.multiplyScalar(2.5));
            pos.y = -0.5;
        }
    }

    if (pos) {
        pos.x = Math.round(pos.x);
        pos.y = Math.round(pos.y * 2) / 2;
        pos.z = Math.round(pos.z);

        placementGhost.position.copy(pos);
        placementGhost.visible = true;
    } else {
        placementGhost.visible = false;
    }
}

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);

    if (gameState === 'PLAYING' && controls.isLocked) {
        updatePlacementPreview();
        const time = performance.now();
        const delta = 1.0; // Simplified

        velocity.x -= velocity.x * 0.1;
        velocity.z -= velocity.z * 0.1;

        // Apply Gravity
        velocity.y -= GRAVITY;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        if (moveForward || moveBackward) velocity.z -= direction.z * WALK_SPEED;
        if (moveLeft || moveRight) velocity.x -= direction.x * WALK_SPEED;

        controls.moveRight(-velocity.x);
        controls.moveForward(-velocity.z);

        camera.position.y += velocity.y;

        // Collision detection with islands/blocks
        if (camera.position.y < -20) {
            triggerGameOver("허공에 빠졌습니다!");
        }

        // Simple Ground Check
        let grounded = false;
        raycaster.set(camera.position, new THREE.Vector3(0, -1, 0));
        const intersects = raycaster.intersectObjects(objects);
        if (intersects.length > 0 && intersects[0].distance < 1.6) {
            camera.position.y += (1.6 - intersects[0].distance);
            velocity.y = 0;
            canJump = true;
            grounded = true;
        }

        // Enemy AI
        enemies.forEach(enemy => {
            // Move toward player island if far
            let distToPlayer = enemy.mesh.position.distanceTo(camera.position);
            if (distToPlayer < 20 && distToPlayer > 1.5) {
                let dir = new THREE.Vector3().subVectors(camera.position, enemy.mesh.position).normalize();
                enemy.mesh.position.x += dir.x * 0.04;
                enemy.mesh.position.z += dir.z * 0.04;
            }

            if (distToPlayer < 1.5) {
                // Damage player
                player.hp -= 0.5;
                updateHUD();
                if (player.hp <= 0) triggerGameOver("적에게 당했습니다!");
            }
        });
    }

    renderer.render(scene, camera);
}

function updateHUD() {
    hpBarFill.style.width = player.hp + '%';
    hpText.textContent = `HP: ${Math.ceil(player.hp)} | 🎯 Kills: ${player.kills}`;
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
