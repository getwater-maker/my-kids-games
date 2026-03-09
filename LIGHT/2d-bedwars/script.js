let camera, scene, renderer, controls;
let raycaster = new THREE.Raycaster();
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, canJump = false;
let prevTime = performance.now();
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let mouse = new THREE.Vector2();

let currentKit = 'default';
let gameStarted = false;

const SWORDS = {
    wood: { name: "나무 검", dmg: 20, color: 0x8b4513, emissive: 0x000000 },
    stone: { name: "돌 검", dmg: 25, color: 0x888888, emissive: 0x000000 },
    iron: { name: "철 검", dmg: 30, color: 0xdddddd, emissive: 0x000000 },
    diamond: { name: "다이아 검", dmg: 40, color: 0x00ffff, emissive: 0x002222 },
    emerald: { name: "에메랄드 검", dmg: 55, color: 0x00ff00, emissive: 0x002200 },
    rage: { name: "레이지 블레이드", dmg: 70, color: 0xffaa00, emissive: 0xcc3300 }
};

const BOWS = {
    bow: { name: "활", dmg: 15, chargeTime: 1.0, speedMult: 0.8, drag: 0.98, gravity: 0.05, zoom: 1.0 },
    crossbow: { name: "석궁", dmg: 25, chargeTime: 1.5, speedMult: 0.6, drag: 0.99, gravity: 0.03, zoom: 1.0 },
    headhunter: { name: "헤드헌터", dmg: 40, chargeTime: 2.0, speedMult: 0.4, drag: 1.0, gravity: 0.01, zoom: 0.5, headshotMult: 2.5 }
};


let mapGrid = new Map();
let blocksGroup = new THREE.Group();
let itemsGroup = new THREE.Group();
let interactables = [];

const blockSize = 1;
const playerWidth = 0.6;
const playerHeight = 1.6;

let player = {
    hp: 100, maxHp: 100, isDead: false,
    iron: 0, diamond: 0, emerald: 0, blocks: 20, swordId: 'wood', armor: 0,
    team: 'red', attackCooldown: 0,
    kit: 'default', rageDmg: 0,
    souls: 0, isReaper: false, reaperTimer: 0,
    evelynSouls: 0,
    gapples: 0, activeSlot: 1,
    hotbar: ['sword', 'blocks', 'gapple', null, null, null, null, null, null],
    selectedMoveSlot: null,
    bowId: null, charge: 0, isCharging: false, isZooming: false,
    upgrades: { attack: 0, defense: 0 }
};

let arrows = [];
let trajectoryLine;


const TEAMS = ['red', 'blue', 'green', 'yellow'];
const TEAM_COLORS = { red: 0xff5555, blue: 0x5555ff, green: 0x55ff55, yellow: 0xffff55 };
const TEAM_SPAWNS = {
    red: { x: 0, z: 32 },
    blue: { x: 0, z: -32 },
    green: { x: 32, z: 0 },
    yellow: { x: -32, z: 0 }
};

let ais = [];

let beds = {
    red: { exists: true },
    blue: { exists: true },
    green: { exists: true },
    yellow: { exists: true }
};

let isThirdPerson = false;
let tpCamera;
let playerModelMesh;
let tpCameraDistance = 5.0;

let tpOrbitAngleX = 0;
let tpOrbitAngleY = 0;
let isRightMouseDown = false;
let tpRightClickStartTime = 0;
let tpRightClickMoved = false;

let generators = [
    { x: 4, z: 32, type: 'iron', timer: 0, interval: 3, color: 0xcccccc },
    { x: -4, z: -32, type: 'iron', timer: 0, interval: 3, color: 0xcccccc },
    { x: 32, z: 4, type: 'iron', timer: 0, interval: 3, color: 0xcccccc },
    { x: -32, z: -4, type: 'iron', timer: 0, interval: 3, color: 0xcccccc },
    // More iron generators
    { x: 15, z: 32, type: 'iron', timer: 0, interval: 3, color: 0xcccccc },
    { x: -15, z: -32, type: 'iron', timer: 0, interval: 3, color: 0xcccccc },
    { x: 32, z: 15, type: 'iron', timer: 0, interval: 3, color: 0xcccccc },
    { x: -32, z: -15, type: 'iron', timer: 0, interval: 3, color: 0xcccccc },

    { x: 0, z: 0, type: 'emerald', timer: 0, interval: 10, color: 0x00ff00 },
    { x: 10, z: 10, type: 'emerald', timer: 0, interval: 10, color: 0x00ff00 },
    { x: -10, z: -10, type: 'emerald', timer: 0, interval: 10, color: 0x00ff00 },
    // Diamond generators
    { x: 15, z: 15, type: 'diamond', timer: 0, interval: 15, color: 0x00ffff },
    { x: -15, z: 15, type: 'diamond', timer: 0, interval: 15, color: 0x00ffff },
    { x: 15, z: -15, type: 'diamond', timer: 0, interval: 15, color: 0x00ffff },
    { x: -15, z: -15, type: 'diamond', timer: 0, interval: 15, color: 0x00ffff }
];

let shopOpen = false;
let handMesh;
let blockPreview;

const matStone = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8 });
const matRedWool = new THREE.MeshStandardMaterial({ color: 0xff5555, roughness: 0.9 });
const matBlueWool = new THREE.MeshStandardMaterial({ color: 0x5555ff, roughness: 0.9 });
const matGreenWool = new THREE.MeshStandardMaterial({ color: 0x55ff55, roughness: 0.9 });
const matYellowWool = new THREE.MeshStandardMaterial({ color: 0xffff55, roughness: 0.9 });

const TEAM_MATS = {
    red: matRedWool, blue: matBlueWool, green: matGreenWool, yellow: matYellowWool
};

const matBedRed = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const matBedBlue = new THREE.MeshStandardMaterial({ color: 0x0000ff });
const matBedGreen = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const matBedYellow = new THREE.MeshStandardMaterial({ color: 0xffff00 });

const matShop = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x005500 });
const matUpgradeShop = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x005555 });
const matAI = new THREE.MeshStandardMaterial({ color: 0x4444ff, roughness: 0.5 });

function getK(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }

// function selectKit and startGame are defined later as window properties.

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 20, 150);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    hemiLight.position.set(0, 200, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 100, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    scene.add(blocksGroup);
    scene.add(itemsGroup);

    const previewGeo = new THREE.BoxGeometry(1.02, 1.02, 1.02);
    const edges = new THREE.EdgesGeometry(previewGeo);
    blockPreview = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000 }));
    blockPreview.visible = false;
    scene.add(blockPreview);

    camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 1000);
    tpCamera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 1000);

    playerModelMesh = createCharacterModel(0xff3333);
    playerModelMesh.visible = false;
    scene.add(playerModelMesh);

    // Trajectory Line
    const trajGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const trajMat = new THREE.LineBasicMaterial({ color: 0xffff00 });
    trajectoryLine = new THREE.Line(trajGeo, trajMat);
    trajectoryLine.visible = false;
    scene.add(trajectoryLine);

    // Hand model (Sword)
    handMesh = new THREE.Group();
    handMesh.position.set(0.6, -0.1, -0.6); // Raised significantly and moved slightly right/back
    handMesh.rotation.set(0, Math.PI / 2, 0); // Completely upright and facing the side
    handMesh.scale.set(0.6, 0.6, 0.6);      // Maintain smaller size
    camera.add(handMesh);
    updateSwordAppearance();

    renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    controls = new THREE.PointerLockControls(camera, document.body);
    scene.add(controls.getObject());

    const blocker = document.getElementById('blocker');
    blocker.addEventListener('click', (e) => {
        if (!gameStarted) return;
        if (e.target.id === 'start-btn' || e.target.closest('.kit-card')) return;
        if (!shopOpen && !player.isDead && !isThirdPerson) controls.lock();
    });
    controls.addEventListener('lock', () => {
        document.getElementById('blocker').style.display = 'none';
        document.getElementById('ui-layer').classList.remove('hidden');
    });
    controls.addEventListener('unlock', () => {
        if (!shopOpen && !player.isDead && gameStarted && !isThirdPerson) {
            document.getElementById('blocker').style.display = 'flex';
        }
    });

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('contextmenu', e => e.preventDefault());

    window.addEventListener('mousemove', (e) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

        if (isThirdPerson && isRightMouseDown) {
            tpRightClickMoved = true;
            let moveX = e.movementX || 0;
            let moveY = e.movementY || 0;
            tpOrbitAngleX -= moveX * 0.003;
            tpOrbitAngleY -= moveY * 0.003;
        } else if (controls.isLocked) {
            // handled by PointerLockControls
        }
    }, true);

    buildWorld();

    // Spawn Squads (Blue, Green, Yellow)
    spawnAI('blue', 2);
    spawnAI('green', 2);
    spawnAI('yellow', 2);

    controls.getObject().position.set(0, 5, 30);

    updateUI();
    setInterval(spawnItems, 1000);

    animate();
}

