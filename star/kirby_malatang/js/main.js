// js/main.js

const ui = {
    ingredients: document.querySelectorAll('.ingredient'),
    potArea: document.getElementById('pot-area'),
    potContents: document.getElementById('pot-contents'),
    broth: document.getElementById('broth'),
    titleText: document.getElementById('title-text'),
    spiceSelector: document.getElementById('spice-selector'),
    actionBtns: document.getElementById('action-btns'),
    cookBtn: document.getElementById('cook-btn'),
    eatArea: document.getElementById('eat-area'),
    eatBtn: document.getElementById('eat-btn'),
    resetBtn: document.getElementById('reset-btn'),
    confettiLayer: document.getElementById('confetti-layer'),
    boilSound: document.getElementById('boil-sound'),
    spiceBtns: document.querySelectorAll('.spice-level')
};

let itemCount = 0;
let isCooking = false;
let isCooked = false;
let selectedSpice = 0; // 0=none, 1=mild, 2=med, 3=spicy, 4=hell

// --- 1. Drag & Drop ---
let draggedType = null;
let draggedElement = null;

ui.ingredients.forEach(ing => {
    ing.addEventListener('dragstart', (e) => {
        if (isCooking || isCooked) {
            e.preventDefault();
            return;
        }
        draggedType = ing.dataset.type;
        draggedElement = ing;
        setTimeout(() => ing.style.opacity = '0.5', 0);
    });

    ing.addEventListener('dragend', () => {
        ing.style.opacity = '1';
        draggedType = null;
        draggedElement = null;
    });
});

ui.potArea.addEventListener('dragover', (e) => {
    e.preventDefault();
});

ui.potArea.addEventListener('drop', (e) => {
    e.preventDefault();
    if (isCooking || isCooked) return;
    if (!draggedType) return;

    itemCount++;

    // Calculate relative drop position within the pot-contents
    const potRect = ui.potContents.getBoundingClientRect();
    let x = e.clientX - potRect.left;
    let y = e.clientY - potRect.top;

    // Bounds check
    if (x < 0) x = 0;
    if (x > potRect.width - 50) x = potRect.width - 50;
    if (y < 0) y = 0;
    if (y > potRect.height - 50) y = potRect.height - 50;

    // Clone element
    const div = document.createElement('div');
    div.className = `ingredient ${draggedType} dropped-item`;
    div.innerHTML = draggedElement.innerHTML;

    // Position it
    div.style.left = `${x}px`;
    div.style.top = `${y}px`;

    // Random rotation for natural look
    const rot = Math.random() * 360;
    div.style.transform = `scale(0.8) rotate(${rot}deg)`;

    // Disable drag on the dropped item
    div.draggable = false;

    ui.potContents.appendChild(div);

    // Show spice selector once enough items are in
    if (itemCount > 0) {
        ui.spiceSelector.classList.remove('hidden');
    }
});

// --- 2. Spice Selection ---
const spiceColors = {
    1: '#ffcc80', // White/Mild
    2: '#ff9800', // Medium Orange
    3: '#f44336', // Spicy Red
    4: '#b71c1c'  // Hell Dark Red
};

ui.spiceBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (isCooking || isCooked) return;
        selectedSpice = parseInt(btn.dataset.level);

        // Visual feedback on buttons
        ui.spiceBtns.forEach(b => b.style.transform = 'scale(1)');
        btn.style.transform = 'scale(1.1) translateY(-5px)';
        btn.style.boxShadow = '0 10px 20px rgba(0,0,0,0.3)';

        // Show cook button
        ui.actionBtns.classList.remove('hidden');
    });
});

// --- 3. Cooking Phase ---
ui.cookBtn.addEventListener('click', () => {
    if (selectedSpice === 0) return;

    isCooking = true;
    ui.spiceSelector.classList.add('hidden');
    ui.actionBtns.classList.add('hidden');

    ui.titleText.textContent = "보글보글 끓이는 중...";

    // Change broth color
    ui.broth.style.backgroundColor = spiceColors[selectedSpice];

    // Start bubbling effect
    createBubbles();

    // Play sound
    ui.boilSound.volume = 0.5;
    ui.boilSound.play().catch(e => console.log(e));

    // Wait 4 seconds for cooking
    setTimeout(() => {
        isCooking = false;
        isCooked = true;

        // Stop bubbling
        ui.boilSound.pause();
        ui.boilSound.currentTime = 0;

        ui.titleText.textContent = `마라탕 ${selectedSpice}단계 완성!`;
        ui.eatArea.classList.remove('hidden');

    }, 4000);
});

let bubbleInterval;
function createBubbles() {
    let bubblesCreated = 0;
    const maxBubbles = selectedSpice * 15; // More spice = more bubbles

    bubbleInterval = setInterval(() => {
        if (!isCooking && bubblesCreated > maxBubbles) {
            clearInterval(bubbleInterval);
            return;
        }

        const bubble = document.createElement('div');
        bubble.className = 'bubble';

        // Random size and position
        const size = Math.random() * 20 + 10;
        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;
        bubble.style.left = `${Math.random() * 90}%`;

        // Random animation duration
        bubble.style.animationDuration = `${Math.random() * 1 + 0.5}s`;

        ui.broth.appendChild(bubble);
        bubblesCreated++;

        // Remove bubble after animation
        setTimeout(() => bubble.remove(), 1500);

    }, 100);
}

// --- 4. Eat Phase ---
ui.eatBtn.addEventListener('click', () => {
    ui.eatArea.classList.add('hidden');

    // Empty the pot
    ui.potContents.innerHTML = '';
    ui.broth.style.backgroundColor = '#ffe082'; // Back to base

    ui.titleText.textContent = "완탕! 진짜 맛있어요!";
    playConfetti();
});

// --- Reset ---
ui.resetBtn.addEventListener('click', () => {
    itemCount = 0;
    isCooking = false;
    isCooked = false;
    selectedSpice = 0;

    clearInterval(bubbleInterval);
    ui.boilSound.pause();
    ui.boilSound.currentTime = 0;

    ui.potContents.innerHTML = '';
    ui.broth.innerHTML = '';
    ui.broth.style.backgroundColor = '#ffe082';

    ui.spiceSelector.classList.add('hidden');
    ui.actionBtns.classList.add('hidden');
    ui.eatArea.classList.add('hidden');

    ui.spiceBtns.forEach(b => {
        b.style.transform = 'scale(1)';
        b.style.boxShadow = '0 5px 10px rgba(0,0,0,0.2)';
    });

    ui.titleText.textContent = "재료를 냄비에 담아주세요!";
});

function playConfetti() {
    for (let i = 0; i < 50; i++) {
        let c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = `${Math.random() * 100}vw`;
        c.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
        c.style.animationDelay = `${Math.random() * 1}s`;
        ui.confettiLayer.appendChild(c);
        setTimeout(() => c.remove(), 3000);
    }
}
