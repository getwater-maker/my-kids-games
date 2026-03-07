// js/main.js
// 글로벌 상태 관리 (State)
const state = {
    screen: 'lobby', // 'lobby', 'battle'
    isCoop: true,
    inventory: {
        apples: 0,
        fire: 0,
        water: 0,
        light: 0
    },
    upgrades: {
        atk: 1, // 불 + 사과
        hp: 1,  // 물 + 사과
        heal: 1 // 빛 + 사과
    },
    selectedBoss: 'whispy'
};

// DOM 요소
const screens = {
    lobby: document.getElementById('lobby-screen'),
    battle: document.getElementById('battle-screen')
};

function switchScreen(screenName) {
    state.screen = screenName;
    Object.values(screens).forEach(screen => {
        if (screen) screen.classList.remove('active');
    });
    if (screens[screenName]) {
        screens[screenName].classList.add('active');
    }
}

// UI 업데이트 함수
function updateLobbyUI() {
    document.getElementById('apple-count').innerText = state.inventory.apples;
    document.getElementById('fire-count').innerText = state.inventory.fire;
    document.getElementById('water-count').innerText = state.inventory.water;
    document.getElementById('light-count').innerText = state.inventory.light;

    document.getElementById('atk-level').innerText = `Lv.${state.upgrades.atk}`;
    document.getElementById('hp-level').innerText = `Lv.${state.upgrades.hp}`;
    document.getElementById('heal-level').innerText = `Lv.${state.upgrades.heal}`;
}

// 초기화
window.onload = () => {
    updateLobbyUI();

    // 버튼 이벤트 리스너
    document.getElementById('start-solo-btn').addEventListener('click', () => {
        state.isCoop = false;
        switchScreen('battle');
        if (typeof startBattle === 'function') {
            startBattle();
        }
    });

    document.getElementById('start-coop-btn').addEventListener('click', () => {
        state.isCoop = true;
        switchScreen('battle');
        if (typeof startBattle === 'function') {
            startBattle();
        }
    });

    document.getElementById('return-lobby-btn').addEventListener('click', () => {
        // 도망치기
        if (typeof endBattle === 'function') endBattle(false);
        switchScreen('lobby');
        updateLobbyUI();
    });

    document.getElementById('result-ok-btn').addEventListener('click', () => {
        document.getElementById('result-modal').classList.add('hidden');
        switchScreen('lobby');
        updateLobbyUI();
    });
};
