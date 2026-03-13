// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCo7X5xrODxRe9-tcnxrsvyym9hBrVEGeQ",
    authDomain: "my-family-kids.firebaseapp.com",
    // Inferring databaseURL from projectId. If this is incorrect, the user might need to update it.
    databaseURL: "https://my-family-kids-default-rtdb.firebaseio.com",
    projectId: "my-family-kids",
    storageBucket: "my-family-kids.firebasestorage.app",
    messagingSenderId: "452897566170",
    appId: "1:452897566170:web:a13772232c25a3bbb424e3",
    measurementId: "G-DX48ZKCE36"
};

// Initialize Firebase with CDN links (No bundler required)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, onValue, update, push, child, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();

export { app, auth, db, provider, signInWithPopup, signOut, onAuthStateChanged, ref, set, onValue, update, push, child, get };