function buildWorld() {
    // 4 Bases
    for (let team of TEAMS) {
        let spawn = TEAM_SPAWNS[team];
        for (let x = spawn.x - 4; x <= spawn.x + 4; x++) {
            for (let z = spawn.z - 4; z <= spawn.z + 4; z++) {
                addBlock(x, 0, z, matStone);
            }
        }

        let bedMat = matBedRed;
        if (team === 'blue') bedMat = matBedBlue;
        if (team === 'green') bedMat = matBedGreen;
        if (team === 'yellow') bedMat = matBedYellow;

        createBed(spawn.x, spawn.z, team, bedMat);
        createShop(spawn.x - 4, spawn.z, 'shop_' + team);
    }

    // Mid Area
    for (let x = -6; x <= 6; x++) {
        for (let z = -6; z <= 6; z++) {
            addBlock(x, 0, z, matStone);
        }
    }

    // Generator platforms
    generators.forEach(g => {
        addBlock(Math.floor(g.x), 0, Math.floor(g.z), matStone);
    });
}

function addBlock(x, y, z, mat) {
    let key = getK(x, y, z);
    if (mapGrid.has(key)) return;

    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { isBlock: true, x: x, y: y, z: z, mat: mat };
    blocksGroup.add(mesh);
    mapGrid.set(key, mesh);
}

function removeBlock(x, y, z) {
    let key = getK(x, y, z);
    if (mapGrid.has(key)) {
        let b = mapGrid.get(key);
        // Can only break player-placed blocks or certain world blocks
        if (b.userData.mat !== matStone) { // Assume matStone is bedrock-like for now
            blocksGroup.remove(b);
            mapGrid.delete(key);
            player.blocks++;
            updateUI();
        }
    }
}

function createBed(x, z, team, mat) {
    const geo = new THREE.BoxGeometry(1.8, 0.6, 1.8);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x + 0.5, 1 + 0.3, z + 0.5);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { isBed: true, team: team };
    scene.add(mesh);
    interactables.push(mesh);
}

function createShop(x, z, type) {
    const geo = new THREE.BoxGeometry(1, 2, 1);
    const mesh = new THREE.Mesh(geo, matShop);
    mesh.position.set(x + 0.5, 1 + 1, z + 0.5);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { type: type };
    scene.add(mesh);
    interactables.push(mesh);

    // Create Upgrade Shop NPC
    const upGeo = new THREE.BoxGeometry(1, 2, 1);
    const upMesh = new THREE.Mesh(upGeo, matUpgradeShop);
    upMesh.position.set(x + 1.5, 1 + 1, z + 0.5);
    upMesh.castShadow = true;
    upMesh.receiveShadow = true;
    upMesh.userData = { type: 'upgrade_shop' };
    scene.add(upMesh);
    interactables.push(upMesh);
}

function createCharacterModel(color) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: color });

    // Head
    const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const head = new THREE.Mesh(headGeo, mat);
    head.position.y = 1.4;
    head.userData = { part: 'head' };
    group.add(head);

    // Torso
    const torsoGeo = new THREE.BoxGeometry(0.5, 0.6, 0.3);
    const torso = new THREE.Mesh(torsoGeo, mat);
    torso.position.y = 0.9;
    torso.userData = { part: 'torso' };
    group.add(torso);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.2, 0.6, 0.2);
    const leftArm = new THREE.Mesh(armGeo, mat);
    leftArm.position.set(-0.35, 0.9, 0);
    leftArm.userData = { part: 'arm' };
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, mat);
    rightArm.position.set(0.35, 0.9, 0);
    rightArm.userData = { part: 'arm' };
    group.add(rightArm);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.2, 0.6, 0.2);
    const leftLeg = new THREE.Mesh(legGeo, mat);
    leftLeg.position.set(-0.15, 0.3, 0);
    leftLeg.userData = { part: 'leg' };
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, mat);
    rightLeg.position.set(0.15, 0.3, 0);
    rightLeg.userData = { part: 'leg' };
    group.add(rightLeg);

    group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    return group;
}

function spawnAI(team, count = 3) {
    for (let i = 0; i < count; i++) {
        const mesh = createCharacterModel(TEAM_COLORS[team]);

        let spawn = TEAM_SPAWNS[team];
        let ai = {
            pos: new THREE.Vector3(spawn.x, 5, spawn.z),
            vel: new THREE.Vector3(),
            hp: 100, maxHp: 100, isDead: false,
            mesh: mesh, team: team,
            blocks: 50, bridgeTimer: 0, thinkTimer: Math.random() * 0.5, bedAttackTimer: 0,
            damageAccumulator: 0,
            armorLevel: 0,
            resources: { iron: 0, emerald: 0, diamond: 0 },
            target: null, targetType: 'bed' // 'bed', 'player', 'ai'
        };

        mesh.userData = { isAI: true, aiIndex: ais.length };
        scene.add(mesh);
        interactables.push(mesh);
        ais.push(ai);
    }
}


// PHYSICS
function getBoundingBox(pos, w, h) {
    return {
        minX: pos.x - w / 2, maxX: pos.x + w / 2,
        minY: pos.y, maxY: pos.y + h,
        minZ: pos.z - w / 2, maxZ: pos.z + w / 2
    };
}

function checkCollision(pos, w, h) {
    const b = getBoundingBox(pos, w, h);
    const gMinX = Math.floor(b.minX), gMaxX = Math.floor(b.maxX);
    const gMinY = Math.floor(b.minY), gMaxY = Math.floor(b.maxY);
    const gMinZ = Math.floor(b.minZ), gMaxZ = Math.floor(b.maxZ);

    for (let x = gMinX; x <= gMaxX; x++) {
        for (let y = gMinY; y <= gMaxY; y++) {
            for (let z = gMinZ; z <= gMaxZ; z++) {
                if (mapGrid.has(getK(x, y, z))) return true;
            }
        }
    }
    return false;
}

function updatePhysics(dt) {
    if (player.isDead) return;

    velocity.x -= velocity.x * 10.0 * dt;
    velocity.z -= velocity.z * 10.0 * dt;
    velocity.y -= 25.0 * dt; // gravity

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    let speed = player.isReaper ? 75.0 : 40.0;

    // Slowdown when charging bow or headhunter zooming
    if (player.isCharging || player.isZooming) {
        let weapon = BOWS[player.bowId];
        if (weapon) speed *= weapon.speedMult;
        if (player.isZooming) speed *= 0.5;
    }

    if (moveForward || moveBackward) velocity.z -= direction.z * speed * dt;
    if (moveLeft || moveRight) velocity.x += direction.x * speed * dt;

    let pObj = controls.getObject();
    let basePos = new THREE.Vector3(pObj.position.x, pObj.position.y - playerHeight, pObj.position.z);

    // Y Axis
    basePos.y += velocity.y * dt;
    if (checkCollision(basePos, playerWidth, playerHeight)) {
        // Fall damage logic
        if (velocity.y < -15) { // Threshold for fall damage
            let fallDmg = Math.abs(velocity.y + 15) * 5;
            takeDamage(fallDmg, 'fall');
        }

        basePos.y -= velocity.y * dt;
        if (velocity.y < 0) canJump = true;
        velocity.y = 0;
    } else canJump = false;


    // Build local move vector based on camera rotation
    let moveVec = new THREE.Vector3(velocity.x * dt, 0, velocity.z * dt);
    let cameraEuler = new THREE.Euler().setFromQuaternion(pObj.quaternion, 'YXZ');
    cameraEuler.x = 0; cameraEuler.z = 0; // Ignore pitch for movement
    moveVec.applyEuler(cameraEuler);

    basePos.x += moveVec.x;
    if (checkCollision(basePos, playerWidth, playerHeight)) basePos.x -= moveVec.x;

    basePos.z += moveVec.z;
    if (checkCollision(basePos, playerWidth, playerHeight)) basePos.z -= moveVec.z;

    pObj.position.set(basePos.x, basePos.y + playerHeight, basePos.z);

    // Death void
    if (pObj.position.y < -10) takeDamage(9999);
}

