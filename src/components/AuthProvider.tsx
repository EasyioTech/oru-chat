"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { generateUserKeyPair, getPrivateKey } from "@/lib/crypto";

// Matches generic User/Profile shape
type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  email?: string | null;
  avatar_url: string | null;
  status_text: string | null;
  status_emoji: string | null;
  badge: string | null;
  public_key: string | null;
};

type AuthContextType = {
  user: Profile | null; // We merge User and Profile concepts for simplicity in this migration
  loading: boolean;
  refreshProfile: () => Promise<void>;
  login: (data: any) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshProfile: async () => { },
  login: () => { },
  logout: () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();

      if (data.user) {
        setUser(data.user);

        // Key Generation Logic (Migrated from previous implementation)
        if (!data.user.public_key) {
          await checkAndGenerateKeys(data.user.id);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Auth check failed:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const checkAndGenerateKeys = async (userId: string) => {
    try {
      const existingPrivKey = await getPrivateKey();
      if (!existingPrivKey) {
        const publicKeyJWK = await generateUserKeyPair();

        // Only update if we successfully generated a key
        // (empty string means crypto unavailable - HTTP instead of HTTPS)
        if (publicKeyJWK) {
          await fetch("/api/users/me", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ publicKey: publicKeyJWK })
          });
          await fetchUser(); // Refresh
        } else {
          console.log('Encryption keys not generated - Web Crypto API unavailable. Use HTTPS or localhost.');
        }
      }
    } catch (err) {
      console.error("Failed to generate encryption keys:", err);
      // Don't block auth flow if key generation fails
    }
  };

  const login = (userData: Profile) => {
    setUser(userData);
    checkAndGenerateKeys(userData.id);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.location.href = "/";
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refreshProfile: fetchUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
