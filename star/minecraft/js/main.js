// star/minecraft/js/main.js

let scene, camera, renderer, clock;
let controls = { forward: false, backward: false, left: false, right: false, jump: false };
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let moveSpeed = 40.0;
let jumpForce = 20.0;
let gravity = 50.0;
let canJump = false;

let blocks = [];
letSelectionBox = null;
let currentBlockType = 'grass';
let raycaster = new THREE.Raycaster();

// --- Time and Sky Cycle ---
let gameTime = 800; // 0 to 2400 (8:00 AM)
let dayLength = 2400;
let skyColor = new THREE.Color(0xaaccff);
let nightColor = new THREE.Color(0x000814);
let sunLight;

// --- Mobs ---
let monsters = [];
const MONSTER_COLORS = [0x556b2f, 0x4b0082, 0x8b0000]; // Zombie green, Skeleton purple, Spider red

const BLOCK_TYPES = {
    grass: { color: 0x4caf50, icon: '🌿' },
    dirt: { color: 0x8d6e63, icon: '🟫' },
    stone: { color: 0x9e9e9e, icon: '🪨' },
    wood: { color: 0x5d4037, icon: '🪵' },
    leaves: { color: 0x2e7d32, icon: '🍃' },
    glass: { color: 0x81d4fa, icon: '💎', opacity: 0.6, transparent: true }
};

function init() {
    scene = new THREE.Scene();
    scene.background = skyColor;
    scene.fog = new THREE.FogExp2(0xaaccff, 0.015);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 10, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    clock = new THREE.Clock();

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLight.position.set(50, 100, 50);
    sunLight.castShadow = true;
    scene.add(sunLight);

    generateInitialWorld();

    // Selection Highlight
    const boxGeo = new THREE.BoxGeometry(1.05, 1.05, 1.05);
    const boxMat = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true });
    selectionBox = new THREE.Mesh(boxGeo, boxMat);
    scene.add(selectionBox);

    setupControls();
    setupUI();

    animate();
}

function generateInitialWorld() {
    const size = 32;
    for (let x = -size / 2; x < size / 2; x++) {
        for (let z = -size / 2; z < size / 2; z++) {
            createBlock(x, 0, z, 'grass');
            for (let y = -1; y >= -3; y--) {
                createBlock(x, y, z, 'dirt');
            }
        }
    }
}

function createBlock(x, y, z, type) {
    const config = BLOCK_TYPES[type];
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshPhongMaterial({
        color: config.color,
        opacity: config.opacity || 1,
        transparent: config.transparent || false
    });
    const block = new THREE.Mesh(geo, mat);
    block.position.set(Math.round(x), Math.round(y), Math.round(z));
    block.userData.type = type;
    scene.add(block);
    blocks.push(block);
    document.getElementById('block-count').textContent = blocks.length;
}

function spawnMonster() {
    const angle = Math.random() * Math.PI * 2;
    const distance = 20 + Math.random() * 20;
    const x = camera.position.x + Math.cos(angle) * distance;
    const z = camera.position.z + Math.sin(angle) * distance;

    // Create simple blocky monster
    const monsterGroup = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3, 1), new THREE.MeshPhongMaterial({ color: MONSTER_COLORS[Math.floor(Math.random() * MONSTER_COLORS.length)] }));
    body.position.y = 1.5;
    monsterGroup.add(body);

    const head = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), new THREE.MeshPhongMaterial({ color: 0x111111 }));
    head.position.y = 3.2;
    monsterGroup.add(head);

    // Glowing eyes
    const eyeGeo = new THREE.BoxGeometry(0.3, 0.3, 0.1);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const e1 = new THREE.Mesh(eyeGeo, eyeMat); e1.position.set(0.4, 3.4, 0.71); monsterGroup.add(e1);
    const e2 = new THREE.Mesh(eyeGeo, eyeMat); e2.position.set(-0.4, 3.4, 0.71); monsterGroup.add(e2);

    monsterGroup.position.set(x, 0, z);
    scene.add(monsterGroup);
    monsters.push(monsterGroup);
}