function updateAI(dt) {
    let pObj = controls.getObject();
    let pPos = new THREE.Vector3(pObj.position.x, pObj.position.y - playerHeight, pObj.position.z);

    ais.forEach((ai, idx) => {
        if (ai.isDead) return;

        ai.thinkTimer -= dt;
        if (ai.thinkTimer <= 0) {
            ai.thinkTimer = 0.5 + Math.random() * 0.2;
        }

        // AI targeting logic: Priority = Bed > Closest Enemy
        let myTeam = ai.team;
        let bestTargetPos = null;
        let bestTargetType = 'none';

        // 1. Target enemy beds
        let enemyTeams = TEAMS.filter(t => t !== myTeam && beds[t].exists);
        let closestBedDist = Infinity;
        enemyTeams.forEach(t => {
            let spawn = TEAM_SPAWNS[t];
            let dist = ai.pos.distanceTo(new THREE.Vector3(spawn.x, 0, spawn.z));
            if (dist < closestBedDist) {
                closestBedDist = dist;
                bestTargetPos = new THREE.Vector3(spawn.x, 0, spawn.z);
                bestTargetType = 'bed';
                ai.targetTeam = t;
            }
        });

        // 2. Target players or other AIs if nearby
        let closestEnt = null;
        let closestEntDist = 12; // Detection range

        // Check player
        if (player.team !== myTeam && !player.isDead) {
            let d = ai.pos.distanceTo(pPos);
            if (d < closestEntDist) {
                closestEntDist = d;
                closestEnt = pPos;
                bestTargetType = 'player';
            }
        }

        // Check other AIs
        ais.forEach(otherAi => {
            if (otherAi.team !== myTeam && !otherAi.isDead) {
                let d = ai.pos.distanceTo(otherAi.pos);
                if (d < closestEntDist) {
                    closestEntDist = d;
                    closestEnt = otherAi.pos;
                    bestTargetType = 'ai';
                }
            }
        });

        if (closestEnt) {
            bestTargetPos = closestEnt.clone();
        }

        if (bestTargetPos) {
            let diff = new THREE.Vector3().subVectors(bestTargetPos, ai.pos);
            diff.y = 0;
            if (diff.length() > 2.0) {
                diff.normalize();
                ai.vel.x = diff.x * 4.5;
                ai.vel.z = diff.z * 4.5;
                ai.bedAttackTimer = 0;
            } else {
                // At target
                if (bestTargetType === 'bed' && beds[ai.targetTeam].exists) {
                    ai.bedAttackTimer += dt;
                    if (ai.bedAttackTimer > 2.5) {
                        beds[ai.targetTeam].exists = false;
                        scene.children.forEach(c => { if (c.userData && c.userData.isBed && c.userData.team === ai.targetTeam) scene.remove(c); });
                        showMessage(ai.targetTeam.toUpperCase() + " 팀 침대가 파괴되었습니다!");
                        updateUI();
                    }
                } else if (bestTargetType === 'player') {
                    if (ai.thinkTimer <= 0) {
                        takeDamage(15, 'sword', ai.team);
                        ai.thinkTimer = 0.6;
                    }
                } else if (bestTargetType === 'ai') {
                    if (ai.thinkTimer <= 0) {
                        // AI fight
                        let otherAi = ais.find(a => a.pos === closestEnt);
                        if (otherAi) {
                            otherAi.hp -= 15;
                            otherAi.vel.y = 4;
                            let push = new THREE.Vector3().subVectors(otherAi.pos, ai.pos).normalize();
                            otherAi.vel.x += push.x * 3;
                            otherAi.vel.z += push.z * 3;
                            if (otherAi.hp <= 0) {
                                otherAi.isDead = true; otherAi.mesh.position.y = -100;
                                showMessage(`${ai.team.toUpperCase()}가 ${otherAi.team.toUpperCase()}를 처치했습니다!`);
                                if (beds[otherAi.team].exists) setTimeout(() => respawnAI(ais.indexOf(otherAi)), 5000);
                            }
                        }
                        ai.thinkTimer = 0.6;
                    }
                }
                ai.vel.x = 0; ai.vel.z = 0;
            }
        } else {
            ai.vel.x = 0; ai.vel.z = 0;
        }

        ai.vel.y -= 25.0 * dt; // gravity
        ai.pos.y += ai.vel.y * dt;
        if (checkCollision(ai.pos, playerWidth, playerHeight)) {
            ai.pos.y -= ai.vel.y * dt;
            if (ai.vel.y < 0) {
                let ahead = ai.pos.clone();
                ahead.x += ai.vel.x * dt * 25;
                ahead.z += ai.vel.z * dt * 25;
                if (checkCollision(ahead, playerWidth, playerHeight)) {
                    ai.vel.y = 8; // jump
                } else {
                    ahead.y -= 1;
                    if (!checkCollision(ahead, playerWidth, playerHeight) && Math.abs(ai.vel.x) + Math.abs(ai.vel.z) > 0) {
                        ai.bridgeTimer -= dt;
                        if (ai.bridgeTimer <= 0 && ai.blocks > 0) {
                            addBlock(Math.floor(ahead.x), Math.floor(ahead.y), Math.floor(ahead.z), TEAM_MATS[ai.team]);
                            ai.bridgeTimer = 1.0;
                            ai.blocks--;
                        }
                    }
                }
            }
            ai.vel.y = 0;
        }

        ai.pos.x += ai.vel.x * dt;
        if (checkCollision(ai.pos, playerWidth, playerHeight)) ai.pos.x -= ai.vel.x * dt;
        ai.pos.z += ai.vel.z * dt;
        if (checkCollision(ai.pos, playerWidth, playerHeight)) ai.pos.z -= ai.vel.z * dt;

        ai.mesh.position.set(ai.pos.x, ai.pos.y + playerHeight / 2, ai.pos.z);

        // AI Armor Upgrades Logic
        if (!ai.isDead) {
            ai.resources.iron += dt * 0.5;
            ai.resources.emerald += dt * 0.1;

            if (ai.armorLevel === 0 && ai.resources.iron >= 20) { ai.armorLevel = 1; ai.resources.iron -= 20; updateAIMesh(ai); }
            else if (ai.armorLevel === 1 && ai.resources.emerald >= 10) { ai.armorLevel = 2; ai.resources.emerald -= 10; updateAIMesh(ai); }
            else if (ai.armorLevel === 2 && ai.resources.emerald >= 20) { ai.armorLevel = 3; ai.resources.emerald -= 20; updateAIMesh(ai); }
        }

        if (ai.pos.y < -15) {
            ai.isDead = true; ai.mesh.position.y = -100;
            if (beds[ai.team].exists) {
                setTimeout(() => respawnAI(idx), 4000);
            } else {
                checkRemainingTeams();
            }
        }
    });
}

function updateAIMesh(ai) {
    // Add visual indicator for armor
    if (ai.armorLevel > 0) {
        let colors = [null, 0x8b4513, 0xcccccc, 0x00ffff];
        ai.mesh.material.emissive = new THREE.Color(colors[ai.armorLevel]);
        ai.mesh.material.emissiveIntensity = 0.3;
    }
}

function spawnEvelynSoul(pos) {
    const group = new THREE.Group();
    const geo = new THREE.SphereGeometry(0.4, 16, 16);
    const mat = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.7
    });
    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);

    // [F] Text Label (simplified 3D sprite)
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 48px Jua';
    ctx.textAlign = 'center';
    ctx.fillText('F', 32, 48);
    const tex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: tex });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.y = 0.8;
    sprite.scale.set(1, 1, 1);
    group.add(sprite);

    group.position.set(pos.x, pos.y + 1, pos.z);
    group.userData = { type: 'evelyn_soul' };
    itemsGroup.add(group);
    player.evelynSouls++;
    updateUI();
}


function checkRemainingTeams() {
    let aliveTeams = new Set();
    if (!player.isDead || beds.red.exists) aliveTeams.add('red');
    ais.forEach(ai => {
        if (!ai.isDead || beds[ai.team].exists) aliveTeams.add(ai.team);
    });

    if (aliveTeams.size === 1 && aliveTeams.has('red')) {
        showVictory();
    }
}

function respawnAI(idx) {
    let ai = ais[idx];
    if (!beds[ai.team].exists) return;
    ai.isDead = false;
    ai.hp = ai.maxHp;
    let spawn = TEAM_SPAWNS[ai.team];
    ai.pos.set(spawn.x, 5, spawn.z);
    ai.vel.set(0, 0, 0);
    ai.mesh.position.y = ai.pos.y + playerHeight / 2;
}

function spawnItems() {
    generators.forEach(g => {
        g.timer++;
        if (g.type === 'iron' || (g.type === 'emerald' && g.timer % 4 === 0) || (g.type === 'diamond' && g.timer % 8 === 0)) {
            const geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
            const mat = new THREE.MeshStandardMaterial({ color: g.color, metalness: 0.5 });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(g.x + Math.random() * 0.5, 2.5, g.z + Math.random() * 0.5);
            mesh.userData = { type: g.type };
            mesh.castShadow = true;
            itemsGroup.add(mesh);
        }
    });
}

function updateItems(dt) {
    let pObj = controls.getObject();
    let pBase = new THREE.Vector3(pObj.position.x, pObj.position.y - playerHeight / 2, pObj.position.z);

    for (let i = itemsGroup.children.length - 1; i >= 0; i--) {
        let it = itemsGroup.children[i];
        it.rotation.y += dt;
        it.rotation.x += dt;

        it.position.y -= 5 * dt;
        if (checkCollision(it.position, 0.3, 0.3)) it.position.y += 5 * dt;

        if (pBase.distanceTo(it.position) < 1.5) {
            if (it.userData.type === 'iron' || it.userData.type === 'emerald' || it.userData.type === 'diamond') {
                if (it.userData.type === 'iron') player.iron++;
                if (it.userData.type === 'emerald') player.emerald++;
                if (it.userData.type === 'diamond') player.diamond++;
                itemsGroup.remove(it);
                updateUI();
            }
        }
    }

    let nearSoul = false;
    if (player.kit === 'grimreaper') {
        for (let i = itemsGroup.children.length - 1; i >= 0; i--) {
            let it = itemsGroup.children[i];
            if (it.userData.type === 'soul' && pBase.distanceTo(it.position) < 2.5) {
                nearSoul = true; break;
            }
        }
    }
    const fPrompt = document.getElementById('f-prompt');
    if (fPrompt) fPrompt.style.display = nearSoul ? 'block' : 'none';
}

