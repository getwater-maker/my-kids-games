// star/99_nights_in_the_forest/js/main.js

const CONFIG = {
    walkSpeed: 6.0,
    runSpeed: 10.0,
    jumpForce: 8.0,
    gravity: 20.0,
    eyeHeight: 1.7,
    dayDuration: 60, // seconds
    nightDuration: 60, // seconds
    forestSize: 100,
    maxHealth: 100,
    maxHunger: 100,
    maxFuel: 100,
};

let scene, camera, renderer, controls, clock;
let gameState = 'START';
let stats = {
    health: 100,
    hunger: 100,
    fuel: 100,
    night: 1,
    isDay: true,
    timeOfDay: 0 // 0 to 1
};

let platforms = [];
let trees = [];
let rocks = [];
let interactables = []; // New array for gatherable items
let inventory = { wood: 0, scrap: 0, food: 0 };
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2(0, 0); // Center of screen
let creatures = [];
let flashlight;
let isFlashlightOn = false;
let children = [];
let rescuedCount = 0;
let playerAIs = [];

// UI Elements
let healthBar, hungerBar, fuelBar, nightCount, timeBar, hud, overlay, interactionPrompt;

function init() {
    // UI Refs
    healthBar = document.getElementById('health-bar');
    hungerBar = document.getElementById('hunger-bar');
    fuelBar = document.getElementById('fuel-bar');
    nightCount = document.getElementById('night-count');
    timeBar = document.getElementById('time-bar');
    hud = document.getElementById('hud');
    overlay = document.getElementById('overlay');
    interactionPrompt = document.getElementById('interaction-prompt');

    clock = new THREE.Clock();

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x00050a);
    scene.fog = new THREE.FogExp2(0x00050a, 0.05);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, CONFIG.eyeHeight, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Controls
    controls = new THREE.PointerLockControls(camera, document.body);
    document.getElementById('start-btn').onclick = () => controls.lock();

    controls.addEventListener('lock', () => {
        if (gameState === 'START') {
            gameState = 'PLAYING';
            overlay.classList.add('hidden');
            hud.classList.remove('hidden');
        }
    });

    setupLights();
    setupFlashlight();
    createWorld();
    spawnDeer();
    spawnChildren();
    spawnPlayerAIs();
    animate();
}

function spawnPlayerAIs() {
    const names = ["Alex", "Jordan", "Taylor", "Casey", "Riley", "Sam", "Charlie"];
    for (let i = 0; i < 7; i++) {
        const group = new THREE.Group();

        // Body
        const bodyGeo = new THREE.BoxGeometry(0.6, 1.2, 0.4);
        const bodyMat = new THREE.MeshPhongMaterial({ color: Math.random() * 0xffffff });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.6;
        body.castShadow = true;
        group.add(body);

        // Head
        const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const head = new THREE.Mesh(headGeo, bodyMat);
        head.position.y = 1.4;
        group.add(head);

        const x = (Math.random() - 0.5) * 10;
        const z = (Math.random() - 0.5) * 10;
        group.position.set(x, 0, z);
        scene.add(group);

        playerAIs.push({
            mesh: group,
            health: 100,
            hunger: 100,
            inventory: { wood: 0 },
            state: 'IDLE', // IDLE, GATHERING, RETURNING
            targetPos: new THREE.Vector3(x, 0, z),
            waitTime: 0,
            name: names[i]
        });
    }
}

function spawnChildren() {
    for (let i = 0; i < 4; i++) {
        const x = (Math.random() - 0.5) * CONFIG.forestSize * 1.5;
        const z = (Math.random() - 0.5) * CONFIG.forestSize * 1.5;
        if (Math.sqrt(x * x + z * z) < 20) { i--; continue; } // Don't spawn near camp

        const bodyGeo = new THREE.BoxGeometry(0.4, 0.8, 0.4);
        const bodyMat = new THREE.MeshPhongMaterial({ color: 0x3498db });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.set(x, 0.4, z);
        body.castShadow = true;
        body.isChild = true;
        scene.add(body);

        const child = {
            mesh: body,
            state: 'IDLE', // IDLE, FOLLOWING, RESCUED
            speed: 4
        };
        children.push(child);
        interactables.push(body);
    }
}

