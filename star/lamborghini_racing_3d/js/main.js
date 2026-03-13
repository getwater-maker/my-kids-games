/* js/main.js */

let scene, camera, renderer;
let car, carPhysics = { speed: 0, maxSpeed: 2.5, acceleration: 0.005, friction: 0.002, steering: 0, driftFactor: 0.98 };
let keys = { w: false, a: false, s: false, d: false, shift: false, space: false };
let track, trackSegments = [];
let nitro = 100, isNitroActive = false;
let raceStartTime = 0, currentLap = 1;
let gameState = 'START';

// Environment
let worldObjects = [];
let particles = [];

function init() {
    setupThree();
    createWorld();
    createLamborghini();
    setupControls();
    animate();
}

function setupThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    scene.fog = new THREE.FogExp2(0x050505, 0.01);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00d2ff, 0.8);
    dirLight.position.set(50, 100, 50);
    scene.add(dirLight);

    // Night city light feel
    const pointLight = new THREE.PointLight(0xf1c40f, 1, 100);
    pointLight.position.set(0, 50, 0);
    scene.add(pointLight);
}

function createLamborghini() {
    car = new THREE.Group();

    // Body Mat (Metallic Orange)
    const bodyMat = new THREE.MeshStandardMaterial({
        color: 0xff6600, // Vibrant Orange
        metalness: 0.9,
        roughness: 0.1,
        emissive: 0x331100,
        emissiveIntensity: 0.1
    });

    const blackMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.5 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x111111, transparent: true, opacity: 0.7 });

    // 1. Lower Body Chassis (Low & Wide)
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.35, 4.6), bodyMat);
    lowerBody.position.y = 0.35;
    car.add(lowerBody);

    // 2. Aggressive Front Splitter (Carbon Fiber Look)
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.05, 0.8), blackMat);
    splitter.position.set(0, 0.2, -2.4);
    car.add(splitter);

    // 3. Main Body Slant (Hood)
    const hoodGeom = new THREE.BoxGeometry(2, 0.15, 2.2);
    const hood = new THREE.Mesh(hoodGeom, bodyMat);
    hood.position.set(0, 0.5, -1.3);
    hood.rotation.x = 0.12;
    car.add(hood);

    // 4. Cabin (Curved Windshield Look)
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.45, 1.8), glassMat);
    cabin.position.set(0, 0.8, 0.2);
    car.add(cabin);

    // Roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.02, 1.2), blackMat);
    roof.position.set(0, 1.05, 0.3);
    car.add(roof);

    // 5. Side Intakes / Vents (Aggressive)
    const ventGeom = new THREE.BoxGeometry(0.2, 0.6, 1.2);
    const leftVent = new THREE.Mesh(ventGeom, blackMat);
    leftVent.position.set(-1.05, 0.5, 0.8);
    leftVent.rotation.y = 0.2;
    car.add(leftVent);

    const rightVent = new THREE.Mesh(ventGeom, blackMat);
    rightVent.position.set(1.05, 0.5, 0.8);
    rightVent.rotation.y = -0.2;
    car.add(rightVent);

    // 6. Signature Y-Shaped Headlights (Self-glowing)
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const createYLight = (isLeft) => {
        const yHeadlight = new THREE.Group();
        const part1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.03), glowMat);
        part1.rotation.z = isLeft ? 0.5 : -0.5;
        const part2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.03), glowMat);
        part2.rotation.z = isLeft ? -0.5 : 0.5;
        part2.position.y = 0.15;
        yHeadlight.add(part1, part2);
        return yHeadlight;
    };

    const leftY = createYLight(true);
    leftY.position.set(-0.75, 0.45, -2.35);
    const rightY = createYLight(false);
    rightY.position.set(0.75, 0.45, -2.35);
    car.add(leftY, rightY);

    // 7. Wheels (Black Performance Rims)
    const wheelGeom = new THREE.CylinderGeometry(0.4, 0.4, 0.4, 16);
    wheelGeom.rotateZ(Math.PI / 2);
    for (let i = 0; i < 4; i++) {
        const wheelGroup = new THREE.Group();
        const tire = new THREE.Mesh(wheelGeom, blackMat);
        wheelGroup.add(tire);

        // Rim detail
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.41, 8), new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 1 }));
        rim.rotateZ(Math.PI / 2);
        wheelGroup.add(rim);

        wheelGroup.position.set(i % 2 === 0 ? -1.1 : 1.1, 0.4, i < 2 ? -1.5 : 1.5);
        car.add(wheelGroup);
    }

    // 8. Rear Tail Section & Lights
    const rearTail = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.3, 0.5), blackMat);
    rearTail.position.set(0, 0.45, 2.3);
    car.add(rearTail);

    const tailGlowMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.05), tailGlowMat);
    tl.position.set(-0.6, 0.5, 2.5);
    const tr = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.05), tailGlowMat);
    tr.position.set(0.6, 0.5, 2.5);
    car.add(tl, tr);

    scene.add(car);
}

