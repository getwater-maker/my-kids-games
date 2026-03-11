import * as THREE from 'three';

// --- Configuration ---
const LANE_WIDTH = 4;
const INITIAL_SPEED = 0.5;
const SPEED_INCREMENT = 0.0001;
const JUMP_FORCE = 0.2;
const GRAVITY = 0.01;

// --- State Variables ---
let scene, camera, renderer;
let penguin;
let currentLane = 0; // -1, 0, 1
let targetX = 0;
let verticalVelocity = 0;
let isJumping = false;

let score = 0;
let fishCount = 0;
let gameSpeed = INITIAL_SPEED;
let gameState = 'START'; // START, PLAYING, OVER

let worldTiles = [];
let obstacles = [];
let fishes = [];

const clock = new THREE.Clock();

// --- Colors ---
const COLORS = {
    ice: 0xa5f3fc,
    water: 0x0ea5e9,
    penguin: 0x1e293b,
    fish: 0xfb923c,
    snow: 0xffffff
};

// --- Initialization ---
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.ice);
    scene.fog = new THREE.Fog(COLORS.ice, 1, 100);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 2, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    setupLighting();
    setupPenguin();
    setupInitialWorld();
    setupEventListeners();

    animate();
}

function setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    sunLight.position.set(10, 20, 10);
    sunLight.castShadow = true;
    scene.add(sunLight);
}

function setupPenguin() {
    const penguinGroup = new THREE.Group();

    // Body
    const bodyGeo = new THREE.CapsuleGeometry(0.5, 0.5, 4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: COLORS.penguin });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.75;
    body.castShadow = true;
    penguinGroup.add(body);

    // Belly
    const bellyGeo = new THREE.SphereGeometry(0.4, 8, 8);
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.position.set(0, 0.7, 0.3);
    belly.scale.set(1, 1.2, 0.5);
    penguinGroup.add(belly);

    // Beak
    const beakGeo = new THREE.ConeGeometry(0.1, 0.2, 8);
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xffa500 });
    const beak = new THREE.Mesh(beakGeo, beakMat);
    beak.position.set(0, 1.1, 0.45);
    beak.rotation.x = Math.PI / 2;
    penguinGroup.add(beak);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.05, 4, 4);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.15, 1.2, 0.4);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.15, 1.2, 0.4);
    penguinGroup.add(eyeL);
    penguinGroup.add(eyeR);

    penguin = penguinGroup;
    scene.add(penguin);
}

function createTile(z) {
    const group = new THREE.Group();

    // Road/Ice path
    const roadGeo = new THREE.PlaneGeometry(LANE_WIDTH * 3.5, 40);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    group.add(road);

    // Water edges
    const waterGeo = new THREE.PlaneGeometry(100, 40);
    const waterMat = new THREE.MeshStandardMaterial({ color: COLORS.water, transparent: true, opacity: 0.8 });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.1;
    group.add(water);

    group.position.z = z;
    scene.add(group);
    return group;
}

function setupInitialWorld() {
    for (let i = 0; i < 5; i++) {
        worldTiles.push(createTile(-i * 40));
    }
}

function setupEventListeners() {
    window.addEventListener('keydown', (e) => {
        if (gameState !== 'PLAYING') return;

        if (e.key === 'ArrowLeft' || e.key === 'a') {
            if (currentLane > -1) {
                currentLane--;
                targetX = currentLane * LANE_WIDTH;
            }
        }
        if (e.key === 'ArrowRight' || e.key === 'd') {
            if (currentLane < 1) {
                currentLane++;
                targetX = currentLane * LANE_WIDTH;
            }
        }
        if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') {
            if (!isJumping) {
                verticalVelocity = JUMP_FORCE;
                isJumping = true;
            }
        }
    });

    document.getElementById('start-btn').onclick = () => {
        document.getElementById('overlay').classList.add('hidden');
        gameState = 'PLAYING';
    };

    document.getElementById('restart-btn').onclick = () => location.reload();
}

