let scene, camera, renderer, clock;
let player, road, obstacles = [];
let score = 0;
let gameState = 'START';
let jumpCharge = 0;
let isJumping = false;
let jumpVelocity = 0;

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xaedefc);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 8);
    camera.lookAt(0, 2, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    clock = new THREE.Clock();

    setupLights();
    setupGame();
    setupEventListeners();
    animate();
}

function setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(10, 20, 10);
    sun.castShadow = true;
    scene.add(sun);
}

function setupGame() {
    // Road
    const roadGeo = new THREE.BoxGeometry(6, 0.5, 100);
    const roadMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
    road = new THREE.Mesh(roadGeo, roadMat);
    road.receiveShadow = true;
    scene.add(road);

    // Player (Voxel Car)
    player = new THREE.Group();
    const carBody = new THREE.Mesh(new THREE.BoxGeometry(1, 0.6, 1.8), new THREE.MeshPhongMaterial({ color: 0xff4757 }));
    carBody.position.y = 0.5;
    carBody.castShadow = true;
    player.add(carBody);
    
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.8), new THREE.MeshPhongMaterial({ color: 0x2f3542 }));
    cabin.position.set(0, 1.0, -0.2);
    player.add(cabin);

    player.position.y = 0;
    scene.add(player);
}

function setupEventListeners() {
    const startBtn = document.getElementById('start-btn');
    startBtn.onclick = () => {
        gameState = 'PLAYING';
        document.getElementById('start-screen').classList.add('hidden');
    };

    window.onmousedown = () => { if(gameState === 'PLAYING') isCharging = true; };
    window.onmouseup = () => { if(gameState === 'PLAYING') performJump(); };
    window.ontouchstart = () => { if(gameState === 'PLAYING') isCharging = true; };
    window.ontouchend = () => { if(gameState === 'PLAYING') performJump(); };
}

let isCharging = false;
function performJump() {
    if (!isJumping) {
        isJumping = true;
        jumpVelocity = Math.min(0.3, jumpCharge * 0.05);
        jumpCharge = 0;
        isCharging = false;
    }
}

function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();

    if (gameState === 'PLAYING') {
        updateGame(dt);
    }
    renderer.render(scene, camera);
}

function updateGame(dt) {
    // Road movement
    road.position.z += 8 * dt;
    if (road.position.z > 40) road.position.z = 0;

    // Obstacles
    if (Math.random() < 0.02) spawnObstacle();

    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.position.z += 8 * dt;
        
        // Collision
        const dist = player.position.distanceTo(obs.position);
        if (dist < 1.0 && player.position.y < 0.8) {
            endGame();
        }

        if (obs.position.z > 10) {
            scene.remove(obs);
            obstacles.splice(i, 1);
            score++;
            document.getElementById('score').textContent = score;
        }
    }

    // Jump Physics
    if (isCharging && !isJumping) {
        jumpCharge += 1;
        player.scale.y = 1 - (Math.min(jumpCharge, 20) * 0.02);
    }

    if (isJumping) {
        player.position.y += jumpVelocity;
        jumpVelocity -= 0.01;
        player.scale.y = 1;

        if (player.position.y <= 0) {
            player.position.y = 0;
            isJumping = false;
        }
    }
}

function spawnObstacle() {
    const geo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const mat = new THREE.MeshPhongMaterial({ color: 0xff9f43 });
    const obs = new THREE.Mesh(geo, mat);
    obs.position.set((Math.random() - 0.5) * 4, 0.6, -40);
    obs.castShadow = true;
    scene.add(obs);
    obstacles.push(obs);
}

function endGame() {
    gameState = 'OVER';
    document.getElementById('game-over').classList.remove('hidden');
    document.getElementById('final-score').textContent = score;
}

init();
