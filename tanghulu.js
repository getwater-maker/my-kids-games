// 탕후루 게임 마법 요정 (자바스크립트)

// -- 상태 (내 지갑, 바구니, 꼬치 상태) --
let coins = 0;
let inventory = {
    strawberry: 0,
    grape: 0,
    purple_grape: 0
};
let skewerFruits = []; // 꼬치에 꽂힌 과일들 (최대 5개)
const MAX_SKEWER = 5;
let isCoated = false; // 탕후루 코팅이 되었는지?
let unlocked = {
    grape: false,
    purple_grape: false
};

let mukbangBuff = 1; // 먹방 조회수 뻥튀기!
let currentFood = ""; // 현재 배달시킨 음식

// -- 소리 효과 요정들 --
const sfxPop = document.getElementById('pop-sound');
const sfxCoin = document.getElementById('coin-sound');
const sfxSyrup = document.getElementById('syrup-sound');
// 소리 줄이기
sfxPop.volume = 0.5; sfxCoin.volume = 0.5; sfxSyrup.volume = 0.5;

function playSound(sound) {
    if (!sound) return;
    sound.currentTime = 0; // 처음부터 재생
    sound.play().catch(e => console.log('소리 재생 실패: ', e)); // 오류 무시
}

// -- 판다 대사 바꾸기 마법 --
const pandaSpeech = document.getElementById('pandaSpeech');
function pandaSay(text) {
    pandaSpeech.innerText = text;
    pandaSpeech.style.animation = 'popIn 0.3s ease-out';
    setTimeout(() => { pandaSpeech.style.animation = ''; }, 300);
}

// -- 화면 탭 전환 마법 --
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // 모든 탭 버튼과 화면 숨기기
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));

        // 내가 누른 것만 켜기
        btn.classList.add('active');
        const targetId = btn.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');

        // 판다 인사말
        if (targetId === 'farm-view') pandaSay('자, 맛있는 과일을 수확해보자!');
        if (targetId === 'kitchen-view') pandaSay('과일을 꼬치에 꽂고 달콤한 시럽을 발라봐!');
        if (targetId === 'shop-view') pandaSay('농장을 더 멋지게 꾸미고 싶어?');
    });
});

// -- 농장 식물 자라기 시스템 --
class Plant {
    constructor(id, type, growTimeSeconds) {
        this.element = document.getElementById(id);
        this.hitbox = this.element.querySelector('.hitbox');
        this.fillBar = this.element.querySelector('.fill');
        this.type = type;
        this.growTime = growTimeSeconds;
        this.progress = 0;
        this.timer = null;
        this.isRipe = false;

        // 클릭해서 과일 따기!
        this.hitbox.addEventListener('click', () => {
            if (this.isRipe) this.harvest();
        });
    }

    startGrowing(isUnlocked) {
        if (!isUnlocked) return; // 아직 안 샀으면 안자람
        this.element.classList.remove('locked');
        if (this.timer) clearInterval(this.timer);
        this.progress = 0;
        this.isRipe = false;
        this.hitbox.classList.remove('ripe');
        this.fillBar.style.width = '0%';

        this.timer = setInterval(() => {
            if (this.isRipe) return;
            this.progress += (100 / (this.growTime * 10)); // 0.1초마다 오름

            if (this.progress >= 100) {
                this.progress = 100;
                this.isRipe = true; // 다 자랐다!
                this.hitbox.classList.add('ripe');
                clearInterval(this.timer);
            }
            this.fillBar.style.width = this.progress + '%';
        }, 100);
    }

    harvest() {
        if (!this.isRipe) return; // 덜 자랐으면 못땀
        playSound(sfxPop);
        pandaSay(`${this.type === 'strawberry' ? '딸기' : '청포도'}를 하나 수확했어! 🧺`);

        // 바구니에 과일 추가
        inventory[this.type]++;
        updateUI();

        // 처음부터 다시 키우기
        this.startGrowing(true);
    }
}

// 식물들 생성 (딸기는 3초, 포도는 5초 걸려요, 보라 포도는 7초)
const strawberryPlant = new Plant('strawberry-plant', 'strawberry', 3);
const grapePlant = new Plant('grape-plant', 'grape', 5);
const purpleGrapePlant = new Plant('purple-grape-plant', 'purple_grape', 7);

// 게임 시작 시 식물 키우기 시작! (딸기만)
strawberryPlant.startGrowing(true);

// -- 주방 (꼬치 꽂기) 로직 --
const skewerContainer = document.getElementById('skewerFruits');
const syrupCoating = document.getElementById('syrupCoating');
const syrupBtn = document.getElementById('syrupBtn');
const sellBtn = document.getElementById('sellBtn');
const trashBtn = document.getElementById('trashBtn');

