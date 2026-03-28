
// ============================================================
// Chess Game - Elementary Level (AI + PvP)
// ============================================================
import { ref, set, onValue, update, db } from './firebase-config.js';


// Chess piece symbols - clean Unicode with CSS styling
const PIECE_CHARS = {
    w: { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
};

function getPieceChar(pieceChar) {
    if (!pieceChar) return '';
    const color = pieceChar === pieceChar.toUpperCase() ? 'w' : 'b';
    return PIECE_CHARS[color][pieceChar] || '';
}

// Piece values for AI evaluation
const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

// Initial board: row 0 = black back rank (top), row 7 = white back rank (bottom)
const INITIAL_BOARD = [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
];

// ============================================================
// Game State
// ============================================================
let chess = {
    board: [],
    turn: 'w',
    mode: 'ai',            // 'ai' or 'pvp'
    aiLevel: 1,             // 1, 2, 3
    selectedSquare: null,
    validMoves: [],
    lastMove: null,
    capturedWhite: [],
    capturedBlack: [],
    moveHistory: [],
    gameOver: false,
    isThinking: false
};

// ============================================================
// Helpers
// ============================================================
function isWhitePiece(p) { return p !== null && p === p.toUpperCase(); }
function isBlackPiece(p) { return p !== null && p === p.toLowerCase(); }
function isOwn(p, color) { return color === 'w' ? isWhitePiece(p) : isBlackPiece(p); }
function isEnemy(p, color) { return p !== null && !isOwn(p, color); }
function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
function copyBoard(board) { return board.map(row => [...row]); }

// ============================================================
// Move Generation (pseudo-legal)
// ============================================================
function generateMoves(board, color) {
    const moves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (!piece || !isOwn(piece, color)) continue;
            const type = piece.toLowerCase();
            const from = { row: r, col: c };

            if (type === 'p') {
                const dir = color === 'w' ? -1 : 1;
                const startRow = color === 'w' ? 6 : 1;
                if (inBounds(r + dir, c) && !board[r + dir][c]) {
                    moves.push({ from, to: { row: r + dir, col: c } });
                    if (r === startRow && !board[r + 2 * dir][c]) {
                        moves.push({ from, to: { row: r + 2 * dir, col: c } });
                    }
                }
                for (const dc of [-1, 1]) {
                    const nr = r + dir, nc = c + dc;
                    if (inBounds(nr, nc) && board[nr][nc] && isEnemy(board[nr][nc], color)) {
                        moves.push({ from, to: { row: nr, col: nc } });
                    }
                }
            } else if (type === 'n') {
                const jumps = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
                for (const [dr, dc] of jumps) {
                    const nr = r + dr, nc = c + dc;
                    if (inBounds(nr, nc) && !isOwn(board[nr][nc], color)) {
                        moves.push({ from, to: { row: nr, col: nc } });
                    }
                }
            } else if (type === 'b') {
                for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
                    slideMoves(board, color, from, dr, dc, moves);
                }
            } else if (type === 'r') {
                for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
                    slideMoves(board, color, from, dr, dc, moves);
                }
            } else if (type === 'q') {
                for (const [dr, dc] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) {
                    slideMoves(board, color, from, dr, dc, moves);
                }
            } else if (type === 'k') {
                for (const [dr, dc] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) {
                    const nr = r + dr, nc = c + dc;
                    if (inBounds(nr, nc) && !isOwn(board[nr][nc], color)) {
                        moves.push({ from, to: { row: nr, col: nc } });
                    }
                }
            }
        }
    }
    return moves;
}

function slideMoves(board, color, from, dr, dc, moves) {
    let r = from.row + dr, c = from.col + dc;
    while (inBounds(r, c)) {
        if (board[r][c]) {
            if (isEnemy(board[r][c], color)) {
                moves.push({ from, to: { row: r, col: c } });
            }
            break;
        }
        moves.push({ from, to: { row: r, col: c } });
        r += dr;
        c += dc;
    }
}

// ============================================================
// Check Detection
// ============================================================
function findKing(board, color) {
    const king = color === 'w' ? 'K' : 'k';
    for (let r = 0; r < 8; r++) {
        if (!board[r]) continue;
        for (let c = 0; c < 8; c++)
            if (board[r][c] === king) return { row: r, col: c };
    }
    return null;
}

