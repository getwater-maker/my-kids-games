// star/hospital_prank_3d/js/main.js

let scene, camera, renderer, controls;
let raycaster = new THREE.Raycaster();
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();

let chaos = 0;
let gameState = 'START';
let interactables = [];
let doctorObj;
let scoldingTimer = 0;
let scoldTriggered = false;

// UI
const chaosFill = document.getElementById('chaos-fill');
const winScreen = document.getElementById('win-screen');
const hud = document.getElementById('hud');

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f2f6);
    scene.fog = new THREE.Fog(0xf1f2f6, 10, 50);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = 1.6;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 0.5);
    sun.position.set(5, 10, 5);
    sun.castShadow = true;
    scene.add(sun);

    // Controls
    controls = new THREE.PointerLockControls(camera, document.body);

    document.getElementById('start-btn').onclick = () => {
        controls.lock();
    };

    controls.addEventListener('lock', () => {
        document.getElementById('intro-screen').classList.add('hidden');
        gameState = 'PLAYING';
    });

    createHospitalRoom();
    setupInput();
    animate();
}

function createHospitalRoom() {
    // Floor
    const floorGeo = new THREE.PlaneGeometry(30, 30);
    const floorMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Walls
    createWall(0, -15, 30, 4, 0.5, 0x81ecec); // Back
    createWall(-15, 0, 0.5, 4, 30, 0x81ecec); // Left
    createWall(15, 0, 0.5, 4, 30, 0x81ecec);  // Right

    // Items
    createInteractable('bed', 0, 0, -10, 0x00b894);
    createInteractable('wheelchair', -5, 0, -5, 0x2d3436);
    createInteractable('tv', 5, 2, -14, 0x0984e3);
    createInteractable('medicine', -2, 1, -8, 0xd63031);
    doctorObj = createInteractable('doctor', 8, 0, -5, 0xffffff);
}

function createWall(x, z, w, h, d, color) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshPhongMaterial({ color: color });
    const wall = new THREE.Mesh(geo, mat);
    wall.position.set(x, h / 2, z);
    scene.add(wall);
}

function createInteractable(type, x, y, z, color) {
    let geo;
    let group = new THREE.Group();

    if (type === 'bed') {
        geo = new THREE.BoxGeometry(2, 0.8, 4);
    } else if (type === 'wheelchair') {
        geo = new THREE.BoxGeometry(1, 1.2, 1);
    } else if (type === 'tv') {
        geo = new THREE.BoxGeometry(3, 2, 0.2);
    } else if (type === 'medicine') {
        geo = new THREE.CylinderGeometry(0.2, 0.2, 0.5);
    } else if (type === 'doctor') {
        geo = new THREE.CylinderGeometry(0.4, 0.4, 1.6);
    }

    const mat = new THREE.MeshPhongMaterial({ color: color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = (type === 'tv') ? 0 : geo.parameters.height / 2 || 0.5;
    if (type === 'doctor') mesh.position.y = 1;

    group.add(mesh);
    group.position.set(x, y, z);
    group.userData = { type: type, active: false };

    scene.add(group);
    interactables.push(group);
    return group;
}

function setupInput() {
    window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyW') moveForward = true;
        if (e.code === 'KeyS') moveBackward = true;
        if (e.code === 'KeyA') moveLeft = true;
        if (e.code === 'KeyD') moveRight = true;
    });
    window.addEventListener('keyup', (e) => {
        if (e.code === 'KeyW') moveForward = false;
        if (e.code === 'KeyS') moveBackward = false;
        if (e.code === 'KeyA') moveLeft = false;
        if (e.code === 'KeyD') moveRight = false;
    });
    window.addEventListener('mousedown', performPrank);
}

function performPrank() {
    if (gameState !== 'PLAYING') return;

    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(interactables, true);

    if (intersects.length > 0) {
        let target = intersects[0].object;
        while (target.parent && !target.userData.type) target = target.parent;

        if (target.userData.type && !target.userData.active) {
            triggerPrankEffect(target);
            chaos += 10;
            updateHUD();

            if (chaos >= 60 && !scoldTriggered) {
                triggerScolding();
            } else if (chaos >= 100) {
                triggerWin();
            }
        }
    }
}

function triggerScolding() {
    scoldTriggered = true;
    gameState = 'SCOLDING';
    scoldingTimer = performance.now();
    announce("👨‍⚕️ 의사: 야!! 너 정체가 뭐야! 여기서 뭐 하는 거야!!");

    // Doctor looks at player
    doctorObj.lookAt(camera.position.x, doctorObj.position.y, camera.position.z);
}

function triggerPrankEffect(obj) {
    obj.userData.active = true;
    const type = obj.userData.type;

    if (type === 'bed') {
        obj.rotation.x = Math.PI / 4;
        announce("📢 침대를 뒤집었습니다!");
    } else if (type === 'wheelchair') {
        obj.userData.speed = 0.5;
        announce("📢 휠체어를 발사했습니다!");
    } else if (type === 'tv') {
        obj.material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        announce("📢 TV를 고장냈습니다!");
    } else if (type === 'medicine') {
        obj.position.y += 2;
        announce("📢 약통을 던졌습니다!");
    } else if (type === 'doctor') {
        obj.rotation.z = Math.PI / 2;
        announce("📢 의사 선생님을 밀쳤습니다!");
    }
}

function announce(txt) {
    const m = document.getElementById('msg');
    m.textContent = txt;
}

function updateHUD() {
    chaosFill.style.width = chaos + '%';
}

function triggerWin() {
    gameState = 'WIN';
    controls.unlock();
    winScreen.classList.remove('hidden');
}

function updateMovement() {
    const activeStates = ['PLAYING', 'CHASE', 'SCOLDING'];
    if (!activeStates.includes(gameState)) return;

    const delta = 0.1;
    let currentSpeed = 100.0;

    // Slow down during scolding
    if (gameState === 'SCOLDING') currentSpeed = 20.0;

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    if (moveForward || moveBackward) velocity.z -= direction.z * currentSpeed * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * currentSpeed * delta;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
}

function updateAI() {
    if (gameState === 'SCOLDING') {
        const now = performance.now();
        if (now - scoldingTimer > 3000) {
            gameState = 'CHASE';
            announce("🏃‍♂️ 미친 의사: 거기 안 서!! 따라와!!");
        }
    }

    if (gameState === 'CHASE') {
        // Doctor follows player
        const dir = new THREE.Vector3().subVectors(camera.position, doctorObj.position);
        dir.y = 0;
        dir.normalize();
        doctorObj.position.add(dir.multiplyScalar(0.08));
        doctorObj.lookAt(camera.position.x, doctorObj.position.y, camera.position.z);

        if (doctorObj.position.distanceTo(camera.position) < 1.5) {
            triggerGameOver();
        }
    }

    // Update animated objects
    interactables.forEach(obj => {
        if (obj.userData.type === 'wheelchair' && obj.userData.speed) {
            obj.position.z -= obj.userData.speed;
            if (Math.abs(obj.position.z) > 15) obj.userData.speed = 0;
        }
    });
}

function triggerGameOver() {
    gameState = 'LOSE';
    announce("💀 의사 선생님께 잡혔습니다...");
    controls.unlock();
    setTimeout(() => location.reload(), 2000);
}

function animate() {
    requestAnimationFrame(animate);
    updateMovement();
    updateAI();
    renderer.render(scene, camera);
}

window.onload = init;
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
