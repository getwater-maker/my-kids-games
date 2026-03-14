let scene, camera, renderer, clock;
let player, enemy;
let gameState = 'START';
let particles = [];
let keys = {};
let cameraMode = 0; // 0: 3P, 1: 1P, 2: 2P (Spectator)

// --- CONFIG ---
const CONFIG = {
    arenaSize: 100,
    playerSpeed: 0.15,
    enemySpeed: 0.1,
    turnSpeed: 0.04
};

// --- INITIALIZATION ---
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);
    scene.fog = new THREE.Fog(0x050510, 20, 80);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 10, 15);

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container').appendChild(renderer.domElement);

    clock = new THREE.Clock();

    setupLights();
    setupArena();
    player = createRobot(0x00d2ff, -15);
    enemy = createRobot(0xff3e3e, 15);
    player.hp = 100;
    enemy.hp = 100;

    setupEventListeners();
    animate();
}

function setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(20, 50, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    // Dynamic spot lights for "Arena" feel
    const spot1 = new THREE.SpotLight(0x00d2ff, 5, 100, 0.5);
    spot1.position.set(-30, 40, -30);
    scene.add(spot1);

    const spot2 = new THREE.SpotLight(0xff3e3e, 5, 100, 0.5);
    spot2.position.set(30, 40, 30);
    scene.add(spot2);
}

function setupArena() {
    // Floor (Grid Metallic)
    const floorGeo = new THREE.PlaneGeometry(200, 200);
    const floorMat = new THREE.MeshStandardMaterial({ 
        color: 0x111111, 
        metalness: 0.8, 
        roughness: 0.2
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid details
    const grid = new THREE.GridHelper(200, 40, 0x00d2ff, 0x222222);
    grid.position.y = 0.05;
    scene.add(grid);

    // Outer Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, metalness: 0.9, roughness: 0.1 });
    for(let i=0; i<4; i++) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(200, 8, 2), wallMat);
        const angle = (i * Math.PI) / 2;
        wall.position.x = Math.cos(angle) * 100;
        wall.position.z = Math.sin(angle) * 100;
        wall.rotation.y = -angle;
        wall.castShadow = true;
        wall.receiveShadow = true;
        scene.add(wall);
    }
}

function createRobot(color, startX) {
    const group = new THREE.Group();

    // Materials
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x95afc0, metalness: 0.9, roughness: 0.1 });
    const colorMat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.7, roughness: 0.3 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffce00 });

    // Torso (Main Chassis)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 0.8), metalMat);
    torso.position.y = 2.5;
    torso.castShadow = true;
    group.add(torso);

    const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 0.2), colorMat);
    chestPlate.position.set(0, 0.2, 0.45);
    torso.add(chestPlate);

    // Head (Cylindrical with glow)
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.2;
    torso.add(headGroup);

    const headMain = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.6, 16), metalMat);
    headMain.rotation.z = Math.PI / 2;
    headGroup.add(headMain);

    const headGlow = new THREE.Mesh(new THREE.CircleGeometry(0.35, 16), glowMat);
    headGlow.position.z = 0.31;
    headGroup.add(headGlow);

    // Arms
    const leftArm = createLimb(0.3, 1.5, metalMat);
    leftArm.position.set(-0.8, 0.6, 0);
    torso.add(leftArm);
    group.leftArm = leftArm;

    const rightArm = createLimb(0.3, 1.5, metalMat);
    rightArm.position.set(0.8, 0.6, 0);
    torso.add(rightArm);
    group.rightArm = rightArm;

    // Legs
    const leftLeg = createLimb(0.4, 1.8, metalMat);
    leftLeg.position.set(-0.4, -0.9, 0);
    torso.add(leftLeg);
    group.leftLeg = leftLeg;

    const rightLeg = createLimb(0.4, 1.8, metalMat);
    rightLeg.position.set(0.4, -0.9, 0);
    torso.add(rightLeg);
    group.rightLeg = rightLeg;

    group.position.set(startX, 0, 0);
    scene.add(group);
    
    group.userData = {
        velocity: new THREE.Vector3(),
        rotationY: 0,
        isAttacking: false,
        attackType: 'NONE', // PUNCH or KICK
        attackPhase: 0,
        hp: 100
    };

    return group;
}

function createLimb(w, h, mat) {
    const limb = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat);
    limb.position.y = -h/2;
    limb.castShadow = true;
    const pivot = new THREE.Group();
    pivot.add(limb);
    return pivot;
}

