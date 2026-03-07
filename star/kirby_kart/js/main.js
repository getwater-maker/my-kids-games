// js/main.js

const ui = {
    lapCounter: document.getElementById('lap-text'),
    position: document.getElementById('pos-text'),
    speedometer: document.getElementById('speed-text'),
    countdown: document.getElementById('countdown'),
    startScreen: document.getElementById('start-screen'),
    gameOverScreen: document.getElementById('game-over-screen'),
    resultTitle: document.getElementById('result-title'),
    resultDesc: document.getElementById('result-desc'),
    startBtn: document.getElementById('start-btn'),
    restartBtn: document.getElementById('restart-btn')
};

let gameState = 'START'; // START, COUNTDOWN, PLAYING, GAME_OVER
let scene, camera, renderer;
const keys = { w: false, a: false, s: false, d: false, space: false };

// --- Constants & Config ---
const MAX_LAPS = 3;
const KART_MAX_SPEED = 2.5;
const KART_ACCEL = 0.05;
const KART_BRAKE = 0.1;
const KART_FRICTION = 0.02;
const KART_TURN_SPEED = 0.04;
const DRIFT_BOOST = 1.2;

// --- Track Data (Simple Loop) ---
// Waypoints for AI and progress tracking
const waypoints = [
    { x: 0, z: -50 },
    { x: 50, z: -100 },
    { x: 150, z: -100 },
    { x: 200, z: -50 },
    { x: 200, z: 50 },
    { x: 150, z: 100 },
    { x: 50, z: 100 },
    { x: 0, z: 50 }
];

// --- Entities ---
class Kart {
    constructor(isPlayer, color, startX, startZ) {
        this.isPlayer = isPlayer;
        this.speed = 0;
        this.angle = Math.PI; // 처음에 북쪽(-z) 바라봄

        this.lap = 1;
        this.currentWaypoint = 0;
        this.progressScore = 0; // 순위 계산용

        this.isDrifting = false;

        // --- Visuals (Three.js) ---
        this.mesh = new THREE.Group();
        this.mesh.position.set(startX, 0.5, startZ);

        // Body (Kart)
        const bodyGeo = new THREE.BoxGeometry(1.5, 0.5, 2.5);
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0x333333 }); // 검은 하부
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.position.y = 0.25;
        bodyMesh.castShadow = true;
        this.mesh.add(bodyMesh);

        // Driver (Kirby)
        const driverGeo = new THREE.SphereGeometry(0.8, 16, 16);
        const driverMat = new THREE.MeshLambertMaterial({ color: color });
        const driverMesh = new THREE.Mesh(driverGeo, driverMat);
        driverMesh.position.y = 1.2;
        driverMesh.position.z = -0.2;
        driverMesh.castShadow = true;
        this.mesh.add(driverMesh);

        scene.add(this.mesh);
    }

    update() {
        if (gameState !== 'PLAYING') return;

        if (this.isPlayer) {
            // --- Player Input ---
            if (keys.w) {
                this.speed += KART_ACCEL;
            } else if (keys.s) {
                this.speed -= KART_BRAKE;
            } else {
                // Friction
                if (this.speed > 0) this.speed -= KART_FRICTION;
                if (this.speed < 0) this.speed += KART_FRICTION;
                if (Math.abs(this.speed) < KART_FRICTION) this.speed = 0;
            }

            // Turning (only when moving)
            if (Math.abs(this.speed) > 0.1) {
                let turnMult = this.speed > 0 ? 1 : -1;
                let currentTurnSpeed = KART_TURN_SPEED;

                // Drift mechanics
                if (keys.space) {
                    currentTurnSpeed *= 1.5;
                    this.isDrifting = true;
                } else {
                    if (this.isDrifting) {
                        // 미니 터보
                        this.speed = Math.min(this.speed + 0.5, KART_MAX_SPEED * DRIFT_BOOST);
                        this.isDrifting = false;
                    }
                }

                if (keys.a) this.angle += currentTurnSpeed * turnMult;
                if (keys.d) this.angle -= currentTurnSpeed * turnMult;
            }

            // Speed clamping
            let maxS = this.isDrifting ? KART_MAX_SPEED * 0.9 : KART_MAX_SPEED;
            if (this.speed > maxS) this.speed -= KART_FRICTION * 2;
            if (this.speed < -KART_MAX_SPEED / 2) this.speed = -KART_MAX_SPEED / 2;

        } else {
            // --- AI Logic ---
            let target = waypoints[this.currentWaypoint];
            let dx = target.x - this.mesh.position.x;
            let dz = target.z - this.mesh.position.z;
            let distToTarget = Math.sqrt(dx * dx + dz * dz);

            if (distToTarget < 15) {
                this.currentWaypoint = (this.currentWaypoint + 1) % waypoints.length;
                if (this.currentWaypoint === 0) {
                    this.lap++;
                    checkFinish(this);
                }
                target = waypoints[this.currentWaypoint];
            }

            let desiredAngle = Math.atan2(dx, dz);

            // Normalize angles for smooth turning
            let angleDiff = desiredAngle - this.angle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

            if (angleDiff > 0.1) this.angle += KART_TURN_SPEED * 0.8;
            else if (angleDiff < -0.1) this.angle -= KART_TURN_SPEED * 0.8;

            this.speed += KART_ACCEL;
            if (this.speed > KART_MAX_SPEED * 0.85) this.speed = KART_MAX_SPEED * 0.85; // AI is slightly slower
        }

        // Apply movement
        this.mesh.position.x += Math.sin(this.angle) * this.speed;
        this.mesh.position.z += Math.cos(this.angle) * this.speed;
        this.mesh.rotation.y = this.angle;

        // Progress calculation for ranking
        this.progressScore = (this.lap * 1000) + this.currentWaypoint * 100;
        // 거리를 점수로 환산 (웨이포인트에 가까울수록 점수 높음)
        let tx = waypoints[this.currentWaypoint].x;
        let tz = waypoints[this.currentWaypoint].z;
        let dist = Math.hypot(tx - this.mesh.position.x, tz - this.mesh.position.z);
        this.progressScore -= dist;

        // Update Lap Checkpoint for Player (simplistic)
        if (this.isPlayer) {
            let target = waypoints[this.currentWaypoint];
            let dx = target.x - this.mesh.position.x;
            let dz = target.z - this.mesh.position.z;

            if (Math.sqrt(dx * dx + dz * dz) < 20) {
                this.currentWaypoint = (this.currentWaypoint + 1) % waypoints.length;
                if (this.currentWaypoint === 0) {
                    this.lap++;
                    ui.lapCounter.textContent = Math.min(this.lap, MAX_LAPS);
                    checkFinish(this);
                }
            }

            // UI Update Speed
            ui.speedometer.textContent = Math.floor(Math.abs(this.speed) * 40); // 뷰용 스케일업
        }
    }
}

