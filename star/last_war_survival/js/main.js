// star/last_war_survival/js/main.js

const CONFIG = {
    forwardSpeed: 25.0,
    lerpSpeed: 10.0,
    roadWidth: 20.0,
    roadLength: 1000.0,
    maxSquadSize: 200,
};

let scene, camera, renderer, clock;
let gameState = 'START';
let squad = [];
let roadParts = [];
let gates = [];
let zombies = [];
let playerPos = new THREE.Vector3(0, 0, 0);
let targetX = 0;
let squadCount = 1;

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x34495e);
    scene.fog = new THREE.Fog(0x34495e, 50, 200);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 15, 25);
    camera.lookAt(0, 5, -10);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    clock = new THREE.Clock();

    setupLights();
    createRoad();
    spawnSquad(1);

    setupEventListeners();
    animate();
}

function setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(20, 50, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    scene.add(sun);
}

function createRoad() {
    // A long road with checkered pattern
    const geometry = new THREE.PlaneGeometry(CONFIG.roadWidth, CONFIG.roadLength);
    const material = new THREE.MeshPhongMaterial({
        color: 0x2c3e50,
        side: THREE.DoubleSide
    });
    const road = new THREE.Mesh(geometry, material);
    road.rotation.x = -Math.PI / 2;
    road.position.z = -CONFIG.roadLength / 2 + 10;
    road.receiveShadow = true;
    scene.add(road);

    // Add some floor markers
    for (let i = 0; i < 50; i++) {
        const marker = new THREE.Mesh(
            new THREE.PlaneGeometry(CONFIG.roadWidth, 0.5),
            new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1 })
        );
        marker.rotation.x = -Math.PI / 2;
        marker.position.set(0, 0.01, -i * 20);
        scene.add(marker);
    }

    // Spawn Gates intermittently
    for (let i = 1; i < 15; i++) {
        spawnGatePair(-i * 60);
    }

    // Spawn Zombie Groups
    for (let i = 1; i < 15; i++) {
        spawnZombieGroup(-i * 60 - 30);
    }
}

function spawnGatePair(z) {
    const types = ['ADD', 'MULT'];
    const leftVal = types[Math.floor(Math.random() * 2)] === 'ADD' ? Math.floor(Math.random() * 10) + 5 : Math.floor(Math.random() * 3) + 2;
    const rightVal = types[Math.floor(Math.random() * 2)] === 'ADD' ? Math.floor(Math.random() * 10) + 5 : Math.floor(Math.random() * 3) + 2;

    createGate(-5, z, leftVal > 5 ? 'MULT' : 'ADD', leftVal);
    createGate(5, z, rightVal > 5 ? 'ADD' : 'MULT', rightVal);
}

function createGate(x, z, type, value) {
    const group = new THREE.Group();
    const color = type === 'ADD' ? 0x2ecc71 : 0x3498db;

    const frame = new THREE.Mesh(
        new THREE.BoxGeometry(8, 10, 0.5),
        new THREE.MeshPhongMaterial({ color: color, transparent: true, opacity: 0.4 })
    );
    group.add(frame);

    // Text replacement with simple 3D shapes for value
    const marker = new THREE.Mesh(
        new THREE.SphereGeometry(1.5),
        new THREE.MeshPhongMaterial({ color: 0xffffff })
    );
    marker.position.y = 2;
    group.add(marker);

    group.position.set(x, 5, z);
    group.gateData = { type, value };
    gates.push(group);
    scene.add(group);
}

function spawnZombieGroup(z) {
    const count = Math.floor(Math.random() * 10) + 5;
    for (let i = 0; i < count; i++) {
        const zombie = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 2.5, 1.2),
            new THREE.MeshPhongMaterial({ color: 0x95a5a6 })
        );
        zombie.position.set((Math.random() - 0.5) * 15, 1.25, z + (Math.random() - 0.5) * 5);
        zombie.isZombie = true;
        zombies.push(zombie);
        scene.add(zombie);
    }
}

