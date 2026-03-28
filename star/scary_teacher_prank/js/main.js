// GLOBALS: THREE
let scene, camera, renderer, clock;
let player, teacher;
let isGameOver = false;
let prankCount = 0;
let inventory = null;
let detectionPercent = 0;
let gameState = 'START'; // START, PLAYING, PRANKED, CAUGHT, WIN

let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let obstacles = [];
let interactiveItems = [];
let prankSpots = [];
let particles = []; // For fire effects
let gameCutsceneCamera;

// MISSIONS
const MISSIONS = [
    { text: "1. 끈적한 풀 아이템을 찾아 교탁에 바르세요!", itemId: "GLUE", itemName: "풀", spotId: "DESK" },
    { text: "2. 매운 고춧가루를 찾아 선생님의 커피잔에 넣으세요!", itemId: "PEPPER", itemName: "고춧가루", spotId: "COFFEE" },
    { text: "3. 잉크 아이템을 찾아 선생님의 의자에 뿌리세요!", itemId: "INK", itemName: "잉크", spotId: "CHAIR" }
];

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 10, 60);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 15, 12);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // High-definition
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container').appendChild(renderer.domElement);

    clock = new THREE.Clock();

    setupLighting();
    setupRoom();
    setupPlayer();
    setupTeacher();
    updateMissionUI();
    spawnNextMissionItem();
    setupPrankSpots();
    setupEventListeners();

    // Create cutscene camera
    gameCutsceneCamera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    animate();
}

function setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);
    const point = new THREE.PointLight(0xffffff, 0.8, 100);
    point.position.set(0, 10, 0);
    point.castShadow = true;
    scene.add(point);
}

function setupRoom() {
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(50, 50),
        new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x444466 });
    const w1 = new THREE.Mesh(new THREE.BoxGeometry(50, 10, 1), wallMat);
    w1.position.set(0, 5, -25);
    scene.add(w1);
}

function setupPlayer() {
    player = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.8, 16), new THREE.MeshStandardMaterial({ color: 0x0077ff }));
    body.position.y = 0.9;
    body.castShadow = true;
    player.add(body);
    player.position.set(-15, 0, 15);
    scene.add(player);
}

function setupTeacher() {
    teacher = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 2, 16), new THREE.MeshStandardMaterial({ color: 0xe74c3c }));
    body.position.y = 1;
    body.castShadow = true;
    teacher.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 16), new THREE.MeshStandardMaterial({ color: 0xffdbac }));
    head.position.y = 2.2;
    teacher.add(head);

    const vision = new THREE.Mesh(
        new THREE.ConeGeometry(5, 12, 16),
        new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.15 })
    );
    vision.rotation.x = -Math.PI / 2;
    vision.position.z = 6;
    teacher.add(vision);

    teacher.userData = {
        path: [[10, 10], [-10, 10], [-10, -10], [10, -10]],
        currentPathIdx: 0,
        speed: 0.04,
        prankedTime: 0
    };
    scene.add(teacher);
}

function setupPrankSpots() {
    // DESK
    const desk = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 2), new THREE.MeshStandardMaterial({ color: 0x5d4037 }));
    desk.position.set(0, 0.75, -8);
    desk.userData = { spotId: "DESK" };
    scene.add(desk);
    prankSpots.push(desk);

    // COFFEE (on desk)
    const coffee = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.4), new THREE.MeshStandardMaterial({ color: 0xdddddd }));
    coffee.position.set(0, 1.7, -8);
    coffee.userData = { spotId: "COFFEE" };
    scene.add(coffee);
    prankSpots.push(coffee);

    // CHAIR
    const chair = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1, 1.2), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    chair.position.set(0, 0.5, -10);
    chair.userData = { spotId: "CHAIR" };
    scene.add(chair);
    prankSpots.push(chair);
}

function updateMissionUI() {
    const m = MISSIONS[prankCount];
    if (m) document.getElementById('mission-text').textContent = m.text;
}

function spawnNextMissionItem() {
    const m = MISSIONS[prankCount];
    if (!m) return;

    const item = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 0.5),
        new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00, emissiveIntensity: 0.5 })
    );
    item.position.set((Math.random() - 0.5) * 30, 0.25, (Math.random() - 0.5) * 30);
    item.userData = { itemId: m.itemId, itemName: m.itemName };
    scene.add(item);
    interactiveItems.push(item);
}

