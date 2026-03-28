import { db, ref, set, onValue, update, get, child } from './firebase-config.js';

// --- Game State (Ladder) ---

export function subscribeToGame(roomId, callback) {
    const gameRef = ref(db, `games/${roomId}`);
    onValue(gameRef, (snapshot) => {
        const data = snapshot.val();
        callback(data);
    });
}

export function updateGameState(roomId, state) {
    const gameRef = ref(db, `games/${roomId}`);
    update(gameRef, state);
}

export function resetGame(roomId, initialData) {
    const gameRef = ref(db, `games/${roomId}`);
    set(gameRef, initialData);
}

// --- Goals (Checklist) ---

export function subscribeToGoals(year, month, callback) {
    const goalsRef = ref(db, `goals/${year}/${month}`);
    onValue(goalsRef, (snapshot) => {
        const data = snapshot.val();
        callback(data);
    });
}

// Use 'shared' as a common user ID for everyone
const SHARED_USER = 'family_shared';

export function toggleGoal(year, month, day, userId, goalId, isChecked) {
    const goalRef = ref(db, `goals/${year}/${month}/${day}/${SHARED_USER}/${userId}/${goalId}`);
    set(goalRef, isChecked);
}

export function getGoals(year, month) {
    const dbRef = ref(db);
    return get(child(dbRef, `goals/${year}/${month}`)).then((snapshot) => {
        if (snapshot.exists()) {
            // Transform data structure to match expected format in main.js
            // Original: goals/yyyy/mm/dd/userId/goalId
            // New: goals/yyyy/mm/dd/SHARED_USER/userId/goalId
            // We need to return data such that main.js can access it via [dd][childName][taskId]
            // So we return the content of SHARED_USER
            const data = snapshot.val();
            const transformed = {};

            Object.keys(data).forEach(day => {
                if (data[day] && data[day][SHARED_USER]) {
                    transformed[day] = data[day][SHARED_USER];
                }
            });
            return transformed;
        } else {
            return null;
        }
    }).catch((error) => {
        console.error(error);
    });
}

// --- Tasks (Settings) ---

export function getTaskSettings(childName) {
    const dbRef = ref(db);
    return get(child(dbRef, `settings/tasks/${childName}`)).then((snapshot) => {
        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            return null;
        }
    }).catch((error) => {
        console.error(error);
    });
}

export function saveTaskSettings(childName, tasks) {
    const tasksRef = ref(db, `settings/tasks/${childName}`);
    set(tasksRef, tasks);
}

// --- Wallet ---

export function getWalletBalance(childName) {
    const dbRef = ref(db);
    return get(child(dbRef, `wallet/${childName}`)).then((snapshot) => {
        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            return 0;
        }
    }).catch((error) => {
        console.error("Wallet Error:", error);
        return 0; // Default to 0 on error
    });
}

export function updateWalletBalance(childName, amount) {
    const walletRef = ref(db, `wallet/${childName}`);
    set(walletRef, amount);
}


export function getGoalsRange(startDate, endDate) {
    const dbRef = ref(db);
    const year = startDate.getFullYear();
    const month = String(startDate.getMonth() + 1).padStart(2, '0');

    return get(child(dbRef, `goals/${year}/${month}`)).then((snapshot) => {
        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            return null;
        }
    });
}

// ============================================================
// Anniversaries & Holidays
// ============================================================
export const FIXED_HOLIDAYS = {
    "01-01": "신정",
    "03-01": "3.1절",
    "05-05": "어린이날",
    "06-06": "현충일",
    "08-15": "광복절",
    "10-03": "개천절",
    "10-09": "한글날",
    "12-25": "크리스마스",
    "2026-02-16": "설날 연휴",
    "2026-02-17": "설날",
    "2026-02-18": "설날 연휴",
    "2025-01-28": "설날 연휴",
    "2025-01-29": "설날",
    "2025-01-30": "설날 연휴"
};

export function getAnniversaries() {
    const dbRef = ref(db);
    return get(child(dbRef, 'settings/anniversaries')).then(snapshot => {
        return snapshot.exists() ? snapshot.val() : [];
    }).catch(e => []);
}

export function saveAnniversaries(list) {
    const annRef = ref(db, 'settings/anniversaries');
    return set(annRef, list);
}