function isKingInCheck(board, color) {
    const kingPos = findKing(board, color);
    if (!kingPos) return false;
    const enemy = color === 'w' ? 'b' : 'w';
    const enemyMoves = generateMoves(board, enemy);
    return enemyMoves.some(m => m.to.row === kingPos.row && m.to.col === kingPos.col);
}

// ============================================================
// Legal Move Generation
// ============================================================
function applyMoveToBoard(board, move) {
    const piece = board[move.from.row][move.from.col];
    board[move.to.row][move.to.col] = piece;
    board[move.from.row][move.from.col] = null;
    if (piece === 'P' && move.to.row === 0) board[move.to.row][move.to.col] = 'Q';
    if (piece === 'p' && move.to.row === 7) board[move.to.row][move.to.col] = 'q';
}

function generateLegalMoves(board, color) {
    const pseudo = generateMoves(board, color);
    return pseudo.filter(move => {
        const test = copyBoard(board);
        applyMoveToBoard(test, move);
        return !isKingInCheck(test, color);
    });
}

// ============================================================
// Game Status
// ============================================================
function getGameStatus(board, color) {
    const legal = generateLegalMoves(board, color);
    const inCheck = isKingInCheck(board, color);
    if (legal.length === 0) {
        return inCheck ? 'checkmate' : 'stalemate';
    }
    return inCheck ? 'check' : 'playing';
}

// ============================================================
// Move Execution
// ============================================================
function makeChessMove(from, to) {
    const piece = chess.board[from.row][from.col];
    const captured = chess.board[to.row][to.col];

    chess.moveHistory.push({
        from: { row: from.row, col: from.col },
        to: { row: to.row, col: to.col },
        piece, captured, promoted: false
    });

    if (captured) {
        if (isWhitePiece(captured)) chess.capturedWhite.push(captured);
        else chess.capturedBlack.push(captured);
    }

    chess.board[to.row][to.col] = piece;
    chess.board[from.row][from.col] = null;

    if (piece === 'P' && to.row === 0) {
        chess.board[to.row][to.col] = 'Q';
        chess.moveHistory[chess.moveHistory.length - 1].promoted = true;
    }
    if (piece === 'p' && to.row === 7) {
        chess.board[to.row][to.col] = 'q';
        chess.moveHistory[chess.moveHistory.length - 1].promoted = true;
    }

    chess.lastMove = { from, to };
    chess.turn = chess.turn === 'w' ? 'b' : 'w';
}

function undoSingleMove() {
    const move = chess.moveHistory.pop();
    if (!move) return;

    chess.board[move.from.row][move.from.col] = move.piece;
    chess.board[move.to.row][move.to.col] = move.captured;

    if (move.captured) {
        if (isWhitePiece(move.captured)) {
            const idx = chess.capturedWhite.lastIndexOf(move.captured);
            if (idx !== -1) chess.capturedWhite.splice(idx, 1);
        } else {
            const idx = chess.capturedBlack.lastIndexOf(move.captured);
            if (idx !== -1) chess.capturedBlack.splice(idx, 1);
        }
    }

    chess.turn = chess.turn === 'w' ? 'b' : 'w';
    chess.lastMove = chess.moveHistory.length > 0
        ? {
            from: chess.moveHistory[chess.moveHistory.length - 1].from,
            to: chess.moveHistory[chess.moveHistory.length - 1].to
        }
        : null;
}

// ============================================================
// AI
// ============================================================

