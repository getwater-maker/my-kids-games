import { getGoals, toggleGoal, getTaskSettings, getWalletBalance, updateWalletBalance, FIXED_HOLIDAYS, getAnniversaries, saveAnniversaries } from './db.js';

let currentSchedulerDate = new Date(); // Tracks the week
let taskSettings = {};

const HOLIDAYS = {
    "01-01": "신정",
    "03-01": "3.1절",
    "05-05": "어린이날",
    "06-06": "현충일",
    "08-15": "광복절",
    "10-03": "개천절",
    "10-09": "한글날",
    "12-25": "크리스마스"
};

// --- Exports ---
export function openScheduler() {
    document.getElementById('scheduler-modal').classList.remove('hidden');
    renderScheduler();
}

export function closeScheduler() {
    document.getElementById('scheduler-modal').classList.add('hidden');
}

export function changeSchedulerDate(weeks) {
    currentSchedulerDate.setDate(currentSchedulerDate.getDate() + (weeks * 7));
    renderScheduler();
}

// --- Rendering ---
async function renderScheduler() {
    const grid = document.getElementById('scheduler-grid');
    if (!grid) return;

    // Find Sunday of current week view
    const startOfWeek = new Date(currentSchedulerDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);

    grid.innerHTML = '';

    // Day Headers
    const dayNames = ['주일', '월', '화', '수', '목', '금', '토'];
    dayNames.forEach((d, i) => {
        const header = document.createElement('div');
        header.className = `day-header ${i === 0 ? 'sun' : ''} ${i === 6 ? 'sat' : ''}`;
        header.innerText = d;
        grid.appendChild(header);
    });

    const currentChild = window.currentSchedulerChild || '한봄';

    // Load Data Paralelly
    const [tasks, anniversaries, ...weekGoals] = await Promise.all([
        getTaskSettings(currentChild),
        getAnniversaries(),
        ...Array.from({ length: 7 }, (_, i) => {
            const d = new Date(startOfWeek);
            d.setDate(d.getDate() + i);
            return getGoals(d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'));
        })
    ]);

    const taskList = tasks || [];
    // Calculate Monthly Total (Requires Fetching entire month? Or just local week?)
    // Requirement: "Wallet resets on 1st". 
    // We will show "This Month's Reward".
    // For performance, we might just calculate based on visible week or fetch month summary?
    // Let's rely on getWalletBalance for "Current Balance" and maybe add a "Reset" button in settings?
    // Or just fetch getWalletBalance as "Total" and say "Start of Month" is handled via manual reset or smart logic.
    // User: "Cumulative amount should reset".
    // I will add logic: new month -> balance becomes 0? No, that deletes money.
    // It means "Monthly Allowance Calculation".
    // I'll stick to displaying current balance. A 'Reset' button is safer.

    // Render 7 Days
    for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(d.getDate() + i);

        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const countDateStr = `${yyyy}-${mm}-${dd}`;
        const holidayKey = `${mm}-${dd}`; // MM-DD

        const col = document.createElement('div');
        col.className = 'day-column';
        if (countDateStr === toDateString(new Date())) col.classList.add('today');

        // 1. Date Label Area (Fixed Height for alignment)
        const dateArea = document.createElement('div');
        dateArea.className = 'date-area';

        const dateLabel = document.createElement('div');
        dateLabel.className = 'date-label';
        if (d.getDay() === 0) dateLabel.classList.add('sun-text');
        if (d.getDay() === 6) dateLabel.classList.add('sat-text');
        dateLabel.innerText = `${d.getMonth() + 1}.${d.getDate()}`;
        dateArea.appendChild(dateLabel);

        // 2. Holiday/Anniversary label (always reserve space)
        let holidayText = FIXED_HOLIDAYS[holidayKey] || FIXED_HOLIDAYS[countDateStr];
        if (!holidayText && anniversaries) {
            const ann = anniversaries.find(a => a.date === holidayKey);
            if (ann) holidayText = ann.name;
        }

        const hol = document.createElement('div');
        hol.className = 'holiday-label';
        if (holidayText) {
            hol.innerText = holidayText;
            dateLabel.classList.add('sun-text');
        } else {
            hol.innerHTML = '&nbsp;';
        }
        dateArea.appendChild(hol);

        col.appendChild(dateArea);

        // 3. Tasks Area
        const savedData = weekGoals[i] || {};
        const dayData = savedData[dd] && savedData[dd][currentChild] ? savedData[dd][currentChild] : {};

        taskList.forEach(task => {
            const currentVal = dayData[task.id];
            let count = 0;
            if (currentVal === true) count = 1;
            else if (typeof currentVal === 'number') count = currentVal;

            const isDone = count > 0;

            const taskItem = document.createElement('div');
            taskItem.className = `task-item ${isDone ? 'done' : ''}`;
            taskItem.id = `task-${yyyy}-${mm}-${dd}-${currentChild}-${task.id}`;

            taskItem.innerHTML = `
                <div class="task-row">
                    <span class="task-name">${task.name}</span>
                    <div class="task-qty-ctrl">
                        <button class="btn-micro qty-minus" onclick="updateTaskQty('${yyyy}', '${mm}', '${dd}', '${currentChild}', '${task.id}', ${task.reward}, -1)">−</button>
                        <span class="qty-val">${count}</span>
                        <button class="btn-micro qty-plus" onclick="updateTaskQty('${yyyy}', '${mm}', '${dd}', '${currentChild}', '${task.id}', ${task.reward}, 1)">+</button>
                    </div>
                </div>
            `;
            col.appendChild(taskItem);
        });

        grid.appendChild(col);
    } // End Loop

    // Update Header Info
    const monthBtn = document.getElementById('scheduler-month');
    monthBtn.innerText = `${startOfWeek.getFullYear()}.${startOfWeek.getMonth() + 1}`;
    monthBtn.onclick = () => {
        const newDateStr = prompt("이동할 년-월을 입력하세요 (예: 2026-02)", `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}`);
        if (newDateStr && newDateStr.match(/^\d{4}-\d{2}$/)) {
            const [y, m] = newDateStr.split('-');
            currentSchedulerDate = new Date(parseInt(y), parseInt(m) - 1, 1);
            renderScheduler();
        }
    };

    const balance = await getWalletBalance(currentChild);
    document.getElementById('scheduler-wallet').innerText = balance.toLocaleString() + '원';

    // Calculate weekly settlement
    let weekTotal = 0;
    for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(d.getDate() + i);
        const dd = String(d.getDate()).padStart(2, '0');
        const savedData = weekGoals[i] || {};
        const dayData = savedData[dd] && savedData[dd][currentChild] ? savedData[dd][currentChild] : {};
        taskList.forEach(task => {
            const val = dayData[task.id];
            let count = 0;
            if (val === true) count = 1;
            else if (typeof val === 'number') count = val;
            weekTotal += count * task.reward;
        });
    }
    const weekEl = document.getElementById('week-settlement');
    if (weekEl) weekEl.innerText = weekTotal.toLocaleString() + '원';

    // Calculate monthly settlement
    const monthYear = startOfWeek.getFullYear();
    const monthNum = String(startOfWeek.getMonth() + 1).padStart(2, '0');
    try {
        const monthData = await getGoals(monthYear, monthNum);
        let monthTotal = 0;
        if (monthData) {
            Object.keys(monthData).forEach(dd => {
                const dayData = monthData[dd] && monthData[dd][currentChild] ? monthData[dd][currentChild] : {};
                taskList.forEach(task => {
                    const val = dayData[task.id];
                    let count = 0;
                    if (val === true) count = 1;
                    else if (typeof val === 'number') count = val;
                    monthTotal += count * task.reward;
                });
            });
        }
        const monthEl = document.getElementById('month-settlement');
        if (monthEl) monthEl.innerText = monthTotal.toLocaleString() + '원';
    } catch (e) { console.error('Month settlement error', e); }
}

