// ============================================================
// Omok (Gomoku) Controller
// ============================================================
import { ref, update, onValue, db } from './firebase-config.js';
import { omokState, resetState, OMOK_SIZE } from './omok/state.js';
import { checkWin, isForbidden } from './omok/rules.js';
import { getAiMove } from './omok/ai.js';
import { renderBoard, updateStatus } from './omok/ui.js';

let omokRoomId = 'omok_room_default';
let myOmokColor = 'b'; // Default: black (first player)
let omokAiColor = 'w'; // AI's color (opposite of player)

// Initialize Game
export function initOmokGame(mode, level = 1) {
    resetState(mode, level);
    omokState.myColor = myOmokColor;
    omokAiColor = myOmokColor === 'b' ? 'w' : 'b';
    renderBoard();
    updateStatus();

    if (mode === 'pvp') {
        initOmokMultiplayer();
        sendOmokUpdate();
    }

    // If AI mode and player chose white (AI is black = first), AI moves first
    if (mode === 'ai' && omokAiColor === 'b') {
        setTimeout(() => {
            const aiMove = getAiMove();
            if (aiMove) makeMove(aiMove.r, aiMove.c);
        }, 500);
    }
}

// Handle User Move
export function handleOmokClick(r, c) {
    if (omokState.gameOver) return;
    if (omokState.board[r][c]) return; // Occupied

    // AI Check: only allow player's color
    if (omokState.mode === 'ai' && omokState.turn !== myOmokColor) return;

    // PvP: only allow your own color
    if (omokState.mode === 'pvp' && omokState.turn !== myOmokColor) return;

    // Rule Check (Forbidden Moves for Black)
    if (omokState.turn === 'b' && isForbidden(r, c, 'b')) {
        alert("🚨 금수입니다! (3-3 또는 6목)");
        return;
    }

    makeMove(r, c);

    if (omokState.mode === 'ai' && !omokState.gameOver) {
        setTimeout(() => {
            const aiMove = getAiMove();
            if (aiMove) makeMove(aiMove.r, aiMove.c);
        }, 500);
    }
}

function makeMove(r, c) {
    if (omokState.board[r][c]) return;

    omokState.board[r][c] = omokState.turn;
    omokState.lastMove = { r, c };

    if (checkWin(r, c, omokState.turn)) {
        omokState.gameOver = true;
        omokState.winner = omokState.turn;
    } else {
        omokState.turn = omokState.turn === 'b' ? 'w' : 'b';
    }

    renderBoard();
    updateStatus();

    if (omokState.mode === 'pvp') {
        sendOmokUpdate();
    }
}

// Multiplayer Logic
function initOmokMultiplayer() {
    const gameRef = ref(db, `omok/${omokRoomId}`);
    onValue(gameRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Validate and Normalize (handle sparse arrays from Firebase)
            const rawBoard = data.board || [];
            const newBoard = [];

            // Reconstruct full 15x15 board
            for (let r = 0; r < OMOK_SIZE; r++) {
                const newRow = [];
                const rawRow = rawBoard[r] || [];
                for (let c = 0; c < OMOK_SIZE; c++) {
                    newRow.push(rawRow[c] || null);
                }
                newBoard.push(newRow);
            }

            if (JSON.stringify(omokState.board) !== JSON.stringify(newBoard) || omokState.turn !== data.turn) {
                omokState.board = newBoard;
                omokState.turn = data.turn || 'b';
                omokState.gameOver = data.gameOver;
                omokState.winner = data.winner;
                omokState.lastMove = data.lastMove;
                renderBoard();
                updateStatus();
            }
        }
    });
}

function sendOmokUpdate() {
    const gameRef = ref(db, `omok/${omokRoomId}`);
    update(gameRef, {
        board: omokState.board,
        turn: omokState.turn,
        gameOver: omokState.gameOver,
        winner: omokState.winner,
        lastMove: omokState.lastMove,
        timestamp: Date.now()
    });
}

// Exports for Main UI
window.startOmokGame = (mode, level) => initOmokGame(mode, level);

window.showOmokPvpStep = function () {
    document.getElementById('omok-mode-step').classList.add('hidden');
    document.getElementById('omok-pvp-step').classList.remove('hidden');
};

window.selectOmokColor = function (color) {
    myOmokColor = color;
    document.getElementById('omok-color-b').classList.toggle('selected', color === 'b');
    document.getElementById('omok-color-w').classList.toggle('selected', color === 'w');
};

window.selectOmokAiColor = function (color) {
    myOmokColor = color;
    document.getElementById('omok-ai-color-b').classList.toggle('selected', color === 'b');
    document.getElementById('omok-ai-color-w').classList.toggle('selected', color === 'w');
};

window.startOmokAi = function (level) {
    initOmokGame('ai', level);
    window.showOmokBoard();
};

window.joinOmokRoom = function () {
    const code = document.getElementById('omok-room-code').value.trim();
    if (!code) {
        alert('방 코드를 입력하세요!');
        return;
    }
    omokRoomId = 'omok_room_' + code;
    document.getElementById('omok-pvp-step').classList.add('hidden');
    initOmokGame('pvp');
    window.showOmokBoard();
};

export function restartOmok() {
    if (omokState.mode === 'pvp') {
        // Force reset for PvP
        resetState('pvp', omokState.level);
        renderBoard();
        updateStatus();
        sendOmokUpdate(); // Push empty state to Firebase
    } else {
        initOmokGame('ai', omokState.level);
    }
}
window.restartOmok = restartOmok;

window.handleOmokClick = handleOmokClick;

export function backToStartFromOmok() {
    resetState('ai', 1);
    const boardEl = document.getElementById('omok-board');
    if (boardEl) boardEl.innerHTML = '';

    document.getElementById('omok-game-area').classList.add('hidden');
    document.getElementById('omok-game-area').classList.remove('active');
    document.getElementById('omok-screen').classList.add('hidden');
    document.getElementById('omok-screen').classList.remove('active');
    document.getElementById('omok-level-screen').classList.add('hidden');

    document.getElementById('start-screen').classList.remove('hidden');
    document.getElementById('start-screen').classList.add('active');
}
window.backToStartFromOmok = backToStartFromOmok;

// Reset level selection UI visibility logic
const levelScreen = document.getElementById('omok-level-screen');
if (levelScreen) levelScreen.classList.add('hidden');
// Ensure hidden by default

// ============================================================
// Omok Screen Transitions
// ============================================================
window.showOmokScreen = function () {
    document.getElementById('start-screen').classList.remove('active');
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('omok-screen').classList.remove('hidden');
    document.getElementById('omok-screen').classList.add('active');
}

window.showOmokLevelSelect = function () {
    document.getElementById('omok-screen').classList.add('hidden');
    document.getElementById('omok-level-screen').classList.remove('hidden');
}

window.backToOmokMode = function () {
    document.getElementById('omok-level-screen').classList.add('hidden');
    document.getElementById('omok-screen').classList.remove('hidden');
}

window.showOmokBoard = function () {
    document.getElementById('omok-screen').classList.add('hidden');
    document.getElementById('omok-level-screen').classList.add('hidden');
    document.getElementById('omok-game-area').classList.remove('hidden');
    document.getElementById('omok-game-area').classList.add('active');
}


