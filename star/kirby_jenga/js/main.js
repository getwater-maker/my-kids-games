// js/main.js
let playerRole; // 'DESTROYER' or 'SURVIVOR'
let playerSurvivor = null;
const keys = { w: false, a: false, s: false, d: false, space: false };
let aiDestroyerTimer = 0;

const hud = {
    timerBox: document.getElementById('timer-box'),
    survCountBox: document.getElementById('survivor-count'),
    announcement: document.getElementById('announcement'),
    startScreen: document.getElementById('start-screen'),
    gameOverScreen: document.getElementById('game-over-screen'),
    resultTitle: document.getElementById('result-title'),
    resultDesc: document.getElementById('result-desc'),
    startBtn: document.getElementById('start-btn'),
    restartBtn: document.getElementById('restart-btn')
};

let gameState = 'START';
let timerInterval;
let roundTimer = 60;

// Three.js Setup
let scene, camera, renderer, raycaster, mouse;
// Cannon.js Setup
let world;
let blocks = []; // { mesh, body }
let survivors = []; // { mesh, body, isDead }
let survivorCount = 15;

const blockGeometries = [];
const blockMaterials = [];

function init3D() {
    // 1. Three.js Scene Setup (비주얼)
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    scene.fog = new THREE.Fog(0x87CEEB, 20, 100);

    // Camera
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    // 탑을 위에서 아래로 내려다보는 각도
    camera.position.set(20, 30, 20);
    camera.lookAt(0, 10, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(20, 50, 20);
    dirLight.castShadow = true;
    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;
    scene.add(dirLight);

    // 2. Cannon.js World Setup (물리)
    world = new CANNON.World();
    world.gravity.set(0, -9.82, 0); // 지구 중력
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 20; // 스태킹(탑 쌓기) 안정성 증가

    // Ground (바닥)
    // 3D Visual
    const planeGeo = new THREE.PlaneGeometry(100, 100);
    const planeMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32 }); // 잔디색
    const planeMesh = new THREE.Mesh(planeGeo, planeMat);
    planeMesh.rotation.x = -Math.PI / 2;
    planeMesh.receiveShadow = true;
    scene.add(planeMesh);

    // Physics
    const groundBody = new CANNON.Body({
        mass: 0, // 고정
        shape: new CANNON.Plane()
    });
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(groundBody);

    // 구멍(Escape Hole) 중심 표시 (원)
    const holeGeo = new THREE.CircleGeometry(4, 32);
    const holeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const holeMesh = new THREE.Mesh(holeGeo, holeMat);
    holeMesh.rotation.x = -Math.PI / 2;
    holeMesh.position.y = 0.01; // z-fighting 방지
    // 약간 옆에 배치
    holeMesh.position.x = 8;
    holeMesh.position.z = 8;
    scene.add(holeMesh);

    // Raycaster for clicking
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('mousedown', onMouseClick, false);

    // UI Input Setup
    hud.startBtn.addEventListener('click', startGame);
    hud.restartBtn.addEventListener('click', startGame);

    window.addEventListener('keydown', (e) => {
        let key = e.key.toLowerCase();
        if (key === ' ') key = 'space';
        if (keys.hasOwnProperty(key)) keys[key] = true;
    });
    window.addEventListener('keyup', (e) => {
        let key = e.key.toLowerCase();
        if (key === ' ') key = 'space';
        if (keys.hasOwnProperty(key)) keys[key] = false;
    });

    // Animate Loop
    requestAnimationFrame(animate);
}

function createJengaTower() {
    // 블록 크기 (가로, 세로, 높이) - 캐논과 쓰리js는 반지름(절반) 사용기준이 다름을 주의
    // Jenga block 비율: 가로가 세로의 3배
    const bw = 1.5; // 폭 (width, halfExtents)
    const bh = 0.5; // 높이 (height, halfExtents)
    const bd = 4.5; // 깊이/길이 (depth, halfExtents)

    const blockHeightOffset = bh * 2; // 한 층의 높이 = 1.0

    const levels = 15;
    const blocksPerLevel = 3;

    for (let i = 0; i < levels; i++) {
        let y = i * blockHeightOffset + bh; // 중심 y축
        // 홀수/짝수 층 교차
        let isRotated = i % 2 !== 0;

        for (let j = 0; j < blocksPerLevel; j++) {
            let offset = (j - 1) * (bw * 2.1); // 블록 간 간격 살짝
            let x = isRotated ? 0 : offset;
            let z = isRotated ? offset : 0;

            // Visual
            const geo = new THREE.BoxGeometry(bw * 2, bh * 2, bd * 2);
            const mat = new THREE.MeshLambertMaterial({ color: 0x8d6e63 }); // 나무 색
            const mesh = new THREE.Mesh(geo, mat);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.position.set(x, y, z);
            if (isRotated) {
                mesh.rotation.y = Math.PI / 2;
            }
            scene.add(mesh);

            // Physics (halfExtents)
            const shape = new CANNON.Box(new CANNON.Vec3(bw, bh, bd));
            const body = new CANNON.Body({ mass: 1 }); // 질량 1
            body.addShape(shape);
            body.position.set(x, y, z);
            if (isRotated) {
                body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2);
            }
            world.addBody(body);

            blocks.push({ mesh, body, type: 'block' });
        }
    }
}

