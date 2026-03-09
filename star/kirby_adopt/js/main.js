// js/main.js

const ui = {
    moneyCount: document.getElementById('money-count'),
    petCount: document.getElementById('pet-count'),
    buyEggBtn: document.getElementById('buy-egg-btn'),
    hatchingScreen: document.getElementById('hatching-screen'),
    revealScreen: document.getElementById('pet-reveal-screen'),
    revealTitle: document.getElementById('reveal-title'),
    closeRevealBtn: document.getElementById('close-reveal-btn')
};

let money = 500;
let pets = [];
let isHatching = false;

// Three.js Variables
let scene, camera, renderer, player;
const keys = { w: false, a: false, s: false, d: false };
const speed = 0.2;

function init3D() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe0f7fa); // 스카이블루
    scene.fog = new THREE.FogExp2(0xe0f7fa, 0.02);

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
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 500;
    dirLight.shadow.camera.left = -50;
    dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = -50;
    scene.add(dirLight);

    // Ground (잔디)
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x81c784 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Scenery (나무 몇 개)
    for (let i = 0; i < 30; i++) {
        createTree((Math.random() - 0.5) * 150, (Math.random() - 0.5) * 150);
    }

    // Player (Pink Kirby-like blob)
    const playerGeo = new THREE.SphereGeometry(1, 32, 32);
    const playerMat = new THREE.MeshLambertMaterial({ color: 0xff80ab });
    player = new THREE.Mesh(playerGeo, playerMat);
    player.position.y = 1;
    player.castShadow = true;
    scene.add(player);

    // Camera initial position
    camera.position.set(0, 5, 10);
    camera.lookAt(player.position);

    // Controls
    window.addEventListener('keydown', (e) => {
        if (keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = true;
    });
    window.addEventListener('keyup', (e) => {
        if (keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = false;
    });
    window.addEventListener('resize', onResize);

    // UI Events
    ui.buyEggBtn.addEventListener('click', buyEgg);
    ui.closeRevealBtn.addEventListener('click', () => {
        ui.revealScreen.style.display = 'none';
    });

    // Start Loop
    renderer.setAnimationLoop(animate);
}

function createTree(x, z) {
    if (Math.abs(x) < 5 && Math.abs(z) < 5) return; // 시작지점 비움

    const trunkGeo = new THREE.CylinderGeometry(0.5, 0.7, 3);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5d4037 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, 1.5, z);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    scene.add(trunk);

    const leavesGeo = new THREE.DodecahedronGeometry(2);
    const leavesMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32 });
    const leaves = new THREE.Mesh(leavesGeo, leavesMat);
    leaves.position.set(x, 3.5, z);
    leaves.castShadow = true;
    scene.add(leaves);
}

function buyEgg() {
    if (isHatching) return;
    if (money < 100) {
        alert("돈이 부족합니다!");
        return;
    }

    money -= 100;
    ui.moneyCount.textContent = money;
    isHatching = true;

    // Show hatching animation
    ui.hatchingScreen.style.display = 'flex';

    // 3초 후 부화
    setTimeout(() => {
        ui.hatchingScreen.style.display = 'none';
        hatchEgg();
    }, 3000);
}

function hatchEgg() {
    isHatching = false;

    // 50% vs 50% chance
    const isDragon = Math.random() > 0.5;
    const petType = isDragon ? "전설 고대 드래곤" : "전설 유니콘";
    const petColor = isDragon ? 0xe53935 : 0xce93d8; // Red for Dragon, Purple for Unicorn

    // UI Reveal
    ui.revealTitle.textContent = `${petType} 펫 획득!`;
    ui.revealTitle.style.color = isDragon ? "#ff5252" : "#ea80fc";
    ui.revealScreen.style.display = 'flex';

    // 3D Pet Spawn (작은 구체 형태로 플레이어 뒤를 졸졸 따라다니게 함)
    const petGeo = new THREE.SphereGeometry(0.6, 16, 16);
    const petMat = new THREE.MeshLambertMaterial({ color: petColor });
    const pet = new THREE.Mesh(petGeo, petMat);
    pet.castShadow = true;

    // 플레이어 근처 소환
    pet.position.copy(player.position);
    pet.position.x += (Math.random() - 0.5) * 4;
    pet.position.z += (Math.random() - 0.5) * 4;

    scene.add(pet);

    // 장식 (드래곤은 뿔, 유니콘은 하나의 큰 뿔)
    if (isDragon) {
        const horn1 = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4), new THREE.MeshBasicMaterial({ color: 0xffcc00 }));
        horn1.position.set(0.3, 0.5, 0);
        const horn2 = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4), new THREE.MeshBasicMaterial({ color: 0xffcc00 }));
        horn2.position.set(-0.3, 0.5, 0);
        pet.add(horn1); pet.add(horn2);
    } else {
        const uniHorn = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        uniHorn.position.set(0, 0.6, 0.3);
        uniHorn.rotation.x = Math.PI / 4;
        pet.add(uniHorn);
    }

    pets.push({
        mesh: pet,
        angleOffset: pets.length * (Math.PI / 2) // 원을 그리며 따라다니도록 각도 분산
    });

    ui.petCount.textContent = pets.length;
}

function updatePlayer() {
    let dx = 0; let dz = 0;
    if (keys.w) dz = -speed;
    if (keys.s) dz = speed;
    if (keys.a) dx = -speed;
    if (keys.d) dx = speed;

    if (dx !== 0 && dz !== 0) {
        dx *= 0.707;
        dz *= 0.707;
    }

    player.position.x += dx;
    player.position.z += dz;

    // 점프 애니메이션 (바운드)
    if (dx !== 0 || dz !== 0) {
        player.position.y = 1 + Math.abs(Math.sin(Date.now() * 0.01)) * 0.5;
    } else {
        player.position.y = 1;
    }

    // Camera follow
    camera.position.x = player.position.x;
    camera.position.z = player.position.z + 10;
    camera.lookAt(player.position);

    // Update Pets (따라오기 로직)
    const time = Date.now() * 0.002;
    pets.forEach((p, index) => {
        // 플레이어 주위를 공전하면서 따라옴
        const targetX = player.position.x + Math.cos(time + p.angleOffset) * 2.5;
        const targetZ = player.position.z + Math.sin(time + p.angleOffset) * 2.5;

        // 부드럽게 이동 (Lerp)
        p.mesh.position.x += (targetX - p.mesh.position.x) * 0.05;
        p.mesh.position.z += (targetZ - p.mesh.position.z) * 0.05;

        // 펫 통통 튀기
        if (dx !== 0 || dz !== 0) {
            p.mesh.position.y = 0.6 + Math.abs(Math.sin(time * 5 + index)) * 0.4;
        } else {
            p.mesh.position.y = 0.6;
        }
    });

    // 돈 자연 증가 (플레이 시간에 따른 보상)
    if (Math.random() < 0.01) {
        money += 5;
        ui.moneyCount.textContent = money;
    }
}

function animate() {
    if (!isHatching) {
        updatePlayer();
    }
    renderer.render(scene, camera);
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// 런타임 시작
window.onload = init3D;
