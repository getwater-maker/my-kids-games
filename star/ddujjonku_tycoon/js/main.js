// --- GLOBALS ---
let scene, camera, renderer, clock, controls;
let player, pet, floor2;
let money = 1000000; // 1000k starting money
let buttons = [];
let buttonsState = {
    dropper: false,
    collector: false,
    staircase: false,
    floor2: false,
    transform: false
};

let gameState = 'START';
let interactionObj = null;
let drops = [];
let isTransformed = false;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let isSprinting = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();

// --- INITIALIZATION ---
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xaedefc); // Sky Blue
    scene.fog = new THREE.Fog(0xaedefc, 20, 100);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    clock = new THREE.Clock();

    setupLights();
    setupBase();
    setupPlayer();
    setupPet();
    setupButtons();

    // Controls
    controls = new THREE.PointerLockControls(camera, document.body);
    document.getElementById('start-btn').onclick = () => {
        controls.lock();
        gameState = 'PLAYING';
        document.getElementById('start-screen').classList.add('hidden');
    };

    window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyE') handleInteraction();
        if (e.code === 'KeyW') moveForward = true;
        if (e.code === 'KeyS') moveBackward = true;
        if (e.code === 'KeyA') moveLeft = true;
        if (e.code === 'KeyD') moveRight = true;
        if (e.shiftKey) isSprinting = true;
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'KeyW') moveForward = false;
        if (e.code === 'KeyS') moveBackward = false;
        if (e.code === 'KeyA') moveLeft = false;
        if (e.code === 'KeyD') moveRight = false;
        if (!e.shiftKey) isSprinting = false;
    });

    animate();
}

function setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(50, 100, 50);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    scene.add(sun);
}

function setupBase() {
    // Ground
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x3d3d3d });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Tycoon Base Plate
    const baseGeo = new THREE.BoxGeometry(40, 0.5, 40);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.25;
    base.receiveShadow = true;
    scene.add(base);

    // Initial Walls
    createWall(0, 5, -20, 40, 10, 1); // Back wall
}

function createWall(x, y, z, w, h, d, color = 0xecf0f1) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.9 });
    const wall = new THREE.Mesh(geo, mat);
    wall.position.set(x, y, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
    return wall;
}

function setupPlayer() {
    player = new THREE.Group();
    
    // Body
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(1, 2, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x3498db })
    );
    body.position.y = 1;
    body.castShadow = true;
    player.add(body);

    // Head
    const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.8, 0.8),
        new THREE.MeshStandardMaterial({ color: 0xe0e0e0 })
    );
    head.position.y = 2.4;
    player.add(head);

    player.position.set(0, 0.5, 5);
    scene.add(player);
}

function setupPet() {
    pet = new THREE.Group();
    
    // Ddu-Jjon-Ku cookie shape (Pistachio color)
    const cookieGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.4, 16);
    const cookieMat = new THREE.MeshStandardMaterial({ color: 0x93d3a2 }); // Pistachio Green
    const cookie = new THREE.Mesh(cookieGeo, cookieMat);
    cookie.rotation.x = Math.PI / 2;
    cookie.castShadow = true;
    pet.add(cookie);

    // Marshmallow center (White ring)
    const centerGeo = new THREE.TorusGeometry(0.3, 0.1, 8, 16);
    const centerMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const center = new THREE.Mesh(centerGeo, centerMat);
    center.position.z = 0.25;
    pet.add(center);

    pet.position.set(2, 1, 5);
    scene.add(pet);
}

function setupButtons() {
    // Buttons are represented as colored pads on the floor
    createTycoonButton('DROPPER', -10, 0.5, -10, 0x27ae60, 0, () => buildDropper()); 
    createTycoonButton('COLLECTOR', 0, 0.5, -10, 0x2980b9, 100, () => buildCollector());
    createTycoonButton('STAIRCASE', 15, 0.5, 0, 0xe67e22, 500, () => buildStaircase());
}

function createTycoonButton(id, x, y, z, color, cost, callback) {
    const group = new THREE.Group();
    const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5, 1.5, 0.3, 32),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2 })
    );
    group.add(pad);

    const text = document.createElement('div');
    // We'll use distance check for button interaction
    group.id = id;
    group.cost = cost;
    group.callback = callback;
    group.position.set(x, y, z);
    
    scene.add(group);
    buttons.push(group);
}

// --- TYCOON BUILDING ---
function buildDropper() {
    if (buttonsState.dropper) return;
    buttonsState.dropper = true;
    
    // Visual for Dropper
    const pillar = createWall(-10, 6, -15, 2, 12, 2, 0x7f8c8d);
    const nozzle = new THREE.Mesh(
        new THREE.BoxGeometry(2, 1, 2),
        new THREE.MeshStandardMaterial({ color: 0x2c3e50 })
    );
    nozzle.position.set(-10, 11, -15);
    scene.add(nozzle);
    
    setInterval(spawnDrop, 2000);
}

