document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // UI Elements
    const scoreDisplay = document.getElementById('scoreDisplay');
    const bestScoreDisplay = document.getElementById('bestScoreDisplay');
    const finalScore = document.getElementById('finalScore');

    const startScreen = document.getElementById('startScreen');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const startBtn = document.getElementById('startBtn');
    const retryBtn = document.getElementById('retryBtn');
    const restartBtn = document.getElementById('restartBtn');

    // SFX
    const sfxDrop = document.getElementById('sfx-drop');
    const sfxPerfect = document.getElementById('sfx-perfect');
    const sfxFall = document.getElementById('sfx-fall');

    // Game Variables
    let state = 'start'; // start, playing, gameover
    let boxes = [];
    let debris = [];
    let score = 0;

    // LocalStorage for high score
    let bestScore = localStorage.getItem('pandaTowerBest') || 0;
    bestScoreDisplay.innerText = bestScore + "층";

    let cameraY = 0;
    let prevTime = 0;
    let time = 0;
    let speed = 4;

    // Constants
    const boxHeight = 50;
    const canvasWidth = 500;
    const canvasHeight = 700;
    const initialBoxWidth = 250;
    const initialBoxX = (canvasWidth - initialBoxWidth) / 2;

    const boxColors = ['#e63946', '#fca311', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51', '#8ecae6', '#219ebc', '#023047', '#ffb703', '#fb8500', '#8338ec', '#ff006e'];

    // Generate Background Stars once
    const stars = [];
    for (let i = 0; i < 60; i++) {
        stars.push({
            x: Math.random() * canvasWidth,
            y: Math.random() * canvasHeight * 10 - (canvasHeight * 9), // They go high up into space
            size: Math.random() * 2 + 1,
            opacity: Math.random() * 0.5 + 0.3
        });
    }

    function initGame() {
        boxes = [{
            x: initialBoxX,
            y: canvasHeight - boxHeight - 50,
            w: initialBoxWidth,
            h: boxHeight,
            color: '#808080', // base box
            dir: 0
        }];

        score = 0;
        speed = 4;
        cameraY = 0;
        debris = [];
        scoreDisplay.innerText = score;

        addNewBox();
        state = 'playing';
        startScreen.classList.add('hidden');
        gameOverScreen.classList.add('hidden');

        prevTime = performance.now();
        requestAnimationFrame(update);
    }

    function addNewBox() {
        const lastBox = boxes[boxes.length - 1];
        const newY = lastBox.y - boxHeight;

        const isLeft = Math.random() > 0.5;
        const startX = isLeft ? -initialBoxWidth : canvasWidth;
        const dir = isLeft ? 1 : -1;

        const color = boxColors[boxes.length % boxColors.length];

        boxes.push({
            x: startX,
            y: newY,
            w: lastBox.w,
            h: boxHeight,
            color: color,
            dir: dir
        });

        // Target camera position
        if (boxes.length > 5) {
            cameraY = (boxes.length - 5) * boxHeight;
        }
    }

    function dropBox() {
        if (state !== 'playing') return;

        const topBox = boxes[boxes.length - 1];
        const prevBox = boxes[boxes.length - 2];

        topBox.dir = 0; // Stop moving

        // Calculate overlap
        const overlapStart = Math.max(topBox.x, prevBox.x);
        const overlapEnd = Math.min(topBox.x + topBox.w, prevBox.x + prevBox.w);
        const overlapWidth = overlapEnd - overlapStart;

        if (overlapWidth > 0) {
            // Check for perfect placement (tolerance 6px)
            if (Math.abs(topBox.x - prevBox.x) <= 6) {
                // Perfect! Expand slightly or just align
                topBox.x = prevBox.x;
                topBox.w = prevBox.w; // align perfectly
                playSound(sfxPerfect);

                // create some little stars for perfect combo
                createParticles(topBox.x + topBox.w / 2, topBox.y + boxHeight / 2, '#fff');
            } else {
                // Chop the box!
                const fallingX = (topBox.x < prevBox.x) ? topBox.x : prevBox.x + prevBox.w;
                const fallingW = topBox.w - overlapWidth;

                // Add falling piece
                debris.push({
                    x: fallingX,
                    y: topBox.y,
                    w: fallingW,
                    h: boxHeight,
                    color: topBox.color,
                    vy: 0,
                    vx: (fallingX < overlapStart) ? -50 : 50 // fly slightly outward
                });

                topBox.w = overlapWidth;
                topBox.x = overlapStart;
                playSound(sfxDrop);
            }

            score++;
            scoreDisplay.innerText = score;
            speed += 0.1; // Increase speed

            addNewBox();
        } else {
            // Miss! Game Over
            state = 'gameover';
            playSound(sfxFall);

            debris.push({
                x: topBox.x,
                y: topBox.y,
                w: topBox.w,
                h: boxHeight,
                color: topBox.color,
                vy: 0,
                vx: 0
            });
            boxes.pop(); // Remove the missed box from the tower

            endGame();
        }
    }

    let particles = [];
    function createParticles(x, y, color) {
        for (let i = 0; i < 10; i++) {
            particles.push({
                x: x, y: y,
                vx: (Math.random() - 0.5) * 150,
                vy: (Math.random() - 0.5) * 150,
                life: 1.0,
                color: color
            });
        }
    }

    function endGame() {
        setTimeout(() => {
            gameOverScreen.classList.remove('hidden');
            finalScore.innerText = score;
            if (score > bestScore) {
                bestScore = score;
                localStorage.setItem('pandaTowerBest', bestScore);
                bestScoreDisplay.innerText = bestScore + "층";
            }
        }, 1200);
    }

    function playSound(snd) {
        if (snd) {
            snd.currentTime = 0;
            snd.volume = 0.5;
            snd.play().catch(e => console.log(e));
        }
    }

    // Controls
    startBtn.addEventListener('click', initGame);
    retryBtn.addEventListener('click', initGame);
    restartBtn.addEventListener('click', () => {
        if (state === 'playing') { state = 'gameover'; initGame(); }
    });

    canvas.addEventListener('mousedown', dropBox);
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (state === 'playing') dropBox();
    }, { passive: false });

    // Draw Emoji Red Panda
    function drawPanda(x, y, w, h) {
        ctx.save();
        ctx.translate(x + w / 2, y);

        ctx.font = "50px 'Jua', sans-serif";
        ctx.textAlign = "center";

        // Bounce animation based on time
        const bounce = Math.abs(Math.sin(time * 3)) * 8;

        // shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(0, 5, 20, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillText("🦝", 0, -5 - bounce);

        ctx.restore();
    }

    function update(timestamp) {
        if (state === 'start') return;

        const dt = (timestamp - prevTime) / 1000 || 0;
        prevTime = timestamp;
        time += dt;

        // Clear Canvas
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // 1. Draw Background Gradient
        // As you go higher (cameraY increases), change sky to space
        const skyR = Math.max(11, 135 - cameraY * 0.1);
        const skyG = Math.max(34, 206 - cameraY * 0.1);
        const skyB = Math.max(66, 235 - cameraY * 0.1);

        const grad = ctx.createLinearGradient(0, 0, 0, canvasHeight);
        // Start black at the very top of space, down to sky blue
        grad.addColorStop(0, '#000010');
        grad.addColorStop(1, `rgb(${skyR}, ${skyG}, ${skyB})`);

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // --- CAMERA TRANSFORM ON ---
        ctx.save();

        // Smooth camera follow
        const targetCameraY = Math.max(0, (boxes.length - 6) * boxHeight);
        cameraY += (targetCameraY - cameraY) * 0.1;
        ctx.translate(0, cameraY);

        // 2. Draw Stars (only visible when camera is high enough)
        for (let star of stars) {
            if (cameraY - star.y > -canvasHeight) { // visible range roughly
                ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
                ctx.beginPath();
                ctx.arc(star.x, star.y + (cameraY * 0.8), star.size, 0, Math.PI * 2); // Parallax effect
                ctx.fill();
            }
        }

        // 3. Update & Draw Debris
        for (let i = 0; i < debris.length; i++) {
            let d = debris[i];
            d.vy += 600 * dt; // gravity
            d.x += d.vx * dt;
            d.y += d.vy * dt;

            // Draw
            ctx.fillStyle = '#00000033';
            ctx.fillRect(d.x + 5, d.y + 10, d.w, d.h); // Shadow
            ctx.fillStyle = d.color;
            ctx.fillRect(d.x, d.y, d.w, d.h);
            ctx.fillStyle = '#ffffff66';
            ctx.fillRect(d.x, d.y, d.w, 5); // highlight
        }

        // 4. Update Moving Box
        if (state === 'playing') {
            const topBox = boxes[boxes.length - 1];
            topBox.x += topBox.dir * speed * 60 * dt;

            if (topBox.x + topBox.w > canvasWidth) {
                topBox.dir = -1;
                topBox.x = canvasWidth - topBox.w;
            } else if (topBox.x < 0) {
                topBox.dir = 1;
                topBox.x = 0;
            }
        }

        // 5. Draw Boxes
        for (let i = 0; i < boxes.length; i++) {
            const b = boxes[i];

            // Drop shadow
            ctx.fillStyle = '#00000033';
            ctx.fillRect(b.x + 5, b.y + 10, b.w, b.h);

            // Main Color
            ctx.fillStyle = b.color;
            ctx.fillRect(b.x, b.y, b.w, b.h);

            // Top highlight for 3D feel
            ctx.fillStyle = '#ffffff66';
            ctx.fillRect(b.x, b.y, b.w, 4);

            // Bottom shadow
            ctx.fillStyle = '#00000022';
            ctx.fillRect(b.x, b.y + b.h - 4, b.w, 4);
        }

        // 6. Draw Red Panda on Top
        const standingIndex = (state === 'playing') ? boxes.length - 2 : boxes.length - 1;
        if (boxes[standingIndex]) {
            const sb = boxes[standingIndex];
            drawPanda(sb.x, sb.y, sb.w, sb.h);
        }

        // 7. Update & Draw Particles (Combos)
        for (let i = particles.length - 1; i >= 0; i--) {
            let p = particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt * 2;

            if (p.life <= 0) {
                particles.splice(i, 1);
            } else {
                ctx.fillStyle = `rgba(255, 255, 255, ${p.life})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
        // --- CAMERA TRANSFORM OFF ---

        if (state !== 'start') {
            requestAnimationFrame(update);
        }
    }
});
