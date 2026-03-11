// js/main.js

let scene, camera, renderer, clock;
let character, rope, ground;
let gameState = 'START';
let score = 0;
let bestScore = localStorage.getItem('jumpRopeBest') || 0;
let ropeAngle = 0;
let ropeSpeed = 0.05;
let charVelocityY = 0;
let isJumping = false;
let canClick = true;

const ui = {
    start: document.getElementById('start-overlay'),
    gameOver: document.getElementById('game-over-overlay'),
    score: document.getElementById('score'),
    best: document.getElementById('best-score')
};

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0b1e);
    scene.fog = new THREE.Fog(0x0a0b1e, 10, 50);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, 10);
    camera.lookAt(0, 1.5, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    clock = new THREE.Clock();

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0x00d2ff, 1.0);
    sun.position.set(5, 10, 5);
    sun.castShadow = true;
    scene.add(sun);

    const point = new THREE.PointLight(0xff007f, 2, 20);
    point.position.set(-5, 5, 2);
    scene.add(point);

    createWorld();
    setupInput();
    ui.best.textContent = bestScore;

    animate();
}

function createWorld() {
    // Ground
    const groundGeo = new THREE.PlaneGeometry(100, 100);
    const groundMat = new THREE.MeshPhongMaterial({
        color: 0x111122,
        emissive: 0x001122,
        specular: 0x00d2ff,
        shininess: 50
    });
    ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid helper for "cyber" look
    const grid = new THREE.GridHelper(100, 50, 0xff007f, 0x111122);
    grid.position.y = 0.01;
    scene.add(grid);

    // Character (Simplified human)
    const charGroup = new THREE.Group();

    // Body
    const bodyGeo = new THREE.BoxGeometry(0.8, 1.5, 0.5);
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0x00d2ff });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.2;
    body.castShadow = true;
    charGroup.add(body);

    // Head
    const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const headMat = new THREE.MeshPhongMaterial({ color: 0xffccbc });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2.3;
    charGroup.add(head);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.3, 1.2, 0.3);
    const armL = new THREE.Mesh(armGeo, bodyMat);
    armL.position.set(-0.6, 1.3, 0);
    charGroup.add(armL);
    const armR = new THREE.Mesh(armGeo, bodyMat);
    armR.position.set(0.6, 1.3, 0);
    charGroup.add(armR);

    character = charGroup;
    scene.add(character);

    // Rope
    // Let's make the rope using a curve that rotates around the character
    const curvePoints = [];
    for (let i = 0; i <= 20; i++) {
        const p = i / 20;
        const x = -3 + p * 6;
        const y = Math.sin(p * Math.PI) * 4;
        curvePoints.push(new THREE.Vector3(x, y, 0));
    }
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const ropeGeo = new THREE.TubeGeometry(curve, 32, 0.08, 8, false);
    const ropeMat = new THREE.MeshPhongMaterial({ color: 0xff007f, emissive: 0xff007f, emissiveIntensity: 2 });
    rope = new THREE.Mesh(ropeGeo, ropeMat);
    scene.add(rope);
}

function setupInput() {
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') jump();
    });
    window.addEventListener('mousedown', () => jump());

    document.getElementById('start-btn').onclick = () => startGame();
    document.getElementById('restart-btn').onclick = () => startGame();
}

function jump() {
    if (gameState !== 'PLAYING' || isJumping) return;
    charVelocityY = 0.22;
    isJumping = true;
}

function startGame() {
    gameState = 'PLAYING';
    score = 0;
    ropeSpeed = 0.05;
    ropeAngle = 0;
    ui.score.textContent = "0";
    ui.start.classList.add('hidden');
    ui.gameOver.classList.add('hidden');
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (gameState === 'PLAYING') {
        const lastAngle = ropeAngle;
        ropeAngle += ropeSpeed;

        // Position rope (Rotate its group around X axis)
        rope.rotation.x = ropeAngle;

        // Character physics
        if (isJumping) {
            charVelocityY -= 0.01; // Gravity
            character.position.y += charVelocityY;

            if (character.position.y <= 0) {
                character.position.y = 0;
                isJumping = false;
                charVelocityY = 0;
            }
        }

        // Collision Check
        // The bottom of the rope is at ropeAngle = PI (roughly)
        // We check if it passed from < PI to > PI
        const target = Math.PI;
        const normalizedLast = lastAngle % (Math.PI * 2);
        const normalizedCurrent = ropeAngle % (Math.PI * 2);

        if (normalizedLast < target && normalizedCurrent >= target) {
            // Check if character is high enough (jumped)
            if (character.position.y < 0.5) {
                endGame();
            } else {
                // Success!
                score++;
                ui.score.textContent = score;
                ropeSpeed += 0.002; // Gradually faster

                // Visual feedback
                if (score > bestScore) {
                    bestScore = score;
                    localStorage.setItem('jumpRopeBest', bestScore);
                    ui.best.textContent = bestScore;
                }
            }
        }

        // Subtle camera zoom/shake based on score can go here
    }

    renderer.render(scene, camera);
}

function endGame() {
    gameState = 'GAMEOVER';
    ui.gameOver.classList.remove('hidden');
    document.getElementById('final-stats').textContent = `최종 기록: ${score}회`;
}

window.onload = init;
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
