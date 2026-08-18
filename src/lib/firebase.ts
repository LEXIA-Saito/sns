import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db: Database = getDatabase(
  app,
  firebaseConfig.databaseURL || "https://placeholder.firebaseio.com"
);
export const storage: FirebaseStorage = getStorage(app);
/**
 * Auth はクライアントでのみ、かつ設定が入っているときだけ初期化する。
 * （未設定の環境でモジュール読み込み時に落ちるのを避けるため）
 */
let authInstance: Auth | null = null;

export function getAuthOrNull(): Auth | null {
  if (typeof window === "undefined") return null;
  if (!firebaseConfig.apiKey || !firebaseConfig.appId) return null;
  if (!authInstance) authInstance = getAuth(app);
  return authInstance;
}
export default app;