// --- Gameplay Logic ---
function spawnObstacle() {
    const lane = Math.floor(Math.random() * 3) - 1;
    const type = Math.random();

    let obj;
    if (type < 0.7) {
        // Ice block
        const geo = new THREE.BoxGeometry(2, 2, 2);
        const mat = new THREE.MeshStandardMaterial({ color: COLORS.ice });
        obj = new THREE.Mesh(geo, mat);
        obj.position.y = 1;
    } else {
        // Snowman or something tall
        const geo = new THREE.CapsuleGeometry(1, 1, 4, 8);
        const mat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        obj = new THREE.Mesh(geo, mat);
        obj.position.y = 1.5;
    }

    obj.position.x = lane * LANE_WIDTH;
    obj.position.z = -100;
    scene.add(obj);
    obstacles.push(obj);
}

function spawnFish() {
    const lane = Math.floor(Math.random() * 3) - 1;
    const geo = new THREE.TorusGeometry(0.3, 0.1, 8, 16);
    const mat = new THREE.MeshStandardMaterial({ color: COLORS.fish, emissive: COLORS.fish, emissiveIntensity: 0.5 });
    const fish = new THREE.Mesh(geo, mat);

    fish.position.set(lane * LANE_WIDTH, 1 + Math.random() * 2, -100);
    scene.add(fish);
    fishes.push(fish);
}

function animate() {
    requestAnimationFrame(animate);

    if (gameState === 'PLAYING') {
        const delta = clock.getDelta();
        score += Math.floor(gameSpeed * 10);
        gameSpeed += SPEED_INCREMENT;

        // Player movement
        penguin.position.x += (targetX - penguin.position.x) * 0.2;

        // Jump gravity
        penguin.position.y += verticalVelocity;
        verticalVelocity -= GRAVITY;
        if (penguin.position.y <= 0) {
            penguin.position.y = 0;
            verticalVelocity = 0;
            isJumping = false;
        }

        // Move world tiles
        worldTiles.forEach(tile => {
            tile.position.z += gameSpeed;
            if (tile.position.z > 40) {
                tile.position.z -= 200;
            }
        });

        // Move & Collide obstacles
        obstacles.forEach((obj, idx) => {
            obj.position.z += gameSpeed;

            // Collision
            const dist = Math.hypot(obj.position.x - penguin.position.x, obj.position.z - penguin.position.z);
            if (dist < 1.5 && Math.abs(penguin.position.y - obj.position.y) < 1.0) {
                gameOver();
            }

            if (obj.position.z > 20) {
                scene.remove(obj);
                obstacles.splice(idx, 1);
            }
        });

        // Move & Collect Fish
        fishes.forEach((fish, idx) => {
            fish.position.z += gameSpeed;
            fish.rotation.y += 0.05;

            const dist = Math.hypot(fish.position.x - penguin.position.x, fish.position.z - penguin.position.z);
            if (dist < 1.5 && Math.abs(penguin.position.y - fish.position.y) < 1.5) {
                fishCount++;
                scene.remove(fish);
                fishes.splice(idx, 1);
            }

            if (fish.position.z > 20) {
                scene.remove(fish);
                fishes.splice(idx, 1);
            }
        });

        // Spawning
        if (frameCount % 60 === 0) spawnObstacle();
        if (frameCount % 45 === 0) spawnFish();

        updateHUD();
    }

    renderer.render(scene, camera);
    frameCount++;
}

let frameCount = 0;

function updateHUD() {
    document.getElementById('score-value').textContent = Math.floor(score) + 'm';
    document.getElementById('fish-count').textContent = '🐟 ' + fishCount;
}

function gameOver() {
    gameState = 'OVER';
    document.getElementById('game-over-screen').classList.remove('hidden');
    document.getElementById('final-distance').textContent = Math.floor(score);
    document.getElementById('final-fish').textContent = fishCount;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize);

init();
