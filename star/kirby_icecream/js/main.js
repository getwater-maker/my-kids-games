// js/main.js

const ui = {
    workArea: document.getElementById('work-area'),
    scooper: document.getElementById('scooper'),
    tubs: document.querySelectorAll('.tub'),
    stackContainer: document.getElementById('stack-container'),
    serveBtn: document.getElementById('serve-btn'),
    resetBtn: document.getElementById('reset-btn'),
    confettiLayer: document.getElementById('confetti-layer'),
    customerKirby: document.getElementById('customer-kirby')
};

let currentScoop = null; // Holds the color class of the current scoop 'pink', 'yellow', 'blue'
let scoopCount = 0;
const MAX_SCOOPS = 3;

// --- 1. Custom Cursor (Scooper) ---
ui.workArea.addEventListener('mousemove', (e) => {
    // Offset the scooper to center on mouse
    ui.scooper.style.left = `${e.clientX}px`;
    ui.scooper.style.top = `${e.clientY}px`;
});

// Avoid awkward cursor if entering/leaving
ui.workArea.addEventListener('mouseenter', () => ui.scooper.style.display = 'block');
ui.workArea.addEventListener('mouseleave', () => ui.scooper.style.display = 'none');

// --- 2. Scooping from Tubs ---
ui.tubs.forEach(tub => {
    tub.addEventListener('click', (e) => {
        if (scoopCount >= MAX_SCOOPS) return; // Full!
        if (currentScoop !== null) return; // Already holding one!

        // Grab flavor
        currentScoop = tub.dataset.color;

        // Visual feedback on scooper
        ui.scooper.classList.add('loaded', currentScoop);

        // Pop effect
        ui.scooper.style.transform = "translate(-50%, -50%) scale(1.2)";
        setTimeout(() => {
            ui.scooper.style.transform = "translate(-50%, -50%) scale(1)";
        }, 100);
    });
});

// --- 3. Placing on Cone ---
ui.stackContainer.addEventListener('click', () => {
    if (currentScoop === null) return; // Nothing to place
    if (scoopCount >= MAX_SCOOPS) return;

    // Create the visual scoop DOM element
    placeScoop(currentScoop);
    scoopCount++;

    // Empty the scooper
    ui.scooper.className = 'empty';
    currentScoop = null;

    // Show serve button if at least 1 scoop
    if (scoopCount > 0) {
        ui.serveBtn.classList.remove('hidden');
    }
});

function placeScoop(colorClass) {
    const div = document.createElement('div');
    div.className = `scoop ${colorClass}`;

    // Create Kirby face inside the scoop
    div.innerHTML = `
        <div class="scoop-face">
            <div class="sci-eye left"></div>
            <div class="sci-eye right"></div>
            <div class="sci-blush left"></div>
            <div class="sci-blush right"></div>
            <div class="sci-mouth"></div>
        </div>
    `;

    // Append to stack (Remember stack-container is column-reverse)
    ui.stackContainer.appendChild(div);
}

// --- 4. Controls ---
ui.resetBtn.addEventListener('click', () => {
    // Clear scoops
    const scoops = ui.stackContainer.querySelectorAll('.scoop');
    scoops.forEach(s => s.remove());

    scoopCount = 0;
    currentScoop = null;
    ui.scooper.className = 'empty';
    ui.serveBtn.classList.add('hidden');

    // Hide customer
    ui.customerKirby.classList.remove('arrive');
});

ui.serveBtn.addEventListener('click', () => {
    if (scoopCount === 0) return;

    ui.serveBtn.classList.add('hidden');

    // Trigger confetti
    playConfetti();

    // Customer Arrives
    ui.customerKirby.classList.add('arrive');
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