// Piece-Square Tables (from black's perspective, row 0=black back rank)
const PST = {
    p: [
        [0,  0,  0,  0,  0,  0,  0,  0],
        [50, 50, 50, 50, 50, 50, 50, 50],
        [10, 10, 20, 30, 30, 20, 10, 10],
        [5,  5, 10, 25, 25, 10,  5,  5],
        [0,  0,  0, 20, 20,  0,  0,  0],
        [5, -5,-10,  0,  0,-10, -5,  5],
        [5, 10, 10,-20,-20, 10, 10,  5],
        [0,  0,  0,  0,  0,  0,  0,  0]
    ],
    n: [
        [-50,-40,-30,-30,-30,-30,-40,-50],
        [-40,-20,  0,  0,  0,  0,-20,-40],
        [-30,  0, 10, 15, 15, 10,  0,-30],
        [-30,  5, 15, 20, 20, 15,  5,-30],
        [-30,  0, 15, 20, 20, 15,  0,-30],
        [-30,  5, 10, 15, 15, 10,  5,-30],
        [-40,-20,  0,  5,  5,  0,-20,-40],
        [-50,-40,-30,-30,-30,-30,-40,-50]
    ],
    b: [
        [-20,-10,-10,-10,-10,-10,-10,-20],
        [-10,  0,  0,  0,  0,  0,  0,-10],
        [-10,  0, 10, 10, 10, 10,  0,-10],
        [-10,  5,  5, 10, 10,  5,  5,-10],
        [-10,  0, 10, 10, 10, 10,  0,-10],
        [-10, 10, 10, 10, 10, 10, 10,-10],
        [-10,  5,  0,  0,  0,  0,  5,-10],
        [-20,-10,-10,-10,-10,-10,-10,-20]
    ],
    r: [
        [0,  0,  0,  0,  0,  0,  0,  0],
        [5, 10, 10, 10, 10, 10, 10,  5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [0,  0,  0,  5,  5,  0,  0,  0]
    ],
    q: [
        [-20,-10,-10, -5, -5,-10,-10,-20],
        [-10,  0,  0,  0,  0,  0,  0,-10],
        [-10,  0,  5,  5,  5,  5,  0,-10],
        [-5,  0,  5,  5,  5,  5,  0, -5],
        [0,  0,  5,  5,  5,  5,  0, -5],
        [-10,  5,  5,  5,  5,  5,  0,-10],
        [-10,  0,  5,  0,  0,  0,  0,-10],
        [-20,-10,-10, -5, -5,-10,-10,-20]
    ],
    k: [
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-20,-30,-30,-40,-40,-30,-30,-20],
        [-10,-20,-20,-20,-20,-20,-20,-10],
        [20, 20,  0,  0,  0,  0, 20, 20],
        [20, 30, 10,  0,  0, 10, 30, 20]
    ]
};

function evaluateBoard(board) {
    let score = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (!piece) continue;
            const type = piece.toLowerCase();
            const val = PIECE_VALUES[type];
            const pst = PST[type];
            if (isBlackPiece(piece)) {
                score += val + pst[r][c];
            } else {
                // Mirror row for white (row 7 = white back rank)
                score -= val + pst[7 - r][c];
            }
        }
    }
    return score;
}

// Alpha-beta minimax (black = maximizing)
function alphaBeta(board, depth, alpha, beta, isMax) {
    if (depth === 0) return evaluateBoard(board);
    const side = isMax ? 'b' : 'w';
    const moves = generateLegalMoves(board, side);
    if (moves.length === 0) {
        // Checkmate or stalemate
        if (isKingInCheck(board, side)) {
            return isMax ? -99999 + (4 - depth) : 99999 - (4 - depth);
        }
        return 0; // Stalemate
    }
    if (isMax) {
        let best = -Infinity;
        for (const m of moves) {
            const nb = copyBoard(board);
            applyMoveToBoard(nb, m);
            best = Math.max(best, alphaBeta(nb, depth - 1, alpha, beta, false));
            alpha = Math.max(alpha, best);
            if (beta <= alpha) break;
        }
        return best;
    } else {
        let best = Infinity;
        for (const m of moves) {
            const nb = copyBoard(board);
            applyMoveToBoard(nb, m);
            best = Math.min(best, alphaBeta(nb, depth - 1, alpha, beta, true));
            beta = Math.min(beta, best);
            if (beta <= alpha) break;
        }
        return best;
    }
}

function aiSelectMove() {
    const legalMoves = generateLegalMoves(chess.board, 'b');
    if (legalMoves.length === 0) return null;

    const level = chess.aiLevel;

    // Level 1: 약함 - 1수 평가 + 50% 랜덤
    if (level === 1) {
        if (Math.random() < 0.5) {
            return legalMoves[Math.floor(Math.random() * legalMoves.length)];
        }
        const evaluated = legalMoves.map(m => {
            const nb = copyBoard(chess.board);
            applyMoveToBoard(nb, m);
            return { move: m, score: evaluateBoard(nb) };
        });
        evaluated.sort((a, b) => b.score - a.score);
        return evaluated[Math.floor(Math.random() * Math.min(5, evaluated.length))].move;
    }

    // Level 2: 중간 - 2수 alpha-beta + 15% 랜덤
    if (level === 2) {
        if (Math.random() < 0.15) {
            return legalMoves[Math.floor(Math.random() * legalMoves.length)];
        }
        let bestMove = legalMoves[0], bestScore = -Infinity;
        for (const m of legalMoves) {
            const nb = copyBoard(chess.board);
            applyMoveToBoard(nb, m);
            const score = alphaBeta(nb, 2, -Infinity, Infinity, false);
            if (score > bestScore) { bestScore = score; bestMove = m; }
        }
        return bestMove;
    }

    // Level 3: 강함 - 4수 alpha-beta, 랜덤 없음
    let bestMove = legalMoves[0], bestScore = -Infinity;
    for (const m of legalMoves) {
        const nb = copyBoard(chess.board);
        applyMoveToBoard(nb, m);
        const score = alphaBeta(nb, 3, -Infinity, Infinity, false);
        if (score > bestScore) { bestScore = score; bestMove = m; }
    }
    return bestMove;
}

