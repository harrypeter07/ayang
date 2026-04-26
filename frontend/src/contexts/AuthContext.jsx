import React, { createContext, useContext, useEffect, useState } from "react";
import { api, formatApiErrorDetail } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = not auth
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Skip /me call on login page to avoid flicker/race during logout→login
      if (typeof window !== "undefined" && window.location.pathname === "/login") {
        // Still verify session in case user landed on /login with a valid token
        const token = localStorage.getItem("rcc_token");
        if (!token) {
          setUser(false);
          setLoading(false);
          return;
        }
      }
      try {
        const { data } = await api.get("/auth/me");
        setUser(data);
      } catch {
        setUser(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      if (data.token) localStorage.setItem("rcc_token", data.token);
      setUser({ id: data.id, email: data.email, name: data.name, role: data.role });
      return { ok: true, user: data };
    } catch (e) {
      return { ok: false, error: formatApiErrorDetail(e.response?.data?.detail) || e.message };
    }
  };

  const logout = async () => {
    // Clear client state FIRST so no in-flight /me races set a stale user
    localStorage.removeItem("rcc_token");
    setUser(false);
    try { await api.post("/auth/logout"); } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
