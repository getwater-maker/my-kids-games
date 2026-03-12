const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextContext = nextCanvas.getContext('2d');

context.scale(30, 30);
nextContext.scale(25, 25);

const colors = [
    null,
    '#00f2fe', '#f093fb', '#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1', '#ff9f43',
    '#a29bfe', '#fab1a0', '#55efc4', '#81ecec', '#74b9ff', '#ffeaa7', '#fd79a8'
];

function createPiece(type) {
    // Classic 7
    if (type === 'T') return [[0, 1, 0], [1, 1, 1], [0, 0, 0]];
    if (type === 'O') return [[2, 2], [2, 2]];
    if (type === 'L') return [[0, 0, 3], [3, 3, 3], [0, 0, 0]];
    if (type === 'J') return [[4, 0, 0], [4, 4, 4], [0, 0, 0]];
    if (type === 'I') return [[0, 5, 0, 0], [0, 5, 0, 0], [0, 5, 0, 0], [0, 5, 0, 0]];
    if (type === 'S') return [[0, 6, 6], [6, 6, 0], [0, 0, 0]];
    if (type === 'Z') return [[7, 7, 0], [0, 7, 7], [0, 0, 0]];

    // Pentominoes (Diverse/Larger)
    if (type === 'P') return [[8, 8, 0], [8, 8, 0], [8, 0, 0]];
    if (type === 'U') return [[9, 0, 9], [9, 9, 9], [0, 0, 0]];
    if (type === 'X') return [[0, 10, 0], [10, 10, 10], [0, 10, 0]];
    if (type === 'V') return [[11, 0, 0], [11, 0, 0], [11, 11, 11]];
    if (type === 'W') return [[12, 0, 0], [12, 12, 0], [0, 12, 12]];
    if (type === 'Y') return [[0, 0, 0, 0], [13, 13, 13, 13], [0, 0, 13, 0], [0, 0, 0, 0]];
    if (type === 'F') return [[0, 14, 14], [14, 14, 0], [0, 14, 0]];
}

function createMatrix(w, h) {
    const matrix = [];
    while (h--) matrix.push(new Array(w).fill(0));
    return matrix;
}

function draw() {
    context.fillStyle = '#0f172a';
    context.fillRect(0, 0, canvas.width, canvas.height);
    drawMatrix(arena, { x: 0, y: 0 });
    if (player.matrix) {
        drawGhost();
        drawMatrix(player.matrix, player.pos);
    }
}

function drawGhost() {
    const ghost = { pos: { x: player.pos.x, y: player.pos.y }, matrix: player.matrix };
    while (!collide(arena, ghost)) ghost.pos.y++;
    ghost.pos.y--;
    context.globalAlpha = 0.15;
    drawMatrix(ghost.matrix, ghost.pos);
    context.globalAlpha = 1.0;
}

function drawMatrix(matrix, offset) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                context.fillStyle = colors[value];
                const px = x + offset.x;
                const py = y + offset.y;
                context.beginPath();
                if (context.roundRect) context.roundRect(px + 0.05, py + 0.05, 0.9, 0.9, 0.1);
                else context.rect(px + 0.05, py + 0.05, 0.9, 0.9);
                context.fill();
            }
        });
    });
}

function drawNext() {
    nextContext.fillStyle = '#1e293b';
    nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (!nextPiece) return;
    const ms = nextPiece.matrix;
    const ox = (nextCanvas.width / 50) - (ms[0].length / 2);
    const oy = (nextCanvas.height / 50) - (ms.length / 2);
    ms.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                nextContext.fillStyle = colors[value];
                nextContext.beginPath();
                if (nextContext.roundRect) nextContext.roundRect(x + ox, y + oy, 0.9, 0.9, 0.1);
                else nextContext.rect(x + ox, y + oy, 0.9, 0.9);
                nextContext.fill();
            }
        });
    });
}

function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) return true;
        }
    }
    return false;
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) arena[y + player.pos.y][x + player.pos.x] = value;
        });
    });
}

