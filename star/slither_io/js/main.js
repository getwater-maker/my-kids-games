// GLOBALS: THREE

let scene, camera, renderer, clock;
let snake = [], tailSegments = [];
let foods = [];
let targetAngle = 0, currentAngle = 0;
let speed = 0.2;
let score = 0;
let isDead = false;

const CONFIG = {
    segmentCount: 40,
    segmentSize: 0.5,
    foodCount: 150,
    arenaSize: 200,
};

function init() {
    scene = new THREE.Scene();
    
    // Create a beautiful space background
    const spaceGeo = new THREE.SphereGeometry(500, 32, 32);
    const spaceMat = new THREE.MeshBasicMaterial({
        color: 0x050510,
        side: THREE.BackSide
    });
    const space = new THREE.Mesh(spaceGeo, spaceMat);
    scene.add(space);

    // Stars
    const starGeo = new THREE.BufferGeometry();
    const starCoords = [];
    for(let i=0; i<5000; i++) {
        starCoords.push((Math.random()-0.5)*1000, (Math.random()-0.5)*1000, (Math.random()-0.5)*1000);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starCoords, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5 });
    scene.add(new THREE.Points(starGeo, starMat));

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 30, 0);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    // Don't clear game-container, it contains the UI!
    document.getElementById('game-container').appendChild(renderer.domElement);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.zIndex = '1';

    setupLights();
    spawnSnake();
    spawnFood();
    setupControls();

    clock = new THREE.Clock();
    animate();
}

function setupLights() {
    const ambient = new THREE.AmbientLight(0x404040, 1.5);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(20, 50, 20);
    sun.castShadow = true;
    scene.add(sun);
}

function spawnSnake() {
    const headGeo = new THREE.SphereGeometry(CONFIG.segmentSize * 1.3, 32, 32);
    const headMat = new THREE.MeshStandardMaterial({ 
        color: 0x00ff88, 
        emissive: 0x00ff88, 
        emissiveIntensity: 1.5, // Brighter glow
        roughness: 0,
        metalness: 0.5
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 0.5, 0);
    head.castShadow = true;
    scene.add(head);
    snake.push(head);

    // High Tech Eyes
    const eyeGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 16);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
    const eyeL = new THREE.Group();
    const e1 = new THREE.Mesh(eyeGeo, eyeMat);
    e1.rotation.x = Math.PI/2;
    const g1 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), glowMat);
    g1.position.z = -0.06;
    eyeL.add(e1, g1);
    eyeL.position.set(0.25, 0.3, -0.4);
    head.add(eyeL);

    const eyeR = eyeL.clone();
    eyeR.position.set(-0.25, 0.3, -0.4);
    head.add(eyeR);

    // Initial body
    for (let i = 1; i < CONFIG.segmentCount; i++) {
        addSegment(i);
    }
}

function addSegment(index) {
    const geo = new THREE.SphereGeometry(CONFIG.segmentSize, 24, 24);
    const mat = new THREE.MeshStandardMaterial({ 
        color: new THREE.Color().setHSL(0.45, 1, 0.5 - (index*0.005)), 
        roughness: 0.2,
        metalness: 0.3
    });
    const segment = new THREE.Mesh(geo, mat);
    segment.position.set(0, 0.5, index * 0.6);
    segment.castShadow = true;
    scene.add(segment);
    tailSegments.push(segment);

    // Scale segments slightly down towards end
    const scale = 1.0 - (index / 200);
    segment.scale.set(scale, scale, scale);
}

function spawnFood() {
    for (let i = 0; i < CONFIG.foodCount; i++) {
        createFood();
    }
}

function createFood() {
    const colors = [0x00ff88, 0x00bdff, 0xff00ff, 0xffff00];
    const geo = new THREE.IcosahedronGeometry(0.3, 1);
    const mat = new THREE.MeshStandardMaterial({ 
        color: colors[Math.floor(Math.random() * colors.length)],
        emissive: colors[Math.floor(Math.random() * colors.length)],
        emissiveIntensity: 0.5
    });
    const food = new THREE.Mesh(geo, mat);
    food.position.set(
        (Math.random() - 0.5) * CONFIG.arenaSize,
        0.3,
        (Math.random() - 0.5) * CONFIG.arenaSize
    );
    scene.add(food);
    foods.push(food);
}

function setupControls() {
    window.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = -(e.clientY / window.innerHeight) * 2 + 1;
        targetAngle = Math.atan2(x, y);
    });

    document.getElementById('start-btn').addEventListener('click', () => {
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('start-screen').style.display = 'none';
    });
}

function animate() {
    if(isDead) return;
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    
    // Smooth rotation
    const angleDiff = targetAngle - currentAngle;
    currentAngle += angleDiff * 0.1;
    
    const head = snake[0];
    const lastPos = head.position.clone();

    // Move Head
    head.position.x += Math.sin(currentAngle) * speed;
    head.position.z += Math.cos(currentAngle) * speed;
    head.rotation.y = currentAngle;

    // Boundary check
    if (Math.abs(head.position.x) > CONFIG.arenaSize / 2 || Math.abs(head.position.z) > CONFIG.arenaSize / 2) {
        // Bounce or wrap? Let's wrap
        head.position.x *= -0.99;
        head.position.z *= -0.99;
    }

    // Move Tail with "Elastic" physics
    let prevPos = head.position;
    tailSegments.forEach((seg, i) => {
        const dx = prevPos.x - seg.position.x;
        const dz = prevPos.z - seg.position.z;
        const angle = Math.atan2(dx, dz);
        const distance = 0.6; // Desired distance between segments
        
        seg.position.x = prevPos.x - Math.sin(angle) * distance;
        seg.position.z = prevPos.z - Math.cos(angle) * distance;
        seg.rotation.y = angle;
        
        prevPos = seg.position;
    });

    // Camera follow
    camera.position.x = head.position.x;
    camera.position.z = head.position.z + 25;
    camera.lookAt(head.position.x, 0, head.position.z);

    // Food collision
    foods.forEach((food, i) => {
        const dist = head.position.distanceTo(food.position);
        if (dist < 1.5) {
            scene.remove(food);
            foods.splice(i, 1);
            createFood();
            score++;
            document.getElementById('score-text').textContent = `Length: ${tailSegments.length + 1}`;
            
            // Grow snake
            if(score % 2 === 0) addSegment(tailSegments.length + 1);
        }
    });

    // Food floating animation
    const time = Date.now() * 0.002;
    foods.forEach(food => {
        food.position.y = 0.5 + Math.sin(time + food.position.x) * 0.2;
        food.rotation.y += 0.02;
    });

    renderer.render(scene, camera);
}

init();
