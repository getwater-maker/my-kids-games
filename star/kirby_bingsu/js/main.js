// js/main.js

const ui = {
    titleText: document.getElementById('title-text'),
    shaveBtn: document.getElementById('shave-btn'),
    iceMound: document.getElementById('ice-mound'),
    machine: document.getElementById('machine'),
    palette: document.getElementById('palette'),
    serveBtn: document.getElementById('serve-btn'),
    bowlContainer: document.getElementById('bowl-container'),
    draggables: document.querySelectorAll('.draggable-item'),
    confettiLayer: document.getElementById('confetti-layer')
};

let iceClicks = 0;
const MAX_ICE_CLICKS = 15;
let isIceReady = false;

// 1. Shaving Phase
ui.shaveBtn.addEventListener('click', () => {
    if (isIceReady) return;

    iceClicks++;

    // Scale the ice mound
    let newSize = 50 + (iceClicks * 15);
    ui.iceMound.style.width = `${newSize}px`;
    ui.iceMound.style.height = `${newSize}px`;

    // Create Snow Particles
    createSnowParticles();

    if (iceClicks >= MAX_ICE_CLICKS) {
        completeIce();
    }
});

function createSnowParticles() {
    for (let i = 0; i < 5; i++) {
        let p = document.createElement('div');
        p.className = 'snow-particle';

        // Randomize horizontally near the machine nozzle
        let startX = window.innerWidth / 2 + (Math.random() - 0.5) * 60;
        let startY = 300; // Just below the machine

        p.style.left = `${startX}px`;
        p.style.top = `${startY}px`;

        document.body.appendChild(p);

        setTimeout(() => { p.remove(); }, 1000);
    }
}

function completeIce() {
    isIceReady = true;
    ui.titleText.textContent = "커비 모양으로 꾸며보세요!";
    ui.titleText.style.color = "#00bcd4";

    // Move Machine Up away
    ui.machine.style.transform = "translateY(-400px)";

    // Show Palette
    ui.palette.classList.remove('hidden');

    // Show Finish Button
    ui.serveBtn.classList.remove('hidden');
}

// 2. Drag & Drop Phase (Syrup & Decor)
let draggedItem = null;
let dragStartX = 0, dragStartY = 0;

// Set up draggables (syrup + face parts)
ui.draggables.forEach(item => {
    item.addEventListener('dragstart', (e) => {
        draggedItem = item;
        // e.dataTransfer.setData('text/plain', item.id);

        // Custom drag image to center cursor
        let rect = item.getBoundingClientRect();
        e.dataTransfer.setDragImage(item, rect.width / 2, rect.height / 2);
    });
});

// Drop zone is the bowl container (more specifically the ice mound area)
ui.bowlContainer.addEventListener('dragover', (e) => {
    e.preventDefault(); // Necessary to allow dropping
});

ui.bowlContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!draggedItem) return;

    // Check if it's the Syrup
    if (draggedItem.id === 'syrup') {
        ui.iceMound.style.backgroundColor = '#ff80ab'; // Pink Kirby color
        ui.syrupApplied = true;
        // Optionally, remove syrup from tray
        draggedItem.remove();

        // Check if all needed things are done to show serve? The user can just click Serve anytime.
    } else {
        // It's a decoration (eye, mouth, blush)
        // Clone it and place it at the drop location relative to ice mound
        let clone = draggedItem.cloneNode(true);
        clone.className = ''; // remove draggable tray styles
        clone.classList.add('placed-decor'); // add absolute positioning style

        // Retain specific decor shape styling based on id prefix
        if (draggedItem.id.includes('eye')) clone.classList.add('decor-eye');
        if (draggedItem.id.includes('mouth')) clone.classList.add('decor-mouth');
        if (draggedItem.id.includes('blush')) clone.classList.add('decor-blush');

        // Calculate drop X, Y relative to the bowl container
        let rect = ui.bowlContainer.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;

        clone.style.left = `${x}px`;
        clone.style.top = `${y}px`;
        clone.removeAttribute('draggable');
        clone.removeAttribute('id'); // prevent duplicate ids

        ui.bowlContainer.appendChild(clone);

        // Remove from tray
        draggedItem.remove();
    }

    draggedItem = null;
});

// 3. Serve & Confetti
ui.serveBtn.addEventListener('click', () => {
    ui.palette.classList.add('hidden');
    ui.titleText.textContent = "맛있는 커비 빙수 완성!! 🎉";
    ui.titleText.style.color = "#ff4081";

    // Play confetti
    for (let i = 0; i < 100; i++) {
        let c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = `${Math.random() * 100}vw`;
        c.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
        c.style.animationDelay = `${Math.random() * 2}s`;
        ui.confettiLayer.appendChild(c);

        setTimeout(() => c.remove(), 4000);
    }
});