function setupEventListeners() {
    window.onkeydown = (e) => keys[e.code] = true;
    window.onkeyup = (e) => keys[e.code] = false;

    // Mouse Controls
    window.onmousedown = (e) => {
        if (gameState !== 'PLAYING') return;
        const ai = player.userData;
        if (e.button === 0 && !ai.isAttacking) { // Left Click
            ai.isAttacking = true;
            ai.attackType = 'PUNCH';
            ai.attackPhase = 0;
            logCombat("UNIT 01: EXECUTING PUNCH PROTOCOL");
        }
    };

    // Mouse Wheel for Camera Mode
    window.onwheel = (e) => {
        if (e.deltaY > 0) cameraMode = (cameraMode + 1) % 3;
        else cameraMode = (cameraMode - 1 + 3) % 3;
        
        const modes = ["3RD PERSON", "1ST PERSON", "SPECTATOR"];
        logCombat("CAMERA MODE: " + modes[cameraMode]);
    };

    document.getElementById('start-btn').onclick = () => {
        gameState = 'PLAYING';
        document.getElementById('start-screen').classList.add('hidden');
        logCombat("SYSTEMS ONLINE. COMMENCE COMBAT.");
    };
}

function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();

    if (gameState === 'PLAYING') {
        updatePlayer(dt);
        updateAI(dt);
        updatePhysics(dt);
        updateParticles(dt);
        updateCamera(dt);
    }
    renderer.render(scene, camera);
}

function updatePlayer(dt) {
    const ai = player.userData;

    if (keys['KeyW']) ai.velocity.z += CONFIG.playerSpeed;
    if (keys['KeyS']) ai.velocity.z -= CONFIG.playerSpeed;
    if (keys['KeyA']) player.rotation.y += CONFIG.turnSpeed;
    if (keys['KeyD']) player.rotation.y -= CONFIG.turnSpeed;

    if (keys['KeyF'] && !ai.isAttacking) {
        ai.isAttacking = true;
        ai.attackType = 'KICK';
        ai.attackPhase = 0;
        logCombat("UNIT 01: EXECUTING KICK OVERLOAD");
    }
}

function updateAI(dt) {
    if (enemy.hp <= 0) return;
    const ai = enemy.userData;

    const dist = enemy.position.distanceTo(player.position);
    const dir = player.position.clone().sub(enemy.position).normalize();
    
    if (dist > 5) {
        enemy.position.add(dir.multiplyScalar(CONFIG.enemySpeed));
        const angle = Math.atan2(dir.x, dir.z);
        enemy.rotation.y += (angle - enemy.rotation.y) * 0.1;
    } else {
        if (!ai.isAttacking) {
            ai.isAttacking = true;
            ai.attackType = Math.random() > 0.4 ? 'PUNCH' : 'KICK';
            ai.attackPhase = 0;
        }
    }
}

function updatePhysics(dt) {
    [player, enemy].forEach(bot => {
        if (bot.hp <= 0) return;
        const ai = bot.userData;
        
        // Move in direction of rotation
        const direction = new THREE.Vector3(0,0,1).applyQuaternion(bot.quaternion);
        bot.position.add(direction.multiplyScalar(ai.velocity.z));
        
        const isMoving = Math.abs(ai.velocity.z) > 0.01;
        ai.velocity.z *= 0.85; // Friction

        // Animations
        const time = Date.now() * 0.01;
        if (isMoving) {
            bot.leftLeg.rotation.x = Math.sin(time) * 0.5;
            bot.rightLeg.rotation.x = Math.sin(time + Math.PI) * 0.5;
            bot.leftArm.rotation.x = Math.sin(time + Math.PI) * 0.3;
            bot.rightArm.rotation.x = Math.sin(time) * 0.3;
        } else {
            bot.leftLeg.rotation.x *= 0.9;
            bot.rightLeg.rotation.x *= 0.9;
        }

        // Attack Animation (Punch / Kick)
        if (ai.isAttacking) {
            ai.attackPhase += 0.15;
            
            if (ai.attackType === 'PUNCH') {
                bot.rightArm.rotation.x = -Math.PI/2 - Math.sin(ai.attackPhase * Math.PI) * 1.5;
            } else if (ai.attackType === 'KICK') {
                bot.rightLeg.rotation.x = -Math.PI/2 - Math.sin(ai.attackPhase * Math.PI) * 1.5;
                bot.position.y = 0.5 * Math.sin(ai.attackPhase * Math.PI); // Hop while kicking
            }
            
            if (ai.attackPhase >= 0.5 && ai.attackPhase < 0.6) {
                const target = bot === player ? enemy : player;
                const damage = ai.attackType === 'PUNCH' ? 5 : 12;
                checkHit(bot, target, damage);
            }

            if (ai.attackPhase >= 1) {
                ai.isAttacking = false;
                ai.attackType = 'NONE';
                ai.attackPhase = 0;
                bot.position.y = 0;
            }
        } else if (!isMoving) {
            bot.rightArm.rotation.x *= 0.9;
            bot.leftArm.rotation.x *= 0.9;
            bot.rightLeg.rotation.x *= 0.9;
        }

        // Strict Arena Bounds (Wall Collision)
        const limit = 97; 
        bot.position.x = Math.max(-limit, Math.min(limit, bot.position.x));
        bot.position.z = Math.max(-limit, Math.min(limit, bot.position.z));
    });

    // Bot-to-Bot Collision (Preventing overlap)
    const dist = player.position.distanceTo(enemy.position);
    const minDist = 3.5; // Combined radius
    if (dist < minDist) {
        const reaction = enemy.position.clone().sub(player.position).normalize();
        const overlap = minDist - dist;
        player.position.sub(reaction.clone().multiplyScalar(overlap / 2));
        enemy.position.add(reaction.clone().multiplyScalar(overlap / 2));
    }
}

