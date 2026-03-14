'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

interface AuthContext {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  logoutReason: 'manual' | 'inactivity' | null;
}

const AuthCtx = createContext<AuthContext>({
  user: null,
  session: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  logoutReason: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutReason, setLogoutReason] = useState<'manual' | 'inactivity' | null>(null);
  const supabase = createClient();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-logout after inactivity
  useEffect(() => {
    if (!user) return;

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        setLogoutReason('inactivity');
        await supabase.auth.signOut();
      }, INACTIVITY_TIMEOUT_MS);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer(); // start the timer

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user, supabase.auth]);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const signIn = useCallback(async (email: string, password: string) => {
    setLogoutReason(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, [supabase.auth]);

  const signUp = useCallback(async (email: string, password: string) => {
    setLogoutReason(null);
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  }, [supabase.auth]);

  const signOut = useCallback(async () => {
    setLogoutReason('manual');
    await supabase.auth.signOut();
  }, [supabase.auth]);

  return (
    <AuthCtx.Provider value={{ user, session, loading, signIn, signUp, signOut, logoutReason }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
