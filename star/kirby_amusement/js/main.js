const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('start-btn');
const homeBtn = document.getElementById('home-btn');
const bgm = document.getElementById('bgm');
const hintText = document.getElementById('hint-text');
const threeCanvas = document.getElementById('threeCanvas');

let gameState = 'START'; // START, DRIVING, PARK, RIDE_3D_...
let cameraX = 0;
let animationId;
let threeAnimationId;

// Three.js Globals
let scene, camera3D, renderer, ferrisGroup, merryGroup, bumperGroup, dropGroup, coasterGroup;
let isRiding = false;
let rideStartTime = 0;

// Environment Constants
const PARK_ARRIVAL_X = 5000; // Drive this distance to reach the park

// Input
const keys = {
    ArrowRight: false, ArrowLeft: false, ArrowUp: false, ArrowDown: false,
    d: false, a: false, w: false, s: false,
    Space: false, f: false
};

const mouse = { x: 0, y: 0, clicked: false, isPressed: false };

// --- Entities ---
const player = {
    x: 200,
    y: 350,
    width: 60,
    height: 60,
    vx: 0,
    vy: 0,
    speed: 0,
    maxSpeed: 8,
    jumpPower: -10,
    gravity: 0.5,
    isGrounded: true
};

// Particles (Happiness Stars)
let stars = [];

// Park Interactive Rides
const rides = [
    {
        type: 'ferrisWheel',
        x: PARK_ARRIVAL_X + 400,
        y: 200,
        radius: 120,
        angle: 0,
        spinSpeed: 0.005,
        targetSpeed: 0.005
    },
    {
        type: 'balloonStand',
        x: PARK_ARRIVAL_X + 150,
        y: 320,
        width: 60,
        height: 80,
        balloons: []
    }
];

// --- Initialization ---

function init() {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Mouse Interaction
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    });

    canvas.addEventListener('mousedown', () => {
        mouse.clicked = true;
        mouse.isPressed = true;
    });

    canvas.addEventListener('mouseup', () => {
        mouse.isPressed = false;
    });

    startBtn.addEventListener('click', startGame);

    // Init ThreeJS Context early
    init3D();

    // Draw initial static screen
    drawFrame();
}

function startGame() {
    gameState = 'DRIVING';
    startBtn.classList.add('hidden');
    hintText.innerHTML = "오른쪽 방향키(또는 D)를 눌러 부드럽게 달려보세요! 스페이스바로 점프 폴짝!";

    // Play BGM 
    bgm.volume = 0.3;
    bgm.play().catch(e => console.log("Audio play blocked, but game runs.", e));

    if (animationId) cancelAnimationFrame(animationId);
    gameLoop();
}

// --- Input Handling ---

function onKeyDown(e) {
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.ArrowRight = true;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.ArrowLeft = true;
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keys.ArrowUp = true;
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keys.ArrowDown = true;

    if (e.key === 'f' || e.key === 'F') {
        keys.f = true;

        // Handle 3D Transition
        if (gameState === 'PARK') {
            // Check if near ferris wheel
            const ferris = rides.find(r => r.type === 'ferrisWheel');
            if (Math.abs(player.x - ferris.x) < 150) {
                // Enter 3D Ride Sequence
                gameState = 'RIDE_3D_FERRIS';
                isRiding = true;
                rideStartTime = Date.now();
                canvas.classList.add('hidden');
                threeCanvas.classList.remove('hidden');
                hintText.innerHTML = "관람차 탑승 중 (1/5)... [F] 키를 누르면 도중에 내릴 수 있습니다.";
            }
        }
        else if (gameState.startsWith('RIDE_3D')) {
            // Exit 3D Ride
            gameState = 'PARK';
            isRiding = false;
            threeCanvas.classList.add('hidden');
            canvas.classList.remove('hidden');
            hintText.innerHTML = "놀이동산에 도착했습니다! 배경을 클릭해서 관람차를 돌리거나 풍선을 터뜨리며 놀아보세요~🎠";
        }
    }
    if (e.key === ' ') {
        keys.Space = true;

        // Jump logic
        if (player.isGrounded && (gameState === 'DRIVING' || gameState === 'PARK')) {
            player.vy = player.jumpPower;
            player.isGrounded = false;
            createStars(player.x - cameraX + player.width / 2, player.y + player.height, 5, '#ffee58'); // Yellow jump stars
        }
    }
}