// 과일 사진 경로
const fruitImages = {
    strawberry: 'assets/tanghulu/strawberry.png',
    grape: 'assets/tanghulu/grape.png',
    purple_grape: 'assets/tanghulu/purple_grape.png'
};
// 과일 1개당 가격 (유튜브 좋아요!)
const fruitPrices = {
    strawberry: 10,
    grape: 20,
    purple_grape: 50
};

// UI 업데이트 마법 (바구니 개수랑 동전 새로고침)
function updateUI() {
    document.getElementById('coinCount').innerText = coins;
    document.getElementById('inv-strawberry').innerText = inventory.strawberry;
    document.getElementById('inv-grape').innerText = inventory.grape;
    document.getElementById('inv-purple_grape').innerText = inventory.purple_grape;

    // 시럽 버튼 쓸 수 있는지 확인 (꼬치에 1개라도 있고 코팅 안되었을때)
    syrupBtn.disabled = (skewerFruits.length === 0 || isCoated);
}

// 바구니에서 과일 클릭해서 꼬치에 꽂기
document.querySelectorAll('.inv-slot').forEach(slot => {
    slot.addEventListener('click', () => {
        const type = slot.getAttribute('data-type');

        // 잠겨있거나, 다 코팅했거나 막혔으면 못꽂음
        if (slot.classList.contains('locked')) return;
        if (isCoated) {
            pandaSay('코팅이 끝난 탕후루야! 먼저 손님에게 팔아줘! 🧑‍🍳');
            return;
        }
        if (skewerFruits.length >= MAX_SKEWER) {
            pandaSay('앗! 꼬치가 너무 꽉 찼어! 더 이상 못 꽂아! 🍡');
            return;
        }
        if (inventory[type] <= 0) {
            pandaSay('바구니에 과일이 부족해! 농장에 가서 더 따와야 해! 🌳');
            return;
        }

        // 바구니에서 1개 빼고 꼬치에 넣기
        inventory[type]--;
        skewerFruits.push(type);
        playSound(sfxPop);

        // 화면에 그리기
        renderSkewer();
        updateUI();
    });
});

// 꼬치 화면에 예쁘게 그리기
function renderSkewer() {
    skewerContainer.innerHTML = ''; // 다 지우고 다시 부착!
    // 아래에서 위로 쌓기 위해 flex-direction: column-reverse를 CSS에 적용함

    skewerFruits.forEach((fruitType, index) => {
        const img = document.createElement('img');
        img.src = fruitImages[fruitType];
        img.className = 'skewer-fruit-img';
        img.style.animationDelay = `${index * 0.05}s`;
        // 포도는 작으니까 크기 조정
        if (fruitType === 'grape' || fruitType === 'purple_grape') {
            img.style.width = '70px';
            img.style.height = '70px';
        }
        skewerContainer.appendChild(img);
    });
}

// 다 지우고 처음부터 다시!
trashBtn.addEventListener('click', () => {
    // 꽂혀있는 거 다시 바구니로 반환
    if (!isCoated) {
        skewerFruits.forEach(f => inventory[f]++);
    }
    resetSkewer();
    pandaSay('꼬치를 비웠어! 다시 만들어보자!');
});

function resetSkewer() {
    skewerFruits = [];
    isCoated = false;
    skewerContainer.classList.remove('coated');
    sellBtn.style.display = 'none';
    syrupBtn.style.display = 'inline-block';
    renderSkewer();
    updateUI();
}

// 🍯 시럽 바르기 (탕후루 얍!)
syrupBtn.addEventListener('click', () => {
    if (skewerFruits.length === 0) return;
    isCoated = true;
    skewerContainer.classList.add('coated');
    playSound(sfxSyrup);
    pandaSay('와~ 반짝반짝 빛나는 탕후루 완성! ✨ 얼른 팔아보자!');

    updateUI();
    syrupBtn.style.display = 'none';
    sellBtn.style.display = 'inline-block'; // 팔기 버튼 두둥 등장!
});

// 💸 유튜브에 올려서 좋아요(돈) 받기!
sellBtn.addEventListener('click', () => {
    let totalPrice = 0;
    skewerFruits.forEach(fruit => {
        totalPrice += fruitPrices[fruit];
    });
    // 시럽을 바르면 가격이 2배! 조회수 대박, 먹방 음식 시켰으면 버프까지!
    let finalViews = Math.floor(totalPrice * 2 * mukbangBuff);

    coins += finalViews;
    playSound(sfxCoin);

    if (mukbangBuff > 1) {
        pandaSay(`[${currentFood} + 탕후루 먹방] 유튜브 대박! 조회수가 폭발해서 💰 ${finalViews} 코인을 벌었어! 🐼🌶️`);
        mukbangBuff = 1; // 소화 완료!
        currentFood = "";
    } else {
        pandaSay(`유튜브 조회수 대박! 좋아요를 받아 💰 ${finalViews} 코인을 벌었어! 🐼👍`);
    }

    resetSkewer();
});


