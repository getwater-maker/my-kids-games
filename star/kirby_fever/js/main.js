// js/main.js

const ui = {
    timeLeft: document.getElementById('time-left'),
    temperature: document.getElementById('temperature'),
    tempBar: document.getElementById('temp-bar'),
    kirbyBody: document.getElementById('kirby-body'),
    startScreen: document.getElementById('start-screen'),
    gameOverScreen: document.getElementById('game-over-screen'),
    resultTitle: document.getElementById('result-title'),
    resultDesc: document.getElementById('result-desc'),
    startBtn: document.getElementById('start-btn'),
    restartBtn: document.getElementById('restart-btn'),
    container: document.getElementById('game-container'),
    confettiLayer: document.getElementById('confetti-layer'),
    mouth: document.querySelector('.mouthsweat')
};

let timerInterval;
let timeRemaining = 20;
let currentTemp = 100;
let isPlaying = false;

// Initialize
ui.startBtn.addEventListener('click', startGame);
ui.restartBtn.addEventListener('click', () => { location.reload(); });

ui.kirbyBody.addEventListener('mousedown', () => {
    if (!isPlaying) return;

    // Reduce Temp
    currentTemp--;
    if (currentTemp < 0) currentTemp = 0;

    updateUI();

    // Check Win
    if (currentTemp === 0) {
        winGame();
    }
});

// touch support for mobile/fast tapping
ui.kirbyBody.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevents double firing with mousedown
    if (!isPlaying) return;
    currentTemp--;
    if (currentTemp < 0) currentTemp = 0;
    updateUI();
    if (currentTemp === 0) winGame();
}, { passive: false });

function startGame() {
    ui.startScreen.classList.remove('active');

    timeRemaining = 20;
    currentTemp = 100;
    isPlaying = true;
    updateUI();

    // Start Timer
    timerInterval = setInterval(() => {
        timeRemaining--;
        ui.timeLeft.textContent = timeRemaining;

        if (timeRemaining <= 0) {
            loseGame();
        }
    }, 1000);
}

function updateUI() {
    ui.temperature.textContent = currentTemp;

    // Height of progress bar
    ui.tempBar.style.height = `${currentTemp}%`;

    // Visual changes based on temperature
    let redColor = Math.floor((currentTemp / 100) * 255);
    let blueColor = 255 - redColor;

    // Color transitions from Hot Red (#ff1744) to Ice Blue (#00bcd4)
    ui.kirbyBody.style.background = `rgb(${redColor}, ${Math.floor(redColor * 0.2)}, ${blueColor})`;
    ui.kirbyBody.style.boxShadow = `0 0 50px rgb(${redColor}, 0, ${blueColor}), inset -20px -20px 40px rgba(0,0,0,0.3)`;

    // Throbbing speed
    if (currentTemp > 80) {
        ui.kirbyBody.style.animationDuration = "0.2s";
        ui.mouth.textContent = "🥵";
    } else if (currentTemp > 40) {
        ui.kirbyBody.style.animationDuration = "0.5s";
        ui.mouth.textContent = "😰";
    } else if (currentTemp > 10) {
        ui.kirbyBody.style.animationDuration = "1s";
        ui.mouth.textContent = "😮‍💨";
    } else {
        ui.kirbyBody.style.animation = "none";
        ui.mouth.textContent = "🥶";
    }
}

function winGame() {
    isPlaying = false;
    clearInterval(timerInterval);

    ui.container.classList.add('cool');
    ui.kirbyBody.style.background = '#81d4fa'; // very cold

    setTimeout(() => {
        ui.resultTitle.textContent = "성공!! ❄️";
        ui.resultTitle.style.color = "#00bcd4";
        ui.resultDesc.textContent = `축하합니다! ${20 - timeRemaining}초 만에 커비의 열을 완전히 내렸습니다!`;
        ui.gameOverScreen.classList.add('active');
        playConfetti();
    }, 500);
}

function loseGame() {
    isPlaying = false;
    clearInterval(timerInterval);

    ui.resultTitle.textContent = "실패... 🔥";
    ui.resultTitle.style.color = "#ff5252";
    ui.resultDesc.textContent = `시간 초과! 커비의 온도를 다 내리지 못했어요. (남은 온도: ${currentTemp}°C)`;
    ui.gameOverScreen.classList.add('active');
}

function playConfetti() {
    for (let i = 0; i < 100; i++) {
        let c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = `${Math.random() * 100}vw`;
        c.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
        c.style.animationDelay = `${Math.random() * 2}s`;
        ui.confettiLayer.appendChild(c);
        setTimeout(() => c.remove(), 4000);
    }
}
