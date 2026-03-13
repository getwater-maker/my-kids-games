// star/animal_crossing/js/main.js

const CONFIG = {
    walkSpeed: 10.0,
    islandSize: 150,
    treeCount: 25,
    shellCount: 15,
};

let scene, camera, renderer, clock, controls;
let gameState = 'START';
let bells = 0;
let inventory = [];
const keys = {};

let trees = [];
let shells = [];
let interactable = null;

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa4e5d9); // Sky Blue
    scene.fog = new THREE.Fog(0xa4e5d9, 50, 200);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.7, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container').appendChild(renderer.domElement);

    clock = new THREE.Clock();
    controls = new THREE.PointerLockControls(camera, document.body);

    setupLights();
    createIsland();
    spawnTrees();
    spawnShells();

    setupEventListeners();
    animate();
}

function setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 0.6);
    sun.position.set(20, 50, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    scene.add(sun);
}

function createIsland() {
    // Grass center
    const grassGeo = new THREE.CircleGeometry(CONFIG.islandSize - 20, 64);
    const grassMat = new THREE.MeshPhongMaterial({ color: 0x5bb381 });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.receiveShadow = true;
    scene.add(grass);

    // Sand border
    const sandGeo = new THREE.RingGeometry(CONFIG.islandSize - 22, CONFIG.islandSize, 64);
    const sandMat = new THREE.MeshPhongMaterial({ color: 0xf9e1a8 });
    const sand = new THREE.Mesh(sandGeo, sandMat);
    sand.rotation.x = -Math.PI / 2;
    sand.position.y = -0.1;
    scene.add(sand);

    // Ocean
    const oceanGeo = new THREE.PlaneGeometry(2000, 2000);
    const oceanMat = new THREE.MeshPhongMaterial({ color: 0x79c9e1, transparent: true, opacity: 0.8 });
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -0.5;
    scene.add(ocean);
}

function spawnTrees() {
    for (let i = 0; i < CONFIG.treeCount; i++) {
        const radius = 15 + Math.random() * (CONFIG.islandSize - 40);
        const angle = Math.random() * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        createTree(x, z);
    }
}

function createTree(x, z) {
    const group = new THREE.Group();

    // Trunk
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.7, 5, 8),
        new THREE.MeshPhongMaterial({ color: 0x8d6e63 })
    );
    trunk.position.y = 2.5;
    trunk.castShadow = true;
    group.add(trunk);

    // Leaves
    const leaves = new THREE.Mesh(
        new THREE.SphereGeometry(3, 8, 8),
        new THREE.MeshPhongMaterial({ color: 0x2e7d32 })
    );
    leaves.position.y = 6;
    leaves.castShadow = true;
    group.add(leaves);

    // Fruit (Apples)
    const fruit = [];
    for (let i = 0; i < 3; i++) {
        const apple = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 8, 8),
            new THREE.MeshPhongMaterial({ color: 0xe53935 })
        );
        apple.position.set(
            (Math.random() - 0.5) * 3,
            4.5 + Math.random() * 1,
            (Math.random() - 0.5) * 3
        );
        apple.visible = true;
        group.add(apple);
        fruit.push(apple);
    }

    group.position.set(x, 0, z);
    group.isTree = true;
    group.fruit = fruit;
    group.hasFruit = true;
    scene.add(group);
    trees.push(group);
}

function spawnShells() {
    for (let i = 0; i < CONFIG.shellCount; i++) {
        const radius = CONFIG.islandSize - 18;
        const angle = Math.random() * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        const shell = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 8, 8),
            new THREE.MeshPhongMaterial({ color: 0xfff9c4 })
        );
        shell.scale.set(1.5, 0.5, 1);
        shell.position.set(x, 0.1, z);
        shell.isShell = true;
        scene.add(shell);
        shells.push(shell);
    }
}

function setupEventListeners() {
    window.addEventListener('keydown', (e) => keys[e.code] = true);
    window.addEventListener('keyup', (e) => keys[e.code] = false);

    window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyE') handleInteraction();
        if (e.code === 'Tab') toggleInventory();
    });

    document.getElementById('start-btn').onclick = () => {
        document.getElementById('overlay').classList.add('hidden');
        document.getElementById('hud').classList.remove('hidden');
        gameState = 'PLAYING';
        controls.lock();
    };

    document.getElementById('close-inventory').onclick = toggleInventory;
    document.getElementById('inventory-app').onclick = toggleInventory;
}

