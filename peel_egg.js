document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const timeText = document.getElementById('timeText');
    const startBtn = document.getElementById('startBtn');
    const instructionText = document.getElementById('instructionText');

    const eggBoard = document.getElementById('eggBoard');
    const nakedEgg = document.getElementById('nakedEgg');
    const eggFace = document.getElementById('eggFace');
    const canvas = document.getElementById('shellCanvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const clickHint = document.getElementById('clickHint');
    const peelHint = document.getElementById('peelHint');

    const resultScreen = document.getElementById('resultScreen');
    const resultTitle = document.getElementById('resultTitle');
    const resultDesc = document.getElementById('resultDesc');
    const retryBtn = document.getElementById('retryBtn');

    // SFX
    const sfxCrack = document.getElementById('sfx-crack');
    const sfxShatter = document.getElementById('sfx-shatter');
    const sfxWin = document.getElementById('sfx-win');
    const sfxLose = document.getElementById('sfx-lose');

    // Game Variables
    let state = 'idle'; // idle, cracking, peeling, gameover
    let timeLeft = 15.0;
    let gameInterval;
    let checkInterval;

    let clickCount = 0;
    const clicksNeeded = 5;

    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    // Canvas sizing (matches CSS)
    const cw = 200;
    const ch = 280;

    // We want to clear about 80% of the visible egg area ~ 35000 pixels
    const winThreshold = 30000;

    function initCanvas() {
        ctx.globalCompositeOperation = "source-over";
        ctx.clearRect(0, 0, cw, ch);

        // Base color
        ctx.fillStyle = "#cca87b"; // Natural brown egg color
        ctx.fillRect(0, 0, cw, ch);

        // Shading inside canvas
        // Highlight (top left)
        let gradH = ctx.createRadialGradient(60, 80, 10, 80, 100, 150);
        gradH.addColorStop(0, "rgba(255, 255, 255, 0.4)");
        gradH.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = gradH;
        ctx.fillRect(0, 0, cw, ch);

        // Shadow (bottom right)
        let gradS = ctx.createLinearGradient(0, 0, cw, ch);
        gradS.addColorStop(0, "rgba(0, 0, 0, 0)");
        gradS.addColorStop(0.5, "rgba(0, 0, 0, 0)");
        gradS.addColorStop(1, "rgba(0, 0, 0, 0.3)");
        ctx.fillStyle = gradS;
        ctx.fillRect(0, 0, cw, ch);

        // Speckles
        for (let i = 0; i < 300; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? "rgba(70, 40, 20, 0.15)" : "rgba(255, 255, 255, 0.2)";
            ctx.beginPath();
            ctx.arc(Math.random() * cw, Math.random() * ch, Math.random() * 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function initGame() {
        state = 'cracking';
        timeLeft = 15.0;
        clickCount = 0;
        isDragging = false;

        resultScreen.classList.add('hidden');
        eggFace.classList.add('hidden');
        timeText.innerText = timeLeft.toFixed(1) + "초";

        clickHint.classList.remove('hidden');
        peelHint.classList.add('hidden');

        initCanvas();

        clearInterval(gameInterval);
        clearInterval(checkInterval);

        gameInterval = setInterval(() => {
            timeLeft -= 0.1;
            if (timeLeft <= 0) {
                timeLeft = 0;
                endGame(false);
            }
            timeText.innerText = timeLeft.toFixed(1) + "초";
        }, 100);
    }

    // Cracking logic
    function drawCrackBlock(x, y) {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = "rgba(60, 40, 20, 0.8)";
        ctx.lineWidth = 1.5;

        // Draw 3 random branches from tap point
        let branches = 3 + Math.floor(Math.random() * 2);
        for (let i = 0; i < branches; i++) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            let angle = Math.random() * Math.PI * 2;
            let length = 20 + Math.random() * 30;
            let cx = x, cy = y;

            for (let j = 0; j < 3; j++) {
                angle += (Math.random() - 0.5); // wobble
                cx += Math.cos(angle) * (length / 3);
                cy += Math.sin(angle) * (length / 3);
                ctx.lineTo(cx, cy);
            }
            ctx.stroke();
        }
    }

    // Peeling logic
    function peel(x, y) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        // Scratch radius 25px
        ctx.arc(x, y, 25, 0, Math.PI * 2);
        ctx.fillStyle = "black";
        ctx.fill();

        // connect to last pos for smooth line
        if (lastX !== 0 && lastY !== 0) {
            ctx.beginPath();
            ctx.lineWidth = 50; // diameter
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = "rgba(0, 0, 0, 1)";
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    }

    function checkWinCondition() {
        if (state !== 'peeling') return;

        const imgData = ctx.getImageData(0, 0, cw, ch).data;
        let transparent = 0;

        // alpha channel is every 4th value
        for (let i = 3; i < imgData.length; i += 4) {
            if (imgData[i] < 128) {
                transparent++;
            }
        }

        if (transparent >= winThreshold) {
            endGame(true);
        }
    }

    // Interaction handling
    function getEventPos(e) {
        let clientX, clientY;
        if (e.type.includes('touch')) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        const rect = canvas.getBoundingClientRect();
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    function onPointerDown(e) {
        if (state === 'idle' || state === 'gameover') return;

        const { x, y } = getEventPos(e);

        if (state === 'cracking') {
            clickCount++;
            drawCrackBlock(x, y);

            // Bounce effect
            eggBoard.classList.remove('bouncing');
            void eggBoard.offsetWidth; // trigger reflow
            eggBoard.classList.add('bouncing');

            if (sfxCrack) {
                sfxCrack.currentTime = 0;
                sfxCrack.play().catch(err => console.log(err));
            }

            if (clickCount >= clicksNeeded) {
                state = 'peeling';
                if (sfxShatter) {
                    sfxShatter.currentTime = 0;
                    sfxShatter.play().catch(e => console.log(e));
                }
                clickHint.classList.add('hidden');
                peelHint.classList.remove('hidden');

                // Hide peel hint after 2s
                setTimeout(() => peelHint.classList.add('hidden'), 2000);

                // Start checking for win condition
                checkInterval = setInterval(checkWinCondition, 300);
            }
        } else if (state === 'peeling') {
            isDragging = true;
            lastX = x;
            lastY = y;
            peel(x, y);
        }
    }

    function onPointerMove(e) {
        if (state === 'peeling' && isDragging) {
            const { x, y } = getEventPos(e);
            peel(x, y);
            lastX = x;
            lastY = y;
        }
    }

    function onPointerUp() {
        isDragging = false;
        lastX = 0;
        lastY = 0;
    }

    function endGame(isWin) {
        state = 'gameover';
        clearInterval(gameInterval);
        clearInterval(checkInterval);

        clickHint.classList.add('hidden');
        peelHint.classList.add('hidden');
        resultScreen.classList.remove('hidden');

        if (isWin) {
            resultTitle.innerText = "계란 까기 성공! 🎉";
            resultTitle.style.color = "#00cec9";
            resultDesc.innerText = `매끈하고 예쁘게 잘 깠어요!\n기록: ${(15.0 - timeLeft).toFixed(1)}초`;

            // Clear remaining canvas
            ctx.clearRect(0, 0, cw, ch);
            eggFace.classList.remove('hidden'); // Show cute face

            if (sfxWin) {
                sfxWin.currentTime = 0;
                sfxWin.play().catch(err => console.log(err));
            }
        } else {
            resultTitle.innerText = "시간 부족! 💦";
            resultTitle.style.color = "#d63031";
            resultDesc.innerText = "시간이 부족해서 다 못 깠어요.\n조금 더 빨리 문질러주세요!";

            if (sfxLose) {
                sfxLose.currentTime = 0;
                sfxLose.play().catch(err => console.log(err));
            }
        }
    }

    // Attach Events
    startBtn.addEventListener('click', () => {
        if (state !== 'cracking' && state !== 'peeling') {
            initGame();
        }
    });

    retryBtn.addEventListener('click', () => {
        initGame();
    });

    // Handle mouse and touch
    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); onPointerDown(e); }, { passive: false });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); onPointerMove(e); }, { passive: false });
    window.addEventListener('touchend', onPointerUp);

    // Initial state setup visual
    initCanvas();
});
