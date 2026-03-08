// star/clam_pearl_hunter/js/main.js

const CONFIG = {
    mudflatGroundColor: 0x795548,
    mudflatSandColor: 0xedc9af,
    digDuration: 1.0,
    maxClamsPerMudflat: 30,
    probabilities: {
        pearl: 0.35,      // $50,000
        diamondRing: 0.15, // $500,000
        crown: 0.05       // $2,000,000
    },
    values: {
        pearl: 50000,
        diamondRing: 500000,
        crown: 2000000
    }
};

let scene, camera, renderer, raycaster, mouse;
let gameState = 'START';
let currentLoc = 'MUDFLAT'; // 'MUDFLAT', 'HOME', 'SHOP'
let money = parseInt(localStorage.getItem('clamMoney')) || 0;
let inventory = {
    clams: parseInt(localStorage.getItem('clamCount')) || 0,
    items: JSON.parse(localStorage.getItem('clamItems')) || []
};
let ownedLuxury = JSON.parse(localStorage.getItem('ownedLuxury')) || [];

// 3D Objects
let mudflatGroup, homeGroup;
let digPoints = [];

// UI
let moneyEl, clamCountEl, locationEl, startScreen, homeScreen, shopScreen, clamsGrid, jewelList;

function init() {
    // UI Connections
    moneyEl = document.getElementById('money-value');
    clamCountEl = document.getElementById('clams-count');
    locationEl = document.getElementById('location-name');
    startScreen = document.getElementById('start-screen');
    homeScreen = document.getElementById('home-overlay');
    shopScreen = document.getElementById('shop-overlay');
    clamsGrid = document.getElementById('clams-grid');
    jewelList = document.getElementById('jewel-list');

    updateUI();

    // 3D Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Light blue sky

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 15, 20);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(50, 100, 50);
    sun.castShadow = true;
    scene.add(sun);

    setupMudflat();

    // Event Listeners
    window.addEventListener('mousedown', onMouseDown);
    document.getElementById('start-btn').onclick = startGame;
    document.getElementById('travel-btn').onclick = travel;
    document.getElementById('shop-btn').onclick = toggleShop;
    document.getElementById('back-to-mudflat').onclick = () => travel('MUDFLAT');
    document.getElementById('close-shop').onclick = () => toggleShop(false);
    document.getElementById('sell-all-btn').onclick = sellAllItems;

    // Shop Tabs
    document.getElementById('tab-sell').onclick = () => showShopTab('sell');
    document.getElementById('tab-buy').onclick = () => showShopTab('buy');

    animate();
}

function updateUI() {
    moneyEl.textContent = money.toLocaleString();
    clamCountEl.textContent = inventory.clams;
    localStorage.setItem('clamMoney', money);
    localStorage.setItem('clamCount', inventory.clams);
    localStorage.setItem('clamItems', JSON.stringify(inventory.items));
    localStorage.setItem('ownedLuxury', JSON.stringify(ownedLuxury));

    // Render owned luxury display
    const ownedDisplay = document.getElementById('owned-luxury');
    if (ownedDisplay) {
        ownedDisplay.innerHTML = '';
        ownedLuxury.forEach(item => {
            const badge = document.createElement('div');
            badge.className = 'icon-badge';
            const icons = { car: '🏎️', yacht: '🛥️', jet: '✈️', castle: '🏰', rocket: '🚀' };
            badge.textContent = icons[item] || '🏆';
            ownedDisplay.appendChild(badge);
        });
    }
}

function showShopTab(tab) {
    const sellSec = document.getElementById('sell-section');
    const buySec = document.getElementById('buy-section');
    const selTab = document.getElementById('tab-sell');
    const buyTab = document.getElementById('tab-buy');

    if (tab === 'sell') {
        sellSec.classList.remove('hidden');
        buySec.classList.add('hidden');
        selTab.classList.add('active');
        buyTab.classList.remove('active');
        renderShopItems();
    } else {
        sellSec.classList.add('hidden');
        buySec.classList.remove('hidden');
        selTab.classList.remove('active');
        buyTab.classList.add('active');
        updateLuxuryButtons();
    }
}

function updateLuxuryButtons() {
    const btns = document.querySelectorAll('.buy-luxury-btn');
    const prices = { car: 5000000, yacht: 50000000, jet: 500000000, castle: 1000000000, rocket: 10000000000 };

    btns.forEach(btn => {
        const type = btn.getAttribute('onclick').match(/'([^']+)'/)[1];
        const cost = prices[type];

        if (ownedLuxury.includes(type)) {
            btn.textContent = "소유함";
            btn.disabled = true;
        } else if (money < cost) {
            btn.disabled = true;
            btn.textContent = "자금 부족";
        } else {
            btn.disabled = false;
            btn.textContent = "구매";
        }
    });
}

window.buyLuxury = function (type, cost) {
    if (money >= cost && !ownedLuxury.includes(type)) {
        money -= cost;
        ownedLuxury.push(type);
        updateUI();
        updateLuxuryButtons();
        alert("구매 완료! 진정한 부자의 로망을 달성하셨습니다!");
    }
};

function toggleShop(show = true) {
    if (show) {
        shopScreen.classList.remove('hidden');
        showShopTab('sell');
    } else {
        shopScreen.classList.add('hidden');
    }
}

function startGame() {
    gameState = 'PLAYING';
    startScreen.classList.add('hidden');
}

