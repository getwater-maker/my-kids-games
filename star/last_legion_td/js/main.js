// GLOBALS: THREE, THREE.OrbitControls

// --- Configuration ---
const GRID_SIZE = 2;
const MAP_WIDTH = 20;
const MAP_HEIGHT = 20;
const PATH = [
    {x: -10, z: -10}, {x: 10, z: -10}, {x: 10, z: 0}, 
    {x: -10, z: 0}, {x: -10, z: 10}, {x: 10, z: 10}
];
const BASE_HP = 20;

const TOWERS = {
    '1': { name: 'SENTRY', cost: 100, range: 6, damage: 10, fireRate: 800, color: 0x2ecc71 },
    '2': { name: 'MISSILE', cost: 250, range: 10, damage: 40, fireRate: 2000, color: 0xff3e3e },
    '3': { name: 'LASER', cost: 500, range: 8, damage: 2, fireRate: 50, color: 0x00d2ff }
};

// --- State ---
let scene, camera, renderer, controls, clock;
let isMobile = false, gameActive = false;
let hp = BASE_HP, gold = 500, wave = 1;
let enemies = [], towers = [], bullets = [];
let selectedTowerType = null;
let placementGhost = null;
let groundMesh = null; // Store reference to ground
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let gridTiles = [];

function init() {
    isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);
    scene.fog = new THREE.FogExp2(0x050512, 0.015);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(20, 30, 20);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2.2;
    controls.minDistance = 10;
    controls.maxDistance = 100;

    clock = new THREE.Clock();

    setupLighting();
    setupMap();
    setupEventListeners();
    updateHUD(); // ✅ Initial HUD update

    animate();
}

function setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(50, 100, 50);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    scene.add(sun);

    // Glowing points
    const p1 = new THREE.PointLight(0x00d2ff, 1, 50);
    p1.position.set(10, 10, 10);
    scene.add(p1);
}

function setupMap() {
    // Ground Grid
    const groundGeo = new THREE.PlaneGeometry(MAP_WIDTH * GRID_SIZE, MAP_HEIGHT * GRID_SIZE);
    const groundMat = new THREE.MeshStandardMaterial({ 
        color: 0x111115, 
        roughness: 0.8, 
        metalness: 0.1 
    });
    ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    groundMesh = ground; // ✅ Save for raycasting

    // Visual Grid Lines
    const gridHelper = new THREE.GridHelper(MAP_WIDTH * GRID_SIZE, MAP_WIDTH, 0x444444, 0x222222);
    gridHelper.position.y = 0.05;
    scene.add(gridHelper);

    // Render Path
    const pathMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    for (let i = 0; i < PATH.length - 1; i++) {
        const start = PATH[i];
        const end = PATH[i+1];
        
        const dx = end.x - start.x;
        const dz = end.z - start.z;
        const len = Math.sqrt(dx*dx + dz*dz) + 1;
        const geo = new THREE.PlaneGeometry(len, 2);
        const mesh = new THREE.Mesh(geo, pathMat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set((start.x + end.x)/2, 0.1, (start.z + end.z)/2);
        if (dz !== 0) mesh.rotation.z = Math.PI / 2;
        scene.add(mesh);
    }
}

function setupEventListeners() {
    window.addEventListener('mousemove', (e) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        updateGhost();
    });

    window.addEventListener('click', (e) => {
        if (!gameActive) return;
        // Don't place tower if clicking on UI
        if (e.target.closest('#hud') || e.target.closest('.tower-btn') || e.target.tagName === 'BUTTON') return;
        if (selectedTowerType) placeTower();
    });

    // Mobile UI Interaction
    document.querySelectorAll('.tower-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.id.split('-')[2];
            selectTower(type);
        });
    });

    document.getElementById('start-btn').addEventListener('click', () => {
        console.log("Game Start Command Received");
        document.getElementById('start-overlay').style.display = 'none'; // Ensure it hides
        document.getElementById('start-overlay').classList.add('hidden');
        gameActive = true;
        startWave();
        updateHUD();
    });

    document.getElementById('btn-confirm').onclick = () => {
        if (selectedTowerType) placeTower();
    };

    document.getElementById('btn-cancel').onclick = () => {
        cancelPlacement();
    };
}

