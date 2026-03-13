// star/roblox_classic/js/main.js

const CONFIG = {
    walkSpeed: 16.0,
    jumpPower: 50.0,
    gravity: 196.2, // Classic Roblox gravity
    baseplateSize: 2048,
    studSize: 4 // Roblox units per stud? 1 meter is roughly 3.5-4 studs
};

let scene, camera, renderer, clock, controls;
let gameState = 'START';
let player, playerModel, playerParts = {};
let platforms = [];
let buildables = [];
let currentTool = 'MOVE'; // MOVE, BUILD, DELETE
let chatHistory = [];

const keys = {};
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xA5C9FF); // Classic Sky Blue
    scene.fog = new THREE.Fog(0xA5C9FF, 100, 1000);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.set(20, 20, 20);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container').appendChild(renderer.domElement);

    clock = new THREE.Clock();

    setupLights();
    createBaseplate();
    createPlayer();
    setupUI();

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (e.code === 'Digit1') setTool('MOVE');
        if (e.code === 'Digit2') setTool('BUILD');
        if (e.code === 'Digit3') setTool('DELETE');
        if (e.code === 'Slash') focusChat();
    });
    window.addEventListener('keyup', (e) => keys[e.code] = false);

    // Core game loop
    animate();
}

function setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(100, 200, 100);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 4096;
    sun.shadow.mapSize.height = 4096;
    sun.shadow.camera.left = -500;
    sun.shadow.camera.right = 500;
    sun.shadow.camera.top = 500;
    sun.shadow.camera.bottom = -500;
    scene.add(sun);
}

function createBaseplate() {
    // The iconic 2048x2048 Dark Green baseplate with studs
    const size = CONFIG.baseplateSize;
    const geometry = new THREE.BoxGeometry(size, 2, size);
    const material = new THREE.MeshPhongMaterial({ color: 0x1A471C }); // Brightish Dark Green

    const baseplate = new THREE.Mesh(geometry, material);
    baseplate.position.y = -1;
    baseplate.receiveShadow = true;
    scene.add(baseplate);
    platforms.push(baseplate);

    // Grid Visual (Studs)
    const grid = new THREE.GridHelper(size, size / 4, 0x000000, 0x000000);
    grid.material.opacity = 0.1;
    grid.material.transparent = true;
    scene.add(grid);
}

function createPlayer() {
    // Classic R6 Roblox Noob
    player = new THREE.Group();
    playerModel = new THREE.Group();

    // Colors
    const brightYellow = 0xF5CD30;
    const brightBlue = 0x0D69AB;
    const brightGreen = 0x4B974B;

    // Torso
    const torso = createPart(2, 2, 1, brightBlue);
    torso.position.y = 3;
    playerModel.add(torso);
    playerParts.torso = torso;

    // Head
    const head = createPart(1.2, 1.2, 1.2, brightYellow);
    head.position.y = 4.6;
    playerModel.add(head);
    playerParts.head = head;

    // Left Arm
    const lArm = createPart(1, 2, 1, brightYellow);
    lArm.position.set(-1.5, 3, 0);
    playerModel.add(lArm);

    // Right Arm
    const rArm = createPart(1, 2, 1, brightYellow);
    rArm.position.set(1.5, 3, 0);
    playerModel.add(rArm);

    // Left Leg
    const lLeg = createPart(1, 2, 1, brightGreen);
    lLeg.position.set(-0.5, 1, 0);
    playerModel.add(lLeg);

    // Right Leg
    const rLeg = createPart(1, 2, 1, brightGreen);
    rLeg.position.set(0.5, 1, 0);
    playerModel.add(rLeg);

    player.add(playerModel);
    scene.add(player);
}