function handleInteraction() {
    if (!interactable) return;

    if (interactable.isTree && interactable.hasFruit) {
        shakeTree(interactable);
    } else if (interactable.isShell) {
        pickUpShell(interactable);
    } else if (interactable.isFruit) {
        pickUpFruit(interactable);
    }
}

function shakeTree(tree) {
    // Shake animation
    const tl = new THREE.Vector3();
    let count = 0;
    const shake = () => {
        tree.rotation.z = Math.sin(count * 2) * 0.05;
        count += 0.5;
        if (count < 10) requestAnimationFrame(shake);
        else {
            tree.rotation.z = 0;
            dropFruit(tree);
        }
    };
    shake();
}

function dropFruit(tree) {
    tree.hasFruit = false;
    tree.fruit.forEach(apple => {
        const worldPos = new THREE.Vector3();
        apple.getWorldPosition(worldPos);

        scene.remove(apple);

        const droppedApple = apple.clone();
        droppedApple.position.copy(worldPos);
        droppedApple.isFruit = true;
        scene.add(droppedApple);

        // Falling animation
        let vy = 0;
        const fall = () => {
            vy -= 0.01;
            droppedApple.position.y += vy;
            if (droppedApple.position.y > 0.3) requestAnimationFrame(fall);
            else droppedApple.position.y = 0.3;
        };
        fall();
    });
}

function pickUpShell(shell) {
    scene.remove(shell);
    shells = shells.filter(s => s !== shell);
    addBells(100);
}

function pickUpFruit(fruit) {
    scene.remove(fruit);
    addBells(500);
}

function addBells(amount) {
    bells += amount;
    document.getElementById('bell-amount').textContent = bells.toLocaleString();
    console.log(`Added ${amount} bells!`);
}

function toggleInventory() {
    const inv = document.getElementById('inventory-screen');
    inv.classList.toggle('hidden');
    if (inv.classList.contains('hidden')) controls.lock();
    else controls.unlock();
}

function updateMovement(delta) {
    if (gameState !== 'PLAYING' || !controls.isLocked) return;

    const velocity = new THREE.Vector3();
    const dir = new THREE.Vector3();

    dir.z = Number(keys['KeyW']) - Number(keys['KeyS']);
    dir.x = Number(keys['KeyD']) - Number(keys['KeyA']);
    dir.normalize();

    if (keys['KeyW'] || keys['KeyS']) controls.moveForward(dir.z * CONFIG.walkSpeed * delta);
    if (keys['KeyA'] || keys['KeyD']) controls.moveRight(dir.x * CONFIG.walkSpeed * delta);

    // Bound check
    const dist = camera.position.distanceTo(new THREE.Vector3(0, 1.7, 0));
    if (dist > CONFIG.islandSize) {
        const angle = Math.atan2(camera.position.z, camera.position.x);
        camera.position.x = Math.cos(angle) * CONFIG.islandSize;
        camera.position.z = Math.sin(angle) * CONFIG.islandSize;
    }

    checkInteractions();
}

function checkInteractions() {
    const raycaster = new THREE.Raycaster();
    const center = new THREE.Vector2(0, 0);
    raycaster.setFromCamera(center, camera);

    const checkList = [...trees, ...shells].filter(obj => {
        return camera.position.distanceTo(obj.position) < 8;
    });

    const intersects = raycaster.intersectObjects(checkList, true);
    const prompt = document.getElementById('interaction-prompt');

    if (intersects.length > 0) {
        let obj = intersects[0].object;
        // Find parent group if it's a tree part
        while (obj.parent && !obj.isTree && !obj.isShell && !obj.isFruit) {
            obj = obj.parent;
        }
        interactable = obj;
        prompt.classList.remove('hidden');
    } else {
        interactable = null;
        prompt.classList.add('hidden');
    }
}

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);

    updateMovement(delta);
    renderer.render(scene, camera);
}

init();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
