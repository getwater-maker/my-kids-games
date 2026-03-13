/* js/main.js - Block Puzzle Game Logic */

const GRID_SIZE = 10;
const grid = [];
const gridContainer = document.getElementById('main-grid-container');
const slots = [
    document.getElementById('slot-0'),
    document.getElementById('slot-1'),
    document.getElementById('slot-2')
];

let score = 0;
let bestScore = localStorage.getItem('block_puzzle_best') || 0;
let currentShapes = [null, null, null];
let activeDrag = null;

// Shape Definitions (x, y offsets)
const SHAPES = [
    { name: '1x1', coords: [[0, 0]], color: '#eb4d4b' },
    { name: '2x2', coords: [[0, 0], [1, 0], [0, 1], [1, 1]], color: '#f0932b' },
    { name: '3x3', coords: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]], color: '#f1c40f' },
    { name: '1x2', coords: [[0, 0], [0, 1]], color: '#00cec9' },
    { name: '1x3', coords: [[0, 0], [0, 1], [0, 2]], color: '#00cec9' },
    { name: '1x4', coords: [[0, 0], [0, 1], [0, 2], [0, 3]], color: '#2ecc71' },
    { name: '1x5', coords: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], color: '#2ecc71' },
    { name: '2x1', coords: [[0, 0], [1, 0]], color: '#00d2ff' },
    { name: '3x1', coords: [[0, 0], [1, 0], [2, 0]], color: '#00d2ff' },
    { name: '4x1', coords: [[0, 0], [1, 0], [2, 0], [3, 0]], color: '#9d50bb' },
    { name: '5x1', coords: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], color: '#9d50bb' },
    { name: 'L', coords: [[0, 0], [0, 1], [0, 2], [1, 2]], color: '#686de0' },
    { name: 'J', coords: [[1, 0], [1, 1], [1, 2], [0, 2]], color: '#4834d4' },
    { name: 'T', coords: [[0, 0], [1, 0], [2, 0], [1, 1]], color: '#be2edd' },
    { name: 'S', coords: [[1, 0], [2, 0], [0, 1], [1, 1]], color: '#eb4d4b' },
    { name: 'Z', coords: [[0, 0], [1, 0], [1, 1], [2, 1]], color: '#f0932b' }
];

function init() {
    createGrid();
    updateScoreUI();
    generateNewSet();
    setupGlobalEvents();
}

function createGrid() {
    gridContainer.innerHTML = '';
    for (let y = 0; y < GRID_SIZE; y++) {
        grid[y] = [];
        for (let x = 0; x < GRID_SIZE; x++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.x = x;
            cell.dataset.y = y;
            gridContainer.appendChild(cell);
            grid[y][x] = { element: cell, filled: false, color: null };
        }
    }
}

function generateNewSet() {
    slots.forEach((slot, index) => {
        const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        currentShapes[index] = shape;
        renderShapeInSlot(slot, shape, index);
    });
}

function renderShapeInSlot(slot, shape, index) {
    slot.innerHTML = '';
    if (!shape) return;

    const container = document.createElement('div');
    container.className = 'shape-container';
    container.style.gridTemplateColumns = `repeat(${getMaxX(shape.coords) + 1}, 40px)`;

    shape.coords.forEach(coord => {
        const block = document.createElement('div');
        block.className = 'block';
        block.style.backgroundColor = shape.color;
        block.style.gridColumnStart = coord[0] + 1;
        block.style.gridRowStart = coord[1] + 1;
        container.appendChild(block);
    });

    slot.appendChild(container);
    slot.draggable = true;

    slot.onmousedown = (e) => startDrag(e, shape, index);
}

function getMaxX(coords) {
    return Math.max(...coords.map(c => c[0]));
}

function setupGlobalEvents() {
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', stopDrag);
    document.getElementById('restart-btn').onclick = () => location.reload();
}

function startDrag(e, shape, index) {
    if (!shape) return;

    activeDrag = {
        shape: shape,
        slotIndex: index,
        element: slots[index].querySelector('.shape-container').cloneNode(true),
        offsetX: 20, // Center relative to mouse
        offsetY: 20
    };

    activeDrag.element.className = 'shape-container dragging';
    activeDrag.element.style.position = 'fixed';
    activeDrag.element.style.pointerEvents = 'none';
    activeDrag.element.style.transform = 'scale(0.8)';
    activeDrag.element.style.left = (e.clientX - activeDrag.offsetX) + 'px';
    activeDrag.element.style.top = (e.clientY - activeDrag.offsetY) + 'px';

    document.body.appendChild(activeDrag.element);
    slots[index].style.opacity = '0.3';
}