function createPart(w, h, d, color) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshPhongMaterial({ color: color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

function setupUI() {
    const startBtn = document.getElementById('start-btn');
    startBtn.onclick = () => {
        document.getElementById('overlay').classList.add('hidden');
        gameState = 'PLAYING';

        // 3rd person camera setup
        controls = new THREE.PointerLockControls(camera, document.body);
        document.body.onclick = () => {
            if (gameState === 'PLAYING') controls.lock();
        };
    };

    const chatInput = document.getElementById('chat-input');
    chatInput.onkeydown = (e) => {
        if (e.key === 'Enter' && chatInput.value.trim() !== '') {
            addChatMessage('Player', chatInput.value);
            chatInput.value = '';
            chatInput.blur();
            controls.lock();
        }
    };
}

function focusChat() {
    document.getElementById('chat-input').focus();
    controls.unlock();
}

function addChatMessage(user, msg) {
    const box = document.getElementById('chat-box');
    const msgEl = document.createElement('div');
    msgEl.innerHTML = `<b>[${user}]:</b> ${msg}`;
    box.appendChild(msgEl);
    box.scrollTop = box.scrollHeight;
}

function setTool(tool) {
    currentTool = tool;
    document.querySelectorAll('.sidebar-item').forEach(btn => btn.classList.remove('active'));
    if (tool === 'MOVE') document.querySelector('.sidebar-item:nth-child(1)').classList.add('active');
    if (tool === 'BUILD') document.getElementById('build-tool').classList.add('active');
    if (tool === 'DELETE') document.getElementById('delete-tool').classList.add('active');
}

function handleInteractions() {
    if (!keys['Mouse0']) return; // Only on click

    // Raycasting for building/deleting
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(0, 0); // Center screen raycast
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(platforms.concat(buildables));

    if (intersects.length > 0) {
        const hit = intersects[0];

        if (currentTool === 'BUILD') {
            spawnPart(hit.point.clone().add(hit.face.normal.multiplyScalar(2)));
        } else if (currentTool === 'DELETE') {
            if (buildables.includes(hit.object)) {
                scene.remove(hit.object);
                buildables = buildables.filter(o => o !== hit.object);
            }
        }
    }
    keys['Mouse0'] = false; // Consume click
}

window.addEventListener('mousedown', () => keys['Mouse0'] = true);

function spawnPart(pos) {
    // Snap to grid (Roblox style)
    const snapX = Math.round(pos.x / 4) * 4;
    const snapZ = Math.round(pos.z / 4) * 4;
    const snapY = Math.round(pos.y / 2) * 2;

    const geo = new THREE.BoxGeometry(4, 4, 4);
    const mat = new THREE.MeshPhongMaterial({ color: Math.random() * 0xffffff });
    const part = new THREE.Mesh(geo, mat);
    part.position.set(snapX, snapY + 1, snapZ);
    part.castShadow = true;
    part.receiveShadow = true;
    scene.add(part);
    buildables.push(part);
}

function updateMovement(delta) {
    if (gameState !== 'PLAYING') return;

    // Gravity
    velocity.y -= CONFIG.gravity * delta;

    const speed = CONFIG.walkSpeed;

    direction.z = Number(keys['KeyW']) - Number(keys['KeyS']);
    direction.x = Number(keys['KeyA']) - Number(keys['KeyD']);
    direction.normalize();

    // Movement relative to camera view
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    camDir.y = 0;
    camDir.normalize();

    const camRight = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), camDir).normalize();

    const moveDir = new THREE.Vector3();
    moveDir.addScaledVector(camDir, direction.z);
    moveDir.addScaledVector(camRight, -direction.x);
    moveDir.normalize();

    if (direction.z !== 0 || direction.x !== 0) {
        player.position.addScaledVector(moveDir, speed * delta);
        // Look in move direction
        playerModel.lookAt(player.position.x + moveDir.x, player.position.y, player.position.z + moveDir.z);
    }

    // Jump
    if (keys['Space'] && player.position.y <= 0.1) {
        velocity.y = CONFIG.jumpPower;
    }

    player.position.y += velocity.y * delta;

    // Floor collision
    if (player.position.y < 0) {
        player.position.y = 0;
        velocity.y = 0;
    }

    // 3rd Person Camera Follow
    const relativeCameraOffset = new THREE.Vector3(0, 6, 15);
    const cameraOffset = relativeCameraOffset.applyMatrix4(playerModel.matrixWorld);
    camera.position.lerp(cameraOffset, 0.1);
    camera.lookAt(player.position.x, player.position.y + 4, player.position.z);

    handleInteractions();
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (gameState === 'PLAYING') {
        updateMovement(delta);
    }

    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

init();
