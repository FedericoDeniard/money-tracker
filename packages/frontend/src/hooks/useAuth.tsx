import { useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let subscription: any;

    async function initAuth() {
      try {
        const supabase = await getSupabase();
        
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Listen for auth changes
        const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((_event, session) => {
          setSession(session);
          setUser(session?.user ?? null);
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
