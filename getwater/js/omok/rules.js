import { OMOK_SIZE, omokState } from './state.js';

// Check if a move is forbidden for Black (Double 3, Overline)
export function isForbidden(r, c, color) {
    if (color !== 'b') return false; // Only restrictions for Black

    // 1. Overline (6+) check
    // If placing here creates a line of 6 or more, it's forbidden.
    if (checkOverline(r, c, color)) return true;

    // 2. Double 3 (3-3) check
    // Creating two "open 3s" at the same time.
    if (checkDoubleThree(r, c, color)) return true;

    return false;
}

// Check if a move results in a win
// For Black: Exactly 5
// For White: 5 or more
export function checkWin(r, c, color) {
    const directions = [
        [0, 1],  // Horizontal
        [1, 0],  // Vertical
        [1, 1],  // Diagonal \
        [1, -1]  // Diagonal /
    ];

    for (const [dr, dc] of directions) {
        let count = 1;

        // Forward
        let nr = r + dr, nc = c + dc;
        while (isValid(nr, nc) && omokState.board[nr][nc] === color) {
            count++;
            nr += dr; nc += dc;
        }

        // Backward
        nr = r - dr; nc = c - dc;
        while (isValid(nr, nc) && omokState.board[nr][nc] === color) {
            count++;
            nr -= dr; nc -= dc;
        }

        if (color === 'b') {
            if (count === 5) return true; // Black needs exactly 5
        } else {
            if (count >= 5) return true; // White wins with 5+
        }
    }
    return false;
}

function isValid(r, c) {
    return r >= 0 && r < OMOK_SIZE && c >= 0 && c < OMOK_SIZE;
}

function checkOverline(r, c, color) {
    // Temporarily place
    omokState.board[r][c] = color;

    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    let isOverline = false;

    for (const [dr, dc] of directions) {
        let count = 1;
        let nr = r + dr, nc = c + dc;
        while (isValid(nr, nc) && omokState.board[nr][nc] === color) { count++; nr += dr; nc += dc; }
        nr = r - dr; nc = c - dc;
        while (isValid(nr, nc) && omokState.board[nr][nc] === color) { count++; nr -= dr; nc -= dc; }

        if (count > 5) {
            isOverline = true;
            break;
        }
    }

    omokState.board[r][c] = null; // Revert
    return isOverline;
}

function checkDoubleThree(r, c, color) {
    omokState.board[r][c] = color;
    let threeCount = 0;

    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

    for (const [dr, dc] of directions) {
        if (isOpenThree(r, c, dr, dc, color)) {
            threeCount++;
        }
    }

    omokState.board[r][c] = null; // Revert
    return threeCount >= 2;
}

// Check if a line forms an "Open 3"
// Open 3 means: .XX. (where one X is the new stone) AND it's not blocked on either side immediately.
// Actually Open 3 is stricter: It must be able to become an Open 4.
// Simplified Definition for this game:
// 3 consecutive stones with open ends. e.g. .XXX.
function isOpenThree(r, c, dr, dc, color) {
    // Collect the line content
    // We need to look far enough.
    // Let's count consecutive stones including (r,c)

    // Find extent of the line
    let startR = r, startC = c;
    while (isValid(startR - dr, startC - dc) && omokState.board[startR - dr][startC - dc] === color) {
        startR -= dr; startC -= dc;
    }

    let endR = r, endC = c;
    while (isValid(endR + dr, endC + dc) && omokState.board[endR + dr][endC + dc] === color) {
        endR += dr; endC += dc;
    }

    // Count stones
    let count = 0;
    let currR = startR, currC = startC;
    while (currR !== endR + dr || currC !== endC + dc) { // Approximation loop
        count++;
        currR += dr; currC += dc;
        if (Math.abs(currR - startR) > 20) break; // Safety
    }
    // Correct loop logic:
    count = Math.max(Math.abs(endR - startR), Math.abs(endC - startC)); // Distance
    // Wait, let's just count manually properly.

    // Reset proper logic
    count = 1;
    let nr = r + dr, nc = c + dc;
    while (isValid(nr, nc) && omokState.board[nr][nc] === color) { count++; nr += dr; nc += dc; }
    let frontOpen = isValid(nr, nc) && omokState.board[nr][nc] === null;

    nr = r - dr; nc = c - dc;
    while (isValid(nr, nc) && omokState.board[nr][nc] === color) { count++; nr -= dr; nc -= dc; }
    let backOpen = isValid(nr, nc) && omokState.board[nr][nc] === null;

    if (count === 3 && frontOpen && backOpen) {
        // Renju strict: Must not be a "False 3".
        // But for this casual implementation, .XXX. is a 3.
        return true;
    }
    return false;
}
