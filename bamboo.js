const bambooGrid = document.getElementById('bambooGrid');
const healthDisplay = document.getElementById('healthDisplay');

const resultOverlay = document.getElementById('resultOverlay');
const resultTitle = document.getElementById('resultTitle');
const resultDesc = document.getElementById('resultDesc');
const btnRestart = document.getElementById('restartBtn');

const sfxChop = document.getElementById('sfx-chop');
const sfxWin = document.getElementById('sfx-win');
const sfxFail = document.getElementById('sfx-fail');

const TOTAL_CARDS = 25; // 5x5 그리드

let health = 3;
let isGameOver = false;

// 게임 초기화
function initGame() {
    isGameOver = false;
    health = 3;
    updateHealthDisplay();
    resultOverlay.classList.add('hidden');
    bambooGrid.innerHTML = '';

    // 카드 내용 설정 (1: 황금대나무, 3: 판다, 나머지: 빈 대나무/일반)
    let cardItems = Array(TOTAL_CARDS).fill('empty');

    // 무작위 인덱스 고르기
    let indices = [...Array(TOTAL_CARDS).keys()];
    shuffle(indices);

    // 황금 대나무 배치 (1개)
    cardItems[indices[0]] = 'golden';

    // 판다 배치 (5개) - 위험요소를 조금 늘림
    for (let i = 1; i <= 5; i++) {
        cardItems[indices[i]] = 'panda';
    }

    // 카드 생성
    cardItems.forEach((itemType) => {
        const card = document.createElement('div');
        card.className = 'bamboo-card';

        // 커버 (자르기 전 대나무)
        const cover = document.createElement('div');
        cover.className = 'cover';
        cover.innerHTML = '<span>🎋</span>';

        // 속 내용
        const content = document.createElement('div');
        content.className = 'content';

        let emoji = '🎍'; // 비어있을 때 (잘린 대나무 밑동)
        if (itemType === 'golden') {
            emoji = '✨🎋✨';
            content.classList.add('golden');
        } else if (itemType === 'panda') {
            emoji = '🐼';
            content.classList.add('panda');
        }

        content.innerHTML = `<span>${emoji}</span>`;

        card.appendChild(content);
        card.appendChild(cover);

        card.addEventListener('click', () => revealCard(card, itemType));
        bambooGrid.appendChild(card);
    });
}

function updateHealthDisplay() {
    let hearts = '';
    for (let i = 0; i < health; i++) hearts += '❤️';
    for (let i = health; i < 3; i++) hearts += '🖤';
    healthDisplay.innerText = hearts;
}

function revealCard(card, itemType) {
    if (isGameOver || card.classList.contains('revealed')) return;

    card.classList.add('revealed');

    // 대나무 베는 소리
    if (sfxChop) {
        sfxChop.currentTime = 0;
        sfxChop.play().catch(() => { });
    }

    if (itemType === 'golden') {
        // 황금 대나무 발견! 승리
        handleWin();
    } else if (itemType === 'panda') {
        // 판다 일어남! 체력 차감
        health--;
        updateHealthDisplay();

        if (health <= 0) {
            handleLose();
        } else {
            // 판다 울음 소리 (실패 소리를 짧게)
            if (sfxFail) {
                sfxFail.currentTime = 0;
                sfxFail.play().catch(() => { });
            }
        }
    }
}

function handleWin() {
    isGameOver = true;
    if (sfxWin) { sfxWin.currentTime = 0; sfxWin.play().catch(() => { }); }

    resultTitle.innerText = "우와! 찾았다! 🎉";
    resultTitle.style.color = "#f1c40f";
    resultDesc.innerText = "전설의 황금 대나무를 무사히 발견했어요!";

    // 모든 카드 다 공개하기
    document.querySelectorAll('.bamboo-card:not(.revealed)').forEach(card => card.classList.add('revealed'));

    setTimeout(() => {
        resultOverlay.classList.remove('hidden');
    }, 1000);
}

function handleLose() {
    isGameOver = true;
    if (sfxFail) { sfxFail.currentTime = 0; sfxFail.play().catch(() => { }); }

    resultTitle.innerText = "앗, 판다에게 쫓겨났어요! 🐼";
    resultTitle.style.color = "#e84118";
    resultDesc.innerText = "판다를 너무 많이 깨워서 하트를 모두 잃었어요.";

    // 황금 대나무 위치 보여주기
    const allCards = document.querySelectorAll('.bamboo-card');
    allCards.forEach(card => {
        if (card.querySelector('.golden')) {
            card.classList.add('revealed');
        }
    });

    setTimeout(() => {
        resultOverlay.classList.remove('hidden');
    }, 1500);
}

// 간단한 배열 셔플 (Fisher-Yates)
function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

btnRestart.addEventListener('click', initGame);

// 첫 시작
initGame();
