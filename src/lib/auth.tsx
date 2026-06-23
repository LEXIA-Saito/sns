"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { auth, firebaseConfigured } from "./firebase";

interface AuthContextValue {
  /** ログイン中のユーザー(未ログインは null) */
  user: User | null;
  /** 認証状態の初期判定中かどうか */
  loading: boolean;
  /** Firebase の設定が完了しているか */
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Firebase 未設定なら認証は使えないため、即座に判定終了
    if (!firebaseConfigured) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string
  ) => {
    const cred = await createUserWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );
    const name = displayName.trim();
    if (name) {
      await updateProfile(cred.user, { displayName: name });
    }
  };

  const signOutUser = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        configured: firebaseConfigured,
        signIn,
        signUp,
        signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth は AuthProvider の内側で使用してください");
  }
  return ctx;
}

/**
 * Firebase Authentication のエラーコードを日本語メッセージに変換する。
 */
export function authErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  switch (code) {
    case "auth/invalid-email":
      return "メールアドレスの形式が正しくありません。";
    case "auth/user-disabled":
      return "このアカウントは利用できません。";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "メールアドレスまたはパスワードが正しくありません。";
    case "auth/email-already-in-use":
      return "このメールアドレスは既に登録されています。ログインしてください。";
    case "auth/weak-password":
      return "パスワードは6文字以上で設定してください。";
    case "auth/missing-password":
      return "パスワードを入力してください。";
    case "auth/too-many-requests":
      return "試行回数が多すぎます。しばらく時間をおいてお試しください。";
    case "auth/network-request-failed":
      return "通信エラーが発生しました。接続環境をご確認ください。";
    case "auth/operation-not-allowed":
      return "メール/パスワード認証が有効になっていません。Firebaseコンソールで有効化してください。";
    default:
      return "認証に失敗しました。入力内容をご確認ください。";
  }
}