function createWorld() {
    // Floor
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(2000, 2000),
        new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Neon Circuit Track
    const trackWidth = 20;
    const trackRadius = 400;
    const segments = 128;

    const points = [];
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        // Wavy loop
        const r = trackRadius + Math.sin(angle * 4) * 50;
        points.push(new THREE.Vector3(Math.cos(angle) * r, 0.01, Math.sin(angle) * r));
    }

    // Draw Track Line
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x00d2ff });
    for (let i = 0; i < points.length - 1; i++) {
        const seg = new THREE.Mesh(new THREE.BoxGeometry(trackWidth, 0.1, 10), new THREE.MeshStandardMaterial({ color: 0x222222 }));
        const dir = points[i + 1].clone().sub(points[i]).normalize();
        seg.position.copy(points[i]);
        seg.lookAt(points[i + 1]);
        scene.add(seg);
        trackSegments.push(seg);

        // Neon Border
        const borderL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 10), lineMat);
        borderL.position.set(-trackWidth / 2, 0.2, 0);
        seg.add(borderL);
        const borderR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 10), lineMat);
        borderR.position.set(trackWidth / 2, 0.2, 0);
        seg.add(borderR);
    }

    // Distant City Lights
    for (let i = 0; i < 300; i++) {
        const light = new THREE.Mesh(new THREE.BoxGeometry(2, Math.random() * 50, 2), new THREE.MeshStandardMaterial({ color: 0x222222 }));
        const dist = 500 + Math.random() * 500;
        const angle = Math.random() * Math.PI * 2;
        light.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
        scene.add(light);

        const neon = new THREE.Mesh(new THREE.PlaneGeometry(1, 10), new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? 0x00d2ff : 0xf1c40f }));
        neon.position.y = Math.random() * 20 + 5;
        neon.position.z = 1.1;
        light.add(neon);
    }
}

function setupControls() {
    window.addEventListener('keydown', (e) => {
        const k = e.key.toLowerCase();
        if (k === 'w') keys.w = true;
        if (k === 'a') keys.a = true;
        if (k === 's') keys.s = true;
        if (k === 'd') keys.d = true;
        if (k === 'shift') { keys.shift = true; isNitroActive = true; }
        if (k === ' ') keys.space = true;
    });

    window.addEventListener('keyup', (e) => {
        const k = e.key.toLowerCase();
        if (k === 'w') keys.w = false;
        if (k === 'a') keys.a = false;
        if (k === 's') keys.s = false;
        if (k === 'd') keys.d = false;
        if (k === 'shift') { keys.shift = false; isNitroActive = false; }
        if (k === ' ') keys.space = false;
    });

    document.getElementById('start-btn').addEventListener('click', () => {
        document.getElementById('start-overlay').classList.add('hidden');
        gameState = 'RACING';
        raceStartTime = Date.now();
    });
}

function updatePhysics(delta) {
    if (gameState !== 'RACING') return;

    // Acceleration
    if (keys.w) {
        let acc = carPhysics.acceleration;
        if (keys.shift && nitro > 0) {
            acc *= 2.5;
            nitro -= 1;
            createNitroParticles();
        }
        carPhysics.speed += acc;
    } else if (keys.s) {
        carPhysics.speed -= carPhysics.acceleration * 1.5;
    }

    // Steering
    if (Math.abs(carPhysics.speed) > 0.01) {
        const steerSpeed = 0.04 * (carPhysics.speed / carPhysics.maxSpeed);
        if (keys.a) carPhysics.steering += steerSpeed;
        if (keys.d) carPhysics.steering -= steerSpeed;
    }

    // Friction & Caps
    carPhysics.speed *= (keys.space ? 0.95 : 0.985); // Space is handbrake
    const currentMax = (keys.shift && nitro > 0) ? carPhysics.maxSpeed * 1.5 : carPhysics.maxSpeed;
    carPhysics.speed = Math.max(-0.5, Math.min(carPhysics.speed, currentMax));

    // Movement
    car.rotation.y = carPhysics.steering;
    car.position.x += Math.sin(car.rotation.y) * -carPhysics.speed * 80 * delta;
    car.position.z += Math.cos(car.rotation.y) * -carPhysics.speed * 80 * delta;

    // Follow Camera
    const cameraOffset = new THREE.Vector3(0, 5, 12);
    const cameraTarget = car.position.clone();
    const relativeCameraOffset = cameraOffset.applyMatrix4(car.matrixWorld);
    camera.position.lerp(relativeCameraOffset, 0.1);
    camera.lookAt(cameraTarget.clone().add(new THREE.Vector3(0, 1, -5).applyMatrix4(car.matrixWorld)));

    nitro = Math.min(100, nitro + 0.1);
}

function createNitroParticles() {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({ color: 0x00d2ff }));
    p.position.copy(car.position).add(new THREE.Vector3(0, 0.3, 2).applyMatrix4(car.matrixWorld));
    p.userData.vel = new THREE.Vector3((Math.random() - 0.5) * 0.5, Math.random() * 0.5, 2).applyMatrix4(car.matrixWorld).sub(car.position).normalize().multiplyScalar(-0.5);
    p.userData.life = 1.0;
    scene.add(p);
    particles.push(p);
}

function updateUI() {
    const kmh = Math.floor(Math.abs(carPhysics.speed) * 140);
    document.getElementById('speed-val').textContent = kmh;
    document.getElementById('nitro-fill').style.width = nitro + '%';

    const gear = kmh === 0 ? 'N' : (kmh < 40 ? '1' : kmh < 80 ? '2' : kmh < 120 ? '3' : '4');
    document.getElementById('gear-val').textContent = gear;

    if (gameState === 'RACING') {
        const elapsed = Date.now() - raceStartTime;
        const m = Math.floor(elapsed / 60000).toString().padStart(2, '0');
        const s = Math.floor((elapsed % 60000) / 1000).toString().padStart(2, '0');
        const ms = Math.floor((elapsed % 1000) / 10).toString().padStart(2, '0');
        document.getElementById('race-time').textContent = `${m}:${s}:${ms}`;
    }
}

function animate() {
    requestAnimationFrame(animate);
    const delta = 0.016; // Fix delta for movement consistency

    updatePhysics(delta);

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].position.add(particles[i].userData.vel);
        particles[i].userData.life -= 0.05;
        particles[i].scale.setScalar(particles[i].userData.life);
        if (particles[i].userData.life <= 0) {
            scene.remove(particles[i]);
            particles.splice(i, 1);
        }
    }

    updateUI();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

init();