function spawnSurvivors() {
    survivors = [];
    survivorCount = 15;
    hud.survCountBox.textContent = survivorCount;

    // 맨 윗층(y=15 * 1.0) 부근에 랜덤 생성
    const topY = 16;
    for (let i = 0; i < 15; i++) {
        const radius = 0.4;
        const isPlayer = (playerRole === 'SURVIVOR' && i === 0);

        // Visual (Kirby Sphere)
        const geo = new THREE.SphereGeometry(radius, 16, 16);
        const mat = new THREE.MeshLambertMaterial({ color: isPlayer ? 0xffeb3b : 0xff80ab }); // Player is Yellow
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;

        let x = (Math.random() - 0.5) * 6;
        let z = (Math.random() - 0.5) * 6;
        let y = topY + i * 1.5; // 탑 위쪽 공중에 흩뿌림

        mesh.position.set(x, y, z);
        scene.add(mesh);

        // Physics (Sphere)
        const shape = new CANNON.Sphere(radius);
        const body = new CANNON.Body({
            mass: isPlayer ? 2 : 0.5, // 플레이어는 약간 무겁게 (덜 잘 날아가게)
            shape: shape,
            linearDamping: 0.5 // 구르는 속도 감쇄
        });
        body.position.set(x, y, z);
        world.addBody(body);

        let sObj = { mesh, body, isDead: false, type: 'survivor', isPlayer: isPlayer };
        survivors.push(sObj);

        if (isPlayer) playerSurvivor = sObj;
    }
}


function clearWorld() {
    // 씬과 물리엔진에서 기존 오브젝트 삭제
    blocks.forEach(b => {
        scene.remove(b.mesh);
        world.remove(b.body);
    });
    blocks = [];

    survivors.forEach(s => {
        scene.remove(s.mesh);
        world.remove(s.body);
    });
    survivors = [];
}

function startGame() {
    gameState = 'PLAYING';
    hud.startScreen.classList.remove('active');
    hud.gameOverScreen.classList.remove('active');

    // Random role (20% 확률로 파괴자. 생존자가 더 재밌을 수 있으나 균등하게 해도 무방)
    playerRole = Math.random() < 0.3 ? 'DESTROYER' : 'SURVIVOR';

    // Announce role
    if (playerRole === 'DESTROYER') {
        hud.announcement.textContent = "역할: 파괴자! 다 부수세요!";
        hud.announcement.style.color = "#ff1744";
    } else {
        hud.announcement.textContent = "역할: 생존자(노란 커비)! 버티세요!";
        hud.announcement.style.color = "#ffeb3b";
    }
    hud.announcement.style.opacity = 1;
    setTimeout(() => { hud.announcement.style.opacity = 0; }, 3000);

    clearWorld();
    createJengaTower();
    spawnSurvivors();

    roundTimer = 60;
    hud.timerBox.textContent = roundTimer;
    aiDestroyerTimer = 0;

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (gameState === 'PLAYING') {
            roundTimer--;
            hud.timerBox.textContent = roundTimer;

            if (roundTimer <= 0) {
                if (playerRole === 'DESTROYER') {
                    endGame("파괴자 패배...", "시간 초과! 탈출하지 않은 생존자가 버텨냈습니다.");
                } else {
                    endGame("생존자 승리!", "시간 초과! 무사히 버텨냈습니다.");
                }
            }
        }
    }, 1000);
}

