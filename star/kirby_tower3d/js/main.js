// js/main.js

let scene, camera, renderer, controls;
let world;

let kirbyMesh, kirbyBody;
let platforms = [];
const platformHeightStep = 5;
let maxGeneratedHeight = 0;

let currentHeightScore = 0;
let isGameOver = false;

// Input State
const keys = { w: false, a: false, s: false, d: false, space: false };

// Player Physics Consts
const MOVE_FORCE = 300;
const MAX_SPEED = 15;
const JUMP_VELOCITY = 15;
const HOVER_VELOCITY = 10;
const MAX_HOVER_ENERGY = 100;

let hoverEnergy = MAX_HOVER_ENERGY;
let hoverRegenTimer = 0;
let isHovering = false;
let canJump = false; // Ground contact flag

// UI Elements
const uiHeight = document.getElementById('height-score');
const uiHoverBar = document.getElementById('hover-bar');
const uiGameOver = document.getElementById('game-over');
const uiFinalScore = document.getElementById('final-score');
const uiRetryBtn = document.getElementById('retry-btn');

init();
animate();

function init() {
    // 1. Three.js Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky
    scene.fog = new THREE.Fog(0x87CEEB, 50, 200);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Camera will follow player, initial offset
    camera.position.set(0, 10, 30);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Orbit Controls for looking around
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    // Don't allow camera to go below player/floor, preventing the "underwater" skybox illusion
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 20; // Keep camera inside the radius 30 tower

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight.position.set(50, 200, 50);
    dirLight.castShadow = true;
    dirLight.shadow.camera.left = -50;
    dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = -50;
    dirLight.shadow.camera.far = 400;
    scene.add(dirLight);

    // Add a light that explicitly illuminates the interior
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    hemiLight.position.set(0, 100, 0);
    scene.add(hemiLight);

    // 2. Cannon.js Physics World
    world = new CANNON.World();
    world.gravity.set(0, -30, 0); // slightly higher gravity for snappy jumps
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 10;

    // Physics Materials
    const physicsMaterial = new CANNON.Material("standard");
    const physicsContactMaterial = new CANNON.ContactMaterial(physicsMaterial, physicsMaterial, {
        friction: 0.1,
        restitution: 0.0, // Prevent bouncing
        contactEquationStiffness: 1e8,
        contactEquationRelaxation: 3
    });
    world.addContactMaterial(physicsContactMaterial);

    // 3. Create Player (Kirby)
    const radius = 1.5;
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshPhongMaterial({ color: 0xff88a0 }); // Kirby pink
    kirbyMesh = new THREE.Mesh(geometry, material);
    kirbyMesh.castShadow = true;
    kirbyMesh.receiveShadow = true;

    // Add fake eyes to mesh
    const eyeGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.scale.set(1, 2, 1); // Make it an oval
    leftEye.position.set(-0.5, 0.5, radius - 0.1);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.scale.set(1, 2, 1); // Make it an oval
    rightEye.position.set(0.5, 0.5, radius - 0.1);
    kirbyMesh.add(leftEye);
    kirbyMesh.add(rightEye);
    scene.add(kirbyMesh);

    // Player Physics Body
    const sphereShape = new CANNON.Sphere(radius);
    kirbyBody = new CANNON.Body({
        mass: 5,
        material: physicsMaterial,
        position: new CANNON.Vec3(0, 2, 0), // Start near floor
        linearDamping: 0.4, // Air resistance / friction
        angularDamping: 1.0 // Prevent rolling if possible, we want him upright
    });
    kirbyBody.addShape(sphereShape);
    kirbyBody.fixedRotation = true; // Don't roll like a ball
    kirbyBody.updateMassProperties();
    world.addBody(kirbyBody);

    // Collision Event for Ground Check
    kirbyBody.addEventListener("collide", function (e) {
        // Check contact normal to see if hitting floor
        const contactNormal = new CANNON.Vec3();
        e.contact.ni.negate(contactNormal);
        // If the normal is pointing upwards, we hit ground
        if (contactNormal.dot(new CANNON.Vec3(0, 1, 0)) > 0.5) {
            canJump = true;
            isHovering = false;
        }
    });

    // 4. Create Initial Tower and Platforms
    createCentralTower();

    // Ground base platform filling the entire floor (Dark Gray)
    createPlatform(new CANNON.Vec3(0, -2, 0), 60, 4, 60, true);

    generatePlatformsUpTo(50); // Gen initial chunks

    // 5. Input Listeners
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onWindowResize);

    uiRetryBtn.addEventListener('click', resetGame);
}

