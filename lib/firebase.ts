import { initializeApp, getApps, getApp } from "firebase/app"
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore"
import { getAuth, connectAuthEmulator } from "firebase/auth"

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

// Conecta aos emuladores locais quando solicitado via env var
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true") {
  try {
    // Auth emulator padrão: http://localhost:9099
    connectAuthEmulator(auth, "http://localhost:9099")

    // Firestore emulator padrão: localhost:8080
    connectFirestoreEmulator(db, "localhost", 8080)
    // eslint-disable-next-line no-console
    console.info("Firebase: connected to local emulators")
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("Firebase: failed to connect emulators", e)
  }
}