function arenaSweep() {
    let rowCount = 0;
    outer: for (let y = arena.length - 1; y > 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) continue outer;
        }
        arena.splice(y, 1);
        arena.unshift(new Array(12).fill(0));
        ++y;
        rowCount++;
    }

    if (rowCount > 0) {
        player.combo++;
        let bonus = rowCount * 10 * player.level;
        if (player.combo >= 1) {
            bonus *= player.combo;
            showCombo(player.combo);
            screenShake();
        }
        player.score += bonus;
        player.lines += rowCount;

        if (player.lines >= player.level * 10) {
            player.level++;
            dropInterval *= 0.9;
        }
    } else {
        player.combo = 0;
    }
    updateScore();
}

function screenShake() {
    const container = document.getElementById('canvas-container');
    container.classList.remove('shake');
    void container.offsetWidth; // Trigger reflow
    container.classList.add('shake');
    setTimeout(() => container.classList.remove('shake'), 300);
}

function showCombo(count) {
    const display = document.getElementById('combo-display');
    display.innerText = `COMBO X${count}`;
    display.classList.remove('hidden');

    // Reset animation
    display.style.animation = 'none';
    void display.offsetWidth; // Trigger reflow
    display.style.animation = null;

    clearTimeout(display.timer);
    display.timer = setTimeout(() => {
        display.classList.add('hidden');
    }, 500);
}


function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
    if (dir > 0) matrix.forEach(row => row.reverse());
    else matrix.reverse();
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
    }
    dropCounter = 0;
}

function playerHardDrop() {
    while (!collide(arena, player)) {
        player.pos.y++;
    }
    player.pos.y--;
    merge(arena, player);
    playerReset();
    arenaSweep();
    dropCounter = 0;
    draw();
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) player.pos.x -= dir;
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

function playerReset() {
    const pieces = 'ILJOTSZPUXVWYF';
    if (!nextPiece) player.matrix = createPiece(pieces[pieces.length * Math.random() | 0]);
    else player.matrix = nextPiece.matrix;
    nextPiece = { matrix: createPiece(pieces[pieces.length * Math.random() | 0]) };
    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);
    if (collide(arena, player)) {
        arena.forEach(row => row.fill(0));
        const finalScore = player.score;
        player.score = 0;
        updateScore();
        alert('GAME OVER! Score: ' + finalScore);
        isPaused = true;
        document.getElementById('start-btn').innerText = 'START GAME';
    }
    drawNext();
}

function updateScore() {
    document.getElementById('score').innerText = player.score;
    document.getElementById('level').innerText = player.level;
    document.getElementById('lines').innerText = player.lines;
}

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let isPaused = true;

function update(time = 0) {
    if (isPaused) return;
    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) playerDrop();
    draw();
    requestAnimationFrame(update);
}

const arena = createMatrix(12, 24);
const player = { pos: { x: 0, y: 0 }, matrix: null, score: 0, level: 1, lines: 0, combo: 0 };
let nextPiece = null;


document.getElementById('start-btn').addEventListener('click', () => {
    if (isPaused) {
        isPaused = false;
        if (player.matrix === null) playerReset();
        lastTime = performance.now();
        update();
        document.getElementById('start-btn').innerText = 'PAUSE';
    } else {
        isPaused = true;
        document.getElementById('start-btn').innerText = 'RESUME';
    }
});

document.addEventListener('keydown', event => {
    if (isPaused) return;
    if (event.keyCode === 37) playerMove(-1);
    else if (event.keyCode === 39) playerMove(1);
    else if (event.keyCode === 40) playerDrop();
    else if (event.keyCode === 38) playerRotate(1);
    else if (event.keyCode === 32) {
        event.preventDefault();
        playerHardDrop();
    }
});

// Mobile button listeners
document.getElementById('ctrl-left').addEventListener('click', () => !isPaused && playerMove(-1));
document.getElementById('ctrl-right').addEventListener('click', () => !isPaused && playerMove(1));
document.getElementById('ctrl-rotate').addEventListener('click', () => !isPaused && playerRotate(1));
document.getElementById('ctrl-drop').addEventListener('click', () => !isPaused && playerDrop());

draw();
updateScore();
console.log('Tetris Loaded');