function setupFlashlight() {
    flashlight = new THREE.SpotLight(0xffffff, 0, 40, Math.PI / 6, 0.5, 1);
    flashlight.castShadow = true;
    scene.add(flashlight);
    scene.add(flashlight.target);
}

function spawnDeer() {
    // A simple representation of the "Deer" entity
    const bodyGeo = new THREE.BoxGeometry(0.8, 1.2, 0.5);
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0x222222 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);

    const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(0, 0.8, 0.3);
    body.add(head);

    body.position.set(30, 0.6, 30);
    body.castShadow = true;
    scene.add(body);

    creatures.push({
        mesh: body,
        state: 'ROAM',
        speed: 3,
        targetPos: new THREE.Vector3(30, 0.6, 30),
        waitTime: 0,
        health: 100,
        stunTime: 0
    });
}

function setupLights() {
    ambientLight = new THREE.AmbientLight(0x404040, 0.2);
    scene.add(ambientLight);

    sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(50, 100, 50);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    scene.add(sun);

    // Campfire light (initially low)
    campfireLight = new THREE.PointLight(0xffaa44, 2, 15);
    campfireLight.position.set(0, 0.5, 0);
    campfireLight.castShadow = true;
    scene.add(campfireLight);
}

function createWorld() {
    // Ground
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshPhongMaterial({ color: 0x1a2a1a });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    platforms.push(ground);

    // Campfire
    const campGeo = new THREE.CylinderGeometry(0.5, 0.6, 0.2, 8);
    const campMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
    campfireMesh = new THREE.Mesh(campGeo, campMat);
    campfireMesh.position.set(0, 0.1, 0);
    scene.add(campfireMesh);

    // Forest Generation
    generateForest();
    createEnvironment();

    // Campfire is interactable
    campfireMesh.isCampfire = true;
    interactables.push(campfireMesh);

    // Crafting Bench (Grinder) - Cosmetic for now
    createCraftingBench();
}

function createCraftingBench() {
    const group = new THREE.Group();
    const tableGeo = new THREE.BoxGeometry(1.5, 0.8, 1);
    const tableMat = new THREE.MeshPhongMaterial({ color: 0x4a4a4a });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.y = 0.4;
    group.add(table);

    const grinderGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.5, 8);
    const grinderMat = new THREE.MeshPhongMaterial({ color: 0x222222 });
    const grinder = new THREE.Mesh(grinderGeo, grinderMat);
    grinder.position.set(0, 1, 0);
    group.add(grinder);

    group.position.set(-3, 0, 0);
    scene.add(group);
}

function createEnvironment() {
    // Rocks
    for (let i = 0; i < 50; i++) {
        const x = (Math.random() - 0.5) * CONFIG.forestSize * 2;
        const z = (Math.random() - 0.5) * CONFIG.forestSize * 2;
        if (Math.sqrt(x * x + z * z) < 10) continue;

        const s = 0.5 + Math.random() * 1.5;
        const geo = new THREE.DodecahedronGeometry(s, 0);
        const mat = new THREE.MeshPhongMaterial({ color: 0x555555 });
        const rock = new THREE.Mesh(geo, mat);
        rock.position.set(x, s * 0.5, z);
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        rock.castShadow = true;
        rock.receiveShadow = true;
        scene.add(rock);
    }
}