function setupEventListeners() {
    window.onclick = () => { if(gameState === 'START') { gameState = 'PLAYING'; document.getElementById('overlay').classList.add('hidden'); } };
    document.getElementById('start-btn').onclick = () => { gameState = 'PLAYING'; document.getElementById('overlay').classList.add('hidden'); };
    
    window.onkeydown = (e) => {
        if (e.code === 'KeyW') moveForward = true;
        if (e.code === 'KeyS') moveBackward = true;
        if (e.code === 'KeyA') moveLeft = true;
        if (e.code === 'KeyD') moveRight = true;
        if (e.code === 'KeyE') handleInteract();
    };
    window.onkeyup = (e) => {
        if (e.code === 'KeyW') moveForward = false;
        if (e.code === 'KeyS') moveBackward = false;
        if (e.code === 'KeyA') moveLeft = false;
        if (e.code === 'KeyD') moveRight = false;
    };
    document.getElementById('retry-btn').onclick = () => location.reload();
    document.getElementById('win-retry-btn').onclick = () => location.reload();
}

function handleInteract() {
    if (gameState !== 'PLAYING') return;

    // Pick up item
    for (let i = interactiveItems.length - 1; i >= 0; i--) {
        const item = interactiveItems[i];
        if (player.position.distanceTo(item.position) < 2) {
            inventory = item.userData;
            document.getElementById('current-item').textContent = inventory.itemName;
            scene.remove(item);
            interactiveItems.splice(i, 1);
            showPopMessage("아이템을 획득했습니다!");
            return;
        }
    }

    // Prank spot
    const m = MISSIONS[prankCount];
    if (!inventory || !m) return;

    for (let spot of prankSpots) {
        if (player.position.distanceTo(spot.position) < 2.5 && spot.userData.spotId === m.spotId) {
            if (inventory.itemId === m.itemId) {
                applyPrank();
            }
        }
    }
}

function applyPrank() {
    const m = MISSIONS[prankCount];
    prankCount++;
    inventory = null;
    document.getElementById('current-item').textContent = "없음";
    document.getElementById('prank-val').textContent = prankCount;

    // TRIGGER REACTION CUTSCENE
    gameState = 'CUTSCENE';
    document.getElementById('prank-cutscene').classList.remove('hidden');
    
    // Set reaction text based on prank
    const texts = [
        "으아악! 교탁이 왜 이렇게 끈적해!!?? 👋😱",
        "너무 매워!! 입에서 불이 나!! 컵이 안 떨어져!! ☕🔥😱",
        "내 바지가 잉크투성이가 됐잖아!! 안돼!! 👖😡"
    ];
    document.getElementById('reaction-text').textContent = texts[prankCount-1];

    // Position Cutscene Camera closer and lower for better view
    if (m.spotId === "COFFEE") {
        gameCutsceneCamera.position.set(0, 3, -6); // Focus on face for fire breathing
    } else {
        gameCutsceneCamera.position.set(teacher.position.x + 3, 2, teacher.position.z + 5);
    }
    gameCutsceneCamera.lookAt(teacher.position.x, 2, teacher.position.z);

    // Reaction Type
    teacher.userData.activePrank = m.spotId;

    // If coffee prank, attach coffee to teacher head
    if (m.spotId === "COFFEE") {
        const coffeeObj = scene.getObjectByProperty('spotId', 'COFFEE');
        if (coffeeObj) {
            teacher.add(coffeeObj);
            coffeeObj.position.set(0, 2.3, 0.4);
            coffeeObj.rotation.set(-Math.PI/2, 0, 0);
        }
    }

    // Teacher reaction animation
    teacher.userData.prankedTime = Date.now();
    teacher.children[0].material.color.set(0xe67e22); // Turn orange in rage

    setTimeout(() => {
        document.getElementById('prank-cutscene').classList.add('hidden');
        if (prankCount >= 3) {
            gameState = 'WIN';
            document.getElementById('win-overlay').classList.remove('hidden');
        } else {
            gameState = 'PLAYING';
            updateMissionUI();
            spawnNextMissionItem();
            teacher.children[0].material.color.set(0xe74c3c); // Back to normal
        }
    }, 6000);
}