function onKeyUp(e) {
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.ArrowRight = false;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.ArrowLeft = false;
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keys.ArrowUp = false;
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keys.ArrowDown = false;
    if (e.key === ' ') keys.Space = false;
}

// --- Physics & Logic ---

function update() {
    if (gameState === 'START' || gameState.startsWith('RIDE_3D')) return; // Skip 2D updates if in 3D

    // 1. Driving Phase
    if (gameState === 'DRIVING') {
        if (keys.ArrowRight) {
            player.speed += 0.2; // Accelerate
            if (player.speed > player.maxSpeed) player.speed = player.maxSpeed;

            // Periodically spawn driving stars (dust)
            if (Math.random() < 0.1) {
                createStars(player.x - cameraX, player.y + player.height, 1, '#ffffff');
            }
        } else {
            player.speed *= 0.95; // Decelerate smoothly
        }

        player.x += player.speed;

        // Keep camera centered on player
        cameraX = player.x - 200;

        // Check Arrival
        if (player.x >= PARK_ARRIVAL_X) {
            gameState = 'PARK';
            hintText.innerHTML = "놀이동산에 도착했습니다! 배경을 클릭해서 관람차를 돌리거나 풍선을 터뜨리며 놀아보세요~🎠";
            homeBtn.classList.remove('hidden');
        }
    }
    // 2. Park Phase
    else if (gameState === 'PARK') {
        // Allow slow wandering in the park
        if (keys.ArrowRight) {
            player.x += 3;
            if (player.x > PARK_ARRIVAL_X + 800) player.x = PARK_ARRIVAL_X + 800;
        }
        cameraX = PARK_ARRIVAL_X - 200; // Lock camera

        updateParkInteractions();
    }

    // Common Physics (Gravity)
    player.vy += player.gravity;
    player.y += player.vy;

    // Ground Collision
    const groundY = 380;
    if (player.y + player.height > groundY) {
        player.y = groundY - player.height;
        player.vy = 0;
        player.isGrounded = true;
    }

    updateParticles();
}

function updateParkInteractions() {
    rides.forEach(ride => {
        if (ride.type === 'ferrisWheel') {
            // Spin logic
            ride.spinSpeed += (ride.targetSpeed - ride.spinSpeed) * 0.05;
            ride.angle += ride.spinSpeed;

            // Click interaction (Make it spin faster)
            if (mouse.clicked) {
                const screenX = ride.x - cameraX;
                const d = Math.hypot(mouse.x - screenX, mouse.y - ride.y);
                if (d < ride.radius + 30) {
                    ride.spinSpeed = 0.08; // VROOM
                    createStars(mouse.x, mouse.y, 8, '#ff4081');
                }
            }
        }
        else if (ride.type === 'balloonStand') {
            // Click to spawn balloons
            if (mouse.clicked) {
                const screenX = ride.x - cameraX;
                if (mouse.x > screenX && mouse.x < screenX + ride.width && mouse.y > ride.y && mouse.y < ride.y + ride.height) {
                    const colors = ['#ff5252', '#448aff', '#69f0ae', '#ffd740'];
                    ride.balloons.push({
                        x: ride.x + ride.width / 2,
                        y: ride.y + 20,
                        vy: -2 - Math.random() * 2,
                        vx: (Math.random() - 0.5) * 2,
                        color: colors[Math.floor(Math.random() * colors.length)],
                        size: 15
                    });
                }
            }

            // Update balloon float
            for (let i = ride.balloons.length - 1; i >= 0; i--) {
                let b = ride.balloons[i];
                b.y += b.vy;
                b.x += b.vx;

                // Pop balloons if clicked
                if (mouse.clicked) {
                    const screenX = b.x - cameraX;
                    const d = Math.hypot(mouse.x - screenX, mouse.y - b.y);
                    if (d < b.size + 10) {
                        createStars(mouse.x, mouse.y, 10, b.color);
                        ride.balloons.splice(i, 1);
                        continue;
                    }
                }
            }
        }
    });

    // Fireworks when clicking empty sky
    if (mouse.clicked && mouse.y < 250) {
        const colors = ['#f48fb1', '#81d4fa', '#ce93d8', '#ffcc80'];
        createStars(mouse.x, mouse.y, 15, colors[Math.floor(Math.random() * colors.length)]);
    }

    mouse.clicked = false; // Reset click flag
}

