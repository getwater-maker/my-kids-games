export const OMOK_SIZE = 15;

export const omokState = {
    board: [], // 15x15 array: null, 'b', 'w'
    turn: 'b', // Black goes first
    mode: 'ai', // 'ai' or 'pvp'
    level: 1,
    gameOver: false,
    winner: null,
    lastMove: null, // {r, c}
    myColor: 'b' // For PvP: which color am I
};

export function resetState(mode, level) {
    omokState.mode = mode || 'ai';
    omokState.level = level || 1;
    omokState.board = Array(OMOK_SIZE).fill(null).map(() => Array(OMOK_SIZE).fill(null));
    omokState.turn = 'b';
    omokState.gameOver = false;
    omokState.winner = null;
    omokState.lastMove = null;
}
