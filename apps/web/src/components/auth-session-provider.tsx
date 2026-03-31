"use client";

import {
  type Auth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { UserSession } from "@/lib/api";
import { auth, isFirebaseConfigured } from "@/lib/firebase/client";

type AuthSessionContextValue = {
  user: User | null;
  profile: UserSession | null;
  loading: boolean;
  signInUser: (email: string, password: string) => Promise<void>;
  signUpUser: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogleUser: () => Promise<void>;
  signOutUser: () => Promise<void>;
  refreshProfile: () => Promise<UserSession | null>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);
const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:2001";

function getFirebaseAuth(): Auth {
  if (!auth || !isFirebaseConfigured) {
    throw new Error("Firebase 웹 설정이 아직 적용되지 않았습니다.");
  }

  return auth;
}

function translateFirebaseError(error: unknown) {
  if (!(error instanceof Error)) {
    return new Error("인증 처리 중 오류가 발생했습니다.");
  }

  const code = error.message;

  if (code.includes("auth/unauthorized-domain")) {
    return new Error("현재 접속한 도메인은 Google 로그인 허용 도메인에 등록되어 있지 않습니다.");
  }
  if (code.includes("auth/popup-closed-by-user")) {
    return new Error("로그인 창이 닫혀 Google 로그인을 완료하지 못했습니다.");
  }
  if (code.includes("auth/popup-blocked")) {
    return new Error("브라우저가 로그인 팝업을 차단했습니다. 팝업 허용 후 다시 시도해 주세요.");
  }
  if (code.includes("auth/invalid-credential") || code.includes("auth/invalid-login-credentials")) {
    return new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
  }
  if (code.includes("auth/email-already-in-use")) {
    return new Error("이미 사용 중인 이메일입니다.");
  }
  if (code.includes("auth/weak-password")) {
    return new Error("비밀번호는 6자 이상이어야 합니다.");
  }
  if (code.includes("auth/invalid-email")) {
    return new Error("이메일 형식이 올바르지 않습니다.");
  }
  if (code.includes("auth/network-request-failed")) {
    return new Error("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
  }

  return error;
}

async function syncUserProfile(currentUser: User, payload?: { name?: string }) {
  const token = await currentUser.getIdToken();
  const response = await fetch(`${apiBaseUrl}/users/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload ?? {}),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "사용자 정보를 동기화하지 못했습니다.");
  }

  return response.json() as Promise<UserSession>;
}

export function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onIdTokenChanged(auth, async (nextUser) => {
      setUser(nextUser);

      if (!nextUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const nextProfile = await syncUserProfile(nextUser);
        setProfile(nextProfile);
      } catch (error) {
        console.error("Failed to sync user", error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      user,
      profile,
      loading,
      signInUser: async (email, password) => {
        const firebaseAuth = getFirebaseAuth();
        try {
          await signInWithEmailAndPassword(firebaseAuth, email, password);
        } catch (error) {
          throw translateFirebaseError(error);
        }
      },
      signUpUser: async (name, email, password) => {
        const firebaseAuth = getFirebaseAuth();
        try {
          const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
          const nextProfile = await syncUserProfile(credential.user, { name });
          setProfile(nextProfile);
        } catch (error) {
          throw translateFirebaseError(error);
        }
      },
      signInWithGoogleUser: async () => {
        const firebaseAuth = getFirebaseAuth();
        const provider = new GoogleAuthProvider();
        try {
          await signInWithPopup(firebaseAuth, provider);
        } catch (error) {
          throw translateFirebaseError(error);
        }
      },
      signOutUser: async () => {
        if (!auth) {
          return;
        }

        await signOut(auth);
        setProfile(null);
      },
      refreshProfile: async () => {
        if (!auth?.currentUser) {
          setProfile(null);
          return null;
        }

        const nextProfile = await syncUserProfile(auth.currentUser);
        setProfile(nextProfile);
        return nextProfile;
      },
    }),
    [loading, profile, user],
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext);

  if (!context) {
    throw new Error("useAuthSession must be used within AuthSessionProvider");
  }

  return context;
}