function createStars(x, y, count, color) {
    for (let i = 0; i < count; i++) {
        stars.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            size: Math.random() * 4 + 2,
            life: 1.0,
            color: color
        });
    }
}

function updateParticles() {
    for (let i = stars.length - 1; i >= 0; i--) {
        let s = stars[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life -= 0.02;
        if (s.life <= 0) stars.splice(i, 1);
    }
}

// --- Drawing ---

function drawFrame() {
    // Background Parallax
    drawBackground();

    ctx.save();
    ctx.translate(-cameraX, 0);

    // Ground
    drawGround();

    // The Park Destination
    drawPark();

    // Player (Kirby in Kart)
    drawKirbyKart(player.x, player.y);

    ctx.restore();

    // Draw Particles (in screen space)
    drawParticles();
}

function drawBackground() {
    // Sky
    ctx.fillStyle = '#e3f2fd'; // Very soft blue
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Sun
    ctx.fillStyle = '#fff9c4'; // Soft pastel yellow
    ctx.beginPath();
    ctx.arc(100, 100, 50, 0, Math.PI * 2);
    ctx.fill();

    // Mountains (Parallax layer 1: Slow)
    const mX = -(cameraX * 0.2) % 600;
    ctx.fillStyle = '#b3e5fc';
    for (let i = 0; i < 3; i++) {
        drawMountain(mX + i * 600, 380, 400, 200);
    }

    // Distant Trees (Parallax layer 2: Med)
    const tX = -(cameraX * 0.5) % 300;
    for (let i = 0; i < 5; i++) {
        drawTree(tX + i * 300, 380);
    }
}

function drawMountain(x, y, w, h) {
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.lineTo(x, y - h);
    ctx.lineTo(x + w / 2, y);
    ctx.fill();
}

function drawTree(x, y) {
    // Trunk
    ctx.fillStyle = '#d7ccc8';
    ctx.fillRect(x - 5, y - 40, 10, 40);
    // Leaves
    ctx.fillStyle = '#a5d6a7'; // Pastel green
    ctx.beginPath();
    ctx.arc(x, y - 50, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - 20, y - 40, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 20, y - 40, 20, 0, Math.PI * 2);
    ctx.fill();
}

function drawGround() {
    ctx.fillStyle = '#c8e6c9'; // Pastel grass
    ctx.fillRect(cameraX, 380, canvas.width, canvas.height - 380); // Ensure it fills

    // Road strip
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(cameraX, 395, canvas.width, 30);
}

function drawPark() {
    rides.forEach(ride => {
        if (ride.type === 'ferrisWheel') {
            // Base
            ctx.strokeStyle = '#ce93d8';
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.moveTo(ride.x - 40, 380);
            ctx.lineTo(ride.x, ride.y);
            ctx.lineTo(ride.x + 40, 380);
            ctx.stroke();

            // Wheel
            ctx.save();
            ctx.translate(ride.x, ride.y);
            ctx.rotate(ride.angle);

            ctx.strokeStyle = '#f8bbd0';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, ride.radius, 0, Math.PI * 2);
            ctx.stroke();

            // Spokes and passenger cars
            const cabins = 8;
            for (let i = 0; i < cabins; i++) {
                const a = (i / cabins) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(a) * ride.radius, Math.sin(a) * ride.radius);
                ctx.stroke();

                // Cabin (always upright logic - reverse rotation)
                ctx.save();
                ctx.translate(Math.cos(a) * ride.radius, Math.sin(a) * ride.radius);
                ctx.rotate(-ride.angle);
                ctx.fillStyle = ['#ffcc80', '#81d4fa', '#b39ddb', '#ffab91'][i % 4];
                ctx.fillRect(-15, 0, 30, 25);
                ctx.beginPath();
                ctx.arc(0, 0, 15, Math.PI, 0); // Rounded roof
                ctx.fill();
                ctx.restore();
            }
            ctx.restore();

            // Center Pin
            ctx.fillStyle = '#f06292';
            ctx.beginPath();
            ctx.arc(ride.x, ride.y, 15, 0, Math.PI * 2);
            ctx.fill();

        } else if (ride.type === 'balloonStand') {
            // Cart
            ctx.fillStyle = '#bcaaa4';
            ctx.fillRect(ride.x, ride.y, ride.width, ride.height);
            // Awning
            ctx.fillStyle = '#ff8a80';
            ctx.fillRect(ride.x - 10, ride.y - 20, ride.width + 20, 20);

            // Draw floating balloons from this stand
            ride.balloons.forEach(b => {
                ctx.fillStyle = b.color;
                ctx.beginPath();
                ctx.ellipse(b.x, b.y, b.size, b.size * 1.3, 0, 0, Math.PI * 2);
                ctx.fill();
                // string
                ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(b.x, b.y + b.size * 1.3);
                ctx.lineTo(b.x, b.y + b.size * 1.3 + 15);
                ctx.stroke();
            });
        }
    });

    // Giant Welcome Sign
    if (cameraX + canvas.width > PARK_ARRIVAL_X) {
        ctx.fillStyle = '#f06292';
        ctx.font = '30px Jua';
        ctx.fillText('힐링 파크', PARK_ARRIVAL_X - 50, 100);

        // F key prompt
        const ferris = rides.find(r => r.type === 'ferrisWheel');
        if (Math.abs(player.x - ferris.x) < 150) {
            ctx.fillStyle = '#1976d2';
            ctx.font = '20px Jua';
            ctx.fillText('관람차 탑승 [ F ]', player.x - cameraX - 20, player.y - 20);
        }
    }
}