let karts = [];
let playerKart = null;

function init3D() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 50, 200);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 100, 50);
    dirLight.castShadow = true;
    // Shadow bounds
    dirLight.shadow.camera.left = -150;
    dirLight.shadow.camera.right = 150;
    dirLight.shadow.camera.top = 150;
    dirLight.shadow.camera.bottom = -150;
    scene.add(dirLight);

    // Ground & Track
    createEnvironment();

    // Controls
    window.addEventListener('keydown', (e) => {
        let key = e.key.toLowerCase();
        if (key === ' ') key = 'space';
        else if (key === 'arrowup') key = 'w';
        else if (key === 'arrowdown') key = 's';
        else if (key === 'arrowleft') key = 'a';
        else if (key === 'arrowright') key = 'd';

        if (keys.hasOwnProperty(key)) keys[key] = true;
    });
    window.addEventListener('keyup', (e) => {
        let key = e.key.toLowerCase();
        if (key === ' ') key = 'space';
        else if (key === 'arrowup') key = 'w';
        else if (key === 'arrowdown') key = 's';
        else if (key === 'arrowleft') key = 'a';
        else if (key === 'arrowright') key = 'd';

        if (keys.hasOwnProperty(key)) keys[key] = false;
    });

    window.addEventListener('resize', onResize);

    ui.startBtn.addEventListener('click', startSequence);
    ui.restartBtn.addEventListener('click', () => { location.reload(); }); // 깔끔하게 리로드

    renderer.setAnimationLoop(animate);
}

function createEnvironment() {
    // Grass
    const grassGeo = new THREE.PlaneGeometry(500, 500);
    const grassMat = new THREE.MeshLambertMaterial({ color: 0x4CAF50 });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.receiveShadow = true;
    scene.add(grass);

    // Simplistic Track (Road)
    // Draw a thick line via multiple planes or a shape
    const shape = new THREE.Shape();
    shape.moveTo(0, -50);
    shape.lineTo(50, -100);
    shape.lineTo(150, -100);
    shape.lineTo(200, -50);
    shape.lineTo(200, 50);
    shape.lineTo(150, 100);
    shape.lineTo(50, 100);
    shape.lineTo(0, 50);
    shape.lineTo(0, -50);

    const extrudeSettings = { depth: 0.1, bevelEnabled: false };
    const rdGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const rdMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
    const road = new THREE.Mesh(rdGeo, rdMat);
    road.rotation.x = Math.PI / 2;
    road.position.y = 0.05; // z-fighting 방지
    road.receiveShadow = true;
    // 좀 더 굵게 보이게 스케일
    road.scale.set(1.2, 1.2, 1.2);
    road.position.set(-20, 0, 0); // 오프셋 미세조정
    scene.add(road);

    // Add trees
    for (let i = 0; i < 60; i++) {
        let x = (Math.random() - 0.5) * 400;
        let z = (Math.random() - 0.5) * 400;

        // 트랙 근처(대략 원형)에는 나무 안 심음
        let distFromCenter = Math.hypot(x - 100, z);
        if (distFromCenter > 50 && distFromCenter < 180) continue;

        createTree(x, z);
    }
}

