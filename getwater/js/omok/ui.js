import { omokState, OMOK_SIZE } from './state.js';
// Removed circular imports. We will depend on window globals for handlers.


export function renderBoard() {
    const boardEl = document.getElementById('omok-board');
    if (!boardEl) return;

    boardEl.innerHTML = '';

    for (let r = 0; r < OMOK_SIZE; r++) {
        for (let c = 0; c < OMOK_SIZE; c++) {
            const cell = document.createElement('div');
            cell.className = 'omok-cell';

            // Grid Lines
            if (r === 0) cell.classList.add('first-row');
            if (r === OMOK_SIZE - 1) cell.classList.add('last-row');
            if (c === 0) cell.classList.add('first-col');
            if (c === OMOK_SIZE - 1) cell.classList.add('last-col');

            if (omokState.board[r][c]) {
                const piece = document.createElement('div');
                piece.className = `omok-piece omok-${omokState.board[r][c]}`;
                if (omokState.lastMove && omokState.lastMove.r === r && omokState.lastMove.c === c) {
                    piece.classList.add('omok-last-move');
                }
                cell.appendChild(piece);
            }

            cell.onclick = () => {
                if (window.handleOmokClick) window.handleOmokClick(r, c);
            };
            boardEl.appendChild(cell);
        }
    }
}

export function updateStatus() {
    const statusEl = document.getElementById('omok-status');
    if (!statusEl) return;

    if (omokState.gameOver) {
        const iWin = omokState.winner === omokState.myColor;
        statusEl.innerText = iWin ? '🎉 승리했어요!' : '😢 졌어요...';
        statusEl.classList.add('highlight');
        showVictoryModal();
    } else {
        const isMyTurn = omokState.turn === omokState.myColor;
        if (omokState.mode === 'ai') {
            statusEl.innerText = isMyTurn ? '내 차례입니다' : '🤖 컴퓨터 생각 중...';
        } else {
            statusEl.innerText = isMyTurn ? '내 차례입니다' : '상대방 차례입니다';
        }
        statusEl.classList.remove('highlight');
    }
}

function showVictoryModal() {
    const modal = document.getElementById('result-modal');
    if (!modal) return;

    const titleEl = document.getElementById('modal-player-name');
    const icon = document.getElementById('modal-result-icon');
    const text = document.getElementById('modal-result-text');
    const btnArea = document.getElementById('modal-btn-area');

    // Determine result from perspective
    let title, iconText, subtitle;
    if (omokState.mode === 'pvp') {
        const iWin = omokState.winner === omokState.myColor;
        title = iWin ? '🏆 승리!' : '😢 패배';
        iconText = iWin ? '🏆' : '😢';
        subtitle = iWin ? '정말 잘했어요!' : '다시 도전해 보세요!';
    } else {
        const winnerName = omokState.winner === 'b' ? '흑돌' : '백돌';
        title = `🏆 ${winnerName} 승리!`;
        iconText = omokState.winner === 'b' ? '⚫' : '⚪';
        subtitle = '멋진 게임이었어요!';
    }

    titleEl.innerText = title;
    icon.innerText = iconText;
    text.innerText = subtitle;
    text.className = 'game-result-text';

    btnArea.innerHTML = `
        <button class="btn-primary" onclick="restartOmok(); document.getElementById('result-modal').classList.add('hidden')">다시 하기</button>
        <button class="btn-secondary" onclick="backToStartFromOmok(); document.getElementById('result-modal').classList.add('hidden')">나가기</button>
    `;

    modal.classList.remove('hidden');
}