function checkHit(attacker, target, damage = 0.5) {
    if (target.hp <= 0) return;
    
    const dist = attacker.position.distanceTo(target.position);
    if (dist < 4.5) {
        target.hp -= damage;
        updateUI();
        spawnSparks(target.position);
        
        // Knockback based on damage
        const pushDir = target.position.clone().sub(attacker.position).normalize();
        target.position.add(pushDir.multiplyScalar(damage * 0.05));

        if (target.hp <= 0) {
            logCombat(`${target === enemy ? 'ENEMY' : 'PLAYER'} DESTROYED.`);
            triggerEnd(target === enemy);
        }
    }
}

function spawnSparks(pos) {
    for (let i = 0; i < 5; i++) {
        const p = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 4, 4),
            new THREE.MeshBasicMaterial({ color: 0xffff00 })
        );
        p.position.copy(pos).add(new THREE.Vector3((Math.random()-0.5)*2, 1, (Math.random()-0.5)*2));
        scene.add(p);
        particles.push({
            mesh: p,
            velocity: new THREE.Vector3((Math.random()-0.5)*0.5, Math.random()*0.5, (Math.random()-0.5)*0.5),
            life: 1.0
        });
    }
}

function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.mesh.position.add(p.velocity);
        p.velocity.y -= 0.02; // Gravity
        p.life -= 0.05;
        if (p.life <= 0) {
            scene.remove(p.mesh);
            particles.splice(i, 1);
        }
    }
}

function updateCamera(dt) {
    let idealOffset, targetPos;

    switch(cameraMode) {
        case 1: // 1ST PERSON
            // Positioned inside/at the head
            idealOffset = new THREE.Vector3(0, 3.5, 0.4).applyQuaternion(player.quaternion);
            targetPos = player.position.clone().add(idealOffset);
            camera.position.copy(targetPos);
            // Look forward
            const forward = new THREE.Vector3(0, 0, 10).applyQuaternion(player.quaternion);
            camera.lookAt(player.position.clone().add(forward));
            break;

        case 2: // 2ND PERSON (SPECTATOR / SIDE VIEW)
            // A cinematic side-view that tries to keep both bots in frame
            const midPoint = player.position.clone().lerp(enemy.position, 0.5);
            const dist = player.position.distanceTo(enemy.position);
            camera.position.lerp(new THREE.Vector3(midPoint.x + 15 + dist/2, 8, midPoint.z), 0.1);
            camera.lookAt(midPoint);
            break;

        default: // 3RD PERSON
            idealOffset = new THREE.Vector3(0, 6, -12).applyQuaternion(player.quaternion);
            targetPos = player.position.clone().add(idealOffset);
            camera.position.lerp(targetPos, 0.1);
            camera.lookAt(player.position.x, 2, player.position.z);
            break;
    }
}

function updateUI() {
    document.getElementById('p1-hp').style.width = player.hp + '%';
    document.getElementById('p2-hp').style.width = enemy.hp + '%';
    
    if (player.hp < 30) document.getElementById('p1-status').textContent = 'CRITICAL';
    if (enemy.hp < 30) document.getElementById('p2-status').textContent = 'DAMAGED';
}

function logCombat(msg) {
    document.getElementById('combat-log').textContent = msg;
}

function triggerEnd(win) {
    gameState = 'END';
    document.getElementById('end-screen').classList.remove('hidden');
    document.getElementById('end-title').textContent = win ? 'VICTORY' : 'DEFEATED';
    document.getElementById('end-title').style.color = win ? '#00d2ff' : '#ff3e3e';
}

init();