function generateForest() {
    const treeCount = 100;
    for (let i = 0; i < treeCount; i++) {
        const x = (Math.random() - 0.5) * CONFIG.forestSize * 1.5;
        const z = (Math.random() - 0.5) * CONFIG.forestSize * 1.5;
        if (Math.sqrt(x * x + z * z) < 5) continue;

        const h = 4 + Math.random() * 4;
        createTree(x, h, z);

        // Randomly spawn gatherables around trees
        if (Math.random() > 0.5) spawnGatherable(x + (Math.random() - 0.5) * 3, z + (Math.random() - 0.5) * 3, 'WOOD');
        if (Math.random() > 0.8) spawnGatherable(x + (Math.random() - 0.5) * 3, z + (Math.random() - 0.5) * 3, 'FOOD');
    }
}

function createTree(x, h, z) {
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, h, 6);
    const trunkMat = new THREE.MeshPhongMaterial({ color: 0x3d2b1f });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, h / 2, z);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    scene.add(trunk);

    const leafGeo = new THREE.ConeGeometry(1.5, 3, 6);
    const leafMat = new THREE.MeshPhongMaterial({ color: 0x0a1a0a });
    const leaves = new THREE.Mesh(leafGeo, leafMat);
    leaves.position.set(x, h + 1, z);
    leaves.castShadow = true;
    scene.add(leaves);
    trees.push({ trunk, leaves });
}

function spawnGatherable(x, z, type) {
    let geo, mat, color;
    if (type === 'WOOD') {
        geo = new THREE.BoxGeometry(0.8, 0.2, 0.2);
        color = 0x5d4037;
    } else {
        geo = new THREE.SphereGeometry(0.2, 8, 8);
        color = 0xe91e63;
    }
    mat = new THREE.MeshPhongMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.1, z);
    mesh.rotation.y = Math.random() * Math.PI;
    mesh.castShadow = true;
    mesh.type = type;
    mesh.isGatherable = true;
    scene.add(mesh);
    interactables.push(mesh);
}

function updateSurvival(delta) {
    if (gameState !== 'PLAYING') return;

    // Time cycle - speed up with rescued children
    const speedMult = 1 + rescuedCount * 0.5;
    const duration = stats.isDay ? CONFIG.dayDuration : CONFIG.nightDuration;
    stats.timeOfDay += (delta * speedMult) / duration;

    if (stats.timeOfDay >= 1) {
        stats.timeOfDay = 0;
        stats.isDay = !stats.isDay;
        if (stats.isDay) stats.night++;
    }

    // Update Lighting based on time
    const cycle = stats.timeOfDay;
    if (stats.isDay) {
        // Day transition
        const intensity = Math.sin(cycle * Math.PI);
        sun.intensity = intensity;
        ambientLight.intensity = 0.1 + intensity * 0.4;
        scene.fog.color.setHSL(0.6, 0.2, 0.05 + intensity * 0.1);
        scene.background.setHSL(0.6, 0.2, 0.05 + intensity * 0.1);
    } else {
        // Night transition
        sun.intensity = 0;
        ambientLight.intensity = 0.05;
        scene.fog.color.setHSL(0.6, 0.5, 0.01);
        scene.background.setHSL(0.6, 0.5, 0.01);
    }

    // Campfire Fuel and Health
    if (!stats.isDay) {
        stats.fuel -= delta * 2; // Burn fuel faster at night
        if (stats.fuel <= 0) {
            stats.fuel = 0;
            // Drain health in darkness
            const distToCamp = camera.position.distanceTo(new THREE.Vector3(0, camera.position.y, 0));
            if (distToCamp > 5) {
                stats.health -= delta * 5;
                shakeCamera();
            }
        }
    } else {
        stats.fuel -= delta * 0.5; // Slow burn during day
    }

    // Hunger
    stats.hunger -= delta * 0.5;
    if (stats.hunger <= 0) {
        stats.hunger = 0;
        stats.health -= delta * 2;
        if (Math.random() < 0.1) shakeCamera();
    }

    // Regen near fire if day or fueled
    const distToCamp = camera.position.distanceTo(new THREE.Vector3(0, camera.position.y, 0));
    if (distToCamp < 3 && (stats.isDay || stats.fuel > 0)) {
        stats.health = Math.min(CONFIG.maxHealth, stats.health + delta * 2);
    }

    // Check Death
    if (stats.health <= 0) triggerGameOver();

    // Flashlight follow
    if (flashlight) {
        flashlight.position.copy(camera.position);
        const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        flashlight.target.position.copy(camera.position).add(dir);
    }

    // Creature AI
    updateCreatures(delta);

    // Children AI
    updateChildren(delta);

    // AI Players AI
    updatePlayerAIs(delta);

    updateUI();
}

