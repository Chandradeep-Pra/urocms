import { initializeApp, getApps, getApp } from "firebase/app"
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
} from "firebase/auth"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
}

const app = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp()

export const auth = getAuth(app)

if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence).catch(() => {
    // Ignore persistence setup failure and fall back to Firebase defaults.
  })
}
