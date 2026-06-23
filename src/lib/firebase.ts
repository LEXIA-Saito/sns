import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebase の必須設定(apiKey / appId)が揃っているか
export const firebaseConfigured =
  !!firebaseConfig.apiKey && !!firebaseConfig.appId;

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// apiKey が無いと getAuth() は auth/invalid-api-key を投げるため、
// 未設定時は初期化をスキップする(認証 UI 側で未設定を案内する)。
export const auth: Auth = firebaseConfigured
  ? getAuth(app)
  : (undefined as unknown as Auth);
export const db: Database = getDatabase(
  app,
  firebaseConfig.databaseURL || "https://placeholder.firebaseio.com"
);
export const storage: FirebaseStorage = getStorage(app);
export default app;
