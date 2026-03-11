/* Tanghulu Master (탕후루의 달인) JS Implementation */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- Config & State ---
const FRUIT_EMOJIS = {
    strawberry: '🍓',
    grape: '🍇',
    orange: '🍊',
    pineapple: '🍍',
    tomato: '🍅',
    duzzonku: '🍪'
};

const TYPE_TO_EMOJI = {
    'strawberry': '🍓',
    'grape': '🍇',
    'orange': '🍊',
    'pineapple': '🍍',
    'tomato': '🍅',
    'duzzonku': '🍪'
};

const EMOJI_TO_TYPE = Object.fromEntries(Object.entries(TYPE_TO_EMOJI).map(([k, v]) => [v, k]));

let score = 0;
let currentTanghulu = []; // List of fruit types on stick
let currentOrder = []; // List of fruit types requested
let coated = false;
let gameState = 'START'; // START, PLAYING, SUCCESS

// --- Initialization ---
function init() {
    setupEventListeners();
    generateNewOrder();
    requestAnimationFrame(gameLoop);
}

function setupEventListeners() {
    document.getElementById('start-game-btn').onclick = startGame;
    document.getElementById('next-order-btn').onclick = () => {
        document.getElementById('success-overlay').classList.add('hidden');
        resetStick();
        generateNewOrder();
        gameState = 'PLAYING';
    };

    document.querySelectorAll('.ingredient').forEach(btn => {
        btn.onclick = () => {
            if (gameState !== 'PLAYING' || currentTanghulu.length >= 5) return;
            const type = btn.getAttribute('data-type');
            addFruit(type);
        };
    });

    document.getElementById('sugar-btn').onclick = coatSugar;
    document.getElementById('serve-btn').onclick = serveTanghulu;
    document.getElementById('reset-btn').onclick = resetStick;
}

function startGame() {
    document.getElementById('start-overlay').classList.add('hidden');
    gameState = 'PLAYING';
}

function generateNewOrder() {
    const keys = Object.keys(FRUIT_EMOJIS);
    currentOrder = [];
    const orderLength = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < orderLength; i++) {
        currentOrder.push(keys[Math.floor(Math.random() * keys.length)]);
    }
    updateOrderUI();
}

function updateOrderUI() {
    const orderStr = currentOrder.map(type => FRUIT_EMOJIS[type]).join('');
    document.getElementById('order-list').textContent = orderStr;
}

function addFruit(type) {
    currentTanghulu.push(type);
}

function coatSugar() {
    if (currentTanghulu.length === 0) return;
    coated = true;
    // Animation/Sound effect placeholder
}

function serveTanghulu() {
    if (gameState !== 'PLAYING' || currentTanghulu.length === 0) return;

    // Check if matches order
    const isCorrect = currentTanghulu.length === currentOrder.length &&
        currentTanghulu.every((v, i) => v === currentOrder[i]);

    if (isCorrect && coated) {
        score += 3000;
        document.getElementById('money').textContent = score.toLocaleString();
        document.getElementById('result-msg').textContent = "존맛탱 탕후루 완성! ✨";
        document.querySelector('.earn-money').textContent = "+ 3,000원";
        gameState = 'SUCCESS';
        document.getElementById('success-overlay').classList.remove('hidden');
    } else if (!coated) {
        alert("설탕 시럽을 먼저 입혀주세요! 🍯");
    } else {
        alert("주문과 달라요! 다시 만들어보세요. 🍡");
        resetStick();
    }
}

function resetStick() {
    currentTanghulu = [];
    coated = false;
}

// --- Animation & Drawing ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const bottomY = canvas.height * 0.8;

    // Draw Stick (Wooden Skewer)
    ctx.strokeStyle = '#d35400';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(centerX, bottomY);
    ctx.lineTo(centerX, bottomY - 500);
    ctx.stroke();

    // Draw Fruits on Stick
    ctx.font = '80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    currentTanghulu.forEach((type, index) => {
        const fruitY = bottomY - 100 - (index * 80);

        // Fruit emoji
        ctx.fillText(FRUIT_EMOJIS[type], centerX, fruitY);

        // Sugar Coating effect
        if (coated) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.beginPath();
            ctx.arc(centerX, fruitY, 45, 0, Math.PI * 2);
            ctx.fill();

            // Highlight shine
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(centerX - 15, fruitY - 15, 10, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // Drawing the syrup bowl (Static visual)
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(centerX + 300, bottomY - 50, 80, 0, Math.PI, false);
    ctx.fill();
    ctx.strokeStyle = '#d35400';
    ctx.lineWidth = 4;
    ctx.stroke();
}

function gameLoop() {
    draw();
    requestAnimationFrame(gameLoop);
}

window.onresize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
};

init();
