import { useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    async function initAuth() {
      try {
        const supabase = await getSupabase();
        
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // Validate session against server
          const {
            data: { user },
            error,
          } = await supabase.auth.getUser();

          if (error || !user) {
            // Session is invalid or user doesn't exist, force logout
            console.log("Invalid session detected, logging out...");
            await supabase.auth.signOut();
            setUser(null);
            setSession(null);
          } else {
            // Valid session
            setSession(session);
            setUser(user);
          }
        } else {
          setUser(null);
          setSession(null);
        }
        setLoading(false);

        // Listen for auth changes
        const {
          data: { subscription: sub },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
          // Don't validate on TOKEN_REFRESHED or SIGNED_IN events to avoid race conditions
          if (
            session &&
            _event !== "SIGNED_OUT" &&
            _event !== "TOKEN_REFRESHED" &&
            _event !== "SIGNED_IN"
          ) {
            // Validate on auth state change too
            const {
              data: { user },
              error,
            } = await supabase.auth.getUser();

            if (error || !user) {
              console.log(
                "Invalid session detected on auth change, logging out...",
              );
              await supabase.auth.signOut();
              setUser(null);
              setSession(null);
            } else {
              setSession(session);
              setUser(user);
            }
          } else {
            setSession(session);
            setUser(session?.user ?? null);
          }
          setLoading(false);
        });
        
        subscription = sub;
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        setLoading(false);
      }
    }

    initAuth();

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const supabase = await getSupabase();
    await supabase.auth.signOut();
  };

  return {
    user,
    session,
    loading,
    signOut,
  };
}
