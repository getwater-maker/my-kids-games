document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('giftCanvas');
    const ctx = canvas.getContext('2d');
    const colorBtns = document.querySelectorAll('.color-btn');
    const stickerBtns = document.querySelectorAll('.sticker-btn');
    const cursorHint = document.getElementById('cursorHint');
    const clearBtn = document.getElementById('clearBtn');
    const saveBtn = document.getElementById('saveBtn');

    // SFX
    const sfxStick = document.getElementById('sfx-stick');
    const sfxPaper = document.getElementById('sfx-paper');

    // State
    let currentTool = 'box'; // box, ribbon, sticker, pen
    let currentColor = '#ff9ff3';
    let currentSticker = '🎀';
    let boxColor = '#ff9ff3';

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    // Store ribbons for drawing them cleanly over box but under stickers/pen
    // Since we draw everything incrementally to a single canvas, we must rely simply on painting order.
    // If they change box color, it clears everything. So better to just paint directly.

    function initCanvas() {
        ctx.fillStyle = boxColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add subtle box inner shadow/highlight simulation via gradient
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, "rgba(255,255,255,0.4)");
        grad.addColorStop(0.5, "rgba(255,255,255,0)");
        grad.addColorStop(1, "rgba(0,0,0,0.1)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    initCanvas();

    // Tool Selection
    function clearActiveButtons() {
        colorBtns.forEach(b => b.classList.remove('active'));
        stickerBtns.forEach(b => b.classList.remove('active'));
    }

    colorBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            clearActiveButtons();
            const target = e.currentTarget;
            target.classList.add('active');

            currentTool = target.dataset.type;
            currentColor = target.dataset.color;

            if (currentTool === 'box') {
                boxColor = currentColor;
                initCanvas(); // Changing box color resets the box
                if (sfxPaper) { sfxPaper.currentTime = 0; sfxPaper.volume = 0.5; sfxPaper.play().catch(e => e); }
                cursorHint.innerText = '';
            } else if (currentTool === 'ribbon') {
                cursorHint.innerText = '🎀';
            } else if (currentTool === 'pen') {
                cursorHint.innerText = '🖊️';
            }
        });
    });

    stickerBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            clearActiveButtons();
            const target = e.currentTarget;
            target.classList.add('active');

            currentTool = 'sticker';
            currentSticker = target.dataset.val;
            cursorHint.innerText = currentSticker;
        });
    });

    // Cursor tracking
    const previewArea = document.querySelector('.preview-area');
    previewArea.addEventListener('mousemove', (e) => {
        const rect = previewArea.getBoundingClientRect();
        cursorHint.style.left = (e.clientX - rect.left) + 'px';
        cursorHint.style.top = (e.clientY - rect.top) + 'px';
    });

    canvas.addEventListener('mouseenter', () => {
        if (currentTool !== 'box') cursorHint.style.display = 'block';
    });
    canvas.addEventListener('mouseleave', () => {
        cursorHint.style.display = 'none';
        isDrawing = false;
    });

    // Drawing interaction
    canvas.addEventListener('mousedown', (e) => {
        if (currentTool === 'box') return;

        isDrawing = true;
        const { x, y } = getMousePos(canvas, e);
        lastX = x;
        lastY = y;

        if (currentTool === 'sticker') {
            drawSticker(x, y, currentSticker);
            playAudio(sfxStick);
        } else if (currentTool === 'ribbon') {
            drawRibbonLine(x, y, x, y);
            playAudio(sfxPaper);
        } else if (currentTool === 'pen') {
            drawPen(lastX, lastY, x, y);
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        const { x, y } = getMousePos(canvas, e);

        if (currentTool === 'ribbon') {
            drawRibbonLine(lastX, lastY, x, y);
            lastX = x;
            lastY = y;
        } else if (currentTool === 'pen') {
            drawPen(lastX, lastY, x, y);
            lastX = x;
            lastY = y;
        }
    });

    canvas.addEventListener('mouseup', () => {
        isDrawing = false;
    });

    function getMousePos(c, evt) {
        let cx = evt.clientX;
        let cy = evt.clientY;
        if (evt.touches) {
            cx = evt.touches[0].clientX;
            cy = evt.touches[0].clientY;
        }
        const rect = c.getBoundingClientRect();
        const scaleX = c.width / rect.width;
        const scaleY = c.height / rect.height;
        return {
            x: (cx - rect.left) * scaleX,
            y: (cy - rect.top) * scaleY
        };
    }

    /* Drawing Functions */
    function drawRibbonLine(x1, y1, x2, y2) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';
        ctx.lineWidth = 40; // thick ribbon
        ctx.strokeStyle = currentColor;

        // Ribbon drop shadow
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.stroke();

        // Ribbon highlight/texture
        ctx.shadowColor = 'transparent';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineWidth = 6;
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.stroke();

        // Center fold line
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.stroke();
    }

    function drawPen(x1, y1, x2, y2) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 8;
        ctx.strokeStyle = currentColor;

        ctx.shadowColor = 'transparent'; // No shadow for marker
        ctx.stroke();
    }

    function drawSticker(x, y, emoji) {
        ctx.font = "60px 'Jua', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Sticker subtle drop shadow
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 4;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((Math.random() - 0.5) * 0.4);
        ctx.fillText(emoji, 0, 0);
        ctx.restore();
    }

    // Action buttons
    clearBtn.addEventListener('click', () => {
        initCanvas();
        playAudio(sfxPaper);
    });

    saveBtn.addEventListener('click', () => {
        const dataURL = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = 'my-pretty-giftbox.png';
        a.click();
    });

    function playAudio(snd) {
        if (snd) {
            snd.currentTime = 0;
            snd.volume = 0.5;
            snd.play().catch(e => console.log('Audio error:', e));
        }
    }

    // Mobile support
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (currentTool !== 'box') {
            isDrawing = true;
            const { x, y } = getMousePos(canvas, e);
            lastX = x; lastY = y;
            if (currentTool === 'sticker') { drawSticker(x, y, currentSticker); playAudio(sfxStick); }
            else if (currentTool === 'ribbon') { drawRibbonLine(lastX, lastY, x, y); playAudio(sfxPaper); }
            else if (currentTool === 'pen') { drawPen(lastX, lastY, x, y); }
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!isDrawing) return;
        const { x, y } = getMousePos(canvas, e);
        if (currentTool === 'ribbon') { drawRibbonLine(lastX, lastY, x, y); lastX = x; lastY = y; }
        else if (currentTool === 'pen') { drawPen(lastX, lastY, x, y); lastX = x; lastY = y; }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => { e.preventDefault(); isDrawing = false; });
});