// ============================================================
// Board Rendering
// ============================================================
function renderChessBoard() {
    const boardEl = document.getElementById('chess-board');
    boardEl.innerHTML = '';

    // Board border check effect
    const inCheckNow = (chess.turn === 'w' && isKingInCheck(chess.board, 'w')) ||
        (chess.turn === 'b' && isKingInCheck(chess.board, 'b'));
    if (inCheckNow && !chess.gameOver) {
        boardEl.classList.add('board-in-check');
    } else {
        boardEl.classList.remove('board-in-check');
    }

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const sq = document.createElement('div');
            sq.className = 'chess-square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');

            // Last move highlight
            if (chess.lastMove) {
                const lm = chess.lastMove;
                if ((r === lm.from.row && c === lm.from.col) ||
                    (r === lm.to.row && c === lm.to.col)) {
                    sq.classList.add('last-move');
                }
            }

            // Selected
            if (chess.selectedSquare &&
                chess.selectedSquare.row === r && chess.selectedSquare.col === c) {
                sq.classList.add('selected');
            }

            // Valid moves & Captures
            const isValid = chess.validMoves.some(m => m.row === r && m.col === c);
            if (isValid) {
                // If there's a piece, it's a capture
                if (chess.board[r][c]) {
                    sq.classList.add('valid-capture');
                } else {
                    sq.classList.add('valid-move');
                }
            }

            // Check highlight on king
            if (chess.board[r][c] === 'K' && chess.turn === 'w' && isKingInCheck(chess.board, 'w')) {
                sq.classList.add('in-check');
            }
            if (chess.board[r][c] === 'k' && chess.turn === 'b' && isKingInCheck(chess.board, 'b')) {
                sq.classList.add('in-check');
            }

            // Piece
            if (chess.board[r][c]) {
                const pieceDiv = document.createElement('div');
                const isWhite = chess.board[r][c] === chess.board[r][c].toUpperCase();
                pieceDiv.className = `chess-piece ${isWhite ? 'piece-white' : 'piece-black'}`;
                pieceDiv.textContent = getPieceChar(chess.board[r][c]);

                // Animation for just moved piece
                if (chess.lastMove && chess.lastMove.to.row === r && chess.lastMove.to.col === c) {
                    pieceDiv.classList.add('piece-landed');
                }

                sq.appendChild(pieceDiv);
            }

            // Click
            const row = r, col = c;
            sq.addEventListener('click', () => onChessSquareClick(row, col));
            boardEl.appendChild(sq);
        }
    }

    // Captured pieces
    const capBlackEl = document.getElementById('chess-captured-black');
    capBlackEl.innerHTML = '';
    chess.capturedBlack.forEach(p => {
        const d = document.createElement('span');
        d.className = 'captured-piece';
        d.textContent = getPieceChar(p);
        capBlackEl.appendChild(d);
    });

    const capWhiteEl = document.getElementById('chess-captured-white');
    capWhiteEl.innerHTML = '';
    chess.capturedWhite.forEach(p => {
        const d = document.createElement('span');
        d.className = 'captured-piece';
        d.textContent = getPieceChar(p);
        capWhiteEl.appendChild(d);
    });
}