function spawnSquad(count) {
    const diff = count - squad.length;
    if (diff > 0) {
        for (let i = 0; i < diff; i++) {
            const soldier = new THREE.Mesh(
                new THREE.CylinderGeometry(0.4, 0.4, 1.8),
                new THREE.MeshPhongMaterial({ color: 0x27ae60 })
            );
            soldier.position.y = 0.9;
            scene.add(soldier);
            squad.push(soldier);
        }
    } else if (diff < 0) {
        for (let i = 0; i < Math.abs(diff); i++) {
            const s = squad.pop();
            scene.remove(s);
        }
    }
    squadCount = squad.length;
    document.getElementById('count-num').textContent = squadCount;
}

function setupEventListeners() {
    window.addEventListener('mousemove', (e) => {
        if (gameState !== 'PLAYING') return;
        targetX = ((e.clientX / window.innerWidth) - 0.5) * CONFIG.roadWidth;
    });

    window.addEventListener('touchmove', (e) => {
        if (gameState !== 'PLAYING') return;
        targetX = ((e.touches[0].clientX / window.innerWidth) - 0.5) * CONFIG.roadWidth;
    });

    document.getElementById('start-btn').onclick = () => {
        document.getElementById('overlay').classList.add('hidden');
        document.getElementById('hud').classList.remove('hidden');
        gameState = 'PLAYING';
    };
}

function updateSquadFormation(delta) {
    playerPos.x = THREE.MathUtils.lerp(playerPos.x, targetX, CONFIG.lerpSpeed * delta);
    playerPos.z -= CONFIG.forwardSpeed * delta;

    camera.position.z = playerPos.z + 25;
    camera.position.x = playerPos.x * 0.5;

    // Arrange squad in a circle/group around playerPos
    squad.forEach((soldier, i) => {
        const angle = (i / squad.length) * Math.PI * 2;
        const radius = Math.sqrt(i) * 0.8;
        const tx = playerPos.x + Math.cos(angle) * radius;
        const tz = playerPos.z + Math.sin(angle) * radius;

        soldier.position.x = THREE.MathUtils.lerp(soldier.position.x, tx, 15 * delta);
        soldier.position.z = THREE.MathUtils.lerp(soldier.position.z, tz, 15 * delta);
    });
}

function checkCollisions() {
    // Gate Collisions
    gates.forEach((gate, index) => {
        if (Math.abs(playerPos.z - gate.position.z) < 2 && Math.abs(playerPos.x - gate.position.x) < 4) {
            const data = gate.gateData;
            if (data.type === 'ADD') spawnSquad(Math.min(CONFIG.maxSquadSize, squadCount + data.value));
            else spawnSquad(Math.min(CONFIG.maxSquadSize, squadCount * data.value));

            // Remove the pair of gates
            const z = gate.position.z;
            gates = gates.filter(g => {
                if (Math.abs(g.position.z - z) < 1) {
                    scene.remove(g);
                    return false;
                }
                return true;
            });
        }
    });

    // Zombie Collisions
    zombies.forEach((zombie, index) => {
        const dist = playerPos.distanceTo(zombie.position);
        if (dist < 3) {
            spawnSquad(Math.max(0, squadCount - 1));
            scene.remove(zombie);
            zombies.splice(index, 1);

            if (squadCount <= 0) triggerGameOver();
        }
    });

    // Check Win
    if (playerPos.z < -900) triggerWin();
}

function triggerGameOver() {
    gameState = 'GAMEOVER';
    document.getElementById('game-over').classList.remove('hidden');
}

function triggerWin() {
    gameState = 'WIN';
    document.getElementById('win-screen').classList.remove('hidden');
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (gameState === 'PLAYING') {
        updateSquadFormation(delta);
        checkCollisions();

        const progress = Math.abs(playerPos.z) / 900;
        document.getElementById('distance-fill').style.width = `${Math.min(100, progress * 100)}%`;
    }

    renderer.render(scene, camera);
}

init();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
