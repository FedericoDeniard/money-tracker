import { useCallback, useEffect, useReducer } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { jwtDecode } from "jwt-decode";
import { getSupabase } from "../lib/supabase";
import type { UserRole } from "../lib/features";
import { isCapability, type Capability } from "../lib/capabilities";

type AuthSnapshot = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  capabilities: Capability[];
};

type AuthAction =
  | {
      type: "SET_AUTH";
      user: User | null;
      session: Session | null;
      role: UserRole | null;
      capabilities: Capability[];
    }
  | { type: "SET_LOADING"; loading: boolean };

function authReducer(state: AuthSnapshot, action: AuthAction): AuthSnapshot {
  switch (action.type) {
    case "SET_AUTH":
      if (
        state.user === action.user &&
        state.session === action.session &&
        state.role === action.role &&
        sameCapabilities(state.capabilities, action.capabilities)
      ) {
        return state;
      }
      return {
        ...state,
        user: action.user,
        session: action.session,
        role: action.role,
        capabilities: action.capabilities,
      };
    case "SET_LOADING":
      if (state.loading === action.loading) {
        return state;
      }
      return { ...state, loading: action.loading };
  }
}

function sameCapabilities(a: Capability[], b: Capability[]): boolean {
  const sortedA = a.toSorted();
  const sortedB = b.toSorted();
  return (
    sortedA.length === sortedB.length &&
    sortedA.every((value, index) => value === sortedB[index])
  );
}

const VALID_ROLES: ReadonlySet<string> = new Set<UserRole>([
  "user",
  "tester",
  "admin",
]);

/**
 * Read the `user_role` claim from a Supabase access token. The custom
 * access token auth hook always sets it; for older tokens (or when the
 * claim is absent) we fall back to `user` so downstream gating logic
 * never crashes.
 */
function readRoleFromSession(session: Session | null): UserRole | null {
  if (!session?.access_token) return null;
  try {
    const payload = jwtDecode<{ user_role?: unknown }>(session.access_token);
    const claim = payload.user_role;
    if (typeof claim === "string" && VALID_ROLES.has(claim)) {
      return claim as UserRole;
    }
    return "user";
  } catch {
    return "user";
  }
}

/**
 * Read the `user_capabilities` claim from a Supabase access token. The
 * custom access token hook (see
 * supabase/migrations/20260705031217_add_user_capabilities_to_jwt.sql)
 * always injects this as a string array. Tokens issued before the hook
 * was deployed won't have the claim; we treat that as "no capabilities"
 * so the security boundary (requireCapability in edge functions) and
 * the JWT hint stay consistent: the absence of a claim must never
 * silently grant access.
 *
 * The set is also validated against CAPABILITIES so a stale or
 * hand-crafted token claiming an unknown capability is filtered out
 * before it reaches `useCapability`.
 */
function readCapabilitiesFromSession(session: Session | null): Capability[] {
  if (!session?.access_token) return [];
  try {
    const payload = jwtDecode<{ user_capabilities?: unknown }>(
      session.access_token
    );
    const claim = payload.user_capabilities;
    if (!Array.isArray(claim)) return [];
    const valid = claim.filter(isCapability);
    return valid.length === claim.length
      ? (valid as Capability[])
      : (valid as Capability[]);
  } catch {
    return [];
  }
}

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
    capabilities: [],
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
  const [{ user, session, loading, role, capabilities }, dispatch] = useReducer(
    authReducer,
    {
      user: authStore.snapshot.user,
      session: authStore.snapshot.session,
      loading: authStore.snapshot.loading,
      role: authStore.snapshot.role,
      capabilities: authStore.snapshot.capabilities,
    }
  );

  useEffect(() => {
    const listener = (snapshot: AuthSnapshot) => {
      dispatch({
        type: "SET_AUTH",
        user: snapshot.user,
        session: snapshot.session,
        role: snapshot.role,
        capabilities: snapshot.capabilities,
      });
      dispatch({ type: "SET_LOADING", loading: snapshot.loading });
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
              updateAuthSnapshot({
                user: null,
                session: null,
                role: null,
                capabilities: [],
              });
            } else {
              // Valid session
              updateAuthSnapshot({
                session,
                user,
                role: readRoleFromSession(session),
                capabilities: readCapabilitiesFromSession(session),
              });
            }
          } else {
            updateAuthSnapshot({
              user: null,
              session: null,
              role: null,
              capabilities: [],
            });
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
                  updateAuthSnapshot({
                    user: null,
                    session: null,
                    role: null,
                    capabilities: [],
                  });
                } else {
                  updateAuthSnapshot({
                    session,
                    user,
                    role: readRoleFromSession(session),
                    capabilities: readCapabilitiesFromSession(session),
                  });
                }
              } else {
                updateAuthSnapshot({
                  session,
                  user: session?.user ?? null,
                  role: readRoleFromSession(session),
                  capabilities: readCapabilitiesFromSession(session),
                });
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

  const signOut = useCallback(async () => {
    const supabase = await getSupabase();
    await supabase.auth.signOut();
  }, []);

  const refreshUser = useCallback(async () => {
    const supabase = await getSupabase();
    const {
      data: { user: freshUser },
      error,
    } = await supabase.auth.getUser();
    if (error || !freshUser) {
      console.error("Failed to refresh user:", error);
      return null;
    }
    const {
      data: { session: freshSession },
    } = await supabase.auth.getSession();
    updateAuthSnapshot({
      user: freshUser,
      session: freshSession,
      role: readRoleFromSession(freshSession),
      capabilities: readCapabilitiesFromSession(freshSession),
    });
    return freshUser;
  }, []);

  return {
    user,
    session,
    loading,
    role,
    capabilities,
    signOut,
    refreshUser,
  };
}
