import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, orderBy, limit, onSnapshot, runTransaction, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCutshBxnWMlWM1AHTRkrCjPmL4zfYTodk",
  authDomain: "sudoku-race-9e1c5.firebaseapp.com",
  projectId: "sudoku-race-9e1c5",
  storageBucket: "sudoku-race-9e1c5.firebasestorage.app",
  messagingSenderId: "1039543474336",
  appId: "1:1039543474336:web:7a7f18266d10edc5edd1c5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
window.firebaseApp = { app, db, auth, collection, doc, setDoc, getDoc, getDocs, query, orderBy, limit, onSnapshot, runTransaction, updateDoc, serverTimestamp };

window.firebaseReady = new Promise((resolve, reject) => {
  const unsubscribe = onAuthStateChanged(auth, user => {
    if (user) {
      window.currentFirebaseUser = user;
      unsubscribe();
      resolve(user);
    }
  }, reject);
  signInAnonymously(auth).catch(reject);
});
