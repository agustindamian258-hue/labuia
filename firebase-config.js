import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, browserLocalPersistence, setPersistence } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAqwJAdUyp_oxd4d8qTym-iFScSRzyDKeA",
  authDomain: "labuia.firebaseapp.com",
  projectId: "labuia",
  storageBucket: "labuia.firebasestorage.app",
  messagingSenderId: "386518529061",
  appId: "1:386518529061:web:08c98a6d14eac3d28a7bcc"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export { auth, db, provider, signInWithPopup, signOut, onAuthStateChanged, browserLocalPersistence, setPersistence, doc, setDoc, getDoc };
