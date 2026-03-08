// star/speed_simulator_3d/js/main.js

const CONFIG = {
    initialSpeed: 0,
    maxPossibleSpeed: 2000,
    speedGainPerTap: 10,
    speedDecay: 0.985,
    cameraHeight: 1.5,
    fovBase: 75,
    fovMax: 120,
    roadTileSize: 50,
    numRoadTiles: 12,
    starCount: 2000,
    winDistance: 5000 // Distance to reach "Win 1" platform
};

let scene, camera, renderer, clock;
let currentSpeed = 0;
let maxSpeed = 0;
let totalWins = parseInt(localStorage.getItem('speedSimWins')) || 0;
let ownedPets = JSON.parse(localStorage.getItem('speedSimPets')) || [];
let distanceTraveled = 0;

let gameState = 'START';
let activeKeys = {};

// Objects
let roadTiles = [];
let stars;
let warpLines = [];
let winPlatform;

// UI Elements
let speedValEl, maxSpeedEl, winsValEl, gaugeEl, startScreen, hud, resultScreen, finalMaxSpeedEl;
let shopScreen, shopWinsEl;

function init() {
    speedValEl = document.getElementById('speed-value');
    maxSpeedEl = document.getElementById('max-speed');
    winsValEl = document.getElementById('wins-value');
    gaugeEl = document.getElementById('gauge-bar');
    startScreen = document.getElementById('start-screen');
    hud = document.getElementById('hud');
    resultScreen = document.getElementById('result-screen');
    finalMaxSpeedEl = document.getElementById('final-max-speed');
    shopScreen = document.getElementById('shop-screen');
    shopWinsEl = document.getElementById('shop-wins');

    // Update initial UI
    winsValEl.textContent = totalWins;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.Fog(0x000000, 20, 200);

    camera = new THREE.PerspectiveCamera(CONFIG.fovBase, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, CONFIG.cameraHeight, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('game-container').appendChild(renderer.domElement);

    clock = new THREE.Clock();

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    const hemi = new THREE.HemisphereLight(0x00d2ff, 0xff007f, 0.8);
    scene.add(hemi);

    createRoad();
    createStars();
    createWarpLines();
    createWinPlatform();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    document.getElementById('start-btn').onclick = startGame;
    document.getElementById('restart-btn').onclick = restartGame;
    document.getElementById('pet-shop-btn').onclick = () => {
        shopWinsEl.textContent = totalWins;
        shopScreen.classList.remove('hidden');
    };
    document.getElementById('close-shop').onclick = () => shopScreen.classList.add('hidden');

    animate();
}

function buyPet(id, cost) {
    if (totalWins >= cost && !ownedPets.includes(id)) {
        totalWins -= cost;
        ownedPets.push(id);
        localStorage.setItem('speedSimWins', totalWins);
        localStorage.setItem('speedSimPets', JSON.stringify(ownedPets));
        winsValEl.textContent = totalWins;
        shopWinsEl.textContent = totalWins;
        alert(`Congratulations! You bought the ${id}!`);
    } else if (ownedPets.includes(id)) {
        alert("You already own this pet!");
    } else {
        alert("Not enough Wins!");
    }
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
    let bonus = 1;
    if (ownedPets.includes('slime')) bonus += 0.05;
    if (ownedPets.includes('puppy')) bonus += 0.10;
    if (ownedPets.includes('dragon')) bonus += 0.25;

    currentSpeed += CONFIG.speedGainPerTap * bonus;
    if (currentSpeed > CONFIG.maxPossibleSpeed) currentSpeed = CONFIG.maxPossibleSpeed;

    camera.position.y = CONFIG.cameraHeight + (Math.random() * 0.1);

    const percent = (currentSpeed / 300) * 100;
    gaugeEl.style.width = Math.min(percent, 100) + '%';
}

function createRoad() {
    const geo = new THREE.PlaneGeometry(30, CONFIG.roadTileSize);
    for (let i = 0; i < CONFIG.numRoadTiles; i++) {
        const mat = new THREE.MeshPhongMaterial({
            color: 0x111111,
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.z = -i * CONFIG.roadTileSize;

        const grid = new THREE.GridHelper(30, 10, 0x00d2ff, 0x222222);
        grid.rotation.x = Math.PI / 2;
        grid.position.z = 0.01;
        mesh.add(grid);

        scene.add(mesh);
        roadTiles.push(mesh);
    }
}

function createWinPlatform() {
    const geo = new THREE.BoxGeometry(20, 1, 10);
    const mat = new THREE.MeshPhongMaterial({
        color: 0xFFD700,
        emissive: 0xFFD700,
        emissiveIntensity: 0.5
    });
    winPlatform = new THREE.Mesh(geo, mat);
    winPlatform.position.set(0, 0.5, -CONFIG.winDistance);
    scene.add(winPlatform);

    // Text Label (Visual representation of Win 1)
    const winCanvas = document.createElement('canvas');
    const ctx = winCanvas.getContext('2d');
    winCanvas.width = 256;
    winCanvas.height = 128;
    ctx.fillStyle = "#FFD700";
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = "black";
    ctx.font = "bold 50px Orbitron";
    ctx.fillText("WIN 1", 50, 80);

    const winTex = new THREE.CanvasTexture(winCanvas);
    const winLabelGeo = new THREE.PlaneGeometry(10, 5);
    const winLabelMat = new THREE.MeshBasicMaterial({ map: winTex, side: THREE.DoubleSide });
    const winLabel = new THREE.Mesh(winLabelGeo, winLabelMat);
    winLabel.position.y = 5;
    winPlatform.add(winLabel);
}

function createStars() {
    const geo = new THREE.BufferGeometry();
    const pos = [];
    for (let i = 0; i < CONFIG.starCount; i++) {
        pos.push((Math.random() - 0.5) * 600);
        pos.push((Math.random() - 0.5) * 600);
        pos.push((Math.random() - 0.5) * 600);
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.2 });
    stars = new THREE.Points(geo, mat);
    scene.add(stars);
}

function createWarpLines() {
    const lineMat = new THREE.LineBasicMaterial({ color: 0x00d2ff, transparent: true, opacity: 0 });
    for (let i = 0; i < 200; i++) {
        const points = [
            new THREE.Vector3((Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100, -200),
            new THREE.Vector3((Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100, -5)
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
    distanceTraveled = 0;
}

function restartGame() {
    resultScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    currentSpeed = 0;
    distanceTraveled = 0;
    winPlatform.position.z = -CONFIG.winDistance;
    gameState = 'PLAYING';
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (gameState === 'PLAYING') {
        const speedFactor = delta * 60;
        currentSpeed *= Math.pow(CONFIG.speedDecay, speedFactor);
        if (currentSpeed < 0) currentSpeed = 0;

        if (currentSpeed > maxSpeed) {
            maxSpeed = currentSpeed;
            maxSpeedEl.textContent = Math.floor(maxSpeed);
        }

        speedValEl.textContent = Math.floor(currentSpeed);

        const moveDist = currentSpeed * delta * 0.8;
        distanceTraveled += moveDist;

        // Infinite Road
        roadTiles.forEach(tile => {
            tile.position.z += moveDist;
            if (tile.position.z > CONFIG.roadTileSize) {
                tile.position.z -= CONFIG.numRoadTiles * CONFIG.roadTileSize;
            }
        });

        // Win Platform Movement
        winPlatform.position.z += moveDist;
        if (winPlatform.position.z > 0 && gameState === 'PLAYING') {
            triggerWinPlatform();
        }

        // Effects
        warpLines.forEach(line => {
            const visibility = Math.max(0, (currentSpeed - 200) / 600);
            line.material.opacity = visibility;
            line.position.z += moveDist * 3;
            if (line.position.z > 0) line.position.z = -200;
        });

        camera.fov = CONFIG.fovBase + Math.min(currentSpeed / 8, CONFIG.fovMax - CONFIG.fovBase);
        camera.updateProjectionMatrix();

        if (activeKeys['KeyA']) camera.rotation.y = Math.min(camera.rotation.y + 0.015, 0.15);
        else if (activeKeys['KeyD']) camera.rotation.y = Math.max(camera.rotation.y - 0.015, -0.15);
        else camera.rotation.y *= 0.9;
        camera.position.x = -camera.rotation.y * 12;
    }

    renderer.render(scene, camera);
}

function triggerWinPlatform() {
    gameState = 'WIN_PAUSE';
    totalWins += 1;
    localStorage.setItem('speedSimWins', totalWins);
    winsValEl.textContent = totalWins;

    resultScreen.classList.remove('hidden');
    finalMaxSpeedEl.textContent = Math.floor(maxSpeed);

    // Reset platform for next run but keep it out of view for now
    winPlatform.position.z = -CONFIG.winDistance;
}

window.onload = init;
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Exposed global for HTML buy buttons
window.buyPet = buyPet;
