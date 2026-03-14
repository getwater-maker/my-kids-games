const songList = [
    { name: "둠칫둠칫 즐거운 테크노", src: "https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3" },
    { name: "스웩 넘치는 신나는 힙합", src: "https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3" },
    { name: "포근하고 아름다운 꿈나라", src: "https://assets.mixkit.co/music/preview/mixkit-beautiful-dream-493.mp3" },
    { name: "따뜻한 우쿨렐레와 낮잠", src: "https://assets.mixkit.co/music/preview/mixkit-sun-and-his-daughter-580.mp3" },
    { name: "부릉부릉~ 신나는 드라이브", src: "https://assets.mixkit.co/music/preview/mixkit-driving-ambition-32.mp3" },
    { name: "경쾌하고 통통 튀는 피아노", src: "https://assets.mixkit.co/music/preview/mixkit-piano-horror-671.mp3" },
    { name: "비 오는 날의 조용한 카페", src: "https://assets.mixkit.co/music/preview/mixkit-deep-urban-623.mp3" },
    { name: "우주로 날아가는 로켓", src: "https://assets.mixkit.co/music/preview/mixkit-hazy-after-hours-132.mp3" }
];

const audio = document.getElementById('gameAudio');
const sfxCorrect = document.getElementById('sfx-correct');
const sfxWrong = document.getElementById('sfx-wrong');

const playBtn = document.getElementById('playBtn');
const cdDisk = document.getElementById('cdDisk');
const statusText = document.getElementById('statusText');
const musicProgress = document.getElementById('musicProgress');
const choiceGrid = document.getElementById('choiceGrid');
const scoreDisplay = document.getElementById('scoreDisplay');

const resultOverlay = document.getElementById('resultOverlay');
const resultTitle = document.getElementById('resultTitle');
const resultDesc = document.getElementById('resultDesc');
const nextBtn = document.getElementById('nextBtn');

let currentSongIndex = -1;
let currentChoices = [];
let score = 0;
let isPlaying = false;
let progressInterval = null;

// 플레이 타임 제한 (초)
const LISTEN_TIME = 15;

playBtn.addEventListener('click', startRound);
nextBtn.addEventListener('click', () => {
    resultOverlay.classList.add('hidden');
    startRound();
});

function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

function startRound() {
    // 이전 오디오 멈추기
    audio.pause();
    clearInterval(progressInterval);
    musicProgress.style.width = '0%';

    // 문제 세팅
    playBtn.style.display = 'none';
    choiceGrid.innerHTML = '';

    // 정답 고르기
    currentSongIndex = Math.floor(Math.random() * songList.length);
    const correctSong = songList[currentSongIndex];

    // 오답 고르기 (3개 돌리기)
    let wrongSongs = songList.filter((s, idx) => idx !== currentSongIndex);
    wrongSongs = shuffle(wrongSongs).slice(0, 3);

    // 보기 객체 배열 만들기
    currentChoices = [correctSong, ...wrongSongs];
    currentChoices = shuffle(currentChoices);

    // 버튼 생성 (처음엔 비활성화 -> 노래 듣는 동안 활성화 또는 처음부터 활성화)
    currentChoices.forEach(choice => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.innerText = choice.name;
        btn.onclick = () => checkAnswer(btn, choice.name === correctSong.name);
        choiceGrid.appendChild(btn);
    });

    // 오디오 재생
    audio.src = correctSong.src;
    audio.currentTime = 0;

    audio.play().then(() => {
        isPlaying = true;
        cdDisk.classList.add('spinning');
        statusText.innerText = "🎵 음악이 나오고 있어요! 정답을 골라주세요!";

        let timeLeft = LISTEN_TIME;
        progressInterval = setInterval(() => {
            timeLeft -= 0.1;
            const percent = ((LISTEN_TIME - timeLeft) / LISTEN_TIME) * 100;
            musicProgress.style.width = percent + '%';

            if (timeLeft <= 0) {
                stopMusic();
                statusText.innerText = "노래가 끝났어요. 과연 정답은?";
            }
        }, 100);

    }).catch(err => {
        console.error("Audio play failed:", err);
        statusText.innerText = "오디오 재생 오류! 다른 노래로 다시 시도해보세요.";
        playBtn.style.display = 'block';
        playBtn.innerText = "🔄 다시 재생하기";
    });
}

function stopMusic() {
    isPlaying = false;
    audio.pause();
    cdDisk.classList.remove('spinning');
    clearInterval(progressInterval);
}

function checkAnswer(clickedBtn, isCorrect) {
    if (!isPlaying && audio.paused && musicProgress.style.width === '0%') return; // 아직 안켰음

    stopMusic();

    // 모든 선택지 비활성화 (결과 보여주기 위함)
    const allBtns = document.querySelectorAll('.choice-btn');
    allBtns.forEach(btn => {
        btn.disabled = true;

        // 클릭한 버튼과 별개로 정답이 무엇인지 초록색으로 표시
        if (btn.innerText === songList[currentSongIndex].name) {
            btn.classList.remove('wrong');
            btn.classList.add('correct');
        }
    });

    if (isCorrect) {
        handleWin();
    } else {
        clickedBtn.classList.add('wrong');
        handleLose();
    }
}

function handleWin() {
    if (sfxCorrect) sfxCorrect.play().catch(() => { });
    score += 10;
    scoreDisplay.innerText = score;

    setTimeout(() => {
        resultTitle.innerText = "정답입니다! 🎉";
        resultTitle.style.color = "#f9ca24";
        resultDesc.innerText = "점수 +10점 획득!\n대단해요! 음감이 정말 뛰어나시네요!";
        resultOverlay.classList.remove('hidden');
    }, 1000);
}

function handleLose() {
    if (sfxWrong) sfxWrong.play().catch(() => { });

    setTimeout(() => {
        resultTitle.innerText = "앗, 틀렸어요 😢";
        resultTitle.style.color = "#d63031";
        resultDesc.innerText = `정답은 [${songList[currentSongIndex].name}] 였답니다.\n계속해서 연습해봐요!`;
        resultOverlay.classList.remove('hidden');
    }, 1000);
}