function showPopMessage(text) {
    const m = document.createElement('div');
    m.style.position = 'absolute';
    m.style.top = '50%'; m.style.left = '50%';
    m.style.transform = 'translate(-50%, -50%)';
    m.style.background = 'rgba(0,0,0,0.8)';
    m.style.color = 'white'; m.style.padding = '20px';
    m.style.borderRadius = '10px'; m.style.zIndex = '5000';
    m.textContent = text;
    document.body.appendChild(m);
    setTimeout(() => m.remove(), 1500);
}

function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();

    if (gameState === 'PLAYING') {
        updatePlayer();
        updateAI(dt);
        checkDetection();
        renderer.render(scene, camera);
    } else if (gameState === 'CUTSCENE') {
        const type = teacher.userData.activePrank;
        
        if (type === "DESK") {
            // STRUGGLING: Stuck to desk, shaking left and right
            teacher.rotation.z = Math.sin(Date.now() * 0.05) * 0.3;
            teacher.position.y = 1;
        } else if (type === "COFFEE") {
            // FIRE BREATHING + PANIC
            teacher.rotation.x = -0.5 + Math.sin(Date.now() * 0.08) * 0.2;
            teacher.rotation.y = Math.sin(Date.now() * 0.1) * 0.1;
            teacher.position.y = 1 + Math.sin(Date.now() * 0.02) * 0.1;
            
            // Create fire particles
            if (Math.random() > 0.3) {
                const fire = new THREE.Mesh(
                    new THREE.SphereGeometry(0.2, 8, 8),
                    new THREE.MeshBasicMaterial({ color: 0xff4500, transparent: true, opacity: 0.8 })
                );
                fire.position.set(0, 2.3, 0.5);
                teacher.add(fire);
                const fireV = new THREE.Vector3((Math.random()-0.5)*0.1, (Math.random())*0.2, 0.5);
                particles.push({ mesh: fire, velocity: fireV, life: 1.0 });
            }
        } else if (type === "CHAIR") {
            // SHOCK: Jumping and looking at pants
            teacher.position.y = 1 + Math.abs(Math.sin(Date.now() * 0.02)) * 0.6;
            teacher.rotation.x = 0.5; // Look down
        }

        // Update Particles (Fire Breathing)
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.mesh.position.add(p.velocity);
            p.mesh.scale.multiplyScalar(0.96);
            p.life -= 0.02;
            if (p.life <= 0) {
                if (p.mesh.parent) p.mesh.parent.remove(p.mesh);
                particles.splice(i, 1);
            }
        }

        renderer.render(scene, gameCutsceneCamera);
    } else {
        renderer.render(scene, camera);
    }
}

function updatePlayer() {
    const speed = 0.12;
    if (moveForward) player.position.z -= speed;
    if (moveBackward) player.position.z += speed;
    if (moveLeft) player.position.x -= speed;
    if (moveRight) player.position.x += speed;

    camera.position.x += (player.position.x - camera.position.x) * 0.1;
    camera.position.z += (player.position.z + 15 - camera.position.z) * 0.1;
}

function updateAI(dt) {
    const ai = teacher.userData;

    teacher.position.y = 1;
    const target = new THREE.Vector3(ai.path[ai.currentPathIdx][0], 0, ai.path[ai.currentPathIdx][1]);
    const dir = target.clone().sub(teacher.position).normalize();
    teacher.position.add(dir.multiplyScalar(ai.speed));
    teacher.lookAt(target.x, 0, target.z);

    if (teacher.position.distanceTo(target) < 0.5) {
        ai.currentPathIdx = (ai.currentPathIdx + 1) % ai.path.length;
    }
}

function checkDetection() {
    const dir = new THREE.Vector3(0,0,1).applyQuaternion(teacher.quaternion);
    const toPlayer = player.position.clone().sub(teacher.position).normalize();
    const angle = dir.angleTo(toPlayer);
    const dist = teacher.position.distanceTo(player.position);

    if (angle < Math.PI/4 && dist < 12) {
        detectionPercent += 0.8;
    } else {
        detectionPercent = Math.max(0, detectionPercent - 0.4);
    }

    document.getElementById('meter-fill').style.width = detectionPercent + '%';
    if (detectionPercent >= 100) {
        gameState = 'CAUGHT';
        document.getElementById('caught-overlay').classList.remove('hidden');
    }
}

init();