function selectTower(type) {
    if (gold < TOWERS[type].cost) {
        showNotif("LOW RESOURCES: NEED MORE GOLD");
        return;
    }
    
    selectedTowerType = type;
    document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-tower-${type}`).classList.add('active');

    if (placementGhost) scene.remove(placementGhost);
    
    // Create Ghost Tower
    const geo = new THREE.BoxGeometry(1.2, 2.5, 1.2);
    const mat = new THREE.MeshBasicMaterial({ 
        color: TOWERS[type].color, 
        transparent: true, 
        opacity: 0.5 
    });
    placementGhost = new THREE.Mesh(geo, mat);
    scene.add(placementGhost);

    if (isMobile) document.getElementById('mobile-controls').classList.remove('hidden');
}

function updateGhost() {
    if (!placementGhost || !groundMesh) return;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(groundMesh); // Only intersect with ground!
    
    if (intersects.length > 0) {
        const hit = intersects[0];
        const gx = Math.round(hit.point.x / GRID_SIZE) * GRID_SIZE;
        const gz = Math.round(hit.point.z / GRID_SIZE) * GRID_SIZE;
        placementGhost.position.set(gx, 1.25, gz);
        
        // VISUAL FEEDBACK: Change color if invalid (on path)
        const onPath = isOnPath(gx, gz);
        placementGhost.material.color.setHex(onPath ? 0xff0000 : TOWERS[selectedTowerType].color);
    }
}

function isOnPath(x, z) {
    for (let i = 0; i < PATH.length - 1; i++) {
        const s = PATH[i];
        const e = PATH[i+1];
        const minX = Math.min(s.x, e.x) - 1.5;
        const maxX = Math.max(s.x, e.x) + 1.5;
        const minZ = Math.min(s.z, e.z) - 1.5;
        const maxZ = Math.max(s.z, e.z) + 1.5;
        if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) return true;
    }
    return false;
}

function placeTower() {
    if (!placementGhost) return;
    const px = placementGhost.position.x;
    const pz = placementGhost.position.z;

    const type = selectedTowerType;
    const towerData = TOWERS[type];

    if (gold < towerData.cost) {
        showNotif("LOW GOLD");
        return;
    }

    // Check collision with path
    if (isOnPath(px, pz)) {
        showNotif("INVALID SITE: CANNOT BUILD ON PATH");
        return;
    }

    if (towers.some(t => t.mesh.position.x === px && t.mesh.position.z === pz)) {
        showNotif("SITE REJECTED: AREA OCCUPIED");
        return;
    }

    // Create High-Quality Tower
    const mesh = createTowerMesh(towerData);
    mesh.position.set(px, 0, pz);
    scene.add(mesh);

    towers.push({
        mesh: mesh,
        type: type,
        range: towerData.range,
        damage: towerData.damage,
        fireRate: towerData.fireRate,
        lastFire: 0
    });

    gold -= towerData.cost;
    updateHUD();
    
    if (!isMobile) cancelPlacement(); // Reset after placing on PC
}

function createTowerMesh(data) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.2 });
    const accentMat = new THREE.MeshStandardMaterial({ color: data.color, emissive: data.color, emissiveIntensity: 1 });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 0.5), mat);
    base.position.y = 0.25;
    group.add(base);

    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.5, 0.6), mat);
    pillar.position.y = 1.25;
    group.add(pillar);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 16), accentMat);
    head.position.y = 2;
    group.add(head);

    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 1), mat);
    barrel.position.y = 2;
    barrel.position.z = 0.5;
    group.add(barrel);

    return group;
}

function cancelPlacement() {
    selectedTowerType = null;
    if (placementGhost) {
        scene.remove(placementGhost);
        placementGhost = null;
    }
    document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('mobile-controls').classList.add('hidden');
}

function spawnEnemy() {
    const mesh = createEnemyMesh();
    mesh.position.set(PATH[0].x, 0, PATH[0].z);
    scene.add(mesh);

    enemies.push({
        mesh: mesh,
        hp: 150 + (wave * 10), // ✅ Start at 150 HP as requested
        maxHp: 150 + (wave * 10),
        speed: 0.05 + (wave * 0.005),
        pathIndex: 0
    });
}

function createEnemyMesh() {
    const group = new THREE.Group();
    const geo = new THREE.CylinderGeometry(0.3, 0.3, 0.8, 16);
    const mat = new THREE.MeshStandardMaterial({ color: 0xff4d4d, emissive: 0xff4d4d, emissiveIntensity: 0.5 });
    const body = new THREE.Mesh(geo, mat);
    body.position.y = 0.6;
    group.add(body);

    const hpBar = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 0.1),
        new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    hpBar.position.y = 1.6;
    group.add(hpBar);
    group.userData.hpBar = hpBar;

    return group;
}

function startWave() {
    let count = 0;
    const interval = setInterval(() => {
        if (!gameActive) { clearInterval(interval); return; }
        spawnEnemy();
        count++;
        if (count >= wave * 5) {
            clearInterval(interval);
            setTimeout(() => { 
                if (gameActive) { 
                    wave++; 
                    gold += 500; // ✅ Wave Clear Bonus as requested
                    updateHUD(); 
                    showNotif("MISSION UPDATED: +500 BATTLE BONUS");
                    startWave(); 
                }
            }, 10000);
        }
    }, 1500);
}

function updateHUD() {
    document.getElementById('curr-hp').textContent = hp;
    document.getElementById('hp-bar-fill').style.width = (hp / BASE_HP * 100) + '%';
    document.getElementById('gold-value').textContent = Math.floor(gold);
    document.getElementById('wave-text').textContent = `WAVE ${wave}`;
}

function showNotif(msg) {
    const container = document.getElementById('notif-center');
    const n = document.createElement('div');
    n.className = 'notif';
    n.textContent = msg;
    container.appendChild(n);
    setTimeout(() => n.remove(), 2000);
}

function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    
    if (gameActive) {
        updateEnemies(dt);
        updateTowers(dt);
        updateBullets(dt);
    }

    controls.update();
    renderer.render(scene, camera);
}

function updateEnemies(dt) {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const en = enemies[i];
        const target = PATH[en.pathIndex + 1];
        if (!target) {
            // Reached Base
            hp--;
            updateHUD();
            scene.remove(en.mesh);
            enemies.splice(i, 1);
            if (hp <= 0) { gameActive = false; document.getElementById('game-over-overlay').classList.remove('hidden'); }
            continue;
        }

        const moveDir = new THREE.Vector3(target.x - en.mesh.position.x, 0, target.z - en.mesh.position.z);
        const dist = moveDir.length();
        if (dist < 0.2) {
            en.pathIndex++;
        } else {
            en.mesh.position.add(moveDir.normalize().multiplyScalar(en.speed));
            en.mesh.lookAt(target.x, 0, target.z);
        }
    }
}

function updateTowers(dt) {
    const now = Date.now();
    towers.forEach(t => {
        // Find nearest enemy in range
        let nearest = null;
        let minDist = Infinity;

        enemies.forEach(en => {
            const d = t.mesh.position.distanceTo(en.mesh.position);
            if (d < t.range && d < minDist) {
                minDist = d;
                nearest = en;
            }
        });

        if (nearest && now - t.lastFire > t.fireRate) {
            t.mesh.lookAt(nearest.mesh.position.x, 0, nearest.mesh.position.z);
            spawnBullet(t, nearest);
            t.lastFire = now;
        }
    });
}

function spawnBullet(tower, target) {
    const bullet = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    bullet.position.copy(tower.mesh.position).y += 2;
    scene.add(bullet);
    
    bullets.push({
        mesh: bullet,
        target: target,
        speed: 0.5,
        damage: tower.damage,
        type: tower.type
    });
}

function updateBullets(dt) {
    bullets.forEach((b, i) => {
        if (!enemies.includes(b.target)) {
            scene.remove(b.mesh);
            bullets.splice(i, 1);
            return;
        }

        const dir = new THREE.Vector3().subVectors(b.target.mesh.position, b.mesh.position).setY(0);
        b.mesh.position.add(dir.normalize().multiplyScalar(b.speed));

        if (b.mesh.position.distanceTo(b.target.mesh.position) < 1.0) {
            // Hit!
            b.target.hp -= b.damage;
            const healthRatio = Math.max(0, b.target.hp / b.target.maxHp);
            b.target.mesh.userData.hpBar.scale.x = healthRatio;
            
            if (b.target.hp <= 0) {
                scene.remove(b.target.mesh);
                enemies = enemies.filter(e => e !== b.target);
                gold += 100; // ✅ Reward increased as requested
                updateHUD();
                showNotif("+100 GOLD: ENEMY ELIMINATED");
            }

            scene.remove(b.mesh);
            bullets.splice(i, 1);
        }
    });
}

init();
