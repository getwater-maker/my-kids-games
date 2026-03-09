// star/squid_game_jegi/js/main.js

const CONFIG = {
    walkSpeed: 10,
    slowTimeScale: 0.05,
    jegiSpawnRate: 3.0,
    kickZoneY: 1.5,
    jegiGravity: 9.8,
    jegiUpwardForce: 12.0
};

let scene, camera, renderer, clock;
let gameState = 'START';
let lightState = 'GREEN'; // 'GREEN' or 'RED'
let score = 0;
let timeScale = 1.0;

// Game Objects
let floor, playerGroup, doll, jegi;
let isJegiActive = false;
let jegiVelocityY = 0;

// UI
let scoreEl, statusIndicator, startScreen, gameOverScreen, finalScoreEl;

function init() {
    scoreEl = document.getElementById('score');
    statusIndicator = document.getElementById('status-indicator');
    startScreen = document.getElementById('start-screen');
    gameOverScreen = document.getElementById('game-over');
    finalScoreEl = document.getElementById('final-score');

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xaed6f1);
    scene.fog = new THREE.Fog(0xaed6f1, 20, 100);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 2, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    clock = new THREE.Clock();

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(50, 100, 50);
    sun.castShadow = true;
    scene.add(sun);

    createEnvironment();
    createPlayer();
    createDoll();
    createJegi();

    document.getElementById('start-btn').onclick = startGame;
    document.getElementById('restart-btn').onclick = restartGame;
    window.addEventListener('mousedown', onMouseDown);

    animate();
}

function createEnvironment() {
    // Sandy ground
    const groundGeo = new THREE.PlaneGeometry(100, 500);
    const groundMat = new THREE.MeshPhongMaterial({ color: 0xedc9af });
    floor = new THREE.Mesh(groundGeo, groundMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Red lines/walls
    const wallGeo = new THREE.BoxGeometry(0.5, 10, 500);
    const wallMat = new THREE.MeshPhongMaterial({ color: 0xed1c4d });
    const wallL = new THREE.Mesh(wallGeo, wallMat);
    wallL.position.set(-20, 5, 0);
    scene.add(wallL);

    const wallR = new THREE.Mesh(wallGeo, wallMat);
    wallR.position.set(20, 5, 0);
    scene.add(wallR);

    // Goal line
    const goalLineGeo = new THREE.PlaneGeometry(40, 2);
    const goalLineMat = new THREE.MeshPhongMaterial({ color: 0xed1c4d });
    const goalLine = new THREE.Mesh(goalLineGeo, goalLineMat);
    goalLine.rotation.x = -Math.PI / 2;
    goalLine.position.set(0, 0.05, -200);
    scene.add(goalLine);
}

function createPlayer() {
    playerGroup = new THREE.Group();

    // Simple block avatar
    const bodyGeo = new THREE.BoxGeometry(1, 1.5, 0.5);
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0x008f95 }); // Teal
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.25;
    body.castShadow = true;
    playerGroup.add(body);

    const headGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const headMat = new THREE.MeshPhongMaterial({ color: 0xffdbac });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2.2;
    playerGroup.add(head);

    scene.add(playerGroup);
}

function createDoll() {
    const dollGroup = new THREE.Group();

    // Giant Doll Head
    const headGeo = new THREE.SphereGeometry(3, 32, 32);
    const headMat = new THREE.MeshPhongMaterial({ color: 0xffdbac });
    const head = new THREE.Mesh(headGeo, headMat);
    head.name = "dollHead";
    dollGroup.add(head);

    // Dress
    const bodyGeo = new THREE.ConeGeometry(5, 15, 32);
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0xffeb3b });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = -9;
    dollGroup.add(body);

    dollGroup.position.set(0, 15, -220);
    scene.add(dollGroup);
    doll = dollGroup;
}

function createJegi() {
    const jegiGroup = new THREE.Group();

    // Base weight
    const baseGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16);
    const baseMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    jegiGroup.add(base);

    // Feathers/Colors
    for (let i = 0; i < 6; i++) {
        const featherGeo = new THREE.BoxGeometry(0.05, 0.6, 0.2);
        const featherMat = new THREE.MeshPhongMaterial({ color: i % 2 === 0 ? 0xed1c4d : 0xffffff });
        const feather = new THREE.Mesh(featherGeo, featherMat);
        feather.rotation.z = (Math.PI / 6) * i;
        feather.position.y = 0.3;
        jegiGroup.add(feather);
    }

    jegiGroup.position.set(0, 10, -5); // Start hidden/above
    jegi = jegiGroup;
    scene.add(jegi);
}