function setSlot(num) {
    player.activeSlot = num;
    updateUI();

    // Toggle sword visibility based on weapon in slot
    let item = player.hotbar[num - 1];
    if (handMesh) handMesh.visible = (item === 'sword');
}

window.moveSlot = function (idx) {
    if (!shopOpen) return; // Only move when shop is open
    if (player.selectedMoveSlot === null) {
        player.selectedMoveSlot = idx;
        updateUI();
    } else {
        let temp = player.hotbar[idx];
        player.hotbar[idx] = player.hotbar[player.selectedMoveSlot];
        player.hotbar[player.selectedMoveSlot] = temp;
        player.selectedMoveSlot = null;
        updateUI();
    }
}

function onKeyDown(e) {
    if (e.code === 'Escape' || e.code === 'KeyE') {
        if (shopOpen) {
            shopOpen = false;
            document.getElementById('shop-ui').classList.add('hidden');
            if (!player.isDead && !isThirdPerson) controls.lock();
            return;
        } else if (e.code === 'KeyE') {
            if (controls.isLocked) {
                controls.unlock();
            } else if (!isThirdPerson) {
                controls.lock();
            }
            return;
        }
    }

    if (e.code === 'Tab') {
        e.preventDefault();
        document.getElementById('player-stats').classList.remove('tab-hidden');
    }

    if (!controls.isLocked && !isThirdPerson && !shopOpen) {
        // Allow WASD movement even if unlocked in 3rd person? 
        // Standard is YES in 3rd person unlocked mode.
    }

    // Movement should work in 3rd person even if unlocked
    if (!controls.isLocked && !isThirdPerson && e.code !== 'Space') {
        // return early if we are in a menu like shop with cursor but NOT in 3rd person free look
        if (shopOpen) return;
    }

    // Hotbar selection
    if (e.code.startsWith('Digit') && e.code.length === 6) {
        let num = parseInt(e.code.charAt(5));
        if (num >= 1 && num <= 9) setSlot(num);
    }

    switch (e.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyD': moveRight = true; break;
        case 'Space': if (canJump) velocity.y = 8.5; break;
        case 'KeyF':
            if (player.kit === 'grimreaper') {
                let pBase = controls.getObject().position.clone();
                pBase.y -= playerHeight / 2;
                let pickedUp = false;
                for (let i = itemsGroup.children.length - 1; i >= 0; i--) {
                    let it = itemsGroup.children[i];
                    if (it.userData.type === 'soul' && pBase.distanceTo(it.position) < 2.5) {
                        player.souls++;
                        itemsGroup.remove(it);
                        pickedUp = true;
                        showMessage("영혼을 획득했습니다!");
                        updateUI();
                        break;
                    }
                }

                if (!pickedUp && player.souls > 0 && !player.isReaper) {
                    player.souls--;
                    player.isReaper = true;
                    player.reaperTimer = 10;
                    player.hp = Math.min(player.maxHp, player.hp + 50);
                    setHandMeshOpacity(0.3);
                    showMessage("그림리퍼 무적 상태 전환! (공격/피격 불가)");
                    updateUI();
                }
            } else if (player.kit === 'evelyn') {
                // Find visible evelyn souls
                let bestSoul = null;
                let minAngle = Infinity;

                itemsGroup.children.forEach(it => {
                    if (it.userData.type === 'evelyn_soul') {
                        let soulPos = it.position.clone();
                        let screenPos = soulPos.project(camera);

                        // Check if in front of camera and on screen
                        if (screenPos.z < 1 && Math.abs(screenPos.x) < 1.1 && Math.abs(screenPos.y) < 1.1) {
                            let angle = new THREE.Vector2(screenPos.x, screenPos.y).length();
                            if (angle < minAngle) {
                                minAngle = angle;
                                bestSoul = it;
                            }
                        }
                    }
                });

                if (bestSoul) {
                    // Teleport!
                    let pObj = controls.getObject();
                    let targetPos = bestSoul.position.clone();
                    pObj.position.set(targetPos.x, targetPos.y + playerHeight, targetPos.z);

                    // AOE Damage 15
                    ais.forEach(ai => {
                        if (!ai.isDead && ai.pos.distanceTo(targetPos) < 5) {
                            ai.hp -= 15;
                            if (ai.hp <= 0) {
                                ai.isDead = true; ai.mesh.position.y = -100;
                                showMessage(ai.team.toUpperCase() + " 팀원을 순간이동 충격으로 처치했습니다!");
                                if (!beds[ai.team].exists) checkRemainingTeams();
                            }
                        }
                    });

                    itemsGroup.remove(bestSoul);
                    player.evelynSouls--;
                    showMessage("순간이동!!");
                    updateUI();
                }
            }
            break;
        case 'KeyV':
            isThirdPerson = !isThirdPerson;
            playerModelMesh.visible = isThirdPerson;
            if (isThirdPerson) {
                controls.unlock();
                if (tpCameraDistance < 2.0) tpCameraDistance = 5.0;
            } else {
                if (gameStarted && !shopOpen) controls.lock();
            }
            break;
    }
}
function onKeyUp(e) {
    if (e.code === 'Tab') {
        document.getElementById('player-stats').classList.add('tab-hidden');
    }
    switch (e.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyD': moveRight = false; break;
    }
}

function onWheel(e) {
    if (!gameStarted) return;
    e.preventDefault();

    if (e.deltaY > 0) {
        // Scroll down: Zoom out
        if (!isThirdPerson) {
            isThirdPerson = true;
            playerModelMesh.visible = true;
            tpCameraDistance = 2.0;
            controls.unlock();
        } else {
            tpCameraDistance += 1.0;
            if (tpCameraDistance > 15.0) tpCameraDistance = 15.0;
        }
    } else if (e.deltaY < 0) {
        // Scroll up: Zoom in
        if (isThirdPerson) {
            tpCameraDistance -= 1.0;
            if (tpCameraDistance <= 0.5) {
                isThirdPerson = false;
                playerModelMesh.visible = false;
                if (!shopOpen && !player.isDead) controls.lock();
            }
        }
    }
}

