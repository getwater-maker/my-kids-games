const state = {
    patient: null,
    symptoms: {
        fever: false, // Need icepack
        heartbeat: false, // Need stethoscope (maybe just listening)
        tempCheck: false, // Need thermometer
        injury: false, // Need bandage
        lowEnergy: false, // Need medicine
    },
    fixed: {
        fever: false,
        heartbeat: false,
        tempCheck: false,
        injury: false,
        lowEnergy: false
    },
    selectedTool: null,
    diagnosisDone: false
};

const patients = {
    bear: { icon: "🐻", name: "곰돌이", msg: "머리가 뜨거워요... 🐻" },
    rabbit: { icon: "🐰", name: "토끼", msg: "가슴이 콩닥거려요... 🐰" },
    fox: { icon: "🦊", name: "여우", msg: "다리를 다쳤어요... 🦊" }
};

const els = {
    patientSprite: document.getElementById('patient-sprite'),
    patientArea: document.getElementById('patient-area'),
    statusBubble: document.getElementById('status-bubble'),
    toolBtns: document.querySelectorAll('.tool-btn'),
    reportCard: document.getElementById('report-card'),
    cureBtn: document.getElementById('cure-btn'),
    toast: document.getElementById('toast'),
    treatmentEffect: document.getElementById('treatment-effect')
};

// Initialize
function init() {
    setupEventListeners();
}

function setupEventListeners() {
    // Tool buttons
    els.toolBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!state.patient) {
                showToast("먼저 환자를 선택해주세요!");
                return;
            }
            els.toolBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.selectedTool = btn.getAttribute('data-tool');
        });
    });

    // Patient selection (delegation)
    els.patientSprite.addEventListener('click', (e) => {
        const choice = e.target.closest('.patient-choice');
        if (choice && !state.patient) {
            selectPatient(choice.getAttribute('data-id'));
        }
    });

    // Interaction with patient
    els.patientArea.addEventListener('mousedown', handlePatientInteraction);

    els.cureBtn.addEventListener('click', resetGame);
}

function selectPatient(id) {
    state.patient = patients[id];
    
    // UI Update
    els.patientSprite.classList.remove('patient-select-mode');
    els.patientSprite.innerHTML = state.patient.icon;
    els.patientSprite.style.fontSize = "15rem";
    
    // Status bubble
    els.statusBubble.classList.remove('hidden');
    els.statusBubble.innerText = state.patient.msg;

    // Generate random symptoms based on patient type or random
    generateSymptoms(id);
    updateReport();
}

function generateSymptoms(id) {
    // Basic symptoms for each
    if (id === 'bear') {
        state.symptoms.fever = true;
        state.symptoms.tempCheck = true;
    } else if (id === 'rabbit') {
        state.symptoms.heartbeat = true;
        state.symptoms.lowEnergy = true;
    } else if (id === 'fox') {
        state.symptoms.injury = true;
        state.symptoms.tempCheck = true;
    }
}

function updateReport() {
    if (!state.patient) return;

    let html = `<h3>${state.patient.name}님의 상태</h3><br>`;
    
    if (state.symptoms.tempCheck) {
        html += `<div class="report-item"><strong>체온:</strong> <span>${state.fixed.tempCheck ? '36.5도 (정상) ✅' : '39.2도 (고열) 🌡️'}</span></div>`;
    }
    if (state.symptoms.fever) {
        html += `<div class="report-item"><strong>이마:</strong> <span>${state.fixed.fever ? '시원해요 ✅' : '너무 뜨거워요! 🧊 필요'}</span></div>`;
    }
    if (state.symptoms.heartbeat) {
        html += `<div class="report-item"><strong>심장:</strong> <span>${state.fixed.heartbeat ? '두근두근 (정상) ✅' : '너무 빨라요! 🩺 필요'}</span></div>`;
    }
    if (state.symptoms.injury) {
        html += `<div class="report-item"><strong>상처:</strong> <span>${state.fixed.injury ? '나았어요 ✅' : '아야! 아파요 🩹 필요'}</span></div>`;
    }
    if (state.symptoms.lowEnergy) {
        html += `<div class="report-item"><strong>기운:</strong> <span>${state.fixed.lowEnergy ? '팔팔해요 ✅' : '기운이 없어요 🧪 필요'}</span></div>`;
    }

    els.reportCard.innerHTML = html;

    // Check if all cured
    checkIfAllCured();
}