function startGame() {
    gameState = 'PLAYING';
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');

    playerGroup.position.set(0, 0, 50);
    score = 0;
    scoreEl.textContent = "0";
    spawnJegi();
    startLightLoop();
}

function restartGame() {
    startGame();
}

function spawnJegi() {
    if (gameState !== 'PLAYING') return;

    // Position Jegi in front of player
    jegi.position.set(playerGroup.position.x, 8, playerGroup.position.z - 5);
    jegiVelocityY = 0;
    isJegiActive = true;
}

function onMouseDown(e) {
    if (e.button !== 0 || gameState !== 'PLAYING' || !isJegiActive) return;

    // Check if Jegi is in kick zone
    const distY = jegi.position.y - CONFIG.kickZoneY;
    if (Math.abs(distY) < 1.0) {
        // SUCCESS HIT
        jegiVelocityY = CONFIG.jegiUpwardForce;
        score++;
        scoreEl.textContent = score;

        // Visual effect on kick
        playerGroup.position.y = 0.2; // Small hop

        // Reset time if it was slow
        timeScale = 1.0;

        // Check if hit during RED light
        if (lightState === 'RED') {
            eliminate();
        }
    }
}

function startLightLoop() {
    if (gameState !== 'PLAYING') return;

    const sequence = () => {
        if (gameState !== 'PLAYING') return;

        // GREEN
        lightState = 'GREEN';
        statusIndicator.textContent = "GREEN LIGHT";
        statusIndicator.className = "green-light";
        doll.getObjectByName("dollHead").rotation.y = Math.PI; // Face away

        const greenTime = 2000 + Math.random() * 3000;

        setTimeout(() => {
            if (gameState !== 'PLAYING') return;

            // RED
            lightState = 'RED';
            statusIndicator.textContent = "RED LIGHT";
            statusIndicator.className = "red-light";
            doll.getObjectByName("dollHead").rotation.y = 0; // Face player

            const redTime = 1500 + Math.random() * 1000;

            setTimeout(sequence, redTime);
        }, greenTime);
    };

    sequence();
}

function eliminate() {
    gameState = 'GAMEOVER';
    gameOverScreen.classList.remove('hidden');
    finalScoreEl.textContent = score;
}

function updateJegi(delta) {
    if (!isJegiActive) return;

    // Gravity
    jegiVelocityY -= CONFIG.jegiGravity * delta;
    jegi.position.y += jegiVelocityY * delta;

    // Detect Slomo zone
    const distY = jegi.position.y - CONFIG.kickZoneY;
    if (Math.abs(distY) < 1.0 && jegiVelocityY < 0) {
        timeScale = CONFIG.slowTimeScale;
    } else {
        timeScale = 1.0;
    }

    // Fail if hit ground
    if (jegi.position.y < -0.1) {
        isJegiActive = false;
        setTimeout(spawnJegi, 1000); // Try again
    }
}

function animate() {
    requestAnimationFrame(animate);
    const rawDelta = clock.getDelta();
    const delta = rawDelta * timeScale;

    if (gameState === 'PLAYING') {
        // Auto walk forward if GREEN
        if (lightState === 'GREEN') {
            playerGroup.position.z -= CONFIG.walkSpeed * delta;
        } else {
            // RED LIGHT: Must stop kicking/moving
            // Player slightly slides but if they hit/move much, it's over
            // For simplicity, we detect if they CLICKED during RED in the mouse handler
        }

        updateJegi(delta);

        // Camera follow
        camera.position.z = playerGroup.position.z + 10;
        camera.position.x = playerGroup.position.x * 0.5;
        camera.lookAt(playerGroup.position.x, 2, playerGroup.position.z - 5);

        // Win check
        if (playerGroup.position.z < -200) {
            gameState = 'WIN';
            alert("살아남으셨습니다! (SURVIVED)");
            location.reload();
        }

        // Return to floor after kick hop
        if (playerGroup.position.y > 0) {
            playerGroup.position.y -= delta * 2;
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
