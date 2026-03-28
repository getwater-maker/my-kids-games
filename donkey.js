const roomContainer = document.getElementById('roomContainer');
const cleanCountEl = document.getElementById('cleanCount');
const totalCountEl = document.getElementById('totalCount');
const timeDisplay = document.getElementById('timeDisplay');
const startOverlay = document.getElementById('startOverlay');
const resultOverlay = document.getElementById('resultOverlay');
const resultTitle = document.getElementById('resultTitle');
const resultDesc = document.getElementById('resultDesc');
const walletAmt = document.getElementById('walletAmt');
const donkey = document.getElementById('donkey');

const btnStart = document.getElementById('startBtn');
const btnRestart = document.getElementById('restartBtn');

const sfxClean = document.getElementById('sfx-clean');
const sfxWin = document.getElementById('sfx-win');
const sfxFail = document.getElementById('sfx-fail');

// 저장된 돈 불러오기 (로컬 스토리지 활용)
let money = 0;
if (localStorage.getItem('myMoney')) {
    money = parseInt(localStorage.getItem('myMoney'));
}
walletAmt.innerText = money.toLocaleString();

const TOTAL_TRASH = 35; // 치워야 할 총 쓰레기 개수
const GAME_TIME = 120; // 2분 = 120초

let currentTrash = 0;
let timeRemaining = GAME_TIME;
let timerId = null;
let isPlaying = false;

const trashEmojis = ['🧦', '🍌', '💩', '🗑️', '🧻', '🕸️', '🍂', '🍕', '🦴', '🥤'];

// 시간 포맷 (02:00)
function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function spawnTrash() {
    // 이전 쓰레기 제거
    const oldTrash = document.querySelectorAll('.trash');
    oldTrash.forEach(t => t.remove());

    // 쓰레기 무작위 생성
    for (let i = 0; i < TOTAL_TRASH; i++) {
        const el = document.createElement('div');
        el.className = 'trash';
        el.innerText = trashEmojis[Math.floor(Math.random() * trashEmojis.length)];

        // 위치를 랜덤으로 (바닥과 벽면에 골고루 배치)
        const isFloor = Math.random() > 0.4;

        let bottom = 0;
        let left = Math.random() * 90; // 0 ~ 90% (화면 밖으로 나가지 않게)

        if (isFloor) {
            bottom = Math.random() * 30 + 5; // 바닥쪽 높이
        } else {
            bottom = Math.random() * 40 + 40; // 벽쪽 높이
            // 벽이면 거미줄(🕸️) 확률 높이기
            if (el.innerText !== '🕸️' && Math.random() > 0.6) {
                el.innerText = '🕸️';
            }
        }

        el.style.left = left + '%';
        // z-index를 bottom 위치 기반 셔플하여 입체감 부여
        el.style.zIndex = Math.floor(100 - bottom);
        el.style.bottom = bottom + '%';

        // 클릭 및 터치 이벤트 달기
        el.addEventListener('mousedown', cleanTrash);
        el.addEventListener('touchstart', (e) => {
            e.preventDefault();
            cleanTrash({ target: el });
        }, { passive: false });

        roomContainer.appendChild(el);
    }
}

function updateProgress() {
    cleanCountEl.innerText = currentTrash;
    totalCountEl.innerText = TOTAL_TRASH;
}

// 쓰레기를 치우는 함수
function cleanTrash(e) {
    if (!isPlaying) return;
    const el = e.target;
    // 이미 치웠다면 무시
    if (el.classList.contains('cleaned')) return;

    el.classList.add('cleaned');
    currentTrash++;
    updateProgress();

    // 뽁 소리 재생
    if (sfxClean) {
        sfxClean.currentTime = 0;
        sfxClean.play().catch(() => { });
    }

    // 다 치웠는지 확인
    if (currentTrash >= TOTAL_TRASH) {
        gameClear();
    }
}

function updateTimer() {
    timeDisplay.innerText = formatTime(timeRemaining);
    // 10초 남았을 때 붉은 색으로 깜빡임
    if (timeRemaining <= 10) {
        timeDisplay.style.color = '#c23616';
        timeDisplay.style.animation = 'idle 0.5s infinite';
    } else {
        timeDisplay.style.color = '#e84118';
        timeDisplay.style.animation = 'none';
    }

    if (timeRemaining <= 0) {
        gameOver();
    }
}

function gameTick() {
    timeRemaining--;
    updateTimer();
}

function startGame() {
    startOverlay.classList.add('hidden');
    resultOverlay.classList.add('hidden');

    currentTrash = 0;
    timeRemaining = GAME_TIME;
    isPlaying = true;

    updateProgress();
    updateTimer();
    spawnTrash();

    // 당나귀 표정 초기화
    donkey.innerText = '🫏';
    donkey.style.animation = 'idle 2s infinite ease-in-out';

    if (timerId) clearInterval(timerId);
    timerId = setInterval(gameTick, 1000);
}

function gameClear() {
    isPlaying = false;
    clearInterval(timerId);

    // 돈 10,000원 추가!
    money += 10000;
    walletAmt.innerText = money.toLocaleString();
    localStorage.setItem('myMoney', money);

    resultTitle.innerText = "반짝반짝 완벽해요! ✨";
    resultTitle.style.color = "#f1c40f";
    resultDesc.innerText = `당나귀 아저씨가 너무 기뻐하며 수고비 10,000원을 주셨어요! 💵\n(현재 지갑: ${money.toLocaleString()}원)`;

    // 기뻐하는 뽀뽀 이모지
    donkey.innerText = '😊';
    donkey.style.animation = 'bounce 0.5s infinite';

    if (sfxWin) {
        sfxWin.currentTime = 0;
        sfxWin.play().catch(() => { });
    }

    resultOverlay.classList.remove('hidden');
}

function gameOver() {
    isPlaying = false;
    clearInterval(timerId);

    resultTitle.innerText = "앗, 시간이 다 됐어요! 😢";
    resultTitle.style.color = "#e84118";
    resultDesc.innerText = "당나귀 아저씨가 눈물을 흘려요... 돈을 받지 못했어요.\n(다시 한 번 도전해봐요!)";

    // 우는 이모지
    donkey.innerText = '😭';
    donkey.style.animation = 'none';

    if (sfxFail) {
        sfxFail.currentTime = 0;
        sfxFail.play().catch(() => { });
    }

    resultOverlay.classList.remove('hidden');
}

btnStart.addEventListener('click', startGame);
btnRestart.addEventListener('click', startGame);

// 뛰는 애니메이션 동적 추가
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes bounce {
    0%, 100% { transform: translateX(-50%) translateY(0); }
    50% { transform: translateX(-50%) translateY(-30px); }
  }
`;
document.head.appendChild(styleSheet);
