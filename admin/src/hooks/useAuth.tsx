import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { supabase, type Staff } from "@/lib/supabase";

interface AuthState {
  session: Session | null;
  staff: Staff | null;
  loading: boolean;
  /** true khi đăng nhập được nhưng tài khoản chưa nằm trong bảng staff */
  notStaff: boolean;
  signOut: () => Promise<void>;
  isManager: boolean;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) {
        setLoading(false);
        setChecked(true);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) {
        setStaff(null);
        setChecked(true);
        setLoading(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  /* Đăng nhập được chưa đủ — phải có dòng trong bảng staff mới vào được CMS. */
  useEffect(() => {
    if (!session) return;
    let alive = true;
    setLoading(true);
    supabase
      .from("staff")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        setStaff(data ?? null);
        setChecked(true);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [session]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      staff,
      loading,
      notStaff: !!session && checked && !staff,
      isManager: staff?.role === "owner" || staff?.role === "manager",
      signOut: async () => {
        await supabase.auth.signOut();
        setStaff(null);
      },
    }),
    [session, staff, loading, checked]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth phải nằm trong AuthProvider");
  return ctx;
}