function drawKirbyKart(x, y) {
    const cx = x + player.width / 2;
    const cy = y + player.height / 2;

    // The Kart Body (Cloud shape)
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(cx - 15, cy + 10, 20, 0, Math.PI * 2);
    ctx.arc(cx + 15, cy + 10, 20, 0, Math.PI * 2);
    ctx.arc(cx, cy, 25, 0, Math.PI * 2);
    ctx.fill();

    // Wheel 1
    ctx.fillStyle = '#b0bec5';
    ctx.beginPath();
    ctx.arc(cx - 15, cy + 25, 10, 0, Math.PI * 2);
    ctx.fill();

    // Wheel 2
    ctx.fillStyle = '#b0bec5';
    ctx.beginPath();
    ctx.arc(cx + 15, cy + 25, 10, 0, Math.PI * 2);
    ctx.fill();

    // Kirby (Sitting in the cloud kart)
    ctx.fillStyle = '#ffb6c1';
    ctx.beginPath();
    ctx.arc(cx, cy - 15, 18, 0, Math.PI * 2); // Body
    ctx.fill();

    // Kirby Sunglasses (Cool Shades)
    ctx.fillStyle = '#111'; // Dark shades

    // Left lens
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy - 22);
    ctx.lineTo(cx - 2, cy - 22);
    ctx.lineTo(cx - 4, cy - 15);
    ctx.lineTo(cx - 10, cy - 15);
    ctx.closePath();
    ctx.fill();

    // Right lens
    ctx.beginPath();
    ctx.moveTo(cx + 2, cy - 22);
    ctx.lineTo(cx + 12, cy - 22);
    ctx.lineTo(cx + 10, cy - 15);
    ctx.lineTo(cx + 4, cy - 15);
    ctx.closePath();
    ctx.fill();

    // Glasses bridge & frames
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 16, cy - 20);
    ctx.lineTo(cx + 16, cy - 20);
    ctx.stroke();

    // Blush
    ctx.fillStyle = '#ff8a80';
    ctx.beginPath();
    ctx.arc(cx - 12, cy - 15, 4, 0, Math.PI * 2);
    ctx.arc(cx + 12, cy - 15, 4, 0, Math.PI * 2);
    ctx.fill();

    // Kirby Smile
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy - 15, 3, 0, Math.PI, false);
    ctx.stroke();

    // Speed lines if driving fast
    if (player.speed > 5) {
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 40, cy);
        ctx.lineTo(cx - 70, cy);
        ctx.moveTo(cx - 45, cy - 15);
        ctx.lineTo(cx - 65, cy - 15);
        ctx.stroke();
    }
}