function travel(target) {
    if (gameState !== 'PLAYING') return;

    let newLoc = (typeof target === 'string') ? target : null;

    if (!newLoc) {
        newLoc = (currentLoc === 'MUDFLAT') ? 'HOME' : 'MUDFLAT';
    }

    currentLoc = newLoc;
    locationEl.textContent = newLoc === 'MUDFLAT' ? '🌊 갯벌 (Mudflat)' : '🏠 집 (Home)';

    const travelBtn = document.getElementById('travel-btn');
    if (newLoc === 'HOME') {
        homeScreen.classList.remove('hidden');
        travelBtn.textContent = '🌊 갯벌로 수집하러 가기';
        renderHomeClams();
    } else {
        homeScreen.classList.add('hidden');
        shopScreen.classList.add('hidden');
        travelBtn.textContent = '🏠 집으로 돌아가기';
    }
}

function setupMudflat() {
    mudflatGroup = new THREE.Group();

    // Mud ground
    const groundGeo = new THREE.PlaneGeometry(100, 100, 32, 32);
    const groundMat = new THREE.MeshPhongMaterial({ color: CONFIG.mudflatSandColor });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    mudflatGroup.add(ground);

    // Random Dig Points
    for (let i = 0; i < CONFIG.maxClamsPerMudflat; i++) {
        createDigPoint();
    }

    scene.add(mudflatGroup);
}

function createDigPoint() {
    const geo = new THREE.CylinderGeometry(1.2, 1.2, 0.2, 16);
    const mat = new THREE.MeshPhongMaterial({ color: 0x6d4c41, emissive: 0x3e2723, emissiveIntensity: 0.1 });
    const point = new THREE.Mesh(geo, mat);

    const x = (Math.random() - 0.5) * 80;
    const z = (Math.random() - 0.5) * 80;
    point.position.set(x, 0.05, z);
    point.name = "digPoint";

    mudflatGroup.add(point);
    digPoints.push(point);
}

function onMouseDown(e) {
    if (gameState !== 'PLAYING' || currentLoc !== 'MUDFLAT') return;

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(digPoints);

    if (intersects.length > 0) {
        const target = intersects[0].object;
        digClam(target);
    }
}

function digClam(mesh) {
    mesh.material.color.set(0x4e342e);
    mesh.scale.set(1.5, 0.5, 1.5);

    inventory.clams++;
    updateUI();

    digPoints = digPoints.filter(p => p !== mesh);

    setTimeout(() => {
        mudflatGroup.remove(mesh);
        setTimeout(createDigPoint, 5000);
    }, 300);
}

function renderHomeClams() {
    clamsGrid.innerHTML = '';
    for (let i = 0; i < inventory.clams; i++) {
        const div = document.createElement('div');
        div.className = 'clam-item';
        div.textContent = '🐚';
        div.onclick = () => openClam(div);
        clamsGrid.appendChild(div);
    }
}

function openClam(element) {
    if (inventory.clams <= 0) return;

    inventory.clams--;
    const rand = Math.random();
    let found = null;

    if (rand < CONFIG.probabilities.crown) found = { type: 'crown', icon: '👑', name: '전설의 왕관' };
    else if (rand < CONFIG.probabilities.diamondRing) found = { type: 'diamondRing', icon: '💍', name: '다이아 반찌' };
    else if (rand < CONFIG.probabilities.pearl) found = { type: 'pearl', icon: '⚪', name: '영롱한 진주' };

    if (found) {
        inventory.items.push(found);
        element.textContent = found.icon;
        element.classList.add('found-jewel');
        element.style.borderColor = 'gold';
    } else {
        element.textContent = '💨';
        element.style.opacity = '0.3';
    }

    element.onclick = null;
    updateUI();
}

function renderShopItems() {
    jewelList.innerHTML = '';
    const counts = {};
    inventory.items.forEach(it => {
        counts[it.type] = (counts[it.type] || 0) + 1;
    });

    Object.keys(counts).forEach(type => {
        const item = inventory.items.find(it => it.type === type);
        const div = document.createElement('div');
        div.className = 'jewel-item';
        div.innerHTML = `
            <span>${item.icon} ${item.name} x ${counts[type]}</span>
            <span class="price">₩ ${(counts[type] * CONFIG.values[type]).toLocaleString()}</span>
        `;
        jewelList.appendChild(div);
    });

    if (inventory.items.length === 0) {
        jewelList.innerHTML = '<div class="jewel-item">판매할 보석이 없습니다.</div>';
    }
}

function sellAllItems() {
    let profit = 0;
    inventory.items.forEach(it => {
        profit += CONFIG.values[it.type];
    });

    if (profit > 0) {
        money += profit;
        inventory.items = [];
        updateUI();
        renderShopItems();
        alert(`보석을 모두 판매하여 ₩ ${profit.toLocaleString()}원을 벌었습니다!`);
    } else {
        alert("판매할 보석이 없습니다.");
    }
}

function animate() {
    requestAnimationFrame(animate);

    if (gameState === 'PLAYING' && currentLoc === 'MUDFLAT') {
        const time = Date.now() * 0.001;
        digPoints.forEach(p => {
            p.rotation.y += 0.01;
            p.material.emissiveIntensity = 0.2 + Math.sin(time * 3) * 0.1;
        });
    }

    renderer.render(scene, camera);
}

window.onload = init;
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