// -- 상점 로직 --
document.querySelector('.buy-btn[data-item="grape"]').addEventListener('click', (e) => {
    const price = parseInt(e.target.getAttribute('data-price'));
    const btn = e.target;

    if (unlocked.grape) return; // 이미 삼

    if (coins >= price) {
        // 구매 성공!
        coins -= price;
        unlocked.grape = true;
        playSound(sfxCoin);

        btn.innerText = '구매 완료 (장착됨)';
        btn.classList.add('purchased');

        // 포도 농장 & 바구니 잠금 해제
        document.getElementById('inv-grape-box').classList.remove('locked');
        document.getElementById('grape-plant').querySelector('.plant-label').innerText = '청포도 넝쿨';
        grapePlant.startGrowing(true); // 이제 자란다!

        pandaSay('이제 상큼한 청포도 탕후루도 만들 수 있어! 🍇');
        updateUI();
    } else {
        pandaSay(`앗.. 코인이 모자라! 탕후루 영상을 더 올려야 해! (현재: ${coins} / 필요: ${price}) 😭`);
    }
});

document.querySelector('.buy-btn[data-item="purple_grape"]').addEventListener('click', (e) => {
    const price = parseInt(e.target.getAttribute('data-price'));
    const btn = e.target;

    if (unlocked.purple_grape) return;

    if (coins >= price) {
        coins -= price;
        unlocked.purple_grape = true;
        playSound(sfxCoin);

        btn.innerText = '구매 완료 (장착됨)';
        btn.classList.add('purchased');

        document.getElementById('inv-purple-grape-box').classList.remove('locked');
        document.getElementById('purple-grape-plant').querySelector('.plant-label').innerText = '보라 포도나무';
        purpleGrapePlant.startGrowing(true);

        pandaSay('이제 달콤한 보라 포도 탕후루도 만들 수 있어! 🍇💜');
        updateUI();
    } else {
        pandaSay(`엇.. 돈이 부족해! (현재: ${coins} / 필요: ${price})`);
    }
});

// 스마트폰 배달앱 모달!
const phoneAppBtn = document.getElementById('phoneAppBtn');
const deliveryModal = document.getElementById('deliveryModal');
const closePhoneBtn = document.getElementById('closePhoneBtn');

phoneAppBtn.addEventListener('click', () => {
    deliveryModal.classList.add('show');
    playSound(sfxPop);
});

closePhoneBtn.addEventListener('click', () => {
    deliveryModal.classList.remove('show');
    playSound(sfxPop);
});

// 메뉴 주문 버튼 요정
document.querySelectorAll('.order-food-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const price = parseInt(btn.dataset.price);
        const buff = parseFloat(btn.dataset.buff);
        const food = btn.dataset.food;
        const icon = btn.dataset.icon;

        if (coins >= price) {
            coins -= price;
            mukbangBuff = buff;
            currentFood = food;
            playSound(sfxCoin);
            deliveryModal.classList.remove('show');

            // 배달 오고 나서 바로 먹방 애니메이션!
            pandaSay(`오토바이 요정이 [${food}]을(를) 배달해줬어! 🏍️ 냠냠 먹방 시작!`);

            const eatOverlay = document.getElementById('eatOverlay');
            const eatEmoji = document.getElementById('eatEmoji');
            eatEmoji.innerText = icon;
            eatOverlay.classList.add('show');

            // 냠냠 애니메이션 재설정 (class 다시 붙이기)
            eatEmoji.classList.remove('animating');
            void eatEmoji.offsetWidth; // 브라우저 리플로우
            eatEmoji.classList.add('animating');

            // 냠냠 쩝쩝 소리! (pop-sound 여러번 재생)
            let munchCount = 0;
            const munchTimer = setInterval(() => {
                playSound(sfxPop);
                munchCount++;
                if (munchCount > 5) clearInterval(munchTimer);
            }, 300);

            // 2초 뒤 꺼짐
            setTimeout(() => {
                eatOverlay.classList.remove('show');
                pandaSay(`으아 배부르다! 😋 맛있는 [${food}] 먹고 힘났어! 유튜브 영상 조회수 폭발할 듯! 🚀`);
            }, 2000);

            updateUI();
        } else {
            pandaSay(`앗, 메뉴를 시킬 코인이 모자라! (현재: ${coins} / 필요: ${price})`);
        }
    });
});

// 초기UI 업데이트
updateUI();