function drawParticles() {
    stars.forEach(s => {
        ctx.globalAlpha = s.life;
        ctx.fillStyle = s.color;

        // Draw a simple 4-point star logic using circles for softness
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;
}

// --- Game Loop ---

function gameLoop() {
    update();
    if (!gameState.startsWith('RIDE_3D')) {
        drawFrame();
    }
    animationId = requestAnimationFrame(gameLoop);
}

// --- Three.js 3D Rendering (Phase 3) ---

function init3D() {
    scene = new THREE.Scene();
    // Use explicit numeric hex for maximum compatibility
    scene.background = new THREE.Color(0xffcc80);
    scene.fog = new THREE.FogExp2(0xffcc80, 0.002);

    camera3D = new THREE.PerspectiveCamera(75, 900 / 500, 0.1, 1000);

    renderer = new THREE.WebGLRenderer({ canvas: threeCanvas, antialias: true });
    renderer.setSize(900, 500);
    renderer.setClearColor(0xffcc80, 1); // Explicit clear color backup

    // Lighting
    const ambientInfo = new THREE.AmbientLight(0xffffff, 0.4); // slightly dimmer for evening
    scene.add(ambientInfo);
    const dirLight = new THREE.DirectionalLight(0xff5722, 0.8); // Deep orange/red sunset light
    dirLight.position.set(0, 100, 400); // Position sun far out
    scene.add(dirLight);

    // Build 3D Park Elements
    build3DPark();

    // Start 3D Loop independent of 2D
    animate3D();
}

function build3DPark() {
    // 3D Ground
    const groundGeo = new THREE.PlaneGeometry(2000, 2000);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x558b2f }); // Darker green for evening
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Giant Sunset Sun
    const sunGeo = new THREE.CircleGeometry(100, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xff3d00, fog: false }); // Bright red/orange sun, unaffected by fog
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.set(0, 100, 450); // far away in front of Ferris Wheel
    scene.add(sunMesh);

    // Background Mountains (Silhouettes)
    for (let i = 0; i < 20; i++) {
        const mGeo = new THREE.ConeGeometry(50 + Math.random() * 50, 100 + Math.random() * 100, 4);
        const mMat = new THREE.MeshLambertMaterial({ color: 0x3e2723 }); // very dark brown silhouette for evening
        const mount = new THREE.Mesh(mGeo, mMat);
        const angle = Math.random() * Math.PI * 2;
        const dist = 300 + Math.random() * 150;
        mount.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
        scene.add(mount);
    }

    // 3D Ferris Wheel Container
    ferrisGroup = new THREE.Group();
    ferrisGroup.position.set(0, 40, -50);
    scene.add(ferrisGroup);

    // Pillars
    const pillarGeo = new THREE.CylinderGeometry(1, 2, 40);
    const pillarMat = new THREE.MeshLambertMaterial({ color: '#ce93d8' });
    const p1 = new THREE.Mesh(pillarGeo, pillarMat);
    p1.position.set(-10, -20, 0);
    p1.rotation.z = -0.2;
    const p2 = new THREE.Mesh(pillarGeo, pillarMat);
    p2.position.set(10, -20, 0);
    p2.rotation.z = 0.2;
    ferrisGroup.add(p1, p2);

    // Wheel Ring
    const ringGeo = new THREE.TorusGeometry(30, 1, 16, 64);
    const ringMat = new THREE.MeshLambertMaterial({ color: '#f8bbd0' });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ferrisGroup.add(ring);

    // Spokes and Cabins
    const cabinColors = ['#ffcc80', '#81d4fa', '#b39ddb', '#ffab91'];
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;

        // Spoke
        const spokeGeo = new THREE.CylinderGeometry(0.2, 0.2, 30);
        const spoke = new THREE.Mesh(spokeGeo, pillarMat);
        spoke.rotation.z = Math.PI / 2;
        spoke.position.x = Math.cos(a) * 15;
        spoke.position.y = Math.sin(a) * 15;
        spoke.lookAt(0, 0, 0);
        ferrisGroup.add(spoke);
    }

    // 2. Merry-Go-Round
    merryGroup = new THREE.Group();
    merryGroup.position.set(50, 5, -80);
    scene.add(merryGroup);

    const diskGeo = new THREE.CylinderGeometry(20, 20, 1);
    const diskMat = new THREE.MeshLambertMaterial({ color: '#ffb6c1' });
    const disk = new THREE.Mesh(diskGeo, diskMat);
    merryGroup.add(disk);

    const roofGeo = new THREE.ConeGeometry(22, 10, 16);
    const roofMat = new THREE.MeshLambertMaterial({ color: '#ff8a80' });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 15;
    merryGroup.add(roof);

    const poleGeo = new THREE.CylinderGeometry(0.5, 0.5, 15);
    const poleMat = new THREE.MeshLambertMaterial({ color: '#fff9c4' });

    // Horses (colored boxes for simplicity)
    merryGroup.horses = [];
    for (let i = 0; i < 6; i++) {
        const hGroup = new THREE.Group();
        const a = (i / 6) * Math.PI * 2;
        hGroup.position.set(Math.cos(a) * 15, 0, Math.sin(a) * 15);

        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 7.5;
        hGroup.add(pole);

        const horseGeo = new THREE.BoxGeometry(2, 3, 5);
        const horseMat = new THREE.MeshLambertMaterial({ color: ['#81d4fa', '#ce93d8', '#ffcc80'][i % 3] });
        const horse = new THREE.Mesh(horseGeo, horseMat);
        horse.position.y = 5;
        hGroup.add(horse);

        // Store phase offset for animation
        hGroup.phase = i;
        hGroup.horseMesh = horse;

        merryGroup.add(hGroup);
        merryGroup.horses.push(hGroup);
    }

    // 3. Bumper Cars
    bumperGroup = new THREE.Group();
    bumperGroup.position.set(-60, 2, -60);
    scene.add(bumperGroup);

    const arenaGeo = new THREE.BoxGeometry(40, 1, 40);
    const arenaMat = new THREE.MeshLambertMaterial({ color: '#90a4ae' }); // Metal floor
    const arena = new THREE.Mesh(arenaGeo, arenaMat);
    bumperGroup.add(arena);

    bumperGroup.cars = [];
    for (let i = 0; i < 4; i++) {
        const carGeo = new THREE.BoxGeometry(4, 2, 6);
        const carMat = new THREE.MeshLambertMaterial({ color: ['#ef5350', '#42a5f5', '#66bb6a', '#ab47bc'][i] });
        const car = new THREE.Mesh(carGeo, carMat);
        car.position.set((Math.random() - 0.5) * 30, 1.5, (Math.random() - 0.5) * 30);
        // Random velocity
        car.vx = (Math.random() - 0.5) * 2;
        car.vz = (Math.random() - 0.5) * 2;
        bumperGroup.add(car);
        bumperGroup.cars.push(car);
    }

    // 4. Drop Tower
    dropGroup = new THREE.Group();
    dropGroup.position.set(0, 0, -150);
    scene.add(dropGroup);

    const towerGeo = new THREE.CylinderGeometry(5, 5, 300);
    const towerMat = new THREE.MeshLambertMaterial({ color: '#bdbdbd' });
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.y = 150;
    dropGroup.add(tower);

    const dropRingGeo = new THREE.TorusGeometry(5, 1, 16, 32);
    const dropRingMat = new THREE.MeshLambertMaterial({ color: 0xffb6c1 });
    const dropRing = new THREE.Mesh(dropRingGeo, dropRingMat);
    dropRing.rotation.x = Math.PI / 2;
    dropRing.position.y = 5;
    dropGroup.add(dropRing);
    dropGroup.ring = dropRing;

    // 5. Roller Coaster
    coasterGroup = new THREE.Group();
    coasterGroup.position.set(100, 0, -50);
    scene.add(coasterGroup);

    // Create a CatmullRomCurve3 for the track
    const coasterPoints = [
        new THREE.Vector3(0, 5, 0),
        new THREE.Vector3(0, 150, -100), // Huge climb!
        new THREE.Vector3(0, 250, -200), // Peak
        new THREE.Vector3(0, 5, -300),   // STEEP DROP
        new THREE.Vector3(-100, 50, -200),
        new THREE.Vector3(-150, 150, -100),
        new THREE.Vector3(0, 5, 0)
    ];
    const coasterCurve = new THREE.CatmullRomCurve3(coasterPoints, true);

    // Track Geometry
    const trackGeo = new THREE.TubeGeometry(coasterCurve, 100, 1, 8, true);
    const trackMat = new THREE.MeshLambertMaterial({ color: '#ff5252' });
    const track = new THREE.Mesh(trackGeo, trackMat);
    coasterGroup.add(track);
    coasterGroup.curve = coasterCurve;

    // Hide all initially except if needed later
    ferrisGroup.visible = false;
    merryGroup.visible = false;
    bumperGroup.visible = false;
    dropGroup.visible = false;
    coasterGroup.visible = false;
}