function toDateString(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Global Handler for Qty Update
window.updateTaskQty = async function (yyyy, mm, dd, childName, taskId, reward, delta) {
    const elId = `task-${yyyy}-${mm}-${dd}-${childName}-${taskId}`;
    const el = document.getElementById(elId);
    if (!el) return;

    const valSpan = el.querySelector('.qty-val');
    const current = parseInt(valSpan.innerText) || 0;

    let next = current + delta;
    if (next < 0) next = 0;

    if (current === next) return;

    // Optimistic UI
    valSpan.innerText = next;
    if (next > 0) el.classList.add('done');
    else el.classList.remove('done');

    // Update DB
    await toggleGoal(yyyy, mm, dd, childName, taskId, next);

    // Update Wallet
    const diff = next - current;
    if (diff !== 0) {
        let balance = parseInt(document.getElementById('scheduler-wallet').innerText.replace(/[^0-9]/g, '')) || 0;
        balance += diff * reward;
        document.getElementById('scheduler-wallet').innerText = balance.toLocaleString() + '원';
        await updateWalletBalance(childName, balance);
    }
}


window.currentSchedulerChild = '한봄';
window.switchSchedulerTab = function (childName) {
    window.currentSchedulerChild = childName;
    document.querySelectorAll('.scheduler-tabs .tab-btn').forEach(b => {
        b.classList.toggle('active', b.innerText.includes(childName));
    });
    renderScheduler();
}

window.goToday = function () {
    currentSchedulerDate = new Date();
    renderScheduler();
};

window.showSettlement = function (type) {
    const el = document.getElementById(type === 'week' ? 'week-settlement' : 'month-settlement');
    if (el) alert(`${type === 'week' ? '주간' : '월간'} 정산: ${el.innerText}`);
};

// ============================================================
// Anniversary Management
// ============================================================
let cachedAnniversaries = [];

window.openAnniversaryModal = async function () {
    document.getElementById('anniversary-modal').classList.remove('hidden');
    cachedAnniversaries = (await getAnniversaries()) || [];
    if (!Array.isArray(cachedAnniversaries)) cachedAnniversaries = [];
    renderAnniversaryList();
};

window.closeAnniversaryModal = function () {
    document.getElementById('anniversary-modal').classList.add('hidden');
    renderScheduler();
};

function renderAnniversaryList() {
    const listEl = document.getElementById('anniversary-list');
    if (!listEl) return;

    if (cachedAnniversaries.length === 0) {
        listEl.innerHTML = '<p style="text-align:center;color:#999">등록된 기념일이 없습니다</p>';
        return;
    }

    listEl.innerHTML = '';
    cachedAnniversaries.forEach((ann, idx) => {
        const item = document.createElement('div');
        item.className = 'anniversary-item';
        item.innerHTML = `
            <span class="ann-date">${ann.date}</span>
            <span class="ann-name">${ann.name}</span>
            <button class="delete-btn" onclick="deleteAnniversary(${idx})">삭제</button>
        `;
        listEl.appendChild(item);
    });
}

window.addAnniversary = async function () {
    const dateInput = document.getElementById('new-ann-date');
    const nameInput = document.getElementById('new-ann-name');

    const date = dateInput.value.trim();
    const name = nameInput.value.trim();

    if (!date || !name) {
        alert('날짜와 이름을 모두 입력해주세요.');
        return;
    }

    if (!/^\d{2}-\d{2}$/.test(date)) {
        alert('날짜 형식은 MM-DD 입니다. (예: 03-15)');
        return;
    }

    const [mm, dd] = date.split('-').map(Number);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) {
        alert('올바른 날짜를 입력해주세요.');
        return;
    }

    cachedAnniversaries.push({ date, name });
    await saveAnniversaries(cachedAnniversaries);
    renderAnniversaryList();

    dateInput.value = '';
    nameInput.value = '';
};

window.deleteAnniversary = async function (index) {
    if (!confirm(`"${cachedAnniversaries[index].name}" 기념일을 삭제하시겠습니까?`)) return;
    cachedAnniversaries.splice(index, 1);
    await saveAnniversaries(cachedAnniversaries);
    renderAnniversaryList();
};

// Assign globals
window.openScheduler = openScheduler;
window.closeScheduler = closeScheduler;
window.changeSchedulerDate = changeSchedulerDate;
window.refreshScheduler = renderScheduler;
