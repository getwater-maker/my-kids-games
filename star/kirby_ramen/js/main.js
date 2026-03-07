// js/main.js

const ui = {
    titleText: document.getElementById('title-text'),
    water: document.getElementById('water'),
    potBack: document.getElementById('pot-back'),
    potContents: document.getElementById('pot-contents'),
    paletteArea: document.getElementById('palette-area'),
    ingredients: document.querySelectorAll('.ingredient'),

    addWaterBtn: document.getElementById('add-water-btn'),
    boilBtn: document.getElementById('boil-btn'),
    eatBtn: document.getElementById('eat-btn'),
    resetBtn: document.getElementById('reset-btn'),
    timerDisplay: document.getElementById('timer-display'),
    timeLeft: document.getElementById('time-left'),

    confettiLayer: document.getElementById('confetti-layer'),
    pourSound: document.getElementById('pour-sound'),
    boilSound: document.getElementById('boil-sound')
};

let gameState = 0; // 0: Start, 1: Water added, 2: Boiling, 3: Ingredients added, 4: Cooked
let droppedItems = new Set();
let bubbleInterval;
let timerInterval;

// --- 1. Step: Add Water ---
ui.addWaterBtn.addEventListener('click', () => {
    if (gameState !== 0) return;
    gameState = 1;

    ui.addWaterBtn.classList.add('hidden');
    ui.titleText.textContent = "물이 채워지고 있습니다!";

    ui.pourSound.volume = 0.5;
    ui.pourSound.play().catch(e => console.log(e));

    ui.water.classList.add('filled');

    setTimeout(() => {
        ui.titleText.textContent = "불을 켜고 물을 끓이세요!";
        ui.boilBtn.classList.remove('hidden');
    }, 2000);
});

// --- 2. Step: Boil Water ---
ui.boilBtn.addEventListener('click', () => {
    if (gameState !== 1) return;
    gameState = 2;

    ui.boilBtn.classList.add('hidden');
    ui.titleText.textContent = "보글보글! 재료를 넣어주세요!";

    ui.boilSound.volume = 0.5;
    ui.boilSound.play().catch(e => console.log(e));

    createBubbles();

    // Show palette
    ui.paletteArea.classList.remove('hidden');
});

function createBubbles() {
    bubbleInterval = setInterval(() => {
        if (gameState === 0 || gameState === 4) {
            clearInterval(bubbleInterval);
            return;
        }

        const bubble = document.createElement('div');
        bubble.className = 'bubble';

        const size = Math.random() * 15 + 10;
        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;
        bubble.style.left = `${Math.random() * 90 + 5}%`;
        bubble.style.animationDuration = `${Math.random() * 0.5 + 0.5}s`;

        ui.water.appendChild(bubble);

        setTimeout(() => bubble.remove(), 1000);
    }, 150);
}

// --- 3. Step: Add Ingredients (Drag & Drop) ---
let draggedType = null;
let draggedElement = null;

ui.ingredients.forEach(ing => {
    ing.addEventListener('dragstart', (e) => {
        if (gameState !== 2) {
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

ui.potBack.addEventListener('dragover', (e) => {
    e.preventDefault();
});

ui.potBack.addEventListener('drop', (e) => {
    e.preventDefault();
    if (gameState !== 2 || !draggedType) return;
    if (droppedItems.has(draggedType)) return; // Only 1 of each allowed

    droppedItems.add(draggedType);

    // Calc pos
    const potRect = ui.potContents.getBoundingClientRect();
    let x = e.clientX - potRect.left - 40; // center offset
    let y = e.clientY - potRect.top - 40;

    // Constrain to lower half where water is
    if (x < 50) x = 50;
    if (x > potRect.width - 100) x = potRect.width - 100;
    if (y < 50) y = 50;
    if (y > potRect.height - 100) y = potRect.height - 100;

    // Clone element
    const div = document.createElement('div');
    div.className = `ingredient ${draggedType} dropped-item`;
    div.innerHTML = draggedElement.innerHTML;

    div.style.left = `${x}px`;
    div.style.top = `${y}px`;

    const rot = Math.random() * 45 - 22;
    div.style.transform = `scale(0.8) rotate(${rot}deg)`;
    div.draggable = false;

    ui.potContents.appendChild(div);

    // If Soup is added, turn water red
    if (draggedType === 'soup') {
        ui.water.classList.add('spicy');
    }

    // Hide dropped item from palette so it can't be added twice
    draggedElement.classList.add('hidden');

    checkAllIngredientsAdded();
});

function checkAllIngredientsAdded() {
    if (droppedItems.has('noodle') && droppedItems.has('soup') && droppedItems.has('kirby-egg') && droppedItems.has('green-onion')) {
        gameState = 3;
        ui.titleText.textContent = "마지막으로 3분 끓입니다!";
        ui.paletteArea.classList.add('hidden');
        startCookingTimer();
    }
}

// --- 4. Step: 3 Min Timer (Simulated as 3 secs) ---
function startCookingTimer() {
    ui.timerDisplay.classList.remove('hidden');
    let time = 3;
    ui.timeLeft.textContent = time;

    timerInterval = setInterval(() => {
        time--;
        ui.timeLeft.textContent = time;

        if (time <= 0) {
            clearInterval(timerInterval);
            finishCooking();
        }
    }, 1000);
}

// --- 5. Step: Cooked & Eat ---
function finishCooking() {
    gameState = 4;
    ui.timerDisplay.classList.add('hidden');

    // Stop bubbling
    clearInterval(bubbleInterval);
    ui.boilSound.pause();
    ui.boilSound.currentTime = 0;

    ui.titleText.textContent = "마시따! 커비 라면 완성!";
    ui.eatBtn.classList.remove('hidden');
    playConfetti();
}

ui.eatBtn.addEventListener('click', () => {
    ui.eatBtn.classList.add('hidden');
    ui.potContents.innerHTML = ''; // empty pot
    ui.water.classList.remove('filled'); // water goes down
    ui.titleText.textContent = "꺼어억 잘 먹었습니다!";
});


// --- Reset ---
ui.resetBtn.addEventListener('click', () => {
    gameState = 0;
    droppedItems.clear();
    clearInterval(bubbleInterval);
    clearInterval(timerInterval);

    ui.boilSound.pause();
    ui.boilSound.currentTime = 0;
    ui.pourSound.pause();
    ui.pourSound.currentTime = 0;

    ui.water.classList.remove('filled');
    ui.water.classList.remove('spicy');
    ui.potContents.innerHTML = '';

    // Reset buttons and palette
    ui.addWaterBtn.classList.remove('hidden');
    ui.boilBtn.classList.add('hidden');
    ui.eatBtn.classList.add('hidden');
    ui.timerDisplay.classList.add('hidden');
    ui.paletteArea.classList.add('hidden');

    // Put ingredients back
    ui.ingredients.forEach(ing => ing.classList.remove('hidden'));

    ui.titleText.textContent = "양은 냄비에 물을 올려볼까요?";
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
