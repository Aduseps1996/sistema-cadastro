import { initializeApp, getApps, getApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getAuth } from "firebase/auth"

const firebaseConfig = {
  apiKey: "AIzaSyBq4aTOugdajKl4i7NvAlHZL90mJqQhSXI",
  authDomain: "painel-tv-98342.firebaseapp.com",
  projectId: "painel-tv-98342",
  storageBucket: "painel-tv-98342.firebasestorage.app",
  messagingSenderId: "735207625095",
  appId: "1:735207625095:web:9bab4d2f50a9cc2a664322"
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

const secondaryApp =
  getApps().find((firebaseApp) => firebaseApp.name === "Secondary") ||
  initializeApp(firebaseConfig, "Secondary")

export const db = getFirestore(app)

export const auth = getAuth(app)

export const secondaryAuth = getAuth(secondaryApp)