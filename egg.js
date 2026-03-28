document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('eggCanvas');
    const ctx = canvas.getContext('2d');
    const toolBtns = document.querySelectorAll('.tool-btn');
    const cursorHint = document.getElementById('cursorHint');
    const clearBtn = document.getElementById('clearBtn');
    const saveBtn = document.getElementById('saveBtn');

    // SFX
    const sizzleSfx = document.getElementById('sfx-sizzle');
    const popSfx = document.getElementById('sfx-pop');

    // State
    let currentTool = 'egg';
    let currentValue = 'sunny';
    let currentColor = '#ffffff';
    let currentSize = 12;

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    // Tool selection
    toolBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            toolBtns.forEach(b => b.classList.remove('active'));
            const target = e.currentTarget;
            target.classList.add('active');

            currentTool = target.dataset.tool;
            if (currentTool === 'egg' || currentTool === 'topping') {
                currentValue = target.dataset.val;
            } else if (currentTool === 'powder' || currentTool === 'sauce') {
                currentColor = target.dataset.color;
                if (target.dataset.size) {
                    currentSize = parseInt(target.dataset.size);
                }
            }

            // Update cursor hint emoji
            let emoji = "🍳";
            if (currentTool === 'topping') emoji = currentValue;
            else if (currentTool === 'powder') {
                if (currentColor === '#ffffff') emoji = "🧂"; // Salt
                else if (currentColor === '#2d3436') emoji = "🖤"; // Pepper
                else emoji = "🌿"; // Parsley
            }
            else if (currentTool === 'sauce') {
                emoji = currentColor === '#e74c3c' ? "🍅" : "🍯"; // Ketchup / Mustard
            }
            else if (currentTool === 'egg') {
                if (currentValue === 'sunny') emoji = "🍳";
                else if (currentValue === 'hard') emoji = "🥚";
                else emoji = "💛";
            }
            cursorHint.innerText = emoji;
        });
    });

    // Cursor tracking
    document.addEventListener('mousemove', (e) => {
        cursorHint.style.left = e.pageX + 'px';
        cursorHint.style.top = e.pageY + 'px';
    });

    canvas.addEventListener('mouseenter', () => {
        cursorHint.style.display = 'block';
    });
    canvas.addEventListener('mouseleave', () => {
        cursorHint.style.display = 'none';
        isDrawing = false;
        pauseSizzle();
    });

    // Drawing interaction
    canvas.addEventListener('mousedown', (e) => {
        isDrawing = true;
        const { x, y } = getMousePos(canvas, e);
        lastX = x;
        lastY = y;

        if (currentTool === 'egg') {
            drawEgg(x, y, currentValue);
            playPop();
        } else if (currentTool === 'topping') {
            drawTopping(x, y, currentValue);
            playPop();
        } else if (currentTool === 'powder' || currentTool === 'sauce') {
            playSizzle();
            if (currentTool === 'sauce') {
                drawSauceSpot(x, y);
            } else {
                drawPowder(x, y);
            }
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        const { x, y } = getMousePos(canvas, e);

        if (currentTool === 'sauce') {
            drawSauceLine(lastX, lastY, x, y);
        } else if (currentTool === 'powder') {
            drawPowder(x, y);
        }

        lastX = x;
        lastY = y;
    });

    canvas.addEventListener('mouseup', () => {
        isDrawing = false;
        pauseSizzle();
    });

    function getMousePos(c, evt) {
        const rect = c.getBoundingClientRect();
        const scaleX = c.width / rect.width;
        const scaleY = c.height / rect.height;
        return {
            x: (evt.clientX - rect.left) * scaleX,
            y: (evt.clientY - rect.top) * scaleY
        };
    }

    // Tools logic
    function drawEgg(x, y, type) {
        if (type === 'sunny' || type === 'hard') {
            // Randomly sized wavy egg white
            const whiteRadiusX = 45 + Math.random() * 25;
            const whiteRadiusY = 40 + Math.random() * 30;
            const rotation = Math.random() * Math.PI;

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation);

            // White part
            ctx.beginPath();
            ctx.ellipse(0, 0, whiteRadiusX, whiteRadiusY, 0, 0, 2 * Math.PI);
            ctx.fillStyle = type === 'hard' ? '#fdfbf7' : '#ffffff';
            ctx.shadowColor = 'rgba(0,0,0,0.2)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            ctx.fill();

            // Add crispy fried edge for sunny side up
            if (type === 'sunny') {
                ctx.strokeStyle = 'rgba(160, 82, 45, 0.4)'; // slightly burnt edge color
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }

            ctx.restore();

            // Yolk part
            ctx.save();
            // Offset yolk slightly from center for realism
            ctx.translate(x + (Math.random() * 14 - 7), y + (Math.random() * 14 - 7));
            ctx.beginPath();
            ctx.arc(0, 0, 22 + Math.random() * 6, 0, 2 * Math.PI);
            ctx.fillStyle = type === 'sunny' ? '#ff9f43' : '#feca57'; // Orange yolk vs pale yellow

            // Yolk shadow to make it pop
            ctx.shadowColor = 'rgba(0,0,0,0.1)';
            ctx.shadowBlur = 3;
            ctx.shadowOffsetY = 1;
            ctx.fill();

            // Shine for sunny up
            if (type === 'sunny') {
                ctx.shadowColor = 'transparent'; // no shadow for shine
                ctx.beginPath();
                ctx.arc(-8, -8, 5 + Math.random() * 3, 0, 2 * Math.PI);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.fill();

                // Small secondary shine
                ctx.beginPath();
                ctx.arc(-2, -12, 2, 0, 2 * Math.PI);
                ctx.fill();
            }
            ctx.restore();
        } else if (type === 'scramble') {
            // Draws overlapping yellow blobs to look like scrambled eggs
            for (let i = 0; i < 6; i++) {
                const offsetX = (Math.random() * 50 - 25);
                const offsetY = (Math.random() * 50 - 25);
                const rx = 15 + Math.random() * 15;
                const ry = 10 + Math.random() * 10;
                const rot = Math.random() * Math.PI;

                ctx.save();
                ctx.translate(x + offsetX, y + offsetY);
                ctx.rotate(rot);
                ctx.beginPath();
                ctx.ellipse(0, 0, rx, ry, 0, 0, 2 * Math.PI);
                ctx.fillStyle = '#feca57'; // soft yellow
                ctx.shadowColor = 'rgba(0,0,0,0.1)';
                ctx.shadowBlur = 3;
                ctx.shadowOffsetX = 1;
                ctx.fill();

                ctx.strokeStyle = '#ff9f43'; // darker yellow/orange line for depth
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.restore();
            }
        }
    }

    function drawPowder(x, y) {
        for (let i = 0; i < 4; i++) {
            const px = x + (Math.random() * 50 - 25);
            const py = y + (Math.random() * 50 - 25);
            ctx.beginPath();

            let size = 1.5;
            if (currentColor === '#ffffff') size = 1 + Math.random() * 1; // Salt is fine
            else if (currentColor === '#2d3436') size = 1 + Math.random() * 1.5; // Pepper
            else size = 2 + Math.random() * 2; // Parsley is a bit chunkier

            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fillStyle = currentColor;
            ctx.fill();
        }
    }

    function drawSauceLine(x1, y1, x2, y2) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = currentSize;
        ctx.strokeStyle = currentColor;
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.stroke();
    }

    function drawSauceSpot(x, y) {
        ctx.beginPath();
        ctx.arc(x, y, currentSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = currentColor;
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fill();
    }

    function drawTopping(x, y, emoji) {
        ctx.font = "40px 'Jua', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        ctx.save();
        ctx.translate(x, y);
        // Subtle random rotation for dynamic look
        ctx.rotate((Math.random() - 0.5) * 0.4);
        ctx.fillText(emoji, 0, 0);
        ctx.restore();
    }

    // Action buttons
    clearBtn.addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        playPop();
    });

    saveBtn.addEventListener('click', () => {
        // Create an export canvas with the pan background so it looks good when saved
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tCtx = tempCanvas.getContext('2d');

        // Draw pan base
        tCtx.beginPath();
        tCtx.arc(tempCanvas.width / 2, tempCanvas.height / 2, tempCanvas.width / 2, 0, Math.PI * 2);
        const grad = tCtx.createRadialGradient(250, 250, 0, 250, 250, 250);
        grad.addColorStop(0, '#57606f');
        grad.addColorStop(1, '#2f3542');
        tCtx.fillStyle = grad;
        tCtx.fill();

        // Draw the user artwork over it
        tCtx.drawImage(canvas, 0, 0);

        const dataURL = tempCanvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = 'my-fried-egg.png';
        a.click();
    });

    // Audio handlers
    function playPop() {
        if (popSfx) {
            popSfx.currentTime = 0;
            popSfx.volume = 0.4;
            popSfx.play().catch(e => console.log('Audio error:', e));
        }
    }

    function playSizzle() {
        if (sizzleSfx) {
            sizzleSfx.volume = 0.2; // Keep sizzle subtle
            if (sizzleSfx.paused) {
                sizzleSfx.play().catch(e => console.log('Audio error:', e));
            }
        }
    }

    function pauseSizzle() {
        if (sizzleSfx && !sizzleSfx.paused) {
            sizzleSfx.pause();
        }
    }
});
