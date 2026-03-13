let scene, camera, renderer, clock;
let player, enemies = [], projectiles = [];
let joystickBase, joystickStick;
let moveDir = new THREE.Vector3();
let isJoyactive = false;
let joyCenter = { x: 0, y: 0 };

let playerStats = {
    maxHp: 4500,
    hp: 4500,
    ammo: 3,
    maxAmmo: 3,
    ammoTimer: 0,
    superCharge: 0,
    maxSuperCharge: 100,
    speed: 16
};

const TEAM_BLUE = 0;
const TEAM_RED = 1;

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa8e6cf);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 45, 25);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    clock = new THREE.Clock();

    setupLights();
    createMap();
    createPlayer();
    spawnEnemies();
    setupControls();

    window.addEventListener('resize', onWindowResize, false);

    animate();
}

function setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 40, 20);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
}

function createMap() {
    // Floor
    const floorGeo = new THREE.PlaneGeometry(100, 100);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x81c784 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Obstacles
    for (let i = 0; i < 20; i++) {
        const type = Math.random() > 0.5 ? 'wall' : 'bush';
        const geo = type === 'wall' ? new THREE.BoxGeometry(4, 4, 4) : new THREE.SphereGeometry(3, 10, 10);
        const mat = new THREE.MeshStandardMaterial({
            color: type === 'wall' ? 0x9c27b0 : 0x2e7d32,
            transparent: type === 'bush' ? true : false,
            opacity: type === 'bush' ? 0.6 : 1
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(
            (Math.random() - 0.5) * 70,
            type === 'wall' ? 2 : 1.5,
            (Math.random() - 0.5) * 70
        );
        mesh.userData.type = type;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
    }
}

function createPlayer() {
    // Shelly-like Brawler model
    const group = new THREE.Group();

    // Body (Cylinder for clothes)
    const bodyGeo = new THREE.CylinderGeometry(1, 1.2, 2.5, 12);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x673ab7 }); // Purple shirt
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.25;
    group.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.9, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac }); // Skin tone
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 3;
    group.add(head);

    // Hair (Shelly's purple hair)
    const hairGeo = new THREE.SphereGeometry(1, 16, 16);
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x4a148c });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 3.2;
    hair.scale.set(1.1, 0.8, 1.1);
    group.add(hair);

    // Gun
    const gunGeo = new THREE.BoxGeometry(0.5, 0.5, 2);
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const gun = new THREE.Mesh(gunGeo, gunMat);
    gun.position.set(1.2, 2, 0.8);
    group.add(gun);

    group.userData.team = TEAM_BLUE;
    scene.add(group);
    player = group;
}

function spawnEnemies() {
    for (let i = 0; i < 5; i++) {
        const enemy = createEnemyMesh();
        enemy.position.set(
            (Math.random() - 0.5) * 60,
            0,
            -30 - Math.random() * 20
        );
        enemy.userData = {
            team: TEAM_RED,
            hp: 3600,
            maxHp: 3600,
            lastAttack: 0,
            attackRate: 1.5,
            target: player
        };
        scene.add(enemy);
        enemies.push(enemy);
    }
}

function createEnemyMesh() {
    const group = new THREE.Group();

    // Robot Enemy (like Brawl Stars bots)
    const bodyGeo = new THREE.BoxGeometry(2, 2.5, 2);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf44336 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.25;
    group.add(body);

    const headGeo = new THREE.BoxGeometry(1.2, 1, 1.2);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x212121 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 3;
    group.add(head);

    // Red eye
    const eyeGeo = new THREE.BoxGeometry(0.8, 0.2, 0.2);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000 });
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(0, 3, 0.6);
    group.add(eye);

    return group;
}

// ... (Rest of the controls and game logic remains similar, but updated for classic feel)

function setupControls() {
    joystickBase = document.getElementById('joystick-base');
    joystickStick = document.getElementById('joystick-stick');

    const container = document.getElementById('joystick-container');

    container.addEventListener('touchstart', handleJoyStart, false);
    container.addEventListener('touchmove', handleJoyMove, false);
    container.addEventListener('touchend', handleJoyEnd, false);

    document.getElementById('shoot-btn').addEventListener('touchstart', shootProjectiles);
    document.getElementById('super-btn').addEventListener('touchstart', useSuper);

    window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyW') moveDir.z = -1;
        if (e.code === 'KeyS') moveDir.z = 1;
        if (e.code === 'KeyA') moveDir.x = -1;
        if (e.code === 'KeyD') moveDir.x = 1;
        if (e.code === 'Space') shootProjectiles();
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'KeyW' || e.code === 'KeyS') moveDir.z = 0;
        if (e.code === 'KeyA' || e.code === 'KeyD') moveDir.x = 0;
    });
}

function handleJoyStart(e) {
    isJoyactive = true;
    const rect = joystickBase.getBoundingClientRect();
    joyCenter.x = rect.left + rect.width / 2;
    joyCenter.y = rect.top + rect.height / 2;
}

function handleJoyMove(e) {
    if (!isJoyactive) return;
    e.preventDefault();
    const touch = e.touches[0];

    const dx = touch.clientX - joyCenter.x;
    const dy = touch.clientY - joyCenter.y;

    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), 50);
    const angle = Math.atan2(dy, dx);

    const moveX = Math.cos(angle) * dist;
    const moveY = Math.sin(angle) * dist;

    joystickStick.style.transform = `translate(${moveX}px, ${moveY}px)`;

    moveDir.x = dx / 50;
    moveDir.z = dy / 50;
}

