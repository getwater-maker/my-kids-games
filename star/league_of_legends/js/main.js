// star/league_of_legends/js/main.js

const CONFIG = {
    champSpeed: 10.0,
    cameraAngle: 60,
    mapWidth: 200,
    mapHeight: 200,
};

let scene, camera, renderer, clock;
let gameState = 'START';
let player, minions = [], targets = [];
let targetPos = new THREE.Vector3();
let currentTarget = null;

let playerStats = {
    health: 100,
    maxHealth: 100,
    mana: 50,
    maxMana: 50,
    level: 1,
};

const abilities = {
    Q: { cooldown: 3, lastUsed: 0, manaCost: 10, color: 0x34dbeb },
    W: { cooldown: 5, lastUsed: 0, manaCost: 15, color: 0xeb34e2 },
    E: { cooldown: 8, lastUsed: 0, manaCost: 20, color: 0xebdb34 },
    R: { cooldown: 12, lastUsed: 0, manaCost: 30, color: 0xeb3434 },
};

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1a1a);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 60, 40);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    clock = new THREE.Clock();

    setupLights();
    createMap();
    createChampion();
    spawnMinions();

    setupEventListeners();
    animate();
}

function setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(50, 100, 50);
    sun.castShadow = true;
    scene.add(sun);
}

function createMap() {
    // Ground
    const groundGeo = new THREE.PlaneGeometry(CONFIG.mapWidth, CONFIG.mapHeight);
    const groundMat = new THREE.MeshPhongMaterial({ color: 0x1a2e1a });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Towers (Simplified)
    createTower(-30, -30, 'Blue');
    createTower(30, 30, 'Red');
}

function createTower(x, z, team) {
    const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2, 3, 8), new THREE.MeshPhongMaterial({ color: 0x444444 }));
    base.position.y = 4;
    group.add(base);

    const jewel = new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshPhongMaterial({ color: team === 'Blue' ? 0x00aaff : 0xff0000 }));
    jewel.position.y = 10;
    group.add(jewel);

    group.position.set(x, 0, z);
    scene.add(group);
}

function createChampion() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(1, 2), new THREE.MeshPhongMaterial({ color: 0x00ff88 }));
    body.position.y = 1.5;
    group.add(body);

    const ring = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.4, 32), new THREE.MeshBasicMaterial({ color: 0x00ff88, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.1;
    group.add(ring);

    player = group;
    scene.add(player);
    targetPos.copy(player.position);
}

function spawnMinions() {
    for (let i = 0; i < 5; i++) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), new THREE.MeshPhongMaterial({ color: 0xff4444 }));
        m.position.set(30 + Math.random() * 10, 0.75, 30 + Math.random() * 10);
        m.health = 50;
        m.maxHealth = 50;
        minions.push(m);
        targets.push(m);
        scene.add(m);
    }
}

function setupEventListeners() {
    // Right Click to move
    window.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        handleMouseClick(e);
    });

    // Keys for abilities
    window.addEventListener('keydown', (e) => {
        const key = e.key.toUpperCase();
        if (abilities[key]) useAbility(key);
        if (key === 'S') targetPos.copy(player.position);
    });
}

function handleMouseClick(event) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        const hit = intersects[0];

        // Check if hit a target
        let hitTarget = minions.find(m => m === hit.object || m.children.includes(hit.object));
        if (hitTarget) {
            currentTarget = hitTarget;
            showTargetHUD(hitTarget);
        } else {
            targetPos.copy(hit.point);
            targetPos.y = 0;
            spawnClickVisual(targetPos);
        }
    }
}

function spawnClickVisual(pos) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.7, 32), new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(pos);
    ring.position.y = 0.2;
    scene.add(ring);

    let scale = 1;
    const anim = () => {
        scale += 0.05;
        ring.scale.set(scale, scale, 1);
        ring.material.opacity -= 0.05;
        if (ring.material.opacity > 0) requestAnimationFrame(anim);
        else scene.remove(ring);
    };
    anim();
}

function useAbility(key) {
    const now = clock.getElapsedTime();
    const ability = abilities[key];

    if (now - ability.lastUsed > ability.cooldown && playerStats.mana >= ability.manaCost) {
        ability.lastUsed = now;
        playerStats.mana -= ability.manaCost;

        // Effect visual
        const effect = new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshBasicMaterial({ color: ability.color, transparent: true }));
        effect.position.copy(player.position);
        scene.add(effect);

        let s = 1;
        const anim = () => {
            s += 0.5;
            effect.scale.set(s, s, s);
            effect.material.opacity -= 0.05;
            if (effect.material.opacity > 0) requestAnimationFrame(anim);
            else scene.remove(effect);
        };
        anim();

        // Damage target if near
        if (currentTarget && player.position.distanceTo(currentTarget.position) < 15) {
            currentTarget.health -= 25;
            updateTargetHUD();
            if (currentTarget.health <= 0) {
                scene.remove(currentTarget);
                minions = minions.filter(m => m !== currentTarget);
                currentTarget = null;
                document.getElementById('target-info').classList.add('hidden');
            }
        }
    }
}

function showTargetHUD(target) {
    const hud = document.getElementById('target-info');
    hud.classList.remove('hidden');
    updateTargetHUD();
}

function updateTargetHUD() {
    if (!currentTarget) return;
    const fill = document.getElementById('target-health-fill');
    fill.style.width = `${(currentTarget.health / currentTarget.maxHealth) * 100}%`;
}

function updateHUD() {
    document.getElementById('player-health-fill').style.width = `${(playerStats.health / playerStats.maxHealth) * 100}%`;
    document.getElementById('player-mana-fill').style.width = `${(playerStats.mana / playerStats.maxMana) * 100}%`;
    document.getElementById('health-text').textContent = `${Math.ceil(playerStats.health)} / ${playerStats.maxHealth}`;
    document.getElementById('mana-text').textContent = `${Math.ceil(playerStats.mana)} / ${playerStats.maxMana}`;

    // Cooldowns
    const now = clock.getElapsedTime();
    Object.keys(abilities).forEach(key => {
        const ability = abilities[key];
        const elapsed = now - ability.lastUsed;
        const progress = Math.min(1, elapsed / ability.cooldown);
        const overlay = document.querySelector(`#slot-${key.toLowerCase()} .cooldown-overlay`);
        overlay.style.height = `${(1 - progress) * 100}%`;
    });
}

function updateMovement(delta) {
    const dist = player.position.distanceTo(targetPos);
    if (dist > 0.5) {
        const dir = targetPos.clone().sub(player.position).normalize();
        player.position.add(dir.multiplyScalar(CONFIG.champSpeed * delta));
        player.lookAt(targetPos);
    }

    // Camera follow (Smoothed)
    const desiredCam = player.position.clone().add(new THREE.Vector3(0, 60, 40));
    camera.position.lerp(desiredCam, 0.05);
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (gameState === 'PLAYING') {
        updateMovement(delta);
        updateHUD();

        // Mana regen
        playerStats.mana = Math.min(playerStats.maxMana, playerStats.mana + delta * 2);
    }

    renderer.render(scene, camera);
}

init();

document.getElementById('start-btn').onclick = () => {
    document.getElementById('overlay').classList.add('hidden');
    gameState = 'PLAYING';
};

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
