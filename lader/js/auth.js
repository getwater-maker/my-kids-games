import { auth, provider, signInWithPopup, signOut, onAuthStateChanged } from './firebase-config.js';

let currentUser = null;

export function login() {
    signInWithPopup(auth, provider)
        .then((result) => {
            const user = result.user;
            console.log("Logged in as:", user.displayName);
        }).catch((error) => {
            console.error("Login failed:", error);
            alert("로그인에 실패했습니다.");
        });
}

export function logout() {
    signOut(auth).then(() => {
        console.log("Logged out");
    }).catch((error) => {
        console.error("Logout failed:", error);
    });
}

export function onUserChange(callback) {
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        callback(user);
    });
}

export function getCurrentUser() {
    return currentUser;
}
