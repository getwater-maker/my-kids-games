import * as THREE from 'three';

let scene, camera, renderer, planet;
let population = 8.0e9;
let destruction = 0;
let currentWeapon = 'laser';
let gameState = 'START';
let particles = [];

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 15;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    setupLights();
    setupPlanet();
    setupControls();

    animate();
}

function setupLights() {
    const ambient = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(20, 10, 20);
    scene.add(sun);
}

function setupPlanet() {
    const geometry = new THREE.SphereGeometry(5, 64, 64);
    const material = new THREE.MeshStandardMaterial({
        color: 0x24476a, // Earth Blue
        roughness: 0.5,
        metalness: 0.1
    });
    planet = new THREE.Mesh(geometry, material);
    scene.add(planet);

    // Contients/Greenery (Simplified)
    for (let i = 0; i < 15; i++) {
        const cGeo = new THREE.SphereGeometry(Math.random() * 2 + 1, 32, 32);
        const cMat = new THREE.MeshStandardMaterial({ color: 0x3d7042 });
        const continent = new THREE.Mesh(cGeo, cMat);

        const phi = Math.random() * Math.PI;
        const theta = Math.random() * Math.PI * 2;
        continent.position.setFromSphericalCoords(4.8, phi, theta);
        planet.add(continent);
    }
}

function setupControls() {
    document.getElementById('start-btn').onclick = () => {
        gameState = 'PLAYING';
        document.getElementById('overlay').classList.add('hidden');
    };

    const weaponBtns = document.querySelectorAll('.weapon-btn');
    weaponBtns.forEach(btn => {
        btn.onclick = () => {
            weaponBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentWeapon = btn.dataset.weapon;
        };
    });

    window.addEventListener('mousedown', onMouseDown);
}

function onMouseDown(e) {
    if (gameState !== 'PLAYING') return;

    const mouse = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObject(planet, true);
    if (intersects.length > 0) {
        applyDamage(intersects[0].point);
    }
}

function applyDamage(point) {
    // Visual effect: crater
    const craterGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const craterMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const crater = new THREE.Mesh(craterGeo, craterMat);
    crater.position.copy(point);
    planet.add(crater);

    // Population/Destruction logic
    const damage = Math.random() * 0.1 + 0.02;
    destruction = Math.min(100, destruction + damage * 10);
    population = Math.max(0, population - damage * 1000 * 1000 * 100);

    updateHUD();
    spawnExplosion(point);
}

function spawnExplosion(point) {
    for (let i = 0; i < 10; i++) {
        const geo = new THREE.SphereGeometry(0.2, 8, 8);
        const mat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
        const p = new THREE.Mesh(geo, mat);
        p.position.copy(point);
        p.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5
        );
        scene.add(p);
        particles.push(p);
        setTimeout(() => {
            scene.remove(p);
            particles = particles.filter(part => part !== p);
        }, 1000);
    }
}

function updateHUD() {
    document.getElementById('population').textContent = (population / 1e9).toFixed(1) + 'B';
    document.getElementById('destruction').textContent = destruction.toFixed(1) + '%';
}

function animate() {
    requestAnimationFrame(animate);

    if (planet) {
        planet.rotation.y += 0.002;
    }

    particles.forEach(p => {
        p.position.add(p.velocity);
        p.scale.multiplyScalar(0.95);
    });

    renderer.render(scene, camera);
}

init();
