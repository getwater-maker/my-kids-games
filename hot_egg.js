document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const tempGauge = document.getElementById('tempGauge');
    const tempText = document.getElementById('tempText');
    const timeText = document.getElementById('timeText');
    const startBtn = document.getElementById('startBtn');
    const theEgg = document.getElementById('theEgg');
    const eggContainer = document.getElementById('eggContainer');
    const steamLayer = document.getElementById('steamLayer');

    const resultScreen = document.getElementById('resultScreen');
    const resultTitle = document.getElementById('resultTitle');
    const resultDesc = document.getElementById('resultDesc');
    const retryBtn = document.getElementById('retryBtn');

    // SFX
    const sfxBlow = document.getElementById('sfx-blow');
    const sfxWin = document.getElementById('sfx-win');
    const sfxLose = document.getElementById('sfx-lose');
    const sfxSizzle = document.getElementById('sfx-sizzle');

    // Game Variables
    let isPlaying = false;
    let temp = 100.0; // Starts at 100°C
    let timeLeft = 10.0; // 10 seconds to cool it down
    let gameInterval;
    let steamInterval;

    // Constants
    const maxTemp = 100.0;
    const minTemp = 0.0;

    // Update visual temperature
    function updateTempVisuals() {
        tempGauge.style.width = `${(temp / maxTemp) * 100}%`;
        tempText.innerText = `${Math.round(temp)}°C`;

        // Color interpolation for egg: Red (#ff4757) to White/Pale Yellow (#f8efba)
        // Red = 255, 71, 87
        // White = 248, 239, 186
        const ratio = temp / maxTemp; // 1.0 = Hot, 0.0 = Cool

        const r = Math.round(248 + (255 - 248) * ratio);
        const g = Math.round(239 - (239 - 71) * ratio);
        const b = Math.round(186 - (186 - 87) * ratio);

        theEgg.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;

        // Glow effect
        const glowRadius = temp * 0.5;
        theEgg.style.boxShadow = `
            inset -15px -15px 30px rgba(0, 0, 0, 0.3),
            inset 10px 10px 20px rgba(255, 255, 255, 0.8),
            0 0 ${glowRadius}px rgba(255, 107, 129, ${ratio})
        `;

        // Egg shaking based on temp
        if (temp > 80) {
            theEgg.classList.add('shaking');
            theEgg.style.animationDuration = '0.05s';
        } else if (temp > 50) {
            theEgg.classList.add('shaking');
            theEgg.style.animationDuration = '0.1s';
        } else if (temp > 20) {
            theEgg.classList.add('shaking');
            theEgg.style.animationDuration = '0.3s';
        } else {
            theEgg.classList.remove('shaking');
        }
    }

    // Spawn steam particles randomly from the egg while hot
    function spawnSteam() {
        if (!isPlaying || temp < 10) return;

        // More steam when hotter
        const numSteam = Math.floor(temp / 20) + 1;

        for (let i = 0; i < numSteam; i++) {
            const steam = document.createElement('div');
            steam.classList.add('steam');

            // Random position near center of egg container
            const x = (Math.random() * 100) - 50;
            const y = (Math.random() * 50) - 25;

            steam.style.left = `calc(50% + ${x}px)`;
            steam.style.top = `calc(50% + ${y}px)`;

            steamLayer.appendChild(steam);

            // Remove element after animation (1s)
            setTimeout(() => { steam.remove(); }, 1000);
        }
    }

    // Cooling interaction
    function blowWind(e) {
        if (!isPlaying) return;

        // Reduce temp by tap
        temp -= 2.5;
        if (temp < minTemp) temp = minTemp;

        updateTempVisuals();

        // Sound
        if (sfxBlow) {
            sfxBlow.currentTime = 0;
            sfxBlow.volume = 0.6;
            sfxBlow.play().catch(e => console.log(e));
        }

        // Spawn visual wind particle at mouse/touch
        let x, y;
        if (e.type === 'touchstart') {
            x = e.touches[0].clientX;
            y = e.touches[0].clientY;
        } else {
            x = e.clientX;
            y = e.clientY;
        }

        // Adjust to container coordinates
        const rect = eggContainer.parentElement.getBoundingClientRect();
        const rx = x - rect.left - 7.5; // - half particle size
        const ry = y - rect.top - 7.5;

        const wind = document.createElement('div');
        wind.classList.add('wind');
        wind.style.left = rx + 'px';
        wind.style.top = ry + 'px';

        eggContainer.parentElement.appendChild(wind);
        setTimeout(() => { wind.remove(); }, 500);

        // Check win condition
        if (temp <= minTemp) {
            endGame(true);
        }
    }

    function initGame() {
        temp = 100.0;
        timeLeft = 10.0;
        isPlaying = true;

        resultScreen.classList.add('hidden');
        timeText.innerText = timeLeft.toFixed(1) + "초";

        updateTempVisuals();

        if (sfxSizzle) {
            sfxSizzle.currentTime = 0;
            sfxSizzle.volume = 0.5;
            sfxSizzle.play().catch(e => console.log(e));
        }

        // Start timers
        clearInterval(gameInterval);
        clearInterval(steamInterval);

        steamInterval = setInterval(spawnSteam, 200);

        gameInterval = setInterval(() => {
            timeLeft -= 0.1;

            // Temp naturally rises slightly if not blown
            temp += 0.5;
            if (temp > maxTemp) temp = maxTemp;

            updateTempVisuals();

            if (timeLeft <= 0) {
                timeLeft = 0;
                endGame(false);
            }

            timeText.innerText = timeLeft.toFixed(1) + "초";

            // Adjust sizzle volume
            if (sfxSizzle) sfxSizzle.volume = (temp / maxTemp) * 0.5;

        }, 100);
    }

    function endGame(isWin) {
        isPlaying = false;
        clearInterval(gameInterval);
        clearInterval(steamInterval);

        if (sfxSizzle) sfxSizzle.pause();
        theEgg.classList.remove('shaking');

        resultScreen.classList.remove('hidden');

        if (isWin) {
            resultTitle.innerText = "성공! 🎉";
            resultTitle.style.color = "#2ecc71";
            resultDesc.innerText = `휴 다행이에요!\n${(10.0 - timeLeft).toFixed(1)}초 만에 아주 맛있는\n온도로 식혔습니다! 😋`;
            theEgg.innerText = "😵‍💫"; // Funny cute face
            theEgg.style.display = "flex";
            theEgg.style.justifyContent = "center";
            theEgg.style.alignItems = "center";
            theEgg.style.fontSize = "60px";

            if (sfxWin) {
                sfxWin.currentTime = 0;
                sfxWin.play().catch(e => console.log(e));
            }
        } else {
            resultTitle.innerText = "실패... 💥";
            resultTitle.style.color = "#ff4757";
            resultDesc.innerText = "계란이 너무 뜨거워서\n터져버렸어요! 😭\n다시 도전해보세요!";

            // explosion effect
            theEgg.style.backgroundColor = "#2d3436"; // burnt
            theEgg.style.boxShadow = "none";
            theEgg.innerText = "🔥";
            theEgg.style.display = "flex";
            theEgg.style.justifyContent = "center";
            theEgg.style.alignItems = "center";
            theEgg.style.fontSize = "80px";

            if (sfxLose) {
                sfxLose.currentTime = 0;
                sfxLose.play().catch(e => console.log(e));
            }
        }
    }

    // Event Listeners
    startBtn.addEventListener('click', () => {
        if (!isPlaying) initGame();
    });

    retryBtn.addEventListener('click', () => {
        theEgg.innerText = "";
        initGame();
    });

    const gameArea = document.querySelector('.game-wrapper');
    gameArea.addEventListener('mousedown', blowWind);
    gameArea.addEventListener('touchstart', (e) => {
        e.preventDefault(); // prevent zoom
        blowWind(e);
    }, { passive: false });

});
