import * as THREE from 'three';

// --- Configuration ---
const FIELD_SIZE = 100;
const GOAL_WIDTH = 10;
const GOAL_HEIGHT = 5;
const GAME_TIME = 60;

// --- State Variables ---
let scene, camera, renderer, ball, goalkeeper;
let score = 0;
let combo = 0;
let bestCombo = 0;
let timeRemaining = GAME_TIME;
let gameState = 'START'; // START, PLAYING, OVER

let isShooting = false;
let ballVelocity = new THREE.Vector3();
let clock = new THREE.Clock();

// --- Initialization ---
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue
    scene.fog = new THREE.Fog(0x87ceeb, 20, 150);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, 20); // Shooting position
    camera.lookAt(0, 2, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    setupLighting();
    setupField();
    setupGoal();
    setupBall();
    setupGoalkeeper();
    setupEventListeners();

    animate();
}

function setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    sunLight.position.set(20, 50, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);
}

function setupField() {
    // Pitch (Grass)
    const grassGeo = new THREE.PlaneGeometry(FIELD_SIZE, FIELD_SIZE);
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x27ae60 });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.receiveShadow = true;
    scene.add(grass);

    // Pitch markings
    const circleGeo = new THREE.RingGeometry(5, 5.2, 32);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const centerCircle = new THREE.Mesh(circleGeo, lineMat);
    centerCircle.rotation.x = -Math.PI / 2;
    centerCircle.position.y = 0.01;
    scene.add(centerCircle);
}

function setupGoal() {
    const goalGroup = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

    // Posts
    const postGeo = new THREE.CylinderGeometry(0.15, 0.15, GOAL_HEIGHT);
    const postL = new THREE.Mesh(postGeo, frameMat);
    postL.position.set(-GOAL_WIDTH / 2, GOAL_HEIGHT / 2, 0);
    const postR = new THREE.Mesh(postGeo, frameMat);
    postR.position.set(GOAL_WIDTH / 2, GOAL_HEIGHT / 2, 0);

    // Crossbar
    const barGeo = new THREE.CylinderGeometry(0.15, 0.15, GOAL_WIDTH);
    const bar = new THREE.Mesh(barGeo, frameMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, GOAL_HEIGHT, 0);

    goalGroup.add(postL, postR, bar);
    goalGroup.position.z = -2; // Behind origin
    scene.add(goalGroup);
}

function setupBall() {
    const ballGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const ballMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    ball = new THREE.Mesh(ballGeo, ballMat);
    ball.castShadow = true;
    resetBall();
    scene.add(ball);
}

function setupGoalkeeper() {
    const gkGroup = new THREE.Group();
    const bodyGeo = new THREE.CapsuleGeometry(0.6, 1.5, 4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9 }); // Blue kit
    const keeper = new THREE.Mesh(bodyGeo, bodyMat);
    keeper.position.y = 1.25;
    keeper.castShadow = true;

    gkGroup.add(keeper);
    gkGroup.position.set(0, 0, -1.8);
    goalkeeper = gkGroup;
    scene.add(goalkeeper);
}

function setupEventListeners() {
    let startX, startY;
    window.addEventListener('mousedown', (e) => {
        if (gameState !== 'PLAYING' || isShooting) return;
        startX = e.clientX;
        startY = e.clientY;
    });

    window.addEventListener('mouseup', (e) => {
        if (gameState !== 'PLAYING' || isShooting || startX === undefined) return;
        const dx = (e.clientX - startX) * 0.02;
        const dy = (startY - e.clientY) * 0.02; // Upwards is positive

        if (dy > 1) shootBall(dx, dy);
    });

    document.getElementById('start-btn').onclick = () => {
        document.getElementById('overlay').classList.add('hidden');
        gameState = 'PLAYING';
        startTimer();
    };

    document.getElementById('restart-btn').onclick = () => location.reload();
    window.addEventListener('resize', onWindowResize);
}

function shootBall(dx, dy) {
    isShooting = true;
    ballVelocity.set(dx, dy, -10); // Shoot towards the goal
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
        updateGame();
    }

    renderer.render(scene, camera);
}

function updateGame() {
    // Goalkeeper AI (AI follows the ball horizontally)
    if (!isShooting) {
        goalkeeper.position.x += Math.sin(Date.now() * 0.005) * 0.05;
    } else {
        const targetX = Math.max(-GOAL_WIDTH / 2, Math.min(GOAL_WIDTH / 2, ball.position.x));
        goalkeeper.position.x += (targetX - goalkeeper.position.x) * 0.1;
    }

    // Ball movement
    if (isShooting) {
        ball.position.add(ballVelocity.clone().multiplyScalar(0.05));
        ballVelocity.y -= 0.15; // Gravity
        ball.rotation.x -= 0.2;

        checkCollision();
    }
}

function checkCollision() {
    // Out of bounds
    if (ball.position.y < 0.3 && ballVelocity.y < 0) {
        if (Math.abs(ball.position.x) < GOAL_WIDTH / 2 && ball.position.z < -2) {
            scoreGoal();
        } else {
            missGoal();
        }
    }

    // Hit the bar/posts
    if (Math.abs(ball.position.z + 1.8) < 0.5) {
        // Simple goalie save check
        const distToGK = ball.position.distanceTo(goalkeeper.position.clone().add(new THREE.Vector3(0, 1.5, 0)));
        if (distToGK < 2) {
            missGoal("SAVED!");
        }
    }
}

function scoreGoal() {
    score++;
    combo++;
    bestCombo = Math.max(bestCombo, combo);
    showPopup("GOAL!");
    resetBall();
}

function missGoal(msg = "MISS!") {
    combo = 0;
    showPopup(msg);
    resetBall();
}

function showPopup(text) {
    const box = document.getElementById('combo-box');
    box.textContent = text;
    box.classList.remove('hidden');
    setTimeout(() => { if (combo === 0) box.classList.add('hidden'); else box.textContent = `COMBO x${combo}`; }, 1000);
}

function resetBall() {
    isShooting = false;
    ball.position.set(0, 0.3, 10);
    ballVelocity.set(0, 0, 0);
    updateHUD();
}

function updateHUD() {
    document.getElementById('score-val').textContent = score;
    document.getElementById('time-val').textContent = timeRemaining;
    const comboVal = document.getElementById('combo-val');
    const comboBox = document.getElementById('combo-box');

    if (combo > 1) {
        comboBox.classList.remove('hidden');
        comboVal.textContent = combo;
    }
}

function gameOver() {
    gameState = 'OVER';
    document.getElementById('game-over').classList.remove('hidden');
    document.getElementById('final-score').textContent = score;
    document.getElementById('final-combo').textContent = bestCombo;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

init();
