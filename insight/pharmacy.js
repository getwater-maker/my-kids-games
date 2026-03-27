const state = {
    patient: null,
    prescription: {}, // color: count
    bagContents: {}, // color: count
    isComplete: false,
    score: 0
};

const animals = [
    { icon: "🦊", name: "여우", msg: "약국에 왔어요! 🦊" },
    { icon: "🐵", name: "원숭이", msg: "감기에 걸렸어요 🐵" },
    { icon: "🐼", name: "판다", msg: "배가 아파요 🐼" },
    { icon: "🐷", name: "돼지", msg: "콧물이 나요 🐷" }
];

const colors = {
    red: "🔴",
    blue: "🔵",
    yellow: "🟡",
    green: "🟢",
    syrup: "🍼"
};

const els = {
    rxList: document.getElementById('rx-list'),
    patientFace: document.getElementById('patient-face'),
    bagContents: document.getElementById('bag-contents'),
    medicineBag: document.getElementById('medicine-bag'),
    nextPatientBtn: document.getElementById('next-patient-btn'),
    finishBtn: document.getElementById('finish-btn'),
    feedbackMsg: document.getElementById('feedback-msg'),
    doneCount: document.getElementById('done-count'),
    toast: document.getElementById('toast'),
    pills: document.querySelectorAll('.pill, .bottle')
};

function init() {
    setupEventListeners();
    // Start first patient
    newPatient();
}

function setupEventListeners() {
    els.nextPatientBtn.addEventListener('click', newPatient);
    els.finishBtn.addEventListener('click', deliverMedicine);

    // Draggable items
    els.pills.forEach(pill => {
        pill.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('color', pill.getAttribute('data-color'));
            pill.style.opacity = '0.5';
        });
        pill.addEventListener('dragend', () => {
            pill.style.opacity = '1';
        });
    });

    // Drop target
    els.medicineBag.addEventListener('dragover', (e) => {
        e.preventDefault();
        els.medicineBag.style.borderColor = '#20bf6b';
    });

    els.medicineBag.addEventListener('dragleave', () => {
        els.medicineBag.style.borderColor = '#fdcb6e';
    });

    els.medicineBag.addEventListener('drop', (e) => {
        e.preventDefault();
        els.medicineBag.style.borderColor = '#fdcb6e';
        const color = e.dataTransfer.getData('color');
        if (color) addMedicineToBag(color);
    });
}

function newPatient() {
    // Pick random animal
    state.patient = animals[Math.floor(Math.random() * animals.length)];
    els.patientFace.innerHTML = `${state.patient.icon}<span>${state.patient.msg}</span>`;

    // Generate random prescription
    state.prescription = {};
    state.bagContents = {};
    state.isComplete = false;
    
    // Pick 2-3 random medicine types
    const medicineTypes = Object.keys(colors);
    const numTypes = 2 + Math.floor(Math.random() * 2); // 2 or 3
    
    // Shuffle and pick
    const shuffled = medicineTypes.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, numTypes);
    
    selected.forEach(type => {
        state.prescription[type] = 1 + Math.floor(Math.random() * 3); // 1-3
        state.bagContents[type] = 0;
    });

    updateUI();
    els.feedbackMsg.innerText = "처방전에 맞춰 약을 넣어주세요!";
    els.finishBtn.classList.add('hidden');
    els.nextPatientBtn.classList.add('hidden');
}

function addMedicineToBag(color) {
    if (state.isComplete) return;

    // Check if color is in prescription
    if (!state.prescription[color]) {
        els.feedbackMsg.innerText = "앗! 처방전에 없는 약이에요! 😵";
        return;
    }

    // Check if full
    if (state.bagContents[color] >= state.prescription[color]) {
        els.feedbackMsg.innerText = `${colors[color]} 약은 충분히 넣었어요!`;
        return;
    }

    state.bagContents[color]++;
    updateUI();
    checkIfComplete();
}

function updateUI() {
    // Update RX List
    let rxHtml = "";
    Object.keys(state.prescription).forEach(color => {
        const isReady = state.bagContents[color] >= state.prescription[color];
        rxHtml += `
            <div class="rx-item ${isReady ? 'complete' : ''}">
                ${colors[color]} x ${state.prescription[color]}
                <span>${state.bagContents[color]}/${state.prescription[color]}</span>
            </div>
        `;
    });
    els.rxList.innerHTML = rxHtml;

    // Update Bag
    let bagHtml = "";
    Object.keys(state.bagContents).forEach(color => {
        for (let i = 0; i < state.bagContents[color]; i++) {
            bagHtml += `<div class="pill-in-bag">${colors[color]}</div>`;
        }
    });
    els.bagContents.innerHTML = bagHtml;
}

function checkIfComplete() {
    let allReady = true;
    Object.keys(state.prescription).forEach(color => {
        if (state.bagContents[color] < state.prescription[color]) allReady = false;
    });

    if (allReady) {
        state.isComplete = true;
        els.feedbackMsg.innerText = "조제가 완료되었어요! 약을 전달해주세요! ✨";
        els.finishBtn.classList.remove('hidden');
    }
}

function deliverMedicine() {
    state.score++;
    els.doneCount.innerText = state.score;
    
    els.patientFace.innerHTML = `${state.patient.icon}✨<span>감사합니다 약사님!</span>`;
    els.finishBtn.classList.add('hidden');
    els.nextPatientBtn.classList.remove('hidden');
    els.feedbackMsg.innerText = "다음 환자님을 불러볼까요?";
    
    showToast("조제 성공! 💊✨");
}

function showToast(msg) {
    els.toast.innerText = msg;
    els.toast.classList.remove('hidden');
    els.toast.style.opacity = '1';
    
    setTimeout(() => {
        els.toast.style.opacity = '0';
        setTimeout(() => els.toast.classList.add('hidden'), 500);
    }, 1500);
}

window.onload = init;