function onMouseDown(e) {
    if (!gameStarted || player.isDead) return;
    if (!isThirdPerson && !controls.isLocked && !shopOpen && !document.getElementById('upgrade-shop-ui').classList.contains('hidden')) {
        controls.lock();
        return;
    }

    if (player.attackCooldown > 0) return;

    let rayMouse = isThirdPerson ? mouse : new THREE.Vector2(0, 0);
    let rayCam = isThirdPerson ? tpCamera : camera;
    raycaster.setFromCamera(rayMouse, rayCam);

    if (e.button === 0) { // Left click
        let activeItem = player.hotbar[player.activeSlot - 1];

        // 1. Check for Bow/Headhunter charging
        if (BOWS[activeItem]) {
            player.bowId = activeItem;
            player.isCharging = true;
            player.charge = 0;
            document.getElementById('charge-ui').classList.remove('hidden');
            return;
        }

        // 2. Sword/General Interactions
        player.attackCooldown = 0.05;
        if (handMesh) {
            handMesh.position.z -= 0.15; handMesh.rotation.x -= 0.3;
            setTimeout(() => { if (handMesh) { handMesh.position.z += 0.15; handMesh.rotation.x += 0.3; } }, 50);
        }

        if (activeItem === 'gapple' && player.gapples > 0) {
            player.gapples--;
            player.hp = Math.min(player.maxHp, player.hp + 50);
            showMessage("황금 사과를 먹어 체력을 회복했습니다!");
            updateUI();
            return;
        }

        let ents = raycaster.intersectObjects(interactables);
        let hitSomething = false;

        if (ents.length > 0 && ents[0].distance < 6) {
            let obj = ents[0].object.userData;
            if (activeItem === 'sword') {
                if (obj.type === 'upgrade_shop') {
                    controls.unlock();
                    document.getElementById('upgrade-shop-ui').classList.remove('hidden');
                    hitSomething = true;
                } else if (obj.type && obj.type.includes('shop')) {
                    controls.unlock();
                    shopOpen = true;
                    document.getElementById('shop-ui').classList.remove('hidden');
                    hitSomething = true;
                } else if (obj.isBed && obj.team !== 'red') {
                    let t = obj.team.toUpperCase();
                    beds[obj.team].exists = false;
                    interactables.splice(interactables.indexOf(ents[0].object), 1);
                    scene.remove(ents[0].object);
                    showMessage(t + " 팀 침대를 파괴했습니다!!");
                    updateUI();
                    hitSomething = true;
                } else if (obj.isAI) {
                    let ai = ais[obj.aiIndex];
                    if (ai && !ai.isDead) {
                        if (player.isReaper) {
                            showMessage("영혼 상태에서는 적을 공격할 수 없습니다!");
                        } else {
                            let sInfo = SWORDS[player.swordId];
                            let dmg = sInfo.dmg + (player.upgrades.attack * 5);
                            if (player.upgrades.attack >= 4) dmg += 9999;

                            let reduction = [0, 0.2, 0.4, 0.6][ai.armorLevel] || 0;
                            dmg *= (1 - reduction);
                            ai.hp -= dmg;

                            if (player.kit === 'evelyn') {
                                ai.damageAccumulator += dmg;
                                if (ai.damageAccumulator >= 25) {
                                    spawnEvelynSoul(ai.pos.clone());
                                    ai.damageAccumulator = 0;
                                }
                            }

                            // Knockback: 1 block (distance)
                            let pushDir = raycaster.ray.direction.clone().setY(0).normalize();
                            ai.vel.x += pushDir.x * 12;
                            ai.vel.z += pushDir.z * 12;
                            ai.vel.y = 4;

                            if (player.kit === 'barbarian') addRage(dmg);

                            if (ai.hp <= 0) {
                                ai.isDead = true; ai.mesh.position.y = -100;
                                if (player.kit === 'grimreaper') {
                                    const soulGeo = new THREE.SphereGeometry(0.5, 16, 16);
                                    const soulMat = new THREE.MeshStandardMaterial({ color: 0x000010, emissive: 0x000033, transparent: true, opacity: 0.9, roughness: 0.2 });
                                    const soulMesh = new THREE.Mesh(soulGeo, soulMat);
                                    soulMesh.position.set(ai.pos.x, ai.pos.y + 0.5, ai.pos.z);
                                    soulMesh.userData = { type: 'soul' };
                                    itemsGroup.add(soulMesh);
                                }
                                showMessage("⚔️ " + ai.team.toUpperCase() + " 팀원을 검으로 처치했습니다!");
                                if (beds[ai.team].exists) setTimeout(() => respawnAI(obj.aiIndex), 5000);
                                else checkRemainingTeams();
                            }
                        }
                        hitSomething = true;
                    }
                }
            }
        }

        if (!hitSomething) {
            let blocks = raycaster.intersectObjects(blocksGroup.children);
            if (blocks.length > 0 && blocks[0].distance < 7) {
                let b = blocks[0].object.userData;
                removeBlock(b.x, b.y, b.z);
            }
        }
    } else if (e.button === 2) { // Right click
        let activeItem = player.hotbar[player.activeSlot - 1];
        if (activeItem === 'headhunter') {
            player.isZooming = true;
            return;
        }

        if (isThirdPerson) {
            isRightMouseDown = true;
            tpRightClickMoved = false;
            tpRightClickStartTime = performance.now();
            return;
        }

        if (activeItem !== 'blocks' || player.blocks <= 0) return;
        let pos = getTargetBlockPos();
        if (pos) {
            let { bx, by, bz } = pos;
            let pPos = controls.getObject().position;
            if (!(Math.abs(pPos.x - (bx + 0.5)) < 0.8 && Math.abs(pPos.z - (bz + 0.5)) < 0.8 &&
                (by === Math.floor(pPos.y) || by === Math.floor(pPos.y - playerHeight)))) {
                addBlock(bx, by, bz, TEAM_MATS[player.team] || matRedWool);
                player.blocks--;
                updateUI();
            }
        }
    }
}

function onMouseUp(e) {
    if (e.button === 0 && player.isCharging) {
        let weapon = BOWS[player.bowId];
        if (weapon) {
            fireArrow(player.charge / 100);
        }
        player.isCharging = false;
        player.charge = 0;
        document.getElementById('charge-ui').classList.add('hidden');
        trajectoryLine.visible = false;
    }

    if (e.button === 2) {
        player.isZooming = false;
        if (isThirdPerson && !tpRightClickMoved && (performance.now() - tpRightClickStartTime < 300)) {
            if (player.hotbar[player.activeSlot - 1] === 'blocks' && player.blocks > 0) {
                let pos = getTargetBlockPos();
                if (pos) {
                    let { bx, by, bz } = pos;
                    let pPos = controls.getObject().position;
                    if (!(Math.abs(pPos.x - (bx + 0.5)) < 0.8 && Math.abs(pPos.z - (bz + 0.5)) < 0.8 &&
                        (by === Math.floor(pPos.y) || by === Math.floor(pPos.y - playerHeight)))) {
                        addBlock(bx, by, bz, TEAM_MATS[player.team] || matRedWool);
                        player.blocks--;
                        updateUI();
                    }
                }
            }
        }
        isRightMouseDown = false;
    }
}

window.closeShop = function () {
    shopOpen = false;
    document.getElementById('shop-ui').classList.add('hidden');
    if (!player.isDead) controls.lock();
}

window.closeUpgradeShop = function () {
    document.getElementById('upgrade-shop-ui').classList.add('hidden');
    if (!player.isDead) controls.lock();
}

window.buyUpgrade = function (type) {
    let currentLv = player.upgrades[type];
    if (currentLv >= 4) {
        alert("최고 단계입니다!");
        return;
    }

    let cost = currentLv === 3 ? 500 : 4;
    if (player.diamond >= cost) {
        player.diamond -= cost;
        player.upgrades[type]++;
        updateUI();
        showMessage(type === 'attack' ? "공격력이 강화되었습니다!" : "방어력이 강화되었습니다!");

        // Update shop UI status
        let btn = document.getElementById(type + '-upgrade-btn');
        let status = document.getElementById(type + '-upgrade-status');
        let nextLv = player.upgrades[type];

        if (nextLv < 4) {
            status.textContent = `현재: Lv ${nextLv} (+${nextLv * 5})`;
            btn.textContent = `강화하기 (다이아 ${nextLv === 3 ? 500 : 4})`;
        } else {
            status.textContent = `현재: Lv 4 (+9999)`;
            btn.textContent = `MAX`;
            btn.disabled = true;
        }
    } else {
        alert("다이아몬드가 부족합니다!");
    }
}


window.selectKit = function (kit) {
    currentKit = kit;
    document.querySelectorAll('.kit-card').forEach(el => el.classList.remove('selected'));
    document.getElementById('kit-' + kit).classList.add('selected');
};

window.startGame = function () {
    if (!gameStarted) {
        player.kit = currentKit;
        player.swordId = 'wood';
        player.rageDmg = 0;
        updateSwordAppearance();

        if (player.kit === 'barbarian') {
            document.getElementById('rage-gauge').classList.remove('hidden');
        } else {
            document.getElementById('rage-gauge').classList.add('hidden');
        }

        if (player.kit === 'grimreaper') {
            document.getElementById('reaper-ui').classList.remove('hidden');
        } else {
            document.getElementById('reaper-ui').classList.add('hidden');
        }

        if (player.kit === 'evelyn') {
            document.getElementById('evelyn-ui').classList.remove('hidden');
        } else {
            document.getElementById('evelyn-ui').classList.add('hidden');
        }

        document.getElementById('lobby-kits').style.display = 'none';
        document.getElementById('hotbar').style.display = 'flex';
        setSlot(1);
        gameStarted = true;
    }
    updateUI();
    controls.lock();
};

function createWoodenSwordParts(group) {
    const colorBladeLight = 0xD2B48C;
    const colorBladeDark = 0xA0522D;
    const colorHilt = 0x3D2B1F;
    const colorJewel = 0x8B008B;

    // Blade Left (Lower/Darker)
    const bladeLeftGeo = new THREE.BoxGeometry(0.1, 0.6, 0.05);
    const bladeLeftMat = new THREE.MeshStandardMaterial({ color: colorBladeDark });
    const bladeLeft = new THREE.Mesh(bladeLeftGeo, bladeLeftMat);
    bladeLeft.position.set(-0.05, 0.3, 0);
    group.add(bladeLeft);

    // Blade Right (Upper/Lighter)
    const bladeRightGeo = new THREE.BoxGeometry(0.1, 0.6, 0.05);
    const bladeRightMat = new THREE.MeshStandardMaterial({ color: colorBladeLight });
    const bladeRight = new THREE.Mesh(bladeRightGeo, bladeRightMat);
    bladeRight.position.set(0.05, 0.3, 0);
    group.add(bladeRight);

    // Tip
    const tipGeo = new THREE.ConeGeometry(0.1, 0.15, 4);
    const tipMat = new THREE.MeshStandardMaterial({ color: colorBladeLight });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.set(0, 0.675, 0);
    tip.rotation.y = Math.PI / 4;
    group.add(tip);

    // Crossguard Center
    const guardMat = new THREE.MeshStandardMaterial({ color: colorHilt });
    const guardMidGeo = new THREE.BoxGeometry(0.25, 0.1, 0.12);
    const guardMid = new THREE.Mesh(guardMidGeo, guardMat);
    guardMid.position.set(0, 0.02, 0);
    group.add(guardMid);

    // Crossguard Wing Left
    const wingGeo = new THREE.BoxGeometry(0.15, 0.08, 0.1);
    const wingLeft = new THREE.Mesh(wingGeo, guardMat);
    wingLeft.position.set(-0.15, -0.02, 0);
    wingLeft.rotation.z = Math.PI / 8;
    group.add(wingLeft);

    // Crossguard Wing Right
    const wingRight = new THREE.Mesh(wingGeo, guardMat);
    wingRight.position.set(0.15, -0.02, 0);
    wingRight.rotation.z = -Math.PI / 8;
    group.add(wingRight);

    // Jewel
    const jewelGeo = new THREE.SphereGeometry(0.05, 12, 12);
    const jewelMat = new THREE.MeshStandardMaterial({ color: colorJewel, emissive: colorJewel, emissiveIntensity: 0.4 });
    const jewel = new THREE.Mesh(jewelGeo, jewelMat);
    jewel.position.set(0, 0.02, 0.06);
    group.add(jewel);

    // Handle
    const handleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.25, 8);
    const handle = new THREE.Mesh(handleGeo, guardMat);
    handle.position.set(0, -0.15, 0);
    group.add(handle);

    // Pommel
    const pommelGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const pommel = new THREE.Mesh(pommelGeo, guardMat);
    pommel.position.set(0, -0.28, 0);
    group.add(pommel);

    // Notches (nicks)
    const notchMat = new THREE.MeshStandardMaterial({ color: 0x332211, transparent: true, opacity: 0.6 });
    const n1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.07), notchMat);
    n1.position.set(0.08, 0.45, 0);
    n1.rotation.z = 0.5;
    group.add(n1);

    const n2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.015, 0.07), notchMat);
    n2.position.set(-0.08, 0.25, 0);
    n2.rotation.z = -0.4;
    group.add(n2);
}

