import { omokState, OMOK_SIZE } from './state.js';
import { checkWin, isForbidden } from './rules.js';

const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];

export function getAiMove() {
    if (omokState.gameOver) return null;

    const level = omokState.level || 1;
    const ai = omokState.turn; // AI's color = current turn
    const human = ai === 'b' ? 'w' : 'b';

    // Level 1-2: 30% random
    if (level <= 2 && Math.random() < 0.3) {
        return findRandomMove();
    }

    // Always check forced wins/blocks first
    const winMove = findForcedMove(ai, 4);
    if (winMove) return winMove;

    const blockMove = findForcedMove(human, 4);
    if (blockMove) return blockMove;

    // Level 3+: check open-3 attacks and blocks
    if (level >= 3) {
        const my3 = findForcedMove(ai, 3, true);
        if (my3) return my3;
        const block3 = findForcedMove(human, 3, true);
        if (block3) return block3;
    }

    // Level 9+: minimax search for strongest play
    if (level >= 9) {
        const depth = level >= 11 ? 4 : (level >= 9 ? 2 : 1);
        return minimaxRoot(depth, ai, human);
    }

    // Level 1-8: heuristic with randomness
    const candidates = getCandidateMoves();
    if (candidates.length === 0) return findRandomMove();

    const scored = candidates.map(({ r, c }) => ({
        r, c,
        score: evaluatePosition(r, c, ai) + evaluatePosition(r, c, human) * 0.95
    }));
    scored.sort((a, b) => b.score - a.score);

    const topN = Math.max(1, 13 - level);
    const pickIndex = Math.floor(Math.random() * Math.min(topN, scored.length));
    return scored[pickIndex];
}

// Get candidate moves (near existing stones only for efficiency)
function getCandidateMoves() {
    const candidates = [];
    const hasStone = new Set();

    for (let r = 0; r < OMOK_SIZE; r++) {
        for (let c = 0; c < OMOK_SIZE; c++) {
            if (omokState.board[r][c]) hasStone.add(`${r},${c}`);
        }
    }

    if (hasStone.size === 0) return [{ r: 7, c: 7 }];

    const seen = new Set();
    for (const key of hasStone) {
        const [sr, sc] = key.split(',').map(Number);
        for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
                const nr = sr + dr, nc = sc + dc;
                if (nr < 0 || nr >= OMOK_SIZE || nc < 0 || nc >= OMOK_SIZE) continue;
                if (omokState.board[nr][nc]) continue;
                const k = `${nr},${nc}`;
                if (seen.has(k)) continue;
                seen.add(k);
                candidates.push({ r: nr, c: nc });
            }
        }
    }
    return candidates;
}

// Minimax with alpha-beta for high levels
let _ai = 'w', _human = 'b'; // module-level for minimax access

function minimaxRoot(depth, ai, human) {
    _ai = ai; _human = human;
    const candidates = getCandidateMoves();
    if (candidates.length === 0) return findRandomMove();

    const scored = candidates.map(({ r, c }) => ({
        r, c,
        score: evaluatePosition(r, c, ai) + evaluatePosition(r, c, human) * 0.9
    }));
    scored.sort((a, b) => b.score - a.score);
    const topMoves = scored.slice(0, 15);

    let bestMove = topMoves[0];
    let bestScore = -Infinity;

    for (const m of topMoves) {
        omokState.board[m.r][m.c] = ai;
        if (checkWin(m.r, m.c, ai)) {
            omokState.board[m.r][m.c] = null;
            return m;
        }
        const score = minimax(depth - 1, -Infinity, Infinity, false);
        omokState.board[m.r][m.c] = null;
        if (score > bestScore) {
            bestScore = score;
            bestMove = m;
        }
    }
    return bestMove;
}

function minimax(depth, alpha, beta, isMax) {
    if (depth === 0) return evaluateBoardForAi();

    const color = isMax ? _ai : _human;
    const opp = isMax ? _human : _ai;
    const candidates = getCandidateMoves();
    if (candidates.length === 0) return 0;

    const scored = candidates.map(({ r, c }) => ({
        r, c,
        score: evaluatePosition(r, c, color) + evaluatePosition(r, c, opp) * 0.8
    }));
    scored.sort((a, b) => b.score - a.score);
    const topMoves = scored.slice(0, 10);

    if (isMax) {
        let best = -Infinity;
        for (const m of topMoves) {
            omokState.board[m.r][m.c] = _ai;
            if (checkWin(m.r, m.c, _ai)) {
                omokState.board[m.r][m.c] = null;
                return 100000;
            }
            best = Math.max(best, minimax(depth - 1, alpha, beta, false));
            omokState.board[m.r][m.c] = null;
            alpha = Math.max(alpha, best);
            if (beta <= alpha) break;
        }
        return best;
    } else {
        let best = Infinity;
        for (const m of topMoves) {
            omokState.board[m.r][m.c] = _human;
            if (checkWin(m.r, m.c, _human)) {
                omokState.board[m.r][m.c] = null;
                return -100000;
            }
            best = Math.min(best, minimax(depth - 1, alpha, beta, true));
            omokState.board[m.r][m.c] = null;
            beta = Math.min(beta, best);
            if (beta <= alpha) break;
        }
        return best;
    }
}

// Board evaluation for minimax (positive = good for AI)
function evaluateBoardForAi() {
    let score = 0;
    for (let r = 0; r < OMOK_SIZE; r++) {
        for (let c = 0; c < OMOK_SIZE; c++) {
            if (!omokState.board[r][c]) continue;
            if (omokState.board[r][c] === _ai) {
                score += evaluateStone(r, c, _ai);
            } else {
                score -= evaluateStone(r, c, _human);
            }
        }
    }
    return score;
}