function handleDrag(e) {
    if (!activeDrag) return;

    activeDrag.element.style.left = (e.clientX - activeDrag.offsetX) + 'px';
    activeDrag.element.style.top = (e.clientY - 60) + 'px'; // Offset upward so block is visible above finger/cursor

    // Find cell under mouse
    clearHighlights();
    const cell = getCellAt(e.clientX, e.clientY);
    if (cell) {
        highlightPlacement(cell.x, cell.y);
    }
}

function stopDrag(e) {
    if (!activeDrag) return;

    const cell = getCellAt(e.clientX, e.clientY);
    let placed = false;

    if (cell && canPlace(activeDrag.shape, cell.x, cell.y)) {
        placeShape(activeDrag.shape, cell.x, cell.y);
        placed = true;

        // Remove from slot
        slots[activeDrag.slotIndex].innerHTML = '';
        slots[activeDrag.slotIndex].draggable = false;
        slots[activeDrag.slotIndex].style.opacity = '1';
        currentShapes[activeDrag.slotIndex] = null;

        checkLines();

        // If all slots empty, generate new set
        if (currentShapes.every(s => s === null)) {
            generateNewSet();
        }

        if (!anyPlacementPossible()) {
            gameOver();
        }
    } else {
        slots[activeDrag.slotIndex].style.opacity = '1';
    }

    activeDrag.element.remove();
    activeDrag = null;
    clearHighlights();
}

function getCellAt(x, y) {
    const cells = document.elementsFromPoint(x, y);
    const cellElement = cells.find(el => el.classList.contains('grid-cell'));
    if (cellElement) {
        return {
            x: parseInt(cellElement.dataset.x),
            y: parseInt(cellElement.dataset.y)
        };
    }
    return null;
}

function canPlace(shape, targetX, targetY) {
    return shape.coords.every(coord => {
        const x = targetX + coord[0];
        const y = targetY + coord[1];
        return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE && !grid[y][x].filled;
    });
}

function placeShape(shape, targetX, targetY) {
    shape.coords.forEach(coord => {
        const x = targetX + coord[0];
        const y = targetY + coord[1];
        grid[y][x].filled = true;
        grid[y][x].color = shape.color;
        grid[y][x].element.style.backgroundColor = shape.color;
        grid[y][x].element.style.boxShadow = 'inset -2px -2px 5px rgba(0,0,0,0.4), inset 2px 2px 5px rgba(255,255,255,0.2)';
    });
    score += shape.coords.length;
    updateScoreUI();
}

function highlightPlacement(targetX, targetY) {
    if (!activeDrag) return;
    const can = canPlace(activeDrag.shape, targetX, targetY);

    activeDrag.shape.coords.forEach(coord => {
        const x = targetX + coord[0];
        const y = targetY + coord[1];
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
            grid[y][x].element.classList.add('highlight');
            if (!can) grid[y][x].element.style.backgroundColor = 'rgba(255,0,0,0.2)';
        }
    });
}

function clearHighlights() {
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            grid[y][x].element.classList.remove('highlight');
            grid[y][x].element.style.backgroundColor = grid[y][x].filled ? grid[y][x].color : '';
        }
    }
}

function checkLines() {
    let rowsToClear = [];
    let colsToClear = [];

    // Check rows
    for (let y = 0; y < GRID_SIZE; y++) {
        if (grid[y].every(cell => cell.filled)) rowsToClear.push(y);
    }

    // Check columns
    for (let x = 0; x < GRID_SIZE; x++) {
        let full = true;
        for (let y = 0; y < GRID_SIZE; y++) {
            if (!grid[y][x].filled) {
                full = false;
                break;
            }
        }
        if (full) colsToClear.push(x);
    }

    // Clear and Score
    if (rowsToClear.length > 0 || colsToClear.length > 0) {
        rowsToClear.forEach(y => {
            for (let x = 0; x < GRID_SIZE; x++) clearCell(x, y);
        });
        colsToClear.forEach(x => {
            for (let y = 0; y < GRID_SIZE; y++) clearCell(x, y);
        });

        const count = rowsToClear.length + colsToClear.length;
        score += count * 10; // Bonus for lines
        updateScoreUI();
    }
}

function clearCell(x, y) {
    grid[y][x].filled = false;
    grid[y][x].color = null;
    grid[y][x].element.style.backgroundColor = '';
    grid[y][x].element.style.boxShadow = '';
}

function anyPlacementPossible() {
    return currentShapes.some(shape => {
        if (!shape) return false;
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                if (canPlace(shape, x, y)) return true;
            }
        }
        return false;
    });
}

function updateScoreUI() {
    document.getElementById('current-score').textContent = score;
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('block_puzzle_best', bestScore);
    }
    document.getElementById('best-score').textContent = bestScore;
}

function gameOver() {
    document.getElementById('game-over-overlay').classList.remove('hidden');
    document.getElementById('final-score-val').textContent = score;
}

init();
