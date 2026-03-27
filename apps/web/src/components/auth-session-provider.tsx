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
  signUpUser: (email: string, password: string) => Promise<void>;
  signInWithGoogleUser: () => Promise<void>;
  signOutUser: () => Promise<void>;
  refreshProfile: () => Promise<UserSession | null>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);
const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:2001";

function getFirebaseAuth(): Auth {
  if (!auth || !isFirebaseConfigured) {
    throw new Error("Firebase web config is not applied yet.");
  }

  return auth;
}

async function syncUserProfile(currentUser: User) {
  const token = await currentUser.getIdToken();
  const response = await fetch(`${apiBaseUrl}/users/sync`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Failed to sync user.");
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
        await signInWithEmailAndPassword(firebaseAuth, email, password);
      },
      signUpUser: async (email, password) => {
        const firebaseAuth = getFirebaseAuth();
        await createUserWithEmailAndPassword(firebaseAuth, email, password);
      },
      signInWithGoogleUser: async () => {
        const firebaseAuth = getFirebaseAuth();
        const provider = new GoogleAuthProvider();
        await signInWithPopup(firebaseAuth, provider);
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
