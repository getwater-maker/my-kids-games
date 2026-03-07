// js/main.js

const ui = {
    fruits: document.querySelectorAll('.draggable-fruit'),
    skewerArea: document.getElementById('skewer-area'),
    stackedFruits: document.getElementById('stacked-fruits'),
    sugarBtn: document.getElementById('sugar-btn'),
    eatBtn: document.getElementById('eat-btn'),
    resetBtn: document.getElementById('reset-btn'),
    sugarPour: document.getElementById('sugar-pour'),
    confettiLayer: document.getElementById('confetti-layer'),
    crunchSound: document.getElementById('crunch-sound')
};

let fruitCount = 0;
const MAX_FRUITS = 4;
let isGlazed = false;

// --- 1. Drag & Drop Setup ---
let draggedFruitType = null;
let draggedElement = null;

ui.fruits.forEach(fruit => {
    fruit.addEventListener('dragstart', (e) => {
        if (isGlazed) {
            e.preventDefault(); // Cannot drag if already finished
            return;
        }
        draggedFruitType = fruit.dataset.type;
        draggedElement = fruit;

        // Add class to identify dragging
        setTimeout(() => fruit.style.opacity = '0.5', 0);
    });

    fruit.addEventListener('dragend', () => {
        fruit.style.opacity = '1';
        draggedFruitType = null;
        draggedElement = null;
    });
});

// Drop Zone
ui.skewerArea.addEventListener('dragover', (e) => {
    e.preventDefault(); // Must prevent default to allow drop
});

ui.skewerArea.addEventListener('drop', (e) => {
    e.preventDefault();
    if (fruitCount >= MAX_FRUITS || isGlazed) return;
    if (!draggedFruitType) return;

    // Create Stacked Item
    const div = document.createElement('div');
    div.className = `stacked-item fruit-${draggedFruitType}`;

    // Copy the inner visual elements
    div.innerHTML = draggedElement.innerHTML;

    ui.stackedFruits.appendChild(div);
    fruitCount++;

    if (fruitCount > 0 && !isGlazed) {
        ui.sugarBtn.classList.remove('hidden');
    }
});

// --- 2. Sugar Coating Phase ---
ui.sugarBtn.addEventListener('click', () => {
    if (fruitCount === 0 || isGlazed) return;
    isGlazed = true;

    ui.sugarBtn.classList.add('hidden');

    // Start pouring animation
    ui.sugarPour.classList.remove('hidden');

    // Force reflow
    void ui.sugarPour.offsetWidth;

    ui.sugarPour.classList.add('pouring');

    // Wait for pour to finish, then apply glaze to fruits
    setTimeout(() => {
        ui.sugarPour.classList.remove('pouring');
        ui.sugarPour.classList.add('hidden');

        // Apply glass filter
        const stackedItems = ui.stackedFruits.querySelectorAll('.stacked-item');
        stackedItems.forEach(item => {
            const glazeDiv = document.createElement('div');
            glazeDiv.className = 'glazed';
            item.appendChild(glazeDiv);
        });

        // Show eat button
        setTimeout(() => {
            ui.eatBtn.classList.remove('hidden');
        }, 1500); // After glaze hardens

    }, 2000); // pour duration
});

// --- 3. Eat Phase ---
ui.eatBtn.addEventListener('click', () => {
    ui.eatBtn.classList.add('hidden');

    // Play sound if possible
    ui.crunchSound.volume = 0.5;
    ui.crunchSound.play().catch(e => console.log("Audio play prevented:", e));

    // Visual bite marks
    const stackedItems = ui.stackedFruits.querySelectorAll('.stacked-item');
    stackedItems.forEach((item, index) => {
        setTimeout(() => {
            const bite = document.createElement('div');
            bite.className = 'bite-mark';
            item.appendChild(bite);

            // Pop item slightly
            item.style.transform = "scale(0.8) rotate(10deg)";
        }, index * 300); // 0.3s between each bite
    });

    // End Celebration
    setTimeout(() => {
        document.getElementById('title-text').textContent = "바삭바삭! 달콤해요! 😋";
        playConfetti();
    }, stackedItems.length * 300 + 500);
});

// --- Reset ---
ui.resetBtn.addEventListener('click', () => {
    fruitCount = 0;
    isGlazed = false;

    // Clear skewer
    ui.stackedFruits.innerHTML = '';

    // Reset UI
    ui.sugarBtn.classList.add('hidden');
    ui.eatBtn.classList.add('hidden');
    ui.sugarPour.classList.remove('pouring');
    ui.sugarPour.classList.add('hidden');
    document.getElementById('title-text').textContent = "과일을 꼬치에 꽂아보세요! (최대 4개)";
});

function playConfetti() {
    for (let i = 0; i < 50; i++) {
        let c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = `${Math.random() * 100}vw`;
        c.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 70%)`;
        c.style.animationDelay = `${Math.random() * 1}s`;
        ui.confettiLayer.appendChild(c);
        setTimeout(() => c.remove(), 3000);
    }
}