function handleJoyEnd() {
    isJoyactive = false;
    joystickStick.style.transform = 'translate(0, 0)';
    moveDir.set(0, 0, 0);
}

function shootProjectiles() {
    if (playerStats.ammo < 1) return;

    playerStats.ammo--;
    updateHUD();

    const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(player.quaternion);
    createProjectile(player.position.clone().add(new THREE.Vector3(0, 2, 0)), dir, TEAM_BLUE);
}

function useSuper() {
    if (playerStats.superCharge < playerStats.maxSuperCharge) return;

    playerStats.superCharge = 0;
    updateHUD();

    for (let i = -2; i <= 2; i++) {
        const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(player.quaternion);
        const axis = new THREE.Vector3(0, 1, 0);
        dir.applyAxisAngle(axis, i * 0.3);
        createProjectile(player.position.clone().add(new THREE.Vector3(0, 2, 0)), dir, TEAM_BLUE, true);
    }
}

function createProjectile(pos, dir, team, isSuper = false) {
    const geo = isSuper ? new THREE.SphereGeometry(0.8, 8, 8) : new THREE.SphereGeometry(0.4, 8, 8);
    const mat = new THREE.MeshStandardMaterial({
        color: isSuper ? 0xffff00 : (team === TEAM_BLUE ? 0x00ffff : 0xff3300),
        emissive: isSuper ? 0xffaa00 : 0x000000
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.userData = {
        dir: dir.multiplyScalar(0.9),
        team: team,
        damage: isSuper ? 1500 : 900,
        life: 60
    };
    scene.add(mesh);
    projectiles.push(mesh);
}

function updateHUD() {
    document.getElementById('player-health-bar').style.width = `${(playerStats.hp / playerStats.maxHp) * 100}%`;
    document.getElementById('player-health-text').innerText = `${Math.ceil(playerStats.hp)} / ${playerStats.maxHp}`;

    const ads = document.querySelectorAll('.ammo-slot');
    ads.forEach((slot, i) => {
        if (i < Math.floor(playerStats.ammo)) slot.classList.add('active');
        else slot.classList.remove('active');
    });

    const superBtn = document.getElementById('super-btn');
    const chargeBar = document.getElementById('super-charge-bar');
    const chargePercent = (playerStats.superCharge / playerStats.maxSuperCharge) * 100;
    chargeBar.style.height = `${chargePercent}%`;

    if (chargePercent >= 100) {
        superBtn.classList.remove('super-locked');
    } else {
        superBtn.classList.add('super-locked');
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // Player Move
    if (moveDir.length() > 0.05) {
        const moveVec = moveDir.clone().normalize().multiplyScalar(playerStats.speed * delta);
        player.position.add(moveVec);

        const angle = Math.atan2(moveDir.x, moveDir.z);
        player.rotation.y = angle;
    }

    // Camera Follow
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, player.position.x, 0.1);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, player.position.z + 25, 0.1);

    // Ammo Recharge
    if (playerStats.ammo < playerStats.maxAmmo) {
        playerStats.ammo += delta * 0.6;
        updateHUD();
    }

    // Projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.position.add(p.userData.dir);
        p.userData.life--;

        if (p.userData.team === TEAM_BLUE) {
            enemies.forEach(e => {
                if (p.position.distanceTo(e.position.clone().add(new THREE.Vector3(0, 1.5, 0))) < 2.5) {
                    e.userData.hp -= p.userData.damage;
                    p.userData.life = 0;
                    playerStats.superCharge = Math.min(playerStats.superCharge + 15, 100);
                    updateHUD();
                }
            });
        } else {
            if (p.position.distanceTo(player.position.clone().add(new THREE.Vector3(0, 1.5, 0))) < 2) {
                playerStats.hp -= p.userData.damage;
                p.userData.life = 0;
                updateHUD();
            }
        }

        if (p.userData.life <= 0) {
            scene.remove(p);
            projectiles.splice(i, 1);
        }
    }

    // Enemy AI
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (e.userData.hp <= 0) {
            scene.remove(e);
            enemies.splice(i, 1);
            continue;
        }

        const dist = e.position.distanceTo(player.position);
        if (dist < 35) {
            const dir = player.position.clone().sub(e.position).normalize();
            if (dist > 8) e.position.add(dir.clone().multiplyScalar(0.08));
            e.lookAt(player.position.x, 0, player.position.z);

            if (Date.now() - e.userData.lastAttack > e.userData.attackRate * 1000) {
                createProjectile(e.position.clone().add(new THREE.Vector3(0, 2, 0)), dir.clone(), TEAM_RED);
                e.userData.lastAttack = Date.now();
            }
        }
    }

    if (playerStats.hp <= 0) {
        document.getElementById('game-over').classList.remove('hidden');
        document.getElementById('result-text').innerText = "DEFEAT...";
    } else if (enemies.length === 0) {
        document.getElementById('game-over').classList.remove('hidden');
        document.getElementById('result-text').innerText = "VICTORY!";
    }

    renderer.render(scene, camera);
}

init();