function spawnDrop() {
    const dropGeo = new THREE.SphereGeometry(0.5, 8, 8);
    const dropMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f });
    const drop = new THREE.Mesh(dropGeo, dropMat);
    drop.position.set(-10, 10, -15);
    scene.add(drop);
    drops.push(drop);
}

function buildCollector() {
    if (buttonsState.collector) return;
    buttonsState.collector = true;
    
    const collector = createWall(0, 0.5, -15, 6, 0.6, 6, 0x8e44ad);
    collector.isCollector = true;
}

function buildStaircase() {
    if (buttonsState.staircase) return;
    buttonsState.staircase = true;
    
    for (let i = 0; i < 20; i++) {
        const step = createWall(10, i * 0.5 + 0.5, i * 1, 6, 0.5, 1, 0xd35400);
    }

    // Build 2nd floor platform
    floor2 = createWall(0, 10.25, 10, 40, 0.5, 40, 0x2c3e50);
    createWall(0, 15, 30, 40, 10, 1); // 2F wall

    // Add Transformation Button on 2F
    createTycoonButton('TRANSFORM', 0, 10.5, 15, 0x9b59b6, 1000, () => transformToMan());
}

function transformToMan() {
    if (isTransformed) return;
    
    const overlay = document.getElementById('transform-overlay');
    overlay.classList.remove('hidden');
    
    setTimeout(() => {
        isTransformed = true;
        // Visual Change
        player.scale.set(1.5, 1.5, 1.5);
        // Change body to gold/pistachio mix
        player.children[0].material.color.set(0xf1c40f);
        player.children[1].material.color.set(0x93d3a2);
        
        document.getElementById('pet-info').classList.remove('hidden');
        overlay.classList.add('hidden');
        logCombat("TRANSFORMED INTO DDU-JJON-KU MAN!");
    }, 2000);
}

// --- LOGIC ---
function handleInteraction() {
    if (interactionObj) {
        if (money >= interactionObj.cost) {
            money -= interactionObj.cost;
            interactionObj.callback();
            scene.remove(interactionObj);
            buttons = buttons.filter(b => b !== interactionObj);
            interactionObj = null;
            updateUI();
        } else {
            logCombat("돈이 부족합니다!");
        }
    }
}

function updateUI() {
    document.getElementById('money').textContent = Math.floor(money).toLocaleString();
    if (camera.position.y > 10) {
        document.getElementById('floor').textContent = "2F";
    } else {
        document.getElementById('floor').textContent = "1F";
    }
}

function logCombat(msg) {
    document.getElementById('status-msg').textContent = msg;
}

function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();

    if (gameState === 'PLAYING') {
        updatePlayer(dt);
        updatePhysics(dt);
        updateDrops(dt);
        updatePet(dt);
        checkButtons();
        updateUI();
    }

    renderer.render(scene, camera);
}

function updatePlayer(dt) {
    if (controls.isLocked) {
        const speed = (isTransformed ? 60 : 40) * (isSprinting ? 1.5 : 1);
        
        velocity.x -= velocity.x * 10.0 * dt;
        velocity.z -= velocity.z * 10.0 * dt;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        if (moveForward || moveBackward) velocity.z -= direction.z * speed * dt;
        if (moveLeft || moveRight) velocity.x -= direction.x * speed * dt;

        controls.moveRight(-velocity.x * dt);
        controls.moveForward(-velocity.z * dt);

        player.position.copy(camera.position);
        player.position.y -= 2.5; 
        player.rotation.y = camera.rotation.y;
    }
}

function updatePhysics(dt) {
    // Basic floor level clamp
    if (camera.position.y < 3.5) camera.position.y = 3.5;
}

function updateDrops(dt) {
    for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.position.y -= 0.1; // Fall
        
        // Collector check
        if (d.position.y < 1 && Math.abs(d.position.x) < 3 && Math.abs(d.position.z + 15) < 3) {
            money += 100; // Value per drop
            scene.remove(d);
            drops.splice(i, 1);
        }

        if (d.position.y < -5) {
            scene.remove(d);
            drops.splice(i, 1);
        }
    }
}

function updatePet(dt) {
    // Follow player with offset and bounce
    const time = Date.now() * 0.005;
    const targetPos = player.position.clone().add(new THREE.Vector3(2, 0, 2));
    pet.position.lerp(targetPos, 0.1);
    pet.position.y = 1 + Math.sin(time) * 0.5;
    pet.rotation.y += 0.02;
}

function checkButtons() {
    let found = null;
    buttons.forEach(btn => {
        const d = player.position.distanceTo(btn.position);
        if (d < 3) {
            found = btn;
        }
    });

    if (found) {
        interactionObj = found;
        document.getElementById('interaction-prompt').classList.remove('hidden');
        document.getElementById('interaction-prompt').textContent = `${found.id} 구매 (${found.cost.toLocaleString()} 💰)`;
    } else {
        interactionObj = null;
        document.getElementById('interaction-prompt').classList.add('hidden');
    }
}

init();
