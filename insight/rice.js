document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('riceCanvas');
    const ctx = canvas.getContext('2d');
    const toolBtns = document.querySelectorAll('.tool-btn');
    const cursorHint = document.getElementById('cursorHint');
    const clearBtn = document.getElementById('clearBtn');
    const saveBtn = document.getElementById('saveBtn');

    // SFX
    const scoopSfx = document.getElementById('sfx-scoop');
    const squishSfx = document.getElementById('sfx-squish');

    // State
    let currentTool = 'rice';
    let currentValue = 'white';
    let currentColor = '#3c2218';
    let currentSize = 10;

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
            if (currentTool === 'rice' || currentTool === 'topping') {
                currentValue = target.dataset.val;
            } else if (currentTool === 'sauce' || currentTool === 'powder') {
                currentColor = target.dataset.color;
                if (target.dataset.size) {
                    currentSize = parseInt(target.dataset.size);
                }
            }

            // Update cursor hint emoji
            let emoji = "🍚";
            if (currentTool === 'topping') {
                if (currentValue === '스팸') emoji = "🥓";
                else if (currentValue === '계란') emoji = "🍳";
                else if (currentValue === '김') emoji = "⬛";
                else if (currentValue === '참치') emoji = "🐟";
                else if (currentValue === '명란') emoji = "🐡";
                else if (currentValue === '김치') emoji = "🌶️";
            }
            else if (currentTool === 'powder') {
                if (currentColor === '#f5f6fa') emoji = "🧂"; // sesame
                else if (currentColor === '#2f3640') emoji = "🖤"; // black sesame
                else emoji = "🌿"; // green onion
            }
            else if (currentTool === 'sauce') {
                if (currentColor === '#3c2218') emoji = "🤎"; // soy
                else if (currentColor === '#e84118') emoji = "❤️"; // gochujang
                else emoji = "💛"; // sesame oil
            }
            else if (currentTool === 'rice') {
                if (currentValue === 'white') emoji = "🍚";
                else if (currentValue === 'black') emoji = "🍙";
                else emoji = "🌾";
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
    });

    // Drawing interaction
    canvas.addEventListener('mousedown', (e) => {
        isDrawing = true;
        const { x, y } = getMousePos(canvas, e);
        lastX = x;
        lastY = y;

        if (currentTool === 'rice') {
            drawRice(x, y, currentValue);
            playAudio(squishSfx);
        } else if (currentTool === 'topping') {
            drawTopping(x, y, cursorHint.innerText);
            playAudio(scoopSfx);
        } else if (currentTool === 'sauce') {
            drawSauceSpot(x, y);
            playAudio(squishSfx);
        } else if (currentTool === 'powder') {
            drawPowder(x, y);
            playAudio(scoopSfx);
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        const { x, y } = getMousePos(canvas, e);

        if (currentTool === 'rice') {
            // throttle rice drawing slightly
            if (Math.abs(x - lastX) > 20 || Math.abs(y - lastY) > 20) {
                drawRice(x, y, currentValue);
                lastX = x;
                lastY = y;
            }
        } else if (currentTool === 'sauce') {
            drawSauceLine(lastX, lastY, x, y);
            lastX = x;
            lastY = y;
        } else if (currentTool === 'powder') {
            if (Math.abs(x - lastX) > 10 || Math.abs(y - lastY) > 10) {
                drawPowder(x, y);
                lastX = x;
                lastY = y;
            }
        }
    });

    canvas.addEventListener('mouseup', () => {
        isDrawing = false;
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
    function drawRice(x, y, type) {
        let baseColor, shadowColor, grainColor;

        if (type === 'white') {
            baseColor = '#ffffff';
            shadowColor = '#f1f2f6';
            grainColor = 'rgba(0,0,0,0.03)';
        } else if (type === 'black') {
            baseColor = '#574b90'; // purple ish black rice
            shadowColor = '#303952';
            grainColor = 'rgba(255,255,255,0.1)';
        } else { // mixed
            baseColor = '#d1ccc0';
            shadowColor = '#a5b1c2';
            grainColor = '#8a6a43'; // brown spots
        }

        // Draw a blob of rice
        const radius = 40 + Math.random() * 15;
        ctx.beginPath();
        // create bumpy edge for grains
        for (let a = 0; a < Math.PI * 2; a += 0.3) {
            let r = radius + (Math.random() * 8 - 4);
            let px = x + Math.cos(a) * r;
            let py = y + Math.sin(a) * r;
            if (a === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();

        // Gradient for depth
        const grad = ctx.createRadialGradient(x - 10, y - 10, 5, x, y, radius);
        grad.addColorStop(0, baseColor);
        grad.addColorStop(1, shadowColor);

        ctx.fillStyle = grad;
        ctx.shadowColor = 'rgba(0,0,0,0.1)';
        ctx.shadowBlur = 5;
        ctx.fill();

        // Add individual grains detail
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = grainColor;
        for (let i = 0; i < 30; i++) {
            let gx = x + (Math.random() - 0.5) * radius * 1.5;
            let gy = y + (Math.random() - 0.5) * radius * 1.5;
            let a = Math.random() * Math.PI;
            ctx.save();
            ctx.translate(gx, gy);
            ctx.rotate(a);
            ctx.beginPath();
            ctx.ellipse(0, 0, 4, 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    function drawPowder(x, y) {
        for (let i = 0; i < 5; i++) {
            const px = x + (Math.random() * 40 - 20);
            const py = y + (Math.random() * 40 - 20);

            ctx.fillStyle = currentColor;
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(Math.random() * Math.PI);
            ctx.beginPath();

            if (currentColor === '#4cd137') { // green onion
                ctx.arc(0, 0, 3 + Math.random() * 2, 0, Math.PI * 2);
            } else { // sesame
                ctx.ellipse(0, 0, 2, 1, 0, 0, Math.PI * 2);
            }

            ctx.fill();
            ctx.restore();
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

        // sauce gloss
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = 2;
        ctx.stroke();

        // inner gloss for some sauces
        if (currentColor === '#e84118' || currentColor === '#e1b12c') {
            ctx.shadowColor = 'transparent';
            ctx.lineWidth = currentSize * 0.4;
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.stroke();
        }
    }

    function drawSauceSpot(x, y) {
        ctx.beginPath();
        ctx.arc(x, y, currentSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = currentColor;
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = 2;
        ctx.fill();

        if (currentColor === '#e84118' || currentColor === '#e1b12c') {
            ctx.shadowColor = 'transparent';
            ctx.beginPath();
            ctx.arc(x - 2, y - 2, currentSize / 4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fill();
        }
    }

    function drawTopping(x, y, emoji) {
        // Different sizings
        let fontSize = 40;
        if (emoji === '🍳' || emoji === '🥓') fontSize = 60; // larger toppings
        if (emoji === '⬛') fontSize = 50; // seaweed

        ctx.font = `${fontSize}px 'Jua', sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetY = 3;

        ctx.save();
        ctx.translate(x, y);
        // Random slight rotation
        ctx.rotate((Math.random() - 0.5) * 0.5);
        ctx.fillText(emoji, 0, 0);
        ctx.restore();
    }

    // Action buttons
    clearBtn.addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        playAudio(scoopSfx);
    });

    saveBtn.addEventListener('click', () => {
        // To save nicely with the bowl background
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = 500;
        exportCanvas.height = 500;
        const eCtx = exportCanvas.getContext('2d');

        // Draw back bowl
        eCtx.fillStyle = '#dcdde1';
        eCtx.beginPath();
        eCtx.ellipse(250, 210, 200, 90, 0, 0, 2 * Math.PI);
        eCtx.fill();

        // Draw the rice canvas
        eCtx.drawImage(canvas, 50, 40);

        // Draw front bowl
        eCtx.fillStyle = '#7f8fa6';
        eCtx.beginPath();
        // Semi circle lower half
        eCtx.arc(250, 250, 200, 0, Math.PI);
        eCtx.fill();
        eCtx.strokeStyle = '#2f3640';
        eCtx.lineWidth = 15;
        eCtx.stroke();

        const dataURL = exportCanvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = 'my-yummy-rice.png';
        a.click();
    });

    function playAudio(snd) {
        if (snd) {
            snd.currentTime = 0;
            snd.volume = 0.5;
            snd.play().catch(e => console.log('Audio error:', e));
        }
    }
});
