import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// TODO: Replace 'YOUR_API_KEY_HERE_FROM_CONSOLE' with the actual key from the Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyD18H5hEf-21uow080h5UiQHyLtxljBhwU",
    authDomain: "sniperstrategy-auth.firebaseapp.com",
    projectId: "sniperstrategy-auth",
    storageBucket: "sniperstrategy-auth.firebasestorage.app",
    messagingSenderId: "596199792120",
    appId: "1:596199792120:web:ab0224ce8877176e098a0d",
    measurementId: "G-RX9YDH7W65"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);

export { auth, googleProvider, db, analytics };
