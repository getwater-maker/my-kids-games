import * as THREE from 'three';

// --- Configuration ---
const INITIAL_HOLE_RADIUS = 1.0;
const WORLD_SIZE = 100;
const GAME_DURATION = 120; // 2 minutes

// --- State Variables ---
let scene, camera, renderer, raycaster;
let hole;
let holeRadius = INITIAL_HOLE_RADIUS;
let score = 0;
let timeRemaining = GAME_DURATION;
let gameState = 'START'; // START, PLAYING, OVER

let objects = [];
let mouse = new THREE.Vector2();
let clock = new THREE.Clock();

// --- Initialization ---
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Light blue sky
    scene.fog = new THREE.Fog(0x87ceeb, 20, 100);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 20, 20);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    raycaster = new THREE.Raycaster();

    setupLighting();
    setupHole();
    setupCity();
    setupEventListeners();

    animate();
}

function setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    sunLight.position.set(20, 50, 20);
    sunLight.castShadow = true;
    scene.add(sunLight);
}

function setupHole() {
    const group = new THREE.Group();

    // The "Hole" visual (a dark flat disc)
    const geometry = new THREE.CircleGeometry(INITIAL_HOLE_RADIUS, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const holeDisc = new THREE.Mesh(geometry, material);
    holeDisc.rotation.x = -Math.PI / 2;
    holeDisc.position.y = 0.01; // Slightly above ground
    group.add(holeDisc);

    hole = group;
    scene.add(hole);
}

function setupCity() {
    // Ground
    const groundGeo = new THREE.PlaneGeometry(WORLD_SIZE * 2, WORLD_SIZE * 2);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // City Blocks
    for (let x = -WORLD_SIZE; x < WORLD_SIZE; x += 10) {
        for (let z = -WORLD_SIZE; z < WORLD_SIZE; z += 10) {
            if (Math.abs(x) < 5 && Math.abs(z) < 5) continue; // Spawn area clear

            const type = Math.random();
            if (type < 0.3) {
                spawnBuilding(x + (Math.random() - 0.5) * 5, z + (Math.random() - 0.5) * 5);
            } else if (type < 0.5) {
                spawnProp(x + (Math.random() - 0.5) * 5, z + (Math.random() - 0.5) * 5, 'car');
            } else if (type < 0.7) {
                spawnProp(x + (Math.random() - 0.5) * 5, z + (Math.random() - 0.5) * 5, 'pole');
            }
        }
    }
}

function spawnBuilding(x, z) {
    const h = 2 + Math.random() * 8;
    const w = 2 + Math.random() * 2;
    const geo = new THREE.BoxGeometry(w, h, w);
    const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(Math.random(), 0.1, 0.4)
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    scene.add(mesh);
    objects.push({
        mesh,
        radius: Math.max(w, h / 4),
        value: Math.floor(h * 10),
        sizeRequired: w * 0.8
    });
}

function spawnProp(x, z, type) {
    let geo, mat, mesh, radius, value, sizeRequired;

    if (type === 'car') {
        geo = new THREE.BoxGeometry(1.2, 0.8, 2);
        mat = new THREE.MeshStandardMaterial({ color: 0xff4444 });
        radius = 1;
        value = 20;
        sizeRequired = 0.5;
    } else { // pole
        geo = new THREE.CylinderGeometry(0.1, 0.1, 4);
        mat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        radius = 0.5;
        value = 10;
        sizeRequired = 0.2;
    }

    mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, type === 'car' ? 0.4 : 2, z);
    mesh.castShadow = true;

    scene.add(mesh);
    objects.push({ mesh, radius, value, sizeRequired });
}

function setupEventListeners() {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onWindowResize);

    document.getElementById('start-btn').onclick = () => {
        document.getElementById('overlay').classList.add('hidden');
        gameState = 'PLAYING';
        startTimer();
    };

    document.getElementById('restart-btn').onclick = () => location.reload();
}

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function startTimer() {
    const timerInterval = setInterval(() => {
        if (gameState !== 'PLAYING') {
            clearInterval(timerInterval);
            return;
        }
        timeRemaining--;
        updateHUD();
        if (timeRemaining <= 0) {
            gameOver();
            clearInterval(timerInterval);
        }
    }, 1000);
}

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);

    if (gameState === 'PLAYING') {
        updateHolePosition();
        checkSwallow();
        updateCamera();
    }

    renderer.render(scene, camera);
}

function updateHolePosition() {
    // Project mouse onto ground plane
    raycaster.setFromCamera(mouse, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersection);

    // Smooth move
    hole.position.lerp(intersection, 0.1);
}

function checkSwallow() {
    objects.forEach((obj, idx) => {
        if (obj.swallowed) return;

        const dist = hole.position.distanceTo(obj.mesh.position);

        // If within hole radius and hole is large enough
        if (dist < holeRadius && holeRadius > obj.sizeRequired) {
            obj.swallowed = true;
            swallowObject(obj, idx);
        }
    });
}

function swallowObject(obj, idx) {
    // Animation: fall into hole
    const duration = 500;
    const startY = obj.mesh.position.y;
    const startScale = obj.mesh.scale.x;
    const startTime = Date.now();

    const animateSwallow = () => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;

        if (progress < 1) {
            obj.mesh.position.y = startY - progress * 10;
            obj.mesh.scale.setScalar(startScale * (1 - progress));
            requestAnimationFrame(animateSwallow);
        } else {
            scene.remove(obj.mesh);
            score += obj.value;
            growHole(obj.value);
            updateHUD();
            // Remove from objects array
            objects = objects.filter(o => o !== obj);
        }
    };
    animateSwallow();
}

function growHole(value) {
    const growth = value / 2000;
    holeRadius += growth;
    hole.children[0].scale.setScalar(holeRadius / INITIAL_HOLE_RADIUS);
}

function updateCamera() {
    const targetOffset = new THREE.Vector3(0, 20 + holeRadius * 10, 20 + holeRadius * 10);
    const targetPos = hole.position.clone().add(targetOffset);
    camera.position.lerp(targetPos, 0.05);
    camera.lookAt(hole.position);
}

function updateHUD() {
    document.getElementById('score-value').textContent = Math.floor(score);

    const mins = Math.floor(timeRemaining / 60);
    const secs = timeRemaining % 60;
    document.getElementById('timer-value').textContent =
        `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function gameOver() {
    gameState = 'OVER';
    document.getElementById('game-over').classList.remove('hidden');
    document.getElementById('final-score').textContent = Math.floor(score);
}

init();