// ============================================================
// Click Handling
// ============================================================
function onChessSquareClick(row, col) {
    if (chess.gameOver || chess.isThinking) return;

    // In AI mode, only allow clicks on white's turn
    if (chess.mode === 'ai' && chess.turn !== 'w') return;

    // In PvP mode, only allow clicks for your own color
    if (chess.mode === 'pvp' && chess.turn !== myColor) return;

    const piece = chess.board[row][col];

    if (chess.selectedSquare) {
        const isValid = chess.validMoves.some(m => m.row === row && m.col === col);

        if (isValid) {
            makeChessMove(chess.selectedSquare, { row, col });
            chess.selectedSquare = null;
            chess.validMoves = [];
            renderChessBoard();
            updateChessStatus();

            // AI mode: trigger AI response
            if (chess.mode === 'ai' && !chess.gameOver) {
                chess.isThinking = true;
                updateChessStatus();
                setTimeout(() => {
                    const aiMove = aiSelectMove();
                    if (aiMove) makeChessMove(aiMove.from, aiMove.to);
                    chess.isThinking = false;
                    renderChessBoard();
                    updateChessStatus();
                }, 500); // Slightly longer delay for natural feel
            }
            return;
        }

        // Click own piece: reselect
        if (piece && isOwn(piece, chess.turn)) {
            selectPiece(row, col);
            return;
        }

        // Deselect
        chess.selectedSquare = null;
        chess.validMoves = [];
        renderChessBoard();
        return;
    }

    // Select own piece
    if (piece && isOwn(piece, chess.turn)) {
        selectPiece(row, col);
    }
}

function selectPiece(row, col) {
    chess.selectedSquare = { row, col };
    chess.validMoves = generateLegalMoves(chess.board, chess.turn)
        .filter(m => m.from.row === row && m.from.col === col)
        .map(m => m.to);
    renderChessBoard();
}

// ============================================================
// Status & Game Over
// ============================================================
function updateChessStatus() {
    const statusEl = document.getElementById('chess-status');

    if (chess.isThinking) {
        statusEl.textContent = '🤔 컴퓨터가 생각 중...';
        statusEl.className = 'chess-status';
        return;
    }

    const status = getGameStatus(chess.board, chess.turn);
    const levelNames = { 1: '🐣', 2: '🐥', 3: '🦅' };
    const levelTag = chess.mode === 'ai' ? ` [Lv.${chess.aiLevel}${levelNames[chess.aiLevel] || ''}]` : '';

    // Name display logic
    let turnName, opponentName;
    if (chess.mode === 'ai') {
        turnName = chess.turn === 'w' ? '당신' : `컴퓨터${levelTag}`;
        opponentName = chess.turn === 'w' ? `컴퓨터${levelTag}` : '당신';
    } else if (chess.mode === 'pvp') {
        turnName = chess.turn === myColor ? '내' : '상대방';
        opponentName = chess.turn === myColor ? '상대방' : '내';
    } else {
        turnName = chess.turn === 'w' ? '흰색' : '검은색';
        opponentName = chess.turn === 'w' ? '검은색' : '흰색';
    }

    switch (status) {
        case 'checkmate':
            chess.gameOver = true;
            // The side in checkmate (chess.turn) lost
            if (chess.mode === 'pvp') {
                const iWin = chess.turn !== myColor;
                statusEl.textContent = iWin ? '🎉 축하합니다! 이겼어요!' : '😢 졌어요...';
                showChessGameOver(
                    iWin ? '🏆 승리!' : '😢 패배',
                    iWin ? '정말 잘했어요!' : '다시 도전해 보세요!'
                );
            } else if (chess.mode === 'ai') {
                if (chess.turn === 'b') {
                    statusEl.textContent = '🎉 축하합니다! 이겼어요!';
                    showChessGameOver('🏆 승리!', '정말 잘했어요!');
                } else {
                    statusEl.textContent = '😢 컴퓨터가 이겼어요';
                    showChessGameOver('😢 패배', '다시 도전해 보세요!');
                }
            }
            statusEl.className = 'chess-status';
            break;
        case 'stalemate':
            chess.gameOver = true;
            statusEl.textContent = '🤝 무승부입니다!';
            showChessGameOver('🤝 무승부!', '잘 싸웠어요!');
            statusEl.className = 'chess-status';
            break;
        case 'check':
            if (chess.mode === 'pvp') {
                statusEl.textContent = chess.turn === myColor
                    ? '⚠️ 체크! 왕을 지키세요!'
                    : '⚠️ 상대방이 체크 상태입니다!';
            } else {
                statusEl.textContent = chess.turn === 'w'
                    ? `⚠️ 체크! 왕을 지키세요!`
                    : `⚠️ 체크! 왕이 위험해요`;
            }
            statusEl.className = 'chess-status check';
            showCheckAlert();
            break;
        default:
            if (chess.mode === 'pvp') {
                statusEl.textContent = chess.turn === myColor
                    ? '내 차례입니다'
                    : '상대방 차례입니다';
            } else {
                statusEl.textContent = chess.turn === 'w'
                    ? `당신의 차례입니다 (흰색)`
                    : `${chess.mode === 'ai' ? '컴퓨터' + levelTag : '검은색'}의 차례입니다`;
            }
            statusEl.className = 'chess-status';
    }
}

