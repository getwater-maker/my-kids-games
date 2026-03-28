// Game Data
const state = {
    money: 0,
    pets: [],
    eggs: []
};

// Config
const WORK_REWARD = 10;
const HATCH_CLICKS_NEEDED = 5;

// Shop Items
const SHOP_ITEMS = [
    { id: 'egg_basic', name: '일반 알', price: 40, emoji: '🥚', img: 'assets/adopt_egg_basic.png', type: 'basic' },
    { id: 'egg_premium', name: '황금 알', price: 100, emoji: '✨🥚✨', img: 'assets/adopt_egg_premium.png', type: 'premium' }
];

// Pet Database
const PETS = {
    dog: { id: 'dog', name: '강아지', emoji: '🐶', rarity: 'common' },
    cat: { id: 'cat', name: '고양이', emoji: '🐱', rarity: 'common' },
    bunny: { id: 'bunny', name: '토끼', emoji: '🐰', rarity: 'common' },
    pig: { id: 'pig', name: '아기 돼지', emoji: '🐷', rarity: 'common' },
    fox: { id: 'fox', name: '여우', emoji: '🦊', rarity: 'rare' },
    panda: { id: 'panda', name: '판다', emoji: '🐼', rarity: 'rare' },
    dragon: { id: 'dragon', name: '드래곤', emoji: '🐉', rarity: 'legendary' },
    unicorn: { id: 'unicorn', name: '유니콘', emoji: '🦄', rarity: 'legendary' }
};

// Gacha Rates
const GACHA_RATES = {
    basic: [
        { chance: 70, pool: ['dog', 'cat', 'bunny', 'pig'] },
        { chance: 25, pool: ['fox', 'panda'] },
        { chance: 5, pool: ['dragon', 'unicorn'] }
    ],
    premium: [
        { chance: 20, pool: ['dog', 'cat', 'bunny', 'pig'] },
        { chance: 50, pool: ['fox', 'panda'] },
        { chance: 30, pool: ['dragon', 'unicorn'] }
    ]
};

