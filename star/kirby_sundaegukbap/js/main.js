// js/main.js

const ui = {
    ingredients: document.querySelectorAll('.ingredient'),
    potBack: document.getElementById('ttukbaegi-back'),
    potContents: document.getElementById('pot-contents'),
    broth: document.getElementById('broth'),
    titleText: document.getElementById('title-text'),
    eatBtn: document.getElementById('eat-btn'),
    resetBtn: document.getElementById('reset-btn'),
    confettiLayer: document.getElementById('confetti-layer'),
    boilSound: document.getElementById('boil-sound'),
};

let itemCount = 0;
let isEating = false;

// Bubbles Generation
setInterval(() => {
    if (isEating) return;
    const bubble = document.createElement('div');
    bubble.className = 'bubble';

    // Size and pos
    const size = Math.random() * 20 + 10;
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.style.left = `${Math.random() * 90 + 5}%`;
    bubble.style.animationDuration = `${Math.random() * 0.8 + 0.5}s`;

    ui.broth.appendChild(bubble);

    setTimeout(() => bubble.remove(), 1000);
}, 100);

// --- Drag & Drop ---
let draggedType = null;
let draggedElement = null;

ui.ingredients.forEach(ing => {
    ing.addEventListener('dragstart', (e) => {
        if (isEating) {
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
    if (isEating || !draggedType) return;

    itemCount++;

    // Calculate position
    const potRect = ui.potContents.getBoundingClientRect();
    let x = e.clientX - potRect.left - 40;
    let y = e.clientY - potRect.top - 40;

    // Constrain inside pot
    if (x < 20) x = 20;
    if (x > potRect.width - 60) x = potRect.width - 60;
    if (y < 20) y = 20;
    if (y > potRect.height - 60) y = potRect.height - 60;

    // If Dadaegi (spicy paste) is added, turn broth red!
    if (draggedType === 'dadaegi') {
        ui.broth.classList.add('spicy');
        ui.titleText.textContent = "얼큰해지는 중입니다!";
    }

    // Clone element
    const div = document.createElement('div');
    div.className = `ingredient ${draggedType} dropped-item`;
    div.innerHTML = draggedElement.innerHTML; // get the text

    div.style.left = `${x}px`;
    div.style.top = `${y}px`;

    const rot = Math.random() * 90 - 45;
    div.style.transform = `scale(0.8) rotate(${rot}deg)`;
    div.draggable = false;

    ui.potContents.appendChild(div);

    // Show Eat button
    if (itemCount >= 3) {
        ui.eatBtn.classList.remove('hidden');
    }
});

// --- Actions ---
ui.eatBtn.addEventListener('click', () => {
    isEating = true;
    ui.eatBtn.classList.add('hidden');
    ui.titleText.textContent = "크~ 시원하다! 배부르게 완뚝했습니다!";

    ui.boilSound.pause();
    ui.potContents.innerHTML = '';

    // Simulate empty pot
    ui.broth.style.opacity = '0.2';

    playConfetti();
});


ui.resetBtn.addEventListener('click', () => {
    isEating = false;
    itemCount = 0;
    ui.eatBtn.classList.add('hidden');
    ui.titleText.textContent = "뜨끈한 뚝배기에 순대국밥 재료를 넣어주세요!";

    ui.potContents.innerHTML = '';
    ui.broth.classList.remove('spicy');
    ui.broth.style.opacity = '0.95';

    ui.boilSound.play().catch(e => console.log(e));
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