function handlePatientInteraction(e) {
    if (!state.selectedTool || !state.patient) return;

    const tool = state.selectedTool;
    let success = false;
    let msg = "";

    if (tool === 'thermometer' && state.symptoms.tempCheck) {
        state.fixed.tempCheck = true;
        success = true;
        msg = "체온을 쟀어요! 🌡️";
    } else if (tool === 'icepack' && state.symptoms.fever) {
        state.fixed.fever = true;
        success = true;
        msg = "이마가 시원해졌어요! 🧊";
    } else if (tool === 'stethoscope' && state.symptoms.heartbeat) {
        state.fixed.heartbeat = true;
        success = true;
        msg = "심장 소리가 좋아졌어요! 🩺";
        els.patientSprite.classList.add('patient-heartbeat');
        setTimeout(() => els.patientSprite.classList.remove('patient-heartbeat'), 2000);
    } else if (tool === 'bandage' && state.symptoms.injury) {
        state.fixed.injury = true;
        success = true;
        msg = "밴드를 붙여줬어요! 🩹";
    } else if (tool === 'medicine' && state.symptoms.lowEnergy) {
        state.fixed.lowEnergy = true;
        success = true;
        msg = "꿀꺽꿀꺽! 기운이 나요! 🧪";
    }

    if (success) {
        showTreatmentEffect(e.clientX, e.clientY);
        showToast(msg);
        updateReport();
        
        // Remove active tool
        els.toolBtns.forEach(b => b.classList.remove('active'));
        state.selectedTool = null;
    } else {
        showToast("다른 도구가 필요할 것 같아요!");
    }
}

function showTreatmentEffect(x, y) {
    els.treatmentEffect.style.left = (x - 40) + 'px';
    els.treatmentEffect.style.top = (y - 40) + 'px';
    els.treatmentEffect.classList.remove('hidden');
    
    setTimeout(() => {
        els.treatmentEffect.classList.add('hidden');
    }, 800);
}

function checkIfAllCured() {
    let allCured = true;
    for (let key in state.symptoms) {
        if (state.symptoms[key] && !state.fixed[key]) {
            allCured = false;
            break;
        }
    }

    if (allCured && state.patient) {
        els.statusBubble.innerText = "와! 선생님 감사합니다! 다 나았어요! 😊";
        els.patientSprite.innerHTML = state.patient.icon.replace(state.patient.icon, state.patient.icon + "✨");
        els.cureBtn.classList.remove('hidden');
        showToast("치료가 끝났어요! 클릭해서 다음 친구를 만나요.");
    }
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

function resetGame() {
    state.patient = null;
    state.selectedTool = null;
    state.diagnosisDone = false;
    for (let key in state.symptoms) {
        state.symptoms[key] = false;
        state.fixed[key] = false;
    }

    els.patientSprite.classList.add('patient-select-mode');
    els.patientSprite.innerHTML = `
        <div class="patient-selector">
            <div class="patient-choice" data-id="bear">🐻<br><span>곰돌이</span></div>
            <div class="patient-choice" data-id="rabbit">🐰<br><span>토끼</span></div>
            <div class="patient-choice" data-id="fox">🦊<br><span>여우</span></div>
        </div>
    `;
    els.statusBubble.classList.add('hidden');
    els.reportCard.innerHTML = '<p class="empty-msg">환자를 선택해주세요!</p>';
    els.cureBtn.classList.add('hidden');
    els.patientSprite.style.fontSize = "";
}

window.onload = init;
