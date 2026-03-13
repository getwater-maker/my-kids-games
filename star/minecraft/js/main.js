// star/minecraft/js/main.js

let scene, camera, renderer, clock;
let controls = { forward: false, backward: false, left: false, right: false, jump: false, crafting: false };
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let moveSpeed = 45.0;
let jumpForce = 22.0;
let gravity = 60.0;
let canJump = false;

let blocks = [];
let selectionBox = null;
let currentBlockType = 'grass';
let raycaster = new THREE.Raycaster();

// Inventory
let inventory = {
    grass: 0,
    dirt: 0,
    stone: 0,
    wood: 0,
    iron: 0,
    gold: 0,
    diamond: 0,
    sword: 0
};

let currentSwordPower = 1;

const BLOCK_TYPES = {
    grass: { color: 0x4caf50, icon: '🌿' },
    dirt: { color: 0x8d6e63, icon: '🟫' },
    stone: { color: 0x9e9e9e, icon: '🪨' },
    wood: { color: 0x5d4037, icon: '🪵' },
    iron: { color: 0xcccccc, icon: '⛓️' },
    gold: { color: 0xffd700, icon: '🪙' },
    diamond: { color: 0x00d2ff, icon: '💎' },
    sword: { color: 0x000000, icon: '⚔️', isStatic: true }
};

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xaaccff);
    scene.fog = new THREE.FogExp2(0xaaccff, 0.01);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 20, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    clock = new THREE.Clock();

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(50, 100, 50);
    scene.add(sun);

    generateLargeWorld();

    const boxGeo = new THREE.BoxGeometry(1.05, 1.05, 1.05);
    const boxMat = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true });
    selectionBox = new THREE.Mesh(boxGeo, boxMat);
    scene.add(selectionBox);

    setupControls();
    setupUI();
    animate();
}

function generateLargeWorld() {
    // Generate a much larger and deeper world
    const size = 64; // Increased size
    const depth = 20; // Deeper

    for (let x = -size / 2; x < size / 2; x++) {
        for (let z = -size / 2; z < size / 2; z++) {
            // Surface
            createBlock(x, 0, z, 'grass');

            // Underground
            for (let y = -1; y >= -depth; y--) {
                let type = 'dirt';
                if (y < -3) type = 'stone';

                // Random Ores
                const rand = Math.random();
                if (y < -5 && rand < 0.05) type = 'iron';
                if (y < -10 && rand < 0.03) type = 'gold';
                if (y < -15 && rand < 0.015) type = 'diamond';

                // Caves (Air)
                if (Math.random() < 0.02) continue;

                createBlock(x, y, z, type);
            }
        }
    }
}

function createBlock(x, y, z, type) {
    const config = BLOCK_TYPES[type];
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshPhongMaterial({ color: config.color });
    const block = new THREE.Mesh(geo, mat);
    block.position.set(Math.round(x), Math.round(y), Math.round(z));
    block.userData.type = type;
    scene.add(block);
    blocks.push(block);
}

function setupControls() {
    document.body.onclick = () => {
        if (!controls.crafting) document.body.requestPointerLock();
    };

    document.addEventListener('pointerlockchange', () => {
        const isLocked = document.pointerLockElement === document.body;
        document.getElementById('instructions').classList.toggle('hidden', isLocked || controls.crafting);
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
        if (e.code === 'KeyE') toggleCrafting();

        if (['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8'].includes(e.code)) {
            const types = ['grass', 'dirt', 'stone', 'wood', 'iron', 'gold', 'diamond', 'sword'];
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
                const type = intersect.object.userData.type;
                inventory[type]++; // Collect
                scene.remove(intersect.object);
                blocks = blocks.filter(b => b !== intersect.object);
                updateStats();
            } else if (e.button === 2) { // Place
                if (currentBlockType !== 'sword' && inventory[currentBlockType] > 0) {
                    const pos = intersect.object.position.clone().add(intersect.face.normal);
                    createBlock(pos.x, pos.y, pos.z, currentBlockType);
                    inventory[currentBlockType]--;
                    updateStats();
                }
            }
        }
    });
}

function updateStats() {
    document.getElementById('block-count').textContent = `Inv: W:${inventory.wood} I:${inventory.iron} G:${inventory.gold} D:${inventory.diamond}`;
}

function selectBlock(type) {
    currentBlockType = type;
    document.querySelectorAll('.slot').forEach(s => s.classList.toggle('active', s.dataset.type === type));
}

function toggleCrafting() {
    controls.crafting = !controls.crafting;
    document.getElementById('crafting-overlay').classList.toggle('hidden', !controls.crafting);
    if (controls.crafting) document.exitPointerLock();
    else document.body.requestPointerLock();
}

window.craft = function (item) {
    if (item === 'iron_sword' && inventory.wood >= 2 && inventory.iron >= 2) {
        inventory.wood -= 2; inventory.iron -= 2; inventory.sword++;
        currentSwordPower = 2; alert("철검 제작 완료!");
    } else if (item === 'gold_sword' && inventory.wood >= 2 && inventory.gold >= 2) {
        inventory.wood -= 2; inventory.gold -= 2; inventory.sword++;
        currentSwordPower = 3; alert("황금검 제작 완료!");
    } else if (item === 'diamond_sword' && inventory.wood >= 2 && inventory.diamond >= 2) {
        inventory.wood -= 2; inventory.diamond -= 2; inventory.sword++;
        currentSwordPower = 5; alert("다이아몬드검 제작 완료!");
    } else {
        alert("재료가 부족합니다!");
    }
    updateStats();
};

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (document.pointerLockElement === document.body) {
        // Simple Physics/Movement
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= gravity * delta;

        direction.z = Number(controls.forward) - Number(controls.backward);
        direction.x = Number(controls.right) - Number(controls.left);
        direction.normalize();

        const camDir = new THREE.Vector3();
        camera.getWorldDirection(camDir); camDir.y = 0; camDir.normalize();
        const camRight = new THREE.Vector3().crossVectors(camera.up, camDir).normalize();

        camera.position.add(camDir.clone().multiplyScalar(-velocity.z * 40 * delta));
        camera.position.add(camRight.clone().multiplyScalar(velocity.x * 40 * delta));
        camera.position.y += velocity.y * delta;

        if (camera.position.y < 2) {
            velocity.y = 0; camera.position.y = 2; canJump = true;
        }

        // Selection
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const intersects = raycaster.intersectObjects(blocks);
        if (intersects.length > 0) {
            selectionBox.position.copy(intersects[0].object.position);
            selectionBox.visible = true;
        } else selectionBox.visible = false;

        document.getElementById('pos-display').textContent = `${Math.floor(camera.position.x)}, ${Math.floor(camera.position.y)}, ${Math.floor(camera.position.z)}`;
    }
    renderer.render(scene, camera);
}

function setupUI() {
    document.getElementById('start-btn').onclick = () => document.body.requestPointerLock();
}

window.onload = init;
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
window.toggleCrafting = toggleCrafting;