function animate3D() {
    threeAnimationId = requestAnimationFrame(animate3D);

    try {
        if (gameState.startsWith('RIDE_3D')) {
            const now = Date.now();
            const elapsed = (now - rideStartTime) / 1000; // seconds

            // Sequence Logic
            // 0-20s: FERRIS
            // 20-40s: MERRY
            // 40-60s: BUMPER
            // 60-80s: DROP
            // 80-100s: COASTER
            // 100s: Return to 2D

            let currentState = gameState;

            if (elapsed > 100) {
                // End sequence
                gameState = 'PARK';
                isRiding = false;
                threeCanvas.classList.add('hidden');
                canvas.classList.remove('hidden');
                hintText.innerHTML = "신나는 5종 놀이기구 체험이 끝났습니다! 정말 재밌었네요! 🎠";
                return;
            } else if (elapsed > 80 && gameState !== 'RIDE_3D_COASTER') {
                gameState = 'RIDE_3D_COASTER';
                hintText.innerHTML = "롤러코스터 탑승 중 (5/5)... 꽉 잡으세요!";
            } else if (elapsed > 60 && gameState !== 'RIDE_3D_DROP' && elapsed <= 80) {
                gameState = 'RIDE_3D_DROP';
                hintText.innerHTML = "자이로드롭 탑승 중 (4/5)... 위로 올라갑니다!";
            } else if (elapsed > 40 && gameState !== 'RIDE_3D_BUMPER' && elapsed <= 60) {
                gameState = 'RIDE_3D_BUMPER';
                hintText.innerHTML = "범퍼카 탑승 중 (3/5)... 좌우로 흔들립니다!";
            } else if (elapsed > 20 && gameState !== 'RIDE_3D_MERRY' && elapsed <= 40) {
                gameState = 'RIDE_3D_MERRY';
                hintText.innerHTML = "회전목마 탑승 중 (2/5)... 위아래로 움직입니다!";
            }

            // Visibility toggles
            ferrisGroup.visible = (gameState === 'RIDE_3D_FERRIS');
            merryGroup.visible = (gameState === 'RIDE_3D_MERRY');
            bumperGroup.visible = (gameState === 'RIDE_3D_BUMPER');
            dropGroup.visible = (gameState === 'RIDE_3D_DROP');
            coasterGroup.visible = (gameState === 'RIDE_3D_COASTER');

            const time = now * 0.001;

            if (gameState === 'RIDE_3D_FERRIS') {
                // Rotate the wheel slowly
                ferrisGroup.rotation.z += 0.005;

                // Position camera inside Cabin #0
                const radius = 30;
                const cabinAngle = ferrisGroup.rotation.z;
                const cabinX = ferrisGroup.position.x + Math.cos(cabinAngle) * radius;
                const cabinY = ferrisGroup.position.y + Math.sin(cabinAngle) * radius;
                const cabinZ = ferrisGroup.position.z + 5;

                camera3D.position.set(cabinX, cabinY, cabinZ);
                camera3D.lookAt(
                    ferrisGroup.position.x + Math.sin(time * 0.5) * 20,
                    0,
                    ferrisGroup.position.z + 100
                );
            }
            else if (gameState === 'RIDE_3D_MERRY') {
                merryGroup.rotation.y += 0.02; // Spin merry-go-round

                // Animate horses
                merryGroup.horses.forEach(h => {
                    h.horseMesh.position.y = 5 + Math.sin(time * 3 + h.phase) * 2;
                });

                // Camera sits on Horse #0
                const horse0 = merryGroup.horses[0];
                const worldPos = new THREE.Vector3();
                horse0.horseMesh.getWorldPosition(worldPos);

                // Set camera slightly above horse
                camera3D.position.set(worldPos.x, worldPos.y + 2, worldPos.z);

                // Look forward tangentially (direction of rotation)
                // It's rotating around merryGroup center
                const dir = new THREE.Vector3().subVectors(worldPos, merryGroup.position).normalize();
                const tangent = new THREE.Vector3(-dir.z, 0, dir.x); // orthogonal
                const lookTarget = new THREE.Vector3().addVectors(camera3D.position, tangent.multiplyScalar(10));
                camera3D.lookAt(lookTarget);
            }
            else if (gameState === 'RIDE_3D_BUMPER') {
                hintText.innerHTML = "범퍼카 탑승 중 (3/5)... 방향키(WASD)로 직접 운전해보세요!";
                const myCar = bumperGroup.cars[0];

                // Manual Steering
                let turn = 0;
                if (keys.ArrowLeft || keys.a) turn = 0.08;
                if (keys.ArrowRight || keys.d) turn = -0.08;
                myCar.rotation.y += turn;

                // Manual Acceleration
                let thrust = 0;
                if (keys.ArrowUp || keys.w) thrust = 0.5;
                if (keys.ArrowDown || keys.s) thrust = -0.3;

                if (thrust !== 0) {
                    myCar.vx += Math.sin(myCar.rotation.y) * thrust;
                    myCar.vz += Math.cos(myCar.rotation.y) * thrust;
                }

                // Friction
                myCar.vx *= 0.9;
                myCar.vz *= 0.9;

                // Move cars
                bumperGroup.cars.forEach((car, idx) => {
                    car.position.x += car.vx;
                    car.position.z += car.vz;
                    // Bounce walls
                    if (car.position.x > 18) { car.position.x = 18; car.vx *= -1; }
                    if (car.position.x < -18) { car.position.x = -18; car.vx *= -1; }
                    if (car.position.z > 18) { car.position.z = 18; car.vz *= -1; }
                    if (car.position.z < -18) { car.position.z = -18; car.vz *= -1; }

                    // Auto rotate AI cars
                    if (idx !== 0) {
                        car.rotation.y = Math.atan2(car.vx, car.vz);
                    }
                });

                // Camera sits in Car #0
                const carWorldPos = new THREE.Vector3();
                myCar.getWorldPosition(carWorldPos);

                camera3D.position.set(carWorldPos.x, carWorldPos.y + 1.5, carWorldPos.z);

                // Look in direction of travel based on rotation, not vx/vz so we can look while idle
                const lookTarget = new THREE.Vector3(
                    carWorldPos.x + Math.sin(myCar.rotation.y) * 10,
                    carWorldPos.y + 1.5,
                    carWorldPos.z + Math.cos(myCar.rotation.y) * 10
                );
                camera3D.lookAt(lookTarget);
            }
            else if (gameState === 'RIDE_3D_DROP') {
                // Drop Tower Logic (60 to 80s elapsed)
                // Phase 1 (60-70s): Climb slowly from y=5 to y=95
                // Phase 2 (70-75s): Hold at top
                // Phase 3 (75-80s): Drop back to y=5

                const dropTime = elapsed - 60; // 0 to 20s

                if (dropTime < 10) {
                    // Climbing
                    dropGroup.ring.position.y = 5 + (290 * (dropTime / 10)); // up to 295
                } else if (dropTime < 14) {
                    // Hold and jiggle slightly
                    dropGroup.ring.position.y = 295 + Math.sin(time * 20) * 0.2;
                } else {
                    // Drop! (Fast)
                    dropGroup.ring.position.y -= 10;
                    if (dropGroup.ring.position.y < 5) dropGroup.ring.position.y = 5;
                }

                // Sit on the ring looking out
                const ringWorldPos = new THREE.Vector3();
                dropGroup.ring.getWorldPosition(ringWorldPos);

                camera3D.position.set(ringWorldPos.x, ringWorldPos.y + 2, ringWorldPos.z + 5);
                camera3D.lookAt(ringWorldPos.x, ringWorldPos.y, ringWorldPos.z + 100); // Look outwards
            }
            else if (gameState === 'RIDE_3D_COASTER') {
                const coasterTime = elapsed - 80; // 0 to 20s
                // T loop from 0 to 1
                const t = (coasterTime / 20) % 1;

                // Get position on curve
                const pos = coasterGroup.curve.getPointAt(t);
                // Get tangent for looking direction
                const tangent = coasterGroup.curve.getTangentAt(t).normalize();

                // Adjust position slightly above track
                const worldPos = new THREE.Vector3().copy(pos).add(coasterGroup.position);
                worldPos.y += 2;

                camera3D.position.copy(worldPos);

                const lookPos = new THREE.Vector3().copy(worldPos).add(tangent.multiplyScalar(10));
                camera3D.lookAt(lookPos);
            }

            renderer.render(scene, camera3D);
        }
    } catch (err) {
        hintText.innerHTML = "3D 오류 발생: " + err.message;
        console.error(err);
    }
}

// Start immediately loading
window.onload = init;