function updatePlayerAIs(delta) {
    const campPos = new THREE.Vector3(0, 0, 0);

    playerAIs.forEach(ai => {
        if (ai.health <= 0) {
            ai.mesh.visible = false;
            return;
        }

        const distToCamp = ai.mesh.position.distanceTo(campPos);
        const isNight = !stats.isDay;

        // Survival Logic
        if (isNight && stats.fuel <= 0 && distToCamp > 5) {
            ai.health -= delta * 5;
        }
        ai.hunger -= delta * 0.3;
        if (ai.hunger <= 0) ai.health -= delta * 2;

        // Regen near fire
        if (distToCamp < 3 && (stats.isDay || stats.fuel > 0)) {
            ai.health = Math.min(100, ai.health + delta * 2);
            if (ai.hunger < 50) ai.hunger += delta * 5; // AI "eats" at camp
        }

        // Behavior Logic
        if (isNight || ai.health < 40) {
            ai.state = 'RETURNING';
        } else if (ai.inventory.wood >= 3) {
            ai.state = 'RETURNING';
        } else {
            ai.state = 'GATHERING';
        }

        if (ai.state === 'RETURNING') {
            ai.targetPos.copy(campPos);
            moveAI(ai, delta);

            // Refuel campfire
            if (distToCamp < 3 && ai.inventory.wood > 0) {
                stats.fuel = Math.min(CONFIG.maxFuel, stats.fuel + ai.inventory.wood * 20);
                ai.inventory.wood = 0;
            }
        } else {
            // Roam / Gather
            if (ai.waitTime > 0) {
                ai.waitTime -= delta;
            } else {
                if (ai.mesh.position.distanceTo(ai.targetPos) < 1) {
                    // Find nearest wood
                    let nearest = null;
                    let minDist = 30;
                    interactables.forEach(obj => {
                        if (obj.isGatherable && obj.type === 'WOOD') {
                            const d = ai.mesh.position.distanceTo(obj.position);
                            if (d < minDist) {
                                minDist = d;
                                nearest = obj;
                            }
                        }
                    });

                    if (nearest) {
                        ai.targetPos.copy(nearest.position);
                    } else {
                        ai.targetPos.set(
                            (Math.random() - 0.5) * CONFIG.forestSize,
                            0,
                            (Math.random() - 0.5) * CONFIG.forestSize
                        );
                    }
                    ai.waitTime = 1 + Math.random() * 2;
                } else {
                    moveAI(ai, delta);
                }
            }

            // Gather check
            interactables.forEach(obj => {
                if (obj.isGatherable && ai.mesh.position.distanceTo(obj.position) < 2) {
                    if (obj.type === 'WOOD') ai.inventory.wood++;
                    if (obj.type === 'FOOD') ai.hunger = Math.min(100, ai.hunger + 20);

                    scene.remove(obj);
                    interactables = interactables.filter(i => i !== obj);
                }
            });
        }
    });
}

function moveAI(ai, delta) {
    const dir = ai.targetPos.clone().sub(ai.mesh.position);
    dir.y = 0;
    if (dir.length() > 0.1) {
        dir.normalize();
        ai.mesh.position.add(dir.multiplyScalar(4 * delta));
        ai.mesh.lookAt(ai.targetPos.x, 0, ai.targetPos.z);
    }
}