function evaluateStone(r, c, color) {
    let total = 0;
    const opp = color === 'w' ? 'b' : 'w';
    for (const [dr, dc] of DIRS) {
        let count = 1;
        let openEnds = 0;
        // Forward
        let nr = r + dr, nc = c + dc;
        while (nr >= 0 && nr < OMOK_SIZE && nc >= 0 && nc < OMOK_SIZE && omokState.board[nr][nc] === color) {
            count++; nr += dr; nc += dc;
        }
        if (nr >= 0 && nr < OMOK_SIZE && nc >= 0 && nc < OMOK_SIZE && !omokState.board[nr][nc]) openEnds++;
        // Backward
        nr = r - dr; nc = c - dc;
        while (nr >= 0 && nr < OMOK_SIZE && nc >= 0 && nc < OMOK_SIZE && omokState.board[nr][nc] === color) {
            count++; nr -= dr; nc -= dc;
        }
        if (nr >= 0 && nr < OMOK_SIZE && nc >= 0 && nc < OMOK_SIZE && !omokState.board[nr][nc]) openEnds++;

        total += patternScore(count, openEnds);
    }
    return total;
}

function patternScore(count, openEnds) {
    if (count >= 5) return 100000;
    if (count === 4) {
        if (openEnds === 2) return 50000;  // open 4 = almost win
        if (openEnds === 1) return 5000;   // half-open 4
        return 0;
    }
    if (count === 3) {
        if (openEnds === 2) return 3000;   // open 3 = strong threat
        if (openEnds === 1) return 500;
        return 0;
    }
    if (count === 2) {
        if (openEnds === 2) return 200;
        if (openEnds === 1) return 50;
        return 0;
    }
    if (count === 1 && openEnds === 2) return 10;
    return 0;
}

function findRandomMove() {
    const empty = [];
    for (let r = 0; r < OMOK_SIZE; r++) {
        for (let c = 0; c < OMOK_SIZE; c++) {
            if (!omokState.board[r][c]) empty.push({ r, c });
        }
    }
    return empty.length > 0 ? empty[Math.floor(Math.random() * empty.length)] : null;
}

function findForcedMove(color, count, openEnds = false) {
    for (let r = 0; r < OMOK_SIZE; r++) {
        for (let c = 0; c < OMOK_SIZE; c++) {
            if (omokState.board[r][c]) continue;

            omokState.board[r][c] = color;
            const maxCount = getMaxCount(r, c, color);
            let valid = false;
            if (openEnds) {
                if (maxCount >= count && hasOpenEnds(r, c, color, count)) valid = true;
            } else {
                if (maxCount >= count) valid = true;
            }
            omokState.board[r][c] = null;
            if (valid) return { r, c };
        }
    }
    return null;
}

function hasOpenEnds(r, c, color, targetCount) {
    for (const [dr, dc] of DIRS) {
        let count = 1;
        let nr = r + dr, nc = c + dc;
        while (nr >= 0 && nr < OMOK_SIZE && nc >= 0 && nc < OMOK_SIZE && omokState.board[nr][nc] === color) {
            count++; nr += dr; nc += dc;
        }
        const frontOpen = nr >= 0 && nr < OMOK_SIZE && nc >= 0 && nc < OMOK_SIZE && !omokState.board[nr][nc];
        nr = r - dr; nc = c - dc;
        while (nr >= 0 && nr < OMOK_SIZE && nc >= 0 && nc < OMOK_SIZE && omokState.board[nr][nc] === color) {
            count++; nr -= dr; nc -= dc;
        }
        const backOpen = nr >= 0 && nr < OMOK_SIZE && nc >= 0 && nc < OMOK_SIZE && !omokState.board[nr][nc];
        if (count >= targetCount && frontOpen && backOpen) return true;
    }
    return false;
}

function getMaxCount(r, c, color) {
    let max = 0;
    for (const [dr, dc] of DIRS) {
        let count = 1;
        let nr = r + dr, nc = c + dc;
        while (nr >= 0 && nr < OMOK_SIZE && nc >= 0 && nc < OMOK_SIZE && omokState.board[nr][nc] === color) {
            count++; nr += dr; nc += dc;
        }
        nr = r - dr; nc = c - dc;
        while (nr >= 0 && nr < OMOK_SIZE && nc >= 0 && nc < OMOK_SIZE && omokState.board[nr][nc] === color) {
            count++; nr -= dr; nc -= dc;
        }
        if (count > max) max = count;
    }
    return max;
}

function evaluatePosition(r, c, color) {
    let score = 0;
    const opp = color === 'w' ? 'b' : 'w';

    for (const [dr, dc] of DIRS) {
        let count = 0;
        let openEnds = 0;

        // Forward
        for (let i = 1; i < 5; i++) {
            const nr = r + dr * i, nc = c + dc * i;
            if (nr < 0 || nr >= OMOK_SIZE || nc < 0 || nc >= OMOK_SIZE) break;
            if (omokState.board[nr][nc] === color) count++;
            else if (!omokState.board[nr][nc]) { openEnds++; break; }
            else break;
        }

        // Backward
        for (let i = 1; i < 5; i++) {
            const nr = r - dr * i, nc = c - dc * i;
            if (nr < 0 || nr >= OMOK_SIZE || nc < 0 || nc >= OMOK_SIZE) break;
            if (omokState.board[nr][nc] === color) count++;
            else if (!omokState.board[nr][nc]) { openEnds++; break; }
            else break;
        }

        score += patternScore(count + 1, openEnds); // +1 because placing here adds one
    }

    // Center bonus
    score += (7 - Math.abs(r - 7)) + (7 - Math.abs(c - 7));
    return score;
}