function createDetailedSword(group, colors, options = {}) {
    const { bladeLight, bladeDark, guard, jewel, handle, handleColor } = colors;

    // Blade Two-Tone (Ridge)
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.65, 0.05), new THREE.MeshStandardMaterial({ color: bladeDark, ...options.bladeProps }));
    b1.position.set(-0.06, 0.32, 0);
    group.add(b1);
    const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.65, 0.05), new THREE.MeshStandardMaterial({ color: bladeLight, ...options.bladeProps }));
    b2.position.set(0.06, 0.32, 0);
    group.add(b2);

    // Tip
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.15, 4), new THREE.MeshStandardMaterial({ color: bladeLight, ...options.bladeProps }));
    tip.position.set(0, 0.72, 0);
    tip.rotation.y = Math.PI / 4;
    group.add(tip);

    // Flared Crossguard
    const guardMat = new THREE.MeshStandardMaterial({ color: guard });
    const mid = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.15), guardMat);
    mid.position.set(0, 0.02, 0);
    group.add(mid);

    const wingGeo = new THREE.BoxGeometry(0.18, 0.08, 0.12);
    const wLeft = new THREE.Mesh(wingGeo, guardMat);
    wLeft.position.set(-0.18, -0.02, 0);
    wLeft.rotation.z = Math.PI / 8;
    group.add(wLeft);

    const wRight = new THREE.Mesh(wingGeo, guardMat);
    wRight.position.set(0.18, -0.02, 0);
    wRight.rotation.z = -Math.PI / 8;
    group.add(wRight);

    // Jewel
    const j = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), new THREE.MeshStandardMaterial({
        color: jewel, emissive: jewel, emissiveIntensity: 0.5
    }));
    j.position.set(0, 0.02, 0.08);
    group.add(j);

    // Handle & Pommel
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.25, 8), new THREE.MeshStandardMaterial({ color: handleColor || handle }));
    h.position.set(0, -0.15, 0);
    group.add(h);

    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), guardMat);
    pommel.position.set(0, -0.3, 0);
    group.add(pommel);

    // Add patterns if any
    if (options.patterns) options.patterns(group);

    // Notches (Battle-worn)
    const notchMat = new THREE.MeshStandardMaterial({ color: 0x221100, transparent: true, opacity: 0.4 });
    const n1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.08), notchMat);
    n1.position.set(0.09, 0.4, 0);
    n1.rotation.z = 0.4;
    group.add(n1);
}

function createStoneSwordParts(group) {
    createDetailedSword(group, {
        bladeLight: 0x999999, bladeDark: 0x666666, guard: 0x333333,
        jewel: 0xcccccc, handle: 0x443322
    });
}

function createIronSwordParts(group) {
    createDetailedSword(group, {
        bladeLight: 0xdddddd, bladeDark: 0xbbbbbb, guard: 0x777777,
        jewel: 0xffffff, handle: 0x222222
    });
}

function createDiamondSwordParts(group) {
    createDetailedSword(group, {
        bladeLight: 0x00ffff, bladeDark: 0x00cccc, guard: 0x003366,
        jewel: 0x00ffff, handle: 0x111122
    }, { bladeProps: { transparent: true, opacity: 0.9 } });
}

function createEmeraldSwordParts(group) {
    createDetailedSword(group, {
        bladeLight: 0x55ff55, bladeDark: 0x33cc33, guard: 0x006600,
        jewel: 0x55ff55, handle: 0x002200
    }, {
        patterns: (g) => {
            for (let i = 0; i < 3; i++) {
                const p = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), new THREE.MeshStandardMaterial({ color: 0x00aa00 }));
                p.position.set(0, 0.2 + i * 0.2, 0);
                p.rotation.z = Math.PI / 4;
                g.add(p);
            }
        }
    });
}

function createDefaultSwordParts(group) {
    let sInfo = SWORDS[player.swordId];
    const bladeGeo = new THREE.BoxGeometry(0.05, 0.4, 0.1);
    const bladeMat = new THREE.MeshStandardMaterial({ color: sInfo.color, emissive: sInfo.emissive || 0x000000 });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    group.add(blade);

    const hiltGeo = new THREE.BoxGeometry(0.08, 0.1, 0.12);
    const hiltMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const hilt = new THREE.Mesh(hiltGeo, hiltMat);
    hilt.position.set(0, -0.25, 0);
    group.add(hilt);
}

function updateSwordAppearance() {
    if (!handMesh) return;
    while (handMesh.children.length > 0) {
        handMesh.remove(handMesh.children[0]);
    }

    switch (player.swordId) {
        case 'wood': createWoodenSwordParts(handMesh); break;
        case 'stone': createStoneSwordParts(handMesh); break;
        case 'iron': createIronSwordParts(handMesh); break;
        case 'diamond': createDiamondSwordParts(handMesh); break;
        case 'emerald': createEmeraldSwordParts(handMesh); break;
        case 'rage': createRageBladeParts(handMesh); break;
        default: createDefaultSwordParts(handMesh); break;
    }

    // Maintain current opacity/transparency state
    if (player.isReaper) setHandMeshOpacity(0.3);
}

function setHandMeshOpacity(opacity) {
    handMesh.traverse(child => {
        if (child.material) {
            child.material.transparent = opacity < 1;
            child.material.opacity = opacity;
        }
    });
}

function getNextRageReq() {
    let t = RAGE_THRESHOLDS.find(x => x.from === player.swordId);
    return t ? t.req : null;
}

function addRage(amount) {
    player.rageDmg += amount;
    while (true) {
        let req = getNextRageReq();
        if (!req || player.rageDmg < req) break;
        player.rageDmg -= req;
        let t = RAGE_THRESHOLDS.find(x => x.from === player.swordId);
        player.swordId = t.to;
        updateSwordAppearance();
        showMessage(SWORDS[player.swordId].name + "(으)로 진화했습니다!");
    }
}

window.buyItem = function (type) {
    if (type === 'blocks' && player.iron >= 4) { player.iron -= 4; player.blocks += 16; }
    else if (type === 'gapple' && player.emerald >= 2) {
        player.emerald -= 2;
        player.gapples++;
        showMessage("황금 사과를 인벤토리(슬롯 3)에 추가했습니다!");
    }
    else if (type === 'bow' && player.iron >= 20) {
        player.iron -= 20;
        player.hotbar[3] = 'bow'; // Put it in slot 4
        showMessage("활을 구매했습니다! (슬롯 4)");
    }
    else if (type === 'crossbow' && player.emerald >= 15) {
        player.emerald -= 15;
        player.hotbar[4] = 'crossbow'; // Slot 5
        showMessage("석궁을 구매했습니다! (슬롯 5)");
    }
    else if (type === 'headhunter' && player.emerald >= 30) {
        player.emerald -= 30;
        player.hotbar[5] = 'headhunter'; // Slot 6
        showMessage("헤드헌터를 구매했습니다! (슬롯 6)");
    }
    else if (type.startsWith('sword_')) {
        if (player.kit === 'barbarian') {
            alert("바바리안 키트는 상점에서 검을 구매할 수 없습니다!");
            return;
        }
        let sType = type.split('_')[1];
        let costIron = { stone: 10, iron: 30 }[sType] || 0;
        let costEmerald = { diamond: 10, emerald: 20 }[sType] || 0;

        if (player.iron >= costIron && player.emerald >= costEmerald) {
            player.iron -= costIron;
            player.emerald -= costEmerald;
            player.swordId = sType;
            updateSwordAppearance();
        } else {
            alert("자원이 부족합니다.");
            return;
        }
    }
    else if (type.startsWith('armor_')) {
        let aType = type.split('_')[1];
        let costIron = { leather: 20 }[aType] || 0;
        let costEmerald = { iron: 10, diamond: 20 }[aType] || 0;
        let defense = { leather: 0.2, iron: 0.4, diamond: 0.6 }[aType] || 0;

        if (player.armor >= defense) {
            alert("이미 같거나 더 좋은 방어구를 착용 중입니다!");
            return;
        }
        if (player.iron >= costIron && player.emerald >= costEmerald) {
            player.iron -= costIron;
            player.emerald -= costEmerald;
            player.armor = defense;
        } else {
            alert("자원이 부족합니다.");
            return;
        }
    }
    else { alert("알 수 없는 아이템이거나 조건이 맞지 않습니다."); return; }
    updateUI();
}


