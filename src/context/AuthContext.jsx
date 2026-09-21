import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthCtx = createContext({});
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(uid) {
    if (!uid) { setProfile(null); return; }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();
    setProfile(data || null);
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      const u = data?.session?.user || null;
      setUser(u);
      await loadProfile(u?.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      const u = session?.user || null;
      setUser(u);
      await loadProfile(u?.id);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  const value = {
    user,
    profile,
    loading,
    isAdmin: profile?.role === "admin",

    signUp: async (email, password, fullName, phone) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (!error && data.user && phone) {
        await supabase.from("profiles").update({ phone, full_name: fullName }).eq("id", data.user.id);
      }
      return { data, error };
    },

    signIn: (email, password) =>
      supabase.auth.signInWithPassword({ email, password }),

    signOut: async () => {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    },

    refreshProfile: () => loadProfile(user?.id),
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