function showCheckAlert() {
    const boardContainer = document.querySelector('.chess-board-container');
    // Remove any existing alert
    const existing = boardContainer.querySelector('.check-alert-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'check-alert-overlay';
    overlay.innerHTML = '<div class="check-alert-text">체크!</div>';
    boardContainer.style.position = 'relative';
    boardContainer.appendChild(overlay);

    // Auto-remove after animation
    setTimeout(() => {
        if (overlay.parentNode) overlay.remove();
    }, 1900);
}

function showChessGameOver(title, subtitle) {
    const modal = document.getElementById('result-modal');
    if (!modal) return;

    const titleEl = document.getElementById('modal-player-name');
    const icon = document.getElementById('modal-result-icon');
    const text = document.getElementById('modal-result-text');
    const btnArea = document.getElementById('modal-btn-area');

    // Determine icon based on result
    let iconText = '🤝';
    if (title.includes('승리')) iconText = '🏆';
    else if (title.includes('패배')) iconText = '😢';

    titleEl.innerText = title;
    icon.innerText = iconText;
    text.innerText = subtitle;
    text.className = 'game-result-text';

    btnArea.innerHTML = `
        <button class="btn-primary" onclick="chessNewGame(); document.getElementById('result-modal').classList.add('hidden')">다시 하기</button>
        <button class="btn-secondary" onclick="backToStartFromChess(); document.getElementById('result-modal').classList.add('hidden')">나가기</button>
    `;

    modal.classList.remove('hidden');
}

// ============================================================
// Init & Controls
// ============================================================
function showAiLevelSelect() {
    document.getElementById('chess-mode-step').classList.add('hidden');
    document.getElementById('chess-level-step').classList.remove('hidden');
}

function backFromChessStep() {
    const levelStep = document.getElementById('chess-level-step');
    const modeStep = document.getElementById('chess-mode-step');
    // If on level selection, go back to mode selection
    if (!levelStep.classList.contains('hidden')) {
        levelStep.classList.add('hidden');
        modeStep.classList.remove('hidden');
    } else {
        // On mode selection, go back to start
        backToStartFromChess();
    }
}

function initChessGame(mode, level) {
    chess.mode = mode || 'ai';
    chess.aiLevel = level || 1;
    chess.board = INITIAL_BOARD.map(row => [...row]);
    chess.turn = 'w';
    chess.selectedSquare = null;
    chess.validMoves = [];
    chess.lastMove = null;
    chess.capturedWhite = [];
    chess.capturedBlack = [];
    chess.moveHistory = [];
    chess.gameOver = false;
    chess.isThinking = false;

    const resultModal = document.getElementById('result-modal');
    if (resultModal) resultModal.classList.add('hidden');

    // Reset level step for next time
    document.getElementById('chess-mode-step').classList.remove('hidden');
    document.getElementById('chess-level-step').classList.add('hidden');

    // Hide mode selection, show game area
    document.getElementById('chess-mode-select').classList.add('hidden');
    document.getElementById('chess-game-area').classList.remove('hidden');

    renderChessBoard();
    updateChessStatus();
}

function chessNewGame() {
    initChessGame(chess.mode, chess.aiLevel);
}

function chessUndo() {
    if (chess.gameOver || chess.isThinking) return;

    if (chess.mode === 'ai') {
        undoSingleMove(); // undo AI
        undoSingleMove(); // undo User
    } else {
        undoSingleMove();
    }
    renderChessBoard();
    updateChessStatus();
}

// ============================================================
// Multiplayer Logic (Firebase)
// ============================================================
// import { ref, set, onValue, update, db } from './firebase-config.js'; // Moved to top

let chessRoomId = 'chess_room_default';
let myColor = 'w';

function initChessMultiplayer() {
    // Only for PvP mode
    if (chess.mode !== 'pvp') return;

    const gameRef = ref(db, `chess/${chessRoomId}`);

    // Listen for updates
    onValue(gameRef, (snapshot) => {
        const data = snapshot.val();
        if (!data || !data.board) return;

        // Reconstruct 8x8 board from Firebase data (handles sparse objects)
        const rawBoard = data.board;
        const newBoard = [];
        for (let r = 0; r < 8; r++) {
            const newRow = [];
            const rawRow = rawBoard[r] || [];
            for (let c = 0; c < 8; c++) {
                newRow.push(rawRow[c] || null);
            }
            newBoard.push(newRow);
        }

        // Only update if something changed
        if (JSON.stringify(chess.board) === JSON.stringify(newBoard) && chess.turn === data.turn) return;

        chess.board = newBoard;
        chess.turn = data.turn || 'w';
        chess.lastMove = data.lastMove || null;
        chess.gameOver = data.gameOver || false;
        chess.capturedWhite = data.capturedWhite || [];
        chess.capturedBlack = data.capturedBlack || [];

        renderChessBoard();
        updateChessStatus();
    });
}

function sendChessUpdate() {
    if (chess.mode !== 'pvp') return;

    const gameRef = ref(db, `chess/${chessRoomId}`);
    update(gameRef, {
        board: chess.board,
        turn: chess.turn,
        lastMove: chess.lastMove,
        gameOver: chess.gameOver,
        capturedWhite: chess.capturedWhite,
        capturedBlack: chess.capturedBlack,
        timestamp: Date.now()
    });
}


// Override makeChessMove to send updates
const originalMakeChessMove = makeChessMove;
makeChessMove = function (from, to) {
    originalMakeChessMove(from, to);
    sendChessUpdate();
};

/* 
   Note: To fully implement online PvP where players can only move their own color, 
   we would need a "Join Game" screen to assign colors.
   For now, this shared board allows anyone to move any piece (Hotseat style but online synced).
   This is simpler for family usage without complex lobby system.
*/


// ============================================================
// Expose functions
// ============================================================
window.showAiLevelSelect = function () {
    document.getElementById('chess-mode-step').classList.add('hidden');
    document.getElementById('chess-level-step').classList.remove('hidden');
};

window.showChessPvpRoom = function () {
    document.getElementById('chess-mode-step').classList.add('hidden');
    document.getElementById('chess-pvp-step').classList.remove('hidden');
};

window.selectChessColor = function (color) {
    myColor = color;
    document.getElementById('chess-color-w').classList.toggle('selected', color === 'w');
    document.getElementById('chess-color-b').classList.toggle('selected', color === 'b');
};

window.joinChessRoom = function () {
    const code = document.getElementById('chess-room-code').value.trim();
    if (!code) {
        alert('방 코드를 입력하세요!');
        return;
    }
    chessRoomId = 'chess_room_' + code;
    document.getElementById('chess-pvp-step').classList.add('hidden');
    window.initChessGame('pvp');
};

window.backFromChessStep = function () {
    const levelStep = document.getElementById('chess-level-step');
    const pvpStep = document.getElementById('chess-pvp-step');
    const modeStep = document.getElementById('chess-mode-step');

    // If showing level select or pvp room, go back to mode select
    if (!levelStep.classList.contains('hidden')) {
        levelStep.classList.add('hidden');
        modeStep.classList.remove('hidden');
    } else if (!pvpStep.classList.contains('hidden')) {
        pvpStep.classList.add('hidden');
        modeStep.classList.remove('hidden');
    } else {
        backToStartFromChess();
    }
};

function backToStartFromChess() {
    // Reset all chess sub-steps
    document.getElementById('chess-mode-select').classList.remove('hidden');
    document.getElementById('chess-mode-step').classList.remove('hidden');
    document.getElementById('chess-level-step').classList.add('hidden');
    document.getElementById('chess-pvp-step').classList.add('hidden');
    document.getElementById('chess-game-area').classList.add('hidden');
    document.getElementById('chess-screen').classList.add('hidden');
    document.getElementById('chess-screen').classList.remove('active');

    document.getElementById('start-screen').classList.remove('hidden');
    document.getElementById('start-screen').classList.add('active');
}

window.initChessGame = initChessGame;
window.chessNewGame = chessNewGame;
window.chessUndo = chessUndo;
window.backToStartFromChess = backToStartFromChess;

// Hook into init for PvP
const originalInit = initChessGame;
window.initChessGame = function (mode, level) {
    originalInit(mode, level);
    if (mode === 'pvp') {
        initChessMultiplayer();
        // Reset DB for new game
        sendChessUpdate();
    }
};