// DOM Elements
const els = {
    money: document.getElementById('money'),
    moneyContainer: document.querySelector('.money-container'),
    tabs: document.querySelectorAll('.tab-btn'),
    contents: document.querySelectorAll('.tab-content'),
    workBtn: document.getElementById('work-btn'),
    clickEffects: document.getElementById('click-effects'),
    shopContainer: document.getElementById('shop-container'),
    inventory: document.getElementById('inventory'),
    petCount: document.getElementById('pet-count'),
    toast: document.getElementById('toast'),

    // Modal
    modal: document.getElementById('hatch-modal'),
    modalTitle: document.getElementById('modal-title'),
    hatchProcess: document.getElementById('hatch-process'),
    hatchResult: document.getElementById('hatch-result'),
    hatchProgress: document.getElementById('hatch-progress'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    hatchingEmoji: document.getElementById('hatching-egg-emoji'),
    hatchingImg: document.getElementById('hatching-egg-img'),
    hatchedEmoji: document.getElementById('hatched-pet-emoji'),
    hatchedImg: document.getElementById('hatched-pet-img'),
    hatchedName: document.getElementById('hatched-pet-name'),
    hatchedRarity: document.getElementById('hatched-pet-rarity')
};

let currentHatchEgg = null;
let hatchClicks = 0;

// Initialize
function init() {
    loadState();
    updateMoney();
    renderShop();
    renderInventory();
    setupEventListeners();
}

function loadState() {
    const saved = localStorage.getItem('adoptMeMini');
    if (saved) {
        Object.assign(state, JSON.parse(saved));
    }
}

function saveState() {
    localStorage.setItem('adoptMeMini', JSON.stringify(state));
}

function updateMoney() {
    els.money.innerText = state.money;
    els.moneyContainer.classList.remove('pulse');
    void els.moneyContainer.offsetWidth; // trigger reflow
    els.moneyContainer.classList.add('pulse');
}

// Tabs Logic
function setupEventListeners() {
    els.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');

            // update buttons
            els.tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // update contents
            els.contents.forEach(c => c.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Work Click
    els.workBtn.addEventListener('click', (e) => {
        state.money += WORK_REWARD;
        updateMoney();
        showClickEffect(e);
        saveState();
    });

    // Hatching Logic
    els.hatchingEmoji.addEventListener('click', handleHatchClick);
    els.hatchingImg.addEventListener('click', handleHatchClick);

    els.closeModalBtn.addEventListener('click', () => {
        els.modal.classList.add('hidden');
        renderInventory();
    });
}

function showClickEffect(e) {
    const rect = els.workBtn.getBoundingClientRect();
    // Calculate relative to the work area
    const x = e.clientX - rect.left + (Math.random() * 40 - 20);
    const y = e.clientY - rect.top;

    const effect = document.createElement('div');
    effect.className = 'floating-text';
    effect.innerText = `+${WORK_REWARD} 💰`;
    effect.style.left = `${x}px`;
    effect.style.top = `${y}px`;

    els.clickEffects.appendChild(effect);

    setTimeout(() => {
        effect.remove();
    }, 1000);
}

// Shop Logic
function renderShop() {
    els.shopContainer.innerHTML = '';

    SHOP_ITEMS.forEach(item => {
        const card = document.createElement('div');
        card.className = 'item-card';

        // Image with load error fallback
        let iconHtml = `<img src="${item.img}" alt="${item.name}" class="item-icon" onerror="this.outerHTML='<div class=\\'item-icon\\' style=\\'font-size:4rem;\\'>${item.emoji}</div>'">`;

        card.innerHTML = `
            ${iconHtml}
            <div class="item-name">${item.name}</div>
            <div class="item-price">💰 ${item.price}</div>
            <button class="action-btn buy-btn" style="padding: 10px 20px; font-size:1.1rem; border-radius: 15px;">구매하기</button>
        `;

        card.querySelector('button').addEventListener('click', () => buyEgg(item));
        els.shopContainer.appendChild(card);
    });
}

function buyEgg(item) {
    if (state.money >= item.price) {
        state.money -= item.price;
        state.eggs.push({
            id: Date.now().toString(),
            eggType: item.type,
            name: item.name,
            emoji: item.emoji,
            img: item.img
        });
        updateMoney();
        saveState();
        renderInventory();
        showToast(`${item.name}을(를) 구매했어요! [내 펫들] 탭에서 알을 깨워보세요.`);
    } else {
        showToast("돈이 부족해요. 열심히 일해서 모아볼까요?", true);
    }
}

// Inventory Logic
function renderInventory() {
    els.inventory.innerHTML = '';
    els.petCount.innerText = state.pets.length;

    if (state.pets.length === 0 && state.eggs.length === 0) {
        els.inventory.innerHTML = '<div class="empty-state">아직 펫이나 알이 없어요.<br>상점에서 알을 구매해보세요!</div>';
        return;
    }

    // Render Eggs First
    state.eggs.forEach(egg => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.style.border = '2px dashed #ffb199';

        let iconHtml = `<img src="${egg.img || ''}" alt="Egg" class="item-icon" onerror="this.outerHTML='<div class=\\'item-icon\\' style=\\'font-size:4rem;\\'>${egg.emoji}</div>'">`;

        card.innerHTML = `
            ${iconHtml}
            <div class="item-name">${egg.name}</div>
            <button class="action-btn hatch-action-btn" style="padding: 8px 15px; font-size:1rem; border-radius: 15px; margin-top:5px;">알 깨우기</button>
        `;

        card.querySelector('button').addEventListener('click', () => startHatching(egg));
        els.inventory.appendChild(card);
    });

    // Group pets by ID
    const petCounts = {};
    state.pets.forEach(id => {
        petCounts[id] = (petCounts[id] || 0) + 1;
    });

    // Render Pets
    Object.keys(petCounts).forEach(petId => {
        const pet = PETS[petId];
        if (!pet) return;

        const totalCount = petCounts[petId];
        const megaCount = Math.floor(totalCount / 16);
        const neonCount = Math.floor((totalCount % 16) / 4);
        const normalCount = totalCount % 4;

        // Render Mega Neon versions
        for (let i = 0; i < megaCount; i++) {
            const card = document.createElement('div');
            card.className = 'item-card mega-neon-effect';
            card.innerHTML = `
                <div class="mega-neon-badge">🌈 메가 네온 🌈</div>
                <div class="item-icon" style="font-size: 4rem;">${pet.emoji}</div>
                <div class="item-name" style="color: #ff9ff3; font-weight: bold; margin-top: 5px; text-shadow: 1px 1px 2px rgba(0,0,0,0.1);">초월한 ${pet.name}</div>
                <div class="rarity ${pet.rarity}" style="font-size: 0.8rem; margin-bottom:5px; padding: 2px 8px;">${petRarityKor(pet.rarity)}</div>
            `;
            els.inventory.appendChild(card);
        }

        // Render Neon versions
        for (let i = 0; i < neonCount; i++) {
            const card = document.createElement('div');
            card.className = 'item-card neon-effect';
            card.innerHTML = `
                <div class="neon-badge">✨ 네온 ✨</div>
                <div class="item-icon" style="font-size: 4rem;">${pet.emoji}</div>
                <div class="item-name" style="color: #ff6b81; font-weight: bold; margin-top: 5px;">빛나는 ${pet.name}</div>
                <div class="rarity ${pet.rarity}" style="font-size: 0.8rem; margin-bottom:5px; padding: 2px 8px;">${petRarityKor(pet.rarity)}</div>
                <div class="pet-stat-bar"><div class="pet-stat-fill" style="width: ${(neonCount / 4) * 100}%; background: linear-gradient(90deg, #ff9ff3, #feca57);"></div><div style="font-size:0.7rem; color:#888; margin-top:5px;">메가 네온까지: ${neonCount}/4</div></div>
            `;
            els.inventory.appendChild(card);
        }

        // Render Normal versions
        for (let i = 0; i < normalCount; i++) {
            const card = document.createElement('div');
            card.className = 'item-card';
            card.innerHTML = `
                <div class="item-icon" style="font-size: 4rem;">${pet.emoji}</div>
                <div class="item-name">${pet.name}</div>
                <div class="rarity ${pet.rarity}" style="font-size: 0.8rem; margin-bottom:5px; padding: 2px 8px;">${petRarityKor(pet.rarity)}</div>
                <div class="pet-stat-bar"><div class="pet-stat-fill" style="width: ${(normalCount / 4) * 100}%;"></div><div style="font-size:0.7rem; color:#888; margin-top:5px;">네온까지: ${normalCount}/4</div></div>
            `;
            els.inventory.appendChild(card);
        }
    });
}

// Hatching Logic
function startHatching(egg) {
    currentHatchEgg = egg;
    hatchClicks = 0;

    els.modal.classList.remove('hidden');
    els.modalTitle.innerText = "알을 돌봐주세요!";
    els.hatchProcess.classList.remove('hidden');
    els.hatchResult.classList.add('hidden');
    els.hatchProgress.style.width = '0%';

    if (egg.img) {
        els.hatchingImg.src = egg.img;
        els.hatchingImg.classList.remove('hidden');
        els.hatchingEmoji.classList.add('hidden');
    } else {
        els.hatchingEmoji.innerText = egg.emoji;
        els.hatchingEmoji.classList.remove('hidden');
        els.hatchingImg.classList.add('hidden');
    }
}

function handleHatchClick() {
    hatchClicks++;
    const progress = Math.min((hatchClicks / HATCH_CLICKS_NEEDED) * 100, 100);
    els.hatchProgress.style.width = `${progress}%`;

    // add small wiggle
    const el = document.querySelector('.egg-container');
    el.style.transform = `scale(0.95) rotate(${Math.random() * 10 - 5}deg)`;
    setTimeout(() => { el.style.transform = 'scale(1) rotate(0deg)'; }, 100);

    if (hatchClicks >= HATCH_CLICKS_NEEDED) {
        setTimeout(completeHatching, 300); // slight delay for effect
    }
}

function completeHatching() {
    // Remove egg from inventory
    state.eggs = state.eggs.filter(e => e.id !== currentHatchEgg.id);

    // Determine Pet
    const rates = GACHA_RATES[currentHatchEgg.eggType] || GACHA_RATES.basic;
    const roll = Math.random() * 100;

    let acc = 0;
    let selectedPool = rates[0].pool;
    for (let r of rates) {
        acc += r.chance;
        if (roll < acc) {
            selectedPool = r.pool;
            break;
        }
    }

    const randomPetId = selectedPool[Math.floor(Math.random() * selectedPool.length)];
    const pet = PETS[randomPetId];

    // Default to dog if something breaks
    if (!pet) return;

    state.pets.push(randomPetId);
    saveState();

    // Show Result
    els.hatchProcess.classList.add('hidden');
    els.hatchResult.classList.remove('hidden');
    els.modalTitle.innerText = "태어났어요!";

    els.hatchedEmoji.innerText = pet.emoji;
    els.hatchedName.innerText = pet.name;
    els.hatchedRarity.innerText = petRarityKor(pet.rarity);
    els.hatchedRarity.className = `rarity ${pet.rarity}`;

    els.hatchedEmoji.classList.remove('hidden');
    els.hatchedImg.classList.add('hidden'); // using emoji for pets for now
}

function petRarityKor(rarity) {
    if (rarity === 'common') return '일반';
    if (rarity === 'rare') return '희귀성';
    if (rarity === 'legendary') return '전설!';
    return rarity;
}

// Utils
function showToast(msg, isError = false) {
    els.toast.innerText = msg;
    els.toast.style.background = isError ? 'rgba(255, 99, 132, 0.9)' : 'rgba(0,0,0,0.8)';
    els.toast.style.border = isError ? '2px solid #ff4757' : '2px solid #a18cd1';
    els.toast.classList.remove('hidden');

    setTimeout(() => {
        els.toast.classList.add('hidden');
    }, 3000);
}

// Run
window.onload = init;