function updateTime(delta) {
    gameTime += delta * 15; // Speed up time
    if (gameTime >= dayLength) {
        gameTime = 0;
    }

    const hour = Math.floor(gameTime / 100);
    const min = Math.floor((gameTime % 100) * 0.6);
    document.getElementById('time-display').textContent = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;

    // Night detection (6 PM to 6 AM)
    const isNight = hour >= 18 || hour < 6;

    // Transition sky color
    let skyLerp = 0;
    if (hour >= 17 && hour < 19) skyLerp = (gameTime - 1700) / 200; // Sunset
    else if (hour >= 19 || hour < 5) skyLerp = 1; // Full Night
    else if (hour >= 5 && hour < 7) skyLerp = 1 - (gameTime - 500) / 200; // Sunrise

    scene.background.copy(skyColor).lerp(nightColor, skyLerp);
    scene.fog.color.copy(scene.background);
    sunLight.intensity = (1 - skyLerp) * 0.8;

    // Spawn monsters at night
    if (isNight && monsters.length < 15 && Math.random() < 0.01) {
        spawnMonster();
    }

    // Remove monsters at day
    if (!isNight && monsters.length > 0) {
        const m = monsters.pop();
        scene.remove(m);
    }
}

function setupControls() {
    document.body.onclick = () => document.body.requestPointerLock();
    document.addEventListener('pointerlockchange', () => {
        document.getElementById('instructions').classList.toggle('hidden', document.pointerLockElement === document.body);
    });
    document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement === document.body) {
            camera.rotation.y -= e.movementX * 0.002;
            camera.rotation.x -= e.movementY * 0.002;
            camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
        }
    });

    window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyW') controls.forward = true;
        if (e.code === 'KeyS') controls.backward = true;
        if (e.code === 'KeyA') controls.left = true;
        if (e.code === 'KeyD') controls.right = true;
        if (e.code === 'Space' && canJump) { velocity.y += jumpForce; canJump = false; }
        if (['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'].includes(e.code)) {
            const types = ['grass', 'dirt', 'stone', 'wood', 'leaves', 'glass'];
            selectBlock(types[parseInt(e.key) - 1]);
        }
    });
    window.addEventListener('keyup', (e) => {
        if (e.code === 'KeyW') controls.forward = false;
        if (e.code === 'KeyS') controls.backward = false;
        if (e.code === 'KeyA') controls.left = false;
        if (e.code === 'KeyD') controls.right = false;
    });

    window.addEventListener('mousedown', (e) => {
        if (document.pointerLockElement !== document.body) return;
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const intersects = raycaster.intersectObjects(blocks);

        if (intersects.length > 0) {
            const intersect = intersects[0];
            if (e.button === 0) { // Break
                scene.remove(intersect.object);
                blocks = blocks.filter(b => b !== intersect.object);
                document.getElementById('block-count').textContent = blocks.length;
            } else if (e.button === 2) { // Place
                const pos = intersect.object.position.clone().add(intersect.face.normal);
                createBlock(pos.x, pos.y, pos.z, currentBlockType);
            }
        }
    });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
}

function setupUI() {
    document.querySelectorAll('.slot').forEach(slot => {
        slot.onclick = () => selectBlock(slot.dataset.type);
    });
    document.getElementById('start-btn').onclick = () => document.body.requestPointerLock();
}

function selectBlock(type) {
    currentBlockType = type;
    document.querySelectorAll('.slot').forEach(s => s.classList.toggle('active', s.dataset.type === type));
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (document.pointerLockElement === document.body) {
        updateTime(delta);

        // Movement
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= gravity * delta;

        direction.z = Number(controls.forward) - Number(controls.backward);
        direction.x = Number(controls.right) - Number(controls.left);
        direction.normalize();

        const camDir = new THREE.Vector3();
        camera.getWorldDirection(camDir); camDir.y = 0; camDir.normalize();
        const camRight = new THREE.Vector3().crossVectors(camera.up, camDir).normalize();

        camera.position.add(camDir.clone().multiplyScalar(-velocity.z * delta));
        camera.position.add(camRight.clone().multiplyScalar(velocity.x * delta));
        camera.position.y += velocity.y * delta;

        if (camera.position.y < 1.8) {
            velocity.y = 0; camera.position.y = 1.8; canJump = true;
        }

        // Raycast Selection
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const intersects = raycaster.intersectObjects(blocks);
        if (intersects.length > 0) {
            selectionBox.position.copy(intersects[0].object.position);
            selectionBox.visible = true;
        } else selectionBox.visible = false;

        document.getElementById('pos-display').textContent = `${Math.floor(camera.position.x)}, ${Math.floor(camera.position.y)}, ${Math.floor(camera.position.z)}`;

        // Monster AI: Follow player
        monsters.forEach(m => {
            const dx = camera.position.x - m.position.x;
            const dz = camera.position.z - m.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist > 1.5) {
                m.position.x += (dx / dist) * 5 * delta;
                m.position.z += (dz / dist) * 5 * delta;
                m.lookAt(camera.position.x, 0, camera.position.z);
            }
            if (dist < 1.2) {
                // Simplistic damage: push back
                velocity.z += 20;
            }
        });
    }
    renderer.render(scene, camera);
}

window.onload = init;
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
