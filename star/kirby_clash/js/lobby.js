// js/lobby.js

// 웨이들 디 클릭 시 보석 사과 획득 로직
document.getElementById('waddle-dee').addEventListener('click', function (e) {
    // 사과 획득
    state.inventory.apples += 1;
    updateLobbyUI();

    // 텍스트 연출
    const waddleContainer = this;
    const textSpan = document.createElement('div');
    textSpan.innerText = '+1 🍎';
    textSpan.style.position = 'absolute';
    textSpan.style.color = '#ff3333';
    textSpan.style.fontWeight = 'bold';
    textSpan.style.fontSize = '24px';
    textSpan.style.pointerEvents = 'none';

    // 약간 랜덤한 위치에 표시
    const offsetX = (Math.random() - 0.5) * 50;
    const offsetY = (Math.random() - 0.5) * 50;

    // 부모 컨테이너 기준 상대 위치
    textSpan.style.left = `calc(50% + ${offsetX}px)`;
    textSpan.style.top = `calc(50% - 50px + ${offsetY}px)`;
    textSpan.style.transition = 'all 1s ease-out';

    waddleContainer.appendChild(textSpan);

    // 잠시 후 위로 떠오르며 사라지는 애니메이션
    setTimeout(() => {
        textSpan.style.transform = 'translateY(-50px)';
        textSpan.style.opacity = '0';
    }, 10);

    setTimeout(() => {
        if (waddleContainer.contains(textSpan)) {
            waddleContainer.removeChild(textSpan);
        }
    }, 1000);
});

// 업그레이드 비용 계산 함수
function getUpgradeCost(type) {
    const level = state.upgrades[type];
    const appleCost = 10 * level;
    const fossilCost = 5 * level;
    return { appleCost, fossilCost };
}

// 상점 업그레이드 함수
function buyUpgrade(type) {
    const cost = getUpgradeCost(type);

    // 필요 자원 확인
    let hasEnough = false;
    if (state.inventory.apples < cost.appleCost) {
        alert("보석 사과가 부족합니다!");
        return;
    }

    if (type === 'atk') {
        if (state.inventory.fire >= cost.fossilCost) {
            state.inventory.fire -= cost.fossilCost;
            hasEnough = true;
        } else {
            alert("불의 화석이 부족합니다!");
        }
    } else if (type === 'hp') {
        if (state.inventory.water >= cost.fossilCost) {
            state.inventory.water -= cost.fossilCost;
            hasEnough = true;
        } else {
            alert("물의 화석이 부족합니다!");
        }
    } else if (type === 'heal') {
        if (state.inventory.light >= cost.fossilCost) {
            state.inventory.light -= cost.fossilCost;
            hasEnough = true;
        } else {
            alert("빛의 화석이 부족합니다!");
        }
    }

    if (hasEnough) {
        state.inventory.apples -= cost.appleCost;
        state.upgrades[type]++;
        updateLobbyUI();
        updateUpgradeButtons();

        // 시각적 이펙트
        const btn = document.getElementById(`upg-${type}`);
        btn.style.transform = 'scale(1.1)';
        btn.style.borderColor = '#55ff55';
        setTimeout(() => {
            btn.style.transform = '';
            btn.style.borderColor = '';
        }, 200);
    }
}

// 업그레이드 버튼 비용 텍스트 업데이트
function updateUpgradeButtons() {
    ['atk', 'hp', 'heal'].forEach(type => {
        const btn = document.getElementById(`upg-${type}`);
        const cost = getUpgradeCost(type);
        let fossilIcon = '🔥';
        if (type === 'hp') fossilIcon = '💧';
        if (type === 'heal') fossilIcon = '✨';

        // 버튼 안의 small 태그 찾아서 업데이트
        const smallText = btn.querySelector('small');
        if (smallText) {
            smallText.innerText = `비용: ${fossilIcon}${cost.fossilCost} 🍎${cost.appleCost}`;
        }
    });
}

// 초기 호출
const originalUpdateLobbyUI = window.updateLobbyUI;
window.updateLobbyUI = function () {
    if (originalUpdateLobbyUI) originalUpdateLobbyUI();
    updateUpgradeButtons();
};

// 보스 선택 함수
function selectBoss(bossId) {
    state.selectedBoss = bossId;

    // UI 업데이트
    document.querySelectorAll('.boss-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const activeBtn = document.getElementById(`boss-btn-${bossId}`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}