function updateChildren(delta) {
    const playerPos = camera.position.clone();
    playerPos.y = 0.4;
    const campPos = new THREE.Vector3(0, 0.4, 0);

    children.forEach(c => {
        if (c.state === 'FOLLOWING') {
            const distToPlayer = c.mesh.position.distanceTo(playerPos);
            if (distToPlayer > 2) {
                const dir = playerPos.clone().sub(c.mesh.position).normalize();
                c.mesh.position.add(dir.multiplyScalar(c.speed * delta));
                c.mesh.lookAt(playerPos);
            }

            // Check if reached camp
            if (c.mesh.position.distanceTo(campPos) < 4) {
                c.state = 'RESCUED';
                rescuedCount++;
                // Stop following
                interactables = interactables.filter(i => i !== c.mesh);
            }
        } else if (c.state === 'RESCUED') {
            // Stay near camp
            c.mesh.position.y = 0.4;
        }
    });
}

function updateCreatures(delta) {
    const playerPos = camera.position.clone();
    playerPos.y = 0.6;

    creatures.forEach(c => {
        if (c.stunTime > 0) {
            c.stunTime -= delta;
            return;
        }

        const distToPlayer = c.mesh.position.distanceTo(playerPos);
        const isNight = !stats.isDay;

        if (isNight && distToPlayer < 20 && stats.fuel <= 5) {
            // Hunt player if dark
            c.state = 'HUNT';
        } else if (distToPlayer > 30) {
            c.state = 'ROAM';
        }

        if (c.state === 'HUNT') {
            const dir = playerPos.clone().sub(c.mesh.position).normalize();
            c.mesh.position.add(dir.multiplyScalar(c.speed * 1.5 * delta));
            c.mesh.lookAt(playerPos);

            if (distToPlayer < 1.5) {
                stats.health -= delta * 30; // High damage
            }
        } else {
            // Roam logic
            if (c.waitTime > 0) {
                c.waitTime -= delta;
            } else {
                if (c.mesh.position.distanceTo(c.targetPos) < 1) {
                    c.targetPos.set(
                        (Math.random() - 0.5) * CONFIG.forestSize,
                        0.6,
                        (Math.random() - 0.5) * CONFIG.forestSize
                    );
                    c.waitTime = 2 + Math.random() * 3;
                } else {
                    const dir = c.targetPos.clone().sub(c.mesh.position).normalize();
                    c.mesh.position.add(dir.multiplyScalar(c.speed * delta));
                    c.mesh.lookAt(c.targetPos);
                }
            }
        }

        // Flashlight stun check
        if (isFlashlightOn) {
            const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            const toCreature = c.mesh.position.clone().sub(camera.position).normalize();
            const angle = camDir.angleTo(toCreature);
            if (angle < Math.PI / 8 && distToPlayer < 15) {
                c.stunTime = 2; // Stun for 2 seconds
            }
        }
    });
}

function updateUI() {
    healthBar.style.width = `${stats.health}%`;
    hungerBar.style.width = `${stats.hunger}%`;
    fuelBar.style.width = `${stats.fuel}%`;
    nightCount.textContent = stats.night;
    timeBar.style.width = `${stats.timeOfDay * 100}%`;
    timeBar.style.background = stats.isDay ? '#fff' : '#e74c3c';
}

function triggerGameOver() {
    gameState = 'GAMEOVER';
    controls.unlock();
    document.getElementById('game-over').classList.remove('hidden');
}

// Logic for movement (re-using robust collision from previous projects)
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let isJumping = false;
const keys = {};

window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'KeyE') handleInteraction();
    if (e.code === 'KeyF') toggleFlashlight();
});

function toggleFlashlight() {
    isFlashlightOn = !isFlashlightOn;
    flashlight.intensity = isFlashlightOn ? 2 : 0;
}

