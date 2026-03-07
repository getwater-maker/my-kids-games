// 아기 돼지 키우기 게임 로직 🐷

// 상태 변수
let stats = {
    hunger: 50,
    clean: 50,
    happy: 50,
    energy: 50
};

// 요소
const pig = document.getElementById('pig');
const pigContainer = document.getElementById('pigContainer');
const emotionCloud = document.getElementById('emotionCloud');
const particles = document.getElementById('particles');

// 소리 객체 (없으면 방어 로직)
const sfxFeed = document.getElementById('sfx-feed');
const sfxWash = document.getElementById('sfx-wash');
const sfxPlay = document.getElementById('sfx-play');

// UI 업데이트
function updateUI() {
    document.getElementById('hungerBar').style.width = stats.hunger + '%';
    document.getElementById('cleanBar').style.width = stats.clean + '%';
    document.getElementById('happyBar').style.width = stats.happy + '%';
    document.getElementById('energyBar').style.width = stats.energy + '%';

    pig.classList.remove('anim-sleep');
    pigContainer.classList.remove('is-sleeping');

    // 상태에 따른 표정 변경
    if (stats.energy < 20) {
        setEmotion('😴');
        pig.classList.add('anim-sleep');
        pigContainer.classList.add('is-sleeping');
    } else if (stats.hunger < 20) {
        setEmotion('🍗'); // 배고파!
    } else if (stats.clean < 20) {
        setEmotion('💩'); // 씻겨줘!
    } else if (stats.happy < 20) {
        setEmotion('😢'); // 놀아줘!
    } else if (stats.happy > 80 && stats.hunger > 80 && stats.energy > 80) {
        setEmotion('😍');
    } else {
        emotionCloud.style.opacity = '0';
    }
}

// 수치 변경 제한 (0 ~ 100)
function clamp(val) {
    return Math.max(0, Math.min(100, val));
}

// 감정 표시
function setEmotion(emoji) {
    emotionCloud.innerText = emoji;
    emotionCloud.style.opacity = '1';
}

// 파티클 생성
function createParticle(emoji, x, y) {
    const el = document.createElement('div');
    el.innerText = emoji;
    el.className = 'particle';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    particles.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

// 액션 버튼 로직
document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const action = btn.dataset.action;
        let particleEmoji = '';

        if (action === 'feed') {
            stats.hunger = clamp(stats.hunger + 25);
            stats.energy = clamp(stats.energy + 5);
            stats.clean = clamp(stats.clean - 10);
            particleEmoji = '🍎';
            pigContainer.classList.remove('anim-jump');
            void pigContainer.offsetWidth; // 리플로우 (애니메이션 재시작)
            pigContainer.classList.add('anim-jump');
            if (sfxFeed) { sfxFeed.currentTime = 0; sfxFeed.play().catch(() => { }); }
        } else if (action === 'wash') {
            stats.clean = clamp(stats.clean + 40);
            stats.happy = clamp(stats.happy + 10);
            particleEmoji = '🫧';
            pigContainer.classList.remove('anim-shake');
            void pigContainer.offsetWidth;
            pigContainer.classList.add('anim-shake');
            if (sfxWash) { sfxWash.currentTime = 0; sfxWash.play().catch(() => { }); }
        } else if (action === 'play') {
            stats.happy = clamp(stats.happy + 25);
            stats.energy = clamp(stats.energy - 15);
            stats.hunger = clamp(stats.hunger - 15);
            particleEmoji = '🎾';
            pigContainer.classList.remove('anim-jump');
            void pigContainer.offsetWidth;
            pigContainer.classList.add('anim-jump');
            if (sfxPlay) { sfxPlay.currentTime = 0; sfxPlay.play().catch(() => { }); }
        } else if (action === 'sleep') {
            stats.energy = clamp(stats.energy + 50);
            stats.hunger = clamp(stats.hunger - 10);
            particleEmoji = '💤';
        }

        // 메인 화면 한가운데서 파티클 생성
        const centerRect = document.querySelector('.pig-area').getBoundingClientRect();
        const startX = centerRect.width / 2 + (Math.random() * 80 - 40);
        const startY = centerRect.height / 2 - 50;
        createParticle(particleEmoji, startX, startY);

        updateUI();
    });
});

// 타이머로 수치 서서히 감소 (2초마다)
setInterval(() => {
    stats.hunger = clamp(stats.hunger - 2);
    stats.happy = clamp(stats.happy - 1);
    stats.clean = clamp(stats.clean - 1);
    stats.energy = clamp(stats.energy - 1);
    updateUI();
}, 2000);

// 돼지를 직접 클릭(쓰다듬기)했을 때
pigContainer.addEventListener('click', (e) => {
    stats.happy = clamp(stats.happy + 5);

    // 마우스/터치 위치 근처에서 하트 뿅!
    const rect = document.querySelector('.pig-area').getBoundingClientRect();
    const x = e.clientX - rect.left - 20;
    const y = e.clientY - rect.top - 20;
    createParticle('💖', x, y);

    updateUI();

    pigContainer.classList.remove('anim-jump');
    void pigContainer.offsetWidth;
    pigContainer.classList.add('anim-jump');
});

// 초기화
updateUI();