function fireArrow(power) {
    let weapon = BOWS[player.bowId];
    if (!weapon) return;

    const arrowGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8);
    const arrowMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);

    let cam = isThirdPerson ? tpCamera : camera;
    let dir = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);

    arrow.position.copy(cam.position).add(dir.clone().multiplyScalar(0.5));
    arrow.quaternion.copy(cam.quaternion);
    arrow.rotateX(Math.PI / 2); // Cylinder length along Z

    let speed = 40 * power + 10;
    arrow.userData = {
        vel: dir.multiplyScalar(speed),
        dmg: weapon.dmg * (power * 0.5 + 0.5),
        weaponId: player.bowId,
        team: player.team,
        gravity: weapon.gravity,
        drag: weapon.drag
    };

    scene.add(arrow);
    arrows.push(arrow);
}

function updateArrows(dt) {
    for (let i = arrows.length - 1; i >= 0; i--) {
        let arrow = arrows[i];
        let ud = arrow.userData;

        arrow.position.add(ud.vel.clone().multiplyScalar(dt));
        ud.vel.y -= ud.gravity * 25 * dt;
        ud.vel.multiplyScalar(ud.drag);

        // Update rotation to face direction
        if (ud.vel.lengthSq() > 0.01) {
            let nextDir = ud.vel.clone().normalize();
            let lookAt = arrow.position.clone().add(nextDir);
            arrow.lookAt(lookAt);
            arrow.rotateX(Math.PI / 2);
        }

        // Collision check
        if (checkCollision(arrow.position, 0.2, 0.2)) {
            scene.remove(arrow);
            arrows.splice(i, 1);
            continue;
        }

        // Hit entities
        let hit = false;
        ais.forEach((ai, idx) => {
            if (ai.isDead || ai.team === ud.team) return;
            if (ai.mesh.position.distanceTo(arrow.position) < 1.0) {
                let damage = ud.dmg + (player.upgrades.attack * 3);

                // Headshot check
                let isHeadshot = false;
                if (ud.weaponId === 'headhunter' && arrow.position.y > ai.pos.y + 1.2) {
                    damage *= BOWS.headhunter.headshotMult;
                    isHeadshot = true;
                }

                let reduction = [0, 0.2, 0.4, 0.6][ai.armorLevel] || 0;
                damage *= (1 - reduction);
                ai.hp -= damage;

                if (ai.hp <= 0) {
                    ai.isDead = true; ai.mesh.position.y = -100;
                    let msg = isHeadshot ? "🎯 헤드샷!! " : "🏹 ";
                    showMessage(`${msg}${ai.team.toUpperCase()}를 처치했습니다!`);
                    if (beds[ai.team].exists) setTimeout(() => respawnAI(idx), 5000);
                } else {
                    if (isHeadshot) showMessage("🎯 헤드샷!");
                }

                hit = true;
            }
        });

        if (hit || arrow.position.y < -10 || arrow.position.length() > 200) {
            scene.remove(arrow);
            arrows.splice(i, 1);
        }
    }
}

function updateTrajectory() {
    if (!player.isCharging) {
        trajectoryLine.visible = false;
        return;
    }

    let weapon = BOWS[player.bowId];
    if (!weapon) return;

    trajectoryLine.visible = true;
    let cam = isThirdPerson ? tpCamera : camera;
    let dir = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    let pos = cam.position.clone().add(dir.clone().multiplyScalar(0.5));
    let vel = dir.multiplyScalar(40 * (player.charge / 100) + 10);

    let points = [];
    let p = pos.clone();
    let v = vel.clone();
    for (let j = 0; j < 60; j++) {
        points.push(p.clone());
        p.add(v.clone().multiplyScalar(0.05));
        v.y -= weapon.gravity * 25 * 0.05;
        v.multiplyScalar(weapon.drag);
        if (checkCollision(p, 0.1, 0.1)) break;
    }
    trajectoryLine.geometry.setFromPoints(points);
}

function takeDamage(dmg, cause = 'sword', attacker = 'unknown') {
    if (player.isDead || player.isReaper) return;

    let protection = player.armor + (player.upgrades.defense * 0.15);
    if (player.upgrades.defense >= 4) protection = 0.9999;

    player.hp -= dmg * (1 - Math.min(0.9, protection));

    const dmgOverlay = document.getElementById('damage-overlay');
    if (dmgOverlay) {
        dmgOverlay.style.opacity = '0.5';
        setTimeout(() => dmgOverlay.style.opacity = '0', 200);
    }

    if (player.hp <= 0) {
        player.isDead = true;

        let killMsg = "사망했습니다!";
        if (cause === 'fall') killMsg = "낙사했습니다!";
        else if (cause === 'sword') killMsg = `${attacker.toUpperCase()}에게 검으로 당했습니다!`;
        else if (cause === 'void') killMsg = "허공으로 떨어졌습니다!";

        showMessage(killMsg);


        if (player.kit === 'barbarian') {
            let req = getNextRageReq();
            let dropAmount = 0;
            if (req) {
                dropAmount = Math.floor(req * (2 / 3));
            } else {
                let prevT = RAGE_THRESHOLDS.find(x => x.to === player.swordId);
                if (prevT) dropAmount = Math.floor(prevT.req * (2 / 3));
            }
            player.rageDmg -= dropAmount;

            while (player.rageDmg < 0) {
                let prevT = RAGE_THRESHOLDS.find(x => x.to === player.swordId);
                if (prevT) {
                    player.swordId = prevT.from;
                    player.rageDmg += prevT.req;
                    updateSwordAppearance();
                    showMessage("사망하여 검이 퇴화했습니다...");
                } else {
                    player.rageDmg = 0;
                    break;
                }
            }
        }

        document.getElementById('death-overlay').classList.remove('hidden');
        controls.unlock();
        if (beds.red.exists) {
            let t = 5;
            document.getElementById('respawn-timer').textContent = t;
            let iv = setInterval(() => {
                t--;
                document.getElementById('respawn-timer').textContent = t;
                if (t <= 0) {
                    clearInterval(iv);
                    player.hp = player.maxHp;
                    player.isDead = false;
                    player.iron = 0; player.gold = 0; player.blocks = 0;
                    document.getElementById('death-overlay').classList.add('hidden');
                    controls.getObject().position.set(0, 5, 30);
                    velocity.set(0, 0, 0);

                    document.getElementById('blocker').style.display = 'flex';
                    document.getElementById('instructions').innerHTML = '<h1 style="font-size: 60px; margin-bottom:10px;">부활 완료</h1><p style="font-size: 24px; color: #ffdd44; margin-bottom: 30px;">[ 화면을 클릭하여 다시 전장으로! ]</p>';

                    updateUI();
                }
            }, 1000);
        } else {
            showMessage("GAME OVER");
            document.getElementById('respawn-timer').parentElement.textContent = "침대가 없어 부활할 수 없습니다.";
        }
    }
    updateUI();
}

