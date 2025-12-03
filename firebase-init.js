// firebase-init.js (paste into your multiplayer branch)
// ---------------------------
// After you create a Firebase web app in the console, replace the firebaseConfig object
// below with the config object provided by Firebase (apiKey, projectId, etc).

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

// --------- paste your config object here ----------
const firebaseConfig = {
    apiKey: "AIzaSyCutshBxnWMlWM1AHTRkrCjPmL4zfYTodk",
    authDomain: "sudoku-race-9e1c5.firebaseapp.com",
    projectId: "sudoku-race-9e1c5",
    storageBucket: "sudoku-race-9e1c5.firebasestorage.app",
    messagingSenderId: "1039543474336",
    appId: "1:1039543474336:web:7a7f18266d10edc5edd1c5",
};
// -------------------------------------------------

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Optional: auto sign-in anonymously for now (so we have an auth user id)
signInAnonymously(auth).catch(err => {
  console.warn("Anonymous sign-in failed:", err);
});

// Expose useful things on window for your app to use
window.firebaseApp = {
  app,
  db,
  auth,
  signInAnonymously,
  onAuthStateChanged
};

// Also expose a helper to watch auth state:
onAuthStateChanged(auth, user => {
  // user will be null when signed out, or an object when signed in (anon uid available)
  window.currentFirebaseUser = user || null;
});
