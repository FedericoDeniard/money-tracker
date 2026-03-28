import { useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { getSupabase } from "../lib/supabase";

type AuthSnapshot = {
  user: User | null;
  session: Session | null;
  loading: boolean;
};

const authStore: {
  snapshot: AuthSnapshot;
  listeners: Set<(snapshot: AuthSnapshot) => void>;
  initPromise: Promise<void> | null;
  subscription: { unsubscribe: () => void } | null;
} = {
  snapshot: {
    user: null,
    session: null,
    loading: true,
  },
  listeners: new Set(),
  initPromise: null,
  subscription: null,
};

function emitAuthSnapshot() {
  for (const listener of authStore.listeners) {
    listener(authStore.snapshot);
  }
}

function updateAuthSnapshot(patch: Partial<AuthSnapshot>) {
  authStore.snapshot = { ...authStore.snapshot, ...patch };
  emitAuthSnapshot();
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(authStore.snapshot.user);
  const [session, setSession] = useState<Session | null>(
    authStore.snapshot.session
  );
  const [loading, setLoading] = useState(authStore.snapshot.loading);

  useEffect(() => {
    const listener = (snapshot: AuthSnapshot) => {
      setUser(snapshot.user);
      setSession(snapshot.session);
      setLoading(snapshot.loading);
    };
    authStore.listeners.add(listener);
    listener(authStore.snapshot);

    async function initAuth() {
      if (authStore.initPromise) {
        return authStore.initPromise;
      }

      authStore.initPromise = (async () => {
        try {
          const supabase = await getSupabase();

          // Get initial session
          const {
            data: { session },
          } = await supabase.auth.getSession();

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
              updateAuthSnapshot({ user: null, session: null });
            } else {
              // Valid session
              updateAuthSnapshot({ session, user });
            }
          } else {
            updateAuthSnapshot({ user: null, session: null });
          }
          updateAuthSnapshot({ loading: false });

          // Listen for auth changes
          if (!authStore.subscription) {
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
                    "Invalid session detected on auth change, logging out..."
                  );
                  await supabase.auth.signOut();
                  updateAuthSnapshot({ user: null, session: null });
                } else {
                  updateAuthSnapshot({ session, user });
                }
              } else {
                updateAuthSnapshot({ session, user: session?.user ?? null });
              }
              updateAuthSnapshot({ loading: false });
            });

            authStore.subscription = sub;
          }
        } catch (error) {
          console.error("Failed to initialize auth:", error);
          updateAuthSnapshot({ loading: false });
        }
      })();

      return authStore.initPromise;
    }

    initAuth();

    return () => {
      authStore.listeners.delete(listener);
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