function updateUI() {
    document.getElementById('hp-val').textContent = Math.ceil(Math.max(0, player.hp));
    document.getElementById('health-bar').style.width = Math.max(0, (player.hp / player.maxHp) * 100) + "%";

    let sInfo = SWORDS[player.swordId];
    if (sInfo) {
        document.getElementById('sword-name').textContent = sInfo.name;
        document.getElementById('sword-dmg').textContent = sInfo.dmg;
    }
    document.getElementById('armor-val').textContent = (player.armor * 100).toFixed(0) + "%";

    document.getElementById('iron-val').textContent = player.iron;
    document.getElementById('diamond-val').textContent = player.diamond;
    document.getElementById('emerald-val').textContent = player.emerald;
    document.getElementById('blocks-val').textContent = player.blocks;

    document.getElementById('bed-red').textContent = beds.red.exists ? "✅" : "❌";
    document.getElementById('bed-blue').textContent = beds.blue.exists ? "✅" : "❌";
    document.getElementById('bed-green').textContent = beds.green.exists ? "✅" : "❌";
    document.getElementById('bed-yellow').textContent = beds.yellow.exists ? "✅" : "❌";

    // Kit UIs
    document.getElementById('reaper-ui').classList.toggle('hidden', player.kit !== 'grimreaper');
    document.getElementById('evelyn-ui').classList.toggle('hidden', player.kit !== 'evelyn');
    document.getElementById('rage-gauge').classList.toggle('hidden', player.kit !== 'barbarian');

    if (player.kit === 'grimreaper') {
        document.getElementById('soul-count').textContent = player.souls;
        if (player.isReaper) {
            document.getElementById('reaper-duration-container').classList.remove('hidden');
            document.getElementById('reaper-duration-bar').style.width = (player.reaperTimer / 10 * 100) + "%";
        } else {
            document.getElementById('reaper-duration-container').classList.add('hidden');
        }
    }

    if (player.kit === 'evelyn') {
        document.getElementById('evelyn-soul-count').textContent = player.evelynSouls;
    }

    if (player.kit === 'barbarian') {
        let req = getNextRageReq();
        if (req) {
            document.getElementById('rage-val').textContent = Math.floor(player.rageDmg);
            document.getElementById('rage-max').textContent = req;
            document.getElementById('rage-bar').style.width = Math.min(100, (player.rageDmg / req) * 100) + "%";
        } else {
            document.getElementById('rage-val').textContent = "MAX";
            document.getElementById('rage-max').textContent = "MAX";
            document.getElementById('rage-bar').style.width = "100%";
        }
    }

    // Update Hotbar 
    for (let i = 0; i < 9; i++) {
        let slotEl = document.getElementById('slot-' + (i + 1));
        if (!slotEl) continue;

        slotEl.className = (i + 1 === player.activeSlot) ? 'hotbar-slot selected' : 'hotbar-slot';
        if (player.selectedMoveSlot === i) slotEl.classList.add('moving');

        let itemLabel = slotEl.querySelector('.slot-item');
        let countLabel = slotEl.querySelector('.slot-count');

        let item = player.hotbar[i];
        if (item === 'sword') {
            itemLabel.textContent = '🗡️';
            itemLabel.classList.remove('hidden');
            if (countLabel) countLabel.classList.add('hidden');
        } else if (item === 'blocks') {
            itemLabel.textContent = '🧱';
            itemLabel.classList.remove('hidden');
            if (countLabel) {
                countLabel.classList.remove('hidden');
                countLabel.textContent = player.blocks;
            }
        } else if (item === 'gapple') {
            itemLabel.textContent = '🍎';
            itemLabel.classList.remove('hidden');
            if (countLabel) {
                countLabel.classList.toggle('hidden', player.gapples <= 0);
                countLabel.textContent = player.gapples;
            }
        } else if (item === 'bow') {
            itemLabel.textContent = '🏹';
            itemLabel.classList.remove('hidden');
            if (countLabel) countLabel.classList.add('hidden');
        } else if (item === 'crossbow') {
            itemLabel.textContent = '🔫';
            itemLabel.classList.remove('hidden');
        } else if (item === 'headhunter') {
            itemLabel.textContent = '🔭';
            itemLabel.classList.remove('hidden');
        } else {
            itemLabel.classList.add('hidden');
            if (countLabel) countLabel.classList.add('hidden');
        }
    }
}


function showMessage(msg) {
    const d = document.getElementById('game-message');
    d.textContent = msg;
    d.classList.add('show');
    setTimeout(() => { d.classList.remove('show'); }, 3000);
}

function showVictory() {
    controls.unlock();
    document.getElementById('victory-overlay').classList.remove('hidden');
    let t = 15;
    document.getElementById('restart-timer').textContent = t;
    let iv = setInterval(() => {
        t--;
        document.getElementById('restart-timer').textContent = t;
        if (t <= 0) {
            clearInterval(iv);
            location.reload();
        }
    }, 1000);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    if (tpCamera) {
        tpCamera.aspect = window.innerWidth / window.innerHeight;
        tpCamera.updateProjectionMatrix();
    }
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    const time = performance.now();
    let dt = (time - prevTime) / 1000;
    if (dt > 0.1) dt = 0.1;
    prevTime = time;

    if (player.attackCooldown > 0) player.attackCooldown -= dt;

    if (player.isReaper) {
        player.reaperTimer -= dt;
        if (player.reaperTimer <= 0) {
            player.isReaper = false;
            setHandMeshOpacity(1.0);
            showMessage("그림리퍼 영혼 상태가 해제되었습니다.");
            updateUI();
        } else {
            updateUI(); // animate duration bar
        }
    }

    if (player.isCharging) {
        let weapon = BOWS[player.bowId];
        if (weapon) {
            player.charge += (dt / weapon.chargeTime) * 100;
            if (player.charge > 100) player.charge = 100;

            document.getElementById('charge-val').textContent = Math.floor(player.charge);
            document.getElementById('charge-bar').style.width = player.charge + "%";
            updateTrajectory();
        }
    }

    // Zoom Handling
    let targetFOV = 80;
    if (player.isZooming) {
        let weapon = BOWS[player.hotbar[player.activeSlot - 1]];
        if (weapon && weapon.zoom) targetFOV = 80 * weapon.zoom;
    }
    camera.fov += (targetFOV - camera.fov) * 0.1;
    camera.updateProjectionMatrix();
    if (tpCamera) {
        tpCamera.fov = camera.fov;
        tpCamera.updateProjectionMatrix();
    }

    if (controls.isLocked || isThirdPerson) updatePhysics(dt);

    updateAI(dt);
    updateItems(dt);
    updateArrows(dt);
    updateBlockPreview();

    if (isThirdPerson && tpCamera) {
        let pPos = controls.getObject().position;
        playerModelMesh.position.set(pPos.x, pPos.y - playerHeight / 2, pPos.z);
        let euler = new THREE.Euler().setFromQuaternion(controls.getObject().quaternion, 'YXZ');
        playerModelMesh.rotation.set(0, euler.y, 0);

        tpCamera.position.copy(pPos);

        let camEuler = new THREE.Euler().setFromQuaternion(controls.getObject().quaternion, 'YXZ');
        camEuler.y += tpOrbitAngleX;
        camEuler.x += tpOrbitAngleY;
        camEuler.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, camEuler.x));
        tpCamera.quaternion.setFromEuler(camEuler);

        let backDir = new THREE.Vector3(0, 0, 1).applyQuaternion(tpCamera.quaternion);
        raycaster.set(pPos, backDir);
        let dist = tpCameraDistance;
        let hits = raycaster.intersectObjects(blocksGroup.children);
        if (hits.length > 0 && hits[0].distance < dist) dist = hits[0].distance - 0.2;
        if (dist < 0.5) dist = 0.5;

        tpCamera.translateZ(dist);
        tpCamera.translateY(1.0);

        renderer.render(scene, tpCamera);
    } else {
        renderer.render(scene, camera);
    }
}

function getTargetBlockPos() {
    let rayMouse = isThirdPerson ? mouse : new THREE.Vector2(0, 0);
    let rayCam = isThirdPerson ? tpCamera : camera;
    raycaster.setFromCamera(rayMouse, rayCam);

    let blocks = raycaster.intersectObjects(blocksGroup.children);
    if (blocks.length > 0 && blocks[0].distance < 7) {
        let p = blocks[0].point.clone().add(blocks[0].face.normal.clone().multiplyScalar(0.5));
        return { bx: Math.floor(p.x), by: Math.floor(p.y), bz: Math.floor(p.z) };
    }

    // Forward/auto bridge logic
    let dir = raycaster.ray.direction;
    let origin = raycaster.ray.origin;
    let pPos = controls.getObject().position;

    // We want to build at the level the feet are resting ON (or jumping from)
    // pPos.y is eye level, playerHeight is eye-to-feet distance.
    // Subtracting 0.05 ensures if feet are exactly at y=1.0, footY is 0.
    let footY = Math.floor(pPos.y - playerHeight - 0.05);

    // If pointing down slightly, project to foot plane top
    if (dir.y < -0.1) {
        let t = (footY + 1 - origin.y) / dir.y;
        if (t > 0 && t < 7) {
            let p = origin.clone().add(dir.clone().multiplyScalar(t));
            return { bx: Math.floor(p.x), by: footY, bz: Math.floor(p.z) };
        }
    }

    // Otherwise just project in front at foot level
    let worldCam = isThirdPerson ? tpCamera : camera;
    let forwardVec = new THREE.Vector3(0, 0, -1).applyQuaternion(worldCam.quaternion);
    forwardVec.y = 0;
    if (forwardVec.lengthSq() > 0.001) {
        forwardVec.normalize();
        let toePos = pPos.clone().add(forwardVec.multiplyScalar(1.5));
        return { bx: Math.floor(toePos.x), by: footY, bz: Math.floor(toePos.z) };
    }
    return null;
}

function updateBlockPreview() {
    if ((!controls.isLocked && !isThirdPerson) || player.isDead || player.blocks <= 0 || player.activeSlot !== player.hotbar.indexOf('blocks') + 1) {
        blockPreview.visible = false;
        return;
    }

    let pos = getTargetBlockPos();
    if (pos) {
        let { bx, by, bz } = pos;
        let pPos = controls.getObject().position;
        if (Math.abs(pPos.x - (bx + 0.5)) < 0.8 && Math.abs(pPos.z - (bz + 0.5)) < 0.8 &&
            (by === Math.floor(pPos.y) || by === Math.floor(pPos.y - playerHeight))) {
            blockPreview.visible = false;
        } else {
            blockPreview.position.set(bx + 0.5, by + 0.5, bz + 0.5);
            blockPreview.visible = true;
        }
    } else {
        blockPreview.visible = false;
    }
}

init();