function createTree(x, z) {
    const trunkGeo = new THREE.CylinderGeometry(1, 1.5, 5);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5d4037 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, 2.5, z);
    trunk.castShadow = true;
    scene.add(trunk);

    const leavesGeo = new THREE.DodecahedronGeometry(4);
    const leavesMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32 });
    const leaves = new THREE.Mesh(leavesGeo, leavesMat);
    leaves.position.set(x, 6, z);
    leaves.castShadow = true;
    scene.add(leaves);
}

function spawnKarts() {
    // 4 Karts
    playerKart = new Kart(true, 0xff80ab, 0, 0); // Pink Kirby
    karts.push(playerKart);

    karts.push(new Kart(false, 0xffeb3b, -6, 4)); // Yellow
    karts.push(new Kart(false, 0x4fc3f7, 6, 8)); // Blue
    karts.push(new Kart(false, 0x81c784, -6, 12)); // Green
}

function startSequence() {
    ui.startScreen.classList.remove('active');

    // Spawn
    karts.forEach(k => scene.remove(k.mesh)); // clear old
    karts = [];
    spawnKarts();

    // Setup initial camera
    updateCamera();

    // Start Countdown
    gameState = 'COUNTDOWN';
    ui.countdown.style.opacity = 1;
    let count = 3;
    ui.countdown.textContent = count;

    let cInt = setInterval(() => {
        count--;
        if (count > 0) {
            ui.countdown.textContent = count;
        } else if (count === 0) {
            ui.countdown.textContent = "GO!";
            ui.countdown.style.color = "#4caf50";
        } else {
            clearInterval(cInt);
            ui.countdown.style.opacity = 0;
            gameState = 'PLAYING';
            ui.lapCounter.textContent = '1';
        }
    }, 1000);
}

function checkFinish(kart) {
    if (kart.lap > MAX_LAPS) {
        if (kart.isPlayer) {
            // Player Finished
            calculateRanks(); // 최종 순위 픽스
            let rank = getPlayerRank();
            endGame(`레이스 종료!`, `최종 순위: ${rank}등`);
        } else {
            // AI finished - player loses
            if (!playerKart || playerKart.lap <= MAX_LAPS) {
                endGame(`패배...`, `다른 AI가 먼저 결승선을 통과했습니다.`);
            }
        }
    }
}

function getPlayerRank() {
    karts.sort((a, b) => b.progressScore - a.progressScore);
    return karts.indexOf(playerKart) + 1;
}

function calculateRanks() {
    if (gameState !== 'PLAYING') return;
    let rank = getPlayerRank();
    ui.position.textContent = rank;
}

function updateCamera() {
    if (!playerKart) return;

    // 마리오 카트 스타일 3인칭 백뷰
    let camOffset = new THREE.Vector3(0, 4, -12); // 카트 바로 뒤, 약간 위
    camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), playerKart.angle); // 카트 방향에 맞추어 회전

    // Lerp 카메라 
    let targetX = playerKart.mesh.position.x + camOffset.x;
    let targetY = playerKart.mesh.position.y + camOffset.y;
    let targetZ = playerKart.mesh.position.z + camOffset.z;

    camera.position.x += (targetX - camera.position.x) * 0.1;
    camera.position.y += (targetY - camera.position.y) * 0.1;
    camera.position.z += (targetZ - camera.position.z) * 0.1;

    // 살짝 앞 전방 주시
    let lookTarget = playerKart.mesh.position.clone();
    lookTarget.y += 1;
    lookTarget.add(new THREE.Vector3(Math.sin(playerKart.angle) * 10, 0, Math.cos(playerKart.angle) * 10));
    camera.lookAt(lookTarget);
}

function animate() {
    if (gameState === 'COUNTDOWN') {
        updateCamera();
    } else if (gameState === 'PLAYING') {
        karts.forEach(k => k.update());
        calculateRanks();
        updateCamera();
    }
    renderer.render(scene, camera);
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function endGame(title, msg) {
    gameState = 'GAME_OVER';
    ui.resultTitle.textContent = title;
    ui.resultDesc.textContent = msg;
    ui.gameOverScreen.classList.add('active');
}

window.onload = init3D;
