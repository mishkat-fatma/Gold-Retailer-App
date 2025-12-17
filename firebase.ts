import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyB06jmmIugP0JbisPzB3Wz6gAxUgD5imow",
  authDomain: "karatpay-pages.firebaseapp.com",
  projectId: "karatpay-pages",
  storageBucket: "karatpay-pages.firebasestorage.app",
  messagingSenderId: "257208317728",
  appId: "1:257208317728:web:6476d4ba0fa8f6ef3ac945",
  measurementId: "G-BZR3JNFNHN"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);