function createCentralTower() {
    // Generate a huge hollow cylinder (tube)
    const radius = 30; // Much wider so we can fit inside
    const height = 1000;

    // We want the player INSIDE the cylinder, so we use BackSide material
    const geo = new THREE.CylinderGeometry(radius, radius, height, 32, 1, true); // true = open ended
    // Add a wireframe helper so the wall doesn't look like an empty void
    const mat = new THREE.MeshStandardMaterial({
        color: 0x81d4fa, // Light Sky Blue color for the inside tower
        side: THREE.BackSide, // Render the INSIDE surface
        roughness: 0.9,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.position.y = height / 2 - 10;
    scene.add(mesh);

    // Wall grid to give visual depth
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x0277bd, wireframe: true, side: THREE.BackSide, transparent: true, opacity: 0.3 });
    const wireMesh = new THREE.Mesh(geo, wireMat);
    wireMesh.position.copy(mesh.position);
    scene.add(wireMesh);

    // Physics
    // Cannon.js doesn't have a hollow cylinder primitive that works well for interior collisions.
    // Instead of a single complex shape, we'll build the interior "walls" using overlapping boxes arranged in a circle.
    const numSegments = 16;
    const segmentAngle = (Math.PI * 2) / numSegments;
    const thickness = 5;

    for (let i = 0; i < numSegments; i++) {
        const angle = i * segmentAngle;
        const x = Math.sin(angle) * (radius + thickness / 2 - 0.5); // slight inset to prevent clipping
        const z = Math.cos(angle) * (radius + thickness / 2 - 0.5);

        // Width of each segment to form a closed circle (approximately)
        const segmentWidth = (2 * Math.PI * radius) / numSegments + 2;

        const shape = new CANNON.Box(new CANNON.Vec3(segmentWidth / 2, height / 2, thickness / 2));
        const body = new CANNON.Body({ mass: 0 });

        body.position.set(x, height / 2 - 10, z);
        body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), angle);
        body.addShape(shape);
        world.addBody(body);
    }
}

function createPlatform(pos, w = 8, h = 2, d = 8, isFloor = false) {
    const geo = new THREE.BoxGeometry(w, h, d);
    let color;
    if (isFloor) {
        color = new THREE.Color(0x333333); // Dark gray floor
    } else {
        // User requested Purple platforms to contrast against the Blue walls
        color = new THREE.Color().setHSL(0.75 + Math.random() * 0.1, 0.8, 0.6);
    }
    const mat = new THREE.MeshPhongMaterial({ color: color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);

    const shape = new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2));
    const body = new CANNON.Body({ mass: 0 }); // static
    body.addShape(shape);
    body.position.copy(pos);
    world.addBody(body);

    platforms.push({ mesh, body });
}

function generatePlatformsUpTo(targetHeight) {
    while (maxGeneratedHeight < targetHeight) {
        maxGeneratedHeight += platformHeightStep;

        // Calculate a spiral position AGAINST the inside walls of the tower
        // Reduced the angle multiplier so the platforms are much closer horizontally!
        const angle = maxGeneratedHeight * 0.25;
        const innerRadius = 24; // PUSHED BACK AGAINST THE WALL (Radius 30, Width 12)

        const x = Math.sin(angle) * innerRadius;
        const z = Math.cos(angle) * innerRadius;

        // Add small random variation so it's not a perfect staircase
        const offsetX = (Math.random() - 0.5) * 2;
        const offsetZ = (Math.random() - 0.5) * 2;

        // Create platform jutting out from the wall. Made them larger!
        createPlatform(new CANNON.Vec3(x + offsetX, maxGeneratedHeight, z + offsetZ), 12, 1.5, 12);

        // Add some random floating platforms closer to the center
        if (Math.random() > 0.7) {
            const centerRadius = Math.random() * 10; // 0 to 10 from center
            const cx = Math.sin(angle + Math.PI) * centerRadius;
            const cz = Math.cos(angle + Math.PI) * centerRadius;
            createPlatform(new CANNON.Vec3(cx, maxGeneratedHeight + 2, cz), 4, 1, 4);
        }
    }
}

// Controls
function onKeyDown(e) {
    if (isGameOver) return;
    const key = e.key.toLowerCase();

    if (key === 'w' || e.keyCode === 38) keys.w = true;
    if (key === 's' || e.keyCode === 40) keys.s = true;
    if (key === 'a' || e.keyCode === 37) keys.a = true;
    if (key === 'd' || e.keyCode === 39) keys.d = true;

    if (key === ' ' || key === 'spacebar') {
        if (canJump) {
            // Normal Jump
            kirbyBody.velocity.y = JUMP_VELOCITY;
            canJump = false;
        } else if (hoverEnergy > 10) {
            // Hover in mid-air
            isHovering = true;
            kirbyBody.velocity.y = HOVER_VELOCITY;
            hoverEnergy -= 15;
            hoverRegenTimer = 0; // delay regen
            updateGauge();
        }
    }
}

