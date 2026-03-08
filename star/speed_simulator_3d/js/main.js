// star/speed_simulator_3d/js/main.js

const CONFIG = {
    initialSpeed: 0,
    maxPossibleSpeed: 1000,
    speedGainPerTap: 10,
    speedDecay: 0.985,
    cameraHeight: 1.5,
    fovBase: 75,
    fovMax: 110,
    roadTileSize: 50,
    numRoadTiles: 10,
    starCount: 2000
};

let scene, camera, renderer, clock;
let currentSpeed = 0;
let maxSpeed = 0;
let gameState = 'START';
let activeKeys = {};

// Objects
let roadTiles = [];
let stars;
let warpLines = [];

// UI Elements
let speedValEl, maxSpeedEl, gaugeEl, startScreen, hud, resultScreen, finalMaxSpeedEl;

function init() {
    speedValEl = document.getElementById('speed-value');
    maxSpeedEl = document.getElementById('max-speed');
    gaugeEl = document.getElementById('gauge-bar');
    startScreen = document.getElementById('start-screen');
    hud = document.getElementById('hud');
    resultScreen = document.getElementById('result-screen');
    finalMaxSpeedEl = document.getElementById('final-max-speed');

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.Fog(0x000000, 20, 150);

    camera = new THREE.PerspectiveCamera(CONFIG.fovBase, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, CONFIG.cameraHeight, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('game-container').appendChild(renderer.domElement);

    clock = new THREE.Clock();

    // Lighting
    const ambient = new THREE.AmbientLight(0x404040);
    scene.add(ambient);
    const hemi = new THREE.HemisphereLight(0x00d2ff, 0xff007f, 0.6);
    scene.add(hemi);

    createRoad();
    createStars();
    createWarpLines();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.getElementById('start-btn').onclick = startGame;
    document.getElementById('restart-btn').onclick = restartGame;

    animate();
}

function handleKeyDown(e) {
    activeKeys[e.code] = true;
    if (e.code === 'Space' && gameState === 'PLAYING') {
        exerciseAction();
    }
}

function handleKeyUp(e) {
    activeKeys[e.code] = false;
}

function exerciseAction() {
    currentSpeed += CONFIG.speedGainPerTap;
    if (currentSpeed > CONFIG.maxPossibleSpeed) currentSpeed = CONFIG.maxPossibleSpeed;

    // Animate jump/shake
    camera.position.y = CONFIG.cameraHeight + (Math.random() * 0.1);

    // Update gauge
    const percent = (currentSpeed / 200) * 100;
    gaugeEl.style.width = Math.min(percent, 100) + '%';
}

function createRoad() {
    const geo = new THREE.PlaneGeometry(20, CONFIG.roadTileSize);
    for (let i = 0; i < CONFIG.numRoadTiles; i++) {
        // Neon Grid Material
        const mat = new THREE.MeshPhongMaterial({
            color: 0x111111,
            emissive: 0x001111,
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.z = -i * CONFIG.roadTileSize;

        // Add grid lines
        const grid = new THREE.GridHelper(20, 10, 0x00d2ff, 0x111111);
        grid.rotation.x = Math.PI / 2;
        grid.position.z = 0.01;
        mesh.add(grid);

        scene.add(mesh);
        roadTiles.push(mesh);
    }
}

function createStars() {
    const geo = new THREE.BufferGeometry();
    const pos = [];
    for (let i = 0; i < CONFIG.starCount; i++) {
        pos.push((Math.random() - 0.5) * 200);
        pos.push((Math.random() - 0.5) * 200);
        pos.push((Math.random() - 0.5) * 200);
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 });
    stars = new THREE.Points(geo, mat);
    scene.add(stars);
}

function createWarpLines() {
    const lineGeo = new THREE.BufferGeometry();
    const lineMat = new THREE.LineBasicMaterial({ color: 0x00d2ff, transparent: true, opacity: 0 });

    for (let i = 0; i < 100; i++) {
        const points = [
            new THREE.Vector3((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40, -100),
            new THREE.Vector3((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40, -5)
        ];
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geo, lineMat.clone());
        scene.add(line);
        warpLines.push(line);
    }
}

function startGame() {
    gameState = 'PLAYING';
    startScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    currentSpeed = 0;
}

function restartGame() {
    resultScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    currentSpeed = 0;
    gameState = 'PLAYING';
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (gameState === 'PLAYING') {
        const speedFactor = delta * 60; // Normalize

        // Decay speed
        currentSpeed *= Math.pow(CONFIG.speedDecay, speedFactor);
        if (currentSpeed < 0) currentSpeed = 0;

        // Update Max Speed
        if (currentSpeed > maxSpeed) {
            maxSpeed = currentSpeed;
            maxSpeedEl.textContent = Math.floor(maxSpeed);
        }

        speedValEl.textContent = Math.floor(currentSpeed);

        // Movement
        const moveDist = currentSpeed * delta * 0.5;

        // Infinite Road
        roadTiles.forEach(tile => {
            tile.position.z += moveDist;
            if (tile.position.z > CONFIG.roadTileSize) {
                tile.position.z -= CONFIG.numRoadTiles * CONFIG.roadTileSize;
            }
        });

        // Warp Lines Visibility/Length based on speed
        warpLines.forEach(line => {
            const visibility = Math.max(0, (currentSpeed - 150) / 400);
            line.material.opacity = visibility;
            line.position.z += moveDist * 2.5;
            if (line.position.z > 0) line.position.z = -150;
        });

        // FOV Update
        camera.fov = CONFIG.fovBase + Math.min(currentSpeed / 10, CONFIG.fovMax - CONFIG.fovBase);
        camera.updateProjectionMatrix();

        // Steering (Visual only)
        if (activeKeys['KeyA']) camera.rotation.y = Math.min(camera.rotation.y + 0.01, 0.1);
        else if (activeKeys['KeyD']) camera.rotation.y = Math.max(camera.rotation.y - 0.01, -0.1);
        else camera.rotation.y *= 0.9;

        camera.position.x = -camera.rotation.y * 10;

        // Gauge recovery
        if (Math.random() < 0.1) {
            const currentPercent = parseFloat(gaugeEl.style.width) || 0;
            gaugeEl.style.width = Math.max(0, currentPercent - 1) + '%';
        }
    }

    renderer.render(scene, camera);
}

window.onload = init;
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