function onWindowResize() {
    if (!camera) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseClick(event) {
    if (gameState !== 'PLAYING') return;
    if (playerRole !== 'DESTROYER') return; // 생존자는 클릭으로 블록을 부술 수 없음

    // 마우스 좌표 정규화 (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // 블록 메쉬들만 필터링
    const interactables = blocks.map(b => b.mesh);
    const intersects = raycaster.intersectObjects(interactables);

    if (intersects.length > 0) {
        // 클릭한 블록 제거
        const hitMesh = intersects[0].object;
        const blockIndex = blocks.findIndex(b => b.mesh === hitMesh);

        if (blockIndex !== -1) {
            const b = blocks[blockIndex];
            scene.remove(b.mesh);
            world.remove(b.body);
            blocks.splice(blockIndex, 1);
        }
    }
}

function updatePhysics() {
    // Step the physics world (60hz)
    world.step(1 / 60);

    // Sync rendering with physics
    blocks.forEach(b => {
        b.mesh.position.copy(b.body.position);
        b.mesh.quaternion.copy(b.body.quaternion);
    });

    let currentAlive = 0;

    survivors.forEach(s => {
        if (s.isDead) return;

        s.mesh.position.copy(s.body.position);
        s.mesh.quaternion.copy(s.body.quaternion);

        // AI 또는 Player 행동
        let dx = 8 - s.body.position.x;
        let dz = 8 - s.body.position.z;
        let dist = Math.sqrt(dx * dx + dz * dz);

        if (s.isPlayer) {
            // Player controls relative to camera's forward direction
            let px = 0, pz = 0;
            if (keys.w) pz = -1;
            if (keys.s) pz = 1;
            if (keys.a) px = -1;
            if (keys.d) px = 1;

            if (px !== 0 || pz !== 0) {
                // Determine camera angle relative to Y
                let angle = Math.atan2(camera.position.x - s.body.position.x, camera.position.z - s.body.position.z);
                let moveX = px * Math.cos(angle) + pz * Math.sin(angle);
                let moveZ = -px * Math.sin(angle) + pz * Math.cos(angle);

                s.body.applyForce(new CANNON.Vec3(moveX * 8, 0, moveZ * 8), s.body.position);
            }
            if (keys.space) {
                if (Math.abs(s.body.velocity.y) < 0.5) {
                    s.body.velocity.y = 8; // Jump
                }
            }
        } else {
            // AI
            if (s.body.position.y < 2) {
                s.body.applyForce(new CANNON.Vec3(dx * 2, 0, dz * 2), s.body.position);
            } else {
                s.body.applyForce(new CANNON.Vec3(dx * 0.1, 0, dz * 0.1), s.body.position);
            }
        }

        // 구멍 탈출 (y<2 이고 거리 4이하)
        if (s.body.position.y < 2 && dist < 4) {
            s.isDead = true;
            scene.remove(s.mesh);
            world.remove(s.body);
            if (s.isPlayer) {
                endGame("탈출 성공!", "무사히 구멍으로 빠져나왔습니다!");
            } else if (playerRole === 'DESTROYER') {
                endGame("파괴자 패배...", "생존자가 구멍으로 탈출했습니다!");
            }
        }

        // 낙사 (맵 바깥)
        if (s.body.position.y < -5 || Math.abs(s.body.position.x) > 30 || Math.abs(s.body.position.z) > 30) {
            s.isDead = true;
            scene.remove(s.mesh);
            world.remove(s.body);
            if (s.isPlayer) {
                endGame("생존자 사망...", "탑에서 떨어져 죽었습니다.");
            }
        }

        if (!s.isDead) currentAlive++;
    });

    if (survivorCount !== currentAlive) {
        survivorCount = currentAlive;
        hud.survCountBox.textContent = survivorCount;

        if (survivorCount <= 0 && gameState === 'PLAYING') {
            if (playerRole === 'DESTROYER') {
                endGame("파괴자 승리!", "모든 생존자 커비가 젠가 탑에서 튕겨져 나갔습니다!");
            } else if (playerRole === 'SURVIVOR') {
                endGame("생존자 사망...", "당신을 포함한 모든 생존자가 떨어졌습니다.");
            }
        }
    }

    // AI Destroyer (if player is SURVIVOR)
    if (playerRole === 'SURVIVOR') {
        aiDestroyerTimer++;
        if (aiDestroyerTimer > 60 * 2) { // 매 2초마다
            aiDestroyerTimer = 0;
            if (blocks.length > 0) {
                // 가급적 아래쪽(y<13) 블록 선호
                let pool = blocks.filter(b => b.body.position.y < 13);
                if (pool.length === 0) pool = blocks;

                let idx = Math.floor(Math.random() * pool.length);
                let target = pool[idx];

                let bIdx = blocks.indexOf(target);
                if (bIdx !== -1) {
                    // 블록을 하늘로 없애면서 강한 힘을 주어 날림 (시각적 효과)
                    world.remove(target.body);
                    scene.remove(target.mesh);
                    blocks.splice(bIdx, 1);
                }
            }
        }
    }

    // Camera Logic
    if (playerRole === 'DESTROYER') {
        let time = Date.now() * 0.0005;
        camera.position.x = Math.sin(time) * 35;
        camera.position.z = Math.cos(time) * 35;
        camera.lookAt(0, 5, 0);
    } else {
        if (playerSurvivor && !playerSurvivor.isDead) {
            // Player 따라가기
            let targetX = playerSurvivor.body.position.x;
            let targetY = playerSurvivor.body.position.y;
            let targetZ = playerSurvivor.body.position.z;

            // 살짝 뒤에서 비스듬히 내려다보는 고정 캠
            camera.position.x += ((targetX) - camera.position.x) * 0.1;
            camera.position.y += ((targetY + 12) - camera.position.y) * 0.1;
            camera.position.z += ((targetZ + 15) - camera.position.z) * 0.1;
            camera.lookAt(targetX, targetY - 2, targetZ);
        }
    }
}

function endGame(title, desc) {
    if (gameState !== 'PLAYING') return;
    gameState = 'GAME_OVER';
    clearInterval(timerInterval);

    hud.resultTitle.textContent = title;
    hud.resultDesc.textContent = desc;
    hud.gameOverScreen.classList.add('active');
}

function animate() {
    requestAnimationFrame(animate);

    if (gameState === 'PLAYING') {
        updatePhysics();
    }

    // 바닥 구멍을 렌더링하기위해 Scene 렌더
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// 부트스트랩
window.onload = init3D;