function onKeyUp(e) {
    const key = e.key.toLowerCase();
    if (key === 'w' || e.keyCode === 38) keys.w = false;
    if (key === 's' || e.keyCode === 40) keys.s = false;
    if (key === 'a' || e.keyCode === 37) keys.a = false;
    if (key === 'd' || e.keyCode === 39) keys.d = false;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function resetGame() {
    kirbyBody.position.set(0, 2, 0); // Start near floor
    kirbyBody.velocity.set(0, 0, 0);
    hoverEnergy = MAX_HOVER_ENERGY;
    isGameOver = false;
    currentHeightScore = 0;
    uiHeight.textContent = 0;
    uiGameOver.classList.add('hidden');
    controls.target.set(0, 2, 0);
    updateGauge();
}

function updatePhysics() {
    if (isGameOver) return;

    // Movement relative to camera angle
    let forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 0.001) {
        forward.set(0, 0, -1); // Fallback if looking straight down/up
    }
    forward.normalize();

    let right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    let moveVec = new THREE.Vector3(0, 0, 0);
    // Important: Use fixed force values instead of just adding vectors
    if (keys.w) moveVec.add(forward);
    if (keys.s) moveVec.sub(forward);
    if (keys.a) moveVec.sub(right);
    if (keys.d) moveVec.add(right);

    // Apply force based on input
    if (moveVec.lengthSq() > 0.01) {
        moveVec.normalize().multiplyScalar(MOVE_FORCE * (1 / 60));
        kirbyBody.applyForce(new CANNON.Vec3(moveVec.x, 0, moveVec.z), kirbyBody.position);

        // Rotate Kirby mesh to face movement dir
        const targetAngle = Math.atan2(-moveVec.x, -moveVec.z);
        kirbyMesh.rotation.y = targetAngle;
    }

    // Limit Max speed on XZ plane
    const vX = kirbyBody.velocity.x;
    const vZ = kirbyBody.velocity.z;
    const speed = Math.sqrt(vX * vX + vZ * vZ);
    if (speed > MAX_SPEED) {
        const ratio = MAX_SPEED / speed;
        kirbyBody.velocity.x *= ratio;
        kirbyBody.velocity.z *= ratio;
    }

    // Hover Regen
    if (canJump) {
        hoverRegenTimer++;
        if (hoverRegenTimer > 60 && hoverEnergy < MAX_HOVER_ENERGY) { // 1 sec delay
            hoverEnergy += 1.5;
            if (hoverEnergy > MAX_HOVER_ENERGY) hoverEnergy = MAX_HOVER_ENERGY;
            updateGauge();
        }
    }
}

function updateGauge() {
    const pct = Math.max(0, (hoverEnergy / MAX_HOVER_ENERGY) * 100);
    uiHoverBar.style.width = pct + '%';

    if (pct < 30) uiHoverBar.style.backgroundColor = '#f44336';
    else if (pct < 60) uiHoverBar.style.backgroundColor = '#ffeb3b';
    else uiHoverBar.style.backgroundColor = '#00e5ff';
}

function animate() {
    requestAnimationFrame(animate);

    if (!isGameOver) {
        world.step(1 / 60);
        updatePhysics();
    }

    // Sync meshes with bodies
    kirbyMesh.position.copy(kirbyBody.position);
    // Note: intentionally skipping copying quaternion to keep Kirby upright.
    // Instead, we manually calculated Y rotation during movement logic.

    // Update Camera Target
    controls.target.copy(kirbyMesh.position);
    controls.update();

    // Check Altitude
    let altitude = Math.floor(kirbyMesh.position.y);
    if (altitude > currentHeightScore) {
        currentHeightScore = altitude;
        uiHeight.textContent = currentHeightScore;

        // Procedurally generate more tower as we go up
        if (currentHeightScore + 100 > maxGeneratedHeight) {
            generatePlatformsUpTo(maxGeneratedHeight + 50);
        }
    }

    // Death check (fall down far below score)
    const deathPlane = Math.max(-20, currentHeightScore - 40);
    if (kirbyMesh.position.y < deathPlane && !isGameOver) {
        isGameOver = true;
        uiFinalScore.textContent = currentHeightScore;
        uiGameOver.classList.remove('hidden');
    }

    renderer.render(scene, camera);
}
