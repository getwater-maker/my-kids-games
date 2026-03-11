import * as THREE from 'three';

const LANE_WIDTH = 4;
const INITIAL_SPEED = 0.6;
const SPEED_INC = 0.0001;

let scene, camera, renderer;
let player;
let lanes = [-LANE_WIDTH, 0, LANE_WIDTH];
let currentLane = 1; // Middle
let targetX = 0;
let verticalVel = 0;
let isJumping = false;
let gravity = 0.012;

let score = 0;
let coins = 0;
let gameSpeed = INITIAL_SPEED;
let gameState = 'START';

let tiles = [];
let obstacles = [];
let pickups = [];

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 10, 150);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 6, 12);
    camera.lookAt(0, 2, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    setupLights();
    setupPlayer();
    setupWorld();
    setupControls();
    animate();
}

function setupLights() {
    const amb = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(amb);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 15, 5);
    dir.castShadow = true;
    scene.add(dir);
}

function setupPlayer() {
    const group = new THREE.Group();
    const bodyGeo = new THREE.BoxGeometry(1.2, 2.5, 1.2);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff4655 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.25;
    body.castShadow = true;
    group.add(body);
    player = group;
    scene.add(player);
}

function setupWorld() {
    for (let i = 0; i < 8; i++) {
        createTile(-i * 30);
    }
}

function createTile(z) {
    const group = new THREE.Group();
    const floorGeo = new THREE.PlaneGeometry(LANE_WIDTH * 4, 30);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    group.add(floor);

    // Tracks
    for (let laneX of lanes) {
        const trackGeo = new THREE.PlaneGeometry(0.3, 30);
        const track = new THREE.Mesh(trackGeo, new THREE.MeshStandardMaterial({ color: 0xaaaaaa }));
        track.rotation.x = -Math.PI / 2;
        track.position.set(laneX, 0.05, 0);
        group.add(track);
    }

    group.position.z = z;
    scene.add(group);
    tiles.push(group);
}

function setupControls() {
    window.addEventListener('keydown', e => {
        if (gameState !== 'PLAYING') return;
        if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
            if (currentLane > 0) { currentLane--; targetX = lanes[currentLane]; }
        }
        if (e.code === 'KeyD' || e.code === 'ArrowRight') {
            if (currentLane < 2) { currentLane++; targetX = lanes[currentLane]; }
        }
        if (e.key === ' ' && !isJumping) {
            verticalVel = 0.25;
            isJumping = true;
        }
    });

    document.getElementById('start-btn').onclick = () => {
        gameState = 'PLAYING';
        document.getElementById('overlay').classList.add('hidden');
    };
    document.getElementById('restart-btn').onclick = () => location.reload();
}

function spawnObject() {
    const lane = lanes[Math.floor(Math.random() * 3)];
    const type = Math.random();

    if (type < 0.4) {
        // Obstacle (Train/Block)
        const geo = new THREE.BoxGeometry(3, 4, 10);
        const mat = new THREE.MeshStandardMaterial({ color: 0x00a2ff });
        const obj = new THREE.Mesh(geo, mat);
        obj.position.set(lane, 2, -150);
        scene.add(obj);
        obstacles.push(obj);
    } else {
        // Coin
        const geo = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16);
        const mat = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 0.5 });
        const coin = new THREE.Mesh(geo, mat);
        coin.rotation.x = Math.PI / 2;
        coin.position.set(lane, 1.5, -150);
        scene.add(coin);
        pickups.push(coin);
    }
}

let frames = 0;
function animate() {
    requestAnimationFrame(animate);
    if (gameState === 'PLAYING') {
        frames++;
        score += Math.floor(gameSpeed * 5);
        gameSpeed += SPEED_INC;

        // Player x/y
        player.position.x += (targetX - player.position.x) * 0.15;
        player.position.y += verticalVel;
        verticalVel -= gravity;
        if (player.position.y <= 0) {
            player.position.y = 0;
            verticalVel = 0;
            isJumping = false;
        }

        // Tiles
        tiles.forEach(t => {
            t.position.z += gameSpeed;
            if (t.position.z > 30) t.position.z -= 8 * 30;
        });

        // Obstacles
        obstacles.forEach((o, i) => {
            o.position.z += gameSpeed;
            if (Math.hypot(o.position.x - player.position.x, o.position.z - player.position.z) < 2.5 && player.position.y < 3.5) {
                gameOver();
            }
            if (o.position.z > 20) { scene.remove(o); obstacles.splice(i, 1); }
        });

        // Coins
        pickups.forEach((p, i) => {
            p.position.z += gameSpeed;
            p.rotation.y += 0.1;
            if (Math.hypot(p.position.x - player.position.x, p.position.z - player.position.z) < 2) {
                coins++;
                scene.remove(p);
                pickups.splice(i, 1);
            }
            if (p.position.z > 20) { scene.remove(p); pickups.splice(i, 1); }
        });

        if (frames % 100 === 0) spawnObject();
        updateHUD();
    }
    renderer.render(scene, camera);
}

function updateHUD() {
    document.getElementById('score').textContent = Math.floor(score);
    document.getElementById('coins').textContent = coins;
}

function gameOver() {
    gameState = 'OVER';
    document.getElementById('game-over').classList.remove('hidden');
    document.getElementById('final-score').textContent = Math.floor(score);
    document.getElementById('final-coins').textContent = coins;
}

init();