function handleInteraction() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactables);

    if (intersects.length > 0) {
        const obj = intersects[0].object;
        const dist = intersects[0].distance;

        if (dist < 4) {
            if (obj.isGatherable) {
                if (obj.type === 'WOOD') inventory.wood++;
                if (obj.type === 'FOOD') {
                    stats.hunger = Math.min(CONFIG.maxHunger, stats.hunger + 20);
                }
                // Remove from scene and interactables
                scene.remove(obj);
                interactables = interactables.filter(i => i !== obj);
            } else if (obj.isCampfire) {
                if (inventory.wood > 0) {
                    stats.fuel = Math.min(CONFIG.maxFuel, stats.fuel + inventory.wood * 20);
                    inventory.wood = 0;
                }
            } else if (obj.isChild) {
                const child = children.find(c => c.mesh === obj);
                if (child && child.state === 'IDLE') {
                    child.state = 'FOLLOWING';
                }
            }
        }
    }
}

function updateInteractionUI() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactables);

    let found = false;
    if (intersects.length > 0) {
        const dist = intersects[0].distance;
        if (dist < 4) found = true;
    }

    if (found) {
        interactionPrompt.classList.remove('hidden');
    } else {
        interactionPrompt.classList.add('hidden');
    }
}
window.addEventListener('keyup', (e) => keys[e.code] = false);

function updateMovement(delta) {
    if (gameState !== 'PLAYING') return;

    const speed = keys['ShiftLeft'] ? CONFIG.runSpeed : CONFIG.walkSpeed;
    const subStep = delta / 4;

    for (let i = 0; i < 4; i++) {
        // Gravity
        velocity.y -= CONFIG.gravity * subStep;
        if (keys['Space'] && !isJumping) {
            velocity.y = CONFIG.jumpForce;
            isJumping = true;
        }

        camera.position.y += velocity.y * subStep;

        // Simple Floor Check
        if (camera.position.y < CONFIG.eyeHeight) {
            camera.position.y = CONFIG.eyeHeight;
            velocity.y = 0;
            isJumping = false;
        }

        // Horizontal Move
        direction.z = Number(keys['KeyW']) - Number(keys['KeyS']);
        direction.x = Number(keys['KeyD']) - Number(keys['KeyA']);
        direction.normalize();

        const moveX = direction.x * speed * subStep;
        const moveZ = direction.z * speed * subStep;

        if (moveZ !== 0) controls.moveForward(moveZ);
        if (moveX !== 0) controls.moveRight(moveX);

        // Tree Collision (Simple Radius Check)
        checkTreeCollisions();
    }
}

function checkTreeCollisions() {
    const playerRadius = 0.5;
    trees.forEach(tree => {
        const dx = camera.position.x - tree.trunk.position.x;
        const dz = camera.position.z - tree.trunk.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const minDist = playerRadius + 0.3; // trunk radius is 0.2-0.3

        if (dist < minDist) {
            const angle = Math.atan2(dz, dx);
            camera.position.x = tree.trunk.position.x + Math.cos(angle) * minDist;
            camera.position.z = tree.trunk.position.z + Math.sin(angle) * minDist;
        }
    });
}

function animate() {
    requestAnimationFrame(animate);

    // Always get delta to prevent accumulation
    const rawDelta = clock.getDelta();
    if (gameState !== 'PLAYING') return;

    const delta = Math.min(rawDelta, 0.04);

    updateMovement(delta);
    updateSurvival(delta);
    updateInteractionUI();

    // Smooth camera recover from shake
    camera.position.x += (Math.random() - 0.5) * shakeAmount;
    camera.position.z += (Math.random() - 0.5) * shakeAmount;
    shakeAmount *= 0.9;

    // Campfire Flicker
    if (stats.fuel > 0) {
        campfireLight.intensity = 1.5 + Math.random() * 0.5;
    } else {
        campfireLight.intensity = Math.max(0, campfireLight.intensity - delta * 5);
    }

    renderer.render(scene, camera);
}

let shakeAmount = 0;
function shakeCamera() {
    shakeAmount = 0.1;
}

window.onload = init;
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
