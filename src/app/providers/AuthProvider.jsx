import { createContext, useEffect, useMemo, useState } from "react";
import authService from "../../features/auth/services/authService";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;

    authService.getSession().then(({ data }) => {
      if (!ativo) return;

      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const unsubscribe = authService.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      ativo = false;
      unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await authService.signOut();
    setSession(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      session,
      setSession,
      user,
      setUser,
      loading,
      isAuthenticated: !!user,
      signOut,
    }),
    [session